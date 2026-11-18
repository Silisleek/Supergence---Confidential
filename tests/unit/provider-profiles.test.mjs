import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const data = await fs.mkdtemp(path.join(os.tmpdir(), 'supergence-provider-profiles-'));
process.env.SIS_DATA_DIR = data;
const { registerProviderRoutes } = await import('../../server/routes/provider.js');
const { callAI, getDefaultModel, getBaseURL } = await import('../../server/api/provider.js');
after(() => fs.rm(data, { recursive: true, force: true }));

test('Multi-Provider Profiles: configure, list, hot-swap, and delete profiles', async (t) => {
  const app = express();
  app.use(express.json());
  const calls = [];
  app.post('/:provider/chat/completions', (req, res) => {
    calls.push({
      provider: req.params.provider,
      model: req.body.model,
      key: req.headers.authorization,
    });
    res.json({ choices: [{ message: { role: 'assistant', content: req.params.provider } }] });
  });
  registerProviderRoutes(app);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });

  const url = `http://127.0.0.1:${server.address().port}`;

  // 1. Initial list of profiles
  const listRes = await fetch(`${url}/api/provider/profiles`);
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  assert.ok(Array.isArray(listData.profiles), 'Should return profiles array');
  assert.ok(listData.active, 'Should return active profile');

  // 2. Add and activate a new local profile
  const addRes = await fetch(`${url}/api/provider/profiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 'test-ollama-qwen',
      name: 'Ollama Qwen Coder',
      baseURL: 'http://127.0.0.1:11434/v1',
      model: 'qwen2.5-coder:7b',
      activate: true,
    }),
  });
  assert.equal(addRes.status, 200);
  const addData = await addRes.json();
  assert.equal(addData.success, true);
  assert.equal(addData.active.model, 'qwen2.5-coder:7b');

  // Verify runtime model is immediately updated
  assert.equal(getDefaultModel(), 'qwen2.5-coder:7b');

  // 3. Add a second profile without activating it
  const addSecondRes = await fetch(`${url}/api/provider/profiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 'test-custom-gateway',
      name: 'Custom VLLM Gateway',
      baseURL: 'http://127.0.0.1:8000/v1',
      model: 'mistral-large',
      activate: false,
    }),
  });
  assert.equal(addSecondRes.status, 200);
  // Active model should still be qwen
  assert.equal(getDefaultModel(), 'qwen2.5-coder:7b');

  // 4. Hot-swap to the second profile
  const switchRes = await fetch(`${url}/api/provider/profiles/switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'test-custom-gateway' }),
  });
  assert.equal(switchRes.status, 200);
  const switchData = await switchRes.json();
  assert.equal(switchData.success, true);
  assert.equal(switchData.active.model, 'mistral-large');

  // Runtime model should now be mistral-large
  assert.equal(getDefaultModel(), 'mistral-large');

  const keylessRemote = await fetch(`${url}/api/provider/profiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 'keyless-remote',
      baseURL: 'https://unconfigured.invalid/v1',
      model: 'test-model',
    }),
  });
  assert.equal(keylessRemote.status, 400);
  assert.match((await keylessRemote.json()).error, /Enter an API key/);
  assert.equal(getDefaultModel(), 'mistral-large');
  assert.equal(getBaseURL(), 'http://127.0.0.1:8000/v1');
  const remainingProfiles = await (await fetch(`${url}/api/provider/profiles`)).json();
  assert.ok(!remainingProfiles.profiles.some((profile) => profile.id === 'keyless-remote'));

  // 5. Attempt to delete the currently active profile (should be rejected)
  const deleteActiveRes = await fetch(`${url}/api/provider/profiles/test-custom-gateway`, {
    method: 'DELETE',
  });
  assert.equal(deleteActiveRes.status, 400);

  // 6. Delete the inactive profile (test-ollama-qwen)
  const deleteRes = await fetch(`${url}/api/provider/profiles/test-ollama-qwen`, {
    method: 'DELETE',
  });
  assert.equal(deleteRes.status, 200);
  const deleteData = await deleteRes.json();
  assert.equal(deleteData.success, true);
  assert.ok(
    !deleteData.profiles.some((p) => p.id === 'test-ollama-qwen'),
    'Deleted profile should no longer exist',
  );

  const saveProfile = (profile) =>
    fetch(`${url}/api/provider/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
  const sameModel = await saveProfile({
    id: 'gateway-alias',
    name: 'Same model, alternate profile',
    baseURL: 'http://localhost:8000/v1/',
    model: 'mistral-large',
  });
  assert.equal(sameModel.status, 200);
  assert.equal((await sameModel.json()).active.id, 'gateway-alias');
  assert.equal(
    (await (await fetch(`${url}/api/provider/profiles`)).json()).active.id,
    'gateway-alias',
  );
  assert.equal(
    (await fetch(`${url}/api/provider/profiles/test-custom-gateway`, { method: 'DELETE' })).status,
    200,
  );

  const cloud = await saveProfile({
    id: 'private-cloud',
    baseURL: 'https://private.invalid/v1',
    model: 'cloud',
    apiKey: 'test-only-secret',
  });
  assert.equal(cloud.status, 200);
  assert.doesNotMatch(await cloud.text(), /test-only-secret|"secret"/);
  const edit = await saveProfile({
    id: 'private-cloud',
    baseURL: 'https://private.invalid/v1/',
    model: 'cloud-v2',
  });
  assert.equal(edit.status, 200);
  assert.equal((await edit.json()).active.model, 'cloud-v2');
  const changedEndpoint = await saveProfile({
    id: 'private-cloud',
    baseURL: 'https://other.invalid/v1',
    model: 'cloud-v2',
  });
  assert.equal(changedEndpoint.status, 400);
  assert.equal(getBaseURL(), 'https://private.invalid/v1');

  const keylessSibling = await saveProfile({
    id: 'private-cloud-no-key',
    baseURL: 'https://private.invalid/v1',
    model: 'cloud-v2',
    activate: false,
  });
  assert.equal(keylessSibling.status, 200);
  assert.equal(
    (await keylessSibling.json()).profiles.find((p) => p.id === 'private-cloud-no-key').hasKey,
    false,
  );

  await saveProfile({
    id: 'first-provider',
    baseURL: `${url}/first`,
    apiKey: 'first-key',
    model: 'first/model',
  });
  await saveProfile({
    id: 'second-provider',
    baseURL: `${url}/second`,
    apiKey: 'second-key',
    model: 'openrouter/auto',
  });
  const check = await fetch(`${url}/api/config/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profileId: 'first-provider',
      baseURL: `${url}/first`,
      model: 'first/model',
    }),
  });
  assert.equal(check.status, 200);
  const result = await callAI({
    model: 'old-startup-model',
    messages: [{ role: 'user', content: 'Fixture request' }],
  });
  assert.equal(result.choices[0].message.content, 'second');
  const providerModule = new URL('../../server/api/provider.js', import.meta.url).href;
  const restarted = await promisify(execFile)(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import { callAI, getBaseURL, getDefaultModel } from ${JSON.stringify(providerModule)};
    const result = await callAI({ messages: [{ role: 'user', content: 'Verify saved selection' }] });
    console.log(JSON.stringify({ baseURL: getBaseURL(), model: getDefaultModel(), reply: result.choices[0].message.content }));
  `,
    ],
    {
      env: {
        ...process.env,
        BASE_URL: `${url}/first`,
        DEFAULT_MODEL: 'old-startup-model',
        API_KEY: 'startup-key',
      },
    },
  );
  assert.deepEqual(JSON.parse(restarted.stdout.trim().split(/\r?\n/).at(-1)), {
    baseURL: `${url}/second`,
    model: 'openrouter/auto',
    reply: 'second',
  });
  assert.deepEqual(calls, [
    { provider: 'first', model: 'first/model', key: 'Bearer first-key' },
    { provider: 'second', model: 'openrouter/auto', key: 'Bearer second-key' },
    { provider: 'second', model: 'openrouter/auto', key: 'Bearer second-key' },
  ]);
});
