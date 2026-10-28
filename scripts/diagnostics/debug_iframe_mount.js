import { chromium } from 'playwright-core';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost:3009/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const filename = 'game_equus_quagga_autonomous_3d_equine_st_1792509279931.html';
  console.log('Loading artifact...');

  await page.evaluate((fn) => {
    window.loadHeroArtifact({
      name: fn,
      title: 'Equus quagga - Autonomous 3D Equine Studio (Opus-4.6)',
      url: `/workspace/${fn}`,
    });
  }, filename);

  await page.waitForTimeout(4000);

  // Inspect the iframe frame directly
  const frames = page.frames();
  console.log(`Total frames: ${frames.length}`);
  for (const f of frames) {
    console.log(`Frame URL: ${f.url()}`);
    if (f.url().includes('game_equus_quagga')) {
      const canvasExists = await f.evaluate(() => !!document.querySelector('canvas'));
      const htmlSnippet = await f.evaluate(() => document.body.innerHTML.substring(0, 200));
      console.log(`Canvas in game frame? ${canvasExists}`);
      console.log(`HTML snippet: ${htmlSnippet}`);
      const shot = await f.page().screenshot({ path: 'client/images/debug_iframe_page.png' });
    }
  }

  await browser.close();
}

main().catch(console.error);
