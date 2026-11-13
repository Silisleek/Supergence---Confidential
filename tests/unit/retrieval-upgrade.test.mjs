import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LearningLibrary } from '../../server/services/learningLibrary.js';
import { bm25 } from '../../server/memory/retrieval-ranking.js';
import { selectWorkspaceTools } from '../../server/services/workspaceToolSelection.js';

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sis-retrieval-upgrade-'));
  t.after(() => {
    assert.equal(path.dirname(directory), os.tmpdir());
    assert.ok(path.basename(directory).startsWith('sis-retrieval-upgrade-'));
    fs.rmSync(directory, { recursive: true, force: true });
  });
  let clock = Date.parse('2026-11-04T00:00:00Z');
  const options = { directory, now: () => clock };
  return {
    library: new LearningLibrary(options),
    options,
    advance: (ms) => {
      clock += ms;
    },
  };
}

test('BM25 length normalization resists repeated keywords in long irrelevant passages', () => {
  const concise = new Map([
    ['kestrel', 1],
    ['quartz', 1],
  ]);
  const spam = new Map([
    ['kestrel', 20],
    ['unrelated', 1000],
  ]);
  const frequencies = new Map([['kestrel', 2]]);
  assert.ok(
    bm25(['kestrel'], concise, frequencies, 10, 100) >
      bm25(['kestrel'], spam, frequencies, 10, 100),
  );
});

test('hybrid retrieval keeps distinct evidence rather than filling context with duplicate copies', (t) => {
  const { library } = fixture(t);
  for (let i = 0; i < 8; i++)
    library.ingest({
      title: `kestrel copy ${i}`,
      content: 'Kestrel calibration uses a violet lamp.',
      sourceType: `fixture-${i}`,
    });
  const distinct = library.ingest({
    title: 'Kestrel safety',
    content: 'Kestrel calibration requires eye protection and a grounded shield.',
  }).source;
  const matches = library.search('kestrel calibration', { limit: 5 }).matches;
  assert.equal(matches.length, 2);
  assert.ok(matches.some((match) => match.sourceId === distinct.id));
  assert.ok(matches.every((match) => match.state === 'retained' && match.citation && match.digest));
});

test('whole-library evaluation reveals distractor failures and leaves learning records unchanged', (t) => {
  const { library } = fixture(t);
  const target = library.ingest({
    title: 'Archive',
    content: 'The annual kestrel calibration reference is violet.',
  }).source;
  library.ingest({
    title: 'Kestrel calibration reference',
    content: 'Kestrel calibration reference describes a competing amber procedure.',
  });
  const report = library.evaluate({
    limit: 1,
    cases: [
      {
        sourceId: target.id,
        question: 'competing amber procedure',
        expectedText: 'reference is violet',
      },
    ],
  });
  assert.equal(report.recallAtK, 0);
  assert.equal(report.meanReciprocalRank, 0);
  assert.equal(report.scope, 'whole-library');
  assert.deepEqual(library.get(target.id).recallChecks, []);
  const success = library.evaluate({
    cases: [
      { sourceId: target.id, question: 'annual violet', expectedText: 'reference is violet' },
    ],
  });
  assert.equal(success.recallAtK, 1);
  assert.equal(success.results[0].digest, target.digest);
  assert.equal(library.get(target.id).state, 'retained');
  assert.throws(() => library.evaluate({ cases: [] }), /between 1 and 30/);
  assert.throws(() => library.search('a'.repeat(4001)), /4000/);
});

test('spaced recall reviews survive restart, expand after success, retry failures and reset on edits', (t) => {
  const { library, options, advance } = fixture(t);
  const source = library.ingest({
    content: 'Kestrel calibration uses a violet reference lamp.',
  }).source;
  const question = 'kestrel calibration';
  const expectedText = 'violet reference lamp';
  const first = library.checkRecall(source.id, { question, expectedText });
  assert.equal(first.scope, 'whole-library');
  assert.equal(first.rank, 1);
  assert.equal(library.get(source.id).review.due, false);
  const dueAt = library.get(source.id).review.dueAt;
  for (let i = 0; i < 25; i++) library.checkRecall(source.id, { question, expectedText });
  assert.equal(library.get(source.id).review.consecutivePasses, 1);
  assert.equal(library.get(source.id).review.dueAt, dueAt);
  advance(86400000);
  const restarted = new LearningLibrary(options);
  assert.equal(restarted.get(source.id).review.due, true);
  restarted.checkRecall(source.id, { question, expectedText });
  assert.equal(restarted.get(source.id).review.consecutivePasses, 2);
  advance(2 * 86400000);
  assert.equal(restarted.get(source.id).review.due, false);
  advance(86400000);
  assert.equal(restarted.get(source.id).review.due, true);
  restarted.checkRecall(source.id, { question: 'unrelatedxyz', expectedText });
  assert.equal(restarted.get(source.id).review.consecutivePasses, 0);
  advance(3600000);
  assert.equal(restarted.get(source.id).review.due, true);
  const current = restarted.get(source.id);
  restarted.update(source.id, {
    expectedDigest: current.digest,
    expectedRevision: current.revision,
    content: 'Kestrel calibration now uses an amber lamp.',
  });
  assert.equal(restarted.get(source.id).review.ready, false);
  assert.deepEqual(restarted.get(source.id).recallChecks, []);
});

test('knowledge evaluation is selectable in the actual workspace tool contract', () => {
  const definitions = ['recall_knowledge', 'evaluate_knowledge'].map((name) => ({
    function: { name },
  }));
  assert.ok(
    selectWorkspaceTools(definitions, 'Evaluate knowledge retrieval').some(
      (tool) => tool.function.name === 'evaluate_knowledge',
    ),
  );
});
