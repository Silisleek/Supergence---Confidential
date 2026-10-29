import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import workspace from '../../server/workspace/manager.js';
import { resolveWithinRoot } from '../../server/utils/path-confinement.js';
import { zipSync, strToU8 } from 'fflate';

test('workspace file operations reject junctions and preserve outside files', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sis-confinement-'));
  const previous = workspace.baseRoot;
  const inside = path.join(root, 'workspace');
  const outside = path.join(root, 'outside');
  fs.mkdirSync(inside);
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, 'protected.txt'), 'unchanged');
  workspace.setWorkspaceDir(inside);
  t.after(() => {
    workspace.setWorkspaceDir(previous);
    const relative = path.relative(os.tmpdir(), root);
    assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const link = path.join(inside, 'linked');
  try {
    fs.symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code))
      return t.skip('Cannot create a test link.');
    throw error;
  }
  assert.equal(workspace.readFile('linked/protected.txt'), null);
  assert.throws(() => workspace.createFile('linked/protected.txt', 'changed'), /Linked paths/);
  assert.throws(() => workspace.createFile('linked/new.txt', 'changed'), /Linked paths/);
  assert.throws(() => resolveWithinRoot(link, 'protected.txt'), /Linked paths/);
  assert.equal(fs.readFileSync(path.join(outside, 'protected.txt'), 'utf8'), 'unchanged');
  assert.equal(fs.existsSync(path.join(outside, 'new.txt')), false);
  assert.equal(
    workspace.listDir('').some((item) => item.name === 'linked'),
    false,
  );
  assert.equal(
    workspace.getTree('').some((item) => item.name === 'linked'),
    false,
  );
  assert.equal(
    workspace.searchFiles('linked').some((item) => item.name === 'linked'),
    false,
  );
  assert.equal(resolveWithinRoot(inside, 'normal.txt'), path.join(inside, 'normal.txt'));
});

test('archive extraction cannot follow a pre-existing junction outside the workspace', async (t) => {
  if (process.platform !== 'win32')
    return t.skip('Current archive implementation uses PowerShell.');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sis-archive-boundary-'));
  const previous = workspace.baseRoot;
  const inside = path.join(root, 'workspace');
  const outside = path.join(root, 'outside');
  fs.mkdirSync(inside);
  fs.mkdirSync(outside);
  fs.mkdirSync(path.join(inside, 'extract'));
  workspace.setWorkspaceDir(inside);
  t.after(() => {
    workspace.setWorkspaceDir(previous);
    const relative = path.relative(os.tmpdir(), root);
    assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
    fs.rmSync(root, { recursive: true, force: true });
  });
  try {
    fs.symlinkSync(outside, path.join(inside, 'extract', 'linked'), 'junction');
  } catch (error) {
    if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code))
      return t.skip('Cannot create a test link.');
    throw error;
  }
  fs.writeFileSync(
    path.join(inside, 'attack.zip'),
    zipSync({ 'linked/probe.txt': strToU8('probe') }),
  );
  await assert.rejects(workspace.extractZip('attack.zip', 'extract'));
  assert.equal(fs.existsSync(path.join(outside, 'probe.txt')), false);
  fs.writeFileSync(
    path.join(inside, 'traversal.zip'),
    zipSync({ '../escaped.txt': strToU8('probe') }),
  );
  await assert.rejects(workspace.extractZip('traversal.zip', 'extract'));
  assert.equal(fs.existsSync(path.join(inside, 'escaped.txt')), false);
  fs.writeFileSync(path.join(inside, 'safe.zip'), zipSync({ 'normal.txt': strToU8('safe') }));
  await workspace.extractZip('safe.zip', 'extract');
  assert.equal(fs.readFileSync(path.join(inside, 'extract', 'normal.txt'), 'utf8'), 'safe');
});
