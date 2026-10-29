import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { chromium } from 'playwright-core';
import { WebSocket } from 'ws';

const baseURL = process.env.SIS_BASE_URL;
const dataDir = process.env.SIS_DATA_DIR;
const secret = process.env.SIS_SESSION_SECRET;
if (
  !baseURL ||
  !dataDir ||
  !secret ||
  !path.resolve(dataDir).startsWith(path.join(os.tmpdir(), 'sis-browser-access-'))
)
  throw new Error('Use an isolated sis-browser-access-* temporary profile and configured session.');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
const request = page.request;
const settings = await (await request.get(`${baseURL}/api/settings`)).json();
assert.equal(path.resolve(settings.paths.dataDir), path.resolve(dataDir));
const original = (await (await request.get(`${baseURL}/api/access`)).json()).settings;
let socket;
try {
  const opened = await request.post(`${baseURL}/api/browser/agent-custom-accesscheck/open`);
  assert.equal(opened.ok(), true, JSON.stringify(await opened.json()));
  const before = await (
    await request.get(`${baseURL}/api/browser/agent-custom-accesscheck/state`)
  ).json();
  assert.equal(before.state.isOpen, true);
  assert.ok((await request.patch(`${baseURL}/api/access`, { data: { browser: false } })).ok());
  for (const [method, route] of [
    ['get', '/api/browser/agent-supergence/page'],
    ['post', '/api/browser/agent-test-denied/open'],
  ]) {
    const response = await request[method](`${baseURL}${route}`);
    assert.equal(response.status(), 403);
    assert.match((await response.json()).error, /Browser access is disabled/);
  }
  socket = new WebSocket(baseURL.replace(/^http/, 'ws'), {
    headers: { authorization: `Bearer ${secret}` },
  });
  await new Promise((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });
  const reply = new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('No browser access rejection received.')),
      10000,
    );
    socket.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'error') {
        clearTimeout(timer);
        resolve(message);
      }
    });
    socket.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
  socket.send(JSON.stringify({ type: 'agent-browser-open', agentId: 'agent-test-denied' }));
  const denied = await reply;
  assert.equal(denied.type, 'error');
  assert.match(denied.message, /Browser access is disabled/);
  assert.ok((await request.patch(`${baseURL}/api/access`, { data: { browser: true } })).ok());
  assert.equal((await request.get(`${baseURL}/api/browser/agents`)).status(), 200);
  const after = await (
    await request.get(`${baseURL}/api/browser/agent-custom-accesscheck/state`)
  ).json();
  assert.equal(after.state.isOpen, false);
  console.log(
    'Browser revocation closed the managed session and blocked Chrome HTTP and WebSocket controls.',
  );
} finally {
  socket?.close();
  await request.patch(`${baseURL}/api/access`, { data: original });
  await browser.close();
}
