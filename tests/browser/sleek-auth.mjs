import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const origin = process.env.SIS_BASE_URL;
const secret = process.env.SIS_SESSION_SECRET;
if (!origin || !/^[a-f0-9]{64}$/i.test(secret || ''))
  throw new Error('Set SIS_BASE_URL and SIS_SESSION_SECRET.');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${origin}/__session?token=${secret}`);
  assert.equal(new URL(page.url()).pathname, '/sleek-login');
  assert.equal(await page.locator('h1').textContent(), 'Connect your Sleek account');
  const status = await page.evaluate(async () => {
    const api = await fetch('/api/workspace/state');
    const socket = await new Promise((resolve) => {
      const ws = new WebSocket(`ws://${location.host}`);
      ws.onopen = () => {
        ws.close();
        resolve('open');
      };
      ws.onerror = () => resolve('rejected');
    });
    return { api: api.status, socket };
  });
  assert.deepEqual(status, { api: 401, socket: 'rejected' });
  const link = page.getByRole('link', { name: 'Continue with Sleek' });
  await link.waitFor();
  const target = new URL(await link.getAttribute('href'));
  assert.equal(target.origin, 'https://silisleek.com');
  assert.equal(target.pathname, '/supergence/authorize');
  assert.equal(target.searchParams.get('redirect_uri'), `${origin}/__sleek/callback`);
  assert.match(target.searchParams.get('code_challenge'), /^[A-Za-z0-9_-]{43}$/);
  assert.equal(new URL(page.url()).pathname, '/sleek-login');
  console.log('Sleek ID browser gate checks passed.');
} finally {
  await browser.close();
}
