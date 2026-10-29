import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import workspace from '../../server/workspace/manager.js';
import { GitHubManager } from '../../server/github/manager.js';

test('GitHub clone passes a branch as one argument without inherited private credentials', async (t) => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-github-security-'));
  const previous = workspace.baseRoot;
  const oldSecret = process.env.SIS_SESSION_SECRET;
  workspace.setWorkspaceDir(temporary);
  process.env.SIS_SESSION_SECRET = 'private-fixture';
  t.after(async () => {
    workspace.setWorkspaceDir(previous);
    if (oldSecret === undefined) delete process.env.SIS_SESSION_SECRET;
    else process.env.SIS_SESSION_SECRET = oldSecret;
    await fs.rm(temporary, { recursive: true, force: true });
  });
  let invocation;
  const manager = new GitHubManager({
    runGit: async (program, args, options) => {
      invocation = { program, args, options };
      await fs.mkdir(args.at(-1));
    },
  });
  const branch = 'main$(malicious-command)';
  const result = await manager.cloneRepo('owner/repository', { branch });
  assert.equal(result.success, true);
  assert.equal(invocation.program, 'git');
  assert.deepEqual(invocation.args.slice(0, 5), [
    'clone',
    '--depth',
    '1',
    `--branch=${branch}`,
    '--',
  ]);
  assert.equal(invocation.args[5], 'https://github.com/owner/repository.git');
  assert.equal(invocation.options.env.SIS_SESSION_SECRET, undefined);
  assert.equal(manager.workspaceDir, temporary);
});

test('GitHub downloads reject linked workspace directories', async (t) => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-github-links-'));
  const inside = path.join(temporary, 'inside');
  const outside = path.join(temporary, 'outside');
  const previous = workspace.baseRoot;
  await fs.mkdir(inside);
  await fs.mkdir(outside);
  workspace.setWorkspaceDir(inside);
  t.after(async () => {
    workspace.setWorkspaceDir(previous);
    await fs.rm(temporary, { recursive: true, force: true });
  });
  try {
    await fs.symlink(
      outside,
      path.join(inside, 'linked'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
  } catch (error) {
    if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code))
      return t.skip('Cannot create a test link.');
    throw error;
  }
  const manager = new GitHubManager();
  assert.throws(() => manager.safeWorkspaceJoin('linked/file.txt'), /Linked paths/);
  await assert.rejects(
    manager.downloadFile('owner/repository', 'readme.md', { target: 'linked/file.txt' }),
    /Linked paths/,
  );
  assert.deepEqual(await fs.readdir(outside), []);
});
