import { chromium } from 'playwright-core';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR =
  'C:/Users/Akshan sharma/.gemini/antigravity/brain/7c7fbd83-6c87-43b9-a9fc-d706f1060714';

async function main() {
  console.log('Testing Artifacts Vault modal preview with correct argument signature...');
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3009/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const filename = 'game_equus_quagga_autonomous_3d_equine_st_1792509279931.html';
  console.log('Opening Artifacts Vault modal and previewing...');

  await page.evaluate((fn) => {
    window.openArtifactsVaultModal();
    // window.previewVaultArtifact(filename, src, ext, category, title)
    window.previewVaultArtifact(
      fn,
      `/workspace/${fn}`,
      '.html',
      'simulations',
      'EQUUS QUAGGA - AUTONOMOUS 3D EQUINE STUDIO (OPUS-4.6)',
    );
  }, filename);

  console.log('Waiting for vaultPreviewIframe canvas...');
  const iframeHandle = await page.$('#vaultPreviewIframe');
  if (iframeHandle) {
    const frame = await iframeHandle.contentFrame();
    if (frame) {
      try {
        await frame.waitForSelector('canvas', { timeout: 15000 });
        console.log('✓ Canvas confirmed in vaultPreviewIframe!');
        const fpsEl = await frame.$('#fpsValue');
        if (fpsEl) {
          console.log('Live FPS in vaultPreviewIframe:', await fpsEl.textContent());
        }
      } catch (e) {
        console.warn('Canvas wait:', e.message);
      }
    }
  }

  await page.waitForTimeout(4000);

  const shotLocal = path.resolve('client/images/live_app_vault_modal_zebra.png');
  const shotArtifact = path.join(ARTIFACT_DIR, 'live_app_vault_modal_zebra.png');
  await page.screenshot({ path: shotLocal });
  try {
    fs.copyFileSync(shotLocal, shotArtifact);
  } catch (_) {}
  console.log('✓ Captured live app vault modal screenshot to:', shotLocal);

  await browser.close();
}

main().catch(console.error);
