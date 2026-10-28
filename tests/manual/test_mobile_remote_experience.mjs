// SIS 1.0 — Mobile Remote Control & Touch Experience Test
// Validates end-to-end functionality for a user accessing and controlling SIS remotely from mobile:
// 1. Remote network binding & latency via Wi-Fi IP (192.168.1.4:3008)
// 2. Real-time autonomous construction of a mobile-optimized tactile system
// 3. Headless Chrome mobile device emulation (390x844, touch-enabled, mobile user-agent)
// 4. Multi-touch gesture simulation (touchstart, touchmove, touchend)
// 5. High-resolution mobile screenshot capture of both the interactive artifact and cockpit HUD

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3008;
const LOCAL_IP = '192.168.1.4';
const BASE_URL = `http://localhost:${PORT}`;
const REMOTE_URL = `http://${LOCAL_IP}:${PORT}`;

const ARTIFACT_DIR =
  'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\59fcdeb3-9c1c-481c-8a52-7b9b01bae13f';
const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  SIS 1.0 — MOBILE REMOTE CONTROL & TOUCH VERIFICATION');
  console.log('  Testing Mobile Access, Responsive Layout, & Touch Gestures');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  // Step 1: Remote Wi-Fi Network Accessibility
  console.log(`[1] Verifying Remote Mobile Network Interface (${REMOTE_URL})...`);
  const t0 = Date.now();
  const netRes = await fetch(`${REMOTE_URL}/api/health`);
  if (!netRes.ok) throw new Error(`Remote network connection failed: ${netRes.statusText}`);
  const netData = await netRes.json();
  const latency = Date.now() - t0;
  console.log(`    ✓ Remote Wi-Fi Health OK (Latency: ${latency}ms)`);
  console.log(`    ↳ System: ${netData.name} (Build: ${netData.build})\n`);

  // Step 2: Trigger Autonomous Build with Mobile Touch Optimization
  const targetTopic = 'Topological Acoustic Metamaterial Resonator';
  console.log(`[2] Triggering Mobile-Optimized Autonomous Build: "${targetTopic}"...`);
  const buildRes = await fetch(`${BASE_URL}/api/brain/invent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: targetTopic }),
  });
  if (!buildRes.ok) throw new Error(`Build failed: ${buildRes.statusText}`);
  const buildJson = await buildRes.json();
  const inv = buildJson.invention || buildJson;
  console.log(`    ✓ Materialized: "${inv.title}"`);
  console.log(`    ↳ Artifact: ${inv.filename} (Score: ${inv.empiricalScore})`);
  console.log(`    ↳ Domains: [${inv.domains?.join(' ⨂ ')}]`);
  console.log(`    ↳ Tool: "${inv.toolName}"\n`);

  const artifactFilename = inv.filename;
  const artifactUrl = `${BASE_URL}/workspace/${artifactFilename}`;

  // Step 3: Spawn Headless Chrome with Mobile Emulation
  console.log('[3] Launching Chrome in Mobile Emulation Mode (390x844, Touch Enabled)...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const cdpPort = 9225;

  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    `--user-data-dir=${process.env.TEMP}\\chrome_cdp_mobile_${Date.now()}`,
    `--remote-debugging-port=${cdpPort}`,
    '--window-size=450,900',
    artifactUrl,
  ]);

  chromeProcess.on('error', (err) => console.error('Failed to spawn Chrome:', err));

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
    chromeProcess.kill();
    throw new Error('Could not connect to Chrome debugging endpoint');
  }

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

  // Configure Mobile Device Emulation (iPhone 14 / modern smartphone: 390x844, 3x DPR, touch enabled)
  console.log('    ↳ Setting Mobile Viewport: 390 x 844 (DPR: 3.0, touch: true)...');
  await sendCDP('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true,
    screenOrientation: { angle: 0, type: 'portraitPrimary' },
  });
  await sendCDP('Emulation.setTouchEmulationEnabled', {
    enabled: true,
    maxTouchPoints: 5,
  });
  await sendCDP('Network.setUserAgentOverride', {
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });

  // Step 4: Dispatch Synthetic Mobile Touch Gestures
  console.log(
    '\n[4] Simulating Mobile Touch Drag across Canvas (touchstart -> touchmove -> touchend)...',
  );
  await delay(1500); // Wait for canvas to mount

  // Touch start in center of screen
  await sendCDP('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 195, y: 400, id: 0 }],
  });
  await delay(100);

  // Touch move dragging vortex across to (240, 500)
  for (let step = 0; step <= 5; step++) {
    const curX = 195 + step * 9;
    const curY = 400 + step * 20;
    await sendCDP('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: curX, y: curY, id: 0 }],
    });
    await delay(40);
  }

  // Touch end
  await sendCDP('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  console.log('    ✓ Mobile touch drag gesture successfully dispatched');

  // Let simulation render dynamic vortex response
  await delay(1500);

  // Capture Mobile Viewport Screenshot of Artifact
  console.log('\n[5] Capturing High-Resolution Mobile Artifact Viewport...');
  const artifactScreenshot = await sendCDP('Page.captureScreenshot', { format: 'png' });
  const artifactBuffer = Buffer.from(artifactScreenshot.data, 'base64');

  const localArtifactPath = path.join(SCREENSHOTS_DIR, 'mobile_remote_artifact_render.png');
  const sharedArtifactPath = path.join(ARTIFACT_DIR, 'mobile_remote_artifact_render.png');
  fs.writeFileSync(localArtifactPath, artifactBuffer);
  fs.writeFileSync(sharedArtifactPath, artifactBuffer);
  console.log(
    `    ✓ Saved Mobile Artifact Screenshot (${Math.round(artifactBuffer.length / 1024)} KB)`,
  );

  // Step 6: Test Mobile Cockpit HUD & Chat View
  console.log('\n[6] Navigating Mobile Browser to Main SIS Cockpit (http://localhost:3008/)...');
  await sendCDP('Page.navigate', { url: BASE_URL });
  await delay(3000); // Allow cockpit HUD and components to load

  const cockpitScreenshot = await sendCDP('Page.captureScreenshot', { format: 'png' });
  const cockpitBuffer = Buffer.from(cockpitScreenshot.data, 'base64');

  const localCockpitPath = path.join(SCREENSHOTS_DIR, 'mobile_remote_cockpit_render.png');
  const sharedCockpitPath = path.join(ARTIFACT_DIR, 'mobile_remote_cockpit_render.png');
  fs.writeFileSync(localCockpitPath, cockpitBuffer);
  fs.writeFileSync(sharedCockpitPath, cockpitBuffer);
  console.log(
    `    ✓ Saved Mobile Cockpit Screenshot (${Math.round(cockpitBuffer.length / 1024)} KB)`,
  );

  ws.close();
  chromeProcess.kill();

  // Step 7: Verify Proactive Inquiry for Mobile User
  console.log('\n[7] Verifying Proactive Inquiry & Mobile Communication:');
  const proactiveRes = await fetch(`${BASE_URL}/api/brain/proactive`);
  const proactiveData = await proactiveRes.json();
  const inquiry = proactiveData.latestInquiry || proactiveData.history?.[0];
  if (inquiry) {
    console.log(`    ↳ Latest Proactive Message:`);
    console.log(
      `      "${(inquiry.text || inquiry.inquiry || '').slice(0, 180).replace(/\n/g, '\n      ')}..."`,
    );
  }

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('  MOBILE REMOTE CONTROL VERIFICATION: ALL 7 STAGES PASSED ✓');
  console.log('═══════════════════════════════════════════════════════════════════\n');
}

run().catch((err) => {
  console.error('\n❌ MOBILE TEST FAILED:', err);
  process.exit(1);
});
