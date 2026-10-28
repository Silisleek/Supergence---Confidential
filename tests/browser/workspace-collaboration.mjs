import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
const baseURL = process.env.SIS_BASE_URL;
if (!baseURL) throw new Error('Set SIS_BASE_URL.');
const output = path.resolve('test-results/workspace-collaboration');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.setDefaultTimeout(120000);
const errors = [];
const checks = [];
const threads = new Set();
page.on('pageerror', (error) => errors.push(error.message));
async function api(url, method = 'GET', data) {
  const response = await page.request.fetch(new URL(url, baseURL).href, { method, data });
  const result = await response.json();
  if (result.success === false && !result.result) throw new Error(result.error);
  return result;
}
const original = (await api('/api/access')).settings;
let conversationId;
try {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () =>
      window.__sisWorkspaceReady &&
      window.SupergencePolish &&
      window.SupergenceProfiles?.list().length,
  );
  await page.locator('#shellNewConversation').click();
  const sidebar = page.locator('#workspaceConversationsSidebar');
  const divider = page.getByRole('separator', { name: 'Resize conversation history' });
  const before = (await sidebar.boundingBox()).width;
  const handle = await divider.boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + 150);
  await page.mouse.down();
  await page.mouse.move(handle.x + 86, handle.y + 150, { steps: 8 });
  await page.mouse.up();
  const resized = await page.evaluate(
    () => JSON.parse(localStorage.getItem('sis-workspace-layout')).sidebar,
  );
  await page.waitForFunction(
    (width) =>
      Math.abs(
        document.getElementById('workspaceConversationsSidebar').getBoundingClientRect().width -
          width,
      ) <= 2,
    resized,
  );
  assert.ok(resized > before + 60);
  await page.evaluate(() => window.SupergenceBrowser.show({ section: 'settings' }));
  await page.locator('#workspaceBrowserPanel').waitFor();
  const panelBefore = (await page.locator('#workspaceBrowserPanel').boundingBox()).width;
  const right = page.getByRole('separator', { name: 'Resize workspace browser' });
  await right.focus();
  await page.keyboard.press('ArrowLeft');
  assert.ok((await page.locator('#workspaceBrowserPanel').boundingBox()).width > panelBefore);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => window.SupergencePolish && window.SupergenceProfiles?.list().length,
  );
  await page.waitForFunction(
    (width) =>
      Math.abs(
        document.getElementById('workspaceConversationsSidebar').getBoundingClientRect().width -
          width,
      ) <= 2,
    resized,
  );
  assert.ok(Math.abs((await sidebar.boundingBox()).width - resized) <= 2);
  assert.match(
    await page.locator('body').evaluate((el) => getComputedStyle(el).cursor),
    /default\.cur/,
  );
  assert.match(
    await page.locator('#workspaceInp').evaluate((el) => getComputedStyle(el).cursor),
    /text\.cur/,
  );
  checks.push('pointer and keyboard panel sizing persists; supplied cursors are applied');

  await api('/api/access', 'PATCH', {
    mode: 'ask-before-executing',
    browser: true,
    terminal: true,
    files: true,
  });
  await page.evaluate(() => {
    void window.executeTurnInWorkspace(
      'Use the registered run_command tool with command node -e "console.log(47 * 19)" and report the actual output. Announce the immediate step in one short sentence before the tool call.',
    );
  });
  await page.locator('#workspaceApprovals').waitFor({ state: 'visible' });
  await page.waitForFunction(() =>
    document.querySelector('#workspaceApprovals')?.textContent.includes('run command'),
  );
  conversationId = await page.evaluate(() => window.__activeWorkspaceConvId);
  assert.equal(await page.locator('#workspaceSendBtn').isEnabled(), true);
  const visibleReply = await page.locator('.response-body-markdown').last().innerText();
  assert.ok(
    visibleReply.length > 0 && !visibleReply.includes('Working on your request'),
    'A conversational progress message arrives before execution.',
  );
  assert.ok(!visibleReply.includes('"tool"'));
  assert.equal(await page.locator('.chat-turn-item .work-tree-section:visible').count(), 0);
  await page.evaluate(() => {
    void window.executeTurnInWorkspace(
      'Confirm you received this follow-up in one short sentence.',
    );
  });
  await page.locator('.sg-queue-chip').waitFor();
  checks.push(
    'real model commentary streams before tool execution; follow-up chat stays available',
  );

  await page.getByRole('button', { name: 'Open side chat with another agent' }).click();
  await page.locator('#workspaceSideChat').waitFor();
  const roster = (await api('/api/agents/team')).agents;
  await page.locator('.sidechat-agents').selectOption(roster[1].id);
  await page.getByRole('button', { name: 'Start conversation', exact: true }).click();
  await page.waitForFunction(() => {
    const id = localStorage.getItem('sis-sidechat-thread');
    return (
      id?.startsWith('thread-') && document.querySelector('.sidechat-thread-select')?.value === id
    );
  });
  const threadId = await page.evaluate(() => localStorage.getItem('sis-sidechat-thread'));
  threads.add(threadId);
  await page.locator('.sidechat-input').fill('What is 19 + 4? Reply in a single short sentence.');
  await page.locator('.sidechat-send').click();
  await page.waitForFunction(() =>
    document
      .querySelector('.sidechat-message[data-sender="agent"] .sidechat-text')
      ?.textContent.includes('23'),
  );
  assert.equal(await page.evaluate(() => window.isTaskRunning()), true);
  const actualSide = (await api(`/api/agent-conversations/${threadId}`)).thread;
  assert.equal(actualSide.messages[0].senderId, 'user');
  assert.equal(actualSide.messages[1].senderId, roster[1].id);
  await page.screenshot({ path: path.join(output, 'concurrent-sidechat.png') });
  checks.push('another real agent replies while the main task is waiting; both identities persist');

  await page.getByRole('button', { name: 'Allow this turn', exact: true }).first().click();
  await page.waitForFunction(() => !window.isTaskRunning(), { timeout: 120000 });
  assert.match(await page.locator('.response-body-markdown').first().innerText(), /893/);
  await page.locator('.sg-dock-toggle').click();
  await page.locator('.sg-dock-details').first().locator('summary').click();
  assert.match(await page.locator('.sg-dock-details pre').first().innerText(), /run_command/);
  assert.ok(
    (await page.locator('#workspaceActivityDock').boundingBox()).y <
      (await page.locator('#workspaceInp').boundingBox()).y,
  );
  checks.push('approved command returns actual output; tool details remain above the composer');
  conversationId = await page.evaluate(() => window.__activeWorkspaceConvId);
  await api('/api/access', 'PATCH', { mode: 'full-access' });
  const exchange = await api('/api/tools/execute', 'POST', {
    tool: 'send_agent_message',
    args: {
      targetAgentId: roster[0].id,
      content: 'Explain in one sentence why source provenance matters.',
    },
  });
  threads.add(exchange.result.threadId);
  assert.equal(exchange.result.success, true, JSON.stringify(exchange.result));
  assert.equal(exchange.result.messages[0].senderId, 'supergence');
  assert.equal(exchange.result.messages[1].senderId, roster[0].id);
  checks.push('real agent-message tool persists a grounded orchestrator-to-agent exchange');

  await page.locator('.wb-close').click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: path.join(output, 'mobile.png') });
  assert.deepEqual(errors, []);
  await fs.writeFile(
    path.join(output, 'results.json'),
    JSON.stringify(
      { baseURL, checkedAt: new Date().toISOString(), checks, errors, conversationId },
      null,
      2,
    ),
  );
  console.log(
    `Passed ${checks.length} collaboration checks with actual model replies and tool execution.`,
  );
} finally {
  const access = await api('/api/access');
  for (const pending of access.pending)
    await api(`/api/access/approvals/${pending.id}`, 'POST', { allow: false });
  await api('/api/access', 'PATCH', original);
  for (const id of threads) await api(`/api/agent-conversations/${id}`, 'DELETE').catch(() => {});
  if (conversationId) await api(`/api/conversations/${conversationId}`, 'DELETE').catch(() => {});
  await browser.close();
}
