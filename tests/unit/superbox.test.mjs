import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'sis-superbox-'));
process.env.SIS_WORKSPACE_DIR = path.join(fixture, 'workspace');
process.env.SIS_DATA_DIR = path.join(fixture, 'data');
process.env.SIS_SUPERBOX_TEST_SECRET = 'fixture-only';
const { superbox } = await import('../../server/services/superbox.js');

after(() => fs.rmSync(fixture, { recursive: true, force: true }));

test('Superbox reports host execution and uses the workspace child environment', async () => {
  assert.equal(superbox.getStatus().isolation, 'HOST_WORKSPACE_DIRECTORY');
  const result = await superbox.runCommand(
    `"${process.execPath}" -e "console.log(JSON.stringify([process.cwd(),Boolean(process.env.SIS_SUPERBOX_TEST_SECRET)]))"`,
  );
  assert.equal(result.success, true, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), [superbox.rootDir, false]);
  assert.equal(superbox.getStatus().historyCount, 1);
});

test('Superbox stages regular files, keeps existing destinations and respects an empty selection', () => {
  superbox.reset();
  const outsideFile = path.join(fixture, 'original.txt');
  fs.writeFileSync(outsideFile, 'Keep this');
  fs.linkSync(outsideFile, path.join(superbox.rootDir, 'linked.txt'));
  superbox.createFile('draft.txt', 'Draft');
  assert.deepEqual(
    superbox.listFiles().map((entry) => entry.path),
    ['draft.txt'],
  );
  assert.throws(() => superbox.createFile('linked.txt', 'Overwritten'), /filesystem links/);
  assert.throws(() => superbox.readFile('linked.txt'), /filesystem links/);
  assert.equal(fs.readFileSync(outsideFile, 'utf8'), 'Keep this');
  assert.equal(superbox.applyToWorkspace([]).copiedCount, 0);
  assert.equal(superbox.applyToWorkspace(['draft.txt']).copiedCount, 1);
  superbox.createFile('draft.txt', 'Revised draft');
  assert.throws(() => superbox.applyToWorkspace(['draft.txt']), /already exists/);
  assert.equal(fs.readFileSync(path.join(superbox.workspaceDir, 'draft.txt'), 'utf8'), 'Draft');
});
