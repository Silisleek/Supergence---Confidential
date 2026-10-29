import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const baseURL = process.env.SIS_BASE_URL;
if (!baseURL) throw new Error('Set SIS_BASE_URL to the running application.');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.SupergenceResultSummary);
  await page.evaluate(() => {
    const slot = document.createElement('div');
    slot.id = 'result-summary-test';
    document.body.append(slot);
    window.SupergenceResultSummary.render(slot, {
      taskStatus: 'blocked',
      artifacts: [{ name: 'index.html' }],
      toolCalls: [
        {
          tool: 'run_command',
          status: 'COMPLETED',
          args: { command: 'npm test' },
          output: { exitCode: 0, stdout: '2 tests passed' },
        },
        { tool: 'verify_page', status: 'FAILED', output: { error: 'failed' } },
        { tool: 'test_other', status: 'UNCONFIRMED' },
      ],
      completionAudit: { remaining: ['<img src=x onerror=alert(1)>'] },
    });
  });
  const summary = page.locator('#result-summary-test .workspace-result-summary');
  assert.match(await summary.innerText(), /Needs attention/);
  assert.match(await summary.innerText(), /run_command: Exit code 0/);
  assert.match(await summary.innerText(), /verify_page: Reported an error/);
  assert.match(await summary.innerText(), /test_other: Outcome not confirmed/);
  const details = summary.locator('details').first();
  assert.equal(await details.locator('pre').first().isVisible(), false);
  await details.evaluate((element) => {
    element.open = true;
  });
  assert.match(await details.innerText(), /npm test/);
  assert.match(await details.innerText(), /2 tests passed/);
  assert.equal(await summary.locator('img').count(), 0);
  await page.evaluate(() => {
    window.SupergenceResultSummary.render(document.querySelector('#result-summary-test'), {
      taskStatus: 'completed',
      artifacts: [{ name: 'index.html' }],
    });
  });
  assert.equal(await page.locator('#result-summary-test .workspace-result-summary').count(), 1);
  assert.match(await summary.innerText(), /No checks or commands recorded/);
  assert.equal(await summary.locator('li').count(), 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const recorded = {
    taskStatus: 'completed',
    success: true,
    response: 'The task finished.',
    toolCalls: [
      {
        tool: 'run_command',
        status: 'COMPLETED',
        args: { command: 'npm test' },
        output: { exitCode: 0, stdout: '2 tests passed' },
      },
    ],
    artifacts: [],
  };
  await page.route('**/api/sis/unified-turn-stream', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: `event: done\ndata: ${JSON.stringify(recorded)}\n\n`,
    }),
  );
  await page.waitForFunction(() => window.__sisWorkspaceReady && window.executeTurnInWorkspace);
  await page.evaluate(() => window.executeTurnInWorkspace('Test result display'));
  const turnSummary = page.locator('.chat-turn-item .workspace-result-summary').last();
  await turnSummary.waitFor();
  await page.getByRole('button', { name: 'Close workspace browser' }).click();
  await turnSummary.locator('summary').click();
  assert.match(await turnSummary.innerText(), /2 tests passed/);
  await page.route('**/api/conversations/result-summary-fixture', (route) =>
    route.fulfill({
      json: {
        title: 'Fixture',
        messages: [
          { role: 'user', content: 'Test result display' },
          {
            role: 'assistant',
            content: recorded.response,
            status: 'completed',
            toolCalls: recorded.toolCalls,
          },
        ],
      },
    }),
  );
  await page.evaluate(() => window.loadWorkspaceConversation('result-summary-fixture'));
  const restored = page.locator('.chat-turn-item .workspace-result-summary').last();
  if (await page.locator('#workspaceBrowserPanel').isVisible())
    await page.getByRole('button', { name: 'Close workspace browser' }).click();
  await restored.locator('summary').click();
  assert.match(await restored.innerText(), /2 tests passed/);
  console.log('Result summary browser checks passed.');
} finally {
  await browser.close();
}
