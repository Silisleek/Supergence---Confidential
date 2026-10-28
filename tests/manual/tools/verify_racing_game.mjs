import { chromium } from 'playwright-core';
import path from 'path';

async function verifyRacingGame() {
  console.log('Launching Chrome with Playwright...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  const consoleErrors = [];
  page.on('requestfailed', (req) => {
    console.log('REQUEST FAILED:', req.url(), req.failure()?.errorText);
  });

  page.on('response', (res) => {
    if (res.status() >= 400) {
      console.log('HTTP ERROR STATUS:', res.status(), res.url());
    }
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log('[Page Error]', msg.text());
    } else {
      console.log('[Page Log]', msg.text());
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
    console.log('[Uncaught Error]', err.message);
  });

  console.log('Navigating to realistic racing game artifact...');
  await page.goto(
    'http://localhost:3009/workspace/game_a_full_3d_arcade_simulation_raci_1792547761468.html',
    {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    },
  );

  // Wait for canvas to mount and start rendering
  await page.waitForSelector('canvas', { timeout: 10000 });
  console.log('✓ Canvas found in DOM');

  // Wait 3 seconds for rendering loop and physics to stabilize
  await page.waitForTimeout(3000);

  // Check state inside the game page
  const telemetry = await page.evaluate(() => {
    const speedEl = document.getElementById('hud-speed');
    const gearEl = document.getElementById('hud-gear');
    const lapEl = document.getElementById('hud-lap');
    const timeEl = document.getElementById('hud-time');
    const posEl = document.getElementById('hud-pos');
    const radarEl = document.getElementById('radar-canvas');
    return {
      speedText: speedEl ? speedEl.textContent : null,
      gearText: gearEl ? gearEl.textContent : null,
      lapText: lapEl ? lapEl.textContent : null,
      timeText: timeEl ? timeEl.textContent : null,
      posText: posEl ? posEl.textContent : null,
      hasRadar: !!radarEl,
      hasThree: typeof window.THREE !== 'undefined',
      activeCanvas: !!document.querySelector('canvas'),
    };
  });

  console.log('Game Telemetry:', JSON.stringify(telemetry, null, 2));

  const screenshotPath =
    'C:/Users/Akshan sharma/.gemini/antigravity/brain/7c7fbd83-6c87-43b9-a9fc-d706f1060714/live_realistic_racing_game_verified.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('✓ Screenshot captured to:', screenshotPath);

  await browser.close();
  console.log('Console Errors count:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.log('Errors:', consoleErrors);
  }
}

verifyRacingGame().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
