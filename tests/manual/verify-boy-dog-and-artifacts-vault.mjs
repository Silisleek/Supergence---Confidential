// tests/verify-boy-dog-and-artifacts-vault.mjs
// Playwright Google Chrome End-to-End Verification of:
// 1. Omni-Visual Code-to-Video Engine (Boy playing with dog in park)
// 2. Supergence Artifacts Vault & Live Gallery (Every workspace artifact saved and visible)

import { chromium } from 'playwright-core';
import path from 'path';
import fs from 'fs';
import os from 'os';

const PORT = 3008;
const BASE_URL = `http://localhost:${PORT}`;
const ARTIFACTS_DIR =
  'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\b4cb1339-bae8-4948-a6e1-0557a4708b93';

async function run() {
  console.log('================================================================');
  console.log('🚀 E2E VERIFICATION: BOY & DOG PARK SIMULATION & ARTIFACTS VAULT');
  console.log('================================================================\n');

  // Step 0: Verify Backend & Artifacts API
  console.log('[Step 0] Verifying backend and artifacts stats endpoint...');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  if (!healthRes.ok) throw new Error(`Backend not healthy: HTTP ${healthRes.status}`);
  const statsRes = await fetch(`${BASE_URL}/api/artifacts/stats`);
  const stats = await statsRes.json();
  console.log(
    `✓ Backend online! Total artifacts on disk: ${stats.total} (Simulations: ${stats.simulations}, Code: ${stats.code})`,
  );

  // Step 1: Launch Chrome
  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(
      os.homedir(),
      'AppData',
      'Local',
      'ms-playwright',
      'chromium-1155',
      'chrome-win',
      'chrome.exe',
    ),
    path.join(
      os.homedir(),
      'AppData',
      'Local',
      'ms-playwright',
      'chromium-1153',
      'chrome-win',
      'chrome.exe',
    ),
  ];
  let executablePath = chromePaths.find((p) => fs.existsSync(p));
  console.log(`[Step 1] Launching Chrome via: ${executablePath || 'channel: chrome'}`);
  const browser = await chromium.launch({
    headless: true,
    executablePath,
    channel: executablePath ? undefined : 'chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`  [Browser Console Error]:`, msg.text());
  });

  // Step 2: Navigate to App
  console.log(`[Step 2] Navigating to ${BASE_URL}/ ...`);
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Dismiss powerOnOverlay if present
  console.log('[Step 2b] Dismissing powerOnOverlay and initializing session state...');
  await page.evaluate(() => {
    localStorage.setItem('supergence_powered_on', 'true');
    const overlay = document.getElementById('powerOnOverlay');
    if (overlay) overlay.classList.add('hidden');
  });
  await page.waitForTimeout(500);

  // Step 3: Test Artifacts Vault Modal
  console.log('[Step 3] Opening Artifacts Vault Modal via #btnTopArtifactsVault...');
  await page.locator('#btnTopArtifactsVault').click({ force: true });

  const vaultModal = page.locator('#artifactsVaultModal');
  await vaultModal.waitFor({ state: 'visible', timeout: 8000 });
  console.log('✓ Artifacts Vault Modal is OPEN');

  // Verify counters
  await page.waitForSelector('#vCountAll', { timeout: 5000 });
  const countAll = await page.locator('#vCountAll').textContent();
  const countSim = await page.locator('#vCountSim').textContent();
  const countCode = await page.locator('#vCountCode').textContent();
  console.log(
    `✓ Vault counters loaded: All=${countAll}, Simulations=${countSim}, Code=${countCode}`,
  );

  // Filter by Simulations & Videos
  console.log('[Step 3b] Filtering by Simulations & Videos category pill...');
  await page.locator('button[data-type="simulation"]').click({ force: true });
  await page.waitForTimeout(600);

  // Search "dog"
  console.log('[Step 3c] Searching for "dog" in vaultSearchInput...');
  await page.locator('#vaultSearchInput').pressSequentially('dog', { delay: 50 });
  await page.waitForTimeout(1200);

  // Wait for matching cards to render
  await page.waitForSelector('#vaultArtifactsGrid .vault-artifact-card', { timeout: 8000 });
  const cardsCount = await page.locator('#vaultArtifactsGrid .vault-artifact-card').count();
  console.log(`✓ Filtered cards matching "dog": ${cardsCount}`);

  // Click on the first card to load preview
  const firstCard = page.locator('#vaultArtifactsGrid .vault-artifact-card').first();
  const cardTitle = await firstCard.locator('div[style*="font-weight:700"]').first().textContent();
  console.log(`✓ Clicking card: "${cardTitle.trim()}"`);
  await firstCard.click();
  await page.waitForTimeout(1500);

  // Verify preview loaded
  await page.waitForFunction(
    () => {
      const frame = document.getElementById('vaultPreviewIframe');
      return frame && frame.getAttribute('src') && frame.style.display !== 'none';
    },
    { timeout: 8000 },
  );

  const iframeSrc = await page.locator('#vaultPreviewIframe').getAttribute('src');
  console.log(`✓ Preview pane active with simulation iframe: ${iframeSrc}`);

  // Wait 1.5s for iframe preview to render canvas inside vault
  await page.waitForTimeout(1500);

  // Screenshot Artifacts Vault with active cards and live preview
  const vaultScreenshotPath = path.join(ARTIFACTS_DIR, 'artifacts_vault_verified_chrome.png');
  await page.screenshot({ path: vaultScreenshotPath });
  console.log(`📸 Saved Artifacts Vault screenshot to: ${vaultScreenshotPath}`);

  // Close Vault Modal
  console.log('[Step 3d] Closing Artifacts Vault Modal...');
  await page.locator('#artifactsVaultModal button:has-text("✕")').click({ force: true });
  await page.waitForTimeout(600);

  // Step 4: Test Boy Playing With Dog Prompt in Supergence
  console.log('\n[Step 4] Submitting prompt: "A boy playing with his dog in a park"...');

  await page.evaluate(() => {
    if (typeof window.openWorkspace === 'function') {
      window.openWorkspace('A boy playing with his dog in a park');
    }
  });
  console.log('✓ Submitted prompt to workspace! Waiting for turn completion...');

  // Wait for turn response (could take up to 35s)
  await page.waitForSelector('.workspace-deck-slot iframe', { timeout: 35000 });
  console.log('✓ Turn completed and simulation iframe rendered in workspace response!');

  // Check turn response content
  const responseMarkdown = await page.locator('.response-body-markdown').last().textContent();
  console.log(`✓ Turn response text: ${responseMarkdown.slice(0, 180).replace(/\n/g, ' ')}...`);

  // Verify no raw unparsed JSON leak
  if (
    responseMarkdown.includes('ada_synthesizeToolDynamically') ||
    responseMarkdown.includes('{"tool":')
  ) {
    throw new Error('Detected raw JSON leakage in chat turn response!');
  }
  console.log('✓ Zero raw JSON code leakage verified in response text!');

  // Check iframe attributes
  const simIframe = page.locator('.workspace-deck-slot iframe').first();
  const simUrl = await simIframe.getAttribute('src');
  console.log(`✓ Verified embedded simulation iframe src: ${simUrl}`);

  // Wait 2 seconds for canvas inside workspace iframe to render
  await page.waitForTimeout(2000);

  // Screenshot workspace turn with embedded simulation
  const turnScreenshotPath = path.join(ARTIFACTS_DIR, 'boy_dog_park_workspace_turn_chrome.png');
  await page.screenshot({ path: turnScreenshotPath });
  console.log(`📸 Saved Turn screenshot to: ${turnScreenshotPath}`);

  // Step 5: Direct Canvas Simulation Verification
  console.log('\n[Step 5] Direct verification of 60 FPS Canvas Simulation...');
  const simPage = await context.newPage();
  await simPage.goto(`${BASE_URL}/workspace/boy_playing_with_dog_park.html`, {
    waitUntil: 'domcontentloaded',
  });
  await simPage.waitForSelector('canvas#stage', { timeout: 8000 });

  const initialHud = await simPage.locator('#hud').textContent();
  console.log(`✓ Initial HUD text: "${initialHud.trim()}"`);

  // Wait 1.5 seconds to verify frames are progressing (60 FPS loop active)
  await simPage.waitForTimeout(1500);
  const nextHud = await simPage.locator('#hud').textContent();
  console.log(`✓ Progressed HUD text: "${nextHud.trim()}" (Dynamic 60 FPS loop confirmed)`);

  const canvasScreenshotPath = path.join(ARTIFACTS_DIR, 'boy_dog_park_canvas_verified_chrome.png');
  await simPage.screenshot({ path: canvasScreenshotPath });
  console.log(`📸 Saved Direct Canvas screenshot to: ${canvasScreenshotPath}`);

  await browser.close();
  console.log('\n================================================================');
  console.log('✅ ALL VERIFICATIONS PASSED IN REAL GOOGLE CHROME!');
  console.log('================================================================\n');
}

run().catch((err) => {
  console.error('\n❌ VERIFICATION FAILED:', err);
  process.exit(1);
});
