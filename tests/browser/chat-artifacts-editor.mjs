import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const baseURL = process.env.SIS_BASE_URL || 'http://localhost:3009';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

const testFile = `test-note-${Date.now()}.json`;
const initialContent = JSON.stringify({ name: 'Supergence Test', version: '1.0.0' }, null, 2);
const updatedContent = JSON.stringify(
  { name: 'Supergence Test', version: '2.0.0', edited: true },
  null,
  2,
);

try {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__sisWorkspaceReady && window.ChatArtifacts);

  const saveRes = await page.request.post(`${baseURL}/api/workspace/file`, {
    data: { path: testFile, content: initialContent },
  });
  assert.equal(saveRes.ok(), true);

  await page.evaluate((fn) => {
    window.loadHeroArtifact({ url: `/workspace/${fn}`, title: fn });
  }, testFile);

  const card = page.locator('.chat-artifact').last();
  await card.locator('.chat-artifact-status').filter({ hasText: 'Loaded' }).waitFor();

  assert.equal(await card.evaluate((el) => el.classList.contains('is-open')), false);
  assert.equal(await card.locator('.chat-artifact-source').isVisible(), false);
  assert.equal(await card.locator('.chat-artifact-editor-wrap').isVisible(), false);

  const titleRow = card.locator('.chat-artifact-title-row');
  assert.ok((await titleRow.innerText()).includes(testFile));

  await card.locator('.chat-artifact-header').click();
  assert.equal(await card.evaluate((el) => el.classList.contains('is-open')), true);
  assert.equal(await card.locator('.chat-artifact-source').isVisible(), true);
  const displayedSource = await card.locator('.chat-artifact-source').innerText();
  assert.ok(displayedSource.includes('Supergence Test'));

  await card.locator('.chat-artifact-view-btn').click();
  assert.equal(await card.evaluate((el) => el.classList.contains('is-open')), false);
  assert.equal(await card.locator('.chat-artifact-source').isVisible(), false);

  await card.locator('.chat-artifact-edit-btn').click();
  assert.equal(await card.evaluate((el) => el.classList.contains('is-open')), true);
  assert.equal(await card.locator('.chat-artifact-editor-wrap').isVisible(), true);

  const textarea = card.locator('textarea.chat-artifact-editor');
  assert.equal(await textarea.inputValue(), initialContent);

  await textarea.fill(updatedContent);
  await card.locator('.chat-artifact-save-btn').click();

  await card.locator('.chat-artifact-status').filter({ hasText: 'Saved' }).waitFor();
  await page.waitForTimeout(700);

  assert.equal(await card.locator('.chat-artifact-editor-wrap').isVisible(), false);
  assert.equal(await card.locator('.chat-artifact-source').isVisible(), true);
  assert.ok((await card.locator('.chat-artifact-source').innerText()).includes('2.0.0'));

  const fileOnDisk = await page.request.get(`${baseURL}/workspace/${testFile}`);
  assert.equal(fileOnDisk.ok(), true);
  const diskText = await fileOnDisk.text();
  assert.ok(diskText.includes('2.0.0'));

  console.log('Artifact collapse/expand toggle and inline edit tool verified successfully!');
} finally {
  await page.request
    .delete(`${baseURL}/api/workspace/file`, { data: { path: testFile } })
    .catch(() => {});
  await browser.close();
}
