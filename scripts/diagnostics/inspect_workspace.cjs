const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:3009/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Activate workspace
  await page.evaluate(() => {
    document.getElementById('homeView').style.display = 'none';
    const ws = document.getElementById('supergenceWorkspace');
    if (ws) ws.classList.add('active');
  });

  await page.waitForTimeout(1500);

  const screenshotPath = path.join(__dirname, '../workspace_active.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('Saved workspace screenshot to', screenshotPath);

  await browser.close();
})();
