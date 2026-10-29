import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { _electron as electron } from 'playwright-core';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-desktop-check-'));
const env = {
  ...process.env,
  APPDATA: root,
  SIS_USER_DATA_DIR: path.join(root, 'profile'),
  SIS_DATA_DIR: path.join(root, 'data'),
  SIS_WORKSPACE_DIR: path.join(root, 'workspace'),
  SIS_VAULT_DIR: path.join(root, 'vault'),
  SIS_AUDIT_DIR: path.join(root, 'audit'),
};
delete env.ELECTRON_RUN_AS_NODE;
const executablePath = process.env.SIS_TEST_EXECUTABLE;
const app = await electron.launch({
  ...(executablePath ? { executablePath, args: [] } : { args: ['.'] }),
  cwd: process.cwd(),
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
  await first.waitForURL('data:**', { timeout: 30000 });
  assert.equal(await first.locator('h1').innerText(), 'Starting Supergence');
  const page =
    app.windows().find((window) => window !== first) ||
    (await app.waitForEvent('window', { timeout: 300000 }));
  page.on('pageerror', (error) => console.error('[Desktop page error]', error.message));
  page.on('requestfailed', (request) =>
    console.error('[Desktop request failed]', request.url(), request.failure()?.errorText),
  );
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
  console.log('Desktop backend startup, native IPC, and external navigation boundary passed.');
} finally {
  await app.close();
}
