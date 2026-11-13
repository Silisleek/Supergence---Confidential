import { chromium } from 'playwright-core';

async function test() {
  console.log('Launching browser...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-extensions',
      '--no-proxy-server',
      '--disable-background-networking',
      '--disable-default-apps'
    ]
  });

  console.log('Creating context...');
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to http://127.0.0.1:3009/ ...');
  const res = await page.goto('http://127.0.0.1:3009/', { waitUntil: 'load', timeout: 10000 });
  console.log('Response status:', res.status());

  const title = await page.title();
  console.log('Page title:', title);

  await page.screenshot({ path: 'scripts/temp-check.png' });
  console.log('Screenshot taken!');

  await browser.close();
  console.log('Done!');
}

test().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
