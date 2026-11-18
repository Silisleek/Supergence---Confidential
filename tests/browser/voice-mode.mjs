import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';

const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'supergence-voice-test-'));
const reserve = http.createServer();
await new Promise((resolve) => reserve.listen(0, '127.0.0.1', resolve));
const port = reserve.address().port;
await new Promise((resolve) => reserve.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const backend = spawn(process.execPath, ['server/index.js'], {
  cwd: process.cwd(),
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, PORT: String(port), SIS_DATA_DIR: path.join(directory, 'data'),
    SIS_WORKSPACE_DIR: path.join(directory, 'workspace'), SIS_SESSION_SECRET: randomBytes(32).toString('hex'),
    ENABLE_AREM_SLEEP: 'false', ENABLE_BACKGROUND_LLM_LOOPS: 'false' },
});
let logs = '';
for (const stream of [backend.stdout, backend.stderr]) stream.on('data', (chunk) => { logs += chunk; });
let browser;
try {
  const deadline = Date.now() + 120000;
  while (!(await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(2000) }).then((r) => r.ok, () => false))) {
    if (backend.exitCode !== null || Date.now() > deadline) throw new Error(`Isolated server did not start: ${logs.slice(-1500)}`);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  const context = await browser.newContext({ permissions: ['microphone'], viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => {
    window.sisVoiceInstances = [];
    window.SpeechRecognition = class {
      constructor() { window.sisVoiceInstances.push(this); }
      start() { queueMicrotask(() => this.onstart?.()); }
      abort() {}
    };
    window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
    Object.defineProperty(window, 'speechSynthesis', { value: {
      cancel() {},
      speak(utterance) { window.sisVoiceUtterance = utterance; queueMicrotask(() => utterance.onstart?.()); },
    }, configurable: true });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let resolveRequest;
  const requestArrived = new Promise((resolve) => { resolveRequest = resolve; });
  let reply;
  let resolveSecond;
  const secondArrived = new Promise((resolve) => { resolveSecond = resolve; });
  let requestCount = 0;
  await page.route('**/api/sis/unified-turn', async (route) => {
    reply = route;
    requestCount++;
    if (requestCount === 1) resolveRequest();
    else resolveSecond();
  });
  await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__sisWorkspaceReady && document.querySelector('#sgModeVoiceBtn'));
  await page.locator('#sgModeVoiceBtn').click();
  await page.locator('#sgVoiceState').getByText('Listening', { exact: true }).waitFor();
  await page.evaluate(() => {
    const recognition = window.sisVoiceInstances.at(-1);
    recognition.onerror({ error: 'no-speech' });
    recognition.onend();
  });
  await page.waitForFunction(() => window.sisVoiceInstances.length === 2 && document.querySelector('#sgVoiceState')?.textContent === 'Listening');
  await page.evaluate(() => {
    const result = Object.assign([{ transcript: 'Check the project' }], { isFinal: true });
    window.sisVoiceInstances.at(-1).onresult({ resultIndex: 0, results: [result] });
  });
  await requestArrived;
  assert.equal(await page.locator('#sgVoiceState').innerText(), 'Thinking');
  await reply.fulfill({ json: { success: true, response: 'The project is ready.' } });
  await page.waitForFunction(() => !!window.sisVoiceUtterance);
  assert.equal(await page.locator('#sgVoiceState').innerText(), 'Speaking');
  await page.evaluate(() => window.sisVoiceUtterance.onerror({ error: 'audio-busy' }));
  await page.getByText('Spoken audio unavailable', { exact: true }).waitFor();
  assert.match(await page.locator('#sgVoiceTranscript').innerText(), /The project is ready/);
  await page.locator('#sgVoiceMicBtn').click();
  await page.getByText('Listening', { exact: true }).waitFor();
  await page.evaluate(() => {
    window.voiceLoadedConversation = null;
    window.loadWorkspaceConversation = async (id) => { window.voiceLoadedConversation = id; };
    const result = Object.assign([{ transcript: 'One more question' }], { isFinal: true });
    window.sisVoiceInstances.at(-1).onresult({ resultIndex: 0, results: [result] });
  });
  await secondArrived;
  await page.locator('#sgVoiceSwitchChatBtn').click();
  assert.equal(await page.locator('#sgModeChatBtn').getAttribute('aria-pressed'), 'true');
  await reply.fulfill({ json: { success: true, response: 'Finished while in chat.' } });
  await page.waitForFunction(() => window.voiceLoadedConversation === window.__activeWorkspaceConvId);
  assert.deepEqual(errors, []);
  console.log('Chrome voice checks passed: recognition restart, request, speech error, retry, and return to chat.');
} finally {
  await browser?.close();
  if (backend.exitCode === null) {
    if (process.platform === 'win32') {
      const killer = spawn('taskkill.exe', ['/pid', String(backend.pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore' });
      await once(killer, 'exit');
    } else { backend.kill('SIGTERM'); await once(backend, 'exit'); }
  }
  await fs.rm(directory, { recursive: true, force: true });
}
