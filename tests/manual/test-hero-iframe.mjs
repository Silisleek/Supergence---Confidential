import { chromium } from 'playwright-core';
import fs from 'fs';

async function test() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:3008/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('supergence_powered_on', 'true');
    const overlay = document.getElementById('powerOnOverlay');
    if (overlay) overlay.remove();
    const homeView = document.getElementById('homeView');
    if (homeView) homeView.style.display = 'none';
    const ws = document.getElementById('supergenceWorkspace');
    if (ws) ws.classList.add('active');
  });

  const srcToLoad = '/workspace/video_man_eating_noodles_1791989560188.html';
  console.log('Calling loadHeroArtifact with:', srcToLoad);
  await page.evaluate((src) => {
    window.loadHeroArtifact({
      url: src,
      name: 'video_man_eating_noodles_1791989560188.html',
      title: 'A Man Eating Steaming Noodles at a Ramen Counter',
    });
  }, srcToLoad);

  await page.waitForTimeout(3000);

  const iframeLoc = page.locator('iframe#sideHeroArtifactIframe');
  const src = await iframeLoc.getAttribute('src');
  console.log('Iframe src attribute:', src);

  // Check frame content
  const frame = page.frame({ url: /video_man_eating_noodles/ });
  console.log('Matching frame found:', !!frame);
  if (frame) {
    const canvas = await frame.$('canvas#stage');
    console.log('Canvas found in frame:', !!canvas);
    if (canvas) {
      const box = await canvas.boundingBox();
      console.log('Canvas bounding box:', box);
    }
  }

  const outPath =
    'C:/Users/Akshan sharma/.gemini/antigravity/brain/b4cb1339-bae8-4948-a6e1-0557a4708b93/hero_frame_direct_test.png';
  await page.screenshot({ path: outPath, fullPage: false });
  console.log('Saved screenshot to:', outPath);

  await browser.close();
}

test().catch(console.error);
