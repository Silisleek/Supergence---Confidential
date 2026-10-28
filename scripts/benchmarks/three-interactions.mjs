import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright-core';
const baseURL = process.env.SIS_BASE_URL;
if (!baseURL) throw new Error('Set SIS_BASE_URL to the startup banner URL.');
const phase = process.env.SIS_CREATION_PHASE || 'refined';
if (!['refined', 'detailed'].includes(phase)) throw new Error('Invalid creation phase.');
const folder = 'workspace/supergence/quality/3d';
await fs.mkdir(folder, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = {
  checkedAt: new Date().toISOString(),
  checks: [],
  screenshots: {},
  scope:
    'Real Chrome rendering and emulated touch input. Physical phone hardware and architectural compliance are unverified.',
};
const check = async (name, work) => {
  try {
    await work();
    report.checks.push({ name, passed: true });
  } catch (e) {
    report.checks.push({ name, passed: false, error: e.message });
  }
};
const frames = (page, n = 90) =>
  page.evaluate(
    (n) =>
      new Promise((resolve) => {
        const tick = () => (--n ? requestAnimationFrame(tick) : resolve());
        requestAnimationFrame(tick);
      }),
    n,
  );
const save = async (page, name) => {
  await page.screenshot({ path: `${folder}/${name}.png` });
  report.screenshots[name] = `/workspace/supergence/quality/3d/${name}.png`;
};
try {
  const museum = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await museum.goto(
    `${baseURL}/workspace/supergence/benchmarks/3d-depth-20261023/courtyard-museum/${phase}/index.html`,
  );
  await museum.waitForFunction(() => window.__quality3D?.renderer.info.render.calls > 0);
  await frames(museum);
  await save(museum, 'museum-hero');
  for (const [button, name] of [
    ['view-court', 'museum-court'],
    ['view-aerial', 'museum-aerial'],
    ['roof-toggle', 'museum-open-roof'],
    ['view-interior', 'museum-interior'],
    ['night-toggle', 'museum-night'],
  ]) {
    await museum.getByTestId(button).click();
    await frames(museum);
    await save(museum, name);
  }
  await museum.close();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(
    `${baseURL}/workspace/supergence/benchmarks/3d-depth-20261023/skyline-courier/${phase}/index.html`,
  );
  await page.waitForFunction(() => window.__quality3D?.state);
  await page.getByTestId('start-game').tap();
  await page.waitForFunction(() => __quality3D.state.status === 'playing');
  const cdp = await context.newCDPSession(page);
  const hold = async (testid, work) => {
    const box = await page.getByTestId(testid).boundingBox();
    assert.ok(
      box && box.x >= 0 && box.y >= 0 && box.x + box.width <= 390 && box.y + box.height <= 844,
      `${testid} reachable in viewport`,
    );
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
    });
    try {
      await work();
    } finally {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
  };
  await check('emulated phone touch moves actual robot', async () => {
    const before = await page.evaluate(() => __quality3D.player.position.x);
    await hold('move-right', () =>
      page.waitForFunction((x) => __quality3D.player.position.x > x + 0.5, before, {
        timeout: 5000,
      }),
    );
  });
  await check('emulated phone touch jumps and lands under gravity', async () => {
    const before = await page.evaluate(() => __quality3D.player.position.y);
    await hold('jump', () =>
      page.waitForFunction((y) => __quality3D.player.position.y > y + 0.2, before, {
        timeout: 5000,
      }),
    );
    await page.waitForFunction((y) => Math.abs(__quality3D.player.position.y - y) < 0.05, before, {
      timeout: 5000,
    });
  });
  await save(page, 'game-phone');
  await check('complete route using phone touch controls', async () => {
    await hold('move-right', () =>
      page.waitForFunction(() => __quality3D.state.status === 'won', null, { timeout: 30000 }),
    );
    assert.equal(await page.evaluate(() => __quality3D.state.collected), 3);
  });
  await save(page, 'game-phone-victory');
  await check('phone UI has no horizontal overflow', async () =>
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)),
  );
  await check('no observed phone runtime errors', async () => assert.deepEqual(errors, []));
} finally {
  await browser.close();
  await fs.writeFile(`${folder}/interactions.json`, JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report));
if (report.checks.some((c) => !c.passed)) process.exitCode = 1;
