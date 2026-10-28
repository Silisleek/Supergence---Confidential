const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log(
    'Navigating directly to http://localhost:3009/workspace/realistic_3d_car_racing_game.html...',
  );
  await page.goto('http://localhost:3009/workspace/realistic_3d_car_racing_game.html', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(3000);

  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  const screenshotPath = path.join(__dirname, '../game_direct.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('Saved direct game screenshot to', screenshotPath);
  console.log('Errors:', errors);

  await browser.close();
})();
