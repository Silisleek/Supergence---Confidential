// Capture visual states of Cognitive Focus: Task Focused vs Idle/Autonomous
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACT_DIR =
  'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\59fcdeb3-9c1c-481c-8a52-7b9b01bae13f';
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function captureChatFocusStates() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const cdpPort = 9229;
  const targetUrl = 'http://localhost:5173/';

  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    `--user-data-dir=${process.env.TEMP || 'C:\\temp'}\\chrome_cdp_focus_${Date.now()}`,
    `--remote-debugging-port=${cdpPort}`,
    '--window-size=1440,900',
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
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        const handler = (data) => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.id === id) {
              ws.off('message', handler);
              if (parsed.error) reject(parsed.error);
              else resolve(parsed.result);
            }
          } catch (e) {
            reject(e);
          }
        };
        ws.on('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send('Page.enable');
    await send('Runtime.enable');
    await delay(2000);

    // 1. Engage Chat Task Focus via UI or script
    await send('Runtime.evaluate', {
      expression: `
        if (typeof window.updateChatFocusUI === 'function') {
          window.updateChatFocusUI(true);
        } else {
          const badge = document.getElementById('chat-focus-badge');
          const cfText = document.getElementById('cf-text');
          if (badge) badge.className = 'chat-focus-badge active';
          if (cfText) cfText.textContent = 'TASK FOCUSED';
        }
      `,
    });
    await delay(1000);

    // Capture Task Focused state
    const snap1 = await send('Page.captureScreenshot', { format: 'png' });
    const snap1Path = path.join(ARTIFACT_DIR, 'cognitive_focus_task_active.png');
    fs.writeFileSync(snap1Path, Buffer.from(snap1.data, 'base64'));
    console.log(`[Screenshot] Saved task-focused state: ${snap1Path}`);

    // 2. Disengage focus (Close chat / Idle Autonomous)
    await send('Runtime.evaluate', {
      expression: `
        if (typeof window.updateChatFocusUI === 'function') {
          window.updateChatFocusUI(false);
        } else {
          const badge = document.getElementById('chat-focus-badge');
          const cfText = document.getElementById('cf-text');
          if (badge) badge.className = 'chat-focus-badge idle';
          if (cfText) cfText.textContent = 'IDLE // AUTONOMOUS';
        }
      `,
    });
    await delay(1000);

    // Capture Idle Autonomous state
    const snap2 = await send('Page.captureScreenshot', { format: 'png' });
    const snap2Path = path.join(ARTIFACT_DIR, 'cognitive_focus_idle_autonomous.png');
    fs.writeFileSync(snap2Path, Buffer.from(snap2.data, 'base64'));
    console.log(`[Screenshot] Saved idle-autonomous state: ${snap2Path}`);

    ws.close();
  } finally {
    try {
      chromeProcess.kill();
    } catch {}
  }
}

captureChatFocusStates()
  .then(() => {
    console.log('Capture finished successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Capture error:', err);
    process.exit(1);
  });
