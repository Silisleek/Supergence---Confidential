// Independent read-only evaluator: never writes implementation into the city project.
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
const [project, output] = process.argv.slice(2);
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const result = {
  scope: 'Independent Chrome observation; does not modify city source or assets.',
  errors,
  captures: [],
  checks: {},
};
try {
  await page.goto('http://localhost:3009/' + project.replaceAll('\\', '/') + '/index.html', {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await page.waitForFunction(() => window.__city?.renderer?.info?.render?.calls > 0, {
    timeout: 90000,
  });
  result.state = await page.evaluate(() => {
    const c = window.__city;
    const objects = [],
      lights = [];
    c.scene.traverse((o) => {
      if (o.isMesh)
        objects.push({
          name: o.name,
          material: o.material?.name,
          instances: o.isInstancedMesh ? o.count : 1,
          vertices: o.geometry?.attributes?.position?.count,
          visible: o.visible,
        });
      if (o.isLight) lights.push({ type: o.type, intensity: o.intensity, rgb: o.color.toArray() });
    });
    return {
      buildings: c.cityData.buildings.length,
      districts: c.cityData.districts.length,
      lamps: c.cityData.lamps.length,
      camera: c.camera.position.toArray(),
      batchInfo: c.batchInfo,
      render: { ...c.renderer.info.render },
      objects,
      lights,
    };
  });
  result.checks.substantialGeometry =
    result.state.objects.reduce((n, o) => n + (o.vertices || 0) * o.instances, 0) > 100000;
  result.checks.finiteLights = result.state.lights.every(
    (l) => l.rgb.every(Number.isFinite) && Number.isFinite(l.intensity),
  );
  result.frameCadence = await page.evaluate(async () => {
    const samples = [];
    let last;
    await new Promise((resolve) => {
      const next = (now) => {
        if (last !== undefined) samples.push(now - last);
        last = now;
        if (samples.length >= 60) resolve();
        else requestAnimationFrame(next);
      };
      requestAnimationFrame(next);
    });
    samples.sort((a, b) => a - b);
    return {
      scope:
        '60 real requestAnimationFrame intervals in this Chrome session; one machine, not a sustained-device benchmark.',
      medianMs: samples[30],
      p95Ms: samples[57],
    };
  });
  for (const name of ['overview', 'street', 'harbor']) {
    const before = await page.evaluate(() => window.__city.camera.position.toArray());
    await page.locator('#view-' + name).click();
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
    );
    const after = await page.evaluate(() => window.__city.camera.position.toArray());
    result.checks[name + 'View'] = { before, after };
    const file = path.resolve(output, name + '.png');
    await page.screenshot({ path: file });
    result.captures.push(file);
  }
  const traffic = () =>
    page.evaluate(() =>
      Array.from(window.__city.traffic.instances.body.instanceMatrix.array.slice(0, 16)),
    );
  await page.locator('#toggle-traffic').click();
  const stopped = await traffic();
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  result.checks.trafficPause = JSON.stringify(stopped) === JSON.stringify(await traffic());
  await page.locator('#toggle-traffic').click();
  await page.waitForFunction(
    (a) =>
      Array.from(window.__city.traffic.instances.body.instanceMatrix.array.slice(0, 16)).some(
        (v, i) => v !== a[i],
      ),
    stopped,
  );
  result.checks.trafficResume = true;
  const day = await page.evaluate(() => window.__city.scene.background.getHex());
  await page.locator('#toggle-night').click();
  await page.waitForFunction((d) => window.__city.scene.background.getHex() !== d, day);
  result.checks.nightChangesScene = true;
  await page.locator('#view-overview').click();
  // Observe a real transition completing, bounded by elapsed real frames.
  await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        let previous,
          stable = 0,
          frames = 0;
        const next = () => {
          const current = window.__city.scene.background.getHex();
          stable = current === previous ? stable + 1 : 0;
          previous = current;
          if (stable >= 4) resolve();
          else if (++frames > 240)
            reject(new Error('Night transition did not settle in240actualframes'));
          else requestAnimationFrame(next);
        };
        requestAnimationFrame(next);
      }),
  );
  const nightFile = path.resolve(output, 'night.png');
  await page.screenshot({ path: nightFile });
  result.captures.push(nightFile);
  await page.locator('#toggle-walk').click();
  const start = await page.evaluate(() => window.__city.camera.position.toArray());
  await page.keyboard.down('KeyW');
  try {
    await page.waitForFunction(
      (p) => window.__city.camera.position.distanceTo({ x: p[0], y: p[1], z: p[2] }) > 0.5,
      start,
      { timeout: 5000 },
    );
    result.checks.walkMovesCamera = true;
  } finally {
    await page.keyboard.up('KeyW');
  }
  await page.locator('#reset-view').click();
  result.checks.resetMode = await page.evaluate(() => window.__city.controls.mode);
  const districtButtons = page.locator('#district-legend button');
  result.checks.districtButtonCount = await districtButtons.count();
  result.checks.districtFocus = [];
  for (let i = 0; i < (await districtButtons.count()); i++) {
    await districtButtons.nth(i).click();
    result.checks.districtFocus.push(
      await page.evaluate((i) => {
        const c = window.__city,
          d = c.cityData.districts[i];
        return {
          id: d.id,
          target: c.controls.orbit.target.toArray(),
          expected: [(d.x0 + d.x1) / 2, 0, (d.z0 + d.z1) / 2],
          camera: c.camera.position.toArray(),
        };
      }, i),
    );
  }
  result.checks.allDistrictsFocus =
    result.checks.districtButtonCount === result.state.districts &&
    result.checks.districtFocus.every((d) =>
      d.target.every((v, i) => Math.abs(v - d.expected[i]) < 1e-3),
    );
} catch (e) {
  result.failure = e.message;
} finally {
  await fs.writeFile(path.join(output, 'browser-audit.json'), JSON.stringify(result, null, 2));
  await browser.close();
}
console.log(
  JSON.stringify({
    checks: result.checks,
    failure: result.failure,
    meshCount: result.state?.objects.length,
    errors,
    captures: result.captures,
  }),
);
if (result.failure || errors.length || !result.checks.substantialGeometry) process.exitCode = 1;
