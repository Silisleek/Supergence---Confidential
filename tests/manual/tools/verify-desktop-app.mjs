// Verifies the desktop app's backend serves the updated UI.
// The Supergence Electron window loads http://localhost:3008, so driving that
// same origin proves what the packaged window renders after a reload.
import puppeteer from 'puppeteer-core';
import { execSync } from 'node:child_process';

const URL = 'http://localhost:3008/';
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

const results = [];
const check = (n, p, d = '') => {
  results.push({ n, p });
  console.log(`${p ? 'PASS' : 'FAIL'}  ${n}${d ? ` — ${d}` : ''}`);
};

const browser = await puppeteer.launch({
  executablePath: chromePath(),
  headless: 'new',
  args: ['--no-sandbox'],
  defaultViewport: { width: 1600, height: 950 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

// Hard reload semantics: bypass any cache, mirroring a window reload.
await page.setCacheEnabled(false);
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
await page.waitForFunction(() => !document.getElementById('app')?.classList.contains('hidden'), {
  timeout: 30000,
});
await new Promise((r) => setTimeout(r, 4000));

const ui = await page.evaluate(() => {
  const q = (id) => document.getElementById(id);
  const btn = (id) => {
    const r = q(id)?.getBoundingClientRect();
    return r ? { w: Math.round(r.width), h: Math.round(r.height) } : null;
  };
  return {
    mic: btn('sbt-btn-mic'),
    chat: btn('sbt-btn-chat'),
    feed: !!q('livefeed'),
    feedVisible: !!q('livefeed') && q('livefeed').getBoundingClientRect().height > 20,
    rows: document.querySelectorAll('.livefeed-row').length,
    modules: { live: !!window.liveFeed, voice: !!window.voiceOutput },
    conn: q('livefeed-conn')?.dataset.state,
    cssApplied: getComputedStyle(document.getElementById('sbt-btn-mic')).borderRadius,
    feedZ: getComputedStyle(q('livefeed')).zIndex,
  };
});

check('desktop-served UI has mic button', (ui.mic?.w || 0) > 20, JSON.stringify(ui.mic));
check('desktop-served UI has chat button', (ui.chat?.w || 0) > 20, JSON.stringify(ui.chat));
check('desktop-served UI has live feed panel', ui.feed && ui.feedVisible);
check('LiveEventFeed module initialised', ui.modules.live);
check('VoiceOutput module initialised', ui.modules.voice);
check('stylesheet applied (themed radius)', ui.cssApplied !== '0px', ui.cssApplied);
check('feed layered above holo windows', ui.feedZ === '400', `z-index=${ui.feedZ}`);
check(
  'feed streaming on desktop origin',
  ui.rows > 0 && ui.conn === 'online',
  `${ui.rows} rows, conn=${ui.conn}`,
);
check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));

await page.screenshot({ path: 'scratch/desktop-app-verified.png' });
await browser.close();

const failed = results.filter((r) => !r.p);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exit(1);
