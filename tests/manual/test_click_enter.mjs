import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots');
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  console.log('Testing Enter 3D Airport inside iframe...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const cdpPort = 9232;
  const targetUrl = 'http://localhost:5173/';

  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    `--user-data-dir=${process.env.TEMP || 'C:\\temp'}\\chrome_cdp_enter_${Date.now()}`,
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

    await delay(2500);

    // Load preview
    await sendCDP('Runtime.evaluate', {
      expression: `window.previewWorkspaceFile('walkable_airport.html')`,
    });

    await delay(6000);

    // Click the "ENTER 3D AIRPORT" button inside the iframe
    const enterRes = await sendCDP('Runtime.evaluate', {
      expression: `(() => {
        const iframe = document.getElementById('artifact-iframe');
        const idoc = iframe?.contentDocument;
        const btn = idoc?.getElementById('btn-lock');
        if (btn) {
          btn.click();
          return { clicked: true };
        }
        return { clicked: false, docFound: !!idoc };
      })()`,
      returnByValue: true,
    });
    console.log('Enter click result:', enterRes.result.value);

    await delay(2000);

    // Check teleport to Cockpit
    await sendCDP('Runtime.evaluate', {
      expression: `(() => {
        const iframe = document.getElementById('artifact-iframe');
        const iwin = iframe?.contentWindow;
        if (iwin && iwin.teleportTo) {
          iwin.teleportTo('cockpit');
          return { teleported: true };
        }
        return { teleported: false };
      })()`,
      returnByValue: true,
    });

    await delay(1000);

    const shot = await sendCDP('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'walkable_airport_cockpit_view.png'),
      Buffer.from(shot.data, 'base64'),
    );
    console.log('Screenshot saved to walkable_airport_cockpit_view.png');

    ws.close();
  } finally {
    chromeProcess.kill();
  }
}

run().catch(console.error);
