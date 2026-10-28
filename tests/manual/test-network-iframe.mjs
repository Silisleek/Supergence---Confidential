import { chromium } from 'playwright-core';

async function test() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('request', (req) => {
    if (req.url().includes('workspace') || req.url().includes('video')) {
      console.log('[REQUEST]', req.method(), req.url());
    }
  });
  page.on('requestfailed', (req) => {
    console.log('[REQ FAILED]', req.url(), req.failure()?.errorText);
  });
  page.on('response', (res) => {
    if (res.url().includes('workspace') || res.url().includes('video')) {
      console.log('[RESPONSE]', res.status(), res.url());
    }
  });

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

  console.log('Setting iframe src...');
  await page.evaluate(() => {
    const iframe = document.getElementById('sideHeroArtifactIframe');
    iframe.src = '/workspace/video_man_eating_noodles_1791989560188.html';
  });

  await page.waitForTimeout(4000);

  const frames = page.frames();
  console.log('All page frames count:', frames.length);
  for (let i = 0; i < frames.length; i++) {
    console.log(`Frame ${i}:`, frames[i].url());
  }

  await browser.close();
}

test().catch(console.error);
