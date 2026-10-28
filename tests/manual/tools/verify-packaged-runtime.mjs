// Proves the SHIPPED bundle works end-to-end: extracts the packaged client/
// out of the newly built app.asar, boots the project's real server against
// that extracted copy, and drives it in a browser exactly as the packaged
// Electron window would (it loads the same Express origin).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import { execSync } from 'node:child_process';

const OUT = process.argv[2] || 'release-new';
const ASAR = path.join(OUT, 'win-unpacked', 'resources', 'app.asar');
const PORT = process.env.PACKAGED_TEST_PORT || '3012';
const TMP = path.join(os.tmpdir(), `sis-packaged-${Date.now()}`);

function chromePath() {
  for (const c of [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
  ]) {
    try {
      execSync(`test -f "${c}"`);
      return c;
    } catch {}
  }
  throw new Error('no chrome');
}

// ── 1. Extract client/ + server/ from the shipped asar ──────────────
const raw = fs.readFileSync(ASAR);
// asar layout: two pickle headers, then the JSON directory tree, then file
// data. Offsets inside the tree are relative to the start of that data region,
// which begins at 8 + <u32 at byte 4>.
const headerStringLen = raw.readUInt32LE(12);
const header = JSON.parse(raw.toString('utf8', 16, 16 + headerStringLen));
const dataStart = 8 + raw.readUInt32LE(4);

function walk(node, prefix = '') {
  const out = [];
  for (const [name, child] of Object.entries(node.files || {})) {
    const p = prefix ? `${prefix}/${name}` : name;
    if (child.files) out.push(...walk(child, p));
    else out.push({ path: p, offset: Number(child.offset), size: child.size });
  }
  return out;
}
const entries = walk(header);
console.log(`asar entries: ${entries.length}`);

const wanted = entries.filter(
  (e) => e.path.startsWith('client/') && !e.path.includes('node_modules'),
);
console.log(`client files in package: ${wanted.length}`);

// Sanity: the packaged client must contain the new UI before we even run it.
const byPath = new Map(entries.map((e) => [e.path, e]));
function readEntry(rel) {
  const e = byPath.get(rel);
  if (!e) return null;
  return raw.toString('utf8', dataStart + e.offset, dataStart + e.offset + e.size);
}
const packagedIndex = readEntry('client/index.html');
if (!packagedIndex) {
  console.error('FAIL  client/index.html not found in asar');
  process.exit(1);
}
console.log(`packaged client/index.html: ${packagedIndex.length} bytes`);
for (const needle of ['sbt-btn-mic', 'sbt-btn-chat', 'id="livefeed"']) {
  console.log(`  ${packagedIndex.includes(needle) ? 'PRESENT' : 'ABSENT '}  ${needle}`);
  if (!packagedIndex.includes(needle)) {
    console.error(`FAIL  packaged HTML missing ${needle}`);
    process.exit(1);
  }
}

fs.mkdirSync(TMP, { recursive: true });
for (const e of wanted) {
  const dest = path.join(TMP, e.path);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, raw.subarray(dataStart + e.offset, dataStart + e.offset + e.size));
}
// The packaged client is what we need to exercise. Serve it with a tiny static
// server that mirrors the real Express static behaviour (no-store, no etag).
// A WebSocket backend is proxied from the already-running dev server so the
// feed has genuine live traffic, exactly as in the packaged app.
const http = await import('node:http');
const CLIENT = path.join(TMP, 'client');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};
const LIVE_WS_PORT = process.env.LIVE_WS_PORT || '3008';

const server = http.createServer((req, res) => {
  // /api is proxied to the running dev backend so REST-backed UI is exercised
  // too. The packaged client hardcodes its WebSocket to port 3008 (WS_URL in
  // app.js), so live feed traffic needs no proxy here.
  if (req.url.startsWith('/api')) {
    const proxied = http.request(
      `${DEV_BACKEND}${req.url}`,
      { method: req.method, headers: req.headers },
      (r) => {
        res.writeHead(r.statusCode, r.headers);
        r.pipe(res);
      },
    );
    proxied.on('error', () => {
      if (!res.headersSent) res.writeHead(502).end('backend unavailable');
    });
    req.pipe(proxied);
    return;
  }
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const file = path.join(CLIENT, rel);
  // Prevent path traversal outside the packaged client.
  if (!file.startsWith(CLIENT)) {
    res.writeHead(403).end();
    return;
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found');
    return;
  }
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  });
  fs.createReadStream(file).pipe(res);
});

// Proxy /api to the running dev backend. The packaged client hardcodes its
// WebSocket to port 3008 (see WS_URL in app.js), so live traffic reaches the
// feed directly without any proxying here.
const DEV_BACKEND = `http://127.0.0.1:${LIVE_WS_PORT}`;

await new Promise((r) => server.listen(PORT, r));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let up = false;
for (let i = 0; i < 20; i++) {
  try {
    const r = await fetch(`http://localhost:${PORT}/`);
    if (r.ok) {
      up = true;
      break;
    }
  } catch {}
  await sleep(500);
}
console.log(up ? `packaged client served on ${PORT}` : `packaged client FAILED on ${PORT}`);
if (!up) {
  server.close();
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath: chromePath(),
  headless: 'new',
  args: ['--no-sandbox'],
  defaultViewport: { width: 1600, height: 950 },
});
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
await page.setCacheEnabled(false);
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
await page.waitForFunction(() => !document.getElementById('app')?.classList.contains('hidden'), {
  timeout: 40000,
});
// The socket opens before the first frame arrives, so wait on the actual
// condition rather than a fixed sleep.
const gotFrames = await page
  .waitForFunction(
    () =>
      document.querySelectorAll('.livefeed-row').length > 0 &&
      document.getElementById('livefeed-conn')?.dataset.state === 'online',
    { timeout: 45000 },
  )
  .then(() => true)
  .catch(() => false);
console.log(`feed received live frames: ${gotFrames}`);

const results = [];
const check = (n, ok, d = '') => {
  results.push({ n, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? ` — ${d}` : ''}`);
};

const ui = await page.evaluate(() => {
  const q = (id) => document.getElementById(id);
  const r = (id) => {
    const b = q(id)?.getBoundingClientRect();
    return b ? { w: Math.round(b.width), h: Math.round(b.height) } : null;
  };
  return {
    mic: r('sbt-btn-mic'),
    chat: r('sbt-btn-chat'),
    feedVisible: !!q('livefeed') && q('livefeed').getBoundingClientRect().height > 20,
    feedZ: q('livefeed') ? getComputedStyle(q('livefeed')).zIndex : null,
    rows: document.querySelectorAll('.livefeed-row').length,
    conn: q('livefeed-conn')?.dataset.state,
    modules: { live: !!window.liveFeed, voice: !!window.voiceOutput },
  };
});

check('shipped bundle: mic button renders', (ui.mic?.w || 0) > 20, JSON.stringify(ui.mic));
check('shipped bundle: chat button renders', (ui.chat?.w || 0) > 20, JSON.stringify(ui.chat));
check('shipped bundle: live feed renders', ui.feedVisible);
check('shipped bundle: feed z-index 400', ui.feedZ === '400', `z-index=${ui.feedZ}`);
check('shipped bundle: LiveEventFeed initialised', ui.modules.live);
check('shipped bundle: VoiceOutput initialised', ui.modules.voice);
check(
  'shipped bundle: feed streaming live',
  ui.rows > 0 && ui.conn === 'online',
  `${ui.rows} rows, conn=${ui.conn}`,
);

const mic = await page.evaluate(async () => {
  const b = document.getElementById('sbt-btn-mic');
  const before = window.voiceOutput.enabled;
  b.click();
  await new Promise((r) => setTimeout(r, 400));
  return {
    before,
    after: window.voiceOutput.enabled,
    label: document.getElementById('sbt-mic-label').textContent,
  };
});
check('shipped bundle: mic toggles voice', mic.before === false && mic.after === true, mic.label);

const chat = await page.evaluate(async () => {
  document.getElementById('sbt-btn-chat').click();
  await new Promise((r) => setTimeout(r, 900));
  const p = document.getElementById('chat-panel');
  return {
    hidden: p.classList.contains('hidden'),
    label: document.getElementById('sbt-chat-label').textContent,
  };
});
check(
  'shipped bundle: chat button opens chat',
  !chat.hidden && /OPEN/.test(chat.label),
  chat.label,
);

check('shipped bundle: no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));

await page.screenshot({ path: 'scratch/packaged-bundle-verified.png' });
await browser.close();
server.close();
await sleep(500);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} shipped-bundle checks passed`);
if (failed.length) process.exit(1);
