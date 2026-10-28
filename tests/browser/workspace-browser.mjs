import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
const baseURL = process.env.SIS_BASE_URL;
if (!baseURL) throw new Error('Set SIS_BASE_URL.');
const output = path.resolve('test-results/workspace-browser');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.setDefaultTimeout(60000);
const errors = [];
const checks = [];
page.on('pageerror', (error) => errors.push(error.message));
const filename = `browser-ui-${Date.now()}.html`;
let retainedId;
const current = async () => {
  const response = await page.request.get(`${baseURL}/api/browser/agent-supergence/page`);
  return response.json();
};
async function until(predicate, description) {
  const end = Date.now() + 60000;
  while (Date.now() < end) {
    const value = await current();
    if (predicate(value)) return value;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Browser did not reach ${description}`);
}
async function clickRemote(x, y) {
  const image = page.locator('.wb-frame');
  const box = await image.boundingBox();
  const natural = await image.evaluate((img) => ({ w: img.naturalWidth, h: img.naturalHeight }));
  const scale = Math.min(box.width / natural.w, box.height / natural.h);
  await page.mouse.click(
    box.x + (box.width - natural.w * scale) / 2 + x * scale,
    box.y + (box.height - natural.h * scale) / 2 + y * scale,
  );
}
try {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__sisWorkspaceReady && window.SupergenceBrowser);
  await page.locator('#shellNewConversation').click();
  await page.locator('#workspaceBtnSideBrowser').click();
  await page.locator('#workspaceBrowserPanel').waitFor();
  await page.evaluate(() => window.SupergenceBrowser.open('https://www.google.com/'));
  const google = await until(
    (value) =>
      /google\./.test(value.url || '') && value.title === 'Google' && value.text?.length > 0,
    'Google',
  );
  await page.waitForFunction(() => document.querySelector('.wb-frame')?.naturalWidth > 0);
  const stage = await page.locator('.wb-stage').boundingBox();
  const desktop = await until(
    (value) =>
      Math.abs(value.viewport?.width - Math.round(stage.width)) <= 1 &&
      Math.abs(value.viewport?.height - Math.round(stage.height)) <= 1,
    'desktop browser viewport',
  );
  await page.waitForFunction(({ width, height }) => {
    const frame = document.querySelector('.wb-frame');
    return frame?.naturalWidth === width && frame?.naturalHeight === height;
  }, desktop.viewport);
  assert.ok(google.text.length > 0);
  checks.push('real Google page and live Chrome frame');
  await page.screenshot({ path: path.join(output, 'google-desktop.png') });
  await page.request.post(`${baseURL}/api/workspace/file`, {
    data: {
      path: filename,
      content:
        '<!doctype html><title>Browser interaction fixture</title><style>body{font:16px system-ui;background:#eae7df;color:#262b28}button{position:absolute;left:20px;top:20px;width:130px;height:32px}input{position:absolute;left:20px;top:95px;width:200px;height:32px}p{position:absolute;left:20px;top:145px}</style><button onclick="document.title=\'Clicked\'">Verify click</button><input aria-label="Verification input" oninput="document.title=\'Typed:\'+this.value"><p>Real local browser verification</p>',
    },
  });
  await page.locator('.wb-address').fill(new URL(`/workspace/${filename}`, baseURL).href);
  await page.locator('.wb-address').press('Enter');
  await until((value) => value.title === 'Browser interaction fixture', 'local page');
  await clickRemote(70, 36);
  await until((value) => value.title === 'Clicked', 'remote click');
  await clickRemote(80, 111);
  await page.locator('.wb-stage').press('h');
  await page.locator('.wb-stage').press('e');
  await page.locator('.wb-stage').press('l');
  await page.locator('.wb-stage').press('l');
  await page.locator('.wb-stage').press('o');
  await until((value) => value.title === 'Typed:hello', 'remote typing');
  checks.push('served local link, actual DOM click and keyboard input');
  await page.locator('#workspaceRetainPage').click();
  await page.locator('#workspaceRetainPage').filter({ hasText: 'Page retained' }).waitFor();
  checks.push('actual visible browser page retained with its URL');
  const library = await (await page.request.get(`${baseURL}/api/learning/library`)).json();
  retainedId = library.sources.find((source) => source.source.includes(filename))?.id;
  const before = await page.locator('.wb-tab').count();
  await page.getByRole('button', { name: 'New browser tab', exact: true }).click();
  await page.waitForFunction(
    (count) => document.querySelectorAll('.wb-tab').length > count,
    before,
  );
  await page.locator('.wb-tab-select').first().click();
  await until((value) => value.url?.includes(filename), 'tab switch');
  checks.push('real tab creation and switching');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(
    () => document.querySelector('#workspaceBrowserPanel').getBoundingClientRect().width <= 390,
  );
  const narrow = await until((value) => value.viewport?.width <= 390, 'mobile browser viewport');
  assert.ok(narrow.viewport.width >= 320);
  await page.screenshot({ path: path.join(output, 'mobile.png') });
  checks.push('responsive panel and actual remote viewport resize');
  await page.locator('.wb-close').click();
  assert.equal(await page.locator('#workspaceBrowserPanel').isVisible(), false);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.evaluate(() => window.SupergenceBrowser.open('https://www.google.com'));
  assert.deepEqual(errors, []);
  await fs.writeFile(
    path.join(output, 'results.json'),
    JSON.stringify({ baseURL, checks, errors, checkedAt: new Date().toISOString() }, null, 2),
  );
  console.log(`Passed ${checks.length} real browser checks.`);
} finally {
  if (retainedId)
    await page.request.delete(`${baseURL}/api/learning/sources/${retainedId}`).catch(() => {});
  await page.request
    .delete(`${baseURL}/api/workspace/file`, { data: { path: filename } })
    .catch(() => {});
  await browser.close();
}
