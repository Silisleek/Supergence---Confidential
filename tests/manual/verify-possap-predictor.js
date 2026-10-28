// Test suite: POSSAP Predictive Engine Verification
import possap from '../../server/possap/index.js';

async function runTests() {
  console.log('===============================================================');
  console.log('         VERIFYING POSSAP PREDICTIVE ENGINE (24/7)             ');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
    }
  }

  // ── TEST 1: Baseline Seed Predictions on Engine Startup ──
  console.log('[Test 1] Baseline Seed Predictions Available from Moment Zero...');
  const initial = possap.getLatestPredictions();

  assert(
    initial && Array.isArray(initial.user) && initial.user.length >= 3,
    `Initial user predictions available (${initial.user.length} items)`,
  );
  assert(
    initial && Array.isArray(initial.ai) && initial.ai.length >= 3,
    `Initial AI preparedness predictions available (${initial.ai.length} items)`,
  );
  assert(
    initial.user[0].confidence > 0.5,
    `User prediction has valid confidence (${initial.user[0].confidence})`,
  );
  assert(
    initial.ai[0].confidence > 0.5,
    `AI prediction has valid confidence (${initial.ai[0].confidence})`,
  );

  // ── TEST 2: Reactive Prediction on 3D Simulation Query ──
  console.log('\n[Test 2] Reactive Prediction on 3D Simulation Request...');
  possap.recordInteraction(
    'Can you create an ironman 3D flying simulation with glowing repulsors?',
    'Certainly, generating a procedural Three.js scene with articulated limbs.',
  );

  const pred3d = possap.getLatestPredictions();
  assert(pred3d && pred3d.user.length > 0, `Generated user predictions on 1st interaction`);
  const is3dAware = pred3d.user.some(
    (p) =>
      /3d|scene|render|blender|camera|texture|mesh/i.test(p.prediction) ||
      p.category?.includes('3d'),
  );
  assert(
    is3dAware,
    `User prediction accurately anticipates 3D follow-up actions: "${pred3d.user[0].prediction}"`,
  );
  assert(
    pred3d.ai.some(
      (p) =>
        /three\.?js|shader|webgl|render|blender/i.test(p.prediction) || p.category?.includes('3d'),
    ),
    `AI prepared for 3D shaders and rendering: "${pred3d.ai[0].prediction}"`,
  );

  // ── TEST 3: Reactive Prediction on Coding / Debugging Query ──
  console.log('\n[Test 3] Reactive Prediction on Code Debugging Task...');
  possap.recordInteraction(
    'There is a deadlock in the async lock-free queue when pop() is called concurrently. Fix the bug.',
    'Analyzing the CAS retry loop and hazard pointer reclamation queue.',
  );

  const predCode = possap.getLatestPredictions();
  assert(
    predCode.user.some(
      (p) =>
        /test|benchmark|workspace|file|code|performance|optimization/i.test(p.prediction) ||
        p.category?.includes('code'),
    ),
    `User prediction accurately anticipates coding follow-up: "${predCode.user[0].prediction}"`,
  );
  assert(
    predCode.ai.some(
      (p) =>
        /ast|verifier|coder|benchmark|syntax/i.test(p.prediction) || p.category?.includes('prep'),
    ),
    `AI prepares AST verifier and coder: "${predCode.ai[0].prediction}"`,
  );

  // ── TEST 4: Telemetry Status & Cycle Metrics ──
  console.log('\n[Test 4] Telemetry Status Tracking...');
  const status = possap.getStatus();
  assert(
    status.userHistoryCount >= 2,
    `userHistory tracked (${status.userHistoryCount} interactions)`,
  );
  assert(status.aiHistoryCount >= 2, `aiHistory tracked (${status.aiHistoryCount} interactions)`);
  assert(
    status.predictionsAvailable >= 6,
    `Total predictions available (${status.predictionsAvailable})`,
  );
  assert(status.lastCycleAt > 0, `lastCycleAt timestamp recorded`);

  // ── TEST 5: On-Demand Trigger ──
  console.log('\n[Test 5] On-Demand Prediction Trigger...');
  const triggered = await possap.triggerPrediction(
    'Explain the mathematical proof for distributed raft consensus leases',
  );
  assert(triggered && triggered.user.length > 0, 'On-demand trigger returns valid predictions');
  assert(
    triggered.user.some(
      (p) =>
        /proof|invariant|counterfactual|math|edge|theory|formal|raft|consensus|lease|algorithm/i.test(
          p.prediction,
        ) ||
        p.category?.includes('proof') ||
        p.category?.includes('cross-domain'),
    ),
    `Accurately forecasts formal theory trajectory: "${triggered.user[0].prediction}"`,
  );

  console.log('\n===============================================================');
  console.log(
    `  VERIFICATION COMPLETE: ${passed}/${total} TESTS PASSED (${((passed / total) * 100).toFixed(0)}%)`,
  );
  console.log('===============================================================');

  process.exit(passed === total ? 0 : 1);
}

runTests().catch((err) => {
  console.error('POSSAP test failed:', err);
  process.exit(1);
});
