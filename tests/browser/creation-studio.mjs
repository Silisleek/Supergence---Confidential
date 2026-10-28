import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright-core';
const baseURL = process.env.SIS_BASE_URL;
if (!baseURL) throw new Error('Set SIS_BASE_URL to the startup banner URL.');
await fs.mkdir('test-results/creation-studio', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(90000);
  const response = await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  assert.equal(response.status(), 200);
  await page.waitForFunction(() => typeof window.openCreationStudio === 'function');
  const menu = page.locator('#composerToolsButton');
  // Exercise the real app entry point, then create files through the same tools
  // exposed to the assistant; no mocked backend or fake generation results.
  await page.waitForFunction(() => typeof window.openWorkspace === 'function');
  await page.evaluate(() => window.openWorkspace(''));
  await menu.click();
  await page.locator('[data-shell-action="creation-studio"]').click();
  await page.locator('#studioRoot').filter({ hasText: 'Local folder:' }).waitFor();
  await page.locator('#studioProjectForm [name="name"]').fill('Browser-verified creation study');
  await page
    .locator('#studioProjectForm [name="brief"]')
    .fill('Generate reusable wood maps and a custom vector graphic.');
  await page.locator('#studioProjectForm button').click();
  await page.locator('#studioStatus').filter({ hasText: 'Project created on disk' }).waitFor();
  const selectedText = await page.locator('#studioSelected').innerText();
  const directory = selectedText.match(/Active project: (.+?)\./)[1];
  const commandResponse = await page.request.post(baseURL + '/api/tools/execute', {
    data: {
      tool: 'run_command',
      params: { command: 'node -e "console.log(process.cwd())"', cwd: directory, timeout: 10000 },
    },
  });
  const command = (await commandResponse.json()).result;
  assert.equal(command.exitCode, 0);
  assert.ok(command.stdout.replaceAll('\\', '/').includes(directory));
  await page.locator('#studioTextureForm button').click();
  await page
    .locator('#studioStatus')
    .filter({ hasText: 'Chrome loaded it without observed errors' })
    .waitFor();
  await page.waitForFunction(
    () => document.querySelector('#studioResult img')?.naturalWidth === 512,
  );
  assert.equal(await page.locator('#studioResult a').count(), 6);
  await page.screenshot({ path: 'test-results/creation-studio/material.png' });
  await page
    .locator('#studioGraphicForm textarea')
    .fill(
      '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300"><rect width="600" height="300" fill="#123047"/><circle cx="140" cy="150" r="80" fill="#5de0cb"/><text x="260" y="170" font-size="44" fill="white">Supergence</text></svg>',
    );
  await page.locator('#studioGraphicForm button').click();
  await page
    .locator('#studioStatus')
    .filter({ hasText: 'Chrome loaded it without observed errors' })
    .waitFor();
  await page.waitForFunction(
    () => document.querySelector('#studioResult img')?.naturalWidth === 1024,
  );
  const link = await page
    .locator('#studioResult a')
    .filter({ hasText: 'Render report' })
    .getAttribute('href');
  const report = await (await page.request.get(new URL(link, baseURL).href)).json();
  assert.equal(report.passed, true);
  assert.deepEqual(report.errors, []);
  await page.screenshot({ path: 'test-results/creation-studio/graphic.png' });
  await page.locator('#studioClose').click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.openCreationStudio === 'function');
  await page.evaluate(() => window.openCreationStudio());
  await page.locator('.studio-project').filter({ hasText: directory }).click();
  assert.equal(await page.locator('#studioSavedAssets a').count(), 5);
  // A broken asset must fail its browser check, rather than invent success.
  const saved = await page.request.post(baseURL + '/api/workspace/file', {
    data: {
      path: 'supergence/reports/broken-render-check.html',
      content: '<!doctype html><img src="missing-image-for-check.png">',
    },
  });
  assert.ok(saved.ok());
  const bad = await page.request.post(baseURL + '/api/tools/execute', {
    data: {
      tool: 'verify_workspace_artifact',
      params: { filename: 'supergence/reports/broken-render-check.html' },
    },
  });
  const badReport = (await bad.json()).result;
  assert.equal(badReport.passed, false);
  assert.ok(badReport.errors.length > 0);
  console.log(JSON.stringify({ passed: true, report, brokenArtifactRejected: !badReport.passed }));
} finally {
  await browser.close();
}
