import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const baseURL = process.env.SIS_BASE_URL;
if (!baseURL) throw new Error('Set SIS_BASE_URL to the running application.');
const output = path.resolve('test-results/chat-artifacts');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const prefix = `ui-browser-${Date.now()}`;
const files = [`${prefix}.html`, `${prefix}.js`, `${prefix}-error.js`];
const content = [
  '<!doctype html><html><head><meta charset="utf-8"><style>body{font:17px system-ui;background:#ece9de;color:#25392e;padding:38px}label{display:block;margin:30px 0 15px}input{width:90%}output{font-size:52px;display:block;margin-top:30px}h1{font-size:30px}p{color:#596657}</style></head><body><h1>Interactive canvas verification</h1><p>This temporary test file runs inside the conversation.</p><label for="meters">Meters</label><input id="meters" type="range" min="0" max="100" value="10"><output id="feet"></output><script>const input=document.querySelector("input");const output=document.querySelector("output");function update(){output.textContent=(Number(input.value)*3.28084).toFixed(2)+" ft"}input.addEventListener("input",update);update();</script></body></html>',
  'console.log([3, 5, 8].reduce((sum, value) => sum + value, 0));',
  'throw new Error("Intentional browser verification failure");',
];
const checks = [];
try {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__sisWorkspaceReady && window.ChatArtifacts);
  for (let index = 0; index < files.length; index++) {
    const response = await page.request.post(`${baseURL}/api/workspace/file`, {
      data: { path: files[index], content: content[index] },
    });
    assert.equal(response.ok(), true);
  }
  await page.locator('#shellNewConversation').click();
  await page.evaluate((filename) => {
    window.loadHeroArtifact({
      url: `/workspace/${filename}`,
      title: 'Interactive canvas verification',
    });
  }, files[0]);
  const preview = page.locator('.chat-artifact').first();
  await preview.getByRole('button', { name: 'Open HTML preview' }).click();
  await preview.locator('.chat-artifact-status').filter({ hasText: 'Preview loaded' }).waitFor();
  const frame = preview.locator('iframe').contentFrame();
  assert.equal(await frame.locator('output').innerText(), '32.81 ft');
  await frame.locator('input').fill('25');
  assert.equal(await frame.locator('output').innerText(), '82.02 ft');
  await preview.getByRole('button', { name: 'Code', exact: true }).click();
  assert.equal(await preview.locator('pre').first().isVisible(), true);
  await preview.getByRole('button', { name: 'Preview', exact: true }).click();
  await preview.getByRole('button', { name: 'Expand', exact: true }).click();
  assert.equal(await preview.evaluate((node) => node.classList.contains('is-expanded')), true);
  await preview.getByRole('button', { name: 'Reduce', exact: true }).click();
  assert.equal(await page.locator('#workspaceSideBrowserPane').isVisible(), false);
  await page.screenshot({ path: path.join(output, 'interactive-desktop.png') });
  checks.push(
    'real saved HTML, sandboxed iframe interaction, source/preview tabs, expand/reduce, conversation ownership',
  );
  for (const [index, expected] of [
    [1, 'Completed'],
    [2, 'Failed'],
  ]) {
    await page.evaluate(
      (filename) => window.loadHeroArtifact({ url: `/workspace/${filename}` }),
      files[index],
    );
    const card = page.locator('.chat-artifact').last();
    await card.locator('.chat-artifact-status').filter({ hasText: 'Not run' }).waitFor();
    assert.equal(await card.locator('.chat-artifact-output').isVisible(), false);
    await card.getByRole('button', { name: 'Run code', exact: true }).click();
    await card.locator('.chat-artifact-status').filter({ hasText: expected }).waitFor();
    const actual = await card.locator('.chat-artifact-output').innerText();
    assert.ok(actual.includes(index === 1 ? '16' : 'Intentional browser verification failure'));
    assert.ok(
      (await card.locator('.chat-artifact-status').innerText()).includes(
        index === 1 ? 'Exit 0' : 'Exit 1',
      ),
    );
  }
  checks.push('actual backend execution, stdout, non-zero exit and stderr, no autorun');
  await page.evaluate(
    (name) => window.loadHeroArtifact({ url: `/workspace/${name}-missing.js` }),
    prefix,
  );
  await page
    .locator('.chat-artifact')
    .last()
    .locator('.chat-artifact-status')
    .filter({ hasText: 'HTTP 404' })
    .waitFor();
  assert.equal(
    await page
      .locator('.chat-artifact')
      .last()
      .getByRole('button', { name: 'Run code' })
      .isDisabled(),
    true,
  );
  checks.push('missing file is reported honestly and cannot run');
  await page.setViewportSize({ width: 390, height: 844 });
  await preview.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, 'interactive-mobile.png') });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  checks.push('mobile inline canvas fits viewport');
  // Exercise the source-card action as it appears in a rendered assistant turn.
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.evaluate(() => {
    const stream = document.getElementById('chatTurnsStream');
    const turn = createTurnElement('Code action verification', 'code-action-verification');
    turn.querySelector('.response-body-markdown').innerHTML = formatMarkdown(
      '```javascript\nconst total = 3 + 5;\nconsole.log(total);\n// Review before running\n```',
    );
    stream.append(turn);
  });
  const codeTurn = page.locator('#code-action-verification');
  await codeTurn.getByRole('button', { name: 'Open in chat', exact: true }).click();
  await codeTurn.locator('.chat-artifact-status').filter({ hasText: 'Not run' }).waitFor();
  assert.equal(await codeTurn.locator('.chat-artifact-output').isVisible(), false);
  assert.equal(await codeTurn.locator('.chat-artifact').count(), 1);
  checks.push('rendered code-card action opens within its own turn without execution');
  assert.deepEqual(errors, []);
  await fs.writeFile(
    path.join(output, 'results.json'),
    JSON.stringify(
      {
        baseURL,
        checks,
        errors,
        checkedAt: new Date().toISOString(),
        note: 'Temporary files use actual workspace and execution APIs; no model response was simulated or requested.',
      },
      null,
      2,
    ),
  );
  console.log(`Passed ${checks.length} inline artifact checks.`);
} finally {
  for (const filename of files) {
    await page.request
      .delete(`${baseURL}/api/workspace/file`, { data: { path: filename } })
      .catch(() => {});
  }
  await browser.close();
}
