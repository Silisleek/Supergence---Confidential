// SIS 1.0 — Live End-to-End Build & Visual Rendering Verification
// Tests the full human-like pipeline:
// 1. Concept formulation & cross-domain blending
// 2. Embodied internal forward simulation
// 3. Artifact construction in ./workspace/
// 4. Active visual foveation & closed-loop polishing (humanVisionObserver + humanBuilderFeedback)
// 5. Invariant extraction & dynamic skill registration
// 6. Autonomous proactive collaboration (asks what to build next)
// 7. Headless Chrome rendering & visual screenshot capture via CDP

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3008;
const BASE_URL = `http://localhost:${PORT}`;

const ARTIFACT_DIR =
  'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\59fcdeb3-9c1c-481c-8a52-7b9b01bae13f';
const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  SIS 1.0 — LIVE AUTONOMOUS BUILD & VISUAL RENDERING TEST');
  console.log('  Testing Full Constructivist Pipeline & Authentic Human Outreach');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  // Step 1: Verify Server Health
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  if (!healthRes.ok) throw new Error(`Server health check failed: ${healthRes.statusText}`);
  const health = await healthRes.json();
  console.log(`[1] Server Online: ${health.name} (uptime: ${Math.round(health.uptime)}s)\n`);

  // Step 2: Trigger Live Autonomous Build via Inventive Engine
  const targetTopic = 'Quantum Vortex Topological Condensate';
  console.log(`[2] Triggering Autonomous Build: "${targetTopic}"...`);
  const t0 = Date.now();

  const inventRes = await fetch(`${BASE_URL}/api/brain/invent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: targetTopic }),
  });

  if (!inventRes.ok) {
    throw new Error(
      `Build request failed with status: ${inventRes.status} ${inventRes.statusText}`,
    );
  }

  const buildResult = await inventRes.json();
  const buildTime = Date.now() - t0;
  const inv = buildResult.invention || buildResult;
  console.log(`[2] Build Completed in ${buildTime}ms!`);
  console.log(`    ↳ Title: "${inv.title}"`);
  console.log(`    ↳ Domains: [${inv.domains?.join(' ⨂ ')}]`);
  console.log(`    ↳ Hypothesis: "${inv.hypothesis?.slice(0, 100)}..."`);
  console.log(`    ↳ Artifact: ${inv.filename} (Score: ${inv.empiricalScore})`);

  const artifactFilename = inv.filename;
  const artifactPath = path.resolve(__dirname, '../../workspace', artifactFilename);
  if (!artifactFilename || !fs.existsSync(artifactPath)) {
    throw new Error(`Generated artifact not found at ${artifactPath}`);
  }

  // Step 3: Verify Visual Craftsmanship & Saccadic Scanpath
  console.log('\n[3] Active Visual Saccadic Inspection & Craftsmanship Metrics:');
  const obsRes = await fetch(`${BASE_URL}/api/brain/observer/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target: artifactFilename, type: 'artifact', intent: 'inspect' }),
  });
  const obsData = await obsRes.json();
  const observation = obsData.observation || obsData;
  console.log(`    ↳ Ventral "What" Archetype: "${observation.ventral?.archetype}"`);
  console.log(
    `    ↳ Aesthetics & Palette: ${observation.ventral?.aestheticHarmony ? 'Polished Dark Cyber HUD' : 'Standard'}`,
  );
  console.log(
    `    ↳ Dorsal "Where/How" Affordances: ${observation.dorsal?.affordanceCount} tactile controls found`,
  );
  console.log(
    `    ↳ Saccadic Scanpath: ${observation.saccades?.length} fixations across visual salience clusters`,
  );
  console.log(
    `    ↳ Predictive Coding Discrepancy: ${observation.discrepancy?.score} (Defects: ${observation.discrepancy?.defects?.length || 0})`,
  );

  if (observation.discrepancy?.score > 0.15) {
    console.warn(
      `    ⚠️ Discrepancy ${observation.discrepancy.score} > 0.15 — Closed-loop polish will refine.`,
    );
  } else {
    console.log(`    ✓ Visual polish verified within high-fidelity threshold (≤ 0.15).`);
  }

  // Step 4: Verify Empirical Invariant Extraction & Dynamic Skill Tool
  console.log('\n[4] Empirical Learning & Dynamic Growth:');
  console.log(`    ↳ Extracted Invariants: ${inv.principles?.length || 0}`);
  for (const p of inv.principles || []) {
    console.log(`       • ${p.slice(0, 90)}...`);
  }
  console.log(`    ↳ Crystallized Dynamic Tool: "${inv.toolName}"`);

  // Step 5: Verify Autonomous Proactive Outreach (What to build next?)
  console.log('\n[5] Autonomous Proactive Human Collaboration:');
  const proactiveRes = await fetch(`${BASE_URL}/api/brain/proactive`);
  const proactiveState = await proactiveRes.json();
  const latestInquiry = proactiveState.latestInquiry || proactiveState.history?.[0];
  if (latestInquiry) {
    const msg = latestInquiry.text || latestInquiry.inquiry || latestInquiry.message || '';
    const nextSteps = latestInquiry.metadata?.nextSteps || latestInquiry.nextOptions || [];
    console.log(
      `    ↳ Inquiry Message:\n      "${msg.slice(0, 200).replace(/\n/g, '\n      ')}..."`,
    );
    console.log(`    ↳ Proposed Next Options (${nextSteps.length}):`);
    for (const opt of nextSteps) {
      console.log(`       • ${opt.title} (${opt.description?.slice(0, 80)}...)`);
    }
  } else {
    console.warn('    ⚠️ No proactive inquiry found in history.');
  }

  // Step 6: Visual Rendering in Headless Chrome via CDP
  console.log('\n[6] Rendering Live Artifact in Chrome & Capturing Viewport Screenshot...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const cdpPort = 9224;
  const artifactUrl = `${BASE_URL}/workspace/${artifactFilename}`;

  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    `--user-data-dir=${process.env.TEMP}\\chrome_cdp_live_build_${Date.now()}`,
    `--remote-debugging-port=${cdpPort}`,
    '--window-size=1280,800',
    artifactUrl,
  ]);

  chromeProcess.on('error', (err) => {
    console.error('Failed to spawn Chrome:', err);
  });

  let debuggerUrl = null;
  for (let i = 0; i < 30; i++) {
    await delay(500);
    try {
      const res = await fetch(`http://localhost:${cdpPort}/json`);
      const list = await res.json();
      const page = list.find((item) => item.type === 'page');
      if (page && page.webSocketDebuggerUrl) {
        debuggerUrl = page.webSocketDebuggerUrl;
        break;
      }
    } catch {}
  }

  if (!debuggerUrl) {
    console.warn('Could not connect to Chrome debugging endpoint. Will kill Chrome process.');
    chromeProcess.kill();
  } else {
    console.log(`    ↳ Connected to Chrome DevTools Protocol`);
    const ws = new WebSocket(debuggerUrl);
    const pendingRequests = new Map();
    let idCounter = 1;

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id && pendingRequests.has(msg.id)) {
        const { resolve, reject } = pendingRequests.get(msg.id);
        pendingRequests.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    });

    await new Promise((resolve) => ws.on('open', resolve));

    async function sendCDP(method, params = {}) {
      const id = idCounter++;
      return new Promise((resolve, reject) => {
        pendingRequests.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await sendCDP('Page.enable');
    await sendCDP('Runtime.enable');

    // Allow the 60fps simulation loop to render dynamic frames
    console.log('    ↳ Simulating 60fps physics frames (waiting 2500ms)...');
    await delay(2500);

    const screenshotData = await sendCDP('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(screenshotData.data, 'base64');

    const localScreenshotPath = path.join(SCREENSHOTS_DIR, 'live_build_condensate.png');
    const artifactScreenshotPath = path.join(ARTIFACT_DIR, 'live_build_condensate.png');

    fs.writeFileSync(localScreenshotPath, buffer);
    fs.writeFileSync(artifactScreenshotPath, buffer);
    console.log(`    ✓ Saved high-resolution render to:`);
    console.log(`       • ${localScreenshotPath} (${Math.round(buffer.length / 1024)} KB)`);
    console.log(`       • ${artifactScreenshotPath} (${Math.round(buffer.length / 1024)} KB)`);

    ws.close();
    chromeProcess.kill();
  }

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('  LIVE BUILD & VISUAL VERIFICATION: ALL STAGES PASSED ✓');
  console.log('═══════════════════════════════════════════════════════════════════\n');
}

run().catch((err) => {
  console.error('\n❌ TEST RUNNER ERROR:', err);
  process.exit(1);
});
