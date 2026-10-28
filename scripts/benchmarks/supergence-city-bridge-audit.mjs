// Independent browser interaction/transform observation. Never modifies city files.
import fs from 'node:fs/promises';
import { chromium } from 'playwright-core';
const [output] = process.argv.slice(2);
const bridgeIndex = Number(process.argv[3] || 0);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const result = {
  scope:
    'Independent Chrome bridge traversal and actual vehicle transform probe; no source/asset writes.',
};
try {
  await page.goto(
    'http://localhost:3009/workspace/supergence/projects/meridian-harbor-20261024-845b8f71/index.html',
    { waitUntil: 'domcontentloaded' },
  );
  await page.waitForFunction(() => window.__city?.renderer.info.render.calls > 0, null, {
    timeout: 90000,
  });
  result.vehicles = await page.evaluate(() => {
    const c = window.__city;
    return c.traffic.vehicles
      .map((v, i) => {
        const a = c.traffic.instances.body.instanceMatrix.array,
          w = c.traffic.instances.wheel.instanceMatrix.array;
        return {
          index: i,
          route: v.route.name,
          bridge: !!v.route.bridge,
          bodyY: a[i * 16 + 13],
          wheelY: w[i * 4 * 16 + 13],
        };
      })
      .filter((v) => v.bridge);
  });
  const bridge = await page.evaluate((index) => {
    const c = window.__city,
      b = c.cityData.bridges[index];
    c.controls.orbit.target.set(b.x0 - 8, 0, b.z);
    c.controls.orbit.update();
    return b;
  }, bridgeIndex);
  await page.locator('#toggle-walk').click();
  result.bridge = bridge;
  result.start = await page.evaluate(() => window.__city.camera.position.toArray());
  await page.keyboard.down('KeyD');
  try {
    await page.waitForFunction((x) => window.__city.camera.position.x > x, bridge.x1 + 2, {
      timeout: 16000,
    });
    result.walkedAcross = true;
  } catch (e) {
    result.walkedAcross = false;
    result.failure = 'Ground navigation did not cross the actual first bridge in16seconds.';
  } finally {
    await page.keyboard.up('KeyD');
  }
  result.end = await page.evaluate(() => window.__city.camera.position.toArray());
  await page.screenshot({ path: output.replace(/\.json$/, '.png') });
} catch (e) {
  result.error = e.message;
} finally {
  await fs.writeFile(output, JSON.stringify(result, null, 2));
  await browser.close();
}
console.log(JSON.stringify(result));
if (!result.walkedAcross) process.exitCode = 1;
