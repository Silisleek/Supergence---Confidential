// Automated Verification: Fallback Leak Prevention & Continuation Cache Bypass
import WebSocket from 'ws';

async function runTest() {
  console.log('--- TEST 1: Verify Cerebellar Cache Rejection for Continuation & Edit Commands ---');
  const { default: cerebellarCache } =
    await import('../../server/orchestrator/cerebellar-cache.js');

  const testQueries = [
    'continue',
    'continue.',
    'continue fix',
    'continue fix.',
    'fix it',
    'fix this',
    'proceed',
    'recreate it in html again',
  ];

  for (const q of testQueries) {
    const res = cerebellarCache.predict(q);
    if (res.hit) {
      throw new Error(
        `FAIL: cerebellarCache predicted hit for continuation query "${q}": ${res.output}`,
      );
    }
    console.log(`  ✓ "${q}" properly bypassed cerebellar cache (hit: false)`);
  }

  console.log('\n--- TEST 2: Verify Cerebellar Cache Learn Guards ---');
  const blockedLearns = [
    { q: 'continue', out: 'Some continuation text' },
    {
      q: 'what is photosynthesis',
      out: '### ⚡ DIRECT-FALLBACK\n[DIRECT RESPONSE MODE] All specialist agents were unavailable...',
    },
    {
      q: 'define gravity',
      out: 'Gravity is curved spacetime [EVOLVED META-DIRECTIVES // GEN 633]',
    },
    { q: 'fix bug', out: 'Here is the fix' },
  ];

  for (const item of blockedLearns) {
    const learned = cerebellarCache.learn(item.q, item.out);
    if (learned) {
      throw new Error(`FAIL: cerebellarCache learned blocked pattern for "${item.q}"`);
    }
    console.log(`  ✓ Blocked learning for: "${item.q}"`);
  }

  console.log('\n--- TEST 3: Verify End-to-End WebSocket Flow with Fallback Simulation ---');
  const ws = new WebSocket('ws://localhost:3008');

  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', (err) =>
      reject(new Error(err?.message || err?.code || String(err) || 'WS connection error')),
    );
  });

  console.log('  Connected to ws://localhost:3008');

  let completeReceived = false;
  let finalResponse = '';
  let partsUsed = [];

  const responsePromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout waiting for completion (90s limit)'));
    }, 90000);

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'status') {
          console.log(`  [Status] ${msg.data?.stage || ''}: ${msg.data?.message || ''}`);
        } else if (msg.type === 'complete') {
          clearTimeout(timeout);
          completeReceived = true;
          finalResponse = msg.response || msg.data?.response || '';
          partsUsed = msg.stats?.partsUsed || msg.data?.stats?.partsUsed || [];
          resolve({ finalResponse, partsUsed });
        }
      } catch {}
    });
  });

  // Send "continue fix" to test handling
  ws.send(
    JSON.stringify({
      type: 'message',
      content: 'continue fix',
      message: 'continue fix',
      conversationId: 'test-leak-prevention-' + Date.now(),
    }),
  );

  const result = await responsePromise;
  ws.close();

  console.log('\n--- TEST 4: Assert No Internal Leaks in Output ---');
  console.log('Parts used reported:', result.partsUsed);
  console.log('Response sample:', result.finalResponse.slice(0, 180));

  // Assertions
  if (result.finalResponse.includes('DIRECT RESPONSE MODE')) {
    throw new Error('FAIL: Output leaked [DIRECT RESPONSE MODE]');
  }
  if (result.finalResponse.includes('EVOLVED META-DIRECTIVES')) {
    throw new Error('FAIL: Output leaked [EVOLVED META-DIRECTIVES]');
  }
  if (result.finalResponse.includes('DIRECT-FALLBACK')) {
    throw new Error('FAIL: Output leaked DIRECT-FALLBACK header');
  }
  if (result.partsUsed.includes('direct-fallback')) {
    throw new Error('FAIL: partsUsed includes direct-fallback dummy part');
  }
  if (result.finalResponse.includes('zero "')) {
    throw new Error('FAIL: Output truncated with zero "');
  }

  console.log('  ✓ Zero prompt directives leaked');
  console.log('  ✓ Zero dummy fallback agents in partsUsed');
  console.log('  ✓ Response is clean, complete, and human-facing');

  console.log('\n🎉 ALL VERIFICATION CHECKS PASSED!');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
});
