import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AremWorkingMemory } from '../../server/arem/arem-working-memory.js';
import { AremAgentMemory } from '../../server/arem/arem-agent-memory.js';
import { AremCatalog } from '../../server/arem/arem-catalog.js';
import { conversationMessages } from '../../server/services/conversationContext.js';

test('AREM keeps catalog versions and lets the agent organize isolated, searchable notes', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'arem-nodes-'));
  const memory = new AremAgentMemory(path.join(directory, 'nodes.sqlite'));
  const catalog = new AremCatalog(path.join(directory, 'catalog.sqlite'));
  try {
    catalog.sync('tool', [['example', 'first definition']]);
    const first = catalog.list('tool')[0];
    catalog.sync('tool', [['example', 'revised definition']]);
    assert.equal(catalog.read('tool', 'example').content, 'revised definition');
    assert.equal(catalog.read('tool', 'example', first.digest).content, 'first definition');
    const root = memory.save({
      title: 'Calibration',
      note: 'Calibration results',
      evidence: 'test run',
      chat: 'a',
    });
    const child = memory.save({
      parent: root.id,
      title: 'Samples',
      note: 'Calibrated samples',
      evidence: 'test run',
      chat: 'a',
    });
    assert.throws(() => memory.save({ id: root.id, parent: child.id, chat: 'a' }), /cycle/);
    assert.equal(memory.read(child.id, 'b'), null);
    assert.equal(memory.search({ chat: 'a', query: 'Calibration' })[0].id, root.id);
    memory.archive(root.id, 'a');
    assert.equal(memory.read(child.id, 'a').parent, null);
    assert.equal(memory.read(root.id, 'a'), null);
    assert.throws(
      () =>
        memory.save({ title: 'Credential', note: 'password: sample', evidence: 'test', chat: 'a' }),
      /credentials/,
    );
    memory.checkpoint({ chat: 'a', requestId: 'turn-1', sourceCount: 2, toolCount: 1 });
    memory.checkpoint({ chat: 'a', requestId: 'turn-1', sourceCount: 2, toolCount: 1 });
    assert.equal(memory.search({ chat: 'a' }).filter((node) => node.scope === 'working').length, 1);
  } finally {
    memory.db?.close();
    catalog.db?.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('store_arem_memory with a "new" id creates instead of failing, and a foreign id gives a clear scope error', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'arem-new-id-'));
  const memory = new AremAgentMemory(path.join(directory, 'nodes.sqlite'));
  try {
    // The model sometimes sends id:"new" intending a fresh note. It must create.
    for (const placeholder of ['new', 'New', 'null', 'undefined', '']) {
      const node = memory.save({
        id: placeholder,
        scope: 'chat',
        title: 'Akshan',
        note: 'Founder and CEO at Silisleek.',
        evidence: 'user stated name and role',
        chat: 'c',
      });
      assert.equal(node.title, 'Akshan');
      assert.notEqual(node.id, 'new');
    }

    // A genuinely unknown id must fail, but with a recoverable explanation.
    assert.throws(
      () =>
        memory.save({
          id: 'user-does-not-exist',
          scope: 'chat',
          title: 'x',
          note: 'y',
          evidence: 'z',
          chat: 'c',
        }),
      (error) =>
        error.message.includes('not found in this scope') &&
        error.message.includes('omit id') &&
        error.message.includes('search_arem_memory'),
    );

    // An id owned by another chat is out of scope for this chat.
    const other = memory.save({
      scope: 'chat',
      title: 'Private',
      note: 'Other chat note',
      evidence: 'turn-1',
      chat: 'other-chat',
    });
    assert.throws(
      () =>
        memory.save({
          id: other.id,
          scope: 'chat',
          title: 'x',
          note: 'y',
          evidence: 'z',
          chat: 'c',
        }),
      /not found in this scope/,
    );
  } finally {
    memory.db?.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('new memory uses generated IDs and refuses unknown or other-chat edits', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'arem-create-'));
  const memory = new AremAgentMemory(path.join(directory, 'nodes.sqlite'));
  try {
    const base = { title: 'Preference', note: 'Use metric units', evidence: 'user turn', chat: 'a' };
    const created = memory.save(base);
    assert.ok(created.id);
    assert.notEqual(created.id, 'new');
    const placeholder = memory.save({ ...base, id: 'new' });
    assert.notEqual(placeholder.id, 'new');
    assert.throws(() => memory.save({ ...base, id: 'invented-id' }), /omit id/);
    assert.throws(() => memory.save({ ...base, chat: 'b', id: created.id }), /omit id/);
    assert.equal(memory.read(created.id, 'a').note, 'Use metric units');
    assert.equal(memory.graph({ chat: 'a' }).total, 2);
  } finally {
    memory.db?.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('AREM scopes rules to a turn, a chat, or all chats and persists durable scopes', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'arem-rules-'));
  const filename = path.join(directory, 'memory.sqlite');
  const memory = new AremWorkingMemory(filename);
  let reopened;
  try {
    const global = memory.capture('Long-term rule: Use metric units.', 'chat-a', 'turn-a');
    const local = memory.capture('Per-chat rule: Use French.', 'chat-a', 'turn-a');
    const temporary = memory.capture('Short-term rule: Keep this to one line.', 'chat-a', 'turn-a');
    assert.deepEqual(
      memory.rules('chat-a', 'turn-a').map(({ id }) => id),
      [global.id, local.id, temporary.id],
    );
    assert.deepEqual(
      memory.rules('chat-b', 'turn-a').map(({ id }) => id),
      [global.id],
    );
    assert.deepEqual(
      memory.rules('chat-a', 'turn-b').map(({ id }) => id),
      [global.id, local.id],
    );
    memory.clearTurn('chat-a', 'turn-a');
    reopened = new AremWorkingMemory(filename);
    assert.deepEqual(
      reopened.rules('chat-a', 'turn-a').map(({ id }) => id),
      [global.id, local.id],
    );
    assert.equal(reopened.removeRule(local.id), true);
    assert.deepEqual(
      memory.rules('chat-a').map(({ id }) => id),
      [global.id],
    );
  } finally {
    reopened?.db?.close();
    memory.db?.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('AREM recaps relevant omitted chat messages only on budget overflow', () => {
  const history = [
    { role: 'user', content: 'Set up the workspace.' },
    { role: 'user', content: 'Keep the calibration file beside the results.' },
    { role: 'assistant', content: 'Unrelated status. '.repeat(120) },
  ];
  let summary;
  const options = {
    onOverflow: (value) => {
      summary = value;
    },
  };
  conversationMessages(history, 'Where is calibration?', options);
  assert.equal(summary, undefined);
  const context = conversationMessages(history, 'Where is calibration?', {
    ...options,
    budget: 90,
  });
  assert.equal(context.at(-1).content, 'Where is calibration?');
  assert.equal(summary.omitted, 2);
  assert.ok(summary.excerpts.some((entry) => entry.text === history[1].content));
  assert.ok(summary.excerpts.every((entry) => entry.text.length <= 280));
});
