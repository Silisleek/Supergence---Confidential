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
      mode: 'approve-for-me',
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

test('computer control and folder operations require the appropriate enabled capability', () => {
  assert.ok(operationPolicy('capture_screen').capabilities.includes('browser'));
  assert.ok(operationPolicy('kill_process').capabilities.includes('terminal'));
  assert.ok(operationPolicy('launch_application').capabilities.includes('terminal'));
  assert.ok(operationPolicy('delete_folder').capabilities.includes('files'));
  assert.equal(operationPolicy('delete_local_file').routine, false);
});

test('workspace and browser tools cannot bypass disabled capabilities', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-tool-access-'));
  t.after(async () => fs.rm(directory, { recursive: true, force: true }));
  const access = new RuntimeAccess({ directory });
  access.update({ mode: 'full-access', files: false });
  for (const tool of [
    'github_clone',
    'github_download_zip',
    'github_fetch_to_workspace',
    'grep_search',
    'extract_archive',
    'zip_create',
    'dom_read',
    'dom_interact',
    'screenshot',
    'inspect_web_app_headless',
    'execute_code_sandbox',
    'code_expert_eval',
    'auto_heal_code',
  ])
    await assert.rejects(access.authorize(tool, {}), /files access is disabled/, tool);
  access.update({ files: true, terminal: false });
  for (const tool of ['github_clone', 'execute_code_sandbox', 'code_expert_eval', 'auto_heal_code'])
    await assert.rejects(access.authorize(tool, {}), /terminal access is disabled/, tool);
  await assert.rejects(
    access.authorize('code_expert_eval', {
      filename: 'demo.htm',
      language: 'javascript',
      autoHeal: false,
    }),
    /terminal access is disabled/,
  );
  await assert.rejects(
    access.authorize('inspect_web_app_headless', { autoHeal: true }),
    /terminal access is disabled/,
  );
  access.update({ terminal: true, browser: false });
  for (const tool of ['screenshot', 'inspect_web_app_headless'])
    await assert.rejects(access.authorize(tool, {}), /browser access is disabled/, tool);
  await assert.rejects(
    access.authorize('code_expert_eval', { filename: 'demo.html', autoHeal: false }),
    /browser access is disabled/,
  );
});

test('cookie exports and imports require explicit review even in full access', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-cookie-access-'));
  try {
    const access = new RuntimeAccess({ directory, timeoutMs: 2000 });
    access.update({ mode: 'full-access' });
    for (const name of ['browser_save_cookies', 'browser_load_cookies']) {
      const waiting = access.authorize(name, { agentId: 'agent-cs' });
      const approval = access.snapshot().pending[0];
      assert.match(approval.findings.join(' '), /explicit review/);
      access.resolve(approval.id, false);
      await assert.rejects(waiting, /declined/);
    }
    access.update({ files: false });
    await assert.rejects(
      access.authorize('browser_save_cookies', { agentId: 'agent-cs' }),
      /files access is disabled/,
    );
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
