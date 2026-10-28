import { chromium } from 'playwright-core';

async function run() {
  console.log('[Test] Launching Chrome...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('[Test] Navigating to http://localhost:3008/supergence-workbench.html...');
  await page.goto('http://localhost:3008/supergence-workbench.html', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  // 1. Check Liquid Glass HUD switcher button in header
  await page.waitForSelector('a[href="/liquid-glass"]', { timeout: 15000 });
  const hudBtnText = await page.locator('a[href="/liquid-glass"]').innerText();
  console.log('[Test] Liquid Glass HUD switcher button found:', hudBtnText);

  // 2. Check Liquid Glass UI starter chip
  const chips = await page.$$eval('.starter-chip span', (els) =>
    els.map((e) => e.innerText.trim()),
  );
  const hasGlassChip = chips.some((c) => c.includes('Liquid Glass UI'));
  console.log('[Test] Liquid Glass UI starter chip present:', hasGlassChip);
  if (!hasGlassChip) {
    throw new Error('FAILED: Liquid Glass UI starter chip missing from bar');
  }

  // 3. Click the Liquid Glass UI starter chip to send the query
  console.log('[Test] Clicking Liquid Glass UI starter chip...');
  const glassChipBtn = page.locator('button.starter-chip:has-text("Liquid Glass UI")');
  await glassChipBtn.click();

  // Wait for assistant response to finish streaming
  console.log('[Test] Waiting for assistant response...');
  await page.waitForFunction(
    () => {
      const btn = document.querySelector('#sendBtn');
      const texts = document.querySelectorAll('.bot-stream-text');
      if (!texts || texts.length === 0) return false;
      const last = texts[texts.length - 1];
      return btn && !btn.disabled && last && last.innerText.length > 50;
    },
    { timeout: 60000 },
  );

  const lastMsgText = await page.locator('.bot-stream-text').last().innerText();
  console.log('[Test] Assistant response preview (first 400 chars):');
  console.log(lastMsgText.slice(0, 400));

  // Verify explanation of Liquid Glass UI
  const lowerMsg = lastMsgText.toLowerCase();
  const explainsLiquidGlass =
    lowerMsg.includes('liquid glass') ||
    lowerMsg.includes('apple') ||
    lowerMsg.includes('glass') ||
    lowerMsg.includes('physics');
  if (!explainsLiquidGlass) {
    throw new Error('FAILED: Assistant response did not explain Liquid Glass UI properly');
  }

  // Take screenshot
  const screenshotPath =
    'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\bb9a50ee-166f-4573-a1f6-3270c22c4aa9\\liquid_glass_ui_feature_verified.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('[Test] Screenshot saved to', screenshotPath);

  await browser.close();
}

run().catch((err) => {
  console.error('[Test Error]', err);
  process.exit(1);
});
