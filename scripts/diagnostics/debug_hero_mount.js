import { chromium } from 'playwright-core';

async function test() {
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

  console.log('Invoking loadHeroArtifact and setting contentWindow.location...');
  const fn = 'game_equus_quagga_autonomous_3d_equine_st_1792509279931.html';
  await page.evaluate((fileName) => {
    window.loadHeroArtifact({
      name: fileName,
      title: 'Equus quagga - Autonomous 3D Equine Studio (Opus-4.6)',
      url: `/workspace/${fileName}`,
    });
    const iframe = document.getElementById('sideHeroArtifactIframe');
    if (iframe) {
      iframe.removeAttribute('srcdoc');
      iframe.src = `/workspace/${fileName}`;
      try {
        if (iframe.contentWindow) {
          iframe.contentWindow.location.replace(`/workspace/${fileName}`);
        }
      } catch (e) {
        console.error('replace error:', e);
      }
    }
  }, fn);

  console.log('Waiting for network/iframe load...');
  await page.waitForTimeout(4000);

  const iframe = await page.$('#sideHeroArtifactIframe');
  if (iframe) {
    const src = await iframe.getAttribute('src');
    const disp = await iframe.evaluate((el) => window.getComputedStyle(el).display);
    const box = await iframe.boundingBox();
    console.log('Iframe src:', src, 'display:', disp, 'box:', box);

    const frame = await iframe.contentFrame();
    if (frame) {
      console.log('Frame url:', frame.url());
      try {
        await frame.waitForSelector('canvas', { timeout: 10000 });
        console.log('✓ Canvas confirmed in frame!');
        const fpsEl = await frame.$('#fpsValue');
        if (fpsEl) {
          const fpsText = await fpsEl.textContent();
          console.log('FPS inside iframe:', fpsText);
        }
        const meshesEl = await frame.$('#meshCountValue');
        if (meshesEl) {
          console.log('Meshes inside iframe:', await meshesEl.textContent());
        }
      } catch (err) {
        console.log('Canvas wait error:', err.message);
      }
    }
  }

  await page.screenshot({ path: 'client/images/live_app_opus46_zebra_mounted.png' });
  console.log('Screenshot saved to client/images/live_app_opus46_zebra_mounted.png');
  await browser.close();
}

test().catch(console.error);
