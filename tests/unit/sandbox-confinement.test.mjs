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
