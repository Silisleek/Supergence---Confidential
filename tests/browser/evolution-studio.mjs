import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const baseURL = process.env.SIS_BASE_URL;
if (!baseURL) throw new Error('Set SIS_BASE_URL to the actual running app URL.');
const output = path.resolve('test-results/evolution-studio');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
const context = await browser.newContext({
  viewport: { width: 1600, height: 1050 },
  permissions: ['microphone'],
});
const page = await context.newPage();
page.setDefaultTimeout(60000);
const errors = [],
  checks = [];
page.on('pageerror', (error) => errors.push(error.message));
let token, proposalId, originalSettings;
const api = async (url = '', method = 'GET', body, headers = {}) => {
  const response = await page.request.fetch(`${baseURL}/api/evolution${url}`, {
    method,
    data: body,
    headers: { 'x-evolution-token': token || '', ...headers },
  });
  return { status: response.status(), ...(await response.json()) };
};
try {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => window.__sisWorkspaceReady && window.EvolutionStudio && window.workspaceVoiceInput,
  );
  // Exercise the existing mic path and its real post-transcript listener. Fake
  // microphone audio is silent, so actual speech transcription is not claimed.
  await page.locator('#sbt-btn-dictate').click();
  await page.waitForFunction(
    () => window.workspaceVoiceInput?.listening && window.workspaceVoiceInput?.analyser,
  );
  await page.evaluate(() => {
    const event = new Event('result');
    Object.defineProperties(event, {
      resultIndex: { value: 0 },
      results: {
        value: [Object.assign([{ transcript: 'review my next capability' }], { isFinal: true })],
      },
    });
    window.workspaceVoiceInput.recognition.dispatchEvent(event);
  });
  assert.equal(await page.locator('#workspaceInp').inputValue(), 'review my next capability');
  await page.locator('#sbt-btn-dictate').click();
  await page.waitForFunction(
    () => !window.workspaceVoiceInput.listening && !window.workspaceVoiceInput.stream,
  );
  await page.locator('#workspaceInp').fill('');
  checks.push(
    'existing dictation starts a real audio stream, handles a supplied final-transcript event, and releases the microphone; real speech remains unverified',
  );
  await page.locator('#railEvolution').click();
  await page.locator('#workspaceEvolution').waitFor();
  const initial = await api();
  token = initial.uiToken;
  originalSettings = initial.settings;
  const missingToken = await api('/proposals', 'POST', {}, { 'x-evolution-token': '' });
  assert.equal(missingToken.status, 403);
  const foreign = await api('/settings', 'PATCH', {}, { Origin: 'https://foreign.example' });
  assert.equal(foreign.status, 403);
  checks.push(
    'same-origin local mutation gate rejects missing UI capability and cross-origin requests',
  );
  const projectRoot = `workspace/projects/evolution-browser-${Date.now()}`;
  const manifest = {
    kind: 'project',
    title: 'Browser verification · calculator capability',
    rationale:
      'A real multi-file QA fixture for stage, execute, browser, review, apply and rollback.',
    files: [
      { path: `${projectRoot}/math.mjs`, content: 'export const sum=(a,b)=>a+b;' },
      {
        path: `${projectRoot}/math.test.mjs`,
        content:
          "import test from 'node:test';import assert from 'node:assert/strict';import {sum} from './math.mjs';test('sum handles mixed signs',()=>{assert.equal(sum(2,3),5);assert.equal(sum(-4,3),-1)});",
      },
      {
        path: `${projectRoot}/index.html`,
        content:
          '<!doctype html><html><head><title>Reviewed calculator</title></head><body><h1>Reviewed calculator</h1><button id="calculate">Calculate</button><output id="result">Waiting</output><script type="module">import {sum} from "./math.mjs";document.querySelector("#calculate").onclick=()=>document.querySelector("#result").textContent=String(sum(2,3));</script></body></html>',
      },
    ],
    tests: [`${projectRoot}/math.test.mjs`],
    browser: {
      entry: `${projectRoot}/index.html`,
      checks: [
        { selector: '#calculate', click: true },
        { selector: '#result', text: '5' },
      ],
    },
  };
  await page.getByText('Import a proposal manifest', { exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Proposal JSON manifest' })
    .fill(JSON.stringify(manifest));
  await page.getByRole('button', { name: 'Stage proposal', exact: true }).click();
  await page.locator('.evo-detail h3').filter({ hasText: manifest.title }).waitFor();
  proposalId = (await api()).proposals.find((p) => p.title === manifest.title).id;
  assert.equal((await api(`/proposals/${proposalId}/apply`, 'POST', {})).status, 400);
  await page.locator('.evo-file summary').filter({ hasText: 'math.mjs' }).first().click();
  await page.locator('.evo-diff').first().waitFor();
  checks.push(
    'manifest import stages concrete multi-file project, exposes before/after source, and denies unverified application',
  );
  await page.locator('#evolutionTestConsent').check();
  const verificationResponse = page.waitForResponse(
    (response) =>
      response.url() === `${baseURL}/api/evolution/proposals/${proposalId}/verify` &&
      response.request().method() === 'POST',
    { timeout: 180000 },
  );
  await page.getByRole('button', { name: 'Verify revision', exact: true }).click();
  const verificationResult = await (await verificationResponse).json();
  assert.equal(verificationResult.proposal.status, 'ready', verificationResult.proposal.failure);
  await page
    .getByRole('button', { name: 'Accept & apply revision', exact: true })
    .waitFor({ timeout: 90000 });
  const verified = (await api(`/proposals/${proposalId}`)).proposal;
  assert.equal(verified.status, 'ready', verified.failure);
  assert.ok(verified.evidence.some((e) => e.kind === 'browser' && e.passed));
  assert.ok(verified.evidence.some((e) => e.kind === 'tests' && e.passed));
  const proof = await page.request.get(`${baseURL}/api/evolution/proposals/${proposalId}/proof`);
  assert.equal(proof.status(), 200);
  assert.match(proof.headers()['content-type'], /image\/png/);
  await page.screenshot({ path: path.join(output, 'verified-desktop.png'), fullPage: true });
  checks.push(
    'reviewed project executes real regression tests and isolated Chrome click/text assertions before offering apply',
  );
  await page.getByRole('button', { name: 'Accept & apply revision', exact: true }).click();
  await page.getByRole('button', { name: 'Roll back change', exact: true }).waitFor();
  const applied = await page.request.get(
    `${baseURL}/workspace/projects/${path.basename(projectRoot)}/index.html`,
  );
  assert.equal(applied.status(), 200);
  assert.match(await applied.text(), /Reviewed calculator/);
  await page.getByRole('button', { name: 'Roll back change', exact: true }).click();
  await page.locator('.evo-detail .evo-state-rolled-back').waitFor();
  const wsRoot = process.env.SIS_WORKSPACE_DIR
    ? path.resolve(process.env.SIS_WORKSPACE_DIR)
    : path.resolve('workspace');
  await assert.rejects(
    fs.access(path.resolve(wsRoot, 'projects', path.basename(projectRoot), 'index.html')),
    { code: 'ENOENT' },
  );
  checks.push(
    'explicit UI approval applies the verified files; rollback removes the new project files',
  );
  await page.locator('[data-evo-tab="settings"]').click();
  await page.locator('[name="maxRepairAttempts"]').fill('4');
  await page.getByRole('button', { name: 'Save system settings', exact: true }).click();
  await page.locator('#evolutionStatus').filter({ hasText: 'System settings saved' }).waitFor();
  assert.equal((await api()).settings.maxRepairAttempts, 4);
  await page.screenshot({ path: path.join(output, 'system-settings.png'), fullPage: true });
  await api('/settings', 'PATCH', { maxRepairAttempts: originalSettings.maxRepairAttempts });
  checks.push(
    'dedicated settings save through the backend and provider keys remain absent from read responses',
  );
  await page.locator('[data-evo-tab="security"]').click();
  await page.locator('.evo-event').first().waitFor();
  await page.screenshot({ path: path.join(output, 'security-activity.png'), fullPage: true });
  await page.getByRole('button', { name: 'Close evolution studio' }).click();
  const blockedRequest = page.request.post(`${baseURL}/api/tools/execute`, {
    data: { tool: 'read_local_file', args: { path: `.env-evolution-qa-${Date.now()}` } },
  });
  await page.locator('.evo-security-alert').waitFor();
  const access = await (await page.request.get(`${baseURL}/api/access`)).json();
  const securityAction = access.pending.find(
    (p) => p.tool === 'read_local_file' && p.args.path?.includes('.env-evolution-qa-'),
  );
  assert.ok(securityAction);
  assert.equal(securityAction.risk, 'high');
  await page.request.post(`${baseURL}/api/access/approvals/${securityAction.id}`, {
    data: { allow: false },
  });
  assert.equal((await (await blockedRequest).json()).success, false);
  checks.push(
    'a real high-risk tool request pauses, streams an immediate user alert, and returns failure after decline without reading a file',
  );
  await page.locator('#railEvolution').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-evo-tab="changes"]').click();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.equal(
    await page.locator('#workspaceEvolution').evaluate((el) => el.scrollWidth <= el.clientWidth),
    true,
  );
  await page.screenshot({ path: path.join(output, 'mobile.png'), fullPage: true });
  checks.push('desktop and mobile render without page or dialog horizontal overflow');
  assert.deepEqual(errors, []);
  await fs.writeFile(
    path.join(output, 'results.json'),
    JSON.stringify(
      { baseURL, checks, errors, proposalId, checkedAt: new Date().toISOString() },
      null,
      2,
    ),
  );
  console.log(`Passed ${checks.length} real Evolution Studio browser checks.`);
} finally {
  if (proposalId && token) {
    const p = (await api(`/proposals/${proposalId}`)).proposal;
    if (p?.status === 'applied') await api(`/proposals/${proposalId}/rollback`, 'POST', {});
    await api(`/proposals/${proposalId}/archive`, 'POST', {}).catch(() => {});
  }
  if (originalSettings && token)
    await api('/settings', 'PATCH', { maxRepairAttempts: originalSettings.maxRepairAttempts });
  await browser.close();
}
