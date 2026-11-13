import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { _electron as electron } from 'playwright-core';
import { startIdentityFixture } from './identity-fixture.mjs';

const executablePath = process.env.SIS_TEST_EXECUTABLE;
if (!executablePath || !path.isAbsolute(executablePath))
  throw new Error('Set SIS_TEST_EXECUTABLE to the packaged candidate.');
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-desktop-persistence-'));
const fixture = await startIdentityFixture();
const marker = randomUUID();
let app;
async function open(profile) {
  const env = {
    ...process.env,
    APPDATA: profile,
    SIS_USER_DATA_DIR: path.join(profile, 'profile'),
    SIS_DATA_DIR: path.join(profile, 'data'),
    SIS_WORKSPACE_DIR: path.join(profile, 'workspace'),
    SIS_VAULT_DIR: path.join(profile, 'vault'),
    SIS_AUDIT_DIR: path.join(profile, 'audit'),
    SILISLEEK_ORIGIN: fixture.origin,
    ENABLE_BACKGROUND_LLM_LOOPS: 'false',
  };
  for (const key of [
    'ELECTRON_RUN_AS_NODE',
    'BASE_URL',
    'OPENROUTER_BASE_URL',
    'API_KEY',
    'OPENROUTER_API_KEY',
    'LOCAL_ROUTER_API_KEY',
    'SIS_SESSION_SECRET',
    'DEFAULT_MODEL',
  ])
    delete env[key];
  await fs.mkdir(profile, { recursive: true });
  app = await electron.launch({ executablePath, args: [], cwd: profile, env, timeout: 150000 });
  const first = await app.firstWindow({ timeout: 150000 });
  const page = first.url().startsWith('data:')
    ? app.windows().find((window) => window !== first) ||
      (await app.waitForEvent('window', { timeout: 150000 }))
    : first;
  await page.waitForURL('**/sleek-login', { timeout: 120000 });
  const auth = await page.evaluate(async () =>
    (
      await fetch('/api/silisleek/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: location.origin }),
      })
    ).json(),
  );
  const redirect = await fetch(auth.url, { redirect: 'manual' });
  assert.equal((await fetch(redirect.headers.get('location'))).ok, true);
  assert.equal(
    await page.evaluate(
      async (state) =>
        (
          await (
            await fetch('/api/silisleek/auth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ state }),
            })
          ).json()
        ).status,
      auth.state,
    ),
    'complete',
  );
  await page.goto(new URL('/', page.url()).href);
  await page.waitForFunction(() => window.__sisWorkspaceReady && window.electronAPI, {
    timeout: 120000,
  });
  const paths = await page.evaluate(() => window.electronAPI.getStoragePaths());
  assert.equal(path.resolve(paths.dataDir), path.resolve(env.SIS_DATA_DIR));
  return page;
}
async function request(page, url, body) {
  return page.evaluate(
    async ({ url, body }) => {
      const response = await fetch(
        url,
        body === undefined
          ? {}
          : {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            },
      );
      if (!response.ok) throw new Error(`Acceptance request failed: ${url} (${response.status})`);
      return response.json();
    },
    { url, body },
  );
}
try {
  const original = path.join(directory, 'original');
  let page = await open(original);
  const retained = await request(page, '/api/learning/sources', {
    title: 'Packaged persistence check',
    content: `This is an isolated acceptance fixture. Backup marker: ${marker}`,
    sourceType: 'acceptance-fixture',
  });
  const sourceId = retained.source.id;
  const chat = await request(page, '/api/conversations', { title: `Persistence ${marker}` });
  await request(page, '/api/workspace/file', { path: 'persistence.txt', content: marker });
  await app.close();
  app = null;
  const backup = path.join(directory, 'backup');
  await fs.cp(original, backup, { recursive: true });
  for (const [label, profile] of [
    ['restart', original],
    ['restore', path.join(directory, 'restored')],
  ]) {
    if (label === 'restore') await fs.cp(backup, profile, { recursive: true });
    page = await open(profile);
    const source = await request(page, `/api/learning/sources/${sourceId}`);
    assert.ok(JSON.stringify(source).includes(marker));
    assert.equal(
      (await request(page, `/api/conversations/${chat.id}`)).title,
      `Persistence ${marker}`,
    );
    assert.equal(
      await fs.readFile(path.join(profile, 'workspace/persistence.txt'), 'utf8'),
      marker,
    );
    assert.equal((await request(page, '/api/provider/status')).configured, false);
    await app.close();
    app = null;
    console.log(
      `Packaged ${label}: retained source, conversation, workspace file, isolated paths and fresh sign-in verified.`,
    );
  }
  await fs.writeFile(
    'test-results/launch-desktop-persistence.json',
    JSON.stringify(
      {
        executablePath,
        checks: ['restart', 'restore'],
        dataDirectory: directory,
        limitation:
          'Fixture identity; same-candidate restart and closed-app backup/restore, not a cross-version installer upgrade.',
      },
      null,
      2,
    ),
  );
} finally {
  if (app) await app.close();
  await fixture.close();
}
