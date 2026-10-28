import { chromium } from 'playwright-core';

async function testEvents() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('console', (msg) => console.log(`[BROWSER CONSOLE ${msg.type()}]:`, msg.text()));
  page.on('pageerror', (err) => console.error('[PAGE ERROR]:', err));
  page.on('request', (req) => {
    if (req.url().includes('video_') || req.url().includes('workspace')) {
      console.log('[NETWORK REQ]:', req.url(), req.resourceType());
    }
  });
  page.on('response', (res) => {
    if (res.url().includes('video_') || res.url().includes('workspace')) {
      console.log('[NETWORK RES]:', res.url(), res.status());
    }
  });
  page.on('requestfailed', (req) =>
    console.error('[REQ FAILED]:', req.url(), req.failure()?.errorText),
  );

  console.log('Navigating to http://localhost:3008/...');
  await page.goto('http://localhost:3008/', { waitUntil: 'networkidle' });

  console.log('Invoking loadHeroArtifact...');
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

  console.log('Waiting 5s...');
  await page.waitForTimeout(5000);

  const frames = page.frames();
  console.log('Total frames:', frames.length);
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    console.log(`Frame ${i}: name="${f.name()}", url="${f.url()}"`);
    if (f.url().includes('video_man_eating_noodles')) {
      const html = await f.content();
      console.log(`  Frame ${i} HTML len:`, html.length);
      const canvasInfo = await f.evaluate(() => {
        const c = document.getElementById('stage');
        return {
          exists: !!c,
          width: c?.width,
          height: c?.height,
          clientWidth: c?.clientWidth,
          clientHeight: c?.clientHeight,
        };
      });
      console.log(`  Frame ${i} canvas info:`, JSON.stringify(canvasInfo));
    }
  }

  await page.screenshot({
    path: 'C:/Users/Akshan sharma/.gemini/antigravity/brain/b4cb1339-bae8-4948-a6e1-0557a4708b93/test_events_screenshot.png',
  });
  console.log('Screenshot saved.');
  await browser.close();
}

testEvents().catch(console.error);
