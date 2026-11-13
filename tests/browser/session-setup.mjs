import { chromium } from 'playwright-core';

const baseURL = process.env.SIS_BASE_URL;
const secret = process.env.SIS_SESSION_SECRET;
const identity = process.env.SIS_TEST_IDENTITY_COOKIE;
if (!baseURL || !/^[a-f0-9]{64}$/i.test(secret || '') || !/^[a-f0-9]{64}$/i.test(identity || ''))
  throw new Error(
    'Browser tests require SIS_BASE_URL, SIS_SESSION_SECRET, and a live SIS_TEST_IDENTITY_COOKIE.',
  );
const origin = new URL(baseURL).origin;
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, init = {}) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.origin !== origin) return originalFetch(input, init);
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  if (!headers.has('authorization')) headers.set('authorization', `Bearer ${secret}`);
  if (!headers.has('cookie')) headers.set('cookie', `sis_sleek_identity=${identity}`);
  return originalFetch(input, { ...init, headers });
};
const launch = chromium.launch.bind(chromium);
async function authenticate(context) {
  await context.addInitScript(() => {
    localStorage.setItem('sis_setup_completed', 'true');
    localStorage.setItem('sis_model_setup_seen', 'true');
  });
  const pairing = await context.request.get(`${origin}/__session?token=${secret}`, {
    maxRedirects: 0,
  });
  if (pairing.status() !== 303) throw new Error('Could not pair browser test session.');
  await context.addCookies([
    {
      name: 'sis_sleek_identity',
      value: identity,
      url: origin,
      httpOnly: true,
      sameSite: 'Strict',
    },
  ]);
  const response = await context.request.get(`${origin}/api/silisleek/session`);
  if (!(await response.json()).authenticated)
    throw new Error('Sleek test identity session is invalid or expired.');
}
chromium.launch = async (...args) => {
  const browser = await launch(...args);
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (...options) => {
    const context = await newContext(...options);
    await authenticate(context);
    return context;
  };
  const newPage = browser.newPage.bind(browser);
  browser.newPage = async (...options) => {
    const page = await newPage(...options);
    await authenticate(page.context());
    return page;
  };
  return browser;
};
