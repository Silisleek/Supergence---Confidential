import { chromium } from 'playwright-core';

async function run() {
  console.log('[Test] Launching Chrome...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('[Test] Navigating to http://localhost:3008/supergence-workbench.html...');
  await page.goto('http://localhost:3008/supergence-workbench.html', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  // Wait for roster list to render
  await page.waitForSelector('#dotsRosterList .dot-item', { timeout: 15000 });
  console.log('[Test] Roster items rendered.');

  // 1. Verify Sidebar Text
  const sectionTitle = await page.locator('.roster-section-title').innerText();
  console.log('[Test] Section title text:', sectionTitle.replace(/\n/g, ' '));
  if (sectionTitle.includes('Coworker Dots')) {
    throw new Error('FAILED: Section title still contains "Coworker Dots"');
  }
  if (!sectionTitle.toLowerCase().includes('specialist agents')) {
    throw new Error('FAILED: Section title does not contain "Specialist Agents"');
  }

  const searchPlaceholder = await page.locator('#rosterSearch').getAttribute('placeholder');
  console.log('[Test] Search placeholder:', searchPlaceholder);
  if (searchPlaceholder.includes('dots')) {
    throw new Error('FAILED: Search placeholder still contains "dots"');
  }

  // Extract rendered roster cards
  const agentNames = await page.$$eval('#dotsRosterList .dot-item .dot-name', (els) =>
    els.map((e) => e.innerText.trim()),
  );
  console.log('[Test] Rendered agent names:', agentNames);

  const expectedNames = [
    'Chief of Staff',
    'Bio-SIS',
    'Nova-Dev',
    'Astra-Logic',
    'Volt-Phys',
    'Synapse-AI',
  ];
  for (const exp of expectedNames) {
    if (!agentNames.some((n) => n.includes(exp))) {
      throw new Error(
        `FAILED: Expected agent "${exp}" not found in roster! Found: ${agentNames.join(', ')}`,
      );
    }
  }

  // 2. Test Chat query
  console.log(
    '[Test] Submitting chat query: "List the specialist agents in Supergence and what each does."',
  );
  const chatInput = page.locator('#chatInput');
  await chatInput.fill('List the specialist agents in Supergence and what each does.');
  await page.click('#sendBtn');

  // Wait for assistant response to finish streaming (sendBtn re-enabled and text present)
  console.log('[Test] Waiting for assistant response...');
  await page.waitForFunction(
    () => {
      const btn = document.querySelector('#sendBtn');
      const texts = document.querySelectorAll('.bot-stream-text');
      if (!texts || texts.length === 0) return false;
      const last = texts[texts.length - 1];
      return btn && !btn.disabled && last && last.innerText.length > 50;
    },
    { timeout: 60000 },
  );

  const lastMsgText = await page.locator('.bot-stream-text').last().innerText();
  console.log('[Test] Assistant response preview (first 400 chars):');
  console.log(lastMsgText.slice(0, 400));

  // Verify proper agent naming and absence of "dots"
  const lowerMsg = lastMsgText.toLowerCase();
  const hasDotsAsAgents =
    lowerMsg.includes('coworker dot') ||
    lowerMsg.includes('expert dot') ||
    lowerMsg.includes('domain dot') ||
    lowerMsg.includes('11 dots') ||
    lowerMsg.includes('the dots');
  if (hasDotsAsAgents) {
    throw new Error('FAILED: Assistant response refers to agents as dots: ' + lastMsgText);
  }

  const mentionsAgents =
    lastMsgText.includes('Bio-SIS') ||
    lastMsgText.includes('Nova-Dev') ||
    lastMsgText.includes('Chief of Staff') ||
    lastMsgText.includes('Astra-Logic');
  if (!mentionsAgents) {
    throw new Error('FAILED: Assistant response did not name the specialist agents properly');
  }

  console.log('[Test] PASSED! Agents are properly titled and named with zero "dots" jargon.');

  // Take screenshot
  const screenshotPath =
    'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\bb9a50ee-166f-4573-a1f6-3270c22c4aa9\\agent_names_no_dots_verified.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('[Test] Screenshot saved to', screenshotPath);

  await browser.close();
}

run().catch((err) => {
  console.error('[Test Error]', err);
  process.exit(1);
});
