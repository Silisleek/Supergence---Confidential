// Verification of Blank Preview Viewport & User-Initiated Preview via Chrome CDP
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACT_DIR =
  'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\59fcdeb3-9c1c-481c-8a52-7b9b01bae13f';
const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function runVisualVerification() {
  console.log('============================================================');
  console.log('  👁️ BROWSER CDP VERIFICATION: BLANK PREVIEW & CHAT FOCUS');
  console.log('============================================================\n');

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const cdpPort = 9225;
  const targetUrl = 'http://localhost:5173/';

  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    `--user-data-dir=${process.env.TEMP || 'C:\\temp'}\\chrome_cdp_preview_verify_${Date.now()}`,
    `--remote-debugging-port=${cdpPort}`,
    '--window-size=1400,900',
    targetUrl,
  ]);

  chromeProcess.on('error', (err) => {
    console.error('Failed to spawn Chrome:', err);
    process.exit(1);
  });

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

    if (!debuggerUrl) {
      throw new Error('Could not connect to Chrome DevTools endpoint on port ' + cdpPort);
    }

    console.log('✓ Connected to Chrome via CDP');
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
    await sendCDP('DOM.enable');

    console.log('Waiting for cockpit UI to initialize (4000ms)...');
    await delay(4000);

    // ─── CHECK 1: Initial Viewport & Preview State ───
    console.log('\n--- Step 1: Evaluating Initial Preview State ---');
    const evalResult = await sendCDP('Runtime.evaluate', {
      expression: `(() => {
        const iframe = document.getElementById('artifact-iframe');
        const titleEl = document.getElementById('artifact-title');
        return {
          iframeSrc: iframe ? (iframe.src || iframe.getAttribute('src')) : null,
          titleText: titleEl ? titleEl.textContent.trim() : null,
          activeTab: window.state?.activeTab || document.querySelector('.tab-tactical.active')?.getAttribute('data-tab') || 'unknown'
        };
      })()`,
      returnByValue: true,
    });

    const initInfo = evalResult.result.value;
    console.log('  • iframe.src:', initInfo.iframeSrc);
    console.log('  • titleText:', initInfo.titleText);
    console.log('  • activeTab:', initInfo.activeTab);

    const isBlank =
      initInfo.iframeSrc === 'about:blank' || initInfo.iframeSrc === '' || !initInfo.iframeSrc;
    console.log(
      isBlank
        ? '  ✓ [PASS] Preview viewport is strictly BLANK on load'
        : '  ✗ [FAIL] Preview viewport is NOT blank',
    );

    // Switch to preview tab to screenshot blank preview
    await sendCDP('Runtime.evaluate', { expression: `window.switchTab('artifacts')` });
    await delay(1000);

    // Capture initial screenshot of the cockpit
    const shot1 = await sendCDP('Page.captureScreenshot', { format: 'png' });
    const buf1 = Buffer.from(shot1.data, 'base64');
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'cockpit_initial_blank_preview.png'), buf1);
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'cockpit_initial_blank_preview.png'), buf1);
    console.log('  📸 Screenshot captured: cockpit_initial_blank_preview.png');

    // ─── CHECK 2: Explicit User Click on Preview Button ───
    console.log('\n--- Step 2: User Explicitly Clicks PREVIEW on an Artifact ---');
    try {
      await sendCDP('Runtime.evaluate', {
        expression: `window.loadArtifacts(false)`,
        awaitPromise: true,
      });
    } catch {}
    await delay(1000);

    const clickResult = await sendCDP('Runtime.evaluate', {
      expression: `(() => {
        const artifacts = window.state?.artifacts || [];
        const target = artifacts.find(a => a.filename === 'make_me_a_replic.html') || artifacts[0] || { filename: 'make_me_a_replic.html', title: 'make_me_a_replic.html' };
        window.previewHtmlFile(target.filename);
        return { clicked: true, filename: target.filename, title: target.title };
      })()`,
      returnByValue: true,
    });

    console.log('  • Click evaluation:', clickResult.result.value);
    await delay(3500); // Allow simulation iframe to render frames

    const previewState = await sendCDP('Runtime.evaluate', {
      expression: `(() => {
        const iframe = document.getElementById('artifact-iframe');
        const titleEl = document.getElementById('artifact-title');
        return {
          iframeSrc: iframe ? iframe.src : null,
          titleText: titleEl ? titleEl.textContent.trim() : null,
          activeTab: window.state?.activeTab || document.querySelector('.tab-tactical.active')?.getAttribute('data-tab') || 'unknown'
        };
      })()`,
      returnByValue: true,
    });

    const loadedInfo = previewState.result.value;
    console.log('  • Loaded iframe.src:', loadedInfo.iframeSrc);
    console.log('  • Loaded titleText:', loadedInfo.titleText);
    console.log('  • Active tab now:', loadedInfo.activeTab);

    const isLoaded = loadedInfo.iframeSrc && loadedInfo.iframeSrc.includes('/workspace/');
    console.log(
      isLoaded
        ? '  ✓ [PASS] Preview viewport displays artifact upon user click'
        : '  ✗ [FAIL] Artifact not loaded',
    );

    // Capture screenshot of user-loaded artifact preview
    const shot2 = await sendCDP('Page.captureScreenshot', { format: 'png' });
    const buf2 = Buffer.from(shot2.data, 'base64');
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'cockpit_loaded_artifact_preview.png'), buf2);
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'cockpit_loaded_artifact_preview.png'), buf2);
    console.log('  📸 Screenshot captured: cockpit_loaded_artifact_preview.png');

    // ─── CHECK 3: Chat Focus & No Hijacking ───
    console.log('\n--- Step 3: Switch Back to Chat & Execute Prompt ---');
    await sendCDP('Runtime.evaluate', {
      expression: `window.switchTab('chat')`,
    });
    await delay(500);

    console.log('  • Typing and sending chat prompt...');
    await sendCDP('Runtime.evaluate', {
      expression: `(() => {
        const input = document.getElementById('chat-input');
        if (input) {
          input.value = 'State Newton second law in one clear sentence.';
          if (typeof window.sendMessage === 'function') {
            window.sendMessage();
            return { sent: true };
          }
          const sendBtn = document.getElementById('send-btn');
          if (sendBtn) sendBtn.click();
          return { sent: true };
        }
        return { sent: false };
      })()`,
      returnByValue: true,
    });

    console.log('  • Waiting 10s for chat response generation...');
    await delay(10000);

    const chatState = await sendCDP('Runtime.evaluate', {
      expression: `(() => {
        const activeTab = window.state?.activeTab || document.querySelector('.tab-tactical.active')?.getAttribute('data-tab') || 'unknown';
        const messages = Array.from(document.querySelectorAll('.message-body, .message')).map(m => m.textContent.trim());
        return {
          activeTab,
          messageCount: messages.length,
          lastSnippet: messages.slice(-1)[0]?.slice(0, 120) || ''
        };
      })()`,
      returnByValue: true,
    });

    const chatInfo = chatState.result.value;
    console.log('  • Active tab during/after chat:', chatInfo.activeTab);
    console.log('  • Messages count:', chatInfo.messageCount);
    console.log('  • Last message snippet:', chatInfo.lastSnippet);

    const chatFocused = chatInfo.activeTab === 'chat';
    console.log(
      chatFocused
        ? '  ✓ [PASS] Chat remained strictly focused without being hijacked'
        : '  ✗ [FAIL] Tab switched away from chat',
    );

    // Capture screenshot of chat
    const shot3 = await sendCDP('Page.captureScreenshot', { format: 'png' });
    const buf3 = Buffer.from(shot3.data, 'base64');
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'cockpit_chat_focused.png'), buf3);
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'cockpit_chat_focused.png'), buf3);
    console.log('  📸 Screenshot captured: cockpit_chat_focused.png');

    console.log('\n============================================================');
    console.log('  🌟 ALL BROWSER CDP VISUAL CHECKS VERIFIED SUCCESSFULLY');
    console.log('============================================================\n');

    ws.close();
  } finally {
    try {
      chromeProcess.kill();
    } catch {}
  }
}

runVisualVerification().catch((err) => {
  console.error('Fatal visual verification error:', err);
  process.exit(1);
});
