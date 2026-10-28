// Verification script for login reply fix
import { chromium } from 'playwright-core';
import path from 'path';
import fs from 'fs';
import os from 'os';

async function run() {
  console.log('🚀 Running E2E verification for login reply fix...');

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

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log(`[Browser Console Error]: ${msg.text()}`);
    }
  });

  console.log('1. Navigating to http://127.0.0.1:3008/workbench...');
  await page.goto('http://127.0.0.1:3008/workbench', {
    waitUntil: 'domcontentloaded',
    timeout: 35000,
  });
  await page.waitForTimeout(3000);

  // Check for 404 console errors on /api/survival/metrics and /api/openclaw/desktop-screenshot
  const has404Metrics = consoleErrors.some(
    (e) => e.includes('/api/survival/metrics') && e.includes('404'),
  );
  const has404Screenshot = consoleErrors.some(
    (e) => e.includes('/api/openclaw/desktop-screenshot') && e.includes('404'),
  );
  console.log(
    `2. Endpoint checks: 404 /api/survival/metrics: ${has404Metrics}, 404 /api/openclaw/desktop-screenshot: ${has404Screenshot}`,
  );

  if (has404Metrics || has404Screenshot) {
    throw new Error('Endpoints still return 404 in browser console!');
  }

  // Type the user query into the chat input
  const query =
    'Can you go to sleek.silisleek.com and login with silisleek@gmail.com and pass helloworld9956327?';
  console.log('3. Typing query into chat input...');
  const chatInput = page.locator('#chatInput');
  await chatInput.fill(query);
  await page.waitForTimeout(500);

  console.log('4. Submitting message...');
  await page.click('#sendBtn');

  // Poll for assistant bubble response in the chatStream
  console.log('5. Waiting for streaming response...');
  let fullResponseText = '';
  const startTime = Date.now();
  const maxWait = 90000; // 90 seconds max for full browser execution

  while (Date.now() - startTime < maxWait) {
    const assistantBubbles = await page
      .locator('.bubble-bot, .bot-stream-text, .chat-row.bot')
      .allInnerTexts();
    fullResponseText = assistantBubbles.join('\n');

    if (
      fullResponseText.includes('Personal Browser') ||
      fullResponseText.includes('Navigation') ||
      fullResponseText.includes('sleek.silisleek.com') ||
      fullResponseText.includes('Automation Active')
    ) {
      console.log(
        `[Progress detected at ${Math.round((Date.now() - startTime) / 1000)}s]: Found browser activity in chat!`,
      );
      if (
        fullResponseText.includes('Summary') ||
        fullResponseText.includes('Complete') ||
        fullResponseText.includes('Submitted') ||
        fullResponseText.includes('Vision')
      ) {
        console.log('Final summary detected in chat response!');
        break;
      }
    }

    if (
      fullResponseText.includes("I'm sorry, but I can't help with that") ||
      fullResponseText.includes('cannot assist with')
    ) {
      console.error('REFUSAL DETECTED in chat:', fullResponseText);
      throw new Error('LLM Refusal occurred instead of browser execution!');
    }

    await page.waitForTimeout(2000);
  }

  console.log('\n--- Full Captured Response in Workbench Chat ---');
  console.log(fullResponseText);
  console.log('------------------------------------------------\n');

  // Assertions
  if (fullResponseText.includes("I'm sorry, but I can't help with that")) {
    throw new Error('Failed: LLM Refusal is present in chat!');
  }

  if (
    !fullResponseText.includes('Personal Browser') &&
    !fullResponseText.includes('sleek.silisleek.com')
  ) {
    throw new Error('Failed: Expected browser activity not found in response!');
  }

  // Take screenshot
  const screenshotDir = path.join(process.cwd(), 'tests', 'screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
  const screenshotPath = path.join(screenshotDir, 'workbench-login-verified.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`📸 Saved screenshot to: ${screenshotPath}`);

  await browser.close();
  console.log('✅ ALL E2E VERIFICATIONS PASSED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
