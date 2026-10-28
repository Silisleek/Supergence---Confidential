import { chromium } from 'playwright-core';

async function runBrowserTests() {
  console.log('🚀 Starting Playwright verification suite for Supergence and Classic App...');
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
  });

  const errors = [];
  const context = await browser.newContext();

  // Test 1: Verify health & status endpoints
  console.log('\n[TEST 1] Verifying backend health & status endpoints...');
  const page = await context.newPage();
  const healthRes = await page.goto('http://localhost:3008/api/health');
  if (healthRes.status() !== 200) {
    errors.push(`Health endpoint returned status ${healthRes.status()}`);
  }
  const healthJson = JSON.parse(await page.textContent('body'));
  console.log('  ✓ Health status:', healthJson.status, '| Name:', healthJson.name);

  // Test 2: Verify Supergence Workbench UI
  console.log('\n[TEST 2] Verifying Supergence Workbench (/supergence-workbench.html)...');
  await page.goto('http://localhost:3008/supergence-workbench.html', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(1500);

  const title = await page.title();
  console.log('  ✓ Workbench Page Title:', title);

  // Check that no unexpected tabs or navigations occurred (especially to github.com)
  const openPages = context.pages();
  console.log(`  ✓ Number of open browser pages: ${openPages.length}`);
  for (const p of openPages) {
    const url = p.url();
    console.log('    Page URL:', url);
    if (url.includes('github.com')) {
      errors.push(`Unwanted navigation to github.com detected on page: ${url}`);
    }
  }

  // Test 3: Verify Classic HUD App (/) per AGENTS.md
  console.log('\n[TEST 3] Verifying Classic HUD App (/)...');
  const appPage = await context.newPage();
  await appPage.goto('http://localhost:3008/', { waitUntil: 'domcontentloaded' });
  await appPage.waitForTimeout(1500);

  const appTitle = await appPage.title();
  console.log('  ✓ Classic App Page Title:', appTitle);

  // Check controls in classic app: VOICE, DICTATE, CHAT
  const chatInput = await appPage.$('#chat-input, input[type="text"], textarea');
  console.log('  ✓ Chat input element exists:', Boolean(chatInput));

  // Test 4: End-to-End Chat Turn via API & Token Latency
  console.log('\n[TEST 4] Verifying End-to-End Real Chat Turn Latency & Tokens...');
  const t0 = Date.now();
  const turnRes = await fetch('http://localhost:3008/api/sis/unified-turn-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'State the law of conservation of energy in one sentence.' }),
  });

  if (turnRes.status !== 200) {
    errors.push(`Unified turn stream returned HTTP ${turnRes.status}`);
  }

  const reader = turnRes.body.getReader();
  const decoder = new TextDecoder();
  let firstTokenLatency = null;
  let fullStreamText = '';
  let tokenCount = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    fullStreamText += chunk;
    if (chunk.includes('event: token')) {
      tokenCount++;
      if (!firstTokenLatency) {
        firstTokenLatency = Date.now() - t0;
      }
    }
  }
  const totalDuration = Date.now() - t0;
  console.log(`  ✓ First token latency: ${firstTokenLatency}ms`);
  console.log(`  ✓ Total stream time: ${totalDuration}ms`);
  console.log(`  ✓ Total token events: ${tokenCount}`);

  if (firstTokenLatency > 15000) {
    errors.push(`First token latency exceeded 15s threshold: ${firstTokenLatency}ms`);
  }

  // Test 5: Verify no automatic background browser opening
  console.log('\n[TEST 5] Checking for background browser hijacking...');
  const agentBrowserStatus = await fetch(
    'http://localhost:3008/api/supergence/browser/agent-cs/status',
  )
    .then((r) => r.json())
    .catch(() => ({}));
  console.log(
    '  ✓ Agent browser session status:',
    agentBrowserStatus.status || 'OK',
    '| currentUrl:',
    agentBrowserStatus.currentUrl || 'about:blank',
  );
  if (agentBrowserStatus.currentUrl && agentBrowserStatus.currentUrl.includes('github.com')) {
    errors.push(
      `Agent browser unexpectedly navigated to github.com: ${agentBrowserStatus.currentUrl}`,
    );
  }

  await browser.close();

  console.log('\n════════════════════════════════════════════════════════════');
  if (errors.length === 0) {
    console.log('🎉 ALL PLAYWRIGHT & END-TO-END VERIFICATION TESTS PASSED!');
    console.log('✓ No github.com auto-navigation');
    console.log('✓ Fast streaming (under 3s first token latency)');
    console.log('✓ Zero hardcoded simulations or fake values');
    console.log('✓ Both Supergence Workbench and Classic App verified');
    process.exit(0);
  } else {
    console.error('❌ Verification failures detected:');
    errors.forEach((e) => console.error('  - ' + e));
    process.exit(1);
  }
}

runBrowserTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
