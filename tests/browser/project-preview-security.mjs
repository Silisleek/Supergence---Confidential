import assert from 'node:assert/strict';
import http from 'node:http';
import { chromium } from 'playwright-core';
import { routeProjectPreview } from '../../server/services/browserProjectBuilder.js';

const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const close = (server) => new Promise((resolve) => server.close(resolve));
const remote = 'https://attacker.invalid';
const local = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.headers.authorization !== 'Bearer fixture-secret') {
    res.writeHead(401).end();
    return;
  }
  if (req.url === '/workspace/demo/index.html') {
    res.setHeader('Content-Security-Policy', 'sandbox allow-scripts');
    res.setHeader('Content-Type', 'text/html');
    res.end('<title>Loading</title><script type="module" src="./module.js"></script>');
  } else if (req.url === '/workspace/demo/module.js') {
    res.setHeader('Content-Type', 'text/javascript');
    res.end(`try{await fetch('/workspace/demo/redirect')}catch{}document.title='Module loaded';`);
  } else if (req.url === '/workspace/demo/redirect') {
    res.writeHead(302, { location: `${remote}/capture` }).end();
  } else res.writeHead(404).end();
});
await listen(local);
const origin = `http://127.0.0.1:${local.address().port}`;
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  const externalHeaders = new Promise((resolve) =>
    page.on('request', (request) => {
      if (request.url() === `${remote}/capture`) resolve(request.allHeaders());
    }),
  );
  page.on('pageerror', (error) => console.error('Preview error:', error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') console.error('Browser:', message.text());
  });
  page.on('requestfailed', (request) =>
    console.error('Request failed:', request.url(), request.failure()?.errorText),
  );
  await page.route(`${origin}/**`, (route) =>
    routeProjectPreview(route, { origin, directory: 'demo', secret: 'fixture-secret' }),
  );
  await page.goto(`${origin}/workspace/demo/index.html`);
  await page.waitForFunction(() => document.title === 'Module loaded');
  assert.equal((await externalHeaders).authorization, undefined);
  console.log('Sandboxed project module loaded and external redirect received no credential.');
} finally {
  await browser?.close();
  await close(local);
}
