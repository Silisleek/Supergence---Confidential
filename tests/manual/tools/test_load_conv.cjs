const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:3009/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Call loadWorkspaceConversation for our car racing conversation
  await page.evaluate(async () => {
    await window.loadWorkspaceConversation('conv-ws-1792547721319');
  });

  await page.waitForTimeout(2000);

  const screenshotPath = path.join(__dirname, '../../../scripts/car_racing_loaded.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('Saved loaded conversation screenshot to', screenshotPath);

  const streamText = await page.$eval('#chatTurnsStream', (el) =>
    el ? el.innerText : 'not found',
  );
  console.log('Chat stream text length:', streamText.length);
  console.log('Chat stream preview:\n', streamText.slice(0, 300));

  await browser.close();
})();
