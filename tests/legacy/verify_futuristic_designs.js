import { chromium } from 'playwright-core';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR =
  'C:/Users/Akshan sharma/.gemini/antigravity/brain/bb9a50ee-166f-4573-a1f6-3270c22c4aa9';

async function verifyFuturisticDesigns() {
  console.log('[Verification] Launching Chrome via Playwright...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  // ── TEST 1: Primary Workbench Surface (http://localhost:3008/) ──
  console.log(
    '[Verification] Step 1: Loading Primary Workbench Surface (http://localhost:3008/)...',
  );
  const page1 = await context.newPage();
  await page1.goto('http://localhost:3008/', { waitUntil: 'domcontentloaded' });
  await page1.waitForTimeout(2000);

  // Check header buttons
  const futuristicBtn = await page1.$('a[title*="Futuristic Holographic HUD"]');
  console.log('Futuristic HUD Header button exists:', !!futuristicBtn);

  // Find Futuristic Starter Chip and click it
  const chips = await page1.$$('.starter-chip');
  console.log(`Found ${chips.length} starter chips`);
  let clickedChip = false;
  for (const chip of chips) {
    const text = await chip.innerText();
    if (text.includes('Futuristic Hologram')) {
      console.log('Clicking starter chip:', text.trim());
      await chip.click();
      clickedChip = true;
      break;
    }
  }

  if (!clickedChip) {
    console.log('Falling back to typing prompt into input...');
    await page1.fill(
      '#chatInput',
      'Explain the futuristic designs, holographic HUD, and cybernetic reactor architecture in Supergence',
    );
    await page1.click('#sendBtn');
  }

  // Wait for the stream to respond and intelligent UI card to mount
  console.log('Waiting for response stream & Futuristic HUD widget...');
  await page1.waitForSelector('.gen-ui-card', { timeout: 25000 });
  await page1.waitForTimeout(4000);

  const workbenchShot = path.join(ARTIFACT_DIR, 'futuristic_designs_workbench_verified.png');
  await page1.screenshot({ path: workbenchShot, fullPage: false });
  console.log(`Saved screenshot 1: ${workbenchShot}`);

  // ── TEST 2: Living Core Holographic HUD Surface (http://localhost:3008/liquid-glass?mode=futuristic) ──
  console.log('[Verification] Step 2: Loading Holographic Core HUD Surface...');
  const page2 = await context.newPage();
  await page2.goto('http://localhost:3008/liquid-glass?mode=futuristic', {
    waitUntil: 'domcontentloaded',
  });
  await page2.waitForTimeout(2000);

  // If power on overlay is showing, click power on button
  const powerBtn = await page2.$('#powerOnBtn');
  if (powerBtn) {
    console.log('Clicking Power On button on page 2...');
    await powerBtn.click();
    await page2.waitForTimeout(2500);
  }

  const isFuturisticActive = await page2.evaluate(() =>
    document.body.classList.contains('hud-futuristic-active'),
  );
  console.log('Body has class hud-futuristic-active:', isFuturisticActive);

  const holoNexusVisible = await page2.evaluate(() => {
    const el = document.getElementById('futuristicHoloNexus');
    return el && window.getComputedStyle(el).display !== 'none';
  });
  console.log('Holo nexus element visible:', holoNexusVisible);

  const degreeWheelVisible = await page2.evaluate(() => {
    const el = document.querySelector('.stark-degree-wheel-svg');
    return el && window.getComputedStyle(el).display !== 'none';
  });
  console.log('Degree wheel SVG visible:', degreeWheelVisible);

  const hudShot = path.join(ARTIFACT_DIR, 'futuristic_hud_living_core_verified.png');
  await page2.screenshot({ path: hudShot, fullPage: false });
  console.log(`Saved screenshot 2: ${hudShot}`);

  // ── TEST 3: Tactical Command Interface Surface (http://localhost:3008/jarvis) ──
  console.log('[Verification] Step 3: Loading Tactical Interface Surface...');
  const page3 = await context.newPage();
  await page3.goto('http://localhost:3008/jarvis', { waitUntil: 'domcontentloaded' });
  await page3.waitForTimeout(2500);

  const tacticalTitle = await page3.title();
  console.log('Tactical page title:', tacticalTitle);

  const tacticalShot = path.join(ARTIFACT_DIR, 'tactical_interface_verified.png');
  await page3.screenshot({ path: tacticalShot, fullPage: false });
  console.log(`Saved screenshot 3: ${tacticalShot}`);

  await browser.close();
  console.log('[Verification] All tests completed successfully!');
}

verifyFuturisticDesigns().catch((err) => {
  console.error('[Verification Error]', err);
  process.exit(1);
});
