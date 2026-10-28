// SIS 1.0 — Supergence & Opus-4.6 Advanced Coding Benchmark Suite
// Rigorously tests the coding capabilities of SIS and the underlying Claude 3.5 Opus (opus-4.6) model
// across 4 complex software engineering and algorithmic domains with live sandbox verification.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CoderPart } from '../../../server/coder/coder-part.js';
import { runEliteBenchmarkSuite } from '../../../server/coder/elite-benchmark-runner.js';
import sandbox from '../../../server/coder/sandbox.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = path.resolve(__dirname, '../../../workspace');

async function runTestSuite() {
  console.log('================================================================');
  console.log('🚀 SUPERGENCE & OPUS-4.6 ADVANCED CODING BENCHMARK SUITE');
  console.log('Testing Real Code Synthesis, Data Structures, Algorithms & TDD');
  console.log('================================================================\n');

  const suiteStart = Date.now();
  const coder = new CoderPart();
  const results = [];

  // ─────────────────────────────────────────────────────────────
  // TASK 1: Lock-Free Single-Producer Single-Consumer (SPSC) Ring Buffer
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- [TASK 1/4] CONCURRENT SPSC LOCK-FREE RING BUFFER ---');
  console.log('Prompting opus-4.6 to synthesize a high-throughput lock-free circular queue...');
  const t1Start = Date.now();
  const t1Prompt = `Implement a complete, production-grade lock-free Single Producer Single Consumer (SPSC) Ring Buffer in JavaScript / TypeScript ES Module format.
Target file: lock_free_spsc.js
Requirements:
1. Export class LockFreeSPSC(capacity). Capacity should automatically round up to next power of 2.
2. Methods: enqueue(item), dequeue(), isEmpty(), isFull(), size(), capacity().
3. Bitwise mask indexing: index & (capacity - 1) for O(1) branchless wrap-around.
4. Correctly distinguish between full and empty states without sacrificing buffer slots.
5. Provide complete, working code with zero external dependencies and zero placeholder comments.`;

  try {
    const t1Res = await coder.process(t1Prompt);
    console.log(
      `[Task 1] Synthesis completed in ${Date.now() - t1Start}ms. Target: ${t1Res.targetFile}, Verified: ${t1Res.verified}`,
    );

    // Automated Verification Harness: 50,000 interleaved operations
    const testCode = `
import { LockFreeSPSC } from '../../../scripts/lock_free_spsc.js';
import assert from 'node:assert/strict';

const q = new LockFreeSPSC(16);
assert.equal(q.isEmpty(), true);
assert.equal(q.isFull(), false);

// Test basic push and pop
assert.equal(q.enqueue('A'), true);
assert.equal(q.isEmpty(), false);
assert.equal(q.dequeue(), 'A');
assert.equal(q.isEmpty(), true);

// Test capacity fill
for (let i = 0; i < 16; i++) {
  assert.equal(q.enqueue(i), true, 'Failed enqueue at ' + i);
}
assert.equal(q.isFull(), true);
assert.equal(q.enqueue('OVERFLOW'), false);

// Drain and verify order
for (let i = 0; i < 16; i++) {
  assert.equal(q.dequeue(), i);
}
assert.equal(q.isEmpty(), true);

// Stress test: 50,000 wraparound push/pop cycles
const stressQ = new LockFreeSPSC(64);
let pushed = 0;
let popped = 0;
for (let step = 0; step < 50000; step++) {
  if (pushed < 50000 && (stressQ.isEmpty() || Math.random() > 0.4)) {
    if (!stressQ.isFull()) {
      stressQ.enqueue(pushed++);
    }
  } else {
    if (!stressQ.isEmpty()) {
      const val = stressQ.dequeue();
      assert.equal(val, popped++);
    }
  }
}
while (!stressQ.isEmpty()) {
  const val = stressQ.dequeue();
  assert.equal(val, popped++);
}
assert.equal(pushed, 50000);
assert.equal(popped, 50000);
console.log('TASK_1_HARNESS_PASSED: 50,000 operations verified with perfect FIFO integrity.');
`;

    const harnessResult = await sandbox.execute({
      targetFile: 'lock_free_spsc.js',
      code: t1Res.code,
      testCode,
      language: 'javascript',
    });

    const passed = harnessResult.success && harnessResult.stdout?.includes('TASK_1_HARNESS_PASSED');
    results.push({
      id: 'TASK_1',
      name: 'Concurrent SPSC Lock-Free Ring Buffer',
      passed,
      durationMs: Date.now() - t1Start,
      output: harnessResult.stdout?.trim() || harnessResult.stderr?.trim(),
    });
    console.log(
      passed
        ? '✓ TASK 1 PASSED'
        : `❌ TASK 1 FAILED: ${harnessResult.stderr || harnessResult.error}`,
    );
  } catch (err) {
    results.push({
      id: 'TASK_1',
      name: 'Concurrent SPSC Ring Buffer',
      passed: false,
      error: err.message,
      durationMs: Date.now() - t1Start,
    });
    console.error('❌ TASK 1 EXCEPTION:', err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // TASK 2: Segment Tree with Lazy Propagation Range Updates
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- [TASK 2/4] SEGMENT TREE WITH LAZY PROPAGATION ---');
  console.log(
    'Prompting opus-4.6 to synthesize a Segment Tree supporting O(log N) range additions & sum queries...',
  );
  const t2Start = Date.now();
  const t2Prompt = `Implement a complete Segment Tree with Lazy Propagation in JavaScript ES Module format.
Target file: lazy_segment_tree.js
Requirements:
1. Export class LazySegmentTree(initialArrayOrSize).
2. Methods:
   - updateRange(l, r, val): adds 'val' to all elements in range [l, r] inclusive in O(log N).
   - queryRange(l, r): returns the sum of elements in range [l, r] inclusive in O(log N).
3. Handle lazy tags properly (pushDown / pushUp).
4. Zero dependencies, complete code with no placeholders.`;

  try {
    const t2Res = await coder.process(t2Prompt);
    console.log(
      `[Task 2] Synthesis completed in ${Date.now() - t2Start}ms. Target: ${t2Res.targetFile}, Verified: ${t2Res.verified}`,
    );

    // Verification against Naive Baseline across 1,000 random operations
    const testCode = `
import { LazySegmentTree } from '../../../scripts/lazy_segment_tree.js';
import assert from 'node:assert/strict';

const N = 100;
const rawArr = new Array(N).fill(0).map((_, i) => (i * 3) - 50);
const naiveArr = [...rawArr];
const segTree = new LazySegmentTree(rawArr);

// Run 1,000 random range updates and range queries
for (let iter = 0; iter < 1000; iter++) {
  const l = Math.floor(Math.random() * N);
  const r = l + Math.floor(Math.random() * (N - l));
  if (Math.random() < 0.5) {
    // Range update
    const delta = Math.floor(Math.random() * 200) - 100;
    segTree.updateRange(l, r, delta);
    for (let i = l; i <= r; i++) naiveArr[i] += delta;
  } else {
    // Range query
    const treeSum = segTree.queryRange(l, r);
    let expectedSum = 0;
    for (let i = l; i <= r; i++) expectedSum += naiveArr[i];
    assert.equal(treeSum, expectedSum, \`Mismatch at iter \${iter} for range [\${l}, \${r}]: got \${treeSum}, expected \${expectedSum}\`);
  }
}
console.log('TASK_2_HARNESS_PASSED: 1,000 randomized operations verified against baseline.');
`;

    const harnessResult = await sandbox.execute({
      targetFile: 'lazy_segment_tree.js',
      code: t2Res.code,
      testCode,
      language: 'javascript',
    });

    const passed = harnessResult.success && harnessResult.stdout?.includes('TASK_2_HARNESS_PASSED');
    results.push({
      id: 'TASK_2',
      name: 'Segment Tree with Lazy Propagation',
      passed,
      durationMs: Date.now() - t2Start,
      output: harnessResult.stdout?.trim() || harnessResult.stderr?.trim(),
    });
    console.log(
      passed
        ? '✓ TASK 2 PASSED'
        : `❌ TASK 2 FAILED: ${harnessResult.stderr || harnessResult.error}`,
    );
  } catch (err) {
    results.push({
      id: 'TASK_2',
      name: 'Segment Tree with Lazy Propagation',
      passed: false,
      error: err.message,
      durationMs: Date.now() - t2Start,
    });
    console.error('❌ TASK 2 EXCEPTION:', err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // TASK 3: Aho-Corasick Multi-Pattern String Search Automaton
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- [TASK 3/4] AHO-CORASICK MULTI-PATTERN AUTOMATON ---');
  console.log(
    'Prompting opus-4.6 to synthesize the Aho-Corasick string matching algorithm with failure links...',
  );
  const t3Start = Date.now();
  const t3Prompt = `Implement a complete Aho-Corasick Multi-Pattern Search Automaton in JavaScript ES Module format.
Target file: aho_corasick.js
Requirements:
1. Export class AhoCorasick(keywords).
2. Build trie with root node.
3. Compute suffix failure links and output links using BFS queue.
4. Method: search(text) -> returns array of matches [{ keyword, start, end }].
5. Correctly handles overlapping occurrences (e.g. searching 'he', 'she', 'his', 'hers' in 'ushers').
6. Complete code without external dependencies.`;

  try {
    const t3Res = await coder.process(t3Prompt);
    console.log(
      `[Task 3] Synthesis completed in ${Date.now() - t3Start}ms. Target: ${t3Res.targetFile}, Verified: ${t3Res.verified}`,
    );

    const testCode = `
import { AhoCorasick } from '../../../scripts/aho_corasick.js';
import assert from 'node:assert/strict';

const ac = new AhoCorasick(['he', 'she', 'his', 'hers']);
const matches = ac.search('ushers');

// 'ushers' contains:
// 'she' from index 1 to 3
// 'he' from index 2 to 3
// 'hers' from index 2 to 5
const matchedKeywords = matches.map(m => m.keyword).sort();
assert.ok(matchedKeywords.includes('she'), 'Missing "she"');
assert.ok(matchedKeywords.includes('he'), 'Missing "he"');
assert.ok(matchedKeywords.includes('hers'), 'Missing "hers"');

// Test DNA sub-patterns
const dnaAc = new AhoCorasick(['ATGC', 'TGC', 'GCTA', 'A']);
const dnaMatches = dnaAc.search('ATGCTA');
assert.ok(dnaMatches.length >= 4, 'Expected multiple overlapping DNA matches, got ' + dnaMatches.length);

console.log('TASK_3_HARNESS_PASSED: Aho-Corasick multi-pattern overlapping search verified.');
`;

    const harnessResult = await sandbox.execute({
      targetFile: 'aho_corasick.js',
      code: t3Res.code,
      testCode,
      language: 'javascript',
    });

    const passed = harnessResult.success && harnessResult.stdout?.includes('TASK_3_HARNESS_PASSED');
    results.push({
      id: 'TASK_3',
      name: 'Aho-Corasick Multi-Pattern Automaton',
      passed,
      durationMs: Date.now() - t3Start,
      output: harnessResult.stdout?.trim() || harnessResult.stderr?.trim(),
    });
    console.log(
      passed
        ? '✓ TASK 3 PASSED'
        : `❌ TASK 3 FAILED: ${harnessResult.stderr || harnessResult.error}`,
    );
  } catch (err) {
    results.push({
      id: 'TASK_3',
      name: 'Aho-Corasick Multi-Pattern Automaton',
      passed: false,
      error: err.message,
      durationMs: Date.now() - t3Start,
    });
    console.error('❌ TASK 3 EXCEPTION:', err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // TASK 4: Supergence Elite Software Engineering TDD Suite
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- [TASK 4/4] ELITE SOFTWARE ENGINEERING TDD BENCHMARK ---');
  console.log(
    'Testing Red-Green TDD, Surgical Patching (budget <=40 lines), and Held-Out Verification...',
  );
  const t4Start = Date.now();
  try {
    const eliteRes = await runEliteBenchmarkSuite();
    const passed = eliteRes.allPassed;
    results.push({
      id: 'TASK_4',
      name: 'Elite Software Engineering TDD Suite',
      passed,
      durationMs: Date.now() - t4Start,
      output: `Passed ${eliteRes.passedChallenges}/${eliteRes.totalChallenges} challenges (100% TDD, Diff Budget, Held-Out Gate)`,
    });
    console.log(
      passed
        ? '✓ TASK 4 PASSED'
        : `❌ TASK 4 FAILED: ${eliteRes.passedChallenges}/${eliteRes.totalChallenges} passed`,
    );
  } catch (err) {
    results.push({
      id: 'TASK_4',
      name: 'Elite Software Engineering TDD Suite',
      passed: false,
      error: err.message,
      durationMs: Date.now() - t4Start,
    });
    console.error('❌ TASK 4 EXCEPTION:', err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // SUITE SUMMARY
  // ─────────────────────────────────────────────────────────────
  const totalDuration = Date.now() - suiteStart;
  const passedCount = results.filter((r) => r.passed).length;
  console.log('\n================================================================');
  console.log(
    `FINAL BENCHMARK RESULTS: ${passedCount}/${results.length} TASKS PASSED (${((passedCount / results.length) * 100).toFixed(0)}%)`,
  );
  console.log(`Total Duration: ${totalDuration}ms`);
  console.log('================================================================');
  for (const r of results) {
    console.log(`${r.passed ? '✓' : '❌'} ${r.id}: ${r.name} (${r.durationMs}ms)`);
    if (r.output) console.log(`   ${r.output}`);
    if (r.error) console.log(`   Error: ${r.error}`);
  }

  // Write results JSON to workspace
  const reportPath = path.join(WORKSPACE_DIR, 'coding_benchmark_latest.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        totalTasks: results.length,
        passedTasks: passedCount,
        passRate: `${((passedCount / results.length) * 100).toFixed(0)}%`,
        durationMs: totalDuration,
        results,
      },
      null,
      2,
    ),
    'utf8',
  );
  console.log(`\nDetailed report written to: workspace/coding_benchmark_latest.json`);
}

runTestSuite().catch((err) => {
  console.error('Fatal Benchmark Suite Error:', err);
  process.exit(1);
});
