import { chromium } from 'playwright-core';

async function testLoadTiming() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:3008/');
  await page.evaluate(() => {
    localStorage.setItem('supergence_powered_on', 'true');
    const overlay = document.getElementById('powerOnOverlay');
    if (overlay) overlay.remove();
    document.getElementById('supergenceWorkspace').classList.add('active');
    document.getElementById('homeView').style.display = 'none';
  });

  console.log('Calling loadHeroArtifact...');
  const t0 = Date.now();
  await page.evaluate(() => {
    loadHeroArtifact({
      url: '/workspace/game_3d_space_shooter_game_1792039735786.html',
      name: 'game_3d_space_shooter_game_1792039735786.html',
      title: '3D Space Shooter Game',
    });
  });

  const frame = page.frameLocator('#sideHeroArtifactIframe');
  for (let s = 1; s <= 20; s++) {
    await page.waitForTimeout(500);
    const vis = await frame.locator('button:has-text("LAUNCH FIGHTER")').isVisible();
    const elapsed = Date.now() - t0;
    console.log(`[${elapsed}ms] isVisible:`, vis);
    if (vis) {
      console.log(`✓ Button became visible in ${elapsed}ms!`);
      break;
    }
  }

  await browser.close();
}

testLoadTiming().catch(console.error);
