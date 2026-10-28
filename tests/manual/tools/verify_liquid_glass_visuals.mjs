import { chromium } from 'playwright-core';

async function run() {
  console.log('[Test] Launching Chrome...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  // 1. Verify Primary Surface (Workbench at http://localhost:3008/)
  console.log('[Test] Navigating to http://localhost:3008/ ...');
  const page1 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page1.goto('http://localhost:3008/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page1.waitForTimeout(2000);

  const workbenchScreenshot =
    'C:/Users/Akshan sharma/.gemini/antigravity/brain/bb9a50ee-166f-4573-a1f6-3270c22c4aa9/workbench_liquid_glass_verified.png';
  await page1.screenshot({ path: workbenchScreenshot, fullPage: true });
  console.log('[Test] Workbench Liquid Glass screenshot saved to:', workbenchScreenshot);

  // Check that backdrop-filter is active on .app-window
  const windowBackdrop = await page1.$eval(
    '.app-window',
    (el) => window.getComputedStyle(el).backdropFilter,
  );
  console.log('[Test] .app-window computed backdrop-filter:', windowBackdrop);

  // 2. Verify Secondary Surface (Liquid Glass 3D HUD at http://localhost:3008/liquid-glass)
  console.log('[Test] Navigating to http://localhost:3008/liquid-glass ...');
  const page2 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page2.goto('http://localhost:3008/liquid-glass', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page2.waitForTimeout(2000);

  // If power-on button is visible, click it to show the 3D clock and living core
  const powerBtn = page2.locator('#powerOnBtn');
  if (await powerBtn.isVisible()) {
    console.log('[Test] Clicking Power On button...');
    await powerBtn.click();
    await page2.waitForTimeout(3000);
  }

  const hudScreenshot =
    'C:/Users/Akshan sharma/.gemini/antigravity/brain/bb9a50ee-166f-4573-a1f6-3270c22c4aa9/hud_liquid_glass_verified.png';
  await page2.screenshot({ path: hudScreenshot, fullPage: true });
  console.log('[Test] Liquid Glass HUD screenshot saved to:', hudScreenshot);

  await browser.close();
  console.log('[Test] ALL LIQUID GLASS VISUAL CHECKS COMPLETED!');
}

run().catch((err) => {
  console.error('[Test Error]', err);
  process.exit(1);
});
