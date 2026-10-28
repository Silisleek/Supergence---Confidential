// Visual inspection fixtures use the city's own preset goals and instant
// controller positioning. These are not animated-navigation acceptance tests.
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
const output = path.resolve('test-results/project-workflow/static-views');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const captures = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(90000);
  await page.goto(process.argv[2], { waitUntil: 'commit' });
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    if (await page.evaluate(() => !!window.YUNLAN?.ready)) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  for (const preset of ['historic', 'bridge', 'shopping']) {
    await page.locator(`[data-view="${preset}"]`).click();
    const frame = await page.evaluate(() => {
      const a = window.YUNLAN,
        o = a.controls.orbit;
      o.flyTo(o.goalPos.toArray(), o.goalTarget.toArray(), true);
      o.update(0);
      return a.frames;
    });
    await page.waitForFunction((old) => window.YUNLAN.frames > old, frame, {
      polling: 100,
      timeout: 90000,
    });
    const file = path.join(output, preset + '.png');
    await page.screenshot({ path: file, timeout: 60000 });
    captures.push({ preset, file });
    console.log(JSON.stringify(captures.at(-1)));
  }
  await page.locator('#btn-night').click();
  const frame = await page.evaluate(() => window.YUNLAN.frames);
  await page.waitForFunction((old) => window.YUNLAN.frames > old, frame, {
    polling: 100,
    timeout: 90000,
  });
  const file = path.join(output, 'night-shopping.png');
  await page.screenshot({ path: file, timeout: 60000 });
  captures.push({ preset: 'night-shopping', file });
} finally {
  await fs.writeFile(
    path.join(output, 'captures.json'),
    JSON.stringify(
      {
        scope: 'Controlled static visual fixtures, not animated navigation verification',
        captures,
      },
      null,
      2,
    ),
  );
  await browser.close();
}
