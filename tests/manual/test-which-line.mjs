import { chromium } from 'playwright-core';

async function testLines() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage();
  await page.goto('http://localhost:3008/', { waitUntil: 'load' });

  // Let's test step by step
  console.log('Testing Step 1: Just loading artifact on iframe...');
  await page.evaluate(() => {
    const ifr = document.getElementById('sideHeroArtifactIframe');
    ifr.src = '/workspace/video_man_eating_noodles_1791989560188.html';
    try {
      ifr.contentWindow.location.replace('/workspace/video_man_eating_noodles_1791989560188.html');
    } catch (_) {}
  });
  await page.waitForTimeout(2000);
  console.log(
    'Step 1 frames:',
    page.frames().map((f) => f.url()),
  );

  console.log('Testing Step 2: Hiding placeholder, displaying iframe...');
  await page.evaluate(() => {
    const placeholder = document.getElementById('sideHeroSynthesizingPlaceholder');
    if (placeholder) placeholder.style.display = 'none';
    const ifr = document.getElementById('sideHeroArtifactIframe');
    ifr.style.display = 'block';
  });
  await page.waitForTimeout(1000);
  console.log(
    'Step 2 frames:',
    page.frames().map((f) => f.url()),
  );

  console.log('Testing Step 3: Activating workspace view...');
  await page.evaluate(() => {
    const ws = document.getElementById('supergenceWorkspace');
    if (ws) ws.classList.add('active');
  });
  await page.waitForTimeout(1000);
  console.log(
    'Step 3 frames:',
    page.frames().map((f) => f.url()),
  );

  console.log('Testing Step 4: Calling switchCenterStageMode("artifact")...');
  await page.evaluate(() => {
    window.switchCenterStageMode('artifact');
  });
  await page.waitForTimeout(1000);
  console.log(
    'Step 4 frames:',
    page.frames().map((f) => f.url()),
  );

  console.log('Testing Step 5: Calling toggleWorkspaceSideBrowser(true)...');
  await page.evaluate(() => {
    window.toggleWorkspaceSideBrowser(true);
  });
  await page.waitForTimeout(1000);
  console.log(
    'Step 5 frames:',
    page.frames().map((f) => f.url()),
  );

  await browser.close();
}

testLines().catch(console.error);
