import { chromium } from 'playwright-core';
import path from 'path';
import fs from 'fs';
import os from 'os';

async function run() {
  console.log('🚀 Running E2E verification for dynamic human browser search & click...');

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

  const executablePath = chromePaths.find((p) => fs.existsSync(p));
  console.log('Using executablePath:', executablePath || 'channel: chrome');

  const browser = await chromium.launch({
    headless: true,
    executablePath,
    channel: executablePath ? undefined : 'chrome',
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    const text = msg.text();
    if (
      text.includes('[AgentBrowserManager]') ||
      text.includes('Omnibox') ||
      text.includes('search')
    ) {
      console.log(`[Browser Console]: ${text}`);
    }
  });

  console.log('1. Navigating to http://127.0.0.1:3008/workbench...');
  await page.goto('http://127.0.0.1:3008/workbench', {
    waitUntil: 'domcontentloaded',
    timeout: 35000,
  });
  await page.waitForTimeout(3000);

  // Switch to personal browser panel if tab exists
  try {
    const browserTab = page
      .locator(
        'button:has-text("Browser"), [data-tab="browser"], button:has-text("Personal Browser")',
      )
      .first();
    if (await browserTab.isVisible({ timeout: 2000 })) {
      await browserTab.click();
      console.log('Switched to Personal Browser view');
    }
  } catch (_) {}

  // Enter the exact user query that was showing the issue:
  const query = 'Can you search silisleek in your browser and open the first link?';
  console.log(`2. Typing query into chat input: "${query}"`);
  const chatInput = page.locator('#chatInput');
  await chatInput.fill(query);
  await page.waitForTimeout(500);

  console.log('3. Submitting message...');
  await page.click('#sendBtn');

  // Monitor chat and omnibox for progress
  console.log('4. Waiting for browser execution and link click...');
  let fullResponseText = '';
  const startTime = Date.now();
  const maxWait = 95000; // 95s

  while (Date.now() - startTime < maxWait) {
    const assistantBubbles = await page
      .locator('.bubble-bot, .bot-stream-text, .chat-row.bot, .chat-message.assistant')
      .allInnerTexts();
    fullResponseText = assistantBubbles.join('\n');

    // Check if progress or summary is present
    if (
      fullResponseText.includes('silisleek') ||
      fullResponseText.includes('Sleek') ||
      fullResponseText.includes('DuckDuckGo')
    ) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`[${elapsed}s] Detected browser search activity...`);
    }

    if (
      fullResponseText.includes('Summary') ||
      fullResponseText.includes('silisleek.com') ||
      fullResponseText.includes('Beyond Ordinary Minds') ||
      fullResponseText.includes('CLICK_SEARCH_RESULT')
    ) {
      console.log('🎯 Destination navigation reached and summarized!');
      break;
    }

    await page.waitForTimeout(2000);
  }

  // Ensure screenshot directory exists
  const ssDir = path.resolve('tests/screenshots');
  if (!fs.existsSync(ssDir)) fs.mkdirSync(ssDir, { recursive: true });
  const ssPath = path.join(ssDir, 'search_click_human_verified.png');
  await page.screenshot({ path: ssPath, fullPage: true });
  console.log(`📸 Saved screenshot to: ${ssPath}`);

  console.log('\n--- Full Response Captured in Workbench ---');
  console.log(fullResponseText);
  console.log('-------------------------------------------\n');

  // Omnibox URL check in DOM if element exists
  let omniboxValue = '';
  try {
    const omnibox = page
      .locator('#browserOmnibox, input.omnibox-input, [data-testid="omnibox"]')
      .first();
    if (await omnibox.isVisible({ timeout: 1000 })) {
      omniboxValue = await omnibox.inputValue();
      console.log('Workbench Omnibox value:', omniboxValue);
    }
  } catch (_) {}

  await browser.close();

  // Verification checks:
  // 1. Must NOT contain conversational filler in search query
  if (
    fullResponseText.includes('q=Can%20you%20search') ||
    fullResponseText.includes('q=Can+you+search')
  ) {
    throw new Error('FAILURE: Hardcoded conversational query detected in DuckDuckGo URL!');
  }

  // 2. Must contain the clean search query
  const cleanSearchUsed = fullResponseText.includes('silisleek');
  if (!cleanSearchUsed) {
    throw new Error('FAILURE: Clean search query "silisleek" was not found in response!');
  }

  // 3. Must have clicked the first organic search result and opened silisleek.com
  const openedDestination =
    fullResponseText.includes('silisleek.com') ||
    fullResponseText.includes('Beyond Ordinary Minds') ||
    fullResponseText.includes('CLICK_SEARCH_RESULT');
  if (!openedDestination) {
    throw new Error('FAILURE: Did not navigate to destination search result (silisleek.com)!');
  }

  console.log(
    '✅ SUCCESS: Verified clean search query extraction (no conversational filler) and human-like click of first search result leading to target site!',
  );
}

run().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
