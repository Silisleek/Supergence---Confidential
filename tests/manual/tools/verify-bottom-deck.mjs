// Verifies the bottom-deck mic + chat buttons and the real-time event feed
// against the RUNNING SIS server, driving a real browser and a real WebSocket.
import puppeteer from 'puppeteer-core';
import { execSync } from 'node:child_process';

const URL = process.env.SIS_URL || 'http://localhost:3008/';

function chromePath() {
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
  ];
  for (const c of candidates) {
    try {
      execSync(`test -f "${c}"`);
      return c;
    } catch {}
  }
  throw new Error('Chrome not found');
}

const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const browser = await puppeteer.launch({
  executablePath: chromePath(),
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 1600, height: 950 },
});

const page = await browser.newPage();
const consoleErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });

// Wait for boot to finish and the app to be visible.
await page.waitForFunction(() => !document.getElementById('app')?.classList.contains('hidden'), {
  timeout: 30000,
});
await new Promise((r) => setTimeout(r, 4000));

// ── 1. Markup present ──────────────────────────────────────────────
const dom = await page.evaluate(() => {
  const q = (id) => document.getElementById(id);
  return {
    mic: !!q('sbt-btn-mic'),
    chat: !!q('sbt-btn-chat'),
    feed: !!q('livefeed'),
    feedBody: !!q('livefeed-body'),
    micLabel: q('sbt-mic-label')?.textContent,
    chatLabel: q('sbt-chat-label')?.textContent,
    deckRect: (() => {
      const d = document.querySelector('.stark-bottom-command-deck');
      if (!d) return null;
      const r = d.getBoundingClientRect();
      return { bottom: Math.round(r.bottom), height: Math.round(r.height), vh: window.innerHeight };
    })(),
    micRect: (() => {
      const r = q('sbt-btn-mic')?.getBoundingClientRect();
      return r ? { w: Math.round(r.width), h: Math.round(r.height) } : null;
    })(),
  };
});

check('mic button exists', dom.mic);
check('chat button exists', dom.chat);
check('live feed panel exists', dom.feed && dom.feedBody);
check(
  'buttons are visible with real size',
  (dom.micRect?.w || 0) > 20 && (dom.micRect?.h || 0) > 10,
  JSON.stringify(dom.micRect),
);
check(
  'deck is pinned to viewport bottom',
  dom.deckRect && Math.abs(dom.deckRect.bottom - dom.deckRect.vh) <= 2,
  JSON.stringify(dom.deckRect),
);

// ── 2. Voice toggle is a real state change ─────────────────────────
const beforeVoice = await page.evaluate(() => ({
  label: document.getElementById('sbt-mic-label').textContent,
  pressed: document.getElementById('sbt-btn-mic').getAttribute('aria-pressed'),
  on: window.voiceOutput?.enabled,
}));
await page.click('#sbt-btn-mic');
await new Promise((r) => setTimeout(r, 400));
const afterVoice = await page.evaluate(() => ({
  label: document.getElementById('sbt-mic-label').textContent,
  pressed: document.getElementById('sbt-btn-mic').getAttribute('aria-pressed'),
  on: window.voiceOutput?.enabled,
  cls: document.getElementById('sbt-btn-mic').className,
}));
check(
  'mic toggles voice ON',
  beforeVoice.on === false && afterVoice.on === true,
  `${beforeVoice.label} -> ${afterVoice.label}`,
);
check(
  'mic aria-pressed reflects state',
  afterVoice.pressed === 'true' && afterVoice.cls.includes('is-active'),
);

// Toggling back off must also work.
await page.click('#sbt-btn-mic');
await new Promise((r) => setTimeout(r, 300));
const offAgain = await page.evaluate(() => window.voiceOutput?.enabled);
check('mic toggles voice OFF', offAgain === false);

// ── 3. Chat button opens / focuses the chat window ─────────────────
await page.click('#sbt-btn-chat');
await new Promise((r) => setTimeout(r, 700));
const chatState = await page.evaluate(() => {
  const panel = document.getElementById('chat-panel');
  const r = panel.getBoundingClientRect();
  const btn = document.getElementById('sbt-btn-chat');
  return {
    visible: !panel.classList.contains('hidden'),
    hasSize: r.width > 100 && r.height > 100,
    focused: document.activeElement?.id,
    pressed: btn.getAttribute('aria-pressed'),
    label: document.getElementById('sbt-chat-label').textContent,
  };
});
check('chat button reveals chat panel', chatState.visible);
check('chat panel has real size', chatState.hasSize);
check(
  'chat button shows OPEN state',
  chatState.pressed === 'true' && /OPEN/.test(chatState.label),
  chatState.label,
);
check(
  'chat input receives focus',
  chatState.focused === 'chat-input',
  `focus=${chatState.focused}`,
);

// ── 4. Send a message; the server must reply over the real socket ──
await page.evaluate(() => {
  const input = document.getElementById('chat-input');
  input.value = 'Reply with the single word: online';
  input.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.keyboard.press('Enter');
await new Promise((r) => setTimeout(r, 1000));

const sendState = await page.evaluate(() => ({
  msgs: document.querySelectorAll('#chat-messages .message').length,
  conn: document.getElementById('livefeed-conn')?.dataset.state,
  connLabel: document.getElementById('livefeed-conn-label')?.textContent,
}));
check('message posted into chat', sendState.msgs > 0, `${sendState.msgs} messages`);
check(
  'feed reports live socket connection',
  sendState.conn === 'online',
  `${sendState.conn}/${sendState.connLabel}`,
);

// Wait for the brain to actually respond.
await page
  .waitForFunction(
    () => document.querySelectorAll('#chat-messages .message.assistant').length > 0,
    { timeout: 90000 },
  )
  .catch(() => {});
await new Promise((r) => setTimeout(r, 1500));

// ── 5. Live feed must contain REAL frames, not canned rows ─────────
// Wait until the reply's token/reply traffic has actually landed in the feed.
await page
  .waitForFunction(
    () => {
      const types = [...document.querySelectorAll('.livefeed-row')].map((r) => r.dataset.type);
      return types.some((t) => /token|complete|status|agent|step|reasoning/.test(t));
    },
    { timeout: 90000 },
  )
  .catch(() => {});

const feed = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.livefeed-row')];
  return {
    rowCount: rows.length,
    types: [...new Set(rows.map((r) => r.dataset.type))],
    total: document.getElementById('livefeed-total')?.textContent,
    rate: document.getElementById('livefeed-rate')?.textContent,
    channels: document.getElementById('livefeed-channels')?.textContent,
    channelStats: window.liveFeed?.getChannelStats?.().slice(0, 12),
    firstRowText: rows[0]?.textContent?.trim().slice(0, 90),
    hasRawJson: !!document.querySelector('.livefeed-raw')?.textContent?.includes('type'),
  };
});
check('feed received real events', feed.rowCount > 0, `${feed.rowCount} rows, total=${feed.total}`);
check('feed shows multiple real channels', feed.types.length >= 2, feed.types.join(', '));
check(
  'feed channel count is derived from traffic',
  Number(feed.channels) === feed.types.length,
  `channels=${feed.channels} distinct=${feed.types.length}`,
);
check('feed rows carry real payload text', !!feed.firstRowText, feed.firstRowText);
check('feed rows expose raw JSON payload', feed.hasRawJson);

// Feed must include reply traffic specifically.
check(
  'feed captured chat token/reply traffic',
  feed.types.some((t) => /token|complete|status|agent|step/.test(t)),
  feed.types.join(', '),
);

// ── 6. Reply actually landed and feed/chat agree ───────────────────
const final = await page.evaluate(() => {
  const asst = [...document.querySelectorAll('#chat-messages .message.assistant')];
  const last = asst[asst.length - 1];
  return {
    assistantCount: asst.length,
    lastReply: (last?.querySelector('.message-body')?.textContent || '').trim().slice(0, 120),
    micLabel: document.getElementById('sbt-mic-label').textContent,
    voiceOn: window.voiceOutput?.enabled,
  };
});
check('SIS produced an assistant reply', final.assistantCount > 0, final.lastReply);

// ── 7. Unread badge reflects real chat activity ────────────────────
const badge = await page.evaluate(() => {
  const b = document.getElementById('sbt-chat-badge');
  const panel = document.getElementById('chat-panel');
  return {
    text: b.textContent,
    hidden: b.classList.contains('hidden'),
    panelHidden: panel.classList.contains('hidden'),
  };
});
check(
  'badge state is consistent with chat visibility',
  badge.hidden === !badge.panelHidden || badge.text === '0',
  JSON.stringify(badge),
);

// ── 8. Feed controls ───────────────────────────────────────────────
// Assert the controls are genuinely the top-most element at their own point,
// so a covered button cannot produce a false pass.
const clickable = await page.evaluate(() => {
  const out = {};
  for (const id of ['livefeed-pause', 'livefeed-purge', 'livefeed-collapse']) {
    const el = document.getElementById(id);
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    out[id] = !!(top && (top === el || el.contains(top)));
  }
  return out;
});
check(
  'feed controls are not covered by any window',
  Object.values(clickable).every(Boolean),
  JSON.stringify(clickable),
);

await page.click('#livefeed-pause');
await new Promise((r) => setTimeout(r, 400));
// Baseline must be captured AFTER the pause takes effect, otherwise ordinary
// live traffic between the earlier snapshot and this click looks like a failure.
const paused = await page.evaluate(() => ({
  paused: window.liveFeed?.paused,
  label: document.getElementById('livefeed-pause-label').textContent,
  rows: document.querySelectorAll('.livefeed-row').length,
}));
await new Promise((r) => setTimeout(r, 4000));
const rowsWhilePaused = await page.evaluate(
  () => document.querySelectorAll('.livefeed-row').length,
);
check(
  'pause halts new feed rows',
  paused.paused === true && rowsWhilePaused === paused.rows,
  `${paused.rows} -> ${rowsWhilePaused} over 4s while paused, ${paused.label}`,
);

await page.click('#livefeed-pause');
await new Promise((r) => setTimeout(r, 100));

// Collapse / expand
await page.click('#livefeed-collapse');
await new Promise((r) => setTimeout(r, 250));
const collapsed = await page.evaluate(() =>
  document.getElementById('livefeed').classList.contains('collapsed'),
);
await page.click('#livefeed-collapse');
await new Promise((r) => setTimeout(r, 250));
const expanded = await page.evaluate(
  () => !document.getElementById('livefeed').classList.contains('collapsed'),
);
check('feed collapses and expands', collapsed && expanded);

// Purge. Pause first so live traffic cannot race the assertion window, and read
// the counters in the same tick as the purge so no event can land in between.
await page.click('#livefeed-pause');
await new Promise((r) => setTimeout(r, 400));
const purged = await page.evaluate(async () => {
  document.getElementById('livefeed-purge').click();
  // The empty-state flag is applied on the next animation frame.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return {
    rows: document.querySelectorAll('.livefeed-row').length,
    total: document.getElementById('livefeed-total').textContent,
    channels: document.getElementById('livefeed-channels').textContent,
    emptyShown: !document.getElementById('livefeed-empty').classList.contains('hidden'),
    channelStats: window.liveFeed.getChannelStats().length,
  };
});
check(
  'purge clears the buffer',
  purged.rows === 0 &&
    purged.total === '0' &&
    purged.channels === '0' &&
    purged.channelStats === 0 &&
    purged.emptyShown,
  JSON.stringify(purged),
);

// Resume and confirm the stream comes back.
await page.click('#livefeed-pause');
await new Promise((r) => setTimeout(r, 4000));
const afterPurge = await page.evaluate(() => document.querySelectorAll('.livefeed-row').length);
check('feed resumes streaming after purge', afterPurge > 0, `${afterPurge} new rows`);

// ── 9. No JS errors ────────────────────────────────────────────────
const realErrors = consoleErrors.filter(
  (e) => !/favicon|Failed to load resource|net::ERR_/i.test(e),
);
check('no page/console errors', realErrors.length === 0, realErrors.slice(0, 4).join(' | '));

await page.screenshot({ path: 'scratch/bottom-deck-verified.png', fullPage: false });

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('FAILED:');
  for (const f of failed) console.log(`  - ${f.name} ${f.detail}`);
  process.exit(1);
}
