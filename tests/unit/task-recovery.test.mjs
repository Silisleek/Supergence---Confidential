import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import conversations from '../../server/conversations.js';
import { ConversationTurns } from '../../server/services/conversationTurns.js';
import { RuntimeAccess } from '../../server/services/runtimeAccess.js';
import { reviewTaskCompletion, compactTaskCall } from '../../server/services/taskCompletion.js';

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'supergence-recovery-'));
  conversations.setStorageDir(path.join(directory, 'chats'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return { directory, turns: new ConversationTurns(conversations, { retryDelayMs: 1 }) };
}
test('transient disconnect resumes confirmed results without repeating the side effect', async (t) => {
  const { turns } = fixture(t);
  let executions = 0,
    attempts = 0;
  const params = {
    conversationId: 'recover',
    requestId: 'request',
    query: 'Create and verify the report.',
  };
  const result = await turns.run(params, {}, async (next, events) => {
    attempts++;
    if (!next.recoveryAttempt) {
      executions++;
      events.onToolCall({
        id: 'write',
        tool: 'write_file',
        status: 'RUNNING',
        args: { path: 'report.md' },
      });
      events.onToolResult({
        id: 'write',
        tool: 'write_file',
        status: 'RESOLVED',
        output: { success: true },
      });
      assert.equal(conversations.get('recover').messages[1].toolCalls[0].status, 'RESOLVED');
      throw new Error('Socket connection interrupted');
    }
    assert.equal(next.query, 'continue');
    assert.equal(next.history.at(-1).toolCalls[0].status, 'RESOLVED');
    return {
      response: 'Verified report.',
      completionAudit: { status: 'complete' },
      toolCalls: [
        { id: 'read', tool: 'read_file', status: 'RESOLVED', output: { content: 'report' } },
      ],
    };
  });
  assert.equal(executions, 1);
  assert.equal(attempts, 2);
  assert.equal(result.recoveryAttempts, 1);
  assert.equal(turns.status('recover', 'request').status, 'completed');
  assert.equal(conversations.get('recover').messages.length, 2);
});
test('restart reconciles an action whose outcome was never recorded', async (t) => {
  const { turns } = fixture(t);
  const params = { conversationId: 'restart', requestId: 'request', query: 'Create the report.' };
  await turns.run(params, {}, async () => ({ response: 'done' }));
  const saved = conversations.get('restart').messages;
  Object.assign(saved[1], {
    status: 'running',
    autoResume: true,
    toolCalls: [
      { id: 'unknown', tool: 'write_file', status: 'RUNNING', args: { path: 'report.md' } },
    ],
  });
  conversations.update('restart', saved);
  const restarted = new ConversationTurns(conversations, { retryDelayMs: 1 });
  let resumed = 0;
  await restarted.recoverPending((p) =>
    restarted.run(p, {}, async (next) => {
      resumed++;
      assert.equal(next.requireReconciliation, true);
      assert.equal(next.history.at(-1).toolCalls[0].status, 'UNCONFIRMED');
      return {
        response: 'Actual file inspected.',
        completionAudit: { status: 'complete' },
        toolCalls: [],
      };
    }),
  );
  assert.equal(resumed, 1);
  assert.equal(restarted.status('restart', 'request').status, 'completed');
});
test('an explicit user stop is durable and never auto-resumes', async (t) => {
  const { turns } = fixture(t);
  let started;
  const ready = new Promise((resolve) => {
    started = resolve;
  });
  const params = { conversationId: 'stop', requestId: 'request', query: 'Build a report.' };
  const pending = turns.run(params, {}, async (next) => {
    started();
    await new Promise((resolve) => next.signal.addEventListener('abort', resolve, { once: true }));
    next.signal.throwIfAborted();
  });
  await ready;
  assert.equal(turns.cancel('stop', 'request').stopped, true);
  await assert.rejects(pending, /stopped by the user/);
  assert.equal(turns.status('stop', 'request').status, 'cancelled');
  const replay = await new ConversationTurns(conversations).run(params, {}, () => {
    throw new Error('must not execute');
  });
  assert.equal(replay.taskStatus, 'cancelled');
});
test('Full access authorizes ordinary application source edits and resolves a waiting source-only review', async (t) => {
  const { directory } = fixture(t);
  const access = new RuntimeAccess({ directory, timeoutMs: 1000 });
  access.update({ mode: 'full-access' });
  await access.authorize('write_file', {
    path: 'client/example.js',
    content: 'export const value=1;',
  });
  await access.authorize('run_command', { command: 'Set-Content client/example.js "export {}"' });
  assert.equal(access.pending.size, 0);
  access.update({ mode: 'ask-before-executing' });
  const pending = access.authorize('write_file', {
    path: 'client/example.js',
    content: 'export const value=2;',
  });
  assert.equal(access.pending.size, 1);
  access.update({ mode: 'full-access' });
  await pending;
  const guarded = access.authorize('read_file', { path: '.env' });
  assert.equal(access.pending.size, 1);
  access.resolve([...access.pending.keys()][0], false);
  await assert.rejects(guarded, /declined/);
});
test('completion review cannot certify unexecuted actions and retains large failure flags', async () => {
  const complete = async () => ({
    choices: [
      {
        message: {
          content: JSON.stringify({ status: 'complete', remaining: [], reason: 'Looks done' }),
        },
      },
    ],
  });
  const verdict = await reviewTaskCompletion(
    { goal: 'Build the report', response: 'I will do it', calls: [], fullAccess: true },
    complete,
  );
  assert.equal(verdict.status, 'continue');
  const compact = compactTaskCall({
    output: { exitCode: 1, error: 'test failed', stdout: 'x'.repeat(9000) },
  });
  assert.equal(compact.output.exitCode, 1);
  assert.equal(compact.output.error, 'test failed');
});

test('conversation turns double checks unfinished task and continues until completion review confirms complete', async (t) => {
  const { turns } = fixture(t);
  let turnsRun = 0;
  const params = {
    conversationId: 'double-check',
    requestId: 'req-1',
    query: 'Process data files.',
  };
  const result = await turns.run(params, {}, async (next) => {
    turnsRun++;
    if (turnsRun === 1) {
      return {
        response: 'Started work.',
        completionAudit: { status: 'continue', remaining: ['Complete remaining file updates.'] },
        toolCalls: [
          { id: 'c1', tool: 'write_file', status: 'RESOLVED', output: { success: true } },
        ],
      };
    }
    return {
      response: 'All data files processed and verified.',
      completionAudit: { status: 'complete', remaining: [] },
      toolCalls: [{ id: 'c2', tool: 'read_file', status: 'RESOLVED', output: { success: true } }],
    };
  });
  assert.equal(turnsRun, 2);
  assert.equal(result.taskStatus, 'completed');
  assert.equal(turns.status('double-check', 'req-1').status, 'completed');
});

test('full access overrides permission pauses and review prompts', async (t) => {
  const { directory } = fixture(t);
  const access = new RuntimeAccess({ directory });
  access.update({ mode: 'full-access' });
  assert.equal(access.settings.mode, 'full-access');

  const complete = async () => ({
    choices: [
      {
        message: {
          content: JSON.stringify({
            status: 'blocked',
            remaining: ['Awaiting user permission to proceed.'],
            reason: 'Requires user approval',
          }),
        },
      },
    ],
  });
  const audit = await reviewTaskCompletion(
    {
      goal: 'Clean cache and build project',
      response: 'May I have your permission to proceed?',
      calls: [],
      fullAccess: true,
    },
    complete,
  );
  assert.equal(audit.status, 'continue');
  assert.match(audit.reason, /already authorized in Full access/);
});

test('exhausted continuation never becomes a completed task', async (t) => {
  fixture(t);
  const turns = new ConversationTurns(conversations, {
    retryDelayMs: 1,
    maxRecoveryAttempts: 0,
    maxBatches: 1,
  });
  await assert.rejects(
    turns.run(
      { conversationId: 'unfinished', requestId: 'r', query: 'Build the requested report.' },
      {},
      async () => ({
        response: 'Some requirements remain.',
        completionAudit: { status: 'continue', remaining: ['Finish report'] },
      }),
    ),
    /continuation limit/,
  );
  assert.equal(turns.status('unfinished', 'r').status, 'error');
  assert.equal(conversations.get('unfinished').messages[1].autoResume, false);
});
