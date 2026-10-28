import { chromium } from 'playwright-core';

async function verify() {
  const port = 3008;
  console.log(`\n--- STEP 1: Verifying Backend Multi-Agent Roster Response ---`);

  const testQuery = 'Tell me about all the agents here.';
  console.log(`Sending turn query: "${testQuery}"...`);
  const turnRes = await fetch(`http://localhost:${port}/api/sis/unified-turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: testQuery, history: [] }),
  });

  if (!turnRes.ok) {
    throw new Error(`Turn request failed: HTTP ${turnRes.status}`);
  }

  const data = await turnRes.json();
  const rawResp = data.response || '';
  const resp = rawResp.replace(/[\u2010\u2011\u2012\u2013\u2014]/g, '-');
  console.log(`\nResponse received (${resp.length} chars):`);
  console.log('--- RESPONSE PREVIEW ---');
  console.log(resp.slice(0, 500) + (resp.length > 500 ? '...' : ''));
  console.log('------------------------');

  // Assertions against wrong/monolithic answer
  if (
    resp.toLowerCase().includes('monolithic organism') ||
    resp.toLowerCase().includes('not a collection of separate agents') ||
    resp.toLowerCase().includes('these are not independent agents')
  ) {
    throw new Error('FAIL: Response still contains incorrect monolithic denial!');
  }
  console.log('✓ Verified: Zero "monolithic organism" denials found.');

  // Assertions for key agents
  const expectedAgents = [
    'Chief of Staff',
    'Bio-SIS',
    'Nova-Dev',
    'Astra-Logic',
    'Volt-Phys',
    'Synapse-AI',
    'Claw-Cybernetics',
  ];
  const foundAgents = expectedAgents.filter((a) => resp.includes(a));
  console.log(
    `✓ Identified Coworker Agents in response: ${foundAgents.join(', ')} (${foundAgents.length}/${expectedAgents.length})`,
  );
  if (foundAgents.length < 4) {
    throw new Error(
      `FAIL: Missing key agents from roster response. Found: ${foundAgents.join(', ')}`,
    );
  }

  console.log(`\n--- STEP 2: Verifying Browser Table Rendering in Supergence Workbench ---`);
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

  // Test in supergence-workbench.html
  console.log(`Navigating to http://localhost:${port}/supergence-workbench.html ...`);
  await page.goto(`http://localhost:${port}/supergence-workbench.html`, {
    waitUntil: 'domcontentloaded',
    timeout: 25000,
  });

  const inputSelector = '#chatInput';
  await page.waitForSelector(inputSelector, { timeout: 10000 });
  await page.fill(inputSelector, 'Tell me about all the agents here.');
  console.log('Submitting query in workbench...');
  await page.click('#sendBtn');

  console.log('Waiting for AI response stream and table render...');
  // Wait for table to render in chatStream
  await page.waitForSelector('#chatStream table', { timeout: 40000 });
  console.log('✓ Found <table> inside #chatStream!');
  await page.waitForTimeout(4000); // Allow stream completion

  const tableInfo = await page.evaluate(() => {
    const tables = document.querySelectorAll('#chatStream table');
    const firstTable = tables[0];
    if (!firstTable) return null;
    const headers = Array.from(firstTable.querySelectorAll('th')).map((th) => th.innerText.trim());
    const rowCount = firstTable.querySelectorAll('tbody tr').length;
    return {
      tableCount: tables.length,
      headers,
      rowCount,
    };
  });
  console.log('✓ Table Info:', JSON.stringify(tableInfo, null, 2));

  const hasBrokenPipes = await page.evaluate(() => {
    const text = document.querySelector('#chatStream')?.innerText || '';
    return text.includes('---|---|') || text.includes('|---|');
  });
  if (hasBrokenPipes) {
    throw new Error('FAIL: Unparsed raw table pipes detected in rendered page text!');
  }
  console.log('✓ Verified: No broken raw table pipes in rendered workbench text.');

  const screenshotPath =
    'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\bb9a50ee-166f-4573-a1f6-3270c22c4aa9\\agent_roster_answer_verified.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`✓ High-resolution screenshot captured to: ${screenshotPath}`);

  await browser.close();
  console.log('\n🎉 ALL AGENTS ANSWER AND TABLE RENDERING VERIFIED SUCCESSFULLY IN REAL CHROME!');
}

verify().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
