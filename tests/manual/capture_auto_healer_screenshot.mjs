// Capture screenshot of Auto-Healer diagnostic action banner in preview viewport
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACT_DIR =
  'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\59fcdeb3-9c1c-481c-8a52-7b9b01bae13f';
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function captureAutoHealerScreenshot() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const cdpPort = 9228;
  const targetUrl = 'http://localhost:5173/';

  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    `--user-data-dir=${process.env.TEMP || 'C:\\temp'}\\chrome_cdp_healer_${Date.now()}`,
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

    if (!debuggerUrl) throw new Error('Could not attach to Chrome');

    const ws = new WebSocket(debuggerUrl);
    await new Promise((resolve) => ws.on('open', resolve));

    let msgId = 1;
    function sendCommand(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        const handler = (data) => {
          const res = JSON.parse(data);
          if (res.id === id) {
            ws.off('message', handler);
            if (res.error) reject(res.error);
            else resolve(res.result);
          }
        };
        ws.on('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await sendCommand('Page.enable');
    await sendCommand('Runtime.enable');

    console.log('Waiting for cockpit UI to initialize...');
    await delay(3500);

    // Switch to 3D Artifacts tab and trigger error
    await sendCommand('Runtime.evaluate', {
      expression: `(function() {
        const tab = document.getElementById('tab-artifacts');
        if (tab) tab.click();
        
        window.postMessage({
          type: 'sis-preview-error',
          message: 'TypeError: Cannot read properties of undefined (reading style)',
          filename: 'quantum_simulation.html',
          lineno: 42,
          colno: 15
        }, '*');
      })()`,
    });

    await delay(1200);

    // Capture screenshot
    const shot = await sendCommand('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(shot.data, 'base64');
    const outPath = path.join(ARTIFACT_DIR, 'auto_healer_diagnostic_banner.png');
    fs.writeFileSync(outPath, buffer);
    console.log('✓ Screenshot saved to:', outPath);

    ws.close();
    chromeProcess.kill();
  } catch (err) {
    console.error('Screenshot capture error:', err);
    chromeProcess.kill();
    process.exit(1);
  }
}

captureAutoHealerScreenshot();
