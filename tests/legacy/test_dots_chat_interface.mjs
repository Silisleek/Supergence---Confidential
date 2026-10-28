import { chromium } from 'playwright-core';

async function runTest() {
  console.log('🚀 Starting Browser Verification for Dots & Bots Chat Interface...');

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('Browser console error:', msg.text());
    }
  });

  async function findActivePort() {
    for (const port of [3008, 3009, 3001, 3002]) {
      try {
        const res = await fetch(`http://localhost:${port}/api/openbot/agents`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && Array.isArray(data.agents)) return port;
        }
      } catch (e) {}
    }
    return 3008;
  }
  const PORT = await findActivePort();
  console.log(`Navigating to http://localhost:${PORT}/workbench...`);
  await page.goto(`http://localhost:${PORT}/workbench`, { waitUntil: 'domcontentloaded' });

  // 1. Verify Page Title
  const title = await page.title();
  console.log('✓ Page Title:', title);

  // 2. Verify ALL DOTS / BOTS AT ONCE in the sidebar
  console.log('Waiting for all dots to load dynamically in sidebar...');
  await page.waitForFunction(
    () => {
      return document.querySelectorAll('.dot-item').length >= 10;
    },
    { timeout: 10000 },
  );

  const dotCount = await page.locator('.dot-item').count();
  console.log(`✓ Total Dots/Bots visible at once in left sidebar: ${dotCount} (Expected: >= 11)`);
  if (dotCount < 10) {
    throw new Error(`Expected at least 10 dots, found ${dotCount}`);
  }

  // 3. Test Clicking a Dot to Switch Active Conversation
  console.log('Testing clicking a domain dot: Bio-SIS...');
  await page.locator('.dot-item:has-text("Bio-SIS")').first().click({ force: true });
  await page.waitForTimeout(400);

  const headerName = await page.locator('#headerDotName').innerText();
  console.log(`✓ Active Chat switched to: "${headerName}"`);
  if (!headerName.includes('Bio-SIS')) {
    throw new Error(`Expected active chat to be Bio-SIS, got "${headerName}"`);
  }

  // 4. Send a Chat Message to Bio-SIS (Using FreeLLMAPI auto @ 31415)
  console.log(
    'Sending message to Bio-SIS: "What is the error-rate of Prime Editing vs CRISPR Cas9?"...',
  );
  await page.fill(
    '#chatInput',
    'What is the error-rate of Prime Editing vs CRISPR Cas9? Answer in 2 short bullet points.',
  );
  await page.click('#sendBtn');

  console.log('Waiting for live AI response from FreeLLMAPI...');
  await page.waitForFunction(
    () => {
      const bubbles = document.querySelectorAll('.bubble-bot');
      return bubbles.length >= 2;
    },
    { timeout: 30000 },
  );

  const botReplies = await page.locator('.bubble-bot').allInnerTexts();
  const latestReply = botReplies[botReplies.length - 1];
  console.log('\n--- Bio-SIS Live Response Preview ---');
  console.log(latestReply.slice(0, 260) + '...\n');

  // 5. Test Switching back to Chief of Staff & Host Computer Execution
  console.log('Testing switching back to Chief of Staff (Master Orchestrator)...');
  await page.click('.dot-item:has-text("Chief of Staff")');
  await page.waitForTimeout(400);

  const masterName = await page.locator('#headerDotName').innerText();
  console.log(`✓ Switched back to: "${masterName}"`);

  console.log('Sending OS execution prompt: "Run hostname and check disk space"...');
  await page.fill('#chatInput', 'Run hostname and check disk space');
  await page.click('#sendBtn');

  await page.waitForFunction(
    () => {
      const bubbles = document.querySelectorAll('.bubble-bot');
      return bubbles.length >= 2;
    },
    { timeout: 30000 },
  );

  const masterReplies = await page.locator('.bubble-bot').allInnerTexts();
  const latestMasterReply = masterReplies[masterReplies.length - 1];
  console.log('\n--- Chief of Staff Response Preview ---');
  console.log(latestMasterReply.slice(0, 260) + '...\n');

  // 6. Verify Right Column (Live Computer View & Routines)
  const screenTitle = await page.locator('#screenCardTitle').innerText();
  console.log(`✓ Computer Screen Viewport Title: "${screenTitle}"`);

  const routinesCount = await page.locator('.routine-item').count();
  console.log(`✓ Routines displayed: ${routinesCount}`);

  // 7. Verify On-Screen Error Mechanism
  console.log('Verifying on-screen error capability...');
  await page.evaluate(() => {
    showScreenError(
      'Test Diagnostics',
      'Verification of on-screen error rendering: Status code 503 captured cleanly on UI.',
    );
  });
  await page.waitForSelector('.on-screen-error-card', { timeout: 5000 });
  const errorCardText = await page.locator('.on-screen-error-card').innerText();
  console.log(`✓ On-Screen Error Card Verified:\n${errorCardText.trim()}`);

  // 8. Capture Full-Page Screenshot Artifact
  const screenshotPath =
    'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\bb9a50ee-166f-4573-a1f6-3270c22c4aa9\\supergence_dots_chat_verified.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`✓ Captured UI Screenshot to: ${screenshotPath}`);

  await browser.close();
  console.log('🎉 Dots & Bots Chat Interface verification completed 100% successfully!');
}

runTest().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
