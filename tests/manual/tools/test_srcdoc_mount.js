import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR =
  'C:/Users/Akshan sharma/.gemini/antigravity/brain/7c7fbd83-6c87-43b9-a9fc-d706f1060714';

async function test() {
  console.log('Testing loadHeroArtifact with srcdoc...');
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:3009/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const filename = 'game_equus_quagga_autonomous_3d_equine_st_1792509279931.html';
  const filePath = path.resolve('workspace', filename);
  const htmlContent = fs.readFileSync(filePath, 'utf8');

  console.log(`Setting srcdoc via loadHeroArtifact (size: ${htmlContent.length})...`);
  await page.evaluate(
    ({ fn, content }) => {
      // Only pass content and name/title, omit url so srcdoc branch is taken
      window.loadHeroArtifact({
        name: fn,
        title: 'Equus quagga - Autonomous 3D Equine Studio (Opus-4.6)',
        content: content,
      });
    },
    { fn: filename, content: htmlContent },
  );

  const iframeHandle = await page.$('#sideHeroArtifactIframe');
  if (iframeHandle) {
    const frame = await iframeHandle.contentFrame();
    if (frame) {
      console.log('Waiting for canvas in frame...');
      try {
        await frame.waitForSelector('canvas', { timeout: 15000 });
        console.log('✓ Canvas found in srcdoc iframe!');
        const fpsEl = await frame.$('#fpsValue');
        if (fpsEl) {
          console.log('Live FPS:', await fpsEl.textContent());
        }
      } catch (err) {
        console.warn('Canvas wait error:', err.message);
      }
    }
  }

  await page.waitForTimeout(3000);

  const shotLocal = path.resolve('client/images/live_app_srcdoc_mount.png');
  const shotArtifact = path.join(ARTIFACT_DIR, 'live_app_srcdoc_mount.png');
  await page.screenshot({ path: shotLocal });
  try {
    fs.copyFileSync(shotLocal, shotArtifact);
  } catch (_) {}
  console.log('Saved screenshot to:', shotLocal);

  await browser.close();
}

test().catch(console.error);
