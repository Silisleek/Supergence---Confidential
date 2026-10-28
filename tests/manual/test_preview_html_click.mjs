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
  console.log('Testing Preview HTML button click via Chrome CDP...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const cdpPort = 9227;
  const targetUrl = 'http://localhost:5173/';

  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    `--user-data-dir=${process.env.TEMP || 'C:\\temp'}\\chrome_cdp_preview_test_${Date.now()}`,
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
    console.log('Connected to CDP');

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
        console.log('[Browser Console]:', text);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        console.error(
          '[Browser Exception]:',
          msg.params.exceptionDetails?.text,
          msg.params.exceptionDetails?.exception?.description,
        );
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

    await delay(2500); // Wait for page boot

    console.log('Switching to chat tab and loading airport conversation...');
    await sendCDP('Runtime.evaluate', {
      expression: `(async () => {
        window.switchTab('chat');
        await window.switchConversation('1889517f-d9e1-49f9-9839-d378e79a4167', true);
        return { done: true };
      })()`,
      awaitPromise: true,
    });

    await delay(1500);

    // Check rendered buttons in chat
    const btnInfo = await sendCDP('Runtime.evaluate', {
      expression: `(() => {
        const banners = document.querySelectorAll('.ag-file-saved-banner');
        const previewBtns = document.querySelectorAll('.ag-btn-preview');
        return {
          bannersCount: banners.length,
          previewBtnsCount: previewBtns.length,
          previewBtns: Array.from(previewBtns).map(b => ({
            text: b.textContent.trim(),
            onclick: b.getAttribute('onclick')
          }))
        };
      })()`,
      returnByValue: true,
    });
    console.log('Button details:', JSON.stringify(btnInfo.result.value, null, 2));

    // Now click the preview button directly:
    console.log('Simulating click on Preview HTML button...');
    const clickRes = await sendCDP('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('.ag-btn-preview');
        if (btn) {
          btn.click();
          return { clicked: true, onclick: btn.getAttribute('onclick') };
        }
        return { clicked: false };
      })()`,
      returnByValue: true,
    });
    console.log('Click result:', clickRes.result.value);

    await delay(6000);

    // Check what happened after click:
    const afterClick = await sendCDP('Runtime.evaluate', {
      expression: `(() => {
        const iframe = document.getElementById('artifact-iframe');
        const titleEl = document.getElementById('artifact-title');
        const diagBar = document.getElementById('preview-diagnostic-bar');
        const idoc = iframe?.contentDocument;
        return {
          activeTab: window.state?.activeTab,
          activeArtifactFile: window.state?.activeArtifactFile,
          iframeSrc: iframe ? iframe.src : null,
          iframeDisplay: iframe ? iframe.style.display : null,
          titleText: titleEl ? titleEl.textContent : null,
          diagVisible: diagBar ? !diagBar.classList.contains('hidden') : false,
          iframeTitle: idoc?.title,
          iframeCanvas: !!idoc?.querySelector('canvas'),
          iframeInstructions: !!idoc?.getElementById('instructions')
        };
      })()`,
      returnByValue: true,
    });
    console.log('After click state:', JSON.stringify(afterClick.result.value, null, 2));

    const shot = await sendCDP('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'preview_button_click_test.png'),
      Buffer.from(shot.data, 'base64'),
    );
    console.log('Screenshot saved to preview_button_click_test.png');

    ws.close();
  } finally {
    chromeProcess.kill();
  }
}

run().catch(console.error);
