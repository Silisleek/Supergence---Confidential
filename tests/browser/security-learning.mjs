import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { chromium } from 'playwright-core';
import { WebSocket } from 'ws';

const root = fileURLToPath(new URL('../../', import.meta.url));
const directory = await fs.mkdtemp(path.join(root, 'tests', '.tmp-security-learning-'));
const output = path.join(root, 'test-results', 'security-learning');
await fs.mkdir(output, { recursive: true });
const secret = randomBytes(32).toString('hex');
const codes = new Map();
const fixture = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (req.url !== '/api/supergence/token' || req.method !== 'POST') {
      res.writeHead(404).end('{}');
      return;
    }
    let body = '';
    for await (const chunk of req) body += chunk;
    const { code, verifier, redirectUri } = JSON.parse(body);
    const entry = codes.get(code);
    codes.delete(code);
    if (
      !entry ||
      entry.redirectUri !== redirectUri ||
      entry.challenge !== createHash('sha256').update(verifier).digest('base64url')
    ) {
      res.writeHead(401).end('{}');
      return;
    }
    res.end(
      JSON.stringify({
        user: {
          id: 'security-test-fixture',
          sleekId: 'security-test-fixture',
          name: 'Test fixture identity',
          supergenceActivated: true,
        },
      }),
    );
  } catch {
    res.writeHead(400).end('{}');
  }
});
await new Promise((resolve) => fixture.listen(0, '127.0.0.1', resolve));
const reserve = http.createServer();
await new Promise((resolve) => reserve.listen(0, '127.0.0.1', resolve));
const port = reserve.address().port;
await new Promise((resolve) => reserve.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const providerOrigin = `http://127.0.0.1:${fixture.address().port}`;
const env = {
  ...process.env,
  PORT: String(port),
  SIS_SESSION_SECRET: secret,
  SIS_DATA_DIR: path.join(directory, 'data'),
  SIS_WORKSPACE_DIR: path.join(directory, 'workspace'),
  SILISLEEK_ORIGIN: providerOrigin,
  ENABLE_BACKGROUND_LLM_LOOPS: 'false',
};
const npmCli =
  process.env.npm_execpath ||
  path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
let serverLog = '';
const backend = spawn(process.execPath, [npmCli, 'run', 'server'], {
  cwd: root,
  env,
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});
for (const stream of [backend.stdout, backend.stderr])
  stream.on('data', (chunk) => {
    serverLog += chunk;
  });
let browser;
const checks = [];
try {
  const deadline = Date.now() + 120000;
  while (true) {
    if (backend.exitCode !== null) throw new Error(`Backend exited ${backend.exitCode}`);
    try {
      const response = await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(2000) });
      if (response.ok) break;
    } catch {
      /* Poll readiness rather than assuming a startup duration. */
    }
    if (Date.now() > deadline) throw new Error('Backend readiness timed out.');
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  console.log(`Isolated npm run server is ready on ${origin}`);
  assert.equal((await fetch(`${origin}/api/learning/library`)).status, 401);
  assert.equal(
    (
      await fetch(`${origin}/api/silisleek/auth`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await fetch(`${origin}/api/learning/library`, {
        headers: { authorization: `Bearer ${'b'.repeat(64)}` },
      })
    ).status,
    401,
  );
  const privateHeaders = { authorization: `Bearer ${secret}`, 'content-type': 'application/json' };
  assert.equal(
    (await fetch(`${origin}/api/learning/library`, { headers: privateHeaders })).status,
    401,
  );
  const start = await (
    await fetch(`${origin}/api/silisleek/auth`, {
      method: 'POST',
      headers: privateHeaders,
      body: JSON.stringify({ origin: 'https://silisleek.com.attacker.example' }),
    })
  ).json();
  const authorize = new URL(start.url);
  assert.equal(authorize.origin, providerOrigin);
  const code = randomBytes(32).toString('base64url');
  codes.set(code, {
    challenge: authorize.searchParams.get('code_challenge'),
    redirectUri: authorize.searchParams.get('redirect_uri'),
  });
  const callback = new URL(authorize.searchParams.get('redirect_uri'));
  callback.searchParams.set('state', start.state);
  callback.searchParams.set('code', code);
  assert.equal((await fetch(callback)).status, 200);
  assert.equal((await fetch(callback)).status, 400);
  const claim = await fetch(`${origin}/api/silisleek/auth`, {
    method: 'POST',
    headers: privateHeaders,
    body: JSON.stringify({ state: start.state }),
  });
  const identity = /sis_sleek_identity=([a-f0-9]{64})/.exec(claim.headers.get('set-cookie'))?.[1];
  assert.ok(identity);
  const headers = { ...privateHeaders, cookie: `sis_sleek_identity=${identity}` };
  assert.equal((await fetch(`${origin}/api/learning/library`, { headers })).status, 200);
  assert.equal(
    (
      await fetch(`${origin}/api/access`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ files: false }),
      })
    ).status,
    200,
  );
  for (const endpoint of [
    '/api/learning/sources',
    '/api/learning/analyze',
    '/api/learning/SoUrCeS/',
    '/api/learning/ANALYZE/',
  ])
    assert.equal(
      (
        await fetch(`${origin}${endpoint}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ path: 'private.txt' }),
        })
      ).status,
      403,
    );
  assert.equal(
    (
      await fetch(`${origin}/api/access`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ files: true }),
      })
    ).status,
    200,
  );
  for (const hostile of [
    'http://localhost:5173',
    'https://untrusted.silisleek.com',
    'https://attacker.example',
  ])
    assert.equal(
      (await fetch(`${origin}/api/learning/library`, { headers: { ...headers, origin: hostile } }))
        .status,
      403,
    );
  const deniedSocket = new WebSocket(origin.replace('http:', 'ws:'), {
    headers: { authorization: `Bearer ${'b'.repeat(64)}` },
  });
  await new Promise((resolve, reject) => {
    deniedSocket.on('open', () => {
      deniedSocket.terminate();
      reject(new Error('Forged WebSocket accepted'));
    });
    deniedSocket.on('unexpected-response', (request, response) => {
      assert.equal(response.statusCode, 401);
      request.destroy();
      resolve();
    });
    deniedSocket.on('error', () => {});
  });
  checks.push(
    'HTTP and WebSocket authentication, explicit provider, PKCE code replay, cross-origin isolation',
  );
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.request.get(`${origin}/__session?token=${secret}`, { maxRedirects: 0 });
  await context.addCookies([
    {
      name: 'sis_sleek_identity',
      value: identity,
      url: origin,
      httpOnly: true,
      sameSite: 'Strict',
    },
  ]);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => {
    errors.push(error.message);
    console.error('[PAGE ERROR]', error);
  });
  page.on('console', (msg) => console.log('[PAGE LOG]', msg.type(), msg.text()));
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__sisWorkspaceReady && window.LearningPanel);
  await page.locator('#sisOnboardingModal.is-open').waitFor();
  const themeStep = page.locator('#obNext1');
  await themeStep.click();
  try {
    await page.locator('#obPanel2.is-active').waitFor({ timeout: 5000 });
  } catch (error) {
    await page.screenshot({ path: path.join(output, 'setup-transition-failure.png') });
    console.error(
      'Active setup step:',
      await page.locator('.sis-ob-panel.is-active').getAttribute('id'),
    );
    throw error;
  }
  await page.locator('#obNext2').click();
  await page.locator('#obNext3').click();
  await page.getByRole('heading', { name: 'Connect a model', exact: true }).waitFor();
  await page.locator('#obBtnFinish').click();
  await page.locator('#sisOnboardingModal.is-open').waitFor({ state: 'hidden' });

  await page.locator('#railStylesWindow').click();
  const appearance = page.getByRole('radiogroup', { name: 'Theme palette' });
  await appearance.waitFor();
  const variants = [
    ['Apricot Cream', 'warm'],
    ['Lavender Dusk', 'midnight'],
    ['Mint Glass', 'cyber'],
    ['Lilac Mist', 'obsidian'],
  ];
  const backgrounds = new Set();
  for (const [label, theme] of variants) {
    const choice = appearance.getByRole('radio', { name: new RegExp(label) });
    await choice.click();
    assert.equal(await choice.getAttribute('aria-checked'), 'true');
    assert.equal(await page.locator('body').getAttribute('data-theme'), theme);
    assert.equal(await page.locator('#shellThemePreference').inputValue(), theme);
    backgrounds.add(
      await page.locator('body').evaluate((body) => getComputedStyle(body).backgroundColor),
    );
  }
  assert.equal(backgrounds.size, 4);
  await page.screenshot({ path: path.join(output, 'pastel-settings.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'Close settings window' }).click();
  await page.locator('#shellNewConversation').click();
  await page.getByText('What are you working on?', { exact: true }).waitFor();
  await page.screenshot({
    path: path.join(output, 'pastel-workspace.png'),
    animations: 'disabled',
  });

  const signIn = await context.newPage();
  await signIn.setViewportSize({ width: 390, height: 844 });
  await signIn.goto(`${origin}/sleek-login.html`, { waitUntil: 'domcontentloaded' });
  await signIn.getByRole('radio', { name: /Lilac Mist/ }).waitFor();
  assert.equal(await signIn.evaluate(() => document.documentElement.scrollWidth), 390);
  await signIn.screenshot({
    path: path.join(output, 'pastel-sign-in.png'),
    animations: 'disabled',
  });
  await signIn.close();
  const installer = await context.newPage();
  await installer.goto(`${origin}/installer.html`, { waitUntil: 'domcontentloaded' });
  await installer.getByText('Release verification in progress', { exact: true }).waitFor();
  assert.equal(await installer.locator('a[download], a[href^="/release/"]').count(), 0);
  assert.equal(
    (await context.request.head(`${origin}/release/Supergence%20Setup%201.0.0.exe`)).status(),
    404,
  );
  await installer.close();
  checks.push('Pastel theme switching, settings synchronization, narrow sign-in and release hold');

  const rendering = await page.evaluate(() => {
    const target = document.createElement('div');
    target.innerHTML = formatMarkdown(
      '<img src=x onerror="window.__chatInjected=1"><svg onload="window.__chatInjected=1"></svg>\n[unsafe](javascript:alert(1))\n[safe](https://example.com/" onclick="window.__chatInjected=1)\n```html\n<script>alert(1)</script>\n```\n**Emphasis**',
    );
    document.body.append(target);
    const result = {
      unsafe: target.querySelectorAll(
        'img,svg[onload],script,[onclick],[onerror],a[href^="javascript:"]',
      ).length,
      code: target.querySelector('pre code')?.textContent,
      bold: target.querySelector('strong')?.textContent,
      injected: Boolean(window.__chatInjected),
    };
    target.remove();
    return result;
  });
  assert.equal(rendering.unsafe, 0);
  assert.equal(rendering.injected, false);
  assert.match(rendering.code, /<script>/);
  assert.equal(rendering.bold, 'Emphasis');
  for (let index = 0; index < 4; index++)
    await page.evaluate(() => window.SupergenceBrowser.show({ section: 'files' }));
  assert.equal(await page.locator('.cockpit-shared-files').count(), 1);
  await page.getByRole('button', { name: 'Close workspace browser', exact: true }).click();
  checks.push('safe literal-code chat rendering and repeated workspace-panel refresh');
  await page.locator('#railLearning').click();
  await page.getByRole('button', { name: 'Retain knowledge', exact: true }).click();
  await page.locator('#learningImportForm [name="title"]').fill('Security learning fixture');
  await page
    .locator('#learningImportForm [name="content"]')
    .fill(
      'Kestrel calibration requires a violet reference lamp. This passage is a browser test fixture.',
    );
  await page.locator('#learningImportForm [type="submit"]').click();
  await page
    .locator('#learningStatus')
    .filter({ hasText: /Source retained/ })
    .waitFor();
  const card = page.locator('.learning-source').filter({ hasText: 'Security learning fixture' });
  await card.getByRole('button', { name: 'Check recall', exact: true }).click();
  await card.locator('[name="question"]').fill('kestrel calibration');
  await card.locator('[name="expectedText"]').fill('violet reference lamp');
  await card.getByRole('button', { name: 'Run recall check', exact: true }).click();
  await page.locator('#learningStatus').filter({ hasText: 'Recall check passed' }).waitFor();
  await page.evaluate(() => window.LearningPanel.refresh());
  await card.getByRole('button', { name: 'Review recall', exact: true }).click();
  await page.locator('#learningStatus').filter({ hasText: 'Recall review passed' }).waitFor();
  await card.locator('p').filter({ hasText: 'Next recall review:' }).waitFor();
  const sourceId = await card.getAttribute('data-source-id');
  const evaluation = await context.request.post(`${origin}/api/learning/evaluate`, {
    data: {
      cases: [{ sourceId, question: 'kestrel calibration', expectedText: 'violet reference lamp' }],
    },
  });
  const report = (await evaluation.json()).evaluation;
  assert.equal(report.recallAtK, 1);
  assert.equal(report.scope, 'whole-library');
  await page.screenshot({ path: path.join(output, 'learning-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () =>
        document.querySelector('#workspaceLearning').scrollWidth <=
        document.querySelector('#workspaceLearning').clientWidth + 1,
    ),
  );
  await page.screenshot({ path: path.join(output, 'learning-mobile.png') });
  assert.deepEqual(errors, []);
  checks.push(
    'Chrome main app import, whole-library recall, spaced review, evaluation API, desktop and 390px layout',
  );
  await browser.close();
  browser = null;
  const smoke = spawn(process.execPath, [npmCli, 'run', 'test:browser'], {
    cwd: root,
    env: { ...env, SIS_BASE_URL: origin, SIS_TEST_IDENTITY_COOKIE: identity },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let smokeLog = '';
  for (const stream of [smoke.stdout, smoke.stderr])
    stream.on('data', (chunk) => {
      smokeLog += chunk;
    });
  const [exit] = await once(smoke, 'exit');
  await fs.writeFile(path.join(output, 'workspace-smoke.log'), smokeLog);
  assert.equal(exit, 0, smokeLog.slice(-4000));
  checks.push('npm run test:browser against isolated backend and fixture identity');
  await fetch(`${origin}/api/access`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ mode: 'ask-before-executing' }),
  });
  const waitingAction = fetch(`${origin}/api/tools/execute`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ tool: 'run_command', args: { command: 'node --version' } }),
    signal: AbortSignal.timeout(10000),
  });
  const pendingDeadline = Date.now() + 5000;
  let waiting = false;
  while (!waiting && Date.now() < pendingDeadline) {
    const access = await fetch(`${origin}/api/access`, { headers }).then((response) =>
      response.json(),
    );
    waiting = access.pending.some((action) => action.tool === 'run_command');
    if (!waiting) await new Promise((resolve) => setTimeout(resolve, 30));
  }
  assert.equal(waiting, true, 'Action must be awaiting approval before sign-out.');
  assert.equal(
    (await fetch(`${origin}/api/silisleek/logout`, { method: 'POST', headers })).status,
    200,
  );
  assert.equal((await fetch(`${origin}/api/learning/library`, { headers })).status, 401);
  const cancelledAction = await (await waitingAction).json();
  assert.equal(cancelledAction.success, false);
  assert.match(cancelledAction.result.error, /cancelled|Signed out/i);
  assert.equal(cancelledAction.result.exitCode, undefined);
  checks.push('logout revokes identity and cancels a pending tool action');
  await fs.writeFile(
    path.join(output, 'results.json'),
    JSON.stringify(
      {
        checks,
        errors,
        evaluation: report,
        limitation:
          'A local identity-provider fixture exercises the real PKCE exchange. Production Silisleek and model intelligence were not evaluated.',
      },
      null,
      2,
    ),
  );
  console.log(`Passed security and learning browser checks: ${checks.join('; ')}`);
} finally {
  if (browser) await browser.close();
  await fs.writeFile(path.join(output, 'server.log'), serverLog.replaceAll(secret, '[REDACTED]'));
  if (backend.exitCode === null) {
    if (process.platform === 'win32') {
      const killer = spawn('taskkill.exe', ['/pid', String(backend.pid), '/t', '/f'], {
        windowsHide: true,
        stdio: 'ignore',
      });
      await once(killer, 'exit');
    } else backend.kill('SIGTERM');
  }
  await new Promise((resolve) => fixture.close(resolve));
  assert.equal(path.dirname(directory), path.join(root, 'tests'));
  assert.ok(path.basename(directory).startsWith('.tmp-security-learning-'));
  await fs.rm(directory, { recursive: true, force: true, maxRetries: 3 });
}
