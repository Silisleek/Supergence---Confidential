// tests/verify-supergence-workbench.mjs
// Real-browser end-to-end verification of Supergence Workbench using Playwright per AGENTS.md

import { chromium } from 'playwright-core';
import path from 'path';
import fs from 'fs';
import os from 'os';

const PORT = 3008;
const BASE_URL = `http://localhost:${PORT}`;

async function verifyWorkbench() {
  console.log('================================================================');
  console.log('🚀 SUPERGENCE WORKBENCH REAL-BROWSER PLAYWRIGHT VERIFICATION');
  console.log('================================================================\n');

  console.log(`[Step 0] Checking backend readiness at ${BASE_URL}...`);
  try {
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    if (!healthRes.ok) {
      throw new Error(`Health check returned HTTP ${healthRes.status}`);
    }
    const health = await healthRes.json();
    console.log(`✓ Backend online: ${JSON.stringify(health)}`);
  } catch (err) {
    throw new Error(`Cannot reach backend on port ${PORT}: ${err.message}`);
  }

  // Locate installed chrome
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

  console.log('[Step 1] Launching Chromium browser (channel: chrome)...');
  const browser = await chromium.launch({
    headless: true,
    executablePath,
    channel: executablePath ? undefined : 'chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.warn(`[Browser Console Error] ${msg.text()}`);
  });
  page.on('pageerror', (err) => console.warn(`[Browser PageError] ${err.message}`));

  console.log(`[Step 2] Navigating to ${BASE_URL}/...`);
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });

  // 1. Check title
  const title = await page.title();
  console.log(`✓ Page Title: "${title}"`);
  if (!title.toLowerCase().includes('supergence')) {
    throw new Error(`Unexpected page title: ${title}`);
  }

  // 2. Verify Agent Browser Ribbon
  console.log('[Step 3] Verifying live Agent Browser Ribbon...');
  await page.waitForSelector('#agentBrowserRibbon', { state: 'visible', timeout: 10000 });
  await page.waitForFunction(
    () => {
      const chips = document.querySelectorAll('#agentBrowserRibbon .agent-ribbon-chip');
      return chips.length >= 5;
    },
    { timeout: 10000 },
  );
  const chipCount = await page.evaluate(
    () => document.querySelectorAll('#agentBrowserRibbon .agent-ribbon-chip').length,
  );
  console.log(`✓ Agent Browser Ribbon rendered ${chipCount} active agent browser chips.`);

  // 3. Verify Dots Count Badge
  console.log('[Step 4] Verifying Swarm Dots / Specialist roster...');
  await page.waitForSelector('#dotsTotalCountBadge', { timeout: 10000 });
  const dotsText = await page.innerText('#dotsTotalCountBadge');
  console.log(`✓ Swarm Dots count badge rendered: ${dotsText}`);

  // 4. Verify Dynamic Timestamp
  console.log('[Step 5] Verifying zero-hardcoded dynamic timestamp...');
  const timeDivider = await page.innerText('#chatTimeDivider');
  console.log(`✓ chatTimeDivider text: "${timeDivider}"`);
  if (timeDivider.includes('9:41 AM')) {
    throw new Error(`Hardcoded timestamp 9:41 AM detected in chatTimeDivider!`);
  }
  if (!timeDivider.includes('TODAY')) {
    throw new Error(`Expected 'TODAY' in chatTimeDivider, got: "${timeDivider}"`);
  }
  console.log('✓ Dynamic timeDivider verified: No canned 9:41 AM!');

  // 5. Test Live Multi-Agent Unified Chat Execution
  console.log('\n[Step 6] Testing live chat turn streaming via unified core...');
  await page.waitForSelector('#chatInput', { timeout: 10000 });
  await page.fill(
    '#chatInput',
    'Briefly summarize the primary advantage of autonomous multi-agent systems in one sentence.',
  );
  await page.click('#sendBtn');

  console.log('Waiting for model response to stream in real-time...');
  await page.waitForSelector('.bubble-bot .bot-stream-text', { timeout: 25000 });

  // Poll until stream completes (send button enabled again)
  await page.waitForFunction(
    () => {
      const btn = document.getElementById('sendBtn');
      return btn && !btn.disabled && btn.innerText === '↑';
    },
    { timeout: 45000 },
  );

  const botResponses = await page.locator('.bubble-bot .bot-stream-text').allInnerTexts();
  const latestResponse = botResponses[botResponses.length - 1] || '';
  console.log(`✓ Bot response received (${latestResponse.length} chars):`);
  console.log(`   "${latestResponse.slice(0, 160)}..."`);

  if (!latestResponse || latestResponse.length < 10) {
    throw new Error('Bot response is empty or too short!');
  }

  // 6. Verify NO raw JSON leaks in response
  if (
    latestResponse.trim().startsWith('{"') ||
    latestResponse.trim().startsWith('```json\n{"tool"')
  ) {
    throw new Error(`Raw tool JSON leaked directly to user! Response: ${latestResponse}`);
  }
  console.log('✓ Zero raw JSON leaks: response formatted cleanly for user.');

  // 7. Verify NO Canned/Hardcoded Action Studio cards on normal query
  const cannedCards = await page.evaluate(() => {
    const bubbles = document.querySelectorAll('.bubble-bot');
    const lastBubble = bubbles[bubbles.length - 1];
    if (!lastBubble) return { hasCannedSliders: false, hasCannedDeck: false };
    const hasCannedSliders = !!lastBubble.querySelector(
      '#tone-sl, [id^="tone-sl-"], [id^="verif-sl-"]',
    );
    const hasCannedDeck = !!lastBubble.querySelector('.gen-ui-deck-container');
    return { hasCannedSliders, hasCannedDeck };
  });

  console.log(
    `✓ Canned elements check: Sliders=${cannedCards.hasCannedSliders}, Deck=${cannedCards.hasCannedDeck}`,
  );
  if (cannedCards.hasCannedSliders) {
    throw new Error(
      'Hardcoded sliders (Formality & Rigor, Verification Rigor 100%) still rendered on normal query!',
    );
  }
  if (cannedCards.hasCannedDeck) {
    throw new Error('Forced 5-card deck suite still rendered on normal conversational query!');
  }
  console.log('✓ Clean AI response verified: Zero canned cards, zero fake sliders!');

  // Capture verification screenshot
  const screenshotPath = path.resolve(
    'workspace',
    'screenshots',
    'supergence-workbench-verified.png',
  );
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\n✓ Verification screenshot captured at: ${screenshotPath}`);

  await browser.close();
  console.log('\n================================================================');
  console.log('🎉 ALL PLAYWRIGHT BROWSER VERIFICATIONS PASSED SUCCESSFULLY (100%)!');
  console.log('================================================================');
}

verifyWorkbench().catch((err) => {
  console.error('\n❌ Verification failed:', err);
  process.exit(1);
});
