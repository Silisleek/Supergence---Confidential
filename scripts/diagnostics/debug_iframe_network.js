import { chromium } from 'playwright-core';

async function test() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage();

  page.on('request', (req) => {
    if (req.url().includes('workspace') || req.url().includes('game_')) {
      console.log('PAGE REQUEST:', req.url());
    }
  });

  page.on('requestfailed', (req) => {
    console.log('REQ FAILED:', req.url(), req.failure()?.errorText);
  });

  page.on('response', (res) => {
    if (res.url().includes('workspace') || res.url().includes('game_')) {
      console.log('PAGE RESPONSE:', res.url(), res.status());
    }
  });

  await page.goto('http://localhost:3009/');
  await page.waitForTimeout(1000);

  console.log('Evaluating script setting iframe src directly...');
  const result = await page.evaluate(async () => {
    const iframe = document.getElementById('sideHeroArtifactIframe');
    console.log(
      'Initial iframe src attribute:',
      iframe.getAttribute('src'),
      'property:',
      iframe.src,
    );
    iframe.style.display = 'block';
    iframe.src = '/workspace/game_equus_quagga_autonomous_3d_equine_st_1792509279931.html';
    return {
      attr: iframe.getAttribute('src'),
      prop: iframe.src,
    };
  });
  console.log('Evaluated result:', result);

  await page.waitForTimeout(3000);
  console.log(
    'Frames after 3s:',
    page.frames().map((f) => f.url()),
  );
  await browser.close();
}

test().catch(console.error);
