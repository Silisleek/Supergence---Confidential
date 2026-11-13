import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { _electron as electron } from 'playwright-core';
import { startIdentityFixture } from './identity-fixture.mjs';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-desktop-check-'));
const identity = await startIdentityFixture();
const env = {
  ...process.env,
  APPDATA: root,
  SIS_USER_DATA_DIR: path.join(root, 'profile'),
  SIS_DATA_DIR: path.join(root, 'data'),
  SIS_WORKSPACE_DIR: path.join(root, 'workspace'),
  SIS_VAULT_DIR: path.join(root, 'vault'),
  SIS_AUDIT_DIR: path.join(root, 'audit'),
  SILISLEEK_ORIGIN: identity.origin,
  ENABLE_BACKGROUND_LLM_LOOPS: 'false',
};
for (const key of [
  'BASE_URL',
  'OPENROUTER_BASE_URL',
  'API_KEY',
  'OPENROUTER_API_KEY',
  'OPENCODE_API_KEY',
  'OPENCODE_ORG_ID',
  'OPENCODE_BASE_URL',
  'LOCAL_ROUTER_API_KEY',
  'SIS_SESSION_SECRET',
  'EVOLUTION_TOKEN',
  'DEFAULT_MODEL',
])
  delete env[key];
delete env.ELECTRON_RUN_AS_NODE;
const executablePath = process.env.SIS_TEST_EXECUTABLE;
const app = await electron.launch({
  ...(executablePath ? { executablePath, args: [] } : { args: ['.'] }),
  cwd: executablePath ? root : process.cwd(),
  env,
  timeout: 150000,
});
let diagnostics = '';
app.process().stdout?.on('data', (chunk) => {
  diagnostics += chunk.toString();
  process.stdout.write(chunk);
});
app.process().stderr?.on('data', (chunk) => {
  diagnostics += chunk.toString();
  process.stderr.write(chunk);
});
try {
  const first = await app.firstWindow({ timeout: 150000 });
  const page = first.url().startsWith('data:')
    ? app.windows().find((window) => window !== first) ||
      (await app.waitForEvent('window', { timeout: 300000 }))
    : first;
  page.on('pageerror', (error) => console.error('[Desktop page error]', error.message));
  page.on('requestfailed', (request) =>
    console.error('[Desktop request failed]', request.url(), request.failure()?.errorText),
  );
  await page.waitForURL('**/sleek-login', { timeout: 120000 });
  assert.equal(await page.locator('#btnConnectBrowser').count(), 1);
  assert.equal(await page.evaluate(async () => (await fetch('/api/provider/status')).status), 401);
  await fs.mkdir('test-results/launch-manual', { recursive: true });
  await page.screenshot({ path: 'test-results/launch-manual/desktop-fresh-sign-in.png' });
  const authorization = await page.evaluate(async () => {
    const response = await fetch('/api/silisleek/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: location.origin }),
    });
    return response.json();
  });
  const redirect = await fetch(authorization.url, { redirect: 'manual' });
  const callback = await fetch(redirect.headers.get('location'));
  assert.equal(callback.ok, true);
  assert.equal(
    await page.evaluate(async (state) => {
      const response = await fetch('/api/silisleek/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state }),
      });
      return (await response.json()).status;
    }, authorization.state),
    'complete',
  );
  await page.evaluate(() => localStorage.setItem('sis_setup_completed', 'true'));
  await page.goto(new URL('/', page.url()).href);
  await page
    .waitForFunction(() => window.__sisWorkspaceReady && window.electronAPI, null, {
      timeout: 120000,
    })
    .catch(async (error) => {
      console.error(
        '[Desktop page state]',
        page.url(),
        await page
          .evaluate(() => ({
            readyState: document.readyState,
            title: document.title,
            bridge: Boolean(window.electronAPI),
            ready: Boolean(window.__sisWorkspaceReady),
          }))
          .catch(() => null),
      );
      throw error;
    });
  const paths = await page.evaluate(() => window.electronAPI.getStoragePaths());
  await page.getByRole('heading', { name: 'Connect a model', exact: true }).waitFor();
  assert.equal(await page.locator('#obPanel4').isVisible(), true);
  const provider = await page.evaluate(async () => (await fetch('/api/provider/status')).json());
  if (executablePath) {
    assert.equal(provider.configured, false, 'Packaged fresh profile inherited a provider.');
    assert.match(
      diagnostics,
      /OpenCode: None/,
      'Packaged app adopted an unrelated OpenCode credential.',
    );
  }
  assert.equal(path.resolve(paths.dataDir), path.resolve(env.SIS_DATA_DIR));
  assert.equal(path.resolve(paths.workspaceDir), path.resolve(env.SIS_WORKSPACE_DIR));
  assert.equal(typeof (await page.evaluate(() => window.electronAPI.isMaximized())), 'boolean');
  const loadedURL = page.url();
  assert.match(loadedURL, /^http:\/\/127\.0\.0\.1:\d+\//);
  const saved = await page.evaluate(async () => {
    const response = await fetch('/api/workspace/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: 'desktop-preview-test.html', content: '<h1>Preview test</h1>' }),
    });
    return response.ok;
  });
  assert.equal(saved, true);
  const previewPromise = app.waitForEvent('window');
  await page.evaluate(() => window.open('/workspace/desktop-preview-test.html'));
  const preview = await previewPromise;
  await preview.locator('h1').waitFor();
  assert.equal(await preview.evaluate(() => Boolean(window.electronAPI)), false);
  const apiAccessible = await preview.evaluate(async () => {
    try {
      return (await fetch(`${location.origin}/api/settings`)).ok;
    } catch {
      return false;
    }
  });
  assert.equal(apiAccessible, false);
  await preview.close();
  await app.evaluate(({ BrowserWindow }, url) => {
    globalThis.__navigationAttempted = false;
    const target = BrowserWindow.getAllWindows().find(
      (window) =>
        !window.isDestroyed() &&
        !window.webContents.isDestroyed() &&
        window.webContents.getURL() === url,
    );
    if (!target) throw new Error('Main desktop window was not found.');
    target.webContents.on('will-navigate', () => {
      globalThis.__navigationAttempted = true;
    });
  }, loadedURL);
  await page.evaluate(() => {
    location.href = 'https://example.com/';
  });
  const deadline = Date.now() + 5000;
  let attempted = false;
  while (!attempted && Date.now() < deadline) {
    attempted = await app.evaluate(() => globalThis.__navigationAttempted);
    if (!attempted) await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.equal(attempted, true);
  assert.equal(page.url(), loadedURL);
  assert.doesNotMatch(diagnostics, /(?:ENOTDIR|EROFS|ERR_MODULE_NOT_FOUND)/);
  console.log(
    'Desktop fresh sign-in gate, fixture PKCE exchange, native IPC, preview isolation and navigation boundary passed. Real account sign-in remains a separate acceptance check.',
  );
} finally {
  await app.close();
  await identity.close();
}
