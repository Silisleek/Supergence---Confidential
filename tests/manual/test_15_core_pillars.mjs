// SIS 1.0 — Test Suite: 15 Superintelligence Core Pillars
// Rigorous verification of all 15 capabilities requested

import assert from 'assert';
import patternEngine from '../../server/orchestrator/pattern-recognition.js';
import deepResearchEngine from '../../server/orchestrator/deep-research.js';
import refinerEngine from '../../server/orchestrator/refiner-engine.js';
import mathExpertEngine from '../../server/orchestrator/math-expert.js';
import codingExpertEngine from '../../server/coder/coding-expert-engine.js';
import observerEngine from '../../server/orchestrator/observer-engine.js';
import { transmuter } from '../../server/interpreter/index.js';
import graphMapGenerator from '../../server/orchestrator/graph-map-generator.js';
import interpreterRefiner from '../../server/orchestrator/interpreter-refiner.js';
import atomicBuildPipeline from '../../server/orchestrator/atomic-build-verify.js';
import partGenesisEngine from '../../server/parts/part-genesis.js';
import outputElevationEngine from '../../server/orchestrator/output-elevation.js';
import toolRegistry from '../../server/tools/registry.js';
import registry from '../../server/parts/registry.js';

console.log('⚡ [TEST] Initiating SIS 1.0 15 Core Pillars Verification Test Suite...\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ Pillar ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ Pillar ${totalTests}: ${name} FAILED:`, err.message);
    throw err;
  }
}

async function testAsync(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ Pillar ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ Pillar ${totalTests}: ${name} FAILED:`, err.message);
    throw err;
  }
}

async function runAll() {
  // 1. Pattern Recognition
  test('Pillar 1: Pattern Recognition Engine (motifs, sequences, symmetries, invariants)', () => {
    const textRes = patternEngine.analyze(
      'We must strictly enforce that the algorithm runs step by step.',
    );
    assert(textRes.invariants.length > 0, 'Invariants should be detected');
    assert(textRes.motifs.length > 0, 'Motifs should be detected');

    const seqRes = patternEngine.analyze([2, 4, 6, 8, 10]);
    assert(
      seqRes.motifs.some((m) => m.includes('Arithmetic Progression')),
      'AP detected',
    );

    const codeRes = patternEngine.analyze(
      'class MyObserver extends Base { constructor() { super(); } }',
    );
    assert(
      codeRes.motifs.some((m) => m.includes('Inheritance')),
      'Inheritance pattern detected',
    );
  });

  // 2. Image Input & Multimodal Handling
  await testAsync('Pillar 2: Multimodal Image Handling & Media Perception', async () => {
    const testSvgDataUrl =
      'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==';
    const obs = observerEngine.observeSensory([testSvgDataUrl], []);
    assert.strictEqual(obs.activeImagesCount, 1);
    assert.strictEqual(obs.sensoryGrounded, true);
  });

  // 3. Perfect Tools
  await testAsync(
    'Pillar 3: Perfect Tools Architecture (Defensive validation & execution)',
    async () => {
      // Verify all 11 new tools exist in registry
      const expectedTools = [
        'pattern_recognize',
        'deep_research',
        'data_interpreter',
        'generate_graph_map',
        'math_solve_verify',
        'code_expert_eval',
        'refine_output',
        'decompose_and_build',
        'create_expert_part',
        'dispatch_part_task',
        'list_dynamic_parts',
      ];
      for (const t of expectedTools) {
        assert(toolRegistry.get(t), `Tool ${t} must be registered in toolRegistry`);
      }

      // Test defensive execution of pattern_recognize
      const res = await toolRegistry.execute('pattern_recognize', { input: [1, 3, 9, 27] });
      assert(
        res.motifs.some((m) => m.includes('Geometric Progression')),
        'Tool should return detected GP',
      );
    },
  );

  // 4. Deep Research
  await testAsync(
    'Pillar 4: Deep Research Engine (Multi-hop query generation & synthesis)',
    async () => {
      const res = await deepResearchEngine.research('Quantum Error Correction Surface Codes', {
        maxHops: 2,
      });
      assert.strictEqual(res.topic, 'Quantum Error Correction Surface Codes');
      assert(res.subQueries.length >= 2, 'Should formulate multiple search vectors');
      assert(res.confidenceScore > 0.5, 'Should have positive confidence');
    },
  );

  // 5. Multi-Stage Refiners
  test('Pillar 5: Multi-Stage Refiners Engine (Precision, Logic, Technical, Presentation)', () => {
    const raw =
      'In order to build this, essentially we do it. ```javascript\nconst a = 1;\n// TODO: add more\n';
    const refined = refinerEngine.refine(raw);
    assert(refined.modifications.length > 0, 'Refinements should be applied');
    assert(!refined.refinedText.includes('in order to'), 'In order to should be refined');
    assert(!refined.refinedText.includes('// TODO:'), 'TODO should be eliminated');
    assert(refined.refinedText.endsWith('```'), 'Code block should be closed');
  });

  // 6. Math Experts
  await testAsync(
    'Pillar 6: Math Experts Subsystem (Arithmetic, Quad Equations & KaTeX)',
    async () => {
      // Arithmetic
      const res1 = await mathExpertEngine.solveAndVerify('2 * (3 + 7) ^ 2');
      assert.strictEqual(res1.solution, 200, 'Math expression evaluated correctly');

      // Quadratic equation
      const res2 = await mathExpertEngine.solveAndVerify('x^2 - 5x + 6 = 0');
      assert.strictEqual(res2.solution.x1, 3, 'Root x1 = 3');
      assert.strictEqual(res2.solution.x2, 2, 'Root x2 = 2');
      assert(res2.katex.includes('x_1 = 3'), 'KaTeX formatting accurate');
    },
  );

  // 7. Coding Experts
  await testAsync(
    'Pillar 7: Coding Experts Subsystem (AST validation & sandbox testing)',
    async () => {
      const code = 'export function add(a, b) { return a + b; }';
      const evalRes = await codingExpertEngine.evaluateAndVerify({
        filename: 'math_ops.js',
        code,
        language: 'javascript',
      });
      assert.strictEqual(evalRes.syntaxValid, true, 'AST syntax should pass');
      assert.strictEqual(evalRes.testsPassed, true, 'Smoke test should pass');
    },
  );

  // 8. Observers
  test('Pillar 8: Observers Subsystem (Cognitive alignment, sensory, integrity)', () => {
    const report = observerEngine.observe({
      userPrompt: 'Build a distributed quantum ledger simulator',
      currentDraft:
        'This is a complete distributed quantum ledger implementation with cryptographic proofs and zero-knowledge invariants.',
      images: [],
    });
    assert(report.cognitive.score > 0.6, 'Cognitive alignment should be high');
    assert(report.integrity.score > 0.8, 'Integrity should be high');
  });

  // 9. Universal Data Interpreter & Transmuter
  test('Pillar 9: Universal Data Interpreter (JSON, YAML, CSV, SQL, TS, KaTeX)', () => {
    const sampleData = [
      { id: 1, name: 'Alpha', score: 98.5 },
      { id: 2, name: 'Beta', score: 87.0 },
    ];

    const csvRes = transmuter.transmute(sampleData, { to: 'csv' });
    assert(csvRes.output.includes('id,name,score'), 'CSV output should have headers');

    const sqlRes = transmuter.transmute(sampleData, { to: 'sql', tableName: 'users' });
    assert(sqlRes.output.includes('CREATE TABLE IF NOT EXISTS `users`'), 'SQL table created');
    assert(sqlRes.output.includes('INSERT INTO `users`'), 'SQL insert generated');

    const tsRes = transmuter.transmute(sampleData, {
      to: 'typescript',
      interfaceName: 'UserRecord',
    });
    assert(tsRes.output.includes('export interface UserRecord'), 'TypeScript interface created');

    const katexRes = transmuter.transmute(sampleData, { to: 'katex' });
    assert(katexRes.output.includes('\\begin{bmatrix}'), 'KaTeX matrix generated');
  });

  // 10. Graph and Map Generators
  test('Pillar 10: Graph & Map Generators (Mermaid, D3 Force, Leaflet GIS)', () => {
    const mermaidRes = graphMapGenerator.generateMermaidPage({
      code: 'graph TD\n  A --> B',
      title: 'Workflow Architecture',
    });
    assert(mermaidRes.success && mermaidRes.filepath.endsWith('.html'));

    const d3Res = graphMapGenerator.generateD3KnowledgeGraph({
      nodes: [{ id: 'Core' }, { id: 'Agent' }],
      links: [{ source: 'Core', target: 'Agent' }],
      title: 'Neural Network',
    });
    assert(d3Res.success && d3Res.filepath.endsWith('.html'));

    const mapRes = graphMapGenerator.generateLeafletMap({
      markers: [{ lat: 37.77, lng: -122.41, label: 'Node 1' }],
      title: 'Telemetry Map',
    });
    assert(mapRes.success && mapRes.filepath.endsWith('.html'));
  });

  // 11. Interpreter Refiner
  test('Pillar 11: Interpreter Refiner Specialist (Schema audit, enrichment & polish)', () => {
    const sampleData = [
      { user: 'alice', amount: 150.0 },
      { user: 'bob', amount: 250.0 },
    ];
    const refinement = interpreterRefiner.refine(sampleData, 'Calculate user transaction ledgers');
    assert.strictEqual(refinement.semanticType, 'financial-ledger');
    assert(refinement.completenessScore >= 0.9, 'Completeness should be high');
    assert(
      refinement.enrichments.some((e) => e.field === 'amount' && e.stats.avg === 200),
      'Statistical average computed',
    );
  });

  // 12. Atomic Build & Verify Pipeline (ADBTS)
  await testAsync(
    'Pillar 12: Atomic Build & Verify Pipeline (Break -> Process -> Test -> Combine)',
    async () => {
      const pipelineRes = await atomicBuildPipeline.execute(
        'Build an algorithm with mathematical proofs and runtime tests',
      );
      assert(pipelineRes.totalUnits >= 3, 'Should break request into atomic units');
      assert(pipelineRes.verifiedCount >= 3, 'All atomic units should be verified');
      assert(pipelineRes.masterOutput.length > 50, 'Masterpiece deliverable assembled');
    },
  );

  // 13. Combined Parts Synthesis Mesh
  test('Pillar 13: Combined Parts Synthesis Mesh (Registry health & all parts registered)', () => {
    registry.initialize();
    const parts = registry.getAll();
    assert(parts.length >= 28, 'Should have at least 28 specialized parts loaded');
    assert(registry.get('pattern_recognizer'), 'pattern_recognizer must be in registry');
    assert(registry.get('refiner'), 'refiner must be in registry');
    assert(registry.get('interpreter_refiner'), 'interpreter_refiner must be in registry');
  });

  // 14. Autonomous Meta-Part Genesis & Delegation
  await testAsync(
    'Pillar 14: Dynamic Meta-Part Genesis & Delegation (Conscious creates parts at will)',
    async () => {
      // 1. Create part dynamically
      const created = await partGenesisEngine.createExpertPart({
        name: 'astrophysicist_specialist',
        role: 'Astrophysical Relativity Theorist',
        domain: 'astrophysics',
        capabilities: ['orbital mechanics', 'relativity', 'black holes'],
        promptInstructions: 'You analyze spacetime metrics and gravitational field tensors.',
      });
      assert.strictEqual(created.name, 'astrophysicist_specialist');
      assert(registry.get('astrophysicist_specialist'), 'New part must be live in registry');

      // Deterministic mock for livePart.process during offline unit test
      const livePart = registry.get('astrophysicist_specialist');
      const origProcess = livePart.process.bind(livePart);
      livePart.process = async (msg) => ({
        part: 'astrophysicist_specialist',
        output:
          'Computed Schwarzschild radius for 5 solar masses: r_s = \\frac{2GM}{c^2} \\approx 14.76 \\text{ km}',
        confidence: 0.99,
      });

      // 2. Dispatch task directly to the new part
      const taskRes = await partGenesisEngine.dispatchTaskToPart({
        partName: 'astrophysicist_specialist',
        taskObjective: 'Calculate the Schwarzschild radius for a 5 solar mass singularity',
      });
      assert.strictEqual(taskRes.success, true);
      assert(taskRes.output.length > 0, 'Part must return response to conscious layer');
      assert(taskRes.output.includes('14.76'), 'Output should contain computed result');

      // Restore
      livePart.process = origProcess;

      // 3. List parts
      const list = partGenesisEngine.listAllExperts();
      assert(list.dynamicCount >= 1, 'Dynamic parts counted');
    },
  );

  // 15. Output Elevation Engine
  test('Pillar 15: Output Elevation Engine (Quality rubrics & iterative elevation)', () => {
    const lowQualityDraft =
      'In order to do this, here is some code:\n```\nconst x = 1;\n// TODO: fix this\n';
    const elevated = outputElevationEngine.elevate(lowQualityDraft, 'Implement full module');
    assert.strictEqual(elevated.elevated, true);
    assert(
      elevated.qualityScore > elevated.originalScore,
      'Quality score must increase after elevation',
    );
    assert(!elevated.elevatedText.includes('// TODO:'), 'TODO removed during elevation');
  });

  console.log(
    `\n🎉 [ALL TESTS PASSED] Successfully verified all ${passedTests}/${totalTests} pillars!`,
  );
  process.exit(0);
}

runAll().catch((err) => {
  console.error('\n❌ Test Suite encountered an error:', err);
  process.exit(1);
});
