// SIS 1.0 — Human Behavior & Cognitive Neuroscience Roots Automated Test Suite
// Verifies the authentic human faculties of Seeing, Observing, Learning, Building, and Behaving:
// 1. SEE & OBSERVE (Active Saccadic Attention, Foveal/Peripheral, Dual Visual Streams, Predictive Discrepancies)
// 2. LEARN (Mirror Neurons, Piagetian Assimilation/Accommodation, STDP Synaptic Neuroplasticity)
// 3. BUILD (Visuo-spatial Forward Model Simulation & Closed-Loop Visual Feedback Refinement)
// 4. BEHAVE & COMMUNICATE (Theory of Mind Mentalizing, Affective Valence, Gricean Pragmatics)

import http from 'http';
import { WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import humanVisionObserver from '../../server/orchestrator/human-vision-observer.js';
import humanLearningEngine from '../../server/orchestrator/human-learning-engine.js';
import humanBuilderFeedback from '../../server/orchestrator/human-builder-feedback.js';
import theoryOfMind from '../../server/orchestrator/theory-of-mind.js';

let BASE_URL = 'http://127.0.0.1:3008';
let WS_URL = 'ws://127.0.0.1:3008';

async function discoverPort() {
  for (const port of [3008, 3009, 3001]) {
    try {
      const res = await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${port}/api/brain/state`, (r) =>
          resolve(r.statusCode),
        );
        req.on('error', reject);
        setTimeout(() => reject(new Error('timeout')), 1500);
      });
      if (res === 200) {
        BASE_URL = `http://127.0.0.1:${port}`;
        WS_URL = `ws://127.0.0.1:${port}`;
        console.log(`[Test] Connected to live SIS 1.0 server on port ${port}`);
        return port;
      }
    } catch {}
  }
  return 3008;
}

function get(reqPath) {
  return new Promise((resolve, reject) => {
    http
      .get(`${BASE_URL}${reqPath}`, (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(d) });
          } catch {
            resolve({ status: res.statusCode, raw: d });
          }
        });
      })
      .on('error', reject);
  });
}

function post(reqPath, body = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(
      `${BASE_URL}${reqPath}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(d) });
          } catch {
            resolve({ status: res.statusCode, raw: d });
          }
        });
      },
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

const sampleArtifactHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Quantum Wave Visualizer</title>
  <style>
    body { background: #0c0d12; color: #f0f2f5; font-family: sans-serif; }
    canvas { width: 100%; height: 400px; display: block; }
    .btn { background: #3b82f6; color: white; padding: 8px 16px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Quantum Waveform Simulation</h1>
  <canvas id="waveCanvas"></canvas>
  <button id="oscillateBtn" class="btn" onclick="toggleWave()">Oscillate</button>
  <input type="range" id="frequency" min="1" max="100" value="44" />
  <script>
    function toggleWave() {
      const canvas = document.getElementById('waveCanvas');
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(0, 0, 100, 100);
    }
  </script>
</body>
</html>`;

const brokenArtifactHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Broken Component</title>
  <style>
    body { background: #ff00ff; color: #00ffff; }
  </style>
</head>
<body>
  <h1>TODO Implement Later</h1>
  <canvas id="blankCanvas"></canvas>
  <!-- Button with no handler -->
  <button>Click Here</button>
  <p>Lorem ipsum dolor sit amet...</p>
</body>
</html>`;

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  SIS 1.0 — HUMAN BEHAVIOR & COGNITIVE NEUROSCIENCE TEST SUITE');
  console.log('  15 Rigorous Tests: See, Observe, Learn, Build, and Behave');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  await discoverPort();

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${testName} ${detail ? `(${detail})` : ''}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName} ${detail ? `[${detail}]` : ''}`);
      failed++;
    }
  }

  // ─── 1. Saccadic Foveation & Scanpaths ───
  try {
    const scan = humanVisionObserver._performSaccadicScan(sampleArtifactHtml, 'inspect');
    assert(
      Array.isArray(scan.scanpath) && scan.scanpath.length > 0 && scan.primaryFocus !== null,
      'Test 1: Active Visual Saccadic Scanpath Generation',
      `Fixations: ${scan.scanpath.length}, Primary Focus Line: ${scan.primaryFocus?.lineNumber}`,
    );
  } catch (e) {
    assert(false, 'Test 1: Active Visual Saccadic Scanpath Generation', e.message);
  }

  // ─── 2. Foveal vs Peripheral Field Differentiation ───
  try {
    const obs = humanVisionObserver.observeTarget({
      target: sampleArtifactHtml,
      type: 'code',
      intent: 'inspect',
    });
    const hasFoveal = obs.foveal?.primaryFocus?.salience > 0.5;
    const pClusters = obs.foveal?.peripheralOverview?.peripheralClusters || [];
    const hasPeripheral = Array.isArray(pClusters) && pClusters.length > 0;
    assert(
      hasFoveal && hasPeripheral,
      'Test 2: Foveal (High Salience) vs Peripheral (Context) Differentiation',
      `Fovea Salience: ${obs.foveal?.primaryFocus?.salience}, Peripheral Clusters: ${pClusters.length}`,
    );
  } catch (e) {
    assert(false, 'Test 2: Foveal vs Peripheral Field Differentiation', e.message);
  }

  // ─── 3. Ventral Stream ("What") Semantic Archetype ───
  try {
    const obs = humanVisionObserver.observeTarget({
      target: sampleArtifactHtml,
      type: 'code',
      intent: 'inspect',
    });
    const ventral = obs.ventral;
    const isRich = ventral && ventral.visualArchetype && ventral.colorPalette?.isDarkTheme;
    assert(
      isRich && ventral.hasCanvas,
      'Test 3: Dual-Stream Ventral ("What") Semantic Archetype & Form Processing',
      `Archetype: ${ventral?.visualArchetype}, DarkTheme: ${ventral?.colorPalette?.isDarkTheme}`,
    );
  } catch (e) {
    assert(false, 'Test 3: Dual-Stream Ventral Stream Processing', e.message);
  }

  // ─── 4. Dorsal Stream ("Where/How") Affordance Identification ───
  try {
    const obs = humanVisionObserver.observeTarget({
      target: sampleArtifactHtml,
      type: 'code',
      intent: 'affordance',
    });
    const dorsal = obs.dorsal;
    const hasButtons = dorsal.affordances.some(
      (a) => a.type === 'button' || a.subType === 'discrete-button',
    );
    const hasInputs = dorsal.affordances.some(
      (a) => a.type === 'slider' || a.subType === 'continuous-slider',
    );
    assert(
      hasButtons && hasInputs && dorsal.affordancesCount >= 2,
      'Test 4: Dual-Stream Dorsal ("Where/How") Interactive Affordance Extraction',
      `Affordances Found: ${dorsal?.affordancesCount} (${dorsal?.interactiveDensity} density)`,
    );
  } catch (e) {
    assert(false, 'Test 4: Dual-Stream Dorsal Affordance Identification', e.message);
  }

  // ─── 5. Visual Predictive Coding Discrepancy & Defect Detection ───
  try {
    const brokenObs = humanVisionObserver.observeTarget({
      target: brokenArtifactHtml,
      type: 'code',
      intent: 'inspect',
    });
    const healthyObs = humanVisionObserver.observeTarget({
      target: sampleArtifactHtml,
      type: 'code',
      intent: 'inspect',
    });
    const detectsDefects =
      brokenObs.discrepancy.defects.length > 0 &&
      brokenObs.discrepancy.score > healthyObs.discrepancy.score;
    assert(
      detectsDefects && !brokenObs.discrepancy.isHarmonious,
      'Test 5: Visual Predictive Coding Discrepancy Detection & Anomaly Scoring',
      `Broken Discrepancy: ${brokenObs.discrepancy.score}, Defects: ${brokenObs.discrepancy.defects.length}`,
    );
  } catch (e) {
    assert(false, 'Test 5: Visual Predictive Coding Discrepancy', e.message);
  }

  // ─── 6. Live REST API Observer State & Scan Endpoints ───
  try {
    const stateRes = await get('/api/brain/observer');
    const scanRes = await post('/api/brain/observer/scan', {
      target: sampleArtifactHtml,
      type: 'code',
      intent: 'aesthetic',
    });
    assert(
      stateRes.status === 200 && scanRes.status === 200 && scanRes.data?.success === true,
      'Test 6: REST API Visual Observer Gaze & Saccadic Scan Endpoints',
      `Status: ${stateRes.status}/${scanRes.status}, Observations Count: ${stateRes.data?.stats?.totalObservations}`,
    );
  } catch (e) {
    assert(false, 'Test 6: REST API Visual Observer Endpoints', e.message);
  }

  // ─── 7. Mirror Neuron System: Human Demonstration Intent Inference ───
  try {
    const mirrorRes = await post('/api/brain/human-learning/mirror', {
      demonstration: 'User builds a canvas shader and adjusts viscosity slider to 80%',
    });
    const inf = mirrorRes.data?.inference;
    assert(
      mirrorRes.status === 200 &&
        inf &&
        (inf.targetDomain === 'creation' || inf.inferredIntent.includes('tactile')) &&
        inf.emulationConfidence > 0.6,
      'Test 7: Mirror Neuron System: Action & Intent Inference from Demonstration',
      `Inferred Goal: "${inf?.inferredGoal}", Confidence: ${inf?.emulationConfidence}`,
    );
  } catch (e) {
    assert(false, 'Test 7: Mirror Neuron Intent Inference', e.message);
  }

  // ─── 8. Mirror Neuron System: Motor Emulation Subroutines ───
  try {
    const mirror = humanLearningEngine.mirrorNeuronObserve({
      demonstration:
        'const canvas = document.createElement("canvas"); document.body.appendChild(canvas);',
    });
    assert(
      Array.isArray(mirror.motorSubroutines) && mirror.motorSubroutines.length > 0,
      'Test 8: Mirror Neuron Emulation Plan & Motor Subroutine Synthesis',
      `Subroutines synthesized: ${mirror.motorSubroutines.join(' ➔ ')}`,
    );
  } catch (e) {
    assert(false, 'Test 8: Mirror Neuron Motor Emulation Synthesis', e.message);
  }

  // ─── 9. Piagetian Assimilation (Low Cognitive Surprise Equilibrium) ───
  try {
    const adaptRes = await post('/api/brain/human-learning/adapt', {
      observation: 'Consistent matrix multiplication speedup observed using Float32Array arrays',
      domain: 'computation',
      surpriseLevel: 0.12,
    });
    const adapt = adaptRes.data?.adaptation;
    assert(
      adaptRes.status === 200 &&
        adapt &&
        adapt.type === 'assimilation' &&
        adapt.equilibriumPreserved === true,
      'Test 9: Piagetian Constructivism: Assimilation into Existing Schemas',
      `Adaptation Type: ${adapt?.type}, Schema Name: "${adapt?.schema?.name}"`,
    );
  } catch (e) {
    assert(false, 'Test 9: Piagetian Assimilation', e.message);
  }

  // ─── 10. Piagetian Accommodation (High Surprise Schema Restructuring) ───
  try {
    const adaptRes = await post('/api/brain/human-learning/adapt', {
      observation:
        'Quantum superposition fundamentally breaks deterministic classical state-machine assumptions',
      domain: 'quantum-physics',
      surpriseLevel: 0.88,
    });
    const adapt = adaptRes.data?.adaptation;
    assert(
      adaptRes.status === 200 &&
        adapt &&
        adapt.type === 'accommodation' &&
        adapt.schemaRestructured === true,
      'Test 10: Piagetian Constructivism: Accommodation Restructuring Under Surprise',
      `Adaptation Type: ${adapt?.type}, Restructured: ${adapt?.schemaRestructured}, Revision: ${adapt?.schema?.revision}`,
    );
  } catch (e) {
    assert(false, 'Test 10: Piagetian Accommodation', e.message);
  }

  // ─── 11. Neuroplasticity: STDP Synaptic Association Modulation ───
  try {
    const stdpRes = humanLearningEngine.applySTDP(
      'pre-synaptic-stimulus',
      'post-synaptic-firing',
      12,
    );
    assert(
      stdpRes && stdpRes.associationWeight > 0.5 && stdpRes.deltaWeight > 0,
      'Test 11: Synaptic Plasticity: Spike-Timing-Dependent Plasticity (STDP) LTP Potentiation',
      `Association Weight: ${stdpRes?.associationWeight?.toFixed(3)}, ΔW: +${stdpRes?.deltaWeight?.toFixed(3)}`,
    );
  } catch (e) {
    assert(false, 'Test 11: Synaptic Plasticity STDP', e.message);
  }

  // ─── 12. Embodied Builder: Visuo-Spatial Forward Model Simulation ───
  try {
    const blueprint = {
      title: 'Neural Oscillations Canvas',
      category: 'visualization',
      aestheticArchetype: 'dark-tactical',
    };
    const forwardSim = humanBuilderFeedback.simulateForwardModel(blueprint);
    assert(
      forwardSim && forwardSim.mentalImage !== null && forwardSim.estimatedAffordanceCount >= 2,
      'Test 12: Embodied Builder: Visuo-Spatial Forward Model Mental Simulation',
      `Mental Layout: "${forwardSim?.mentalImage?.layout}", Affordances: ${forwardSim?.estimatedAffordanceCount}`,
    );
  } catch (e) {
    assert(false, 'Test 12: Embodied Builder Forward Simulation', e.message);
  }

  // ─── 13. Embodied Builder: Closed-Loop Perceptual Feedback & Visual Correction ───
  try {
    const buildRes = await post('/api/brain/human-builder/build', {
      blueprint: {
        title: 'Tactical Cyber HUD',
        category: 'interface',
        domain: 'systems',
      },
      filename: 'test_tactical_hud.html',
      template: sampleArtifactHtml,
    });
    const buildData = buildRes.data;
    assert(
      buildRes.status === 200 &&
        buildData.success === true &&
        buildData.iterations >= 1 &&
        buildData.discrepancyScore !== undefined,
      'Test 13: Closed-Loop Perceptual-Motor Build with Visual Discrepancy Correction',
      `Iterations: ${buildData?.iterations}, Final Discrepancy: ${buildData?.discrepancyScore}, Artifact: ${buildData?.filename}`,
    );
  } catch (e) {
    assert(false, 'Test 13: Closed-Loop Perceptual Feedback', e.message);
  }

  // ─── 14. Theory of Mind: Latent Mental State & Affective Valence Inference ───
  try {
    const tomRes = await post('/api/brain/tom/infer', {
      message:
        'Can you study how humans see and build, and make the brain behave with authentic roots? It is critical that we verify with tests.',
    });
    const ms = tomRes.data?.mentalState;
    assert(
      tomRes.status === 200 && ms && ms.knowledgeLevel === 'architect' && ms.affectiveValence > 0.5,
      'Test 14: Theory of Mind: User Goal, Expertise, and Affective Valence Inference',
      `Goal: "${ms?.inferredGoal?.slice(0, 45)}...", Level: ${ms?.knowledgeLevel}, Valence: ${ms?.affectiveValence}`,
    );
  } catch (e) {
    assert(false, 'Test 14: Theory of Mind Mental State Inference', e.message);
  }

  // ─── 15. Theory of Mind & Waking Monologue Pragmatic Integration ───
  try {
    const tomState = await get('/api/brain/tom');
    const brainState = await get('/api/brain/state');
    const guidelines = theoryOfMind.getPragmaticGuidelines();
    const hasStream =
      brainState.data?.streamOfConsciousness?.stats !== undefined ||
      brainState.data?.streamOfConsciousness?.active !== undefined;
    const hasMaxims = Boolean(
      guidelines.griceanMaxims?.manner && guidelines.griceanMaxims?.quantity,
    );

    assert(
      tomState.status === 200 && hasStream && hasMaxims,
      'Test 15: Gricean Pragmatics Calibration & Waking Stream of Consciousness Harmony',
      `Pragmatic Alignments: ${tomState.data?.stats?.pragmaticAlignments}, Maxims calibrated: Quantity/Quality/Relation/Manner`,
    );
  } catch (e) {
    assert(false, 'Test 15: Theory of Mind & Pragmatic Integration', e.message);
  }

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log(`  TEST RESULTS: ${passed}/15 Passed (${failed} Failed)`);
  console.log('═══════════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error('[FATAL] Test runner uncaught exception:', err);
  process.exit(1);
});
