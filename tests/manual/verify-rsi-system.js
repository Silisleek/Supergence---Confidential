// SIS 1.0 — Test Suite for Level 5 Continuous & Simultaneous RSI Engine
// Grounded in arXiv 2606.26294 (RQGM), arXiv 2510.21614 (HGM), arXiv 2505.03335 (AZR),
// and DeepMind AlphaEvolve.

import cladeArchive from '../../server/rsi/clade-archive.js';
import redQueenEvaluator from '../../server/rsi/red-queen-evaluator.js';
import absoluteZeroEngine from '../../server/rsi/absolute-zero-engine.js';
import alphaEvolveEngine from '../../server/rsi/alpha-evolve-engine.js';
import rsiOrchestrator from '../../server/rsi/simultaneous-orchestrator.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(message);
  }
  passedTests++;
  console.log(`  ✓ PASSED: ${message}`);
}

async function runTestSuite() {
  console.log('═════════════════════════════════════════════════════════════════════');
  console.log('  SIS 1.0 — COMPREHENSIVE RSI (LEVEL 5 AUTONOMY) VERIFICATION SUITE  ');
  console.log('═════════════════════════════════════════════════════════════════════\n');

  // ─────────────────────────────────────────────────────────────
  // TEST 1: HGM Clade Metaproductivity (CMP) & DGM Stepping Stones
  // ─────────────────────────────────────────────────────────────
  console.log('1. [HGM & DGM] Clade Metaproductivity & Stepping Stone Archive:');
  const root = cladeArchive.nodes.get(cladeArchive.rootId);
  assert(Boolean(root), 'Root scaffold node exists in Clade Archive');

  // Spawn a stepping-stone parent (modest raw score)
  const steppingParent = cladeArchive.registerVariant({
    name: 'Stepping Stone Parent Candidate',
    domain: 'coding',
    type: 'agent_scaffold',
    rawScore: 0.83,
    content: 'Intermediate file-chunking buffer',
  });
  assert(Boolean(steppingParent.id), 'Registered parent variant in clade tree');

  // Spawn high-performing children under this parent
  const eliteChild1 = cladeArchive.registerVariant({
    parentId: steppingParent.id,
    name: 'Elite Descendant Child Alpha',
    domain: 'coding',
    type: 'agent_scaffold',
    rawScore: 0.96,
    content: 'Vectorized bitmask stream parser',
  });

  const eliteChild2 = cladeArchive.registerVariant({
    parentId: steppingParent.id,
    name: 'Elite Descendant Child Beta',
    domain: 'coding',
    type: 'agent_scaffold',
    rawScore: 0.98,
    content: 'Zero-copy lock-free ring channel',
  });

  // Verify CMP of parent increased based on descendant clade yield
  const updatedParent = cladeArchive.nodes.get(steppingParent.id);
  assert(
    updatedParent.descendantCount === 2,
    `Parent tracks 2 descendants (actual: ${updatedParent.descendantCount})`,
  );
  assert(
    updatedParent.cmpScore > updatedParent.rawScore,
    `Parent CMP (${updatedParent.cmpScore}) exceeds raw score (${updatedParent.rawScore}) due to elite offspring`,
  );
  assert(
    updatedParent.metadata.isSteppingStone === true,
    'Parent correctly preserved as Stepping Stone (HGM/DGM principle)',
  );

  // Verify Pareto frontier
  const pareto = cladeArchive.getParetoFrontier();
  assert(pareto.length >= 1, `Pareto frontier calculated successfully (size: ${pareto.length})`);
  console.log(`     -> Peak CMP in Archive: ${cladeArchive.stats.highestCMP}`);

  // ─────────────────────────────────────────────────────────────
  // TEST 2: Red Queen Gödel Machine (RQGM) Co-Evolving Evaluator
  // ─────────────────────────────────────────────────────────────
  console.log('\n2. [RQGM L5] Co-Evolving Agent-as-a-Judge Evaluator:');
  const initialEpoch = redQueenEvaluator.state.currentEpoch;
  const initialDiscrim = redQueenEvaluator.state.discriminationScore;

  // Run evaluation with active fixed epoch rubric
  const evalSample = await redQueenEvaluator.evaluateCandidate(
    'Implement a lock-free queue in JavaScript',
    'class LockFreeQueue { constructor() { this.buf = []; } push(x) { this.buf.push(x); } pop() { return this.buf.shift(); } }',
    'coding',
  );
  assert(
    evalSample.compositeScore > 0,
    `Candidate scored with active rubric (Composite: ${evalSample.compositeScore})`,
  );
  assert(evalSample.scores.accuracy != null, 'Rubric scored accuracy dimension');
  assert(evalSample.scores.resilience != null, 'Rubric scored resilience dimension');

  // Advance Epoch boundary (The L5 co-evolution event)
  const evoResult = await redQueenEvaluator.advanceEpoch();
  assert(
    evoResult.epoch === initialEpoch + 1,
    `Epoch advanced from ${initialEpoch} to ${evoResult.epoch}`,
  );
  assert(
    redQueenEvaluator.state.discriminationScore >= initialDiscrim,
    `Judge discrimination sharpened: ${(redQueenEvaluator.state.discriminationScore * 100).toFixed(1)}%`,
  );
  assert(
    redQueenEvaluator.state.antiGamingRules.length >= 4,
    `Anti-gaming invariants active: ${redQueenEvaluator.state.antiGamingRules.length}`,
  );
  console.log(
    `     -> Advanced to RQGM Epoch ${evoResult.epoch} (Judge Gen ${evoResult.generation})`,
  );

  // ─────────────────────────────────────────────────────────────
  // TEST 3: Absolute Zero Reasoner (AZR) Self-Play Engine
  // ─────────────────────────────────────────────────────────────
  console.log('\n3. [AZR] Zero-Human-Data Self-Play Reasoner:');
  // Test learnability rejection on trivial task
  const trivialTask = { title: 'Trivial task', specification: 'return 0;' };
  const isLearnable = absoluteZeroEngine._evaluateLearnability(trivialTask);
  assert(!isLearnable, 'Learnability filter successfully rejected trivial task');

  // Test learnability acceptance on non-trivial task
  const rigorousTask = {
    title: 'SIMD Quaternion Math',
    specification:
      'Compute unrolled quaternion dot product with formal boundary checks for zero norm.',
  };
  assert(
    absoluteZeroEngine._evaluateLearnability(rigorousTask),
    'Learnability filter accepted rigorous algorithmic task',
  );

  // Test AZR sandbox verification script assembly
  const testScript = absoluteZeroEngine._assembleExecutionScript(
    rigorousTask,
    'function solve(arr) { return arr.length > 0 ? arr[0] : 0; }',
  );
  assert(
    testScript.includes('// AZR Objective Execution Harness'),
    'Harness script assembled with verification checks',
  );

  // ─────────────────────────────────────────────────────────────
  // TEST 4: AlphaEvolve Algorithm Discovery & Program Database
  // ─────────────────────────────────────────────────────────────
  console.log('\n4. [AlphaEvolve] Dual-Tier Program Archive & Micro-Benchmarks:');
  const programsCount = alphaEvolveEngine.stats.totalProgramsInArchive;
  assert(programsCount >= 2, `Program database loaded seed programs (actual: ${programsCount})`);

  const sampledPrompt = alphaEvolveEngine.samplePromptContext('3d', 1);
  assert(
    sampledPrompt.includes('High-Performance Exemplar'),
    'AlphaEvolve prompt sampler successfully generated exemplar prompt',
  );

  const deterministicBench = alphaEvolveEngine._buildMicroBenchmarkScript(
    'function fast() { return 42; }',
  );
  assert(
    deterministicBench.includes('baselineNs') && deterministicBench.includes('optimizedNs'),
    'Micro-benchmark script generated with high-resolution timers',
  );

  // ─────────────────────────────────────────────────────────────
  // TEST 5: RSISimultaneousOrchestrator Concurrency & Multi-Strand
  // ─────────────────────────────────────────────────────────────
  console.log('\n5. [Simultaneous Orchestrator] 4-Strand Concurrent Non-Stop Execution:');
  assert(Boolean(rsiOrchestrator.strands.rqgm), 'Strand 1 (RQGM) configured');
  assert(Boolean(rsiOrchestrator.strands.azr), 'Strand 2 (AZR) configured');
  assert(Boolean(rsiOrchestrator.strands.alphaEvolve), 'Strand 3 (AlphaEvolve) configured');
  assert(Boolean(rsiOrchestrator.strands.seal), 'Strand 4 (SEAL) configured');

  // Test toggle strand
  const toggleRes = rsiOrchestrator.toggleStrand('seal', false);
  assert(toggleRes.enabled === false, 'Strand toggle successfully disabled strand');
  rsiOrchestrator.toggleStrand('seal', true);
  assert(
    rsiOrchestrator.strands.seal.enabled === true,
    'Strand toggle successfully re-enabled strand',
  );

  // Test SEAL execution step (memory consolidation & replay buffer)
  await rsiOrchestrator.executeSEALStep();
  assert(
    rsiOrchestrator.strands.seal.recentEvents.length > 0,
    'SEAL strand executed and logged consolidation event',
  );
  assert(
    rsiOrchestrator.replayBuffer.length > 0,
    `Anti-catastrophic forgetting replay buffer populated (depth: ${rsiOrchestrator.replayBuffer.length})`,
  );

  // Get full status payload
  const fullStatus = rsiOrchestrator.getStatus();
  assert(fullStatus.strands != null, 'Full status reports all strands');
  assert(fullStatus.cladeStats != null, 'Full status includes HGM Clade Metaproductivity');
  assert(fullStatus.rqgmState != null, 'Full status includes RQGM Epoch state');
  assert(fullStatus.azrState != null, 'Full status includes AZR telemetry');
  assert(fullStatus.alphaEvolveState != null, 'Full status includes AlphaEvolve telemetry');

  console.log('\n═════════════════════════════════════════════════════════════════════');
  console.log(`  🎉 ALL ${passedTests}/${totalTests} RSI TEST ASSERTIONS PASSED PERFECTLY!`);
  console.log('═════════════════════════════════════════════════════════════════════\n');
}

runTestSuite().catch((err) => {
  console.error('\n❌ Test Suite Aborted with Error:', err.message);
  process.exit(1);
});
