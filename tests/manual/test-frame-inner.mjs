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
    window.loadHeroArtifact({
      url: '/workspace/video_man_eating_noodles_1791989560188.html',
      name: 'video_man_eating_noodles_1791989560188.html',
      title: 'A Man Eating Steaming Noodles at a Ramen Counter',
    });
  });

  await page.waitForTimeout(3000);

  const frame = page.frame({ url: /video_man_eating_noodles/ });
  console.log('Frame exists:', !!frame);
  if (frame) {
    const fHtml = await frame.content();
    console.log('Frame HTML starts with:', fHtml.slice(0, 300));
    console.log('Frame HTML length:', fHtml.length);

    const frameEl = page.locator('#sideHeroArtifactIframe');
    await frameEl.screenshot({
      path: 'C:/Users/Akshan sharma/.gemini/antigravity/brain/b4cb1339-bae8-4948-a6e1-0557a4708b93/frame_exact_screenshot.png',
    });
    console.log('Saved frame_exact_screenshot.png');

    const evalResult = await frame.evaluate(() => {
      const b = document.body;
      const card = document.querySelector('.video-viewport-card');
      const canvas = document.getElementById('stage');
      const ctx = canvas?.getContext('2d');
      const pixel = ctx?.getImageData(640, 360, 1, 1).data;
      return {
        bodyH: b?.offsetHeight,
        bodyW: b?.offsetWidth,
        bodyBg: window.getComputedStyle(b).background,
        cardH: card?.offsetHeight,
        cardW: card?.offsetWidth,
        cardDisplay: window.getComputedStyle(card).display,
        canvasH: canvas?.offsetHeight,
        canvasW: canvas?.offsetWidth,
        centerPixel: pixel ? Array.from(pixel) : null,
      };
    });
    console.log('Frame Inner Eval Result:', JSON.stringify(evalResult, null, 2));
  }

  await browser.close();
}

test().catch(console.error);
