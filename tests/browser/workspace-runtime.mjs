import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const baseURL = process.env.SIS_BASE_URL;
if (!baseURL) throw new Error('Set SIS_BASE_URL to the actual listening app URL.');
const output = path.resolve('test-results/workspace-runtime');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 960 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const api = async (url, method = 'GET', body) => {
  const response = await fetch(new URL(url, baseURL), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, ...(await response.json()) };
};
const original = (await api('/api/access')).settings;
let pending;
try {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.SupergenceAccess && window.__sisWorkspaceReady);
  await page.locator('#workspaceAccessButton').click();
  await page.locator('#workspaceAccessMode').selectOption('ask-before-executing');
  await page.getByRole('button', { name: 'Save access settings' }).click();
  await page.waitForFunction(
    () => window.SupergenceAccess.settings?.mode === 'ask-before-executing',
  );
  await page
    .locator('#workspaceAccess')
    .getByRole('button', { name: 'Close', exact: true })
    .click();
  let resolved = false;
  const execution = api('/api/tools/execute', 'POST', {
    tool: 'run_command',
    args: { command: 'node -e "console.log(47 * 19)"' },
  }).then((value) => {
    resolved = true;
    return value;
  });
  await page.locator('#workspaceApprovals').waitFor({ state: 'visible' });
  assert.equal(resolved, false, 'The command must wait for the actual approval.');
  pending = (await api('/api/access')).pending[0]?.id;
  const approvalBox = await page.locator('#workspaceApprovals').boundingBox();
  const composerBox = await page.locator('#workspaceInp').boundingBox();
  assert.ok(approvalBox.y < composerBox.y);
  await page.getByRole('button', { name: 'Allow this turn', exact: true }).click();
  const result = await execution;
  pending = undefined;
  assert.equal(result.result.exitCode, 0);
  assert.match(result.result.stdout, /893/);
  await api('/api/access', 'PATCH', { mode: 'full-access', files: false });
  const blocked = await api('/api/tools/execute', 'POST', {
    tool: 'read_local_file',
    args: { path: 'file-that-must-not-be-read.txt' },
  });
  assert.match(blocked.result.error, /files access is disabled/);
  await api('/api/access', 'PATCH', { files: true });
  const local = await api('/api/tools/execute', 'POST', {
    tool: 'read_local_file',
    args: { path: path.resolve('resources/design/woblo.css') },
  });
  assert.match(local.result.content, /--color-primary-500/);
  const missing = await api('/api/not-a-real-workspace-route', 'POST', {});
  assert.equal(missing.status, 404);
  assert.match(missing.error, /Unknown API route/);
  await page.screenshot({ path: path.join(output, 'workspace.png') });
  assert.deepEqual(errors, []);
  await fs.writeFile(
    path.join(output, 'results.json'),
    JSON.stringify(
      {
        baseURL,
        checkedAt: new Date().toISOString(),
        checks: [
          'actual command paused for approval and ran after UI decision',
          'approval placed above composer',
          'disabled file capability prevents access',
          'actual absolute local file read',
          'unknown API route returns JSON',
        ],
        errors,
      },
      null,
      2,
    ),
  );
  console.log('Passed 5 real runtime access checks.');
} finally {
  if (pending)
    await api(`/api/access/approvals/${pending}`, 'POST', { allow: false }).catch(() => {});
  await api('/api/access', 'PATCH', original);
  await browser.close();
}
