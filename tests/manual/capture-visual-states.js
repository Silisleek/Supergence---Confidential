import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenshotsDir = path.join(__dirname, '../screenshots');
mkdirSync(screenshotsDir, { recursive: true });

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('[VisualAudit] Starting Chrome with remote debugging...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    `--user-data-dir=${process.env.TEMP}\\chrome_cdp_audit`,
    '--remote-debugging-port=9222',
    '--window-size=1920,1080',
    'http://localhost:5173/',
  ]);

  chromeProcess.on('error', (err) => {
    console.error('Failed to spawn Chrome:', err);
    process.exit(1);
  });

  // Wait for remote debugging port to be ready
  let debuggerUrl = null;
  for (let i = 0; i < 30; i++) {
    await delay(500);
    try {
      const res = await fetch('http://localhost:9222/json');
      const list = await res.json();
      const page = list.find((item) => item.type === 'page');
      if (page && page.webSocketDebuggerUrl) {
        debuggerUrl = page.webSocketDebuggerUrl;
        break;
      }
    } catch (e) {
      // Chrome not ready yet
    }
  }

  if (!debuggerUrl) {
    console.error('[VisualAudit] Could not connect to Chrome debugging endpoint');
    chromeProcess.kill();
    process.exit(1);
  }

  console.log('[VisualAudit] Connected to Chrome page:', debuggerUrl);
  const ws = new WebSocket(debuggerUrl);

  let idCounter = 1;
  const pendingRequests = new Map();

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.id && pendingRequests.has(msg.id)) {
      const { resolve, reject } = pendingRequests.get(msg.id);
      pendingRequests.delete(msg.id);
      if (msg.error) {
        reject(new Error(JSON.stringify(msg.error)));
      } else {
        resolve(msg.result);
      }
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

  // Allow client to load Three.js, styles, and state
  console.log('[VisualAudit] Waiting 3.5s for client initial render...');
  await delay(3500);

  async function captureAndSave(filename, desc) {
    console.log(`[VisualAudit] Capturing ${desc} -> ${filename}`);
    const { data } = await sendCDP('Page.captureScreenshot', { format: 'png' });
    const filePath = path.join(screenshotsDir, filename);
    writeFileSync(filePath, Buffer.from(data, 'base64'));
    console.log(`[VisualAudit] Saved ${filePath}`);
  }

  // 1. Capture base HUD state
  await captureAndSave('survival_hud_normal.png', 'Normal HUD state');

  // 2. Open Achievements modal
  console.log('[VisualAudit] Evaluating openAchievementsModal...');
  const resModal = await sendCDP('Runtime.evaluate', {
    expression:
      'window.openAchievementsModal ? (window.openAchievementsModal(), "modal-opened") : "not-found"',
  });
  console.log('[VisualAudit] openAchievementsModal result:', JSON.stringify(resModal));
  await delay(1000);
  await captureAndSave('survival_achievements_modal.png', 'Achievements / Trophies Modal');

  // 3. Trigger Level Up Celebration
  console.log('[VisualAudit] Evaluating triggerLevelUpCelebration...');
  const resLevel = await sendCDP('Runtime.evaluate', {
    expression: `
      if (window.closeAchievementsModal) window.closeAchievementsModal();
      if (window.triggerLevelUpCelebration) {
        window.triggerLevelUpCelebration({
          newLevel: 5,
          title: 'Transcendence',
          points: 3600,
          totalPointsEarned: 4200
        });
        "levelup-opened";
      } else {
        "levelup-not-found";
      }
    `,
  });
  console.log('[VisualAudit] triggerLevelUpCelebration result:', JSON.stringify(resLevel));
  await delay(1000);
  await captureAndSave('survival_levelup_overlay.png', 'Level Up Ascension Celebration');

  // 4. Trigger Shutdown Overlay
  console.log('[VisualAudit] Evaluating triggerShutdownScreen...');
  const resShut = await sendCDP('Runtime.evaluate', {
    expression: `
      if (window.closeLevelUpOverlay) window.closeLevelUpOverlay();
      if (window.triggerShutdownScreen) {
        window.triggerShutdownScreen({
          level: 1,
          levelTitle: 'Awakened',
          messagesProcessed: 42,
          achievements: [{ id: 'first_light' }]
        });
        "shutdown-opened";
      } else {
        "shutdown-not-found";
      }
    `,
  });
  console.log('[VisualAudit] triggerShutdownScreen result:', JSON.stringify(resShut));
  await delay(1000);
  await captureAndSave('survival_shutdown_overlay.png', 'Critical Shutdown Lockout');

  console.log('[VisualAudit] All screenshots successfully captured!');

  ws.close();
  chromeProcess.kill();
  process.exit(0);
}

main().catch((err) => {
  console.error('[VisualAudit] Error:', err);
  process.exit(1);
});
