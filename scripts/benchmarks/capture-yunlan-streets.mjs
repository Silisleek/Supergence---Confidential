// Controlled camera fixtures using the native Walker, not city implementation.
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
const output = path.resolve('test-results/project-workflow/street-review');
await fs.mkdir(output, { recursive: true });
const report = {
  scope:
    'Controlled-position street/interior image inspection; real input/navigation acceptance is tested separately.',
  captures: [],
  errors: [],
};
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-gl=angle', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on('pageerror', (e) => report.errors.push(e.message));
  await page.goto(process.argv[2], { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.YUNLAN?.ready, null, { timeout: 120000, polling: 100 });
  const fixtures = [
    ['historic-street', -280, -220, Math.PI, false],
    ['shopping-street', 0, 300, Math.PI, false],
    ['canal-bank', -310, -27, -1.1, false],
    ['teahouse-interior', -318, -196, 0, false],
    ['canal-night', -310, -27, -1.1, true],
  ];
  for (const [name, x, z, yaw, night] of fixtures) {
    const before = await page.evaluate(
      ({ x, z, yaw, night }) => {
        const app = window.YUNLAN,
          w = app.controls.walker;
        app.controls.setMode('walk');
        app.setNight(night);
        w.placeAt(x, z, yaw);
        w.pitch = -0.03;
        w.update(1 / 60);
        return app.frames;
      },
      { x, z, yaw, night },
    );
    await page.waitForFunction((f) => window.YUNLAN.frames > f + 5, before, {
      timeout: 60000,
      polling: 100,
    });
    await page.evaluate(() => {
      window.__streetMeasure = { time: performance.now(), frames: window.YUNLAN.frames };
    });
    await page.waitForFunction(
      () => performance.now() - window.__streetMeasure.time >= 2500,
      null,
      { timeout: 60000, polling: 100 },
    );
    const state = await page.evaluate(() => {
      const a = window.YUNLAN,
        m = window.__streetMeasure,
        ms = performance.now() - m.time;
      return {
        pose: a.controls.walker.pos.toArray(),
        camera: a.camera.position.toArray(),
        wallMs: ms,
        frames: a.frames - m.frames,
        fps: ((a.frames - m.frames) * 1000) / ms,
        drawCalls: a.renderer.info.render.calls,
        triangles: a.renderer.info.render.triangles,
        appErrors: a.errors,
      };
    });
    const file = path.join(output, name + '.png');
    await page.screenshot({ path: file, timeout: 60000 });
    report.captures.push({ name, file, ...state });
  }
} catch (error) {
  report.failure = error.message;
} finally {
  await browser.close();
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report));
if (report.failure || report.errors.length) process.exitCode = 1;
