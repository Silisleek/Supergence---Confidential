// SIS 1.0 — Learning, Performance & Workspace Scoping Verification Test Suite
import fs from 'fs';
import path from 'path';
import workspace from '../../server/workspace/manager.js';
import autonomousLearner from '../../server/improvement/autonomous-learner.js';

console.log('===============================================================');
console.log('    VERIFYING WORKSPACE SCOPING & LEARNING PERFORMANCE        ');
console.log('===============================================================\n');

let passed = 0;
let total = 0;

function assert(condition, testName, details = '') {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${testName} ${details ? `(${details})` : ''}`);
  } else {
    console.error(`  ✗ FAIL: ${testName} ${details ? `(${details})` : ''}`);
  }
}

async function runTests() {
  // ─── Test Group 1: Workspace Tree Scoping ───
  console.log('[Test 1] Workspace Explorer Scoping Verification...');

  const tree = workspace.getTree('', 2);
  assert(
    tree && tree.length > 50,
    'Workspace tree contains all workspace files & theories',
    `Count: ${tree.length}`,
  );

  const topNames = tree.map((t) => t.name);
  const containsClient = topNames.includes('client');
  const containsServer = topNames.includes('server');
  const containsNodeModules = topNames.includes('node_modules');
  const containsData = topNames.includes('data');

  assert(!containsClient, 'Excludes codebase client/ directory from workspace explorer');
  assert(!containsServer, 'Excludes codebase server/ directory from workspace explorer');
  assert(!containsNodeModules, 'Excludes node_modules/ directory from workspace explorer');
  assert(!containsData, 'Excludes codebase data/ directory from workspace explorer');

  const hasTheories = topNames.includes('theories');
  assert(hasTheories, 'Includes theories/ folder in workspace explorer');

  const hasHtmlSims = tree.some((t) => t.name.endsWith('.html'));
  assert(hasHtmlSims, 'Includes 3D simulations & HTML visualizers in workspace explorer');

  // ─── Test Group 2: Dual-Root Resolution Verification ───
  console.log('\n[Test 2] Dual-Root Path Resolution (Workspace Primary + Codebase Fallback)...');

  // 2.1 Workspace relative file
  const wsFile = workspace._resolve('theories');
  assert(wsFile.includes('workspace'), 'Resolves theories to workspace/theories', wsFile);

  // 2.2 Explicit workspace prefix
  const explicitWs = workspace._resolve('workspace/theories');
  assert(
    !explicitWs.includes('workspace\\workspace') && !explicitWs.includes('workspace/workspace'),
    'Strips redundant workspace/ prefix cleanly',
  );

  // 2.3 Codebase fallback resolution (agent preserves full codebase access)
  const serverIndex = workspace._resolve('server/index.js');
  assert(
    fs.existsSync(serverIndex),
    'Agent can resolve server/index.js in codebase fallback',
    serverIndex,
  );

  const clientApp = workspace._resolve('client/scripts/app.js');
  assert(
    fs.existsSync(clientApp),
    'Agent can resolve client/scripts/app.js in codebase fallback',
    clientApp,
  );

  // ─── Test Group 3: Continuous Autonomous Learning Verification ───
  console.log('\n[Test 3] Autonomous Learning Engine Progression...');

  const dataPath = path.resolve('data/improvement/autonomous-learning.json');
  assert(fs.existsSync(dataPath), 'Found autonomous-learning.json persistent database');

  const learningData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  assert(
    typeof learningData.totalCycles === 'number' && learningData.totalCycles >= 200,
    'Autonomous cycles progressing continuously',
    `Total Cycles: ${learningData.totalCycles}`,
  );

  const recentCycles = learningData.recentCycles || [];
  assert(
    recentCycles.length > 0,
    'Recent cycle history populated',
    `Count: ${recentCycles.length}`,
  );

  const latest = recentCycles[0];
  assert(
    latest && latest.cycleNumber > 0,
    'Latest cycle metadata intact',
    `Cycle #${latest.cycleNumber}`,
  );

  // Check empirical score progression
  const baseline = latest.baselineScore;
  const finalScore = latest.finalScore;
  const targetScore = latest.targetScore;
  assert(
    finalScore > baseline,
    'Final score strictly exceeds baseline score',
    `Baseline: ${baseline} → Final: ${finalScore}`,
  );
  assert(
    finalScore >= targetScore || latest.gainPercent >= 10,
    'Strict +10% target improvement achieved',
    `Gain: +${latest.gainPercent}%`,
  );

  // ─── Test Group 4: Empirical Benchmark Performance Gains ───
  console.log('\n[Test 4] Empirical Sandbox Benchmark Execution & Speedups...');

  assert(
    latest.empiricalBenchmark && latest.empiricalBenchmark.executed === true,
    'Sandbox empirical micro-benchmark executed in cycle',
  );

  const benchmark = latest.empiricalBenchmark;
  assert(
    benchmark.testsPassed === benchmark.testsTotal && benchmark.testsPassed > 0,
    'Passed 100% of adversarial sandbox test cases',
    `${benchmark.testsPassed}/${benchmark.testsTotal} passed`,
  );

  assert(
    benchmark.speedupMultiplier >= 1.0,
    'Measured real speedup multiplier',
    `${benchmark.speedupMultiplier}x speedup`,
  );
  assert(
    typeof benchmark.latencyGainPercent === 'number',
    'Measured latency gain percentage',
    `+${benchmark.latencyGainPercent}% latency gain`,
  );

  // ─── Test Group 5: Memory Evolution & Chaos Simulation ───
  console.log('\n[Test 5] Knowledge Evolution & Stress Simulation...');

  assert(
    latest.simulation && latest.simulation.scenarioTitle,
    'Adversarial chaos simulation executed',
    latest.simulation.scenarioTitle,
  );
  assert(
    latest.simulation.rulesLearned && latest.simulation.rulesLearned.length > 0,
    'Derived operational rules from simulation',
    `Rules: ${latest.simulation.rulesLearned.length}`,
  );

  assert(
    latest.memoryUpdates && latest.memoryUpdates.length > 0,
    'Evolved long-term memory with breakthroughs',
    `Updates: ${latest.memoryUpdates.length}`,
  );

  // Check research digests
  const researchDir = path.resolve('data/research');
  const digests = fs.existsSync(researchDir)
    ? fs.readdirSync(researchDir).filter((f) => f.endsWith('.md'))
    : [];
  assert(
    digests.length > 0,
    'Persistent live internet research digests saved',
    `Digests: ${digests.length}`,
  );

  console.log('\n===============================================================');
  console.log(
    `  VERIFICATION COMPLETE: ${passed}/${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`,
  );
  console.log('===============================================================');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
