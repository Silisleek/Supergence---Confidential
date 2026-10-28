import { chromium } from 'playwright-core';

async function verifyRootUrl() {
  const port = 3008;
  console.log(`Verifying root app at http://localhost:${port}/ ...`);
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 25000 });

  const inputSelector = '#chatInput';
  await page.waitForSelector(inputSelector, { timeout: 10000 });
  await page.fill(inputSelector, 'Tell me about all the agents here.');

  console.log('Submitting prompt at root URL...');
  await page.click('#sendBtn');

  console.log('Waiting for response and table render...');
  await page.waitForSelector('#chatStream table', { timeout: 40000 });
  await page.waitForTimeout(4000);

  const tableData = await page.evaluate(() => {
    const table = document.querySelector('#chatStream table');
    if (!table) return null;
    const headers = Array.from(table.querySelectorAll('th')).map((th) => th.innerText.trim());
    const rowCount = table.querySelectorAll('tbody tr').length;
    const firstRowCells = Array.from(table.querySelectorAll('tbody tr:first-child td')).map((td) =>
      td.innerText.trim(),
    );
    return { headers, rowCount, firstRowCells };
  });

  console.log('✓ Root URL Table Info:', JSON.stringify(tableData, null, 2));

  const screenshotPath =
    'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\bb9a50ee-166f-4573-a1f6-3270c22c4aa9\\root_app_agent_roster_verified.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`✓ Root app screenshot captured to: ${screenshotPath}`);

  await browser.close();
  console.log('🎉 ROOT APP VERIFICATION COMPLETED SUCCESSFULLY!');
}

verifyRootUrl().catch((err) => {
  console.error('❌ Root app verification failed:', err);
  process.exit(1);
});
