import { chromium } from 'playwright-core';

const baseURL = process.env.SIS_BASE_URL;
const secret = process.env.SIS_SESSION_SECRET;
if (!baseURL || !/^[a-f0-9]{64}$/i.test(secret || ''))
  throw new Error('Browser tests require SIS_BASE_URL and the backend SIS_SESSION_SECRET.');
const origin = new URL(baseURL).origin;
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, init = {}) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.origin !== origin) return originalFetch(input, init);
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  if (!headers.has('authorization')) headers.set('authorization', `Bearer ${secret}`);
  return originalFetch(input, { ...init, headers });
};

const launch = chromium.launch.bind(chromium);
chromium.launch = async (...args) => {
  const browser = await launch(...args);
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (...options) => {
    const context = await newContext(...options);
    const response = await context.request.get(`${origin}/__session?token=${secret}`, { maxRedirects: 0 });
    if (response.status() !== 303) throw new Error('Could not authenticate browser test session.');
    return context;
  };
  const newPage = browser.newPage.bind(browser);
  browser.newPage = async (...options) => {
    const page = await newPage(...options);
    const response = await page.context().request.get(`${origin}/__session?token=${secret}`, { maxRedirects: 0 });
    if (response.status() !== 303) throw new Error('Could not authenticate browser test session.');
    return page;
  };
  return browser;
};
