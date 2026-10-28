import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright-core';
const baseURL = process.env.SIS_BASE_URL;
if (!baseURL) throw new Error('Set SIS_BASE_URL to the startup banner URL.');
const out = 'workspace/supergence/quality/3d';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { checkedAt: new Date().toISOString(), checks: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(90000);
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => window.__sisWorkspaceReady && typeof window.openCreationStudio === 'function',
  );
  await page.evaluate(() => window.openWorkspace(''));
  await page.locator('#composerToolsButton').click();
  await page.locator('[data-shell-action="creation-studio"]').click();
  const link = page.getByRole('link', { name: 'Explore tested 3D architecture and games' });
  await link.waitFor();
  const popupPromise = page.waitForEvent('popup');
  await link.click();
  const evidence = await popupPromise;
  await evidence.waitForLoadState('load');
  assert.ok(evidence.url().endsWith('/quality/3d/index.html'));
  await evidence.waitForFunction(() =>
    [...document.images].every((i) => i.complete && i.naturalWidth > 0),
  );
  assert.ok((await evidence.locator('img').count()) >= 8);
  report.checks.push({
    name: `App studio opens actual 3D evidence; all ${await evidence.locator('img').count()} screenshots load`,
    passed: true,
  });
  await evidence.setViewportSize({ width: 390, height: 844 });
  assert.ok(await evidence.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
  report.checks.push({ name: '3D evidence page fits phone viewport', passed: true });
  await evidence.close();
  await page.locator('#studioClose').click();
  await page.locator('#shellNewConversation').click();
  const prompt =
    process.env.SIS_3D_QA_PROMPT ||
    'Run verify_workspace_code_task now with task="courtyard-museum" and filename="supergence/benchmarks/3d-depth-20261023/courtyard-museum/detailed/index.html". This is an existing repaired 3D scene. Do not edit or regenerate files. Report the actual checks and artifact link; passing acceptance does not prove architectural quality or one-shot success.';
  await page.locator('#workspaceInp').fill(prompt);
  const done = page.waitForResponse(
    (r) => r.url().endsWith('/api/sis/unified-turn-stream') && r.request().method() === 'POST',
    { timeout: 180000 },
  );
  await page.locator('#workspaceSendBtn').click();
  const response = await done;
  await response.finished();
  const stream = await response.text();
  await fs.writeFile(`${out}/chat-verification.sse`, stream);
  await page.waitForFunction(() => document.body.dataset.agentWorking !== 'true', null, {
    timeout: 180000,
  });
  report.conversationId = await page.evaluate(() => window.__activeWorkspaceConvId);
  const saved = await (
    await page.request.get(`${baseURL}/api/conversations/${report.conversationId}`)
  ).json();
  await fs.writeFile(`${out}/chat-verification.json`, JSON.stringify(saved, null, 2));
  assert.equal(
    saved.messages.filter((m) => m.role === 'assistant').at(-1)?.status,
    'completed',
    'Actual app conversation must finish successfully, not merely emit intermediate tool results.',
  );
  assert.match(stream, /verify_workspace_code_task/);
  assert.match(stream, /passedChecks/);
  const verified = saved.messages
    .filter((m) => m.role === 'assistant')
    .at(-1)
    ?.toolCalls?.filter((t) => t.tool === 'verify_workspace_code_task')
    .at(-1)?.output;
  assert.equal(
    verified?.passed,
    true,
    'Actual app verifier must pass, in addition to chat completion.',
  );
  report.checks.push({
    name: 'Actual Qwen app chat invokes new 3D verifier and returns execution evidence',
    passed: true,
  });
  await page.screenshot({ path: `${out}/app-chat.png` });
} catch (e) {
  report.checks.push({ name: 'App integration', passed: false, error: e.message });
  process.exitCode = 1;
} finally {
  await browser.close();
  await fs.writeFile(`${out}/app-check.json`, JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report));
