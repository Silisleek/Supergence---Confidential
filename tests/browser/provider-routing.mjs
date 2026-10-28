import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const base = process.env.SIS_BASE_URL;
if (!base) throw new Error('Set SIS_BASE_URL to the actual server startup URL.');
const output = path.resolve('test-results/provider-routing');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const result = { baseURL: base, pageErrors: [], removedProviderRequests: [] };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => {
    localStorage.setItem(
      'sis-byok-provider',
      JSON.stringify({
        enabled: true,
        name: 'Retired provider fixture',
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: 'test-retired-key',
        model: 'old-model',
      }),
    );
    window.__providerAuditEvents = [];
    window.addEventListener('workspace-tool-activity', (e) =>
      window.__providerAuditEvents.push(e.detail),
    );
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => result.pageErrors.push(e.message));
  page.on('request', (r) => {
    if (new URL(r.url()).hostname.endsWith('groq.com'))
      result.removedProviderRequests.push(r.url());
  });
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => typeof window.startNewWorkspaceThread === 'function');
  result.cachedProviderCleared = await page.evaluate(
    () => localStorage.getItem('sis-byok-provider') === null,
  );
  assert.equal(result.cachedProviderCleared, true);
  const retired = await page.request.post(base + '/api/config/validate', {
    data: {
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: 'test-retired-key',
      model: 'old-model',
    },
  });
  assert.equal(retired.status(), 400);
  result.retiredProviderRejected = true;
  await page.evaluate(() => window.startNewWorkspaceThread());
  await page
    .locator('#workspaceInp')
    .fill(
      'Use read_file now to read supergence/projects/meridian-harbor-20261024-845b8f71/package.json. Tell me the exact export script from that file. Do not edit files, run commands, or create a city.',
    );
  await page.locator('#workspaceSendBtn').click();
  await page.waitForFunction(
    () =>
      window.__workspaceChatHistory?.some(
        (m) => m.role === 'assistant' && ['completed', 'error'].includes(m.status),
      ),
    null,
    { timeout: 180000 },
  );
  result.turn = await page.evaluate(() => {
    const a = [...window.__workspaceChatHistory].reverse().find((m) => m.role === 'assistant');
    return {
      content: a.content,
      status: a.status,
      error: a.error,
      tools: (a.toolCalls || []).map((t) => ({
        tool: t.tool,
        status: t.status,
        success: t.output?.success,
      })),
    };
  });
  result.toolEvents = await page.evaluate(() =>
    window.__providerAuditEvents.map((e) => ({
      tool: e.tool || e.name,
      phase: e.phase,
      success: e.success,
      outputSuccess: e.output?.success,
    })),
  );
  assert.equal(result.turn.status, 'completed', JSON.stringify(result.turn));
  assert.match(result.turn.content, /node scripts\/build\.js --export/);
  assert.ok(result.turn.tools.some((t) => t.tool === 'read_file' && t.status === 'RESOLVED'));
  assert.equal(result.removedProviderRequests.length, 0);
  assert.equal(result.pageErrors.length, 0);
  const conversationId = await page.evaluate(() => window.__activeWorkspaceConvId);
  const savedConversation = await page.request.get(base + '/api/conversations/' + conversationId);
  assert.equal(savedConversation.status(), 200);
  result.conversationSaved = true;
  await page.screenshot({ path: path.join(output, 'live-app.png') });
  result.passed = true;
} catch (e) {
  result.passed = false;
  result.failure = e.message;
  process.exitCode = 1;
} finally {
  await fs.writeFile(
    path.join(output, 'browser-verification.json'),
    JSON.stringify(result, null, 2),
  );
  await browser.close();
}
console.log(JSON.stringify(result));
