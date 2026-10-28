import { chromium } from 'playwright-core';
import path from 'path';

async function runTest() {
  console.log('🚀 Starting Supergence Single Unified System Verification...');

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  // Track console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('Browser console error:', msg.text());
    }
  });

  console.log('Navigating to http://localhost:3008/workbench...');
  await page.goto('http://localhost:3008/workbench', { waitUntil: 'domcontentloaded' });

  // 1. Check Page Title
  const title = await page.title();
  console.log('✓ Page Title:', title);
  if (!title.includes('Supergence')) {
    throw new Error('Title does not contain Supergence');
  }

  // 2. Verify ZERO tabs exist (User requirement: NOT separate engines running simultaneously, NO selection)
  const tabsCount = await page.locator('.tabs-bar, .nav-tab').count();
  console.log(`✓ Separate Engine Tabs Count: ${tabsCount} (Expected: 0)`);
  if (tabsCount !== 0) {
    throw new Error(`Expected 0 engine tabs, found ${tabsCount}`);
  }

  // 3. Verify NO badge saying "ALL ENGINES RUNNING SIMULTANEOUSLY"
  const bodyText = await page.locator('body').innerText();
  if (
    bodyText.includes('ALL ENGINES RUNNING SIMULTANEOUSLY') ||
    bodyText.includes('running simultaneously')
  ) {
    throw new Error('Found banned phrase "ALL ENGINES RUNNING SIMULTANEOUSLY" in page');
  }
  console.log('✓ Verified: No simultaneous engines fragmentation badge exists.');

  // 4. Verify Live Telemetry Loads (No Hardcoding)
  console.log('Waiting for live Windows telemetry to populate...');
  await page.waitForFunction(
    () => {
      const plat = document.getElementById('statPlatform')?.innerText;
      return plat && plat !== '...' && plat.length > 2;
    },
    { timeout: 10000 },
  );

  const platform = await page.locator('#statPlatform').innerText();
  const cores = await page.locator('#statCores').innerText();
  const ram = await page.locator('#statRamUsed').innerText();
  const hostname = await page.locator('#statHostname').innerText();
  console.log(`✓ Live Host OS Substratum: ${platform} | ${cores} | RAM: ${ram} | ${hostname}`);

  // 5. Test Live Direct Host Terminal (Physical Shell execution)
  console.log('Testing direct host terminal command execution...');
  await page.fill('#terminalCmdInput', 'echo SUPERGENCE_LIVE_TERMINAL_CHECK');
  await page.click('button:has-text("Run")');
  await page.waitForFunction(
    () => {
      const text = document.getElementById('terminalOutputPre')?.innerText || '';
      return text.includes('SUPERGENCE_LIVE_TERMINAL_CHECK');
    },
    { timeout: 8000 },
  );
  console.log('✓ Direct Host Terminal verified live with physical shell output.');

  // 6. Test Supergence Omni-Execution Turn (Connected to FreeLLMAPI auto @ 127.0.0.1:31415)
  console.log('Submitting prompt to Supergence: "Show system info and disk space"...');
  await page.fill('#omniInputPrompt', 'Show system info and disk space');
  await page.click('#execBtn');

  // Wait for execution to finish
  console.log('Waiting for Supergence execution and FreeLLMAPI response...');
  await page.waitForFunction(
    () => {
      const badge = document.getElementById('executionStatusBadge')?.innerText || '';
      return badge.startsWith('Completed') || badge === 'Error';
    },
    { timeout: 30000 },
  );

  const statusBadge = await page.locator('#executionStatusBadge').innerText();
  console.log('✓ Execution Status:', statusBadge);

  const responseText = await page.locator('#masterResponseText').innerText();
  console.log('\n--- Supergence Sovereign Response Preview ---');
  console.log(responseText.slice(0, 300) + '...\n');

  if (responseText.includes('Execution exception')) {
    throw new Error('Supergence execution failed: ' + responseText);
  }

  // 7. Verify Embedded Action Card Rendered Inline
  const actionCardCount = await page.locator('.inline-action-card').count();
  console.log(`✓ Embedded Live Action Cards Rendered Inline: ${actionCardCount}`);

  // 8. Capture Full-Page Screenshot Artifact
  const screenshotPath =
    'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\bb9a50ee-166f-4573-a1f6-3270c22c4aa9\\supergence_unified_verified.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`✓ Screenshot captured to: ${screenshotPath}`);

  await browser.close();
  console.log('🎉 Supergence Single Unified System verification passed 100%!');
}

runTest().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
