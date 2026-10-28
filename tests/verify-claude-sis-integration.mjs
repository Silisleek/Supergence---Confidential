// SIS 1.0 — Comprehensive Claude SIS Integration Verification Test Suite
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

import { TrajectoryLogger } from '../server/trajectory/trajectory-logger.js';
import { RewardVerifier } from '../server/trajectory/reward-verifier.js';
import { DiffPatcher } from '../server/coder/diff-patcher.js';
import { ContainerRunner } from '../server/sandbox/container-runner.js';
import { WorktreeManager } from '../server/sandbox/worktree-manager.js';
import { TddHarness } from '../server/coder/tdd-harness.js';
import { AstParser } from '../server/lsp/ast-parser.js';
import { LspClient } from '../server/lsp/lsp-client.js';
import { BeamSearch } from '../server/search/beam-search.js';
import empiricalGym from '../server/improvement/empirical-gym.js';
import sandbox from '../server/coder/sandbox.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Source fixtures must live outside the protected tests tree. Each run gets its
// own directory so concurrent verification cannot overwrite another run.
const TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'sis-integration-'));

if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

console.log('====================================================');
console.log('=== VERIFYING CLAUDE SIS INTEGRATION SPEC (MK-10) ===');
console.log('====================================================\n');

let totalPassed = 0;
let totalTests = 0;

async function runTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    totalPassed++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error('       Error:', err.message);
    if (err.stack) console.error('       ', err.stack.split('\n').slice(1, 3).join('\n       '));
  }
}

// ----------------------------------------------------
// 1. TrajectoryLogger Verification
// ----------------------------------------------------
await runTest('TrajectoryLogger: Records steps and exports DPO preference pairs', async () => {
  const sessionId = `test_session_${Date.now()}`;
  const logger = new TrajectoryLogger(sessionId);

  const step1 = logger.logStep({
    state: { prompt: 'Fix binary search index', targetFile: 'search.js' },
    action: { type: 'apply_patch', patch: 'mid = Math.floor((low + high) / 2)' },
    observation: { exitCode: 0, stdout: 'Pass' },
    reward: 1.0,
    metadata: { durationMs: 42 },
  });

  assert.strictEqual(step1.sessionId, sessionId);
  assert.strictEqual(step1.step, 0);
  assert.strictEqual(step1.reward, 1.0);

  const step2 = logger.logStep({
    state: { prompt: 'Fix binary search index' },
    action: { type: 'apply_patch', patch: 'mid = low + high' },
    observation: { exitCode: 1, stderr: 'IndexOutOfBounds' },
    reward: 0.0,
  });

  const trajectory = logger.getTrajectory();
  assert.strictEqual(trajectory.length, 2);

  // Test DPO export
  const pair = logger.exportPreferencePair([step1], [step2]);
  assert.ok(pair.chosen.length === 1);
  assert.ok(pair.rejected.length === 1);

  const dpoPath = path.resolve(__dirname, '../data/trajectories/dpo_pairs.jsonl');
  assert.ok(fs.existsSync(dpoPath));
});

// ----------------------------------------------------
// 2. RewardVerifier Verification
// ----------------------------------------------------
await runTest(
  'RewardVerifier: Evaluates exit codes, linters, tests, and latency bonuses',
  async () => {
    // Exit code failure
    const rFail = RewardVerifier.evaluate({ exitCode: 1 });
    assert.strictEqual(rFail.reward, 0.0);
    assert.strictEqual(rFail.status, 'FAILED_EXECUTION');

    // Linter error
    const rLint = RewardVerifier.evaluate({ exitCode: 0, linterErrors: 2 });
    assert.strictEqual(rLint.reward, 0.0);
    assert.strictEqual(rLint.status, 'LINT_ERRORS');

    // Passing tests with no measured performance regression
    const rBonus = RewardVerifier.evaluate({
      exitCode: 0,
      testSummary: { total: 5, passed: 5, failed: 0 },
      durationMs: 450,
      baselineMs: 450,
    });
    assert.strictEqual(rBonus.reward, 1.0);
    assert.strictEqual(rBonus.status, 'VERIFIED_SUCCESS');

    // A measured 50% latency regression reduces the performance component.
    const rNormal = RewardVerifier.evaluate({
      exitCode: 0,
      testSummary: { total: 5, passed: 5, failed: 0 },
      durationMs: 1500,
      baselineMs: 1000,
    });
    assert.strictEqual(rNormal.reward, 0.975);
    assert.strictEqual(rNormal.status, 'VERIFIED_SUCCESS');

    // Failed unit tests
    const rTestFail = RewardVerifier.evaluate({
      exitCode: 0,
      testSummary: { total: 5, passed: 4, failed: 1 },
    });
    assert.strictEqual(rTestFail.reward, 0.0);
    assert.strictEqual(rTestFail.status, 'FAIL_TO_PASS_INCOMPLETE');
    assert.strictEqual(RewardVerifier.evaluate({ exitCode: 0 }).status, 'NO_TESTS_RUN');
  },
);

// ----------------------------------------------------
// 3. DiffPatcher Verification
// ----------------------------------------------------
await runTest(
  'DiffPatcher: Applies exact replaces and enforces single-match uniqueness',
  async () => {
    const testFile = path.join(TEST_DIR, 'patch_target.js');
    fs.writeFileSync(
      testFile,
      `
function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}
`,
      'utf8',
    );

    // Exact replacement
    const oldCode = 'let total = 0;';
    const newCode = 'let total = 0; // initialized';
    const res = DiffPatcher.applyExactReplace(testFile, oldCode, newCode);
    assert.ok(res.success);

    const updatedContent = fs.readFileSync(testFile, 'utf8');
    assert.ok(updatedContent.includes('// initialized'));

    // Assert throws when not found
    assert.throws(() => {
      DiffPatcher.applyExactReplace(testFile, 'non_existent_symbol_string', 'bar');
    }, /Target string not found/);

    // Assert throws when multiple matches exist
    fs.appendFileSync(testFile, '\nlet total = 0; // initialized');
    assert.throws(() => {
      DiffPatcher.applyExactReplace(testFile, 'let total = 0; // initialized', 'replacement');
    }, /matches 2 locations/);

    const protectedFile = path.join(TEST_DIR, 'protected.test.js');
    fs.writeFileSync(protectedFile, 'const expected = 2;');
    assert.throws(() => {
      DiffPatcher.applyExactReplace(protectedFile, 'expected = 2', 'expected = 3');
    }, /Modifying a test file/);
  },
);

// ----------------------------------------------------
// 4. ContainerRunner Verification
// ----------------------------------------------------
await runTest('ContainerRunner: Executes isolated commands and language test files', async () => {
  const runner = new ContainerRunner({ workspaceDir: TEST_DIR });

  // Exec command
  const res = await runner.exec('node', ['-e', 'console.log("runner_active")']);
  assert.strictEqual(res.exitCode, 0);
  assert.ok(res.stdout.includes('runner_active'));
  assert.ok(res.durationMs >= 0);

  // Execute test file
  const sampleTest = path.join(TEST_DIR, 'sample.test.js');
  fs.writeFileSync(
    sampleTest,
    `
import test from 'node:test';
import assert from 'node:assert';

test('sample test pass', () => {
  assert.strictEqual(1 + 1, 2);
});
`,
    'utf8',
  );

  const testRun = await runner.executeTest(sampleTest);
  assert.strictEqual(testRun.exitCode, 0);
  assert.ok(!testRun.timedOut);
});

// ----------------------------------------------------
// 5. WorktreeManager Verification
// ----------------------------------------------------
await runTest('WorktreeManager: Inspects git and manages directory snapshots', async () => {
  const wm = new WorktreeManager(TEST_DIR);
  const snap = wm.createSnapshot(TEST_DIR, 'test_snap');
  assert.ok(snap.success);
  assert.ok(fs.existsSync(snap.path));

  const clean = await wm.removeWorktree(snap.path);
  assert.ok(clean.success);
});

// ----------------------------------------------------
// 6. TddHarness Verification
// ----------------------------------------------------
await runTest('TddHarness: Enforces Red -> Patch -> Green execution contract', async () => {
  const runner = new ContainerRunner({ workspaceDir: TEST_DIR });
  const harness = new TddHarness({ sandboxRunner: runner });

  const targetFile = path.join(TEST_DIR, 'adder.js');
  const unitTestFile = path.join(TEST_DIR, 'adder.test.js');

  // Write broken implementation
  fs.writeFileSync(targetFile, 'export function add(a, b) { return a - b; }\n', 'utf8');

  // Write unit test expecting addition
  fs.writeFileSync(
    unitTestFile,
    `
import test from 'node:test';
import assert from 'node:assert';
import { add } from './adder.js';

test('adds numbers correctly', () => {
  assert.strictEqual(add(2, 3), 5);
});
`,
    'utf8',
  );

  // Patch function fixing the bug
  const patchFn = async () => {
    fs.writeFileSync(targetFile, 'export function add(a, b) { return a + b; }\n', 'utf8');
  };

  const loopResult = await harness.executeLoop({
    testFilePath: unitTestFile,
    patchFn,
    prompt: 'Fix subtraction bug in add function',
  });

  assert.strictEqual(loopResult.success, true);
  assert.strictEqual(loopResult.phase, 'VERIFIED_GREEN');
});

// ----------------------------------------------------
// 7. AstParser Verification
// ----------------------------------------------------
await runTest(
  'AstParser: Extracts functions, classes, imports, and exports semantically',
  async () => {
    const sampleJs = `
import fs from 'node:fs';
import { spawn } from 'node:child_process';

export class Calculator extends BaseCalculator {
  add(a, b) { return a + b; }
  static multiply(x, y) { return x * y; }
}

export function computeMetric(values) {
  return values.reduce((a, b) => a + b, 0);
}

export const logger = (msg) => { console.log(msg); };
`;

    const symbols = AstParser.extractSymbols(sampleJs, 'javascript');
    assert.strictEqual(symbols.imports.length, 2);
    assert.strictEqual(symbols.classes.length, 1);
    assert.strictEqual(symbols.classes[0].name, 'Calculator');
    assert.strictEqual(symbols.classes[0].superClass, 'BaseCalculator');
    assert.ok(symbols.classes[0].methods.some((m) => m.name === 'add'));
    assert.ok(symbols.classes[0].methods.some((m) => m.name === 'multiply'));
    assert.ok(symbols.functions.some((f) => f.name === 'computeMetric'));
    assert.ok(symbols.functions.some((f) => f.name === 'logger'));
  },
);

// ----------------------------------------------------
// 8. LspClient Verification
// ----------------------------------------------------
await runTest('LspClient: Provides symbol inspection and diagnostics', async () => {
  const lsp = new LspClient({ rootPath: TEST_DIR });
  const init = await lsp.start();
  assert.ok(init.ready);

  const sampleFile = path.join(TEST_DIR, 'lsp_sample.js');
  fs.writeFileSync(sampleFile, 'export function hello() { return "world"; }\n', 'utf8');

  const symbols = await lsp.getDocumentSymbols(sampleFile);
  assert.ok(symbols.functions.some((f) => f.name === 'hello'));

  const diag = await lsp.getDiagnostics(sampleFile);
  assert.strictEqual(diag.valid, true);

  lsp.shutdown();
});

// ----------------------------------------------------
// 9. BeamSearch Verification
// ----------------------------------------------------
await runTest(
  'BeamSearch: Explores candidate tree and prunes paths via RewardVerifier',
  async () => {
    const searcher = new BeamSearch({ beamWidth: 2, maxDepth: 2 });

    const result = await searcher.search({
      prompt: 'Implement linear search algorithm',
      generateCandidates: async (state, depth) => {
        return [
          { id: `cand_${depth}_1`, code: 'function search(arr, x) { return -1; }', quality: 0.1 },
          {
            id: `cand_${depth}_2`,
            code: 'function search(arr, x) { return arr.indexOf(x); }',
            quality: 0.95,
          },
        ];
      },
      evaluateCandidate: async (candidate) => {
        if (candidate.quality > 0.9) {
          return { exitCode: 0, testSummary: { total: 3, passed: 3, failed: 0 }, durationMs: 200 };
        }
        return { exitCode: 1, testSummary: { total: 3, passed: 0, failed: 3 }, durationMs: 500 };
      },
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.score >= 0.9);
    assert.strictEqual(result.stats.verified, true);
  },
);

// ----------------------------------------------------
// 10. EmpiricalGym & SandboxRunner Integration
// ----------------------------------------------------
await runTest(
  'EmpiricalGym: Runs tournament and records trajectories via TrajectoryLogger',
  async () => {
    assert.ok(empiricalGym.logger instanceof TrajectoryLogger);
    assert.ok(typeof sandbox.exec === 'function');
    assert.ok(typeof sandbox.executeTest === 'function');

    const sol1 = '```javascript\nfunction solve(n) { return n * 2; }\n```';
    const sol2 = '```javascript\nfunction solve(n) { return n << 1; }\n```';
    const originalSynthesis = empiricalGym.synthesizeBenchmarkSuite;
    // Exercise the real local differential fallback without a provider call.
    empiricalGym.synthesizeBenchmarkSuite = async () => null;
    try {
      const tournament = await empiricalGym.runEmpiricalTournament(
        'Multiply integer by 2',
        sol1,
        sol2,
        sol1,
      );
      assert.equal(tournament.executed, true);
      assert.equal(tournament.sandboxExitCode, 0);
      assert.ok(tournament.parsed.c1.latencyNs > 0);
      assert.ok(tournament.parsed.c2.latencyNs > 0);
      assert.equal(tournament.verification.grade, 'INFERRED');
      assert.equal(tournament.verification.reward, null);
      assert.ok(tournament.speedupMultiplier > 0);
      assert.equal(tournament.isEmpiricallySuperior, false);
    } finally {
      empiricalGym.synthesizeBenchmarkSuite = originalSynthesis;
    }
  },
);

// ----------------------------------------------------
// 11. Human Identity & Conversational Calibration
// ----------------------------------------------------
await runTest(
  'HumanIdentity: Strips robotic AI scripts and enables natural human dialogue',
  async () => {
    const { default: humanIdentity } = await import('../server/orchestrator/human-identity.js');
    const { inputRouter } = await import('../server/orchestrator/conscious.js');

    const rawBotDraft =
      'Certainly! I would be happy to help you with that. ### Overview\n\nHere is how we build the system. In this response, I will provide the steps.\n\nI apologize for any inconvenience caused.\n\nPlease let me know if you have any questions!';
    const humanized = humanIdentity.humanizeResponseDraft(rawBotDraft);

    assert.ok(!humanized.includes('Certainly!'));
    assert.ok(!humanized.includes('I would be happy to help'));
    assert.ok(!humanized.includes('Please let me know if you have any questions!'));
    assert.ok(!humanized.includes('### Overview'));
    assert.ok(humanized.includes("Good catch—let's sort this out."));

    // Check conversational lightweight routing for simple greetings
    const routedGreeting = await inputRouter({ userMessage: 'hey what is up' });
    assert.strictEqual(routedGreeting.responseType, 'conversational');
    assert.strictEqual(routedGreeting.synthesizedContext, '');
  },
);

// ----------------------------------------------------
// 12. Real-Time Mid-Task Steering
// ----------------------------------------------------
await runTest(
  'Brain: Live mid-task steering injects user details into active execution',
  async () => {
    const { default: brain } = await import('../server/orchestrator/brain.js');

    brain.steer('Make the background obsidian and add smooth camera rotation');
    assert.ok(brain.activeMidTaskSteering.length > 0);
    assert.ok(
      brain.activeMidTaskSteering.includes(
        'Make the background obsidian and add smooth camera rotation',
      ),
    );

    // Clean queue
    brain.activeMidTaskSteering = [];
  },
);

// Clean up test temp files
try {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
} catch {}

console.log('\n====================================================');
console.log(`SUMMARY: ${totalPassed} / ${totalTests} tests passed cleanly.`);
console.log('====================================================\n');

if (totalPassed !== totalTests) {
  process.exit(1);
} else {
  process.exit(0);
}
