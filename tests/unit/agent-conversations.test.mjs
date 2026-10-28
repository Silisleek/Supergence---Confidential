import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  AgentConversations,
  configureAgentConversationRuntime,
} from '../../server/services/agentConversations.js';

const roster = async () => [
  { id: 'alpha', name: 'Alpha', role: 'Engineer' },
  { id: 'beta', name: 'Beta', role: 'Researcher' },
];
test('independent persisted side conversations preserve sender provenance and failures', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sis-conversations-'));
  try {
    let release;
    const store = new AgentConversations({
      directory,
      roster,
      reply: async () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    });
    const thread = await store.create({ agentIds: ['alpha', 'beta'] });
    const pending = store.send(thread.id, {
      content: 'Check this',
      targetAgentId: 'beta',
      senderAgentId: 'alpha',
      provenance: 'agent-tool',
    });
    // Allow the asynchronous roster lookup to finish; synchronize on actual state.
    while (store.get(thread.id).status !== 'replying')
      await new Promise((resolve) => setImmediate(resolve));
    assert.equal(store.get(thread.id).messages[0].senderId, 'alpha');
    assert.throws(() => store.remove(thread.id), /waiting/);
    await assert.rejects(
      store.send(thread.id, { content: 'Conflicting reply', targetAgentId: 'alpha' }),
      /waiting/,
    );
    const providerReply = new String('Observed reply');
    providerReply.text = 'Observed reply';
    release(providerReply);
    const result = await pending;
    assert.equal(result.messages[1].senderId, 'beta');
    assert.equal(
      new AgentConversations({ directory, roster }).get(thread.id).messages[1].content,
      'Observed reply',
    );
    store.reply = async () => {
      throw new Error('Provider unavailable');
    };
    const failed = await store.send(thread.id, {
      content: 'Retain my message',
      targetAgentId: 'alpha',
    });
    assert.equal(failed.status, 'error');
    assert.equal(failed.messages.at(-1).senderId, 'user');
    assert.equal(failed.error, 'Provider unavailable');
    assert.equal(store.remove(thread.id).removed, true);
    assert.throws(() => store.get(thread.id), /not found/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('configured user chat streams actual callback text and keeps tool activity outside messages', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sis-conversations-'));
  try {
    let release;
    configureAgentConversationRuntime({
      reply: async ({ onToken, onToolCall, onToolResult }) => {
        onToken('Reading the selected source.');
        onToolCall({ id: 'test-call', tool: 'read_file', status: 'RUNNING' });
        await new Promise((resolve) => {
          release = resolve;
        });
        onToolResult({
          id: 'test-call',
          tool: 'read_file',
          status: 'RESOLVED',
          output: { bytes: 12 },
        });
        return 'The source was read.';
      },
    });
    const store = new AgentConversations({ directory, roster });
    const thread = await store.create({ agentIds: ['alpha'] });
    const pending = store.send(thread.id, { content: 'Read the source.' });
    while (!store.get(thread.id).streamingReply)
      await new Promise((resolve) => setImmediate(resolve));
    const live = store.get(thread.id);
    assert.equal(live.streamingReply, 'Reading the selected source.');
    assert.equal(live.messages.length, 1);
    assert.equal(live.activity[0].phase, 'call');
    release();
    const result = await pending;
    assert.equal(result.streamingReply, undefined);
    assert.equal(result.messages.length, 2);
    assert.equal(result.activity[0].phase, 'result');
    assert.equal(result.activity[0].output.bytes, 12);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
