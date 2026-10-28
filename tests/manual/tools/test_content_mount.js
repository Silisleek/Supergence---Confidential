import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

async function test() {
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

  console.log(`Passing content (${htmlContent.length} bytes) to loadHeroArtifact...`);
  await page.evaluate(
    ({ fn, content }) => {
      window.loadHeroArtifact({
        name: fn,
        title: 'Equus quagga - Autonomous 3D Equine Studio (Opus-4.6)',
        url: `/workspace/${fn}`,
        content: content,
      });
    },
    { fn: filename, content: htmlContent },
  );

  await page.waitForTimeout(5000);

  const shotLocal = path.resolve('client/images/test_content_mount.png');
  await page.screenshot({ path: shotLocal });
  console.log('Saved screenshot to:', shotLocal);

  await browser.close();
}

test().catch(console.error);
