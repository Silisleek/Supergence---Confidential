import { chromium } from 'playwright-core';

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3008/liquid-glass', {
    waitUntil: 'domcontentloaded',
    timeout: 15000,
  });
  await page.waitForTimeout(2000);

  // Find power on button
  const btn = page.locator('text=POWER ON SUPERGENCE').first();
  if (await btn.isVisible()) {
    console.log('Clicking POWER ON SUPERGENCE...');
    await btn.click();
    await page.waitForTimeout(4000);
  }

  const screenshotPath =
    'C:/Users/Akshan sharma/.gemini/antigravity/brain/bb9a50ee-166f-4573-a1f6-3270c22c4aa9/liquid_glass_active_hud.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Saved screenshot to:', screenshotPath);

  await browser.close();
}

run().catch(console.error);
