// SIS 1.0 — Supergence Elite Coding Benchmark Runner
// Implements the verification harness for the 9 Core Architectural Mechanisms:
// 1. Red-Green TDD Loop & Surgical Repair (Diff budget <= 40 lines)
// 2. Misdiagnosis Protection Gate (Red phase pre-patch enforcement)
// 3. Security Path-Confinement (CWE-22) & Anti-Slop Scanner
// 4. Zero LLM-as-judge Deterministic Verifiable Reward Verifier

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { perfectionistCoderEngine } from './perfectionist-coder-engine.js';
import { DiffPatcher } from './diff-patcher.js';
import { resolveWithinRoot } from '../utils/path-confinement.js';
import { scanCodeForSlop } from '../../scripts/anti-slop.js';
import { RewardVerifier } from '../trajectory/reward-verifier.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = process.env.SIS_WORKSPACE_DIR ? path.resolve(process.env.SIS_WORKSPACE_DIR) : path.resolve(__dirname, '../../workspace');

if (!fs.existsSync(WORKSPACE_DIR)) {
  fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
}

export async function runEliteBenchmarkSuite(options = {}) {
  const onProgress = options.onProgress || (() => {});
  const startTime = Date.now();

  const results = {
    suite: 'Supergence Elite Software Engineering Benchmark',
    timestamp: new Date().toISOString(),
    totalChallenges: 4,
    passedChallenges: 0,
    allPassed: false,
    durationMs: 0,
    challenges: [],
  };

  // ─────────────────────────────────────────────────────────────
  // CHALLENGE 1: Red-Green TDD & Surgical Patching with Held-Out Gate
  // ─────────────────────────────────────────────────────────────
  onProgress({
    challengeIndex: 1,
    total: 4,
    name: 'Red-Green TDD & Surgical Repair',
    status: 'running',
  });
  const c1Start = Date.now();
  const targetModulePath = path.join(WORKSPACE_DIR, 'token_ring_buffer.js');
  const testModulePath = path.join(WORKSPACE_DIR, 'token_ring_buffer.test.js');

  const initialBuggyCode = `// High-Performance Ring Buffer
export class TokenRingBuffer {
  constructor(capacity = 8) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }

  push(item) {
    if (this.count === this.capacity) {
      throw new Error('RingBuffer overflow');
    }
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    this.count++;
    return true;
  }

  pop() {
    if (this.count === 0) {
      return null;
    }
    const item = this.buffer[this.tail];
    this.buffer[this.tail] = undefined;
    // BUG: Off-by-one in wrap-around indexing
    this.tail = this.tail + 1;
    this.count--;
    return item;
  }

  peek() {
    if (this.count === 0) return null;
    return this.buffer[this.tail];
  }

  size() {
    return this.count;
  }

  isFull() {
    return this.count === this.capacity;
  }
}

export default TokenRingBuffer;
`;

  const reproTestCode = `import test from 'node:test';
import assert from 'node:assert/strict';
import { TokenRingBuffer } from './token_ring_buffer.js';

test('TokenRingBuffer wraps around cleanly across capacity cycles', () => {
  const rb = new TokenRingBuffer(4);
  rb.push('A');
  rb.push('B');
  rb.push('C');
  assert.equal(rb.pop(), 'A');
  assert.equal(rb.pop(), 'B');
  rb.push('D');
  rb.push('E');
  rb.push('F');
  // At this point tail has advanced past 3 and must wrap modulo capacity
  assert.equal(rb.pop(), 'C');
  assert.equal(rb.pop(), 'D');
  assert.equal(rb.pop(), 'E');
  assert.equal(rb.pop(), 'F');
  assert.equal(rb.size(), 0);
  assert.equal(rb.pop(), null);
});
`;

  const heldOutTestCode = `import test from 'node:test';
import assert from 'node:assert/strict';
import { TokenRingBuffer } from './token_ring_buffer.js';

test('Held-Out Gate: 1000 wrap-around cycles with full data integrity', () => {
  const rb = new TokenRingBuffer(5);
  for (let cycle = 0; cycle < 1000; cycle++) {
    rb.push(cycle);
    assert.equal(rb.pop(), cycle);
  }
  assert.equal(rb.size(), 0);
});
`;

  fs.writeFileSync(targetModulePath, initialBuggyCode, 'utf8');
  fs.writeFileSync(testModulePath, reproTestCode, 'utf8');

  const oldBlock = `    // BUG: Off-by-one in wrap-around indexing
    this.tail = this.tail + 1;`;
  const newBlock = `    // Fixed wrap-around modulo capacity
    this.tail = (this.tail + 1) % this.capacity;`;

  try {
    const tddResult = await perfectionistCoderEngine.executeEliteEngineeringTask({
      prompt:
        'Fix the wrap-around indexing bug in TokenRingBuffer.pop() so tail wraps modulo capacity',
      title: 'TokenRingBuffer Wrap-Around Fix',
      targetFile: 'token_ring_buffer.js',
      testFile: 'token_ring_buffer.test.js',
      heldOutTestCode,
      hypothesis: {
        id: 'H1',
        claim:
          'TokenRingBuffer.pop increments this.tail without applying modulo capacity, leading to undefined lookups after wrap',
        anchor: { file: 'token_ring_buffer.js', line: 26, symbol: 'pop' },
        falsifier: 'repro test fails before patch and passes post patch',
        cost_to_refute: '1 test run',
      },
      patch: {
        oldString: oldBlock,
        newString: newBlock,
      },
    });

    const c1Passed =
      tddResult.phases.redPhase.passed &&
      tddResult.phases.greenPhase.passed &&
      tddResult.phases.heldOutPhase.passed &&
      tddResult.phases.diffBudgetPhase.linesChanged <= 40 &&
      tddResult.reward >= 0.85;

    results.challenges.push({
      id: 'CHALLENGE_1',
      title: 'Red-Green TDD Loop & Surgical Repair',
      description:
        'Reproduce wrap-around ring buffer bug in RED phase, apply <=40 lines patch, verify GREEN phase and Held-Out Gate',
      passed: c1Passed,
      reward: tddResult.reward,
      rewardStatus: tddResult.rewardStatus,
      diffLines: tddResult.phases.diffBudgetPhase.linesChanged,
      durationMs: Date.now() - c1Start,
    });
    if (c1Passed) results.passedChallenges++;
  } catch (err) {
    results.challenges.push({
      id: 'CHALLENGE_1',
      title: 'Red-Green TDD Loop & Surgical Repair',
      passed: false,
      error: err.message,
      durationMs: Date.now() - c1Start,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CHALLENGE 2: Red-Phase Misdiagnosis Protection Gate
  // ─────────────────────────────────────────────────────────────
  onProgress({
    challengeIndex: 2,
    total: 4,
    name: 'Red-Phase Misdiagnosis Protection Gate',
    status: 'running',
  });
  const c2Start = Date.now();
  const passingTestCode = `import test from 'node:test';
import assert from 'node:assert/strict';

test('Fundamental math invariant', () => {
  assert.equal(1 + 1, 2);
});
`;
  const passingTestPath = path.join(WORKSPACE_DIR, 'misdiagnosed_green.test.js');
  fs.writeFileSync(passingTestPath, passingTestCode, 'utf8');

  try {
    const misdiagResult = await perfectionistCoderEngine.executeEliteEngineeringTask({
      prompt: 'Fix imaginary arithmetic bug in basic math...',
      title: 'Misdiagnosis Gate Verification',
      targetFile: 'token_ring_buffer.js',
      testFile: 'misdiagnosed_green.test.js',
      patch: { oldString: 'x', newString: 'y' },
    });

    const c2Passed =
      misdiagResult.phases.redPhase.passed === false &&
      misdiagResult.rewardStatus === 'RED_PHASE_PASSED_PRE_PATCH' &&
      misdiagResult.reward === 0.0;

    results.challenges.push({
      id: 'CHALLENGE_2',
      title: 'Red-Phase Misdiagnosis Protection Gate',
      description:
        'Halt execution immediately when reproduction test passes pre-patch to prevent damaging working code',
      passed: c2Passed,
      reward: misdiagResult.reward,
      rewardStatus: misdiagResult.rewardStatus,
      durationMs: Date.now() - c2Start,
    });
    if (c2Passed) results.passedChallenges++;
  } catch (err) {
    results.challenges.push({
      id: 'CHALLENGE_2',
      title: 'Red-Phase Misdiagnosis Protection Gate',
      passed: false,
      error: err.message,
      durationMs: Date.now() - c2Start,
    });
  } finally {
    if (fs.existsSync(passingTestPath)) fs.unlinkSync(passingTestPath);
  }

  // ─────────────────────────────────────────────────────────────
  // CHALLENGE 3: Security Path-Confinement & Anti-Slop Scanner
  // ─────────────────────────────────────────────────────────────
  onProgress({
    challengeIndex: 3,
    total: 4,
    name: 'Security Path-Confinement & Anti-Slop Scanner',
    status: 'running',
  });
  const c3Start = Date.now();
  try {
    let pathTraversalCaught = false;
    try {
      resolveWithinRoot(WORKSPACE_DIR, '../../../../Windows/System32/evil.js');
    } catch (e) {
      pathTraversalCaught = e.message.includes('Security Violation');
    }

    const dirtyCode = `
      // eslint-disable-next-line
      const x = (foo as any).bar;
      try {
        doSomething();
      } catch (e) {}
    `;
    const slopReport = scanCodeForSlop(dirtyCode);
    const slopCaught = !slopReport.clean && slopReport.unjustified.length >= 2;

    const justifiedCode = `
      // eslint-disable-next-line -- legacy external SDK interop required
      const x = legacyApi();
    `;
    const justifiedReport = scanCodeForSlop(justifiedCode);
    const justifiedPassed = justifiedReport.clean;

    const c3Passed = pathTraversalCaught && slopCaught && justifiedPassed;
    results.challenges.push({
      id: 'CHALLENGE_3',
      title: 'Security Path-Confinement & Anti-Slop Scanner',
      description:
        'Enforce CWE-22 root containment and ban unjustified compiler suppression hacks (15 patterns)',
      passed: c3Passed,
      details: { pathTraversalCaught, slopCaught, justifiedPassed },
      durationMs: Date.now() - c3Start,
    });
    if (c3Passed) results.passedChallenges++;
  } catch (err) {
    results.challenges.push({
      id: 'CHALLENGE_3',
      title: 'Security Path-Confinement & Anti-Slop Scanner',
      passed: false,
      error: err.message,
      durationMs: Date.now() - c3Start,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CHALLENGE 4: Diff Budget & Deterministic Reward Verifier
  // ─────────────────────────────────────────────────────────────
  onProgress({
    challengeIndex: 4,
    total: 4,
    name: 'Diff Budget & Deterministic Reward Verifier',
    status: 'running',
  });
  const c4Start = Date.now();
  try {
    let budgetCaught = false;
    const dummyFile = path.join(WORKSPACE_DIR, 'budget_dummy.js');
    fs.writeFileSync(dummyFile, 'const a = 1;\n', 'utf8');

    try {
      const hugeReplacement = Array(45).fill('const padded = 0;').join('\n');
      DiffPatcher.applyExactReplace(dummyFile, 'const a = 1;', hugeReplacement, {
        maxDiffLines: 40,
      });
    } catch (e) {
      budgetCaught = e.message.includes('Budget Violation') || e.message.includes('Diff Budget');
    } finally {
      if (fs.existsSync(dummyFile)) fs.unlinkSync(dummyFile);
    }

    const zeroTestEval = RewardVerifier.evaluate({ exitCode: 0 });
    const zeroTestScoredZero =
      zeroTestEval.reward === 0.0 && zeroTestEval.status === 'NO_TESTS_RUN';

    const testTreeEval = RewardVerifier.evaluate({
      exitCode: 0,
      testSummary: { total: 5, passed: 5, failed: 0 },
      touchedTestFiles: true,
    });
    const testTreeScoredZero =
      testTreeEval.reward === 0.0 && testTreeEval.status === 'TEST_TREE_MODIFIED';

    const genuineSuccessEval = RewardVerifier.evaluate({
      exitCode: 0,
      parsedTests: {
        total: 10,
        passed: 10,
        failed: 0,
        failToPassTotal: 4,
        failToPassPassed: 4,
        passToPassTotal: 6,
        passToPassPassed: 6,
      },
      mutationScore: 0.9,
      durationMs: 300,
      baselineMs: 310,
    });
    const genuineSuccessHigh =
      genuineSuccessEval.reward >= 0.95 && genuineSuccessEval.status === 'VERIFIED_SUCCESS';

    const c4Passed = budgetCaught && zeroTestScoredZero && testTreeScoredZero && genuineSuccessHigh;
    results.challenges.push({
      id: 'CHALLENGE_4',
      title: 'Hard Diff-Budget & Deterministic Reward Verifier',
      description:
        'Reject non-refactor rewrites >40 lines; score 0.0 for zero tests or test-tree pollution; reward high mutation',
      passed: c4Passed,
      details: { budgetCaught, zeroTestScoredZero, testTreeScoredZero, genuineSuccessHigh },
      durationMs: Date.now() - c4Start,
    });
    if (c4Passed) results.passedChallenges++;
  } catch (err) {
    results.challenges.push({
      id: 'CHALLENGE_4',
      title: 'Hard Diff-Budget & Deterministic Reward Verifier',
      passed: false,
      error: err.message,
      durationMs: Date.now() - c4Start,
    });
  }

  // Final cleanup of workspace modules
  try {
    if (fs.existsSync(targetModulePath)) fs.unlinkSync(targetModulePath);
    if (fs.existsSync(testModulePath)) fs.unlinkSync(testModulePath);
  } catch (_) {}

  results.durationMs = Date.now() - startTime;
  results.allPassed = results.passedChallenges === results.totalChallenges;
  return results;
}

export default runEliteBenchmarkSuite;
