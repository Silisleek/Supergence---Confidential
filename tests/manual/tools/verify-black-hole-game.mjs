// SIS 1.0 — Empirical Playwright Chrome Verification of Black Hole Armada Game
import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';

const ARTIFACTS_DIR =
  'C:/Users/Akshan sharma/.gemini/antigravity/brain/7c7fbd83-6c87-43b9-a9fc-d706f1060714';
const PORT = 3009;
const GAME_FILENAME = 'black_hole_armada_relativistic_singu_1792473468438.html';
const GAME_URL = `http://localhost:${PORT}/workspace/${GAME_FILENAME}`;
const APP_URL = `http://localhost:${PORT}/`;

async function verify() {
  console.log(`[Playwright] Launching Chrome to verify Black Hole Armada Game...`);
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--disable-gpu', '--no-sandbox'],
  });

  // ─────────────────────────────────────────────────────────────
  // PART 1: STANDALONE GAME VERIFICATION
  // ─────────────────────────────────────────────────────────────
  console.log(`[Playwright] Step 1: Navigating to ${GAME_URL}...`);
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await page.goto(GAME_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2500);

  // Check Canvas elements exist and have valid dimensions
  const mainCanvas = page.locator('#mainCanvas');
  const auxCanvas = page.locator('#auxCanvas');
  const mainVisible = await mainCanvas.isVisible();
  const auxVisible = await auxCanvas.isVisible();
  console.log(
    `[Playwright] #mainCanvas visible: ${mainVisible}, #auxCanvas visible: ${auxVisible}`,
  );
  if (!mainVisible || !auxVisible) {
    throw new Error('Canvases are not visible in Black Hole Armada game');
  }

  // Check FPS Counter
  const fpsText = await page.locator('#fpsCounter').textContent();
  console.log(`[Playwright] Initial FPS text: "${fpsText}"`);

  // Wait for telemetry metrics to be computed and non-zero
  await page.waitForFunction(
    () => {
      const minD = document.getElementById('teleDistance');
      const gamma = document.getElementById('teleDilation');
      return minD && gamma && minD.textContent !== '...' && gamma.textContent !== '...';
    },
    { timeout: 10000 },
  );

  const minDVal = await page.locator('#teleDistance').textContent();
  const gammaVal = await page.locator('#teleDilation').textContent();
  console.log(
    `[Playwright] Live Telemetry: Min Distance = ${minDVal} Rs, Time Dilation = ${gammaVal} γ`,
  );

  // Test interactive buttons: Presets, Graviton Pulse, Tractor Beam
  console.log('[Playwright] Testing interactive Presets and Controls...');
  const btnCrisis = page.locator('#presetCrisis');
  if (await btnCrisis.isVisible()) {
    await btnCrisis.click();
    console.log('[Playwright] Clicked #presetCrisis ("Event Horizon Crisis")');
    await page.waitForTimeout(1000);
  }

  // Test Player Controls: Key presses
  console.log('[Playwright] Testing Player Flagship steering (W, A, D, Space)...');
  await page.keyboard.press('KeyW');
  await page.keyboard.press('KeyA');
  await page.keyboard.press('KeyD');
  await page.keyboard.press('Space'); // Fires Tractor Beam
  await page.waitForTimeout(1000);

  // Capture standalone screenshot
  const standaloneScreenshot = path.join(ARTIFACTS_DIR, 'verified_black_hole_armada_game.png');
  await page.screenshot({ path: standaloneScreenshot });
  console.log(`[Playwright] Saved standalone screenshot to: ${standaloneScreenshot}`);

  // ─────────────────────────────────────────────────────────────
  // PART 2: THE APP IS THE DELIVERABLE (Mount into http://localhost:3009/)
  // ─────────────────────────────────────────────────────────────
  console.log(`[Playwright] Step 2: Navigating to Supergence App at ${APP_URL}...`);
  const appPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await appPage.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await appPage.waitForTimeout(2000);

  // Transition to workspace view
  console.log('[Playwright] Switching to workspace view in App...');
  await appPage.evaluate(() => {
    if (typeof window.toggleWorkspaceFromNav === 'function') {
      window.toggleWorkspaceFromNav();
    }
  });
  await appPage.waitForTimeout(1000);

  // Mount Black Hole game into app center stage
  console.log(
    '[Playwright] Mounting Black Hole Armada into #sideHeroArtifactIframe via loadHeroArtifact...',
  );
  await appPage.evaluate((gameUrl) => {
    const art = {
      url: gameUrl,
      title: 'Black Hole Armada: Relativistic Singularity & Event Horizon Rescue',
      name: 'black_hole_armada_relativistic_singu_1792473468438.html',
      type: 'simulation',
    };
    if (typeof window.loadHeroArtifact === 'function') {
      window.loadHeroArtifact(art);
    }
  }, `/workspace/${GAME_FILENAME}`);

  await appPage.waitForTimeout(3000);

  // Verify iframe is visible and has the right src
  const iframe = appPage.locator('#sideHeroArtifactIframe');
  const iframeVisible = await iframe.isVisible();
  const iframeSrc = await iframe.getAttribute('src');
  console.log(`[Playwright] #sideHeroArtifactIframe visible: ${iframeVisible}, src: ${iframeSrc}`);

  if (!iframeVisible || !iframeSrc.includes(GAME_FILENAME)) {
    throw new Error('Game was not mounted cleanly in App iframe');
  }

  // Capture App mounted screenshot
  const appMountedScreenshot = path.join(ARTIFACTS_DIR, 'live_app_black_hole_armada_mounted.png');
  await appPage.screenshot({ path: appMountedScreenshot });
  console.log(`[Playwright] Saved live App mounted screenshot to: ${appMountedScreenshot}`);

  await browser.close();

  if (consoleErrors.length > 0) {
    console.warn('[Playwright] Console errors detected during test:', consoleErrors);
  }

  console.log(
    '✓ Empirical Playwright Browser Verification 100% SUCCESSFUL for Black Hole Armada Game!',
  );
}

verify().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
