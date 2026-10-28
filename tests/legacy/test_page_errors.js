import { chromium } from 'playwright-core';

async function test() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('pageerror', (err) => {
    console.error('CAUGHT PAGEERROR IN SCRIPT:', err.message, err.stack);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error('CONSOLE ERR:', msg.text());
  });

  await page.goto('http://localhost:3008/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const openWsType = await page.evaluate(() => typeof window.openWorkspace);
  console.log('TYPE OF window.openWorkspace:', openWsType);

  await browser.close();
}

test().catch((e) => console.error(e));
