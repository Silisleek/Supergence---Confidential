import { chromium } from 'playwright-core';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR =
  'C:/Users/Akshan sharma/.gemini/antigravity/brain/7c7fbd83-6c87-43b9-a9fc-d706f1060714';

async function main() {
  console.log('Launching Playwright Chrome to verify deliverable mounted in main app...');
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3009/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  const filename = 'game_equus_quagga_autonomous_3d_equine_st_1792509279931.html';
  console.log(`Mounting hero artifact: ${filename}...`);

  await page.evaluate((fn) => {
    if (typeof window.loadHeroArtifact === 'function') {
      window.loadHeroArtifact({
        name: fn,
        title: 'Equus quagga - Autonomous 3D Equine Studio (Opus-4.6)',
        url: `/workspace/${fn}`,
      });
    }
  }, filename);

  await page.waitForTimeout(1000);

  const iframeHandle = await page.$('#sideHeroArtifactIframe');
  if (iframeHandle) {
    const frame = await iframeHandle.contentFrame();
    if (frame) {
      console.log('Waiting for Three.js canvas in iframe...');
      try {
        await frame.waitForSelector('canvas', { timeout: 15000 });
        console.log('✓ Canvas confirmed in mounted iframe!');
        const fpsEl = await frame.$('#fpsValue');
        if (fpsEl) {
          console.log('Live FPS inside Hero Stage:', await fpsEl.textContent());
        }
        const meshEl = await frame.$('#meshCountValue');
        if (meshEl) {
          console.log('Live Meshes inside Hero Stage:', await meshEl.textContent());
        }
      } catch (err) {
        console.warn('Canvas wait timed out:', err.message);
      }
    }
  }

  await page.waitForTimeout(3000);

  const shotLocal = path.resolve('client/images/live_app_opus46_zebra_mounted.png');
  const shotArtifact = path.join(ARTIFACT_DIR, 'live_app_opus46_zebra_mounted.png');
  await page.screenshot({ path: shotLocal });
  try {
    fs.copyFileSync(shotLocal, shotArtifact);
  } catch (_) {}
  console.log('✓ Captured live app screenshot to:', shotLocal);

  await browser.close();
}

main().catch(console.error);
