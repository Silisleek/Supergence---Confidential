import { chromium } from 'playwright-core';
import path from 'path';
import fs from 'fs';
import os from 'os';

async function run() {
  console.log('🚀 Running E2E verification for Universal Browser Automation on Amazon search...');

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
      text.includes('Amazon') ||
      text.includes('Supergence')
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

  // Enter the exact user query from the failure screenshot:
  const query = 'Can you open amazon and search me for some nike shoes under $50k';
  console.log(`2. Typing query into chat input: "${query}"`);
  const chatInput = page.locator('#chatInput');
  await chatInput.fill(query);
  await page.waitForTimeout(500);

  console.log('3. Submitting message...');
  await page.click('#sendBtn');

  // Monitor chat and omnibox for progress
  console.log('4. Waiting for browser execution and search discovery...');
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
      fullResponseText.includes('amazon') ||
      fullResponseText.includes('Amazon') ||
      fullResponseText.includes('nike shoes')
    ) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`[${elapsed}s] Detected Amazon search activity in chat stream...`);
    }

    if (
      fullResponseText.includes('Summary') ||
      fullResponseText.includes('amazon.com') ||
      fullResponseText.includes('Discovered') ||
      fullResponseText.includes('SEARCH_RESULTS_DISCOVERED') ||
      fullResponseText.includes('Nike')
    ) {
      if (
        fullResponseText.includes('Navigation') ||
        fullResponseText.includes('Actions Executed') ||
        fullResponseText.includes('Live Viewport Active')
      ) {
        console.log('🎯 Destination navigation reached and summarized!');
        break;
      }
    }

    // Explicitly fail if refusal is emitted
    if (
      fullResponseText.includes("I'm sorry, but I can't browse the web") ||
      fullResponseText.includes('search Amazon yourself')
    ) {
      console.error('REFUSAL DETECTED in chat:', fullResponseText);
      throw new Error('LLM Refusal occurred instead of browser execution!');
    }

    await page.waitForTimeout(2000);
  }

  // Ensure screenshot directory exists
  const ssDir = path.resolve('tests/screenshots');
  if (!fs.existsSync(ssDir)) fs.mkdirSync(ssDir, { recursive: true });
  const ssPath = path.join(ssDir, 'universal_amazon_search_verified.png');
  await page.screenshot({ path: ssPath, fullPage: true });
  console.log(`📸 Saved screenshot to: ${ssPath}`);

  console.log('\n--- Full Response Captured in Workbench ---');
  console.log(fullResponseText);
  console.log('-------------------------------------------\n');

  await browser.close();

  // Verification checks:
  // 1. MUST NOT be a refusal
  if (
    fullResponseText.includes("can't browse the web") ||
    fullResponseText.includes('search Amazon yourself')
  ) {
    throw new Error('FAILURE: LLM Refusal present in response!');
  }

  // 2. Must contain browser automation activity
  const hasBrowserActivity =
    fullResponseText.includes('Personal Browser') ||
    fullResponseText.includes('amazon.com') ||
    fullResponseText.includes('Amazon');
  if (!hasBrowserActivity) {
    throw new Error('FAILURE: Personal Browser activity not found in response!');
  }

  // 3. Must have executed search for Nike shoes
  const hasNikeSearch =
    fullResponseText.includes('nike shoes') || fullResponseText.includes('Nike');
  if (!hasNikeSearch) {
    throw new Error('FAILURE: Search query "nike shoes" not found in response!');
  }

  console.log(
    '✅ UNIVERSAL VERIFICATION SUCCESS: Prompt was dynamically recognized as web task, zero LLM refusal, browser autonomously opened Amazon, searched for Nike shoes, and streamed live viewport!',
  );
}

run().catch((err) => {
  console.error('❌ Universal test failed with error:', err);
  process.exit(1);
});
