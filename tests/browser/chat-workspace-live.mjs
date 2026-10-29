// Real Chrome, real configured provider and actual files/commands. No seeded UI state.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright-core';
const baseURL = process.env.SIS_BASE_URL;
if (!baseURL) throw new Error('Set SIS_BASE_URL to the actual app URL.');
const output = path.resolve('test-results/chat-workspace-live');
await fs.mkdir(output, { recursive: true });
const marker = randomUUID(),
  firstId = `qa-workspace-a-${marker}`,
  secondId = `qa-workspace-b-${marker}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.setDefaultTimeout(90000);
const errors = [],
  turns = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('request', (request) => {
  if (request.method() === 'POST' && request.url().endsWith('/api/sis/unified-turn-stream'))
    turns.push(request.postDataJSON());
});
const readWorkspace = async (id) =>
  await (await fetch(`${baseURL}/api/conversations/${id}/workspace`, { method: 'POST' })).json();
async function start(id, query) {
  await page.evaluate(
    ({ id, query }) => {
      window.__activeWorkspaceConvId = id;
      window.__workspaceChatHistory = [];
      window.__liveWorkspaceTurn = window.executeTurnInWorkspace(query);
    },
    { id, query },
  );
}
let originalAccess;
try {
  originalAccess = (await (await page.request.get(`${baseURL}/api/access`)).json()).settings;
  await page.request.patch(`${baseURL}/api/access`, { data: { mode: 'full-access' } });
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__sisWorkspaceReady && window.SupergenceChatWorkspace);
  const command = `node -e "const fs=require('fs');fs.mkdirSync('build',{recursive:true});fs.writeFileSync('build/report.txt','${marker}-ALPHA');console.log('FIRST-${marker}');setTimeout(()=>{console.error('ACTUAL-STDERR');console.log('LAST-${marker}')},8000)"`;
  await start(
    firstId,
    `Use run_command with this exact command: ${command}\nOmit cwd so it runs in this chat workspace. After it finishes, use read_file to verify build/report.txt and report the observed result. Do not create any other files.`,
  );
  await page.locator('#workspaceBrowserPanel').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#workspaceBrowserPanel').getAttribute('data-section'), 'files');
  await page.waitForFunction(
    (id) => document.querySelector('.cw-location')?.textContent.includes(id),
    firstId,
  );
  await page.getByRole('button', { name: 'Terminal', exact: true }).click();
  await page.waitForFunction(
    (marker) =>
      document.querySelector('.cw-command-output')?.textContent.includes('FIRST-' + marker),
    marker,
    { timeout: 360000 },
  );
  assert.ok(
    !(await page.locator('.cw-command-output').innerText()).includes('LAST-' + marker),
    'First stdout must arrive before the final output.',
  );
  assert.match(await page.locator('.cw-command-state').innerText(), /Running/);
  await page.screenshot({ path: path.join(output, 'terminal-running.png') });
  await page.getByRole('button', { name: 'Files', exact: true }).click();
  await page.locator('.cw-file[data-path="build"]').click();
  await page.locator('.cw-file[data-path="build/report.txt"]').click();
  await page.waitForFunction(
    (marker) => document.querySelector('.cw-source')?.textContent === marker + '-ALPHA',
    marker,
  );
  await page.screenshot({ path: path.join(output, 'file-preview.png') });
  await page.getByRole('button', { name: 'Retain', exact: true }).click();
  await page.getByRole('button', { name: 'Retained', exact: true }).waitFor();
  await page.waitForFunction(() => document.body.dataset.agentWorking === 'false', undefined, {
    timeout: 360000,
  });
  const first = await readWorkspace(firstId);
  assert.equal(
    await fs.readFile(path.join(first.root, 'build/report.txt'), 'utf8'),
    marker + '-ALPHA',
  );
  assert.ok(
    first.events.some(
      (e) =>
        e.kind === 'command-output' && e.stream === 'stderr' && e.text.includes('ACTUAL-STDERR'),
    ),
  );
  assert.ok(first.events.some((e) => e.kind === 'command-end' && e.exitCode === 0));
  const cmd2 = `node -e "const fs=require('fs');fs.mkdirSync('build',{recursive:true});fs.writeFileSync('build/report.txt','${marker}-BETA');console.log(process.cwd())"`;
  await start(
    secondId,
    `Use run_command with this exact command: ${cmd2}\nOmit cwd. Then read_file build/report.txt to verify the result. This is a separate chat and must keep its own files.`,
  );
  await page.waitForFunction(
    (id) => document.querySelector('.cw-location')?.textContent.includes(id),
    secondId,
  );
  assert.ok(
    !(await page.locator('.cw-terminal').textContent()).includes('FIRST-' + marker),
    'A different chat must not display the first chat’s command output.',
  );
  await page.waitForFunction(() => document.body.dataset.agentWorking === 'false', undefined, {
    timeout: 360000,
  });
  const second = await readWorkspace(secondId);
  assert.notEqual(first.root, second.root);
  assert.equal(
    await fs.readFile(path.join(second.root, 'build/report.txt'), 'utf8'),
    marker + '-BETA',
  );
  assert.equal(
    await fs.readFile(path.join(first.root, 'build/report.txt'), 'utf8'),
    marker + '-ALPHA',
  );
  await page.evaluate((id) => window.loadWorkspaceConversation(id), firstId);
  await page.waitForFunction(
    (id) => document.querySelector('.cw-location')?.textContent.includes(id),
    firstId,
  );
  await page.getByRole('button', { name: 'Terminal', exact: true }).click();
  await page.waitForFunction(
    (marker) =>
      document.querySelector('.cw-command-output')?.textContent.includes('LAST-' + marker),
    marker,
  );
  await page.screenshot({ path: path.join(output, 'restored-terminal.png') });
  const read = await (
    await fetch(`${baseURL}/api/conversations/${firstId}/workspace/file?path=build%2Freport.txt`)
  ).json();
  assert.equal(read.content, marker + '-ALPHA');
  assert.ok(read.url.includes(`/workspace/chats/${firstId}/`));
  assert.equal((await fetch(new URL(read.url, baseURL))).status, 200);
  const traversal = await fetch(
    `${baseURL}/api/conversations/${firstId}/workspace/file?path=..%2F..%2F${secondId}%2Fbuild%2Freport.txt`,
  );
  assert.equal(traversal.status, 400);
  assert.deepEqual(errors, []);
  const result = {
    checkedAt: new Date().toISOString(),
    baseURL,
    chats: [
      { id: firstId, root: first.root },
      { id: secondId, root: second.root },
    ],
    checks: [
      'workspace panel opens at task start',
      'stdout streams before process exit',
      'terminal-created folders and files appear live',
      'text file opens in the existing Files panel',
      'retaining file contents remains available in the chat workspace',
      'stderr and actual exit code retained',
      'two chats keep same-named files separate',
      'switching chats restores the correct command history',
      'file URLs resolve and viewer traversal is rejected',
    ],
    errors,
  };
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  if (originalAccess)
    await page.request.patch(`${baseURL}/api/access`, { data: originalAccess }).catch(() => {});
  for (const turn of turns) {
    const status = await (
      await fetch(
        `${baseURL}/api/sis/turn-status?${new URLSearchParams({ conversationId: turn.conversationId, requestId: turn.requestId })}`,
      )
    )
      .json()
      .catch(() => ({}));
    if (['running', 'checking', 'continuing', 'recovering'].includes(status.status))
      await fetch(`${baseURL}/api/sis/turn-stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: turn.conversationId, requestId: turn.requestId }),
      }).catch(() => {});
  }
  await browser.close();
}
