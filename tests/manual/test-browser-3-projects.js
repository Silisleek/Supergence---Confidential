import { spawn } from 'node:child_process';
import WebSocket from 'ws';
import fs from 'node:fs';
import path from 'node:path';

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const ARTIFACTS_DIR =
  'C:/Users/Akshan sharma/.gemini/antigravity/brain/faf69356-ecf3-42f4-8312-57992db19959';

async function runBrowserProjectsTest() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  SIS 1.0 — BROWSER INTERACTION & 3 PROJECTS VALIDATION       ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const tmpBase = (process.env.TEMP || 'C:/tmp').replace(/\\/g, '/');
  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    `--user-data-dir=${tmpBase}/chrome_cdp_projects_${Date.now()}`,
    '--remote-debugging-port=9244',
    '--window-size=1920,1080',
    'http://localhost:5173/',
  ]);

  let debuggerUrl = null;
  for (let i = 0; i < 30; i++) {
    await delay(400);
    try {
      const res = await fetch('http://localhost:9244/json');
      const list = await res.json();
      const page = list.find((p) => p.type === 'page');
      if (page && page.webSocketDebuggerUrl) {
        debuggerUrl = page.webSocketDebuggerUrl;
        break;
      }
    } catch {}
  }

  if (!debuggerUrl) {
    chromeProcess.kill();
    throw new Error('Chrome did not start on port 9244');
  }

  const ws = new WebSocket(debuggerUrl);
  await new Promise((r) => ws.on('open', r));

  const pendingRequests = new Map();

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.id && pendingRequests.has(msg.id)) {
      const { resolve, reject } = pendingRequests.get(msg.id);
      pendingRequests.delete(msg.id);
      if (msg.error) {
        console.error(`[CDP Error for ID ${msg.id}]:`, msg.error);
        reject(new Error(msg.error.message || JSON.stringify(msg.error)));
      } else {
        resolve(msg.result);
      }
    }
  });

  let id = 1;
  function send(method, params = {}) {
    const msgId = id++;
    return new Promise((resolve, reject) => {
      pendingRequests.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  console.log('[1/4] Booting SIS Tactical Cockpit in Browser...');
  await delay(4500);

  let passed = 0;
  let failed = 0;
  function assert(condition, label) {
    if (condition) {
      console.log(`  ✓ PASS: ${label}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${label}`);
      failed++;
    }
  }

  async function saveScreenshot(filename) {
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(screenshot.data, 'base64');
    fs.writeFileSync(`tests/${filename}`, buffer);
    const artPath = path.join(ARTIFACTS_DIR, filename);
    fs.writeFileSync(artPath, buffer);
    console.log(`  📸 Proof screenshot saved: ${filename} (${buffer.length} bytes)`);
  }

  // ─── [TEST 1] Click 3D Artifacts Tab & Verify Dynamic Tray ───
  console.log('\n─── [1] SIS Cockpit Artifacts Viewport & Tray Mounting ───');
  const cockpitRes = await send('Runtime.evaluate', {
    expression: `(async () => {
      // Wait for boot screen to hide
      for (let i = 0; i < 30; i++) {
        const bootScreen = document.getElementById('boot-screen');
        if (bootScreen && bootScreen.classList.contains('hidden')) break;
        await new Promise(r => setTimeout(r, 200));
      }

      // Switch to artifacts tab
      if (typeof window.switchTab === 'function') {
        window.switchTab('artifacts');
      } else {
        const tabBtn = document.querySelector('.tab-tactical[data-tab="artifacts"]');
        if (tabBtn) tabBtn.click();
      }

      // Load artifacts dynamically
      if (typeof window.loadArtifacts === 'function') {
        await window.loadArtifacts(true);
      }

      // Wait for artifacts to fetch and render into tray
      for (let i = 0; i < 25; i++) {
        const tray = document.getElementById('tray-items');
        const items = tray ? Array.from(tray.querySelectorAll('.tray-item')) : [];
        if (items.length > 2) break;
        await new Promise(r => setTimeout(r, 200));
      }

      const tray = document.getElementById('tray-items');
      const items = tray ? Array.from(tray.querySelectorAll('.tray-item')) : [];
      const itemNames = items.map(el => el.querySelector('.tray-item-name')?.textContent?.trim() || '');

      return {
        hasTray: !!tray,
        itemCount: items.length,
        itemNames: itemNames.slice(0, 6),
        hasProject1: itemNames.some(n => n.includes('cyberpunk-solar-system')),
        hasProject2: itemNames.some(n => n.includes('vector-space-odyssey')),
        hasProject3: itemNames.some(n => n.includes('neural-synth-visualizer'))
      };
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });

  const cr = cockpitRes.result?.value || {};
  assert(cr.hasTray, 'SIS Cockpit Artifact Tray mounted');
  assert(cr.hasProject1, 'Project 1 (cyberpunk-solar-system.html) listed in Artifact Tray');
  assert(cr.hasProject2, 'Project 2 (vector-space-odyssey.html) listed in Artifact Tray');
  assert(cr.hasProject3, 'Project 3 (neural-synth-visualizer.html) listed in Artifact Tray');
  console.log('     Recent projects in Tray:', cr.itemNames);
  await delay(500);
  await saveScreenshot('sis_cockpit_artifacts_view.png');

  // ─── [TEST 2] Project 1: Mount & Preview Cyberpunk Solar System ───
  console.log('\n─── [2] Mounting Project 1: Cyberpunk Solar System Simulation ───');
  const p1Res = await send('Runtime.evaluate', {
    expression: `(async () => {
      if (window.previewWorkspaceFile) window.previewWorkspaceFile('cyberpunk-solar-system.html');
      await new Promise(r => setTimeout(r, 2500));

      const iframe = document.getElementById('artifact-iframe');
      const title = document.getElementById('artifact-title')?.textContent;
      const src = iframe ? iframe.getAttribute('src') || '' : '';

      return {
        hasIframe: !!iframe,
        src,
        title,
        isLoaded: src.includes('cyberpunk-solar-system')
      };
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });

  const p1 = p1Res.result?.value || {};
  assert(p1.isLoaded, `Project 1 successfully active in Cockpit Viewport (src: ${p1.src})`);
  await delay(800);
  await saveScreenshot('sis_cockpit_project1_solar_system.png');

  // ─── [TEST 3] Project 2: Mount & Preview Neon Vector Space Odyssey ───
  console.log('\n─── [3] Mounting Project 2: Neon Odyssey Vector Space Defense ───');
  const p2Res = await send('Runtime.evaluate', {
    expression: `(async () => {
      if (window.previewWorkspaceFile) window.previewWorkspaceFile('vector-space-odyssey.html');
      await new Promise(r => setTimeout(r, 2200));

      const iframe = document.getElementById('artifact-iframe');
      const title = document.getElementById('artifact-title')?.textContent;
      const src = iframe ? iframe.getAttribute('src') || '' : '';

      return {
        hasIframe: !!iframe,
        src,
        title,
        isLoaded: src.includes('vector-space-odyssey')
      };
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });

  const p2 = p2Res.result?.value || {};
  assert(p2.isLoaded, `Project 2 successfully active in Cockpit Viewport (src: ${p2.src})`);
  await delay(800);
  await saveScreenshot('sis_cockpit_project2_vector_space.png');

  // ─── [TEST 4] Project 3: Mount & Preview Neural Harmonics Synthesizer ───
  console.log('\n─── [4] Mounting Project 3: Neural Harmonics Synthesizer & Visualizer ───');
  const p3Res = await send('Runtime.evaluate', {
    expression: `(async () => {
      if (window.previewWorkspaceFile) window.previewWorkspaceFile('neural-synth-visualizer.html');
      await new Promise(r => setTimeout(r, 2200));

      const iframe = document.getElementById('artifact-iframe');
      const title = document.getElementById('artifact-title')?.textContent;
      const src = iframe ? iframe.getAttribute('src') || '' : '';

      return {
        hasIframe: !!iframe,
        src,
        title,
        isLoaded: src.includes('neural-synth-visualizer')
      };
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });

  const p3 = p3Res.result?.value || {};
  assert(p3.isLoaded, `Project 3 successfully active in Cockpit Viewport (src: ${p3.src})`);
  await delay(800);
  await saveScreenshot('sis_cockpit_project3_neural_synth.png');

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  BROWSER & 3 PROJECTS TEST: ${passed} PASSED | ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  ws.close();
  chromeProcess.kill();

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runBrowserProjectsTest().catch((err) => {
  console.error('Fatal Browser Test error:', err);
  process.exit(1);
});
