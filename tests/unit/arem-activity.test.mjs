import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import conversations from '../../server/conversations.js';
import { aremAgentMemory } from '../../server/arem/arem-agent-memory.js';
import { ConversationTurns } from '../../server/services/conversationTurns.js';

test('AREM activity streams, persists and records only successful memory writes', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'arem-activity-'));
  conversations.setStorageDir(path.join(dir, 'chats'));
  const original = aremAgentMemory.checkpoint;
  const checkpoints = [];
  aremAgentMemory.checkpoint = (data) => checkpoints.push(data);
  try {
    const events = [];
    const turns = new ConversationTurns(conversations);
    const result = await turns.run({ conversationId: 'activity-test', requestId: 'r1', query: 'Test memory' },
      { onAremActivity: (event) => events.push(structuredClone(event)) }, async (params, callbacks) => {
        assert.equal(params.savedConversation, true);
        const trace = { system: 'AREM', retainedSources: ['source'], agentNodes: ['old'] };
        callbacks.onAremActivity(trace);
        callbacks.onWorkStep({ kind: 'commentary', text: 'I will check the saved notes.' });
        callbacks.onToolCall({ id: 'saved', tool: 'store_arem_memory', status: 'RUNNING' });
        assert.equal(conversations.get('activity-test').messages[1].arem.system, 'AREM');
        callbacks.onToolResult({ id: 'saved', tool: 'store_arem_memory', status: 'RESOLVED', output: { node: { id: 'new' } } });
        callbacks.onToolResult({ id: 'failed', tool: 'store_arem_memory', status: 'FAILED', output: { error: 'No' } });
        return { response: 'Done.', memory: { arem: trace }, completionAudit: { status: 'complete' } };
      });
    assert.equal(events.length, 1);
    assert.deepEqual(result.memory.arem.agentWrites, ['new']);
    assert.equal(result.memory.arem.workingCheckpoint, 'saved');
    assert.equal(checkpoints.length, 1);
    assert.deepEqual(result.workSteps, [{ kind: 'commentary', text: 'I will check the saved notes.' }, { kind: 'tool', id: 'saved' }]);
    assert.deepEqual(turns.status('activity-test', 'r1').workSteps, result.workSteps);
    assert.deepEqual(turns.status('activity-test', 'r1').memory.arem.agentWrites, ['new']);
    assert.equal(conversations.get('activity-test').messages[1].arem.workingCheckpoint, 'saved');
  } finally {
    aremAgentMemory.checkpoint = original;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
