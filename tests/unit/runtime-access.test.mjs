import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { RuntimeAccess, operationPolicy } from '../../server/services/runtimeAccess.js';
import {
  visibleAssistantText,
  responseWithToolCall,
  nativeToolChoice,
  publicToolArguments,
} from '../../server/services/assistantStream.js';

test('access persists defaults and rejects invalid settings', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-access-'));
  try {
    const access = new RuntimeAccess({ directory });
    assert.deepEqual(access.snapshot().settings, {
      mode: 'full-access',
      browser: true,
      terminal: true,
      files: true,
    });
    access.update({ mode: 'ask-before-executing', files: false });
    assert.equal(new RuntimeAccess({ directory }).settings.files, false);
    assert.throws(() => access.update({ terminal: 'yes' }));
    assert.throws(() => access.update({ mode: 'invented' }));
    await assert.rejects(access.authorize('read_local_file', { path: 'file.txt' }), /disabled/);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('execution waits for an explicit decision and a declined action never runs', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-access-'));
  try {
    const access = new RuntimeAccess({ directory, timeoutMs: 2000 });
    access.update({ mode: 'ask-before-executing' });
    let executed = 0;
    const request = access.run({ agentId: 'agent-cs', conversationId: 'test' }, async () => {
      await access.authorize('run_command', { command: 'node --version' });
      executed++;
      // Exact action approval is shared with nested registry dispatch in this turn.
      await access.authorize('run_command', { command: 'node --version' });
    });
    assert.equal(executed, 0);
    const approval = access.snapshot().pending[0];
    assert.equal(approval.agentId, 'agent-cs');
    access.resolve(approval.id, true);
    await request;
    assert.equal(executed, 1);
    const declined = access.authorize('run_command', { command: 'do-not-run' }).then(() => {
      executed++;
    });
    access.resolve(access.snapshot().pending[0].id, false);
    await assert.rejects(declined, /declined/);
    assert.equal(executed, 1);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('approve-for-me allows bounded routine work while terminal and unknown tools wait', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-access-'));
  try {
    const access = new RuntimeAccess({ directory, timeoutMs: 2000 });
    access.update({ mode: 'approve-for-me' });
    await access.authorize('write_file', { path: 'app.js', content: 'export {}' });
    await access.authorize('read_workspace_browser');
    assert.equal(access.snapshot().pending.length, 0);
    assert.equal(operationPolicy('write_file', { path: '../outside.js' }).routine, false);
    const waiting = access.authorize('unknown_custom_tool');
    access.resolve(access.snapshot().pending[0].id, false);
    await assert.rejects(waiting, /declined/);
    const revoked = access.authorize('run_command', { command: 'echo test' });
    access.update({ terminal: false });
    await assert.rejects(revoked, /declined/);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('stream preserves conversational commentary and keeps partial control packets private', () => {
  assert.deepEqual(
    nativeToolChoice('Use the registered run_command tool', new Set(['run_command'])),
    { type: 'function', function: { name: 'run_command' } },
  );
  assert.equal(nativeToolChoice('Can you run the tests?', new Set()), 'required');
  assert.equal(nativeToolChoice('How do I run the tests?', new Set()), 'auto');
  assert.deepEqual(
    nativeToolChoice(
      'Can you open example.test in the browser and then log in?',
      new Set(['open_workspace_browser']),
    ),
    { type: 'function', function: { name: 'open_workspace_browser' } },
  );
  assert.equal(
    nativeToolChoice(
      'Can you open my browser account user@accounts.example.test?',
      new Set(['open_workspace_browser']),
    ),
    'required',
  );
  const native = responseWithToolCall({
    text: 'I will read the selected file.',
    toolCalls: [{ function: { name: 'read_file', arguments: '{"filepath":"app.js"}' } }],
  });
  assert.equal(visibleAssistantText(native), 'I will read the selected file.');
  assert.match(native, /"tool":"read_file"/);
  assert.equal(visibleAssistantText('I’ll check the page.\n```j'), 'I’ll check the page.');
  assert.equal(
    visibleAssistantText(
      'I’ll check the page.\n```json\n{"tool":"read_workspace_browser","args":{}}\n```',
    ),
    'I’ll check the page.',
  );
  assert.equal(visibleAssistantText('```json\n{"tool":"run_command"'), '');
  assert.equal(
    visibleAssistantText('A normal response with `code`.'),
    'A normal response with `code`.',
  );
  assert.equal(visibleAssistantText('```js\nconsole.log(1)\n```'), '```js\nconsole.log(1)\n```');
});

test('browser input values stay out of public activity and approval snapshots', async () => {
  const args = { fields: [{ selector: '#password', value: 'private-fixture', type: 'password' }] };
  assert.equal(publicToolArguments('browser_fill_form', args).fields[0].value, '[private input]');
  assert.equal(args.fields[0].value, 'private-fixture');
  assert.equal(
    publicToolArguments('browser_type', { text: 'private-fixture' }).text,
    '[private input]',
  );
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-access-'));
  try {
    const access = new RuntimeAccess({ directory, timeoutMs: 2000 });
    access.update({ mode: 'ask-before-executing' });
    const waiting = access.authorize('browser_fill_form', args);
    const pending = access.snapshot().pending[0];
    assert.ok(!JSON.stringify(pending).includes('private-fixture'));
    access.resolve(pending.id, true);
    await waiting;
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
