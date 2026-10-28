import { chromium } from 'playwright-core';

async function verifySupergenceSelfKnowledge() {
  const port = 3008;
  console.log(`\n--- STEP 1: Verifying Backend Supergence Self-Knowledge Turn ---`);

  const query = 'What is Supergence and how does it work?';
  console.log(`Sending query: "${query}"...`);
  const res = await fetch(`http://localhost:${port}/api/sis/unified-turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, history: [] }),
  });

  if (!res.ok) {
    throw new Error(`Turn request failed: HTTP ${res.status}`);
  }

  const data = await res.json();
  const rawResp = data.response || '';
  const resp = rawResp.replace(/[\u2010\u2011\u2012\u2013\u2014]/g, '-');
  console.log(`\nResponse received (${resp.length} characters):`);
  console.log('--- RESPONSE PREVIEW ---');
  console.log(resp.slice(0, 600) + '...\n------------------------');

  // Assertions for deep self-knowledge
  const lower = resp.toLowerCase();

  // Must know it is Supergence / SIS
  if (!lower.includes('supergence')) {
    throw new Error('FAIL: Response does not mention Supergence!');
  }
  console.log('✓ Verified: Mentions Supergence identity.');

  // Zero monolithic denial
  if (
    lower.includes('monolithic organism') ||
    lower.includes('not a collection of separate agents')
  ) {
    throw new Error('FAIL: Response contains forbidden monolithic denial!');
  }
  console.log('✓ Verified: Zero monolithic organism denials.');

  // Mentions Chief of Staff and key coworker agents
  const expectedAgents = [
    'Chief of Staff',
    'Bio-SIS',
    'Nova-Dev',
    'Astra-Logic',
    'Claw-Cybernetics',
  ];
  const foundAgents = expectedAgents.filter((a) => resp.includes(a));
  console.log(
    `✓ Mentioned Coworker Dots: ${foundAgents.join(', ')} (${foundAgents.length}/${expectedAgents.length})`,
  );
  if (foundAgents.length < 3) {
    throw new Error(`FAIL: Too few coworker agents mentioned. Found: ${foundAgents.join(', ')}`);
  }

  // Mentions core faculties / subsystems (Hermes, Ada-SI, OpenClaw, or RSI)
  const expectedSubsystems = ['Hermes', 'Ada-SI', 'OpenClaw', 'RSI'];
  const foundSubsystems = expectedSubsystems.filter(
    (s) => resp.includes(s) || lower.includes(s.toLowerCase()),
  );
  console.log(
    `✓ Mentioned Cognitive Faculties: ${foundSubsystems.join(', ')} (${foundSubsystems.length}/${expectedSubsystems.length})`,
  );
  if (foundSubsystems.length < 2) {
    throw new Error(`FAIL: Too few subsystems mentioned. Found: ${foundSubsystems.join(', ')}`);
  }

  console.log(`\n--- STEP 2: Verifying Browser Rendering in Chrome ---`);
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 25000 });

  const inputSelector = '#chatInput';
  await page.waitForSelector(inputSelector, { timeout: 10000 });
  await page.fill(inputSelector, 'What is Supergence and how does it work?');

  console.log('Submitting prompt in Chrome UI...');
  await page.click('#sendBtn');

  console.log('Waiting for AI response stream...');
  await page.waitForSelector(
    '#chatStream table, #chatStream .bot-message-row, #chatStream .chat-msg-bot',
    { timeout: 45000 },
  );
  await page.waitForTimeout(5000); // Allow full streaming completion

  const pageInfo = await page.evaluate(() => {
    const stream = document.querySelector('#chatStream');
    const text = stream ? stream.innerText : '';
    const tables = stream ? stream.querySelectorAll('table') : [];
    return {
      hasText: text.length > 100,
      textLength: text.length,
      tableCount: tables.length,
      hasBrokenPipes: text.includes('---|---|') || text.includes('|---|'),
    };
  });

  console.log('✓ Browser Page Info:', JSON.stringify(pageInfo, null, 2));

  if (pageInfo.hasBrokenPipes) {
    throw new Error('FAIL: Unparsed raw table pipes detected in browser page text!');
  }
  console.log('✓ Verified: Clean formatting without broken pipe markup.');

  const screenshotPath =
    'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\bb9a50ee-166f-4573-a1f6-3270c22c4aa9\\supergence_self_knowledge_verified.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`✓ High-resolution screenshot captured to: ${screenshotPath}`);

  await browser.close();
  console.log('\n🎉 SUPERGENCE COMPREHENSIVE SELF-KNOWLEDGE VERIFIED SUCCESSFULLY!');
}

verifySupergenceSelfKnowledge().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
