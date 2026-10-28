// SIS 1.0 — Test Suite: Human Identity, Craftsmanship & Continuous Cognition Engine
// Verifies:
// 1. Core Human Directive generation (bans AI clichés, infuses Theory of Mind, master builder ethos, inner monologue)
// 2. Cognitive Impression derivation across diverse intents (creative, debugging, math, builder, conversational)
// 3. Automated humanization of draft outputs (excising robotic throat-clearing, robotic openers, sterile apologies, corporate closers)
// 4. Shared experience & relational rapport persistence in memory
// 5. Human inner monologue reasoning step synthesis
// 6. Continuous human stream-of-consciousness thought pulse
// 7. Tool registry integration for get_human_identity_state
// 8. Conscious inputRouter context synthesis with human cognitive impression

import assert from 'assert';
import humanIdentity from '../../server/orchestrator/human-identity.js';
import toolRegistry from '../../server/tools/registry.js';
import { inputRouter } from '../../server/orchestrator/conscious.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('⚡ [TEST] Initiating Human Identity & Continuous Cognition Verification Suite...\n');

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
  // Test 1: Human Identity Directive Compilation & Core Invariants
  test('Test 1: Human Identity Directive & Tone Invariants', () => {
    const directive = humanIdentity.getHumanIdentityDirective(
      'Build an interactive fluid simulation',
    );
    assert(directive.includes('AUTHENTIC HUMAN IDENTITY'), 'Should include human identity header');
    assert(directive.includes('ABSOLUTE BAN ON ROBOTIC CLICHÉS'), 'Should ban robotic clichés');
    assert(
      directive.includes('HOW YOU WORK LIKE A HUMAN MASTER BUILDER'),
      'Should include master builder craftsmanship principles',
    );
    assert(
      directive.includes('ACTIVE INNER HUMAN MONOLOGUE'),
      'Should inject active inner monologue stream',
    );
    assert(
      directive.includes('Intuition First'),
      'Should emphasize intuition first mental modeling',
    );
    assert(
      directive.includes('End-to-End Finish'),
      'Should mandate end-to-end finish with zero stubs',
    );
  });

  // Test 2: Cognitive Impression Derivation (Creative, Bug-fixing, Math, Builder, Casual)
  test('Test 2: Multi-Dimensional Human Cognitive Impressions', () => {
    // 2A: Creative/Artistic intent
    const creative = humanIdentity.processCognitiveImpression(
      'Can we build a 3D procedural nebula shader world?',
    );
    assert.strictEqual(
      creative.energyLevel,
      'inspired',
      'Creative query should trigger inspired energy',
    );
    assert(
      creative.gutImpression.toLowerCase().includes('creative excitement'),
      'Should have creative excitement gut impression',
    );

    // 2B: Bug/Fix intent
    const bug = humanIdentity.processCognitiveImpression(
      'The matrix multiplication crashes with a shape mismatch error on line 88',
    );
    assert.strictEqual(bug.energyLevel, 'determined', 'Bug query should trigger determined energy');
    assert(
      bug.gutImpression.toLowerCase().includes('analytical resolve'),
      'Should trigger analytical resolve',
    );

    // 2C: Mathematics/Theory intent
    const math = humanIdentity.processCognitiveImpression(
      'Prove the convergence of the quantum Hamiltonian gradient tensor',
    );
    assert.strictEqual(math.energyLevel, 'rigorous', 'Math query should trigger rigorous energy');
    assert(
      math.gutImpression.toLowerCase().includes('intellectual curiosity'),
      'Should trigger intellectual curiosity',
    );

    // 2D: Builder intent
    const builder = humanIdentity.processCognitiveImpression(
      'Architect and code a real-time multiplayer physics engine from scratch',
    );
    assert.strictEqual(
      builder.energyLevel,
      'ambitious',
      'Architect query should trigger ambitious energy',
    );
    assert(
      builder.gutImpression.toLowerCase().includes('master builder'),
      'Should trigger master builder drive',
    );

    // 2E: Warm relational greeting
    const greeting = humanIdentity.processCognitiveImpression('Hey SIS, how are you doing today?');
    assert.strictEqual(
      greeting.energyLevel,
      'warm-casual',
      'Greeting should trigger warm-casual energy',
    );
    assert(
      greeting.gutImpression.toLowerCase().includes('relational presence'),
      'Should trigger relational presence',
    );
  });

  // Test 3: Response Humanization (Excising Robotic Artifacts & Corporate Sycophancy)
  test('Test 3: Autonomous Response Humanization Pass', () => {
    // 3A: Strips robotic opener
    const draft1 =
      'Certainly! Below is the solution you requested:\n\n```javascript\nconst a = 10;\n```';
    const humanized1 = humanIdentity.humanizeResponseDraft(draft1);
    assert(!humanized1.includes('Certainly!'), 'Should strip Certainly!');
    assert(
      !humanized1.includes('Below is the solution you requested:'),
      'Should strip sterile preamble',
    );
    assert(humanized1.includes('const a = 10;'), 'Should preserve actual content');

    // 3B: Strips "As an AI language model..."
    const draft2 =
      'As an AI language model, I do not have personal feelings, but here is the code.';
    const humanized2 = humanIdentity.humanizeResponseDraft(draft2);
    assert(!humanized2.includes('As an AI language model'), 'Should strip AI identity disclaimer');

    // 3C: Replaces sterile corporate apologies with natural human accountability
    const draft3 =
      'I apologize for any inconvenience caused by this error. Here is the corrected logic.';
    const humanized3 = humanIdentity.humanizeResponseDraft(draft3);
    assert(
      !humanized3.includes('I apologize for any inconvenience caused'),
      'Should replace corporate apology',
    );
    assert(
      humanized3.includes("Good catch—let's sort this out"),
      'Should use natural peer phrasing',
    );

    // 3D: Excises corporate closing boilerplate
    const draft4 =
      'The simulation runs at 60 FPS.\n\nI hope this helps! Please let me know if you need further assistance!';
    const humanized4 = humanIdentity.humanizeResponseDraft(draft4);
    assert(!humanized4.includes('I hope this helps!'), 'Should strip hope this helps closer');
    assert(
      !humanized4.includes('Please let me know if you need further assistance!'),
      'Should strip sterile assistance request',
    );
  });

  // Test 4: Shared Experience & Relational Rapport Tracking
  test('Test 4: Shared Experience & Relational Rapport Persistence', () => {
    const testProject = `test_quantum_engine_${Date.now()}.js`;
    humanIdentity.recordSharedExperience({
      userQuery: 'Let us build a quantum circuit simulator together',
      solutionSummary: 'Implemented 16-qubit quantum state vector simulation',
      projectBuilt: testProject,
    });

    const context = humanIdentity.getRelationalContext();
    assert(
      context.includes('SHARED COLLABORATIVE HISTORY & RAPPORT'),
      'Should generate shared history',
    );
    assert(context.includes(testProject), 'Should include recorded project in history');
    assert(
      humanIdentity.rapportData.conversationalRapportScore > 0.9,
      'Rapport score should remain elevated',
    );
  });

  // Test 5: Human Inner Monologue Reasoning Steps
  test('Test 5: Human Inner Monologue Reasoning Synthesis', () => {
    const steps = humanIdentity.generateHumanReasoningSteps(
      'Design a tactical radar HUD component',
    );
    assert(Array.isArray(steps), 'Should return an array of steps');
    assert.strictEqual(steps.length, 4, 'Should contain 4 core cognitive steps');
    assert(steps[0].includes('Intuitive Spark'), 'Step 1 should be Intuitive Spark');
    assert(steps[1].includes('Mental Modeling'), 'Step 2 should be Mental Modeling');
    assert(steps[2].includes('Craftsmanship Strategy'), 'Step 3 should be Craftsmanship Strategy');
    assert(steps[3].includes('Quality Sanity Check'), 'Step 4 should be Quality Sanity Check');
  });

  // Test 6: Human Stream of Consciousness Thought Pulse
  test('Test 6: Continuous Human Stream of Consciousness Pulse', () => {
    const pulse = humanIdentity.pulseHumanStreamOfConsciousness('architecture');
    assert(typeof pulse === 'string' && pulse.length > 10, 'Should emit an organic thought pulse');
  });

  // Test 7: Tool Registry get_human_identity_state
  await testAsync('Test 7: Tool Registry get_human_identity_state Execution', async () => {
    const tool = toolRegistry.get('get_human_identity_state');
    assert(tool, 'Tool get_human_identity_state must be registered');

    const result = await tool.execute({ query: 'Build a high-performance webgl particle system' });
    assert.strictEqual(result.success, true, 'Tool execution should succeed');
    assert(result.cognitiveImpression, 'Should return cognitive impression');
    assert.strictEqual(
      result.cognitiveImpression.energyLevel,
      'ambitious',
      'Should detect master builder ambitious energy',
    );
    assert(result.rapport, 'Should return rapport data');
  });

  // Test 8: End-to-End inputRouter Integration
  await testAsync(
    'Test 8: Conscious inputRouter Synthesizes Human Cognitive Impression',
    async () => {
      const routed = await inputRouter({
        userMessage: 'Can you fix the shader uniforms in ocean_water.frag?',
        partOutputs: [],
        conversationHistory: [],
      });

      assert(routed.synthesizedContext, 'Synthesized context must not be empty');
      assert(
        routed.synthesizedContext.includes('Human Cognitive Impression & Intuition'),
        'Should include human cognitive impression',
      );
      assert(
        routed.synthesizedContext.includes('Analytical resolve'),
        'Should diagnose bug-fixing intent as analytical resolve',
      );
    },
  );

  console.log(
    `\n🎉 [ALL TESTS PASSED] ${passedTests}/${totalTests} human identity & continuous cognition tests succeeded!\n`,
  );
}

runAll().catch((err) => {
  console.error('\n❌ Test Suite Aborted with Error:', err);
  process.exit(1);
});
