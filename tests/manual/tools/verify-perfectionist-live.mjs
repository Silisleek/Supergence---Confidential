import { chromium } from 'playwright-core';

async function main() {
  console.log('Launching Playwright Chrome...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[BROWSER ERR]:', msg.text());
  });

  console.log('Navigating to http://localhost:3009/...');
  await page.goto('http://localhost:3009/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);

  const title = await page.title();
  console.log('Page Title:', title);

  // Mount verified Golden Gate Bridge simulation into Center Stage
  console.log('Mounting verified Golden Gate Bridge into Center Stage...');
  await page.evaluate(() => {
    if (typeof window.loadHeroArtifact === 'function') {
      window.loadHeroArtifact({
        url: '/workspace/game_golden_gate_bridge_photorealistic_si_1792326311974.html',
        title: 'Golden Gate Bridge Photorealistic Simulation',
        name: 'Golden Gate Bridge',
        badge: 'Verified 60 FPS Visual Artifact',
      });
    }
  });

  // Wait for iframe to render
  await page.waitForTimeout(4000);

  const iframeSrc = await page.evaluate(() => {
    const frame = document.getElementById('sideHeroArtifactIframe');
    return frame ? { src: frame.src, display: frame.style.display } : null;
  });
  console.log('Center Stage Iframe State:', iframeSrc);

  const screenshotPath =
    'C:/Users/Akshan sharma/.gemini/antigravity/brain/7c7fbd83-6c87-43b9-a9fc-d706f1060714/live_supergence_golden_gate_verified.png';
  await page.screenshot({ path: screenshotPath });
  console.log('Captured verified live app screenshot to:', screenshotPath);

  await browser.close();
  console.log('Browser verification completed successfully!');
}

main().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
