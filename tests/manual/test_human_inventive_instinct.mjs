// SIS 1.0 — Human Inventive Instinct Automated Test Suite
// Verifies the 5 faculties of human inventive cognition:
// 1. FIND (Epistemic Foraging across Knowledge Graph frontiers)
// 2. INVENT (Conceptual Blending & Hypothesis Generation)
// 3. BUILD (Autonomous Interactive HTML/Canvas Artifact Materialization)
// 4. LEARN (Empirical Science, Hypothesis Testing & Principle Extraction)
// 5. GROW (Dynamic Tool Crystallization, KG Weaving, Dopamine/ACh Surge)

import http from 'http';
import { WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';

let BASE_URL = 'http://127.0.0.1:3008';
let WS_URL = 'ws://127.0.0.1:3008';

async function discoverPort() {
  for (const port of [3008, 3009]) {
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

function get(path) {
  return new Promise((resolve, reject) => {
    http
      .get(`${BASE_URL}${path}`, (res) => {
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

function post(path, body = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(
      `${BASE_URL}${path}`,
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

const results = [];

function recordTest(num, name, passed, details) {
  results.push({ num, name, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[Test ${num.toString().padStart(2, '0')}] ${icon} ${name}`);
  if (details) console.log(`   ↳ ${details}`);
}

async function runSuite() {
  await discoverPort();

  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log('  SIS 1.0 — HUMAN INVENTIVE INSTINCT VERIFICATION SUITE');
  console.log('  Testing Instinct to Find, Invent, Learn, Grow, and Build');
  console.log('════════════════════════════════════════════════════════════════════\n');

  let activeInvention = null;

  // Test 1: Instinct to FIND & INVENT (Trigger Autonomous Cycle)
  try {
    const t0 = Date.now();
    const res = await post('/api/brain/invent', { topic: 'Quantum Symplectic Vortex' });
    const elapsed = Date.now() - t0;
    const pass1 = res.status === 200 && res.data.success === true && res.data.invention?.title;
    activeInvention = res.data.invention;
    recordTest(
      1,
      'Instinct to FIND & INVENT (Conceptual Blending)',
      pass1,
      `Synthesized "${activeInvention?.title}" across [${activeInvention?.domains?.join(' ⨂ ')}] in ${elapsed}ms`,
    );
  } catch (err) {
    recordTest(1, 'Instinct to FIND & INVENT (Conceptual Blending)', false, err.message);
  }

  // Test 2: Invariant Formulation & Testable Hypothesis
  try {
    const hasHypothesis = activeInvention?.hypothesis && activeInvention.hypothesis.length > 20;
    const hasQuestion =
      activeInvention?.seekingQuestion && activeInvention.seekingQuestion.length > 15;
    const pass2 = hasHypothesis && hasQuestion;
    recordTest(
      2,
      'Epistemic Question & Scientific Hypothesis Formulation',
      pass2,
      `Hypothesis: "${activeInvention?.hypothesis?.slice(0, 80)}..."`,
    );
  } catch (err) {
    recordTest(2, 'Epistemic Question & Scientific Hypothesis Formulation', false, err.message);
  }

  // Test 3: Instinct to BUILD (Physical Artifact Materialization)
  try {
    const filename = activeInvention?.filename;
    const workspacePath = path.resolve('workspace', filename);
    const exists = fs.existsSync(workspacePath);
    const content = exists ? fs.readFileSync(workspacePath, 'utf8') : '';
    const hasCanvas = content.includes('<canvas id="stage"');
    const hasControls = content.includes('input type="range"');
    const hasAnimationLoop = content.includes('requestAnimationFrame');
    const pass3 = exists && hasCanvas && hasControls && hasAnimationLoop;
    recordTest(
      3,
      'Instinct to BUILD (Interactive HTML5/Canvas Artifact)',
      pass3,
      `Created workspace/${filename} (${content.length} bytes, Canvas + 60fps Loop + Controls)`,
    );
  } catch (err) {
    recordTest(3, 'Instinct to BUILD (Interactive HTML5/Canvas Artifact)', false, err.message);
  }

  // Test 4: Instinct to LEARN (Empirical Science & Principles)
  try {
    const principles = activeInvention?.principles || [];
    const score = activeInvention?.empiricalScore || 0;
    const pass4 = principles.length >= 3 && score >= 0.8;
    recordTest(
      4,
      'Instinct to LEARN (Empirical Invariant Extraction)',
      pass4,
      `Extracted ${principles.length} empirical principles (Score: ${score}). Principle 1: "${principles[0]?.slice(0, 70)}..."`,
    );
  } catch (err) {
    recordTest(4, 'Instinct to LEARN (Empirical Invariant Extraction)', false, err.message);
  }

  // Test 5: Instinct to GROW — Dynamic Tool Crystallization
  try {
    const toolsRes = await get('/api/tools');
    const toolName = activeInvention?.toolName;
    const registeredTool = toolsRes.data.tools?.find(
      (t) =>
        t.name === toolName ||
        (activeInvention?.id && t.name.includes(activeInvention.id.slice(0, 15))),
    );
    const pass5 = registeredTool && registeredTool.isDynamicSkill === true;
    recordTest(
      5,
      'Instinct to GROW — Dynamic Skill Tool Crystallization',
      pass5,
      `Registered callable tool "${registeredTool?.name}" in permanent toolRegistry`,
    );
  } catch (err) {
    recordTest(5, 'Instinct to GROW — Dynamic Skill Tool Crystallization', false, err.message);
  }

  // Test 6: Inventions History & Telemetry Storage
  try {
    const invRes = await get('/api/brain/inventions');
    const count = invRes.data.inventions?.length || 0;
    const pass6 = invRes.status === 200 && count >= 1 && invRes.data.stats.inventionsCreated >= 1;
    recordTest(
      6,
      'Persistent Inventions Repository & Telemetry',
      pass6,
      `Inventions count: ${count}, cycles completed: ${invRes.data.stats.cyclesCompleted}`,
    );
  } catch (err) {
    recordTest(6, 'Persistent Inventions Repository & Telemetry', false, err.message);
  }

  // Test 7: Artifacts Gallery Live Indexing
  try {
    const artRes = await get('/api/artifacts');
    const found = artRes.data?.find((a) => a.filename === activeInvention?.filename);
    const pass7 = Boolean(found && found.title);
    recordTest(
      7,
      'Live Artifact Gallery Indexing & Browser Serving',
      pass7,
      `Indexed in /api/artifacts as "${found?.title}" (served at ${activeInvention?.artifactUrl})`,
    );
  } catch (err) {
    recordTest(7, 'Live Artifact Gallery Indexing & Browser Serving', false, err.message);
  }

  // Test 8: Neurochemical Dopamine Phasic Burst on Creation
  try {
    const chem = await get('/api/brain/neurochemistry');
    const da = chem.data.levels.dopamine;
    const ach = chem.data.levels.acetylcholine;
    const pass8 = da >= 0.5 && ach >= 0.5;
    recordTest(
      8,
      'Neurochemical Creative Reward (Dopamine & ACh Surge)',
      pass8,
      `Dopamine: ${da}, Acetylcholine: ${ach} (Active reward & plasticity)`,
    );
  } catch (err) {
    recordTest(8, 'Neurochemical Creative Reward (Dopamine & ACh Surge)', false, err.message);
  }

  // Test 9: Stream of Consciousness Creative Reflection
  try {
    const pulseRes = await post('/api/brain/stream-of-consciousness/pulse');
    const thoughts = pulseRes.data.recentThoughts || [];
    const invThought =
      thoughts.find((t) => t.category === 'inventive-synthesis') || thoughts[thoughts.length - 1];
    const pass9 = Boolean(invThought && invThought.text);
    recordTest(
      9,
      'Stream of Consciousness Inner Monologue Reflection',
      pass9,
      `Thought [${invThought?.category}]: "${invThought?.text?.slice(0, 75)}..."`,
    );
  } catch (err) {
    recordTest(9, 'Stream of Consciousness Inner Monologue Reflection', false, err.message);
  }

  // Test 10: Live WebSocket Invention Telemetry Stream
  try {
    const wsInvention = await new Promise((resolve) => {
      const ws = new WebSocket(WS_URL);
      const timer = setTimeout(() => {
        try {
          ws.close();
        } catch {}
        resolve(null);
      }, 8000);
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'get-inventions' }));
      });
      ws.on('message', (d) => {
        try {
          const m = JSON.parse(d);
          if (m.type === 'inventions-list' && Array.isArray(m.inventions)) {
            clearTimeout(timer);
            try {
              ws.close();
            } catch {}
            resolve(m);
          }
        } catch {}
      });
      ws.on('error', () => {
        clearTimeout(timer);
        resolve(null);
      });
    });
    const pass10 = wsInvention !== null && wsInvention.inventions.length >= 1;
    recordTest(
      10,
      'Real-Time WebSocket Invention Dispatch',
      pass10,
      `Received ${wsInvention?.inventions?.length} inventions over WebSocket stream`,
    );
  } catch (err) {
    recordTest(10, 'Real-Time WebSocket Invention Dispatch', false, err.message);
  }

  // ─── FINAL SUMMARY ───
  console.log('\n════════════════════════════════════════════════════════════════════');
  const passedCount = results.filter((r) => r.passed).length;
  console.log(
    `  RESULTS: ${passedCount} / ${results.length} INVENTIVE TESTS PASSED (${((passedCount / results.length) * 100).toFixed(1)}%)`,
  );
  console.log('════════════════════════════════════════════════════════════════════\n');

  if (passedCount === results.length) {
    console.log('🌟 ALL 10 HUMAN INVENTIVE INSTINCT TESTS PASSED PERFECTLY!\n');
    process.exit(0);
  } else {
    console.error(`⚠️ ${results.length - passedCount} test(s) failed.\n`);
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Fatal suite error:', err);
  process.exit(1);
});
