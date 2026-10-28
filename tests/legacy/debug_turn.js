import { chromium } from 'playwright-core';

async function test() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('console', (msg) => console.log(`[PAGE ${msg.type()}]:`, msg.text()));
  page.on('pageerror', (err) => console.log('[PAGE ERROR]:', err.message));
  page.on('requestfailed', (req) =>
    console.log('[REQ FAILED]:', req.url(), req.failure()?.errorText),
  );

  console.log('Navigating to http://localhost:3008/ ...');
  await page.goto('http://localhost:3008/', { waitUntil: 'networkidle', timeout: 30000 });
  console.log('Page loaded!');

  console.log('Calling openWorkspace...');
  await page.evaluate(() => {
    window.openWorkspace('Make me a animated video explning DNA/');
  });

  console.log('Waiting 8 seconds to observe browser activity...');
  await page.waitForTimeout(8000);

  const resHtml = await page.evaluate(() => {
    const res = document.querySelector('.response-body-markdown');
    return res ? res.innerText.slice(0, 300) : 'NO_ELEMENT';
  });
  console.log('RESPONSE SNIPPET:', resHtml);

  await page.screenshot({ path: 'debug_workspace_turn.png' });
  console.log('Screenshot saved: debug_workspace_turn.png');

  await browser.close();
}

test().catch((e) => console.error('TEST CAUGHT:', e));
