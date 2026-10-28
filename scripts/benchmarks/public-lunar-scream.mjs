import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import express from 'express';
import { chromium } from 'playwright-core';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = path.join(repo, 'workspace/supergence/benchmarks/public-lunar-scream');
const args = process.argv.slice(2);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const qwenFile = option('--qwen-file') ? path.resolve(option('--qwen-file')) : null;
const output = path.resolve(
  option('--output') ||
    path.join(source, 'observations', new Date().toISOString().replaceAll(':', '-')),
);
await fs.mkdir(output, { recursive: true });
const provenance = JSON.parse(await fs.readFile(path.join(source, 'provenance.json'), 'utf8'));
for (const file of provenance.files) {
  const digest = createHash('sha256')
    .update(await fs.readFile(path.join(source, file.path)))
    .digest('hex');
  if (digest !== file.sha256) throw new Error(`Public source changed: ${file.path}`);
}

const app = express();
app.get('/favicon.ico', (_request, response) => response.status(204).end());
app.use('/originals', express.static(source));
app.use('/workspace', express.static(path.join(repo, 'workspace')));
app.use('/vendor/three', express.static(path.join(repo, 'node_modules/three')));
if (qwenFile) app.use('/qwen', express.static(path.dirname(qwenFile)));
const server = await new Promise((resolve) => {
  const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
});
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];

async function evaluateBuild(id, route, adapter) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) =>
    errors.push(`${request.url()}: ${request.failure()?.errorText}`),
  );
  await page.route('**/favicon.ico', (request) => request.fulfill({ status: 204, body: '' }));
  // Control frame time, never game state or physics. All inputs use normal buttons/keys.
  await page.addInitScript(() => {
    window.__comparisonClock = { now: 0, queue: [] };
    performance.now = () => window.__comparisonClock.now;
    window.requestAnimationFrame = (callback) => window.__comparisonClock.queue.push(callback);
    window.cancelAnimationFrame = () => {};
    window.__comparisonFrames = (count) => {
      for (let frame = 0; frame < count; frame++) {
        const clock = window.__comparisonClock;
        clock.now += 1000 / 60;
        const callbacks = clock.queue.splice(0);
        callbacks.forEach((callback) => callback(clock.now));
      }
    };
  });
  const result = {
    id,
    url: origin + route,
    adapter,
    errors,
    observations: {},
    screenshots: {},
    scope:
      'Deterministic keyboard smoke checks and screenshots. No full playthrough, quality score, or real microphone validation.',
  };
  const frames = (count) => page.evaluate((n) => window.__comparisonFrames(n), count);
  const shot = async (label) => {
    const filename = `${id}-${label}.png`;
    await page.screenshot({ path: path.join(output, filename), animations: 'disabled' });
    result.screenshots[label] = filename;
  };
  try {
    await page.goto(result.url, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => window.__comparisonClock.queue.length > 0, null, {
      timeout: 15000,
    });
    await frames(2);
    await shot('title');
    result.observations.canvasCount = await page.locator('canvas').count();
    if (adapter === 'astra') {
      await page.evaluate(() => {
        const step = window.LunarPhysics.step;
        window.LunarPhysics.step = (...args) => {
          window.__comparisonShip = args[0];
          return step(...args);
        };
      });
      await page.locator('#start').click();
    } else if (adapter === 'opus') {
      await page.locator('#kbBtn').click();
      await frames(60);
      await page.keyboard.press('Enter');
    } else if (adapter === 'qwen-v7') {
      await page.evaluate(() => {
        window.__micRequests = 0;
        navigator.mediaDevices.getUserMedia = async () => {
          window.__micRequests++;
          throw new DOMException('Controlled permission-denial test', 'NotAllowedError');
        };
      });
      await page.locator('#btnStart').click();
      await page.waitForFunction(() => window.__micRequests === 1);
    } else {
      // Unknown output gets observable input exercise only. Semantic assertions
      // must wait for an adapter based on its actual source, not guessed success.
      const labels = await page.locator('button').allTextContents();
      result.observations.buttons = labels;
      const start = page
        .getByRole('button', { name: /start|play|launch|keyboard|coward/i })
        .first();
      if (await start.count()) await start.click();
      else await page.keyboard.press('Enter');
    }
    await frames(2);
    const state = async () =>
      page.evaluate((kind) => {
        if (kind === 'opus')
          return {
            state: G.state,
            x: G.ship?.x,
            y: G.ship?.y,
            vy: G.ship?.vy,
            angle: G.ship?.a,
            paused: G.paused,
          };
        if (kind === 'astra')
          return window.__comparisonShip
            ? JSON.parse(JSON.stringify(window.__comparisonShip))
            : null;
        if (kind === 'qwen-v7')
          return {
            state,
            x: ship.x,
            y: ship.y,
            vy: ship.vy,
            vx: ship.vx,
            angle: ship.angle,
            fuel: ship.fuel,
            micDenied,
          };
        return null;
      }, adapter);
    const reset = async () => {
      if (adapter === 'qwen-v7') {
        await page.keyboard.press('p');
        await page.locator('#btnRestart').click();
        await frames(2);
        return;
      }
      await page.keyboard.press('r');
      if (adapter === 'opus') {
        await frames(60);
        await page.keyboard.press('Enter');
      }
      await frames(2);
    };
    result.observations.startedState = await state();
    await shot('started');
    await frames(30);
    const unpowered = await state();
    await reset();
    await page.keyboard.down('Space');
    await frames(30);
    await page.keyboard.up('Space');
    const powered = await state();
    result.observations.thrust = {
      unpowered,
      powered,
      upwardVelocityEffect: powered && unpowered ? powered.vy < unpowered.vy : null,
    };
    await shot('thrust');
    await reset();
    const beforeSteer = await state();
    await page.keyboard.down('ArrowRight');
    await frames(30);
    await page.keyboard.up('ArrowRight');
    const afterSteer = await state();
    result.observations.steering = {
      before: beforeSteer,
      after: afterSteer,
      changed:
        beforeSteer && afterSteer
          ? adapter === 'opus' || adapter === 'qwen-v7'
            ? afterSteer.angle !== beforeSteer.angle
            : afterSteer.vx !== beforeSteer.vx
          : null,
    };
    await shot('steering');
    await page.keyboard.press('p');
    const paused = await state();
    await frames(30);
    const afterPause = await state();
    result.observations.pause = {
      before: paused,
      after: afterPause,
      positionHeld:
        paused && afterPause ? paused.x === afterPause.x && paused.y === afterPause.y : null,
    };
    await page.keyboard.press('p');
    await reset();
    const restarted = await state();
    result.observations.restart = {
      state: restarted,
      returnedNearInitialPosition:
        restarted && result.observations.startedState
          ? Math.abs(restarted.y - result.observations.startedState.y) < 5
          : null,
    };
    await shot('restart');
    result.microphone =
      adapter === 'qwen-v7'
        ? 'Permission request and denied-permission keyboard fallback exercised. Real speech and granted microphone audio unverified.'
        : 'Unverified: keyboard substitute only; no microphone permissions requested.';
    result.subjectiveVisualQuality = 'Unscored; inspect saved screenshots side by side.';
  } catch (error) {
    result.failure = error.message;
    await shot('failure').catch(() => {});
  } finally {
    await page.close();
  }
  return result;
}

try {
  results.push(await evaluateBuild('public-opus-5.5', '/originals/opus-5.5/index.html', 'opus'));
  results.push(
    await evaluateBuild('public-gpt6-astra', '/originals/gpt6-astra/index.html', 'astra'),
  );
  if (qwenFile)
    results.push(
      await evaluateBuild(
        'supergence-qwen3.8-27b',
        `/qwen/${encodeURIComponent(path.basename(qwenFile))}`,
        option('--qwen-adapter') || 'unknown',
      ),
    );
  const report = {
    createdAt: new Date().toISOString(),
    promptFile: path.join(source, 'original-prompt.txt'),
    provenance: {
      repository: provenance.repository,
      commit: provenance.commit,
      attribution: provenance.modelAttribution,
    },
    harness:
      'Original files unchanged. Animation-frame clock controlled at60Hz for repeatable keyboard checks. Original physics remains active.',
    comparability:
      'Public creator outputs; model identity/settings not independently verified. Qwen generation workflow may differ. No aggregate ranking.',
    results,
  };
  await fs.writeFile(path.join(output, 'comparison.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ report: path.join(output, 'comparison.json'), results }, null, 2));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
