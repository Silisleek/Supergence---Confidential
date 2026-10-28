import { chromium } from 'playwright-core';

async function test() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--mute-audio'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', (msg) => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

  console.log(
    'Navigating to http://127.0.0.1:3009/workspace/game_equus_quagga_autonomous_3d_equine_st_1792491052427.html',
  );
  const t0 = Date.now();
  try {
    await page.goto(
      'http://127.0.0.1:3009/workspace/game_equus_quagga_autonomous_3d_equine_st_1792491052427.html',
      { waitUntil: 'domcontentloaded', timeout: 20000 },
    );
    console.log(`Navigation succeeded in ${Date.now() - t0}ms!`);
  } catch (e) {
    console.log('Navigation failed:', e.message);
  }

  await page.waitForTimeout(2000);
  await browser.close();
}

test();
