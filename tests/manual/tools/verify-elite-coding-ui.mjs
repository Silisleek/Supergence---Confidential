// SIS 1.0 — Playwright Empirical Browser Verification for Elite Coding Blueprint UI
import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';

const ARTIFACTS_DIR =
  'C:/Users/Akshan sharma/.gemini/antigravity/brain/7c7fbd83-6c87-43b9-a9fc-d706f1060714';
const PORT = 3009;
const APP_URL = `http://localhost:${PORT}/`;

async function verify() {
  console.log(`[Playwright] Launching Chrome to verify Elite Coding UI on ${APP_URL}...`);
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--disable-gpu', '--no-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  console.log(`[Playwright] Navigating to ${APP_URL}...`);
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Transition to workspace view
  console.log('[Playwright] Activating workspace view...');
  await page.evaluate(() => {
    if (typeof window.toggleWorkspaceFromNav === 'function') {
      window.toggleWorkspaceFromNav();
    }
  });
  await page.waitForTimeout(1000);

  // 1. Verify workspaceBtnEliteCoding pill exists
  console.log('[Playwright] Checking Elite Coding header action pill...');
  const pill = await page.locator('#workspaceBtnEliteCoding');
  const pillVisible = await pill.isVisible();
  console.log(`[Playwright] #workspaceBtnEliteCoding visible: ${pillVisible}`);
  if (!pillVisible) {
    throw new Error('Elite Coding header action pill #workspaceBtnEliteCoding is not visible');
  }

  // 2. Click the pill to open the modal
  console.log('[Playwright] Clicking Elite Coding pill to open modal...');
  await pill.click();
  await page.waitForTimeout(1000);

  const modal = await page.locator('#eliteCodingModal');
  const modalVisible = await modal.isVisible();
  console.log(`[Playwright] #eliteCodingModal visible: ${modalVisible}`);
  if (!modalVisible) {
    throw new Error('Elite Coding Modal did not open after clicking pill');
  }

  // 3. Trigger the benchmark suite from the modal
  console.log('[Playwright] Triggering benchmark suite via #btnModalRunBenchmark...');
  const runBtn = await page.locator('#btnModalRunBenchmark');
  await runBtn.click();

  // Wait for the status badge to show success (4/4 passed)
  console.log('[Playwright] Polling for benchmark completion...');
  const statusBadge = page.locator('#eliteModalStatusBadge');
  await page.waitForFunction(
    () => {
      const el = document.getElementById('eliteModalStatusBadge');
      return el && el.textContent.includes('100% PASS');
    },
    { timeout: 45000 },
  );

  const finalBadgeText = await statusBadge.textContent();
  console.log(`[Playwright] Benchmark final status: "${finalBadgeText}"`);

  const consoleText = await page.locator('#eliteModalConsoleOutput').textContent();
  console.log(`[Playwright] Benchmark console snippet:\n${consoleText.slice(0, 300)}...`);

  if (!consoleText.includes('ALL 4/4 ELITE ENGINEERING BENCHMARKS PASSED 100%')) {
    throw new Error('Benchmark output did not confirm 4/4 passes');
  }

  // Save screenshot of modal
  const modalScreenshotPath = path.join(ARTIFACTS_DIR, 'verified_elite_coding_blueprint_modal.png');
  await page.screenshot({ path: modalScreenshotPath });
  console.log(`[Playwright] Saved modal screenshot to: ${modalScreenshotPath}`);

  // 4. Close modal and check Code Studio toolbar button
  console.log('[Playwright] Closing modal and checking Pro Code Studio toolbar button...');
  await page.evaluate(() => window.toggleEliteCodingModal(false));
  await page.waitForTimeout(500);

  const benchmarkBtn = page.locator('#codeStudioBenchmarkBtn');
  const btnExists = (await benchmarkBtn.count()) > 0;
  console.log(`[Playwright] #codeStudioBenchmarkBtn exists in DOM: ${btnExists}`);

  const appScreenshotPath = path.join(ARTIFACTS_DIR, 'verified_app_elite_coding_suite.png');
  await page.screenshot({ path: appScreenshotPath });
  console.log(`[Playwright] Saved app screenshot to: ${appScreenshotPath}`);

  await browser.close();
  console.log('✓ Empirical Playwright Browser Verification 100% SUCCESSFUL!');
}

verify().catch((err) => {
  console.error('Playwright Verification Failed:', err);
  process.exit(1);
});
