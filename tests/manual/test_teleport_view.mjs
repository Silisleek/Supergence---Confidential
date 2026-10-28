import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots');
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  console.log('Testing Airport Teleport & Render...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const cdpPort = 9234;
  const targetUrl = 'http://localhost:5173/';

  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    `--user-data-dir=${process.env.TEMP || 'C:\\temp'}\\chrome_cdp_tp_${Date.now()}`,
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

    await delay(3000);

    // Switch conversation & click preview button
    await sendCDP('Runtime.evaluate', {
      expression: `(async () => {
        window.switchTab('chat');
        await window.switchConversation('1889517f-d9e1-49f9-9839-d378e79a4167', true);
      })()`,
      awaitPromise: true,
    });

    await delay(2000);

    // Click Preview HTML button in chat
    await sendCDP('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('.ag-btn-preview');
        if (btn) btn.click();
      })()`,
    });

    console.log('Preview clicked, waiting 6s for Three.js scene to mount...');
    await delay(6000);

    // Click ENTER 3D AIRPORT inside iframe
    const enterRes = await sendCDP('Runtime.evaluate', {
      expression: `(() => {
        const iframe = document.getElementById('artifact-iframe');
        const idoc = iframe?.contentDocument;
        const btn = idoc?.getElementById('btn-lock');
        if (btn) {
          btn.click();
          return { clicked: true };
        }
        return { clicked: false, title: idoc?.title };
      })()`,
      returnByValue: true,
    });
    console.log('Enter button clicked:', enterRes.result.value);

    await delay(2000);

    // Click Cockpit Teleport Button inside iframe
    const cockpitRes = await sendCDP('Runtime.evaluate', {
      expression: `(() => {
        const iframe = document.getElementById('artifact-iframe');
        const idoc = iframe?.contentDocument;
        const btn = idoc?.getElementById('btn-tp-cockpit');
        if (btn) {
          btn.click();
          return { clicked: true, zone: idoc?.getElementById('hud-loc-val')?.textContent };
        }
        return { clicked: false };
      })()`,
      returnByValue: true,
    });
    console.log('Cockpit teleport result:', cockpitRes.result.value);

    await delay(2000);

    const shot = await sendCDP('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'walkable_airport_cockpit_rendered.png'),
      Buffer.from(shot.data, 'base64'),
    );
    console.log('Screenshot saved to walkable_airport_cockpit_rendered.png');

    ws.close();
  } finally {
    chromeProcess.kill();
  }
}

run().catch(console.error);
