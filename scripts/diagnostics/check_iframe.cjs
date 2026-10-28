const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:3009/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  const iframeSrc = await page.$eval('#sideHeroArtifactIframe', (el) => (el ? el.src : null));
  console.log('Iframe src:', iframeSrc);

  const frame = page.frames().find((f) => f.url().includes('realistic_3d_car_racing_game.html'));
  if (frame) {
    console.log('Found frame for realistic_3d_car_racing_game.html!');
    const canvasExists = await frame.$eval('canvas', (el) => Boolean(el)).catch(() => false);
    console.log('Canvas exists in iframe:', canvasExists);
    const hudPos = await frame
      .$eval('#speedVal', (el) => (el ? el.textContent : null))
      .catch(() => null);
    console.log('Speedometer value in iframe:', hudPos);
  } else {
    console.log(
      'Frame not found by URL. All frame URLs:',
      page.frames().map((f) => f.url()),
    );
  }

  await browser.close();
})();
