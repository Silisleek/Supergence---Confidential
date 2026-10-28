import { chromium } from 'playwright-core';

async function main() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage();

  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', (err) => console.log('PAGE ERR:', err.message));

  await page.goto('http://localhost:3009/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  console.log('Calling loadHeroArtifact...');
  await page.evaluate(() => {
    window.loadHeroArtifact({
      name: 'game_equus_quagga_autonomous_3d_equine_st_1792509279931.html',
      title: 'Equus quagga - Autonomous 3D Equine Studio',
      url: '/workspace/game_equus_quagga_autonomous_3d_equine_st_1792509279931.html',
    });
  });

  await page.waitForTimeout(3000);

  const iframe = await page.$('#sideHeroArtifactIframe');
  const frame = await iframe?.contentFrame();
  console.log('Frame exists?', !!frame);
  if (frame) {
    console.log('Frame URL:', frame.url());
    const html = await frame.content();
    console.log('Frame HTML length:', html.length);
    console.log('Frame HTML snippet:', html.substring(0, 300));
  }

  await browser.close();
}

main().catch(console.error);
