import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import express from 'express';
import { createProjectPreviewService } from '../../server/security/project-preview.js';
import { createSessionAuth } from '../../server/security/session-auth.js';
import { localBoundary } from '../../server/security/local-boundary.js';

test('preview grants expose only the selected project, expire, and require an authenticated issuer', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-preview-grant-'));
  const workspace = path.join(root, 'workspace');
  const vendor = path.join(root, 'vendor');
  await fs.mkdir(path.join(workspace, 'project'), { recursive: true });
  await fs.mkdir(path.join(workspace, 'other'), { recursive: true });
  await fs.mkdir(vendor);
  await fs.writeFile(path.join(workspace, 'project', 'index.html'), '<title>Test</title>');
  await fs.writeFile(path.join(workspace, 'project', 'module.js'), 'export const value = 42;');
  await fs.writeFile(path.join(workspace, 'project', '.env'), 'SECRET=private');
  await fs.writeFile(path.join(workspace, 'project', 'private.pem'), 'private');
  await fs.writeFile(path.join(workspace, 'other', 'secret.txt'), 'private');
  await fs.writeFile(path.join(vendor, 'module.js'), 'export const vendor = true;');
  let enabled = true,
    time = 1000;
  const service = createProjectPreviewService({
    workspace: { baseRoot: workspace },
    vendorRoot: vendor,
    transformHtml: (html) => html,
    filesEnabled: () => enabled,
    now: () => time,
  });
  const session = createSessionAuth('a'.repeat(64));
  const app = express();
  app.use('/__project-preview', service.serve);
  app.use(localBoundary, session.middleware, express.json());
  app.post('/api/workspace/preview-grants', service.issue);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(root, { recursive: true, force: true });
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const issue = (file, authorized = true) =>
    fetch(`${origin}/api/workspace/preview-grants`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(authorized ? { authorization: `Bearer ${'a'.repeat(64)}` } : {}),
      },
      body: JSON.stringify({ path: file }),
    });
  assert.equal((await issue('project/index.html', false)).status, 401);
  assert.equal((await issue('index.html')).status, 400);
  assert.equal((await issue('project/../other/secret.txt')).status, 400);
  const grant = await (await issue('project/index.html')).json();
  const preview = new URL(grant.url, origin);
  const html = await fetch(preview);
  assert.equal(html.status, 200);
  assert.match(html.headers.get('content-security-policy'), /connect-src 'none'/);
  assert.equal(
    await (await fetch(new URL('module.js', preview), { headers: { origin: 'null' } })).text(),
    'export const value = 42;',
  );
  assert.equal((await fetch(new URL('_vendor/three/module.js', preview))).status, 200);
  assert.equal((await fetch(new URL('.env', preview))).status, 403);
  assert.equal((await fetch(new URL('private.pem', preview))).status, 403);
  assert.equal((await fetch(new URL('%2e%2e%2fother/secret.txt', preview))).status, 403);
  assert.equal((await fetch(preview, { method: 'POST' })).status, 403);
  enabled = false;
  assert.equal((await fetch(preview)).status, 403);
  service.revokeAll();
  enabled = true;
  assert.equal((await fetch(preview)).status, 404);
  const second = await (await issue('project/index.html')).json();
  time += 31 * 60 * 1000;
  assert.equal((await fetch(new URL(second.url, origin))).status, 404);
});
