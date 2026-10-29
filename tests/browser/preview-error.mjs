import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const baseURL = process.env.SIS_BASE_URL;
if (!baseURL) throw new Error('Set SIS_BASE_URL to an isolated running application.');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
const filename = `preview-error-${Date.now()}.html`;
try {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__sisWorkspaceReady && window.loadHeroArtifact);
  const response = await page.request.post(`${baseURL}/api/workspace/file`, {
    data: {
      path: filename,
      content:
        '<!doctype html><html><head><script src="./missing-preview-resource.js"></script></head><body>Fixture</body></html>',
    },
  });
  assert.equal(response.ok(), true);
  await page.evaluate(
    (name) => window.loadHeroArtifact({ url: `/workspace/${name}`, filename: name }),
    filename,
  );
  const card = page.locator('.chat-artifact').last();
  await card.getByText(/may contact external sites/).waitFor();
  assert.equal(await card.locator('iframe').getAttribute('src'), null);
  assert.equal(await card.locator('iframe').isHidden(), true);
  await card.getByRole('button', { name: 'Open HTML preview' }).click();
  await card.locator('.chat-artifact-status').filter({ hasText: 'Preview error:' }).waitFor();
  assert.equal(await card.getAttribute('data-state'), 'error');
  const before = await card.locator('.chat-artifact-status').innerText();
  await page.evaluate(() =>
    window.postMessage({ type: 'sis-preview-error', message: 'forged' }, '*'),
  );
  assert.equal(await card.locator('.chat-artifact-status').innerText(), before);
  console.log('Main app reports failed preview resources and ignores unrelated messages.');
} finally {
  await page.request
    .delete(`${baseURL}/api/workspace/file`, { data: { path: filename } })
    .catch(() => {});
  await browser.close();
}
