import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-screenshot-live-'));
const directory = path.join(root, 'workspace');
await fs.mkdir(directory);
process.env.SIS_DATA_DIR = path.join(root, 'data');
process.env.SIS_WORKSPACE_DIR = directory;
let status = 0;
try {
  await fs.writeFile(
    path.join(directory, 'fixture.html'),
    '<!doctype html><title>Screenshot fixture</title><h1>Real browser capture</h1>',
  );
  const { default: registry } = await import('../../server/tools/registry.js');
  const result = await registry
    .get('screenshot')
    .execute({ filepath: 'fixture.html', filename: 'actual.png' });
  assert.equal(result.success, true, result.error);
  assert.match(result.limitation, /viewport/);
  const png = await fs.readFile(path.join(directory, 'actual.png'));
  assert.deepEqual(png.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  assert.ok(png.length > 1000);
  assert.equal(
    (await fs.readdir(directory)).some((name) => name.startsWith('.screenshot-')),
    false,
  );
  console.log('Headless browser captured a real PNG in an isolated workspace.');
} catch (error) {
  status = 1;
  console.error(error);
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
process.exit(status);
