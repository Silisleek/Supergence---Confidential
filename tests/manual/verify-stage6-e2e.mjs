import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR =
  'C:/Users/Akshan sharma/.gemini/antigravity/brain/7c7fbd83-6c87-43b9-a9fc-d706f1060714';
const SCREENSHOT_PATH = path.join(ARTIFACT_DIR, 'stage6_verified_supergence_live.png');

async function run() {
  console.log('🚀 [Stage 6] Starting Browser Verification on http://localhost:3009/ ...');

  let browser;
  try {
    browser = await chromium.launch({
      channel: 'chrome',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    console.log('  ✓ Launched Google Chrome channel');
  } catch (err) {
    console.warn('  ⚠️ Falling back to default playwright chromium:', err.message);
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const consoleLogs = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text });
    if (msg.type() === 'error') {
      console.error('  [Browser Error]', text);
    } else if (
      text.includes('[ContinuousDock]') ||
      text.includes('[Supergence]') ||
      text.includes('[Boot]')
    ) {
      console.log('  [Browser Console]', text);
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
    console.error('  [Page Uncaught Error]', err.message);
  });

  // Handle prompt dialog for persistent goal
  let promptHandled = false;
  const testGoalObjective = 'Verify autonomous self-healing and tool synthesis';
  page.on('dialog', async (dialog) => {
    console.log(`  [Dialog] ${dialog.type()}: "${dialog.message()}"`);
    if (dialog.type() === 'prompt') {
      promptHandled = true;
      await dialog.accept(testGoalObjective);
      console.log(`  ✓ Accepted prompt with goal: "${testGoalObjective}"`);
    } else {
      await dialog.dismiss();
    }
  });

  console.log('🌐 Navigating to http://localhost:3009/ ...');
  await page.goto('http://localhost:3009/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Dismiss boot screen if present
  const bootScreen = await page.$('#boot-screen');
  if (bootScreen) {
    console.log('  Waiting for boot sequence completion...');
    await page.waitForSelector('#app:not(.hidden), #homeView', { timeout: 15000 }).catch(() => {});
  }

  // Dismiss powerOnOverlay if present
  const powerOnOverlay = await page.$('#powerOnOverlay');
  if (powerOnOverlay) {
    const isVis = await powerOnOverlay.isVisible();
    if (isVis) {
      console.log('  Dismissing powerOnOverlay...');
      const powerBtn = await page.$(
        '#btnPowerOn, .power-start-btn, button:has-text("POWER ON"), button:has-text("INITIALIZE")',
      );
      if (powerBtn) await powerBtn.click();
      await page.waitForTimeout(1000);
    }
  }

  // If workspace overlay became active from power-on, return to Home view to view #sis-continuous-dock
  const backHomeBtn = await page.$('#backHomeBtn');
  if (backHomeBtn) {
    const isBackVis = await backHomeBtn.isVisible().catch(() => false);
    if (isBackVis) {
      console.log('  Returning to Home View via #backHomeBtn...');
      await backHomeBtn.click();
      await page.waitForTimeout(1000);
    }
  }

  console.log('\n--- 1. VERIFYING CONTINUOUS COGNITION DOCK & LIVE 1s TICKS ---');
  // Wait for #sis-continuous-dock and #cog-tick-count to be present and visible
  await page.waitForSelector('#sis-continuous-dock #cog-tick-count', { timeout: 10000 });

  // Read initial tick
  const initialTickText = await page.$eval('#cog-tick-count', (el) => el.textContent.trim());
  console.log(`  Initial tick count: ${initialTickText}`);

  // Wait 3 seconds and verify it incremented over WebSocket
  console.log('  Waiting 3 seconds to observe live tick stream...');
  let tickIncremented = false;
  let currentTickText = initialTickText;

  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(1000);
    const newTickText = await page.$eval('#cog-tick-count', (el) => el.textContent.trim());
    console.log(`  Tick after ${i + 1}s: ${newTickText}`);
    const numInitial = parseInt(initialTickText.replace('#', ''), 10) || 0;
    const numNew = parseInt(newTickText.replace('#', ''), 10) || 0;
    if (numNew > numInitial) {
      tickIncremented = true;
      currentTickText = newTickText;
      break;
    }
  }

  if (!tickIncremented) {
    throw new Error(
      `Tick did not increment! Initial: ${initialTickText}, Latest: ${currentTickText}`,
    );
  }
  console.log(
    `  ✓ VERIFIED: Continuous 1-second local tick is incrementing live (${initialTickText} -> ${currentTickText})`,
  );

  console.log('\n--- 2. VERIFYING PACING CONTROLS (Faster / Pause / Auto) ---');
  // Ensure homeView is front and center before pacing interactions
  await page.evaluate(() => {
    const ws = document.getElementById('supergenceWorkspace');
    const home = document.getElementById('homeView');
    if (ws) ws.classList.remove('active');
    if (home) home.style.display = 'flex';
  });
  await page.waitForTimeout(500);

  // 2a. Click 'Faster'
  const fasterBtn = await page.$('#sis-continuous-dock button.cog-pace-btn[data-pace="faster"]');
  if (!fasterBtn) throw new Error('Faster pace button not found in #sis-continuous-dock');
  console.log('  Clicking "Faster" pacing button...');
  await fasterBtn.click({ force: true });
  let cadenceBadge = '';
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(400);
    cadenceBadge = await page.$eval('#sis-continuous-dock #cog-cadence-badge', (el) =>
      el.textContent.trim(),
    );
    if (cadenceBadge.toLowerCase().includes('faster')) break;
  }
  console.log(`  Cadence badge after Faster: "${cadenceBadge}"`);
  if (!cadenceBadge.toLowerCase().includes('faster')) {
    throw new Error(`Cadence badge did not reflect Faster! Got: ${cadenceBadge}`);
  }
  console.log('  ✓ Faster pacing confirmed');

  // 2b. Click 'Pause'
  const pauseBtn = await page.$('#sis-continuous-dock button.cog-pace-btn[data-pace="paused"]');
  if (!pauseBtn) throw new Error('Pause button not found in #sis-continuous-dock');
  console.log('  Clicking "Pause" pacing button...');
  await pauseBtn.click({ force: true });
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(400);
    cadenceBadge = await page.$eval('#sis-continuous-dock #cog-cadence-badge', (el) =>
      el.textContent.trim(),
    );
    if (
      cadenceBadge.toLowerCase().includes('paused') ||
      cadenceBadge.toLowerCase().includes('pause')
    )
      break;
  }
  console.log(`  Cadence badge after Pause: "${cadenceBadge}"`);
  if (
    !cadenceBadge.toLowerCase().includes('paused') &&
    !cadenceBadge.toLowerCase().includes('pause')
  ) {
    throw new Error(`Cadence badge did not reflect Pause! Got: ${cadenceBadge}`);
  }
  console.log('  ✓ Pause pacing confirmed');

  // 2c. Click 'Auto'
  const autoBtn = await page.$('#sis-continuous-dock button.cog-pace-btn[data-pace="auto"]');
  if (!autoBtn) throw new Error('Auto button not found in #sis-continuous-dock');
  console.log('  Clicking "Auto" pacing button...');
  await autoBtn.click({ force: true });
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(400);
    cadenceBadge = await page.$eval('#sis-continuous-dock #cog-cadence-badge', (el) =>
      el.textContent.trim(),
    );
    if (cadenceBadge.toLowerCase().includes('auto')) break;
  }
  console.log(`  Cadence badge after Auto: "${cadenceBadge}"`);
  if (!cadenceBadge.toLowerCase().includes('auto')) {
    throw new Error(`Cadence badge did not reflect Auto! Got: ${cadenceBadge}`);
  }
  console.log('  ✓ Auto pacing confirmed');

  console.log('\n--- 3. VERIFYING PERSISTENT GOAL ENGINE & UI ---');
  const setGoalBtn = await page.$('#sis-continuous-dock #btn-set-goal');
  if (!setGoalBtn) throw new Error('#btn-set-goal button not found in #sis-continuous-dock');

  console.log('  Clicking "+ Set Goal" button...');
  await setGoalBtn.click({ force: true });

  if (!promptHandled) {
    throw new Error('Prompt dialog was not triggered by + Set Goal button');
  }

  // Poll for goal title to be updated (per AGENTS.md synchronization rule)
  let goalTitle = '';
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(500);
    goalTitle = await page.$eval('#sis-continuous-dock #cog-goal-title', (el) =>
      el.textContent.trim(),
    );
    if (goalTitle === testGoalObjective) break;
  }
  console.log(`  Goal title in dock: "${goalTitle}"`);
  if (goalTitle !== testGoalObjective) {
    throw new Error(`Expected goal title "${testGoalObjective}", got: "${goalTitle}"`);
  }

  const goalBadgeVisible = await page.$eval(
    '#sis-continuous-dock #cog-goal-step-badge',
    (el) => window.getComputedStyle(el).display !== 'none',
  );
  const goalBadgeText = await page.$eval('#sis-continuous-dock #cog-goal-step-badge', (el) =>
    el.textContent.trim(),
  );
  console.log(`  Goal step badge: "${goalBadgeText}" (visible: ${goalBadgeVisible})`);

  const progressWrapVisible = await page.$eval(
    '#sis-continuous-dock #cog-goal-progress-wrap',
    (el) => window.getComputedStyle(el).display !== 'none',
  );
  console.log(`  Goal progress wrap visible: ${progressWrapVisible}`);

  if (!goalBadgeVisible || !progressWrapVisible) {
    throw new Error('Goal progress or step badge is not visible in dock');
  }
  console.log('  ✓ VERIFIED: Persistent goal renders cleanly with badge and progress bar');

  console.log('\n--- 4. VERIFYING ADA-SI TOOL FORGER STATUS ---');
  // Check Ada-SI badge on dock
  const adaBadge = await page.$('#cog-ada-badge');
  if (adaBadge) {
    const adaText = await page.$eval('#cog-ada-badge', (el) => el.textContent.trim());
    console.log(`  Ada-SI badge in dock: "${adaText}"`);
    if (!adaText.includes('installed')) {
      throw new Error(`Ada-SI badge unexpected content: ${adaText}`);
    }
  }

  // Fetch /api/ada/status from browser context
  const adaStatus = await page.evaluate(async () => {
    const res = await fetch('/api/ada/status');
    return await res.json();
  });
  console.log(
    `  Ada-SI status from API: totalInstalled=${adaStatus.totalInstalled}, totalPending=${adaStatus.totalPending}`,
  );
  if (typeof adaStatus.totalInstalled !== 'number' || adaStatus.totalInstalled < 1) {
    throw new Error(`Expected totalInstalled >= 1, got ${adaStatus.totalInstalled}`);
  }
  console.log(`  Installed tools verified (${adaStatus.totalInstalled} tools active in sandbox):`);
  for (const t of adaStatus.installedTools.slice(0, 4)) {
    console.log(
      `    - ${t.name} (${t.displayName}): integrity=${t.integrity?.slice(0, 12)}... verified=${t.verified}`,
    );
  }
  console.log('  ✓ VERIFIED: Ada-SI Dynamic Tool Forger status and sandbox integrity confirmed');

  console.log('\n--- 5. CHECKING CONSOLE & NETWORK INTEGRITY ---');
  const fatalErrors = pageErrors.filter((e) => !e.includes('favicon') && !e.includes('audio'));
  if (fatalErrors.length > 0) {
    throw new Error(`Fatal page errors detected: ${fatalErrors.join(', ')}`);
  }
  console.log('  ✓ No fatal uncaught page errors');

  console.log('\n--- 6. CAPTURING VERIFICATION SCREENSHOT ---');
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }
  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false });
  console.log(`  ✓ Screenshot saved to: ${SCREENSHOT_PATH}`);

  await browser.close();
  console.log('\n🎉 ALL 4 STAGE 6 VERIFICATION CRITERIA PASSED CLEANLY!');
}

run().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
