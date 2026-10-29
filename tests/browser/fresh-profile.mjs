import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const baseURL = process.env.SIS_BASE_URL;
const dataDir = process.env.SIS_DATA_DIR;
if (!baseURL || !dataDir)
  throw new Error('Set SIS_BASE_URL and SIS_DATA_DIR for an isolated backend.');
const relativeRoot = path.relative(os.tmpdir(), path.resolve(dataDir));
if (!/^sis-fresh-profile-[^\\/]+[\\/]data$/i.test(relativeRoot))
  throw new Error('This test requires a fresh sis-fresh-profile-* directory under the OS temporary directory.');
const call = async (route, method = 'GET', body) => {
  const response = await fetch(new URL(route, baseURL), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const value = await response.json();
  assert.equal(response.ok, true, value.error || `HTTP ${response.status}`);
  return value;
};
const original = (await call('/api/access')).settings;
const serverSettings = await call('/api/settings');
assert.equal(path.resolve(serverSettings.paths.dataDir), path.resolve(dataDir));
const filename = path.join(path.resolve(dataDir), 'user-identity.json');
let created = false;
try {
  const initial = await call('/api/hermes/learnings');
  assert.equal(initial.totalFacets, 0);
  assert.equal(initial.synapticUpdates, 0);
  const observation = await call('/api/hermes/learn', 'POST', {
    role: 'user',
    content: 'Do not use Apple styling without my permission.',
  });
  assert.equal(observation.state.totalFacets, 0);
  const taught = await call('/api/hermes/teach', 'POST', { fact: 'Use green for this test.' });
  assert.equal(taught.state.totalFacets, 1);
  assert.equal(taught.state.facets[0].fact, 'Use green for this test.');
  await call('/api/access', 'PATCH', { mode: 'full-access' });
  const empty = await call('/api/tools/execute', 'POST', {
    tool: 'get_user_profile',
    args: { section: 'projects' },
  });
  assert.equal(empty.result.primaryRepo, null);
  await fs.writeFile(filename, 'unreadable existing profile', { flag: 'wx' });
  created = true;
  const update = await call('/api/tools/execute', 'POST', {
    tool: 'update_user_profile',
    args: { section: 'identity', updates: { name: 'Test' } },
  });
  assert.match(update.result.error, /could not be read/);
  assert.equal(await fs.readFile(filename, 'utf8'), 'unreadable existing profile');
  console.log('Fresh profile has no invented preferences; unreadable profile was preserved.');
} finally {
  await call('/api/access', 'PATCH', original);
  if (created)
    await fs.unlink(filename).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
}
