import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const baseURL = process.env.SIS_BASE_URL;
const dataDir = process.env.SIS_DATA_DIR;
if (!baseURL || !dataDir)
  throw new Error('Set SIS_BASE_URL and SIS_DATA_DIR for an isolated backend.');
const relative = path.relative(os.tmpdir(), path.resolve(dataDir));
if (!/^sis-corrupt-profile-[^\\/]+[\\/]data$/i.test(relative))
  throw new Error('This test requires a sis-corrupt-profile-* temporary directory.');
const settings = await (await fetch(new URL('/api/settings', baseURL))).json();
assert.equal(path.resolve(settings.paths.dataDir), path.resolve(dataDir));
const filename = path.join(dataDir, 'hermes-learning-ledger.json');
const before = await fs.readFile(filename, 'utf8');
const state = await (await fetch(new URL('/api/hermes/learnings', baseURL))).json();
assert.match(state.storageError, /could not be read/);
const response = await fetch(new URL('/api/hermes/teach', baseURL), {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fact: 'Test note' }),
});
assert.equal(response.status, 500);
assert.match((await response.json()).error, /could not be read/);
assert.equal(await fs.readFile(filename, 'utf8'), before);
console.log('Corrupt preference ledger is reported and preserved.');
