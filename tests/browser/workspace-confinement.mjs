import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';

const baseURL = process.env.SIS_BASE_URL;
const workspaceDir = process.env.SIS_WORKSPACE_DIR;
if (!baseURL || !workspaceDir) throw new Error('Set SIS_BASE_URL and SIS_WORKSPACE_DIR for an isolated backend.');
const root = path.dirname(path.resolve(workspaceDir));
const relative = path.relative(os.tmpdir(), root);
if (!/^sis-confinement-browser-[^\\/]+$/i.test(relative))
  throw new Error('This test requires a sis-confinement-browser-* temporary directory.');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const outside = path.join(root, 'outside');
const fixture = path.join(workspaceDir, 'link-fixture');
try {
  await fs.mkdir(outside);
  await fs.mkdir(fixture, { recursive: true });
  await fs.writeFile(path.join(outside, 'protected.txt'), 'unchanged');
  await fs.symlink(outside, path.join(fixture, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  const page = await browser.newPage();
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  const results = await page.evaluate(async () => {
    const settings = await (await fetch('/api/settings')).json();
    const read = await fetch('/api/workspace/file?path=link-fixture%2Flinked%2Fprotected.txt');
    const preview = await fetch('/workspace/link-fixture/linked/protected.txt');
    const missing = await fetch('/workspace/link-fixture/missing.html');
    const tree = await (await fetch('/api/workspace/tree')).json();
    const write = await fetch('/api/workspace/file', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: 'link-fixture/linked/protected.txt', content: 'changed' }),
    });
    return { settings, tree, readStatus: read.status, previewStatus: preview.status, missingStatus: missing.status, writeStatus: write.status, write: await write.json() };
  });
  assert.equal(path.resolve(results.settings.paths.workspaceDir), path.resolve(workspaceDir));
  assert.equal(results.readStatus, 404);
  assert.equal(results.previewStatus, 403);
  assert.equal(results.missingStatus, 404);
  assert.equal(JSON.stringify(results.tree).includes('"name":"linked"'), false);
  assert.equal(results.writeStatus, 500);
  assert.match(results.write.error, /Linked paths/);
  assert.equal(await fs.readFile(path.join(outside, 'protected.txt'), 'utf8'), 'unchanged');
  await assert.rejects(fs.stat(path.join(fixture, 'missing.html')), { code: 'ENOENT' });
  console.log('Chrome workspace API rejects junction reads and writes.');
} finally {
  await browser.close();
}
