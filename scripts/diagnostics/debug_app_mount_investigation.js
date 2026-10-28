import { chromium } from 'playwright-core';

async function test() {
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:3009/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const fn = 'game_equus_quagga_autonomous_3d_equine_st_1792509279931.html';

  const initialIframeInfo = await page.evaluate(() => {
    const iframe = document.getElementById('sideHeroArtifactIframe');
    return {
      src: iframe?.src,
      display: iframe?.style.display,
      parentDisplay: iframe?.parentElement?.style.display,
    };
  });
  console.log('Before loadHeroArtifact:', initialIframeInfo);

  await page.evaluate((fileName) => {
    window.loadHeroArtifact({
      name: fileName,
      title: 'Equus quagga - Autonomous 3D Equine Studio (Opus-4.6)',
      url: `/workspace/${fileName}`,
    });
  }, fn);

  await page.waitForTimeout(1000);

  const afterCallInfo = await page.evaluate(() => {
    const iframe = document.getElementById('sideHeroArtifactIframe');
    let cwUrl = 'error';
    try {
      cwUrl = iframe?.contentWindow?.location?.href;
    } catch (e) {
      cwUrl = 'cross-origin:' + e.message;
    }
    return {
      srcAttr: iframe?.getAttribute('src'),
      srcProp: iframe?.src,
      cwLocation: cwUrl,
      display: iframe?.style.display,
      parentDisplay: iframe?.parentElement?.style.display,
    };
  });
  console.log('1s after loadHeroArtifact:', afterCallInfo);

  console.log('Waiting 5s for iframe to load...');
  await page.waitForTimeout(5000);

  const afterWaitInfo = await page.evaluate(() => {
    const iframe = document.getElementById('sideHeroArtifactIframe');
    let cwUrl = 'error';
    let canvasFound = false;
    try {
      cwUrl = iframe?.contentWindow?.location?.href;
      canvasFound = !!iframe?.contentWindow?.document?.querySelector('canvas');
    } catch (e) {
      cwUrl = 'cross-origin:' + e.message;
    }
    return {
      srcProp: iframe?.src,
      cwLocation: cwUrl,
      canvasFound,
    };
  });
  console.log('5s after loadHeroArtifact:', afterWaitInfo);

  await page.screenshot({ path: 'client/images/debug_app_mount_investigation.png' });
  console.log('Screenshot saved.');

  await browser.close();
}

test().catch(console.error);
