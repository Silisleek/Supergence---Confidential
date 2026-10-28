// SIS 1.0 — Test Suite: Autonomous Mistake Self-Correction & Task Resilience Engine
// Verifies:
// 1. Self-detects internal mistakes (tool failures, broken code, unbalanced KaTeX, stubs, surrender phrases) and auto-heals them.
// 2. Detects user fix instructions and continues tasks to completion without stopping mid-task.

import assert from 'assert';
import selfCorrector from '../../server/orchestrator/self-corrector.js';
import atomicBuildPipeline from '../../server/orchestrator/atomic-build-verify.js';
import toolRegistry from '../../server/tools/registry.js';
import autoHealer from '../../server/orchestrator/auto-healer.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = path.resolve(__dirname, '../../workspace');

console.log('⚡ [TEST] Initiating Self-Correction & Task Resilience Verification Suite...\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name} FAILED:`, err.message);
    throw err;
  }
}

async function testAsync(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name} FAILED:`, err.message);
    throw err;
  }
}

async function runAll() {
  // Test 1: User Fix Intent Recognition with Overarching Goal Reconstruction
  test('Test 1: User Fix Intent & Goal Reconstruction', () => {
    const history = [
      {
        role: 'user',
        content: 'Build a full 3D procedural solar system with orbital gravity and particle rings',
      },
      {
        role: 'assistant',
        content: 'I started writing solar_system.js but encountered a syntax error.',
      },
    ];

    const res1 = selfCorrector.detectUserFixIntent(
      'it needs to fix it not just stop mid task',
      history,
    );
    assert.strictEqual(res1.isFixIntent, true, 'Should detect fix intent');
    assert.strictEqual(
      res1.wantsFullCompletion,
      true,
      'Should recognize demand for unbroken completion',
    );
    assert(
      res1.originalGoal.includes('solar system'),
      'Should reconstruct overarching goal from history',
    );

    const res2 = selfCorrector.detectUserFixIntent('Fix the bug in simulation.js on line 42', []);
    assert.strictEqual(res2.isFixIntent, true);
    assert.strictEqual(res2.targetFile, 'simulation.js');
    assert.strictEqual(res2.lineno, 42);

    const res3 = selfCorrector.detectUserFixIntent('You made a mistake in the calculation', []);
    assert.strictEqual(res3.isFixIntent, true);
  });

  // Test 2: Autonomous Internal Mistake Detection
  test('Test 2: Autonomous Internal Mistake Detection', () => {
    const flawedTurn = {
      turnText:
        'I apologize, but I am unable to complete this task due to an error.\n```javascript\nfunction run() {\n  // TODO: add code\n',
      toolsUsed: [{ tool: 'execute_command', error: 'Command timed out' }],
    };

    const detected = selfCorrector.detectInternalMistakes(flawedTurn);
    assert.strictEqual(detected.hasMistakes, true, 'Must identify mistakes');
    assert(
      detected.mistakes.some((m) => m.type === 'tool-failure'),
      'Tool failure caught',
    );
    assert(
      detected.mistakes.some((m) => m.type === 'premature-surrender'),
      'Surrender phrase caught',
    );
    assert(
      detected.mistakes.some((m) => m.type === 'incomplete-stub'),
      'TODO stub caught',
    );
    assert(
      detected.mistakes.some((m) => m.type === 'truncated-code-fence'),
      'Unclosed fence caught',
    );
  });

  // Test 3: Tool Failure In-Loop Recovery Directive Formulation
  test('Test 3: Tool Failure In-Loop Recovery Directive', () => {
    const recovery = selfCorrector.handleToolFailureInLoop({
      toolName: 'create_file',
      toolArgs: { filepath: 'test.js' },
      error: 'ENOENT: no such file or directory',
      turns: 1,
      maxTurns: 5,
    });

    assert(
      recovery.recoveryDirective.includes('AUTONOMOUS MISTAKE CAUGHT BY SELF-CORRECTOR'),
      'Directive formatted',
    );
    assert(recovery.recoveryDirective.includes('create_file'), 'Mentions failing tool');
    assert(recovery.recoveryDirective.includes('NOT stop mid-task'), 'Prohibits stopping');
    assert.strictEqual(recovery.shouldRetry, true, 'Allows retrying');
  });

  // Test 4: Draft Self-Healing (KaTeX Balancing, Fence Closure, Stub Elimination, Surrender Purge)
  test('Test 4: Draft Self-Healing & In-Memory Repair', () => {
    const draft =
      'I apologize, but here is the formula $E = mc^2 and display $$\\int_0^1 x dx\n```javascript\nconst x = 1;\n// TODO: fix this';
    const healed = selfCorrector.auditAndHealDraft(draft, 'Calculate energy and integrate');

    assert.strictEqual(healed.wasHealed, true);
    assert(!healed.healedText.startsWith('I apologize'), 'Surrender purged');
    assert(healed.healedText.endsWith('```'), 'Code fence auto-closed');
    assert(!healed.healedText.includes('// TODO: fix this'), 'TODO stub removed');
    assert(healed.modifications.length >= 3, 'Multiple repair passes applied');
  });

  // Test 5: Resilient Repair with Continuation Mandate
  await testAsync('Test 5: Resilient Repair with Overarching Goal', async () => {
    // Setup a dummy broken file in workspace
    const dummyFile = path.join(WORKSPACE_DIR, 'test_resilient_repair.js');
    fs.writeFileSync(dummyFile, 'function broken() { return 1;', 'utf8');

    const origHeal = autoHealer.healFile.bind(autoHealer);
    autoHealer.healFile = async () => ({
      filename: 'test_resilient_repair.js',
      rootCause: 'Fixed unclosed bracket',
      diff: { summary: '+1 line modified' },
      verified: true,
      attempts: 1,
    });

    const repairRes = await selfCorrector.executeResilientRepair({
      targetFile: 'test_resilient_repair.js',
      errorText: 'SyntaxError: Unexpected end of input',
      originalGoal: 'Create complete high-performance math library with unit tests',
      userMessage: 'It needs to fix it not just stop mid task',
    });

    autoHealer.healFile = origHeal;

    assert(
      repairRes.continuationMandate.includes(
        'TASK RESILIENCE ENGINE: UNBROKEN CONTINUATION ACTIVE',
      ),
    );
    assert(repairRes.continuationMandate.includes('Do NOT stop after fixing this single error'));
    assert.strictEqual(repairRes.hasBroaderTask, true);

    // Clean up
    try {
      fs.unlinkSync(dummyFile);
    } catch {}
  });

  // Test 6: ADBTS Atomic Pipeline Self-Healing
  await testAsync('Test 6: ADBTS Pipeline Self-Healing (Break -> Heal -> Combine)', async () => {
    const res = await atomicBuildPipeline.execute(
      'Build a complex distributed consensus protocol with mathematical proofs',
    );
    assert(res.totalUnits >= 3, 'Units broken down');
    assert(res.verifiedCount === res.totalUnits, 'All units verified through self-healing');
    assert(res.masterOutput.length > 50, 'Masterpiece assembled');
  });

  // Test 7: Tool Registry Verification
  test('Test 7: self_correct_and_complete Tool in Registry', () => {
    const tool = toolRegistry.get('self_correct_and_complete');
    assert(tool, 'self_correct_and_complete must be registered in toolRegistry');
    assert.strictEqual(tool.name, 'self_correct_and_complete');
  });

  console.log(
    `\n🎉 [ALL TESTS PASSED] Successfully verified all ${passedTests}/${totalTests} resilience capabilities!`,
  );
  process.exit(0);
}

runAll().catch((err) => {
  console.error('\n❌ Self-Correction Test Suite encountered an error:', err);
  process.exit(1);
});
