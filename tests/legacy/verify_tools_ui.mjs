import { chromium } from 'playwright-core';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function verify() {
  console.log('Launching Chrome with Playwright...');
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1580, height: 950 },
  });
  const page = await context.newPage();

  page.on('console', (msg) => {
    console.log('[Browser]:', msg.type(), msg.text());
  });

  console.log('Navigating to http://localhost:3008/workbench ...');
  await page.goto('http://localhost:3008/workbench', { waitUntil: 'networkidle' });

  // 1. Verify 3-Column macOS Window and all dots visible
  console.log('Checking sidebar dots roster...');
  await page.waitForSelector('#dotsTotalCountBadge', { timeout: 10000 });
  const dotsBadge = await page.textContent('#dotsTotalCountBadge');
  console.log('Dots badge text:', dotsBadge);

  const dotItems = await page.$$('.dot-item');
  console.log(`Total dots rendered in sidebar: ${dotItems.length}`);
  if (dotItems.length < 5) throw new Error(`Expected at least 5 dots, found ${dotItems.length}`);

  // 2. Test Ada-SI Tool Synthesis & Streaming Output
  console.log('Sending message to trigger Ada-SI dynamic tool synthesis...');
  const chatInput = await page.$('#chatInput');
  await chatInput.fill("Calculate the SHA-256 hash of 'Supergence'");

  const sendBtn = await page.$('#sendBtn');
  await sendBtn.click();

  console.log('Waiting for Tool Call Cards to render in active chat stream...');
  await page.waitForSelector('.tool-call-card', { timeout: 45000 });
  console.log('✓ Tool Call Card appeared in chat!');

  // Wait for stream to complete (send button re-enabled)
  console.log('Waiting for token streaming and response completion...');
  await page.waitForFunction(
    () => {
      const btn = document.getElementById('sendBtn');
      return btn && !btn.disabled && btn.innerText === '↑';
    },
    undefined,
    { timeout: 120000 },
  );

  // Check generated tool cards
  const toolCards = await page.$$('.tool-call-card');
  console.log(`Rendered tool call cards in chat: ${toolCards.length}`);
  for (let i = 0; i < toolCards.length; i++) {
    const cardText = await toolCards[i].textContent();
    console.log(`Card ${i + 1}: ${cardText.replace(/\s+/g, ' ').slice(0, 120)}...`);
  }

  // Check the bot's streamed response
  const botRows = await page.$$('.chat-row.bot');
  const lastBotRow = botRows[botRows.length - 1];
  const responseText = await lastBotRow.textContent();
  console.log('\nFinal Bot Response in UI:\n', responseText.trim());

  if (responseText.includes('4c2dfb098660daf6817a58acb41eda0d32b1fa816ef05440756ab19b2333aa2d')) {
    console.log('✓ True SHA-256 hash verified in UI response!');
  }

  // 3. Switch to another dot (Nova-Dev / Coding specialist)
  console.log('Testing dot switching to Nova-Dev...');
  const novaDot = await page.$('.dot-item:nth-child(2)');
  if (novaDot) {
    await novaDot.click();
    await page.waitForTimeout(500);
    const headerName = await page.textContent('#headerDotName');
    console.log('Switched header to:', headerName);
  }

  // Switch back to Chief of Staff to view complete conversation with cards
  console.log('Switching back to Chief of Staff to view conversation cards...');
  const chiefDot = await page.$('.dot-item:nth-child(1)');
  if (chiefDot) {
    await chiefDot.click();
    await page.waitForTimeout(500);
  }

  // Take full verification screenshot
  const screenshotPath =
    'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\bb9a50ee-166f-4573-a1f6-3270c22c4aa9\\supergence_tools_streaming_verified.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`✓ Verification screenshot saved to ${screenshotPath}`);

  await browser.close();
  console.log('Browser test finished successfully!');
}

verify().catch((err) => {
  console.error('Playwright verification failed:', err);
  process.exit(1);
});
