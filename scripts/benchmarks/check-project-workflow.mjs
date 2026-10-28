// Live regression: resume the user-authorized city in Supergence's real app.
// This evaluator writes diagnostics only; all project source is Supergence's.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const [base, conversationId, project, feedbackPath] = process.argv.slice(2);
if (!base || !conversationId || !project)
  throw new Error('Supply actual server URL, existing conversation ID and project directory.');
const output = path.resolve('test-results/project-workflow');
await fs.mkdir(output, { recursive: true });
const result = {
  scope:
    'Real browser continuation plus read-only inspection. Evaluator does not author city code.',
  events: [],
  errors: [],
};
const readyDeadline = Date.now() + 120000;
while (true) {
  try {
    const health = await fetch(base + '/api/health', { signal: AbortSignal.timeout(2000) });
    if (health.ok) break;
  } catch {
    /* Poll observed readiness rather than assuming startup timing. */
  }
  if (Date.now() >= readyDeadline) throw new Error('Supergence did not become ready.');
  await new Promise((resolve) => setTimeout(resolve, 500));
}
const browser = await chromium.launch({ channel: 'chrome', headless: true });
async function files(dir) {
  const list = [];
  for (const item of await fs.readdir(dir, { withFileTypes: true })) {
    const name = path.join(dir, item.name);
    if (item.isDirectory()) list.push(...(await files(name)));
    else
      list.push({
        path: path.relative(project, name).replaceAll('\\', '/'),
        bytes: (await fs.stat(name)).size,
      });
  }
  return list;
}
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.exposeFunction('captureProjectAction', async (event) => {
    result.events.push({
      id: event.id,
      tool: event.tool,
      phase: event.phase,
      status: event.status,
      filepath: event.args?.filepath || event.output?.path,
    });
    await fs.writeFile(
      path.join(output, 'live-actions.json'),
      JSON.stringify(result.events, null, 2),
    );
  });
  await page.addInitScript(() =>
    window.addEventListener('workspace-tool-activity', (event) =>
      window.captureProjectAction(event.detail),
    ),
  );
  page.on('pageerror', (error) => result.errors.push(error.message));
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => typeof window.loadWorkspaceConversation === 'function');
  const workspace = await (
    await page.request.post(base + '/api/tools/execute', {
      data: { tool: 'get_creation_workspace', params: {} },
    })
  ).json();
  assert.ok(workspace.result.environment.packages.three.version);
  result.environment = workspace.result.environment;
  const target = path.resolve('server/index.js');
  const search = await page.request.post(base + '/api/tools/execute', {
    data: {
      tool: 'run_command',
      params: { command: `findstr /c:"import express" "${target}" 2>nul` },
    },
    timeout: 15000,
  });
  const searched = await search.json();
  assert.equal(searched.result.exitCode, 0, JSON.stringify(searched));
  result.readOnlySearchExecuted = true;
  await page.waitForFunction(() => document.querySelector('.evo-security-alert')?.hidden === true);
  result.falseReviewBannerAbsent = true;
  await page.evaluate((id) => window.loadWorkspaceConversation(id), conversationId);
  result.before = await files(project);
  await page
    .locator('#workspaceInp')
    .fill(feedbackPath ? await fs.readFile(feedbackPath, 'utf8') : 'continue');
  await page.locator('#workspaceSendBtn').click();
  const currentRequest = await page.evaluate(
    () =>
      [...(window.__workspaceChatHistory || [])].reverse().find((m) => m.role === 'user')
        ?.requestId,
  );
  const deadline = Date.now() + 1800000;
  let sourceObserved = false;
  while (Date.now() < deadline) {
    const snapshot = await files(project);
    const source = snapshot.filter((f) => /\.[cm]?js$/.test(f.path) && f.bytes > 200);
    if (source.length && !sourceObserved) {
      sourceObserved = true;
      result.firstSourceObservedAt = new Date().toISOString();
      await page.screenshot({ path: path.join(output, 'first-real-source.png') });
    }
    result.files = snapshot;
    await fs.writeFile(
      path.join(output, 'progress.json'),
      JSON.stringify(
        { files: snapshot, sourceModules: source.length, events: result.events.length },
        null,
        2,
      ),
    );
    const completed = await page.evaluate((requestId) => {
      const a = (window.__workspaceChatHistory || []).find(
        (m) => m.role === 'assistant' && m.requestId === requestId,
      );
      return a && ['completed', 'error'].includes(a.status)
        ? {
            status: a.status,
            error: a.error,
            content: a.content,
            tools: (a.toolCalls || []).map((t) => ({
              tool: t.tool,
              status: t.status,
              filepath: t.args?.filepath,
              error: t.output?.error,
            })),
          }
        : null;
    }, currentRequest);
    // Do not mistake the previous assistant message for the new continuation.
    if (completed) {
      result.turn = completed;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  result.sourceModules = result.files.filter(
    (f) => /\.[cm]?js$/.test(f.path) && f.bytes > 200,
  ).length;
  result.pending = await (
    await page.request.get(base + '/api/access')
  )
    .json()
    .then((s) => s.pending);
  await page.screenshot({ path: path.join(output, 'continued-project.png') });
  result.cityCompletionVerified = false;
  result.passed =
    result.events.some((e) => e.tool === 'write_file' && e.status === 'RESOLVED') &&
    result.sourceModules > 0 &&
    result.errors.length === 0 &&
    result.readOnlySearchExecuted;
  if (!result.passed) process.exitCode = 1;
} catch (error) {
  result.passed = false;
  result.failure = error.message;
  process.exitCode = 1;
} finally {
  await fs.writeFile(path.join(output, 'verification.json'), JSON.stringify(result, null, 2));
  await browser.close();
}
console.log(
  JSON.stringify({
    passed: result.passed,
    turn: result.turn?.status,
    error: result.turn?.error,
    failure: result.failure,
    files: result.files?.length,
    sourceModules: result.sourceModules,
    cityCompletionVerified: result.cityCompletionVerified,
    report: path.join(output, 'verification.json'),
  }),
);
