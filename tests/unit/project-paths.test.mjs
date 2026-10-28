import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import workspace from '../../server/workspace/manager.js';

test('multi-file project artifacts preserve nested paths and missing reads never choose unrelated files', (t) => {
  const original = workspace.root;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sis-project-paths-'));
  const events = [];
  workspace.setWorkspaceDir(root);
  workspace.setBroadcast((type, data) => events.push({ type, data }));
  t.after(() => {
    workspace.setBroadcast(null);
    workspace.setWorkspaceDir(original);
    assert.ok(path.resolve(root).startsWith(path.join(os.tmpdir(), 'sis-project-paths-')));
    fs.rmSync(root, { recursive: true, force: true });
  });
  workspace.createFile('index.html', '<h1>Unrelated root app</h1>');
  const file = workspace.createFile('projects/city game/index.html', '<h1>Actual nested app</h1>');
  assert.equal(file.url, '/workspace/projects/city%20game/index.html');
  const artifact = events.filter((event) => event.type === 'artifact').at(-1).data;
  assert.equal(artifact.src, '/workspace/projects/city%20game/index.html');
  assert.equal(artifact.filename, 'projects/city game/index.html');
  assert.equal(
    workspace.readFile('projects/city game/index.html').content,
    '<h1>Actual nested app</h1>',
  );
  assert.equal(workspace.readFile('projects/missing/index.html'), null);
  assert.equal(workspace.readFile('missing-file.html'), null);
  workspace.createFile('projects/city/src/city.js', 'export const buildings = [];');
  assert.throws(
    () =>
      workspace.createFile(
        'projects/city/src/city.js',
        '[Completed write: source retained in saved file]',
      ),
    /not executable source/,
  );
  assert.equal(
    workspace.readFile('projects/city/src/city.js').content,
    'export const buildings = [];',
  );
  assert.throws(
    () =>
      workspace.createFile(
        'projects/city/src/roads.js',
        '[Completed write: source retained in saved file]',
      ),
    /No file was changed/,
  );
  assert.equal(workspace.readFile('projects/city/src/roads.js'), null);
  assert.doesNotThrow(() =>
    workspace.createFile(
      'projects/city/notes.txt',
      '[Completed write: source retained in saved file]',
    ),
  );
});
