const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  const consoleLogs = [];
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });
  page.on('pageerror', (err) => {
    consoleLogs.push({ type: 'pageerror', text: err.message });
  });

  console.log('Navigating to http://localhost:3009/...');
  await page.goto('http://localhost:3009/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const title = await page.title();
  console.log('Page Title:', title);

  const homeViewVisible = await page
    .$eval('#homeView', (el) => (el ? window.getComputedStyle(el).display : 'none'))
    .catch(() => 'none');
  const wsVisible = await page
    .$eval('#supergenceWorkspace', (el) => (el ? el.classList.contains('active') : false))
    .catch(() => false);
  console.log('homeView display:', homeViewVisible);
  console.log('supergenceWorkspace active:', wsVisible);

  const screenshotPath = path.join(__dirname, '../initial_load.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('Saved screenshot to', screenshotPath);

  console.log('Console logs count:', consoleLogs.length);
  const errors = consoleLogs.filter((l) => l.type === 'error' || l.type === 'pageerror');
  console.log('Errors count:', errors.length);
  if (errors.length > 0) {
    console.log('Top errors:', errors.slice(0, 5));
  }

  await browser.close();
})();
