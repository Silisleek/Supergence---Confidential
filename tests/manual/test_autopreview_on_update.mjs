import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  console.log('Testing Auto-Load Preview in Side Panel on File Update...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const cdpPort = 9235;
  const targetUrl = 'http://localhost:5173/';

  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    `--user-data-dir=${process.env.TEMP || 'C:\\temp'}\\chrome_cdp_autopreview_${Date.now()}`,
    `--remote-debugging-port=${cdpPort}`,
    '--window-size=1400,900',
    targetUrl,
  ]);

  try {
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

    if (!debuggerUrl) throw new Error('Could not connect to CDP');

    const ws = new WebSocket(debuggerUrl);
    const pending = new Map();
    let idCounter = 1;

    function sendCDP(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = idCounter++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map((a) => a.value || a.description || '').join(' ');
        if (
          text.includes('[AutoPreview]') ||
          text.includes('[Workspace]') ||
          text.includes('[Artifact]')
        ) {
          console.log('[Browser Console]:', text);
        }
      }
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    });

    await new Promise((r) => ws.on('open', r));
    await sendCDP('Page.enable');
    await sendCDP('Runtime.enable');

    await delay(3000); // Wait for page to initialize

    // Check initial tab: should be sismap or chat, iframe should not have our test file
    const initialState = await sendCDP('Runtime.evaluate', {
      expression: `(() => {
        return {
          activeTab: window.state?.activeTab,
          activeArtifact: window.state?.activeArtifactFile,
          iframeSrc: document.getElementById('artifact-iframe')?.src
        };
      })()`,
      returnByValue: true,
    });
    console.log('Initial State:', JSON.stringify(initialState.result.value, null, 2));

    // Now simulate an updated file written to workspace!
    const testHtml = `<!DOCTYPE html>
<html>
<head>
  <title>AUTONOMOUS QUANTUM SPHERE // AUTO-PREVIEW VERIFIED</title>
  <style>
    body { margin: 0; background: #030712; color: #00F0FF; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
    .card { background: rgba(15, 23, 42, 0.9); border: 2px solid #00F0FF; border-radius: 12px; padding: 24px; text-align: center; box-shadow: 0 0 30px rgba(0, 240, 255, 0.4); }
    h1 { font-size: 22px; margin: 0 0 10px; color: #00FF88; letter-spacing: 2px; }
    p { color: #94A3B8; font-size: 14px; margin: 6px 0; }
    .badge { display: inline-block; padding: 6px 14px; background: rgba(0, 240, 255, 0.2); border: 1px solid #00F0FF; border-radius: 20px; font-weight: bold; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>⚡ AUTONOMOUS QUANTUM SIMULATION</h1>
    <p>This file was dynamically created when solving a user problem.</p>
    <div class="badge">AUTO-LOADED IN SIDE PANEL: SUCCESS</div>
  </div>
</body>
</html>`;

    console.log('Triggering file update via POST /api/workspace/file...');
    const postRes = await fetch('http://localhost:3008/api/workspace/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'quantum_auto_test.html',
        content: testHtml,
      }),
    });
    const postData = await postRes.json();
    console.log('File written to workspace:', postData.path);

    // Wait 2 seconds for WebSocket event to process in client
    await delay(2000);

    // Inspect client state: tab must have auto-switched to 'artifacts' and iframe must be loaded!
    const afterUpdateState = await sendCDP('Runtime.evaluate', {
      expression: `(() => {
        const iframe = document.getElementById('artifact-iframe');
        const titleEl = document.getElementById('artifact-title');
        return {
          activeTab: window.state?.activeTab,
          activeArtifactFile: window.state?.activeArtifactFile,
          iframeSrc: iframe ? iframe.src : null,
          iframeDisplay: iframe ? iframe.style.display : null,
          titleText: titleEl ? titleEl.textContent : null,
          iframeDocTitle: iframe?.contentDocument?.title
        };
      })()`,
      returnByValue: true,
    });
    console.log('State After File Update:', JSON.stringify(afterUpdateState.result.value, null, 2));

    const shot1 = await sendCDP('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'autopreview_side_panel_loaded.png'),
      Buffer.from(shot1.data, 'base64'),
    );
    console.log('Screenshot saved to autopreview_side_panel_loaded.png');

    // TEST 2: Update the file a second time to ensure live auto-reloading every single time
    console.log('Updating file second time with v2 content...');
    const testHtmlV2 = testHtml.replace(
      'AUTO-LOADED IN SIDE PANEL: SUCCESS',
      'VERSION 2 // LIVE HOT RELOAD VERIFIED',
    );
    await fetch('http://localhost:3008/api/workspace/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'quantum_auto_test.html',
        content: testHtmlV2,
      }),
    });

    await delay(2000);

    const stateV2 = await sendCDP('Runtime.evaluate', {
      expression: `(() => {
        const iframe = document.getElementById('artifact-iframe');
        return {
          activeTab: window.state?.activeTab,
          activeArtifactFile: window.state?.activeArtifactFile,
          iframeSrc: iframe ? iframe.src : null,
          iframeBadgeText: iframe?.contentDocument?.querySelector('.badge')?.textContent
        };
      })()`,
      returnByValue: true,
    });
    console.log('State After V2 Update:', JSON.stringify(stateV2.result.value, null, 2));

    const shot2 = await sendCDP('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'autopreview_side_panel_v2_reloaded.png'),
      Buffer.from(shot2.data, 'base64'),
    );
    console.log('Screenshot saved to autopreview_side_panel_v2_reloaded.png');

    ws.close();
  } finally {
    chromeProcess.kill();
  }
}

run().catch(console.error);
