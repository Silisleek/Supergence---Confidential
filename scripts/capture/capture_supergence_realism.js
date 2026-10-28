import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright-core';

const ARTIFACT_DIR =
  'C:/Users/Akshan sharma/.gemini/antigravity/brain/7c7fbd83-6c87-43b9-a9fc-d706f1060714';
const CLIENT_IMG_DIR = path.resolve('client/images');

async function main() {
  console.log('[Capture] Launching Chrome via Playwright...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--enable-webgl', '--use-gl=angle', '--no-sandbox'],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // 1. Capture standalone studio
  const studioPath = path.resolve('workspace/test_autonomous_zebra_studio.html');
  const studioUrl = 'http://localhost:3009/workspace/test_autonomous_zebra_studio.html';
  console.log(`[Capture] Navigating to ${studioUrl}...`);
  await page.goto(studioUrl, { waitUntil: 'networkidle' });

  // Wait for canvas
  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.waitForTimeout(2000); // Allow walk animation to loop smoothly

  // Set Walk gait
  const walkBtn = await page.$('button[data-gait="walk"]');
  if (walkBtn) await walkBtn.click();
  await page.waitForTimeout(1500);

  const walkScreenshot = path.join(CLIENT_IMG_DIR, 'supergence_realistic_zebra_walk.png');
  await page.screenshot({ path: walkScreenshot });
  console.log('[Capture] Saved walk screenshot:', walkScreenshot);

  // Copy to artifact directory
  fs.copyFileSync(walkScreenshot, path.join(ARTIFACT_DIR, 'supergence_realistic_zebra_walk.png'));

  // Set Rear gait
  const rearBtn = await page.$('button[data-gait="rear"]');
  if (rearBtn) {
    console.log('[Capture] Clicking REAR button...');
    await rearBtn.click();
    await page.waitForTimeout(2200); // Allow lerp transition to full rearing pose
  }

  const rearScreenshot = path.join(CLIENT_IMG_DIR, 'supergence_realistic_zebra_rear.png');
  await page.screenshot({ path: rearScreenshot });
  console.log('[Capture] Saved rear screenshot:', rearScreenshot);

  fs.copyFileSync(rearScreenshot, path.join(ARTIFACT_DIR, 'supergence_realistic_zebra_rear.png'));

  // 2. Mount and capture in primary SIS app at http://localhost:3009/
  console.log('[Capture] Navigating to primary app http://localhost:3009/...');
  await page.goto('http://localhost:3009/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Mount directly via window.loadHeroArtifact
  console.log('[Capture] Invoking window.loadHeroArtifact...');
  await page.evaluate(() => {
    if (typeof window.loadHeroArtifact === 'function') {
      window.loadHeroArtifact({
        name: 'test_autonomous_zebra_studio.html',
        title: 'Equus quagga - Autonomous Realistic 3D Studio (Opus-4.6)',
        url: '/workspace/test_autonomous_zebra_studio.html',
      });
      return true;
    }
    return false;
  });

  console.log('[Capture] Waiting for Three.js render inside hero iframe...');
  await page.waitForTimeout(4000);

  const appScreenshot = path.join(CLIENT_IMG_DIR, 'supergence_realistic_zebra_app_mounted.png');
  await page.screenshot({ path: appScreenshot });
  console.log('[Capture] Saved app mounted screenshot:', appScreenshot);

  fs.copyFileSync(
    appScreenshot,
    path.join(ARTIFACT_DIR, 'supergence_realistic_zebra_app_mounted.png'),
  );

  await browser.close();
  console.log('[Capture] All screenshots captured and saved successfully!');
}

main().catch((err) => {
  console.error('[Capture Error]', err);
  process.exit(1);
});
