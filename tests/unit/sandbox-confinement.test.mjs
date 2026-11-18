import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('coder sandbox confines run IDs, cleanup, and staged imports to the configured workspace', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-sandbox-confine-'));
  const workspace = path.join(root, 'workspace');
  const outside = path.join(root, 'outside');
  await fs.mkdir(outside);
  const secret = path.join(outside, 'secret.js');
  await fs.writeFile(secret, 'outside marker');
  process.env.SIS_WORKSPACE_DIR = workspace;
  const { SandboxRunner } = await import('../../server/coder/sandbox.js');
  const sandbox = new SandboxRunner(path.join(workspace, '.sandbox'));
  t.after(async () => await fs.rm(root, { recursive: true, force: true }));
  await assert.rejects(sandbox.execute({ code: '' }, '../../outside'), /Invalid sandbox run ID/);
  sandbox.cleanup('../../outside');
  assert.equal(await fs.readFile(secret, 'utf8'), 'outside marker');
  const result = await sandbox.execute(
    { targetFile: 'check.js', code: "// from './../../../outside/secret.js'\nconsole.log('ok');" },
    'safe_run',
  );
  assert.equal(result.success, true, result.error);
  await assert.rejects(fs.stat(path.join(workspace, '.sandbox', 'safe_run', 'secret.js')), {
    code: 'ENOENT',
  });
  assert.equal(await fs.readFile(secret, 'utf8'), 'outside marker');
  sandbox.cleanup('safe_run');
  await assert.rejects(fs.stat(path.join(workspace, '.sandbox', 'safe_run')), { code: 'ENOENT' });
});

test('runtime requests stay closed after a valid syntax check', async () => {
  const { SandboxRunner } = await import('../../server/coder/sandbox.js');
  const sandbox = new SandboxRunner();
  const draft = {
    targetFile: 'check.cjs',
    code: "console.log('runtime probe')",
    runCommand: 'node check.cjs',
  };
  const result = await sandbox.execute(draft);
  assert.equal(result.syntaxValid, true);
  assert.equal(result.executed, false);
  assert.equal(result.success, false);
  assert.equal(result.exitCode, null);
  assert.equal(result.stdout, '');
  assert.equal(result.phase, 'execution-unavailable');

  const { TddHarness } = await import('../../server/coder/tdd-harness.js');
  const harness = new TddHarness({ sandboxRunner: sandbox });
  const red = await harness.executeLoop({
    testFilePath: 'check.test.js',
    patchFn: () => assert.fail('An unavailable test must not authorize a patch.'),
  });
  assert.equal(red.phase, 'RED_EXECUTION_UNAVAILABLE');
});

test('TDD harness observes a failing assertion and then a passing trusted test', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-trusted-tdd-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const implementation = path.join(root, 'sum.cjs');
  const reproduction = path.join(root, 'sum.test.cjs');
  await fs.writeFile(implementation, 'module.exports = (a, b) => a - b;');
  await fs.writeFile(
    reproduction,
    `
    const test = require('node:test');
    const assert = require('node:assert/strict');
    const sum = require('./sum.cjs');
    test('adds two numbers', () => assert.equal(sum(2, 3), 5));
  `,
  );
  const { ContainerRunner } = await import('../../server/sandbox/container-runner.js');
  const { TddHarness } = await import('../../server/coder/tdd-harness.js');
  const runner = new ContainerRunner({ workspaceDir: root });
  const result = await new TddHarness({ sandboxRunner: runner }).executeLoop({
    testFilePath: reproduction,
    patchFn: () => fs.writeFile(implementation, 'module.exports = (a, b) => a + b;'),
  });
  assert.equal(result.phase, 'VERIFIED_GREEN', result.error);
  assert.deepEqual(result.runs.initialRun.testSummary, { total: 1, passed: 0, failed: 1 });
  assert.deepEqual(result.runs.postPatchRun.testSummary, { total: 1, passed: 1, failed: 0 });
});
