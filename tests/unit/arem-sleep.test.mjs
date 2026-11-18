import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { AremAgents } from '../../server/arem/arem-agents.js';
import { aremEvents, AremEngine, automaticSleepEnabled } from '../../server/arem/arem-engine.js';
import { AremMemoryStore } from '../../server/arem/arem-memory-store.js';

const decision = 'Use UTC timestamps in the telemetry export.';
const correction = 'Use Unix timestamps in the telemetry export.';

function fixture(t, complete) {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arem-sleep-'));
  const store = new AremMemoryStore({ baseDir });
  const chats = new Map(
    ['project', 'unrelated'].map((id) => [id, { id, createdAt: 1, messages: [] }]),
  );
  const history = { get: (id) => chats.get(id), list: () => [...chats.values()] };
  const agents = new AremAgents({
    client: {
      complete: async ({ prompt, signal }) => ({
        text: await complete(JSON.parse(prompt), signal),
      }),
    },
  });
  let now = 0;
  const engines = [];
  const restart = () => {
    const engine = new AremEngine({ store, agents, history, now: () => now });
    engines.push(engine);
    return engine;
  };
  const engine = restart();
  t.after(() => {
    for (const instance of engines) {
      instance.stopScheduler();
      instance.db?.close();
    }
    fs.rmSync(baseDir, { force: true, recursive: true });
  });
  function record(requestId, content, status = 'completed', chat = 'project') {
    chats
      .get(chat)
      .messages.push(
        { requestId, role: 'user', content },
        { requestId, role: 'assistant', content: 'Recorded your decision.', status },
      );
  }
  return {
    store,
    engine,
    restart,
    record,
    chats,
    advance: (duration) => {
      now += duration;
    },
    run: () => engine.runDreamCycle({ conversationId: 'project', manualTrigger: true }),
  };
}

test('sleep grounds quotes, rehearses candidates, and publishes scoped memory atomically', async (t) => {
  const phases = [];
  const onPulse = ({ stage }) => phases.push(stage);
  aremEvents.on('pulse', onPulse);
  t.after(() => aremEvents.off('pulse', onPulse));
  const { engine, run, store, record, restart } = fixture(t, ({ evidence, proposals }) => {
    assert.deepEqual(
      evidence.map(({ id }) => id),
      ['decision', 'review-reject'],
    );
    if (proposals) {
      assert.equal(proposals.length, 2);
      return JSON.stringify([proposals[0].id]);
    }
    return JSON.stringify([
      { sourceId: 'decision', title: 'Export time format', quote: decision },
      { sourceId: 'decision', title: 'Invented fact', quote: 'Use local timestamps in telemetry.' },
      { sourceId: 'review-reject', title: 'One-off', quote: 'Export the report once today.' },
    ]);
  });
  record('decision', decision);
  record('review-reject', 'Export the report once today.');
  record('secret', 'api_key: mock-secret-from-a-fixture');
  record('unfinished', 'Use a draft schema.', 'cancelled');
  const index = store.getIndex();
  const result = await run();
  assert.equal(result.status, 'success');
  assert.deepEqual(result.report, { reviewed: 2, retained: 1, skipped: 1, finishedAt: 0 });
  assert.deepEqual(phases, ['consolidating', 'rehearsing']);
  assert.deepEqual(engine.memoryFor('project', 'telemetry timestamps'), [
    { sourceId: 'decision', note: decision },
  ]);
  assert.deepEqual(engine.memoryFor('unrelated', 'telemetry timestamps'), []);
  assert.deepEqual(engine.memoryFor('project', 'pastries'), []);
  assert.equal(restart().getSleepStatus('project').pending, 0);
  assert.equal(restart().memoryFor('project')[0].note, decision);
  assert.equal(store.getIndex(), index);
  assert.deepEqual(store.listWikiPages(), []);
  assert.equal((await run()).status, 'empty');
});

test('wake interrupts rehearsal and overlapping cycles share a single writer', async (t) => {
  const entered = Promise.withResolvers();
  const { engine, record, run } = fixture(t, async ({ proposals }, signal) => {
    if (!proposals)
      return JSON.stringify([{ sourceId: 'decision', title: 'Time format', quote: decision }]);
    entered.resolve();
    await new Promise((_, reject) =>
      signal.addEventListener('abort', () => reject(signal.reason), { once: true }),
    );
  });
  record('decision', decision);
  const inFlight = run();
  await entered.promise;
  assert.equal(engine.getSleepStatus('project').phase, 'rehearsing');
  assert.equal((await run()).status, 'already_running');
  const end = engine.beginForeground();
  assert.equal((await inFlight).status, 'interrupted');
  assert.equal((await run()).status, 'busy');
  end();
  assert.equal(engine.getSleepStatus('project').pending, 1);
  assert.deepEqual(engine.memoryFor('project'), []);
});

test('automatic sleep waits for idleness and invalid provider output leaves the batch retryable', async (t) => {
  let broken = true;
  const { engine, advance, record, run } = fixture(t, () =>
    broken ? '{"unexpected":true}' : '[]',
  );
  record('decision', decision);
  assert.equal((await engine.runDreamCycle()).status, 'busy');
  advance(60_000);
  assert.equal((await engine.runDreamCycle()).status, 'error');
  assert.equal(engine.getSleepStatus('project').pending, 1);
  broken = false;
  assert.equal((await run()).status, 'success');
  assert.equal(engine.getSleepStatus('project').pending, 0);
});

test('approved later corrections replace prior quotes, and source edits invalidate replay', async (t) => {
  const { engine, record, run, chats } = fixture(t, ({ evidence, retained, proposals }) => {
    if (proposals) return JSON.stringify(proposals.map(({ id }) => id));
    return JSON.stringify(
      evidence.map(({ id, user }) => ({
        sourceId: id,
        title: 'Time format',
        quote: user,
        supersedes: retained[0]?.id,
      })),
    );
  });
  record('decision', decision);
  await run();
  record('correction', correction);
  assert.equal((await run()).report.retained, 1);
  assert.deepEqual(
    engine.memoryFor('project').map(({ note }) => note),
    [correction],
  );
  chats.get('project').messages[0].content = 'The original source was edited.';
  assert.deepEqual(engine.memoryFor('project'), []);
  assert.equal(engine.getSleepStatus('project').pending, 2);
  engine.forgetChat('project');
  assert.equal(engine.getStatus().stats.totalDreamCycles, 0);
});

test('older saved chats replay completed exchanges and exclude legacy failure replies', async (t) => {
  const { engine, run, chats } = fixture(t, ({ evidence }) => {
    assert.deepEqual(
      evidence.map(({ id, user }) => [id, user]),
      [['legacy:1', decision]],
    );
    return '[]';
  });
  chats
    .get('project')
    .messages.push(
      { role: 'user', content: decision },
      { role: 'assistant', content: 'Understood.' },
      { role: 'user', content: 'Use a draft schema.' },
      { role: 'assistant', content: 'Previous attempt did not finish: timed out.' },
    );
  assert.equal(engine.getSleepStatus('project').pending, 1);
  assert.equal((await run()).status, 'success');
});


test('automatic sleep is enabled by default and respects an explicit opt-out', () => {
  assert.equal(automaticSleepEnabled(''), true);
  assert.equal(automaticSleepEnabled('true'), true);
  assert.equal(automaticSleepEnabled('false'), false);
  assert.equal(automaticSleepEnabled(' FALSE '), false);
});

test('sleep organizes reviewed notes, updates corrections, and removes invalidated files', async (t) => {
  const { engine, record, run, chats } = fixture(t, ({ evidence, retained, proposals }) => {
    if (proposals) return JSON.stringify(proposals.map(({ id }) => id));
    return JSON.stringify(evidence.map(({ id, user }) => ({ sourceId: id, title: 'Time format', quote: user, supersedes: retained[0]?.id })));
  });
  record('decision', decision);
  assert.equal((await run()).organized, 'updated');
  const filename = engine.organizedFile('project');
  const first = JSON.parse(fs.readFileSync(filename, 'utf8'));
  assert.equal(first.notes[0].note, decision);
  assert.equal(engine.getSleepStatus('project').organized, 'up-to-date');
  fs.unlinkSync(filename);
  assert.equal(engine.getSleepStatus('project').organized, 'up-to-date');
  assert.equal(JSON.parse(fs.readFileSync(filename, 'utf8')).notes[0].note, decision);
  record('correction', correction);
  assert.equal((await run()).organized, 'updated');
  assert.equal(JSON.parse(fs.readFileSync(filename, 'utf8')).notes[0].note, correction);
  chats.get('project').messages[0].content = 'The source changed.';
  assert.deepEqual(engine.memoryFor('project'), []);
  assert.equal(fs.existsSync(filename), false);
});

test('sleep does not overwrite an unrelated file at its organized path', async (t) => {
  const { engine, record, run } = fixture(t, ({ evidence, proposals }) => proposals
    ? JSON.stringify(proposals.map(({ id }) => id))
    : JSON.stringify([{ sourceId: evidence[0].id, title: 'Decision', quote: evidence[0].user }]));
  record('decision', decision);
  const filename = engine.organizedFile('project');
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, 'User-owned content');
  const result = await run();
  assert.equal(result.status, 'success');
  assert.equal(result.organized, 'unavailable');
  assert.equal(fs.readFileSync(filename, 'utf8'), 'User-owned content');
  assert.equal(engine.memoryFor('project')[0].note, decision);
  assert.equal(engine.getSleepStatus('project').organized, 'unavailable');
  engine.forgetChat('project');
  assert.equal(fs.readFileSync(filename, 'utf8'), 'User-owned content');
});

test('a completed foreground turn re-arms automatic sleep after the idle period', (t) => {
  const { engine } = fixture(t, () => '[]');
  const delays = [];
  engine.schedule = (delay) => delays.push(delay);
  engine.startScheduler();
  const first = engine.beginForeground();
  const second = engine.beginForeground();
  first();
  assert.deepEqual(delays, [60000]);
  second();
  assert.deepEqual(delays, [60000, 60000]);
});
