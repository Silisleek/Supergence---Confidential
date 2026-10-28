// Verifies the freshly built Electron package bundles the new UI.
// Reads app.asar directly (no extraction needed) and asserts the packaged
// client/ copy contains the mic button, chat button and live-feed module.
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2] || 'release-new';
const asar = path.join(OUT, 'win-unpacked', 'resources', 'app.asar');

if (!fs.existsSync(asar)) {
  console.error(`FAIL  app.asar missing at ${asar}`);
  process.exit(1);
}

const raw = fs.readFileSync(asar);
const s = raw.toString('latin1');

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

console.log(`asar: ${asar} (${(raw.length / 1048576).toFixed(1)} MB)\n`);

// The asar stores file contents concatenated, so raw substring search is a
// valid presence check for these unique markers.
const markers = [
  ['mic button id', 'sbt-btn-mic'],
  ['mic label element', 'sbt-mic-label'],
  ['mic level meter', 'sbt-mic-meter-fill'],
  ['chat button id', 'sbt-btn-chat'],
  ['chat unread badge', 'sbt-chat-badge'],
  ['live feed panel id', 'id="livefeed"'],
  ['live feed body', 'livefeed-body'],
  ['feed pause control', 'livefeed-pause'],
  ['feed purge control', 'livefeed-purge'],
  ['feed collapse control', 'livefeed-collapse'],
  ['live-feed module path', 'live-feed.js'],
  ['voice-output module path', 'voice-output.js'],
  ['LiveEventFeed import', 'LiveEventFeed'],
  ['VoiceOutput import', 'VoiceOutput'],
  ['feed CSS rule', '.livefeed-row'],
  ['mic pulse keyframes', 'sbt-mic-pulse'],
  ['fixed z-index 400', 'z-index:400'],
  ['chat unread event wiring', 'sis-chat-unread'],
];

for (const [name, needle] of markers) {
  check(name, s.includes(needle), s.includes(needle) ? '' : `missing "${needle}"`);
}

// Regression guard: the buggy layer value must not be the one packaged.
const flat = s.replace(/\s+/g, '');
check(
  'packaged feed uses z-index 400 (not the buggy 36)',
  /\.livefeed\{[^}]*z-index:400/.test(flat),
);

// Verify puppeteer (test-only) was not shipped into the app.
check('test-only puppeteer NOT packaged', !s.includes('puppeteer-core/package.json'));

console.log(`\nartifacts in ${OUT}:`);
for (const f of fs.readdirSync(OUT)) {
  const st = fs.statSync(path.join(OUT, f));
  if (st.isFile()) console.log(`  ${f} — ${(st.size / 1048576).toFixed(1)} MB`);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} package checks passed`);
if (failed.length) process.exit(1);
