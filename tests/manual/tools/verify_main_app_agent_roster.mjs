import { chromium } from 'playwright-core';

async function verifyMainApp() {
  const port = 3008;
  console.log(`Verifying main app at http://localhost:${port}/ ...`);
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 25000 });

  console.log('Focusing input bar in main app...');
  await page.click('#inputWrap');
  await page.waitForTimeout(400);

  const inputSelector = '#inp';
  await page.waitForSelector(inputSelector, { timeout: 10000 });
  await page.fill(inputSelector, 'Tell me about all the agents here.');

  console.log('Submitting prompt in main app...');
  await page.click('#sendBtn');

  console.log('Waiting for response in #mainResponseBody...');
  await page.waitForSelector('#mainResponseBody table', { timeout: 40000 });
  await page.waitForTimeout(3000);

  const mainTableInfo = await page.evaluate(() => {
    const table = document.querySelector('#mainResponseBody table');
    if (!table) return null;
    return {
      headers: Array.from(table.querySelectorAll('th')).map((th) => th.innerText.trim()),
      rows: table.querySelectorAll('tbody tr').length,
    };
  });
  console.log('✓ Main App Table Rendered:', JSON.stringify(mainTableInfo, null, 2));

  const mainScreenshotPath =
    'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\bb9a50ee-166f-4573-a1f6-3270c22c4aa9\\main_app_agent_roster_verified.png';
  await page.screenshot({ path: mainScreenshotPath, fullPage: false });
  console.log(`✓ Main app screenshot captured to: ${mainScreenshotPath}`);

  await browser.close();
  console.log('🎉 Main app verification passed with flying colors!');
}

verifyMainApp().catch((err) => {
  console.error('❌ Main app verification failed:', err);
  process.exit(1);
});
