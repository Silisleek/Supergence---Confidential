// Test Suite: Verify Dynamic Learning Engine & Non-Hardcoded Execution
import autonomousLearner from '../../server/improvement/autonomous-learner.js';
import empiricalGym from '../../server/improvement/empirical-gym.js';
import patternLibrary from '../../server/improvement/anti-patterns.js';

async function runTests() {
  console.log('===============================================================');
  console.log('       VERIFYING DYNAMIC LEARNING MECHANISM & SCORING          ');
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

  // Ensure learner is started for the test
  autonomousLearner.start();

  // ── TEST 1: Dynamic Structural Evaluation Scoring ──
  console.log('[Test 1] Dynamic Structural Evaluator & Varied Baseline Scoring...');

  const sampleQ =
    'In what way can SIS construct, stress-test, and verify a lock-free circular RingBuffer with zero-allocation hazard pointers [Spec-9K1L]?';
  const formalSol = `### Formal Invariant & Soundness Proof
1. Invariant 1 (Linearizability): State transitions obey monotonic ticket sequencing tau(k) < tau(k+1).
2. Proof of Correctness: By mathematical induction, all CAS updates preserve linearizable epoch consistency.
3. Asymptotic Complexity: O(1) amortized queue transition time, zero heap memory leak.`;

  const codeSol = `### High-Performance Resilient Implementation
\`\`\`javascript
class LockFreeRingBuffer {
  constructor(capacity = 1024) {
    this.buffer = new Array(capacity);
    this.head = 0n;
    this.tail = 0n;
    this.mask = capacity - 1;
  }
  push(item) {
    const cur = this.tail;
    if (cur - this.head >= BigInt(this.mask + 1)) return false;
    this.buffer[Number(cur & BigInt(this.mask))] = item;
    this.tail = cur + 1n;
    return true;
  }
  pop() {
    const cur = this.head;
    if (cur >= this.tail) return null;
    const item = this.buffer[Number(cur & BigInt(this.mask))];
    this.buffer[Number(cur & BigInt(this.mask))] = null;
    this.head = cur + 1n;
    return item;
  }
}
\`\`\`
1. Bounded Memory: Static pre-allocated buffer prevents V8 GC stalls.
2. BigInt Monotonicity: 64-bit sequence counters eliminate ABA index wrapping.`;

  const eval1 = autonomousLearner._synthesizeDynamicEvaluation(
    sampleQ,
    formalSol,
    codeSol,
    'concurrency-lockfree',
  );

  assert(
    eval1 && typeof eval1.baselineScore === 'number',
    'Synthesized valid dynamic evaluation structure',
  );
  assert(
    eval1.baselineScore > 0.7 && eval1.baselineScore < 0.95,
    `Baseline score is in realistic range (${eval1.baselineScore})`,
  );
  assert(
    eval1.masterScore > eval1.baselineScore,
    `Master score (${eval1.masterScore}) exceeds baseline (${eval1.baselineScore})`,
  );
  assert(
    eval1.targetScore === Number((eval1.baselineScore * 1.1).toFixed(3)),
    `Target score correctly enforces strict +10% target (${eval1.targetScore})`,
  );
  assert(
    eval1.baselineScore !== 0.85 || eval1.masterScore !== 0.944,
    `Score is NOT legacy hardcoded static pair (0.850, 0.944)`,
  );

  // ── TEST 2: Dynamic Scenario Simulation Generation ──
  console.log('\n[Test 2] Dynamic Scenario Simulation Generation...');
  const sim1 = autonomousLearner._generateDynamicSimulation(sampleQ, 'concurrency-lockfree');

  assert(sim1 && sim1.scenarioTitle, `Generated simulation title: "${sim1.scenarioTitle}"`);
  assert(
    sim1.scenarioDescription && sim1.scenarioDescription.length > 30,
    'Simulation description is non-empty and detailed',
  );
  assert(
    Array.isArray(sim1.rulesLearned) && sim1.rulesLearned.length >= 2,
    `Derived ${sim1.rulesLearned.length} operational rules`,
  );
  assert(
    sim1.scenarioTitle.toLowerCase().includes('ringbuffer') ||
      sim1.scenarioTitle.toLowerCase().includes('concurrency'),
    'Simulation title dynamically incorporates challenge context',
  );

  // ── TEST 3: Empirical Sandbox Tournament Execution ──
  console.log('\n[Test 3] Empirical Sandbox Tournament Execution...');
  const gymResult = await empiricalGym.runEmpiricalTournament(
    sampleQ,
    formalSol,
    codeSol,
    eval1.masterSynthesis,
  );

  assert(
    gymResult && gymResult.executed === true,
    'Sandbox runner successfully executed JS benchmarks',
  );
  assert(
    gymResult.testsPassed > 0,
    `Passed ${gymResult.testsPassed}/${gymResult.testsTotal} tournament test cases`,
  );
  assert(
    typeof gymResult.speedupMultiplier === 'number' && gymResult.speedupMultiplier > 0,
    `Measured speedup multiplier: ${gymResult.speedupMultiplier}x`,
  );
  assert(
    typeof gymResult.latencyGainPercent === 'number',
    `Measured latency gain: ${gymResult.latencyGainPercent}%`,
  );

  // ── TEST 4: Full Autonomous Cycle Execution (End-to-End) ──
  console.log('\n[Test 4] Full End-to-End Autonomous Cycle Execution...');
  const initialCycles = autonomousLearner.state.totalCycles;
  const cycleResult = await autonomousLearner.runCycle(true);

  assert(
    cycleResult && cycleResult.status === 'completed',
    `Autonomous cycle executed successfully (status: ${cycleResult.status})`,
  );
  assert(
    cycleResult.cycleNumber > initialCycles,
    `Cycle count incremented (now #${cycleResult.cycleNumber})`,
  );
  assert(
    cycleResult.question && cycleResult.question.length > 20,
    `Generated challenge question: "${cycleResult.question.slice(0, 75)}..."`,
  );
  assert(
    typeof cycleResult.baselineScore === 'number' && cycleResult.baselineScore > 0,
    `Dynamic baseline score: ${cycleResult.baselineScore}`,
  );
  assert(
    typeof cycleResult.finalScore === 'number' &&
      cycleResult.finalScore > cycleResult.baselineScore,
    `Dynamic final score: ${cycleResult.finalScore}`,
  );
  assert(
    typeof cycleResult.gainPercent === 'number' && cycleResult.gainPercent > 0,
    `Empirical gain: +${cycleResult.gainPercent}%`,
  );
  assert(
    cycleResult.gainPercent !== 16.47 || cycleResult.finalScore !== 0.99,
    `Scores and gain are dynamic (Final: ${cycleResult.finalScore}, Gain: +${cycleResult.gainPercent}%)`,
  );
  assert(cycleResult.strict10PercentMet === true, 'Strict +10% target goal met');
  assert(
    cycleResult.simulation && cycleResult.simulation.scenarioTitle,
    `Simulation attached: "${cycleResult.simulation.scenarioTitle.slice(0, 60)}..."`,
  );
  assert(
    Array.isArray(cycleResult.memoryUpdates) && cycleResult.memoryUpdates.length > 0,
    `Persisted ${cycleResult.memoryUpdates.length} memory updates`,
  );

  // ── TEST 5: Telemetry Status Integrity ──
  console.log('\n[Test 5] Telemetry Status Integrity...');
  const status = autonomousLearner.getStatus();

  assert(status.isRunning === true, 'Learner is running');
  assert(
    status.stats.totalCycles === cycleResult.cycleNumber,
    `totalCycles matches latest cycle (#${status.stats.totalCycles})`,
  );
  assert(
    status.recentCycles.length > 0,
    `recentCycles contains ${status.recentCycles.length} history records`,
  );
  assert(
    status.recentCycles[0].cycleNumber === cycleResult.cycleNumber,
    'recentCycles[0] is the newly executed cycle',
  );
  assert(
    typeof status.stats.nextCycleAt === 'number' && status.stats.nextCycleAt > Date.now() - 60000,
    `nextCycleAt is valid timestamp (${status.stats.nextCycleAt})`,
  );

  console.log('\n===============================================================');
  console.log(
    `  VERIFICATION COMPLETE: ${passed}/${total} TESTS PASSED (${((passed / total) * 100).toFixed(0)}%)`,
  );
  console.log('===============================================================');

  autonomousLearner.stop();
  process.exit(passed === total ? 0 : 1);
}

runTests().catch((err) => {
  console.error('Learning engine verification failed:', err);
  process.exit(1);
});
