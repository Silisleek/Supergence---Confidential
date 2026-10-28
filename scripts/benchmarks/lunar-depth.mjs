import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import { chromium } from 'playwright-core';

// Adapter for the preserved Qwen v7 implementation: observe lexical state;
// input is exclusively ordinary buttons and keys, never state mutation.
const directory = path.resolve(
  process.argv[2] || 'workspace/supergence/benchmarks/qwen-app-lunar-v7',
);
const output = path.join(directory, 'depth');
await fs.mkdir(output, { recursive: true });
const app = express();
app.use(express.static(directory));
app.get('/favicon.ico', (_req, res) => res.status(204).end());
const server = await new Promise((resolve) => {
  const handle = app.listen(0, '127.0.0.1', () => resolve(handle));
});
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const checks = [];
const check = async (name, run) => {
  try {
    checks.push({ name, passed: true, ...(await run()) });
  } catch (error) {
    checks.push({ name, passed: false, error: error.message });
  }
};
async function open({ width = 1440, height = 1000, synthetic = false } = {}) {
  const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 500 });
  page.setDefaultTimeout(10000);
  await page.addInitScript(
    ({ synthetic }) => {
      window.__clock = { now: 0, queue: [] };
      performance.now = () => window.__clock.now;
      window.requestAnimationFrame = (callback) => window.__clock.queue.push(callback);
      window.__frames = (count) => {
        for (let n = 0; n < count; n++) {
          __clock.now += 1000 / 60;
          __clock.queue.splice(0).forEach((fn) => fn(__clock.now));
        }
      };
      window.__micRequests = 0;
      navigator.mediaDevices.getUserMedia = async () => {
        window.__micRequests++;
        if (!synthetic) throw new DOMException('Tested denial', 'NotAllowedError');
        const ac = new AudioContext();
        await ac.resume();
        const oscillator = ac.createOscillator(),
          gain = ac.createGain(),
          destination = ac.createMediaStreamDestination();
        gain.gain.value = 0.18;
        oscillator.frequency.value = 220;
        oscillator.connect(gain).connect(destination);
        oscillator.start();
        window.__testAudio = { ac, oscillator, gain, stream: destination.stream };
        return destination.stream;
      };
    },
    { synthetic },
  );
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await page.locator('#btnStart').click();
  return page;
}
try {
  await check('crash, retry, and stored score', async () => {
    const page = await open();
    await page.evaluate(() => __frames(900));
    await page.waitForFunction(() => state === 'over');
    const crashed = await page.evaluate(() => ({
      dead: ship.dead,
      best,
      stored: localStorage.getItem('screamLunarBest'),
    }));
    if (!crashed.dead) throw new Error('No crash state');
    await page.locator('#btnAgain').click();
    if (!(await page.evaluate(() => state === 'playing' && !ship.dead)))
      throw new Error('Retry failed');
    await page.screenshot({ path: path.join(output, 'retry.png'), animations: 'disabled' });
    await page.close();
    return { observed: crashed };
  });
  await check('complete landing using keyboard feedback controller', async () => {
    const page = await open();
    let held = false,
      snapshot;
    for (let n = 0; n < 2500; n++) {
      snapshot = await page.evaluate(() => ({
        state,
        vy: ship.vy,
        y: ship.y,
        ground: groundYAt(ship.x),
        fuel: ship.fuel,
      }));
      if (snapshot.state !== 'playing') break;
      // Maintain a slow descent. This reads real physics and presses Space;
      // the test never teleports, changes fuel, or forces a victory state.
      const thrust = snapshot.vy > 1.7;
      if (thrust !== held) {
        await page.keyboard[thrust ? 'down' : 'up']('Space');
        held = thrust;
      }
      await page.evaluate(() => __frames(4));
    }
    if (held) await page.keyboard.up('Space');
    await page.screenshot({ path: path.join(output, 'landing.png'), animations: 'disabled' });
    await page.close();
    if (snapshot.state !== 'win') throw new Error('Did not land: ' + JSON.stringify(snapshot));
    return { observed: snapshot };
  });
  await check('synthetic microphone signal drives actual analyser and thrust', async () => {
    const page = await open({ synthetic: true });
    await page.waitForFunction(() => micReady && readMic() > 0.1, null, { polling: 50 });
    const before = await page.evaluate(() => ({
      vy: ship.vy,
      fuel: ship.fuel,
      rms: readMic(),
      requests: __micRequests,
    }));
    await page.evaluate(() => __frames(60));
    const after = await page.evaluate(() => ({
      vy: ship.vy,
      fuel: ship.fuel,
      thrust: ship.thrust,
      rms: readMic(),
    }));
    if (!(after.vy < before.vy && after.fuel < before.fuel))
      throw new Error('Audio did not affect real physics');
    await page.screenshot({ path: path.join(output, 'microphone.png'), animations: 'disabled' });
    await page.close();
    return {
      before,
      after,
      scope: 'Synthetic Web Audio stream; real hardware and human speech remain unverified.',
    };
  });
  await check('phone layout and touch thrust', async () => {
    const page = await open({ width: 390, height: 844 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 2,
    );
    const button = page.locator('#tScream');
    await button.dispatchEvent('pointerdown', { pointerId: 1 });
    await page.evaluate(() => __frames(30));
    const observed = await page.evaluate(() => ({ vy: ship.vy, fuel: ship.fuel }));
    await button.dispatchEvent('pointerup', { pointerId: 1 });
    await page.screenshot({ path: path.join(output, 'phone.png'), animations: 'disabled' });
    await page.close();
    if (overflow || observed.vy >= 0) throw new Error('Phone overflow or thrust failed');
    return { observed, scope: 'Pointer-handler integration; physical touchscreen unverified.' };
  });
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
const report = {
  createdAt: new Date().toISOString(),
  directory,
  checks,
  passed: checks.every((c) => c.passed),
  scope: 'Implementation-specific behavioral depth tests. No subjective visual score.',
};
await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
