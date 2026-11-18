import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('AREM sleep follows the selected provider and updates after provider changes', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'arem-provider-'));
  const prior = Object.fromEntries(['SIS_DATA_DIR', 'AREM_BASE_URL', 'AREM_API_KEY', 'AREM_MODEL'].map((key) => [key, process.env[key]]));
  for (const key of Object.keys(prior)) delete process.env[key];
  process.env.SIS_DATA_DIR = directory;
  const calls = [];
  const server = http.createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    calls.push({ url: req.url, model: JSON.parse(body).model, authorization: req.headers.authorization });
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ id: 'response', choices: [{ message: { role: 'assistant', content: '[]' }, finish_reason: 'stop' }] }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const { AremClient } = await import('../../server/arem/arem-client.js');
    const { evolutionSettings } = await import('../../server/services/evolutionSettings.js');
    const base = `http://127.0.0.1:${server.address().port}`;
    const client = new AremClient();
    evolutionSettings.update({ provider: { enabled: true, baseURL: `${base}/first`, apiKey: 'first-fixture', model: 'first-model' } });
    assert.equal((await client.complete({ prompt: 'Review notes' })).text, '[]');
    evolutionSettings.update({ provider: { enabled: true, baseURL: `${base}/second`, apiKey: 'second-fixture', model: 'second-model' } });
    assert.equal((await client.complete({ prompt: 'Review notes' })).text, '[]');
    assert.deepEqual(calls.map(({ url, model, authorization }) => [url, model, authorization]), [
      ['/first/chat/completions', 'first-model', 'Bearer first-fixture'],
      ['/second/chat/completions', 'second-model', 'Bearer second-fixture'],
    ]);
  } finally {
    for (const [key, value] of Object.entries(prior)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
