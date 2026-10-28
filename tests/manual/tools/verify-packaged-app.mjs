// Launches the freshly built packaged Supergence app and drives its renderer
// over CDP to prove the mic button, chat button and live feed work inside the
// actual desktop window (not just a browser pointed at the same origin).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const OUT = process.argv[2] || 'release-new';
const EXE = path.resolve(OUT, 'win-unpacked', 'Supergence.exe');
const PORT = process.env.PACKAGED_TEST_PORT || '3011';

if (!fs.existsSync(EXE)) {
  console.error(`FAIL  missing ${EXE}`);
  process.exit(1);
}

// Isolated user-data so we never touch the real installed app's state.
const userData = path.join(os.tmpdir(), `supergence-verify-${Date.now()}`);
fs.mkdirSync(userData, { recursive: true });

console.log(`launching: ${EXE}`);
console.log(`user-data: ${userData}\n`);

const child = spawn(EXE, [`--remote-debugging-port=9333`, `--user-data-dir=${userData}`], {
  env: { ...process.env, PORT },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let out = '';
child.stdout.on('data', (d) => {
  out += d.toString();
});
child.stderr.on('data', (d) => {
  out += d.toString();
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Wait for the packaged app's own backend to come up.
let backendUp = false;
for (let i = 0; i < 60; i++) {
  await sleep(2000);
  try {
    const r = await fetch(`http://localhost:${PORT}/api/health`);
    if (r.ok) {
      backendUp = true;
      break;
    }
  } catch {}
}
console.log(
  backendUp ? `packaged backend UP on ${PORT}` : `packaged backend NOT responding on ${PORT}`,
);
if (!backendUp) {
  console.log('--- app output ---\n' + out.slice(-2500));
  child.kill();
  process.exit(1);
}

// Attach to the packaged renderer over CDP and assert the real window's DOM.
const listRes = await fetch('http://127.0.0.1:9333/json/list');
const targets = await listRes.json();
const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
if (!page) {
  console.error('FAIL  no renderer page target');
  child.kill();
  process.exit(1);
}
console.log(`renderer target: ${page.url}\n`);

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = rej;
});

let msgId = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
};
function send(method, params = {}) {
  const id = ++msgId;
  return new Promise((res) => {
    pending.set(id, res);
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text);
  return r.result?.result?.value;
}

await send('Runtime.enable');
await send('Page.enable');

// Reload so the window picks up the packaged client copy.
await send('Page.reload', { ignoreCache: true });
await sleep(12000);

const results = [];
const check = (n, ok, d = '') => {
  results.push({ n, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? ` — ${d}` : ''}`);
};

const ui = await evaluate(`(() => {
  const q = id => document.getElementById(id);
  const r = id => { const b = q(id)?.getBoundingClientRect(); return b ? {w:Math.round(b.width),h:Math.round(b.height)} : null; };
  return {
    url: location.href,
    appVisible: !q('app')?.classList.contains('hidden'),
    mic: r('sbt-btn-mic'), chat: r('sbt-btn-chat'),
    feedVisible: !!q('livefeed') && q('livefeed').getBoundingClientRect().height > 20,
    feedZ: q('livefeed') ? getComputedStyle(q('livefeed')).zIndex : null,
    rows: document.querySelectorAll('.livefeed-row').length,
    conn: q('livefeed-conn')?.dataset.state,
    modules: { live: !!window.liveFeed, voice: !!window.voiceOutput }
  };
})()`);

check('packaged window loaded its UI', ui.appVisible, ui.url);
check('packaged window shows mic button', (ui.mic?.w || 0) > 20, JSON.stringify(ui.mic));
check('packaged window shows chat button', (ui.chat?.w || 0) > 20, JSON.stringify(ui.chat));
check('packaged window shows live feed', ui.feedVisible);
check('packaged feed layered above windows', ui.feedZ === '400', `z-index=${ui.feedZ}`);
check('LiveEventFeed running in packaged app', ui.modules.live);
check('VoiceOutput running in packaged app', ui.modules.voice);
check(
  'packaged feed streaming live',
  ui.rows > 0 && ui.conn === 'online',
  `${ui.rows} rows, conn=${ui.conn}`,
);

// Drive the real buttons in the packaged window.
const micToggle = await evaluate(`(() => {
  const b = document.getElementById('sbt-btn-mic');
  const before = window.voiceOutput?.enabled;
  b.click();
  return new Promise(r => setTimeout(() => r({
    before, after: window.voiceOutput?.enabled,
    label: document.getElementById('sbt-mic-label').textContent,
    pressed: b.getAttribute('aria-pressed')
  }), 400));
})()`);
check(
  'packaged mic button toggles voice',
  micToggle.before === false && micToggle.after === true,
  `${micToggle.label}, pressed=${micToggle.pressed}`,
);

const chatOpen = await evaluate(`(() => {
  document.getElementById('sbt-btn-chat').click();
  return new Promise(r => setTimeout(() => {
    const p = document.getElementById('chat-panel');
    r({ hidden: p.classList.contains('hidden'), label: document.getElementById('sbt-chat-label').textContent });
  }, 900));
})()`);
check(
  'packaged chat button opens chat',
  !chatOpen.hidden && /OPEN/.test(chatOpen.label),
  chatOpen.label,
);

// Capture the actual packaged window for visual proof.
const shot = await send('Page.captureScreenshot', { format: 'png' });
if (shot.result?.data) {
  fs.writeFileSync('scratch/packaged-app-verified.png', Buffer.from(shot.result.data, 'base64'));
  console.log('\nscreenshot: scratch/packaged-app-verified.png');
}

ws.close();
child.kill();
await sleep(1500);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} packaged-app checks passed`);
if (!backendUp || failed.length) {
  console.log('--- app output tail ---\n' + out.slice(-2000));
  process.exit(1);
}
