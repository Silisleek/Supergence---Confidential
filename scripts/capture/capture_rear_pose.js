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

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(
    'http://127.0.0.1:3009/workspace/game_equus_quagga_autonomous_3d_equine_st_1792501151067.html',
    { waitUntil: 'domcontentloaded' },
  );
  await page.waitForTimeout(2000);

  const rearBtn = await page.$('button[data-gait="rear"]');
  if (rearBtn) {
    await rearBtn.click();
    await page.waitForTimeout(1000);
  }

  const shotLocal = path.resolve('client/images/autonomous_opus46_zebra_rear.png');
  const shotArtifact = path.join(ARTIFACT_DIR, 'autonomous_opus46_zebra_rear.png');
  await page.screenshot({ path: shotLocal, timeout: 5000 });
  try {
    fs.copyFileSync(shotLocal, shotArtifact);
  } catch (_) {}
  console.log('✓ Captured rear pose to:', shotLocal);

  await browser.close();
}

main().catch(console.error);
