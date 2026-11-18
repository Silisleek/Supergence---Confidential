import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = fileURLToPath(new URL('../../', import.meta.url));
const data = await fs.mkdtemp(path.join(os.tmpdir(), 'arem-sleep-browser-'));
const output = path.join(root, 'test-results', 'arem-sleep');
const secret = randomBytes(32).toString('hex');
const quote = 'Use UTC timestamps for the telemetry export.';
const chat = 'arem-browser-fixture';
let calls = 0;
let followUpMemory;
const gateway = http.createServer(async (req, res) => {
  try {
    if (req.url === '/chat/v1/models') {
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ data: [{ id: 'arem-chat-fixture' }] }));
    }
    let body = '';
    for await (const chunk of req) body += chunk;
    const { messages, stream } = JSON.parse(body);
    if (req.url === '/chat/v1/chat/completions') {
      const system = messages.find(
        ({ role, content }) => role === 'system' && content.includes('<arem>'),
      );
      if (system) {
        const json = system.content.match(/^\{.*"sleepNotes":.*\}$/m)?.[0];
        followUpMemory = JSON.parse(json).sleepNotes;
      }
      const content = 'The telemetry export uses UTC timestamps.';
      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.write(
          `data: ${JSON.stringify({ choices: [{ delta: { content }, finish_reason: null }] })}\n\n`,
        );
        res.write('data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n');
        return res.end('data: [DONE]\n\n');
      }
      res.setHeader('Content-Type', 'application/json');
      return res.end(
        JSON.stringify({
          choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop' }],
        }),
      );
    }
    assert.equal(req.url, '/v1/chat/completions');
    const { evidence, proposals } = JSON.parse(messages.at(-1).content);
    assert.deepEqual(
      evidence.map(({ user }) => user),
      [quote],
    );
    calls++;
    const result = proposals
      ? proposals.map(({ id }) => id)
      : [{ sourceId: 'format', title: 'Telemetry time format', quote }];
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(result) } }] }));
  } catch {
    res.writeHead(400).end();
  }
});
await new Promise((resolve) => gateway.listen(0, '127.0.0.1', resolve));
const reserve = http.createServer();
await new Promise((resolve) => reserve.listen(0, '127.0.0.1', resolve));
const port = reserve.address().port;
await new Promise((resolve) => reserve.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const env = {
  ...process.env,
  PORT: String(port),
  SIS_DATA_DIR: data,
  SIS_WORKSPACE_DIR: path.join(data, 'workspace'),
  SIS_SESSION_SECRET: secret,
  BASE_URL: `http://127.0.0.1:${gateway.address().port}/chat/v1`,
  DEFAULT_MODEL: 'arem-chat-fixture',
  API_KEY: 'local-fixture',
  OPENCODE_API_KEY: '',
  FALLBACK_MODEL: '',
  FALLBACK_MODELS: '',
  AREM_BASE_URL: `http://127.0.0.1:${gateway.address().port}/v1`,
  AREM_API_KEY: '',
  ENABLE_AREM_SLEEP: 'false',
  ENABLE_BACKGROUND_LLM_LOOPS: 'false',
};
const npm =
  process.env.npm_execpath ||
  path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
const backend = spawn(process.execPath, [npm, 'run', 'server'], {
  cwd: root,
  env,
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
for (const stream of [backend.stdout, backend.stderr])
  stream.on('data', (chunk) => {
    log += chunk;
  });
let browser;
try {
  await fs.mkdir(output, { recursive: true });
  const deadline = Date.now() + 120_000;
  while (
    !(await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(2000) }).then(
      (response) => response.ok,
      () => false,
    ))
  ) {
    if (backend.exitCode !== null || Date.now() > deadline)
      throw new Error('The isolated backend did not start.');
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  console.log(`Isolated npm run server is ready on ${origin}`);
  const now = Date.now();
  await fs.writeFile(
    path.join(data, 'conversations', `${chat}.json`),
    JSON.stringify({
      id: chat,
      title: 'Arem sleep fixture',
      createdAt: now,
      updatedAt: now,
      messages: [
        { role: 'user', requestId: 'format', content: quote },
        { role: 'assistant', requestId: 'format', content: 'Understood.', status: 'completed' },
      ],
    }),
  );

  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => {
    localStorage.setItem('sis_setup_completed', 'true');
    localStorage.setItem('sis_model_setup_seen', 'true');
  });
  const page = await context.newPage();
  await page.goto(origin, { waitUntil: 'commit', timeout: 60_000 });
  await page.waitForFunction(() => window.__sisWorkspaceReady && window.LearningPanel);
  assert.ok(await page.evaluate((id) => window.loadWorkspaceConversation(id), chat));
  await page.getByRole('button', { name: 'Add files and context', exact: true }).click();
  await page
    .locator('#sgComposerAddActions')
    .getByRole('button', { name: 'Conversation memory' })
    .click();
  const panel = page.locator('[data-learning-view="conversation"]');
  await panel.getByText('1 completed turn waiting for review.', { exact: true }).waitFor();
  const button = panel.getByRole('button', { name: 'Review memory' });
  await button.focus();
  await button.press('Enter');
  await panel.getByText(/Last review retained 1 note from 1 turn/).waitFor();
  assert.ok(await button.isDisabled());
  await panel.getByText('Telemetry time format', { exact: true }).click();
  await panel.locator('blockquote').filter({ hasText: quote }).waitFor();
  assert.equal(calls, 2);
  await page.screenshot({ path: path.join(output, 'desktop.png'), animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await panel.evaluate((section) => section.scrollWidth <= section.clientWidth + 1));
  const bounds = await button.boundingBox();
  assert.ok(bounds && bounds.y >= 0 && bounds.y + bounds.height <= 844);
  await page.screenshot({ path: path.join(output, 'mobile.png'), animations: 'disabled' });
  const followUp = await page.request.post(`${origin}/api/sis/unified-turn-stream`, {
    data: {
      conversationId: chat,
      query: 'What timestamp format did we select for the telemetry export?',
    },
    timeout: 60_000,
  });
  assert.match(await followUp.text(), /event: done/);
  assert.deepEqual(followUpMemory, [{ sourceId: 'format', note: quote }]);
  assert.equal((await page.request.delete(`${origin}/api/conversations/${chat}`)).status(), 200);
  assert.equal((await page.request.get(`${origin}/api/arem/sleep/${chat}`)).status(), 404);
  console.log(
    'Passed Chrome Arem sleep, keyboard, desktop and narrow layout, and conversation deletion.',
  );

  if (process.argv.includes('--smoke')) {
    const identity = (await context.cookies()).find(({ name }) => name === 'sis_sleek_identity');
    assert.ok(identity);
    const smoke = spawn(process.execPath, [npm, 'run', 'test:browser'], {
      cwd: root,
      env: { ...env, SIS_BASE_URL: origin, SIS_TEST_IDENTITY_COOKIE: identity.value },
      windowsHide: true,
      stdio: 'inherit',
    });
    const [code] = await once(smoke, 'exit');
    assert.equal(code, 0);
  }
} finally {
  await browser?.close();
  await fs.writeFile(path.join(output, 'server.log'), log.replaceAll(secret, '[REDACTED]'));
  if (backend.exitCode === null) {
    if (process.platform === 'win32') {
      const killer = spawn('taskkill.exe', ['/pid', String(backend.pid), '/t', '/f'], {
        windowsHide: true,
        stdio: 'ignore',
      });
      await once(killer, 'exit');
    } else {
      backend.kill('SIGTERM');
      await once(backend, 'exit');
    }
  }
  await new Promise((resolve) => gateway.close(resolve));
  assert.equal(path.dirname(data), os.tmpdir());
  assert.ok(path.basename(data).startsWith('arem-sleep-browser-'));
  await fs.rm(data, { recursive: true, force: true, maxRetries: 3 });
}
