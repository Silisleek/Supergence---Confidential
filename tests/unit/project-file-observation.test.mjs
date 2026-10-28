import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { projectFileObservation } from '../../server/services/projectFileObservation.js';
import { projectCheckpoint } from '../../server/services/projectProgress.js';

test('project checkpoints expose actual edited APIs, real syntax failures and HTML ids without executing source', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sis-source-observation-'));
  t.after(() => {
    assert.ok(root.startsWith(path.join(os.tmpdir(), 'sis-source-observation-')));
    fs.rmSync(root, { recursive: true, force: true });
  });
  fs.writeFileSync(path.join(root, 'core.js'), 'export class Walker { move(x, z) {} }');
  fs.writeFileSync(
    path.join(root, 'broken.js'),
    'export const WORLD_MIN = 0; export const WORLD_MIN = 1;',
  );
  fs.writeFileSync(
    path.join(root, 'index.html'),
    '<!-- <div id="invented"> --><canvas id="city-view"></canvas><button id="walk">Walk</button><script src="dist/bundle.js"></script>',
  );
  const calls = ['core.js', 'broken.js', 'index.html'].map((filepath) => ({
    tool: 'edit_file',
    status: 'RESOLVED',
    args: { filepath },
    output: { success: true },
  }));
  const checkpoint = projectCheckpoint(calls, root);
  assert.match(checkpoint, /class Walker/);
  assert.match(checkpoint, /move\(x, z\)/);
  assert.match(checkpoint, /already been declared/);
  assert.match(checkpoint, /city-view/);
  assert.match(checkpoint, /dist\/bundle.js/);
  const data = JSON.parse(checkpoint.slice(checkpoint.indexOf('\n') + 1));
  assert.deepEqual(data.files.find((file) => file.filepath === 'index.html').interface.ids, [
    'city-view',
    'walk',
  ]);
  assert.equal(data.latestSource.source, fs.readFileSync(path.join(root, 'index.html'), 'utf8'));
  assert.match(checkpoint, /no runtime verification/);
  const outside = projectFileObservation(root, '../outside.js');
  assert.ok(outside.unavailable);
  assert.equal(projectFileObservation(root, '.env'), null);
});
