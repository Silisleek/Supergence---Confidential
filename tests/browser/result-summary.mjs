import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { compactTaskCall } from '../../server/services/taskCompletion.js';

const baseURL = process.env.SIS_BASE_URL;
if (!baseURL) throw new Error('Set SIS_BASE_URL to the running application.');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.SupergenceResultSummary);
  const research = compactTaskCall({
    tool: 'deep_research',
    status: 'RESOLVED',
    output: {
      topic: 'Research test',
      sources: [
        {
          id: 'S1',
          title: 'Retrieved reference',
          url: 'https://example.com/retrieved',
          excerpt: 'Retrieved passage. '.repeat(500),
          snippet: 'Search result text.',
          fetchStatus: 200,
        },
        {
          id: 'S2',
          title: 'Search result',
          url: 'https://example.org/snippet',
          snippet: 'Recorded search snippet.',
          fetchStatus: 503,
        },
        {
          id: 'S3',
          title: 'Unavailable reference',
          url: 'https://example.org/unavailable',
          fetchStatus: 'failed',
        },
        {
          id: 'S4',
          title: 'Blocked local reference',
          url: 'http://127.0.0.1/reference',
          fetchStatus: 'blocked-local-source',
        },
        { id: 'S5', title: 'Unsafe scheme', url: 'javascript:void(0)' },
        { id: 'S6', title: 'Embedded credentials', url: 'https://user:password@example.org/' },
      ],
    },
  });
  await page.evaluate((researchCall) => {
    const slot = document.createElement('div');
    slot.id = 'result-summary-test';
    Object.assign(slot.style, {
      position: 'fixed',
      inset: '12px',
      zIndex: '1000000',
      overflow: 'auto',
      background: 'var(--shell-bg)',
    });
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
        { tool: 'verify_route', status: 'RESOLVED' },
        { tool: 'test_other', status: 'UNCONFIRMED' },
        researchCall,
      ],
      completionAudit: { remaining: ['<img src=x onerror=alert(1)>'] },
    });
  }, research);
  const summary = page.locator('#result-summary-test .workspace-result-summary');
  assert.match(await summary.innerText(), /Needs attention/);
  assert.match(await summary.innerText(), /run_command: Exit code 0/);
  assert.match(await summary.innerText(), /verify_page: Reported an error/);
  assert.match(await summary.innerText(), /verify_route: Returned/);
  assert.match(await summary.innerText(), /test_other: Outcome not confirmed/);
  const sources = summary.locator('.workspace-result-sources');
  assert.match(await sources.locator('summary').innerText(), /Research sources \(4\)/);
  await sources.locator('summary').press('Space');
  const sourceItems = sources.locator('li');
  assert.match(await sourceItems.nth(0).innerText(), /Page retrieved.*Retrieved passage/s);
  assert.match(
    await sourceItems.nth(1).innerText(),
    /Search snippet only.*Recorded search snippet/s,
  );
  assert.match(await sourceItems.nth(2).innerText(), /Unavailable reference.*Unavailable/s);
  assert.equal(await sourceItems.nth(3).getByRole('link').count(), 0);
  assert.equal(await sources.getByRole('link').count(), 3);
  assert.equal(
    await sources.evaluate((element) => element.scrollWidth <= element.clientWidth),
    true,
  );
  assert.ok(!(await sources.innerText()).includes('Unsafe scheme'));
  assert.ok(!(await sources.innerText()).includes('Embedded credentials'));
  const retrievedLink = sourceItems.nth(0).getByRole('link');
  assert.equal(await retrievedLink.getAttribute('href'), 'https://example.com/retrieved');
  assert.equal(await retrievedLink.getAttribute('rel'), 'noopener noreferrer');
  await page
    .context()
    .route('https://example.com/retrieved', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<title>Retrieved reference</title>' }),
    );
  const [sourcePage] = await Promise.all([
    page.context().waitForEvent('page', { timeout: 8000 }),
    retrievedLink.press('Enter'),
  ]);
  await sourcePage.waitForURL('https://example.com/retrieved');
  assert.equal(await sourcePage.evaluate(() => window.opener === null), true);
  await sourcePage.close();
  const details = summary.locator('.workspace-result-details').first();
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
  for (const [status, label] of [
    ['cancelled', 'Stopped'],
    ['error', 'Stopped with an error'],
  ]) {
    await page.evaluate((status) => {
      window.SupergenceResultSummary.render(document.querySelector('#result-summary-test'), {
        status,
      });
    }, status);
    assert.equal(await summary.locator('.workspace-result-state').textContent(), label);
  }
  await page.locator('#result-summary-test').evaluate((element) => element.remove());
  const recorded = {
    taskStatus: 'completed',
    success: true,
    response: 'The task finished.',
    toolCalls: [
      {
        tool: 'run_command',
        status: 'RESOLVED',
        args: { command: 'npm test' },
        output: { exitCode: 0, stdout: '2 tests passed' },
      },
      research,
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
  const closeBrowser = page.getByRole('button', { name: 'Close workspace browser' });
  if (await closeBrowser.isVisible()) await closeBrowser.click();
  await turnSummary.locator('.workspace-result-details > summary').click();
  assert.match(await turnSummary.innerText(), /2 tests passed/);
  assert.equal(await turnSummary.locator('.workspace-result-sources').count(), 1);
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
          { role: 'user', content: 'Stop this task' },
          { role: 'assistant', content: '', status: 'cancelled' },
        ],
      },
    }),
  );
  await page.evaluate(() => window.loadWorkspaceConversation('result-summary-fixture'));
  const restored = page.locator('.chat-turn-item .workspace-result-summary').first();
  if (await closeBrowser.isVisible()) await closeBrowser.click();
  await restored.locator('.workspace-result-details > summary').click();
  assert.match(await restored.innerText(), /2 tests passed/);
  await restored.locator('.workspace-result-sources > summary').click();
  assert.match(await restored.locator('.workspace-result-sources').innerText(), /Page retrieved/);
  assert.equal(
    await page.locator('.chat-turn-item .workspace-result-state').last().textContent(),
    'Stopped',
  );
  console.log('Result summary browser checks passed.');
} finally {
  await browser.close();
}
