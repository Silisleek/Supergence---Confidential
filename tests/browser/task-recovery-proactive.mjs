// Real Chrome + the configured model. Only the client SSE transport is interrupted;
// task results, files, completion review and suggestion inbox come from the live server.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright-core';

const baseURL = process.env.SIS_BASE_URL;
if (!baseURL) throw new Error('Set SIS_BASE_URL to the actual server URL.');
const output = path.resolve('test-results/task-recovery-proactive');
await fs.mkdir(output, { recursive: true });
const marker = randomUUID();
const directory = path.resolve('workspace/supergence/qa', `recovery-${marker}`);
await fs.mkdir(directory, { recursive: true });
const resultFile = path.join(directory, 'once.txt');
const conversationId = `qa-recovery-${marker}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
page.setDefaultTimeout(60000);
const errors = [],
  requests = [],
  progressReads = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('request', (request) => {
  if (request.method() === 'POST' && /\/api\/sis\/unified-turn(?:-stream)?$/.test(request.url()))
    requests.push(request.postDataJSON());
  if (request.url().includes('/api/sis/turn-status?')) progressReads.push(request.url());
});
await page.addInitScript(() => {
  const realFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await realFetch(...args);
    if (
      !String(args[0]).endsWith('/api/sis/unified-turn-stream') ||
      window.__qaDisconnected ||
      !response.body
    )
      return response;
    const reader = response.body.getReader(),
      decoder = new TextDecoder();
    let tail = '';
    const body = new ReadableStream({
      async pull(controller) {
        try {
          const chunk = await reader.read();
          if (chunk.done) {
            controller.close();
            return;
          }
          controller.enqueue(chunk.value);
          tail += decoder.decode(chunk.value, { stream: true });
          if (tail.includes('event: tool-result\n')) {
            window.__qaDisconnected = true;
            controller.close();
            await reader.cancel('Intentional client disconnect after a confirmed result');
          } else tail = tail.slice(-200);
        } catch (error) {
          controller.error(error);
        }
      },
    });
    return new Response(body, { status: response.status, headers: response.headers });
  };
});
try {
  await page.request.patch(`${baseURL}/api/access`, { data: { mode: 'full-access' } });
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__sisWorkspaceReady && window.SupergenceTasks);
  await page.getByRole('button', { name: 'Suggestions and proactive settings' }).click();
  await page.waitForFunction(
    () => document.querySelector('.proactive-dialog [name=intervalMinutes]')?.value === '90',
  );
  const dialog = page.locator('.proactive-dialog');
  assert.equal(await dialog.locator('[name=folder]:checked').count(), 4);
  assert.ok(
    (await dialog.locator('article').count()) > 0,
    'Actual generated suggestions must be present.',
  );
  await page.screenshot({ path: path.join(output, 'suggestions.png') });
  const inbox = await (await fetch(`${baseURL}/api/proactive-suggestions`)).json();
  await dialog.locator('summary').click();
  if (!(await dialog.locator('[name=enabled]').isChecked())) {
    await dialog.locator('[name=enabled]').check();
  }
  await dialog.locator('[name=intervalMinutes]').selectOption('120');
  await dialog.locator('[name=activity]').uncheck();
  await dialog.getByRole('button', { name: 'Save settings', exact: true }).click();
  await page.waitForFunction(() =>
    document.querySelector('.proactive-settings summary')?.textContent.includes('120 minutes'),
  );
  const changedSettings = await (await fetch(`${baseURL}/api/proactive-suggestions`)).json();
  assert.equal(changedSettings.settings.activity, false);
  await dialog.locator('[name=intervalMinutes]').selectOption('90');
  await dialog.locator('[name=activity]').check();
  await dialog.getByRole('button', { name: 'Save settings', exact: true }).click();
  await page.waitForFunction(() =>
    document.querySelector('.proactive-settings summary')?.textContent.includes('90 minutes'),
  );
  await dialog.locator('summary').click();
  await dialog.getByRole('button', { name: 'Use this prompt' }).first().click();
  assert.equal(await page.locator('#workspaceInp').inputValue(), inbox.inbox[0].prompt);
  assert.equal(requests.length, 0, 'A suggestion only fills the composer; it does not execute.');
  await page.locator('#workspaceInp').fill('');

  const query = `Use run_command to append exactly one line containing ${marker} to the file ${resultFile.replaceAll('\\', '/')}. The parent directory already exists. Append only once. Then use read_file or read_local_file to inspect the saved file and verify it contains exactly one matching line. Finish with the observed result. This is an execution regression test; do not create any other files.`;
  await page.evaluate(
    ({ conversationId, query }) => {
      window.__activeWorkspaceConvId = conversationId;
      window.__workspaceChatHistory = [];
      localStorage.setItem('sis_workspace_conv', conversationId);
      window.__qaTurn = window.executeTurnInWorkspace(query);
    },
    { conversationId, query },
  );
  await page.waitForFunction(() => window.__qaDisconnected === true, undefined, {
    timeout: 360000,
  });
  await page.waitForFunction(() => document.body.dataset.agentWorking === 'false', undefined, {
    timeout: 360000,
  });
  assert.equal(
    requests.filter((r) => r.conversationId === conversationId).length,
    1,
    'Disconnect must not dispatch another task.',
  );
  assert.ok(progressReads.length > 0, 'UI must reconnect through durable task status.');
  const requestId = requests.find((r) => r.conversationId === conversationId).requestId;
  const completed = await (
    await fetch(
      `${baseURL}/api/sis/turn-status?${new URLSearchParams({ conversationId, requestId })}`,
    )
  ).json();
  assert.equal(completed.status, 'completed', JSON.stringify(completed));
  assert.equal(completed.completionAudit?.status, 'complete');
  const lines = (await fs.readFile(resultFile, 'utf8')).trim().split(/\r?\n/);
  assert.deepEqual(lines, [marker], 'The side effect must have happened exactly once.');
  assert.match(await page.locator('.task-progress-control').last().innerText(), /Finished/);
  await page.screenshot({ path: path.join(output, 'recovered-task.png') });

  const stopConversation = `qa-stop-${marker}`;
  await page.evaluate((id) => {
    window.__activeWorkspaceConvId = id;
    window.__workspaceChatHistory = [];
    window.__qaStop = window.executeTurnInWorkspace(
      'Use run_command to print STOP-CHECK, then read the workspace environment.',
    );
  }, stopConversation);
  await page.waitForFunction(
    () => document.querySelector('.task-progress-control button')?.textContent === 'Stop task',
  );
  // Wait for durable admission, not a fixed sleep, before issuing cancellation.
  await page.waitForFunction(async () => {
    const turn = [...document.querySelectorAll('[data-request-id]')].at(-1);
    if (!turn) return false;
    const response = await fetch(
      `/api/sis/turn-status?${new URLSearchParams({ conversationId: window.__activeWorkspaceConvId, requestId: turn.dataset.requestId })}`,
    );
    return (await response.json()).status === 'running';
  });
  await page.getByRole('button', { name: 'Stop task', exact: true }).click();
  await page.waitForFunction(() => document.body.dataset.agentWorking === 'false', undefined, {
    timeout: 90000,
  });
  const stopRequest = requests.find((r) => r.conversationId === stopConversation);
  const stopped = await (
    await fetch(
      `${baseURL}/api/sis/turn-status?${new URLSearchParams({ conversationId: stopConversation, requestId: stopRequest.requestId })}`,
    )
  ).json();
  assert.equal(stopped.status, 'cancelled');
  assert.match(await page.locator('.task-progress-control').last().innerText(), /Stopped/);
  assert.deepEqual(errors, []);
  const adviceResponse = await fetch(`${baseURL}/api/sis/unified-turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationId: `qa-advice-${marker}`,
      requestId: 'advice',
      query: 'Explain only what a file checksum is, in one sentence. Do not use tools.',
    }),
  });
  const advice = await adviceResponse.json();
  assert.equal(advice.taskStatus, 'completed', JSON.stringify(advice));
  assert.equal(
    advice.toolCalls.length,
    0,
    'An explanation must not be forced into tool execution.',
  );
  const result = {
    checkedAt: new Date().toISOString(),
    baseURL,
    conversationId,
    requestId,
    model: 'configured provider (not a scripted model)',
    completionAudit: completed.completionAudit,
    toolCalls: completed.toolCalls.map((c) => ({ tool: c.tool, status: c.status })),
    checks: [
      'live suggestion inbox renders',
      'suggestion fills composer without executing',
      'client disconnect reconciles same request',
      'actual appended line appears once',
      'completion audit certifies observed result',
      'Stop cancels task durably',
      'interval and activity settings save through the UI',
      'explanations finish without forced tool execution',
    ],
    errors,
  };
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
