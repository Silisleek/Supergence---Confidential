import { chromium } from 'playwright-core';

async function verify() {
  const port = 3008;
  console.log(`\n--- STEP 1: Verifying Backend Turn Response Without Error Notices ---`);

  const testQueries = [
    'Explain quantum computing state space and artifacts',
    'Design a real-time high speed distributed caching protocol',
  ];

  for (const q of testQueries) {
    console.log(`Sending turn query: "${q}"...`);
    const turnRes = await fetch(`http://localhost:${port}/api/sis/unified-turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q, history: [] }),
    });

    if (!turnRes.ok) {
      throw new Error(`Turn request failed: HTTP ${turnRes.status}`);
    }

    const data = await turnRes.json();
    console.log(`Response received (length ${data.response?.length || 0} chars):`);
    console.log(`Preview: "${(data.response || '').slice(0, 150)}..."`);

    // Verify response does NOT contain the model unavailable notice
    if (
      data.response &&
      (data.response.includes('Model is unavailable') ||
        data.response.includes('400 Upstream request failed'))
    ) {
      throw new Error(`Response contains forbidden error notice: ${data.response}`);
    }
    console.log('✓ Verified: No "Model is unavailable" error notice in response!');
    console.log('✓ Interactive UI Present:', !!data.interactiveUI);
    console.log('✓ Cards Count:', data.interactiveUI?.cards?.length || 0);
  }

  console.log(`\n--- STEP 2: Verifying Real Chrome Browser Chat UI Rendering ---`);
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  console.log(`Navigating to http://localhost:${port}/ ...`);
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 25000 });

  const inputSelector = '#chatInput';
  await page.waitForSelector(inputSelector, { timeout: 10000 });
  await page.fill(inputSelector, 'Design a real-time high speed distributed caching protocol');
  console.log('Submitting prompt to Supergence stream...');
  await page.click('#sendBtn');

  console.log('Waiting for synthesis bubble in chat stream...');
  await page.waitForSelector('.gen-ui-deck-container', { timeout: 45000 });
  console.log('✓ Found .gen-ui-deck-container in chat stream!');

  // Check the text of the chat messages to make sure no 400 error notice is displayed
  const chatText = await page.evaluate(() => {
    const bubbles = document.querySelectorAll(
      '.chat-bubble-ai, .chat-message-ai, .response-body-markdown, .chat-msg',
    );
    return Array.from(bubbles)
      .map((b) => b.textContent)
      .join('\n');
  });

  if (
    chatText.includes('Model is unavailable') ||
    chatText.includes('400 Upstream request failed')
  ) {
    throw new Error('Chat UI still contains "Model is unavailable" notice!');
  }
  console.log('✓ Verified: Zero error notices in Chrome chat UI!');

  const screenshotPath =
    'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\bb9a50ee-166f-4573-a1f6-3270c22c4aa9\\model_unavailable_error_fixed_verified.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`✓ High-resolution screenshot captured to: ${screenshotPath}`);

  await browser.close();
  console.log('\n🎉 MODEL UNAVAILABLE ERROR DEFINITIVELY FIXED AND VERIFIED!');
}

verify().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
