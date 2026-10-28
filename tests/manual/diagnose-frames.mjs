import { chromium } from 'playwright-core';

async function diagnose() {
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
  await page.waitForTimeout(4000);
  const frames = page.frames();
  console.log('Total frames:', frames.length);
  frames.forEach((f, idx) => {
    console.log('Frame', idx, 'url:', f.url(), 'name:', f.name());
  });
  const iframeEl = page.locator('#sideHeroArtifactIframe');
  const iframeSrc = await iframeEl.getAttribute('src');
  const iframeStyle = await iframeEl.getAttribute('style');
  const iframeBox = await iframeEl.boundingBox();
  console.log('Iframe src:', iframeSrc, 'style:', iframeStyle, 'box:', JSON.stringify(iframeBox));
  await page.screenshot({
    path: 'C:/Users/Akshan sharma/.gemini/antigravity/brain/b4cb1339-bae8-4948-a6e1-0557a4708b93/diagnose_hero_iframe.png',
  });
  await browser.close();
}

diagnose().catch(console.error);
