import { chromium } from 'playwright-core';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR =
  'C:/Users/Akshan sharma/.gemini/antigravity/brain/7c7fbd83-6c87-43b9-a9fc-d706f1060714';

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
  await page.waitForTimeout(1000);

  console.log('Loading hero artifact...');
  await page.evaluate(() => {
    window.loadHeroArtifact({
      name: 'game_equus_quagga_autonomous_3d_equine_st_1792509279931.html',
      title: 'Equus quagga - Autonomous 3D Equine Studio (Opus-4.6)',
      url: '/workspace/game_equus_quagga_autonomous_3d_equine_st_1792509279931.html',
    });
  });

  const iframe = await page.$('#sideHeroArtifactIframe');
  const frame = await iframe?.contentFrame();

  console.log('Waiting 5s for Three.js scene...');
  await page.waitForTimeout(5000);

  if (frame) {
    const canvas = await frame.$('canvas');
    console.log('Canvas element present in iframe:', !!canvas);
    if (canvas) {
      const box = await canvas.boundingBox();
      console.log('Canvas bounding box:', box);
    }
  }

  const shotLocal = path.resolve('client/images/live_app_opus46_zebra_mounted.png');
  const shotArtifact = path.join(ARTIFACT_DIR, 'live_app_opus46_zebra_mounted.png');
  await page.screenshot({ path: shotLocal });
  try {
    fs.copyFileSync(shotLocal, shotArtifact);
  } catch (_) {}
  console.log('Saved screenshot to:', shotLocal);

  await browser.close();
}

main().catch(console.error);
