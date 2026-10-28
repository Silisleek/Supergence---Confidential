import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright-core';

const baseURL = process.env.SIS_BASE_URL;
if (!baseURL) throw new Error('Set SIS_BASE_URL to the running SIS app.');
const output = path.resolve('test-results/learning-workspace');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.setDefaultTimeout(60000);
const errors = [];
const checks = [];
page.on('pageerror', (error) => errors.push(error.message));
const fixtureName = `learning-browser-${Date.now()}.md`;
try {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => window.__sisWorkspaceReady && window.LearningPanel && window.SupergenceBrowser,
  );
  await page.locator('#railLearning').click();
  await page.locator('#workspaceLearning').waitFor();
  await page.getByRole('button', { name: 'Retain knowledge', exact: true }).click();
  const content = await fs.readFile(path.resolve('resources/design/woblo.css'), 'utf8');
  await page.locator('#learningImportForm [name="title"]').fill('Woblo interface design tokens');
  await page.locator('#learningImportForm [name="content"]').fill(content);
  await page.locator('#learningImportForm [type="submit"]').click();
  await page
    .locator('#learningStatus')
    .filter({ hasText: /Source retained|Already retained/ })
    .waitFor();
  await page.locator('#learningSearch').fill('--color-primary-500');
  await page.locator('.learning-source-text').filter({ hasText: '#8e8771' }).waitFor();
  const digest = createHash('sha256').update(content).digest('hex');
  const id = `source-${digest.slice(0, 24)}`;
  const source = await (await page.request.get(`${baseURL}/api/learning/sources/${id}`)).json();
  assert.equal(source.source.digest, digest);
  assert.equal(source.source.state, 'retained');
  assert.equal(source.source.verified, undefined);
  await page.locator('#learningSearch').fill('');
  const card = page.locator(`[data-source-id="${id}"]`);
  await card.waitFor();
  await card.getByRole('button', { name: 'Check recall', exact: true }).click();
  await card.locator('[name="question"]').fill('--color-primary-500');
  await card.locator('[name="expectedText"]').fill('#8e8771');
  await card.getByRole('button', { name: 'Run recall check', exact: true }).click();
  await page.locator('#learningStatus').filter({ hasText: 'Recall check passed' }).waitFor();
  await page.screenshot({ path: path.join(output, 'learning-library.png') });
  checks.push(
    'actual supplied design source retained, content-addressed, cited search and exact-excerpt recall check',
  );
  await page.getByRole('button', { name: 'Reverse engineering', exact: true }).click();
  await page.locator('.learning-instructions summary').click();
  await page
    .locator('#learningSkillText')
    .filter({ hasText: 'name: reverse-engineer-anything' })
    .waitFor();
  const library = await (await page.request.get(`${baseURL}/api/learning/library`)).json();
  assert.equal(library.rea.available, true);
  assert.equal(library.rea.version, '6.5.0');
  checks.push('bundled REA workflow readable; real pinned analyzer availability');
  await page.getByRole('button', { name: 'Close learning library' }).click();
  await page.locator('#railPreferences').click();
  const palette = [];
  for (const theme of ['neutral', 'warm', 'midnight']) {
    await page.locator('#shellThemePreference').selectOption(theme);
    assert.equal(await page.evaluate(() => document.body.dataset.theme), theme);
    palette.push(
      await page.evaluate(() =>
        getComputedStyle(document.body).getPropertyValue('--shell-panel').trim(),
      ),
    );
  }
  assert.equal(new Set(palette).size, 3);
  await page.locator('#shellThemePreference').selectOption('neutral');
  await page.keyboard.press('Escape');
  checks.push('three actual themes with persisted preferences');
  const choices = page.locator('#workspaceAgentSelect option');
  assert.ok((await choices.count()) > 1);
  const agent = await choices.nth(1).getAttribute('value');
  await page.locator('#workspaceAgentSelect').selectOption(agent);
  assert.equal(await page.evaluate(() => window.__workspaceAgentId), agent);
  await page.locator('#workspaceAgentSelect').selectOption('');
  checks.push('real agent roster and chat selection');
  await page.locator('#shellNewConversation').click();
  await page.screenshot({ path: path.join(output, 'desktop.png') });
  await page.locator('[data-workspace-section="files"]').click();
  await page.locator('.wb-section-content h2').filter({ hasText: 'Workspace files' }).waitFor();
  await page.request.post(`${baseURL}/api/workspace/file`, {
    data: { path: fixtureName, content },
  });
  await page.locator('[aria-label="Search workspace files"]').fill(fixtureName);
  await page.locator('.cockpit-item').filter({ hasText: fixtureName }).waitFor();
  await page.locator('[data-browser-section="tasks"]').click();
  await page.locator('.wb-section-content h2').filter({ hasText: 'Tasks' }).waitFor();
  await page.locator('[data-browser-section="settings"]').click();
  await page.locator('.wb-section-content h2').filter({ hasText: 'Your SIS agents' }).waitFor();
  checks.push('adjacent real file search, task data and agent settings');
  await page.locator('.wb-close').click();
  await page.reload();
  await page.waitForFunction(() => window.__sisWorkspaceReady);
  await page.locator('#railLearning').click();
  await page.locator(`[data-source-id="${id}"]`).waitFor();
  checks.push('retained source visible after application reload');
  await page.getByRole('button', { name: 'Close learning library' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: path.join(output, 'mobile.png') });
  assert.deepEqual(errors, []);
  await fs.writeFile(
    path.join(output, 'results.json'),
    JSON.stringify(
      { baseURL, checks, errors, sourceId: id, checkedAt: new Date().toISOString() },
      null,
      2,
    ),
  );
  console.log(`Passed ${checks.length} learning workspace checks.`);
} finally {
  await page.request
    .delete(`${baseURL}/api/workspace/file`, { data: { path: fixtureName } })
    .catch(() => {});
  await browser.close();
}
