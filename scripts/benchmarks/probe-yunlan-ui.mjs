import { chromium } from 'playwright-core';
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(15000);
const state = async () =>
  Promise.race([
    page
      .evaluate(() => {
        const a = window.YUNLAN,
          o = a?.controls?.orbit;
        return {
          ready: a?.ready,
          frames: a?.frames,
          mode: a?.mode,
          fly: o?.flyT,
          enabled: o?.enabled,
          camera: a?.camera?.position.toArray(),
          goal: o?.goalPos?.toArray(),
          errors: a?.errors,
        };
      })
      .catch((error) => ({ error: error.message })),
    new Promise((resolve) => setTimeout(() => resolve({ evaluationDeadline: true }), 5000)),
  ]);
try {
  await page.goto(process.argv[2], { waitUntil: 'commit' });
  const deadline = Date.now() + 120000;
  let s;
  while (Date.now() < deadline) {
    s = await state();
    if (s.ready) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  console.log('before', JSON.stringify(s));
  if (process.argv.includes('--no-shadows')) {
    await page.evaluate(() => {
      window.YUNLAN.renderer.shadowMap.enabled = false;
    });
    console.log('diagnostic change: shadows disabled in this temporary test context');
  }
  await page.locator('[data-view="historic"]').click();
  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, 500));
    console.log('after', JSON.stringify(await state()));
  }
} finally {
  await browser.close();
}
