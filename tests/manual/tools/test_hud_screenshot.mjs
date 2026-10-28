import { chromium } from 'playwright-core';

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('[Test] Navigating directly to http://localhost:3008/liquid-glass ...');
  await page.goto('http://localhost:3008/liquid-glass', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2500);

  const powerBtn = page.locator('#powerOnBtn');
  if (await powerBtn.isVisible()) {
    console.log('[Test] Clicking Power On button...');
    await powerBtn.click();
    await page.waitForTimeout(3000);
  }

  const hudScreenshot =
    'C:/Users/Akshan sharma/.gemini/antigravity/brain/bb9a50ee-166f-4573-a1f6-3270c22c4aa9/hud_liquid_glass_verified.png';
  await page.screenshot({ path: hudScreenshot, fullPage: true });
  console.log('[Test] Liquid Glass HUD screenshot saved to:', hudScreenshot);

  await browser.close();
}

run().catch(console.error);
