import { chromium } from 'playwright-core';

async function test() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:3008/');
  await page.evaluate(() => {
    localStorage.setItem('supergence_powered_on', 'true');
    const overlay = document.getElementById('powerOnOverlay');
    if (overlay) overlay.remove();
    document.getElementById('supergenceWorkspace').classList.add('active');
    document.getElementById('homeView').style.display = 'none';

    loadHeroArtifact({
      url: '/workspace/game_3d_space_shooter_game_1792036232301.html',
      name: 'game_3d_space_shooter_game_1792036232301.html',
      title: 'Starfighter: Deep Space Dogfight 3D',
    });
  });

  const frame = page.frameLocator('#sideHeroArtifactIframe');
  const launchBtn = frame.locator('button:has-text("LAUNCH FIGHTER")');
  console.log('Waiting for launch button in iframe...');
  await launchBtn.waitFor({ state: 'visible', timeout: 15000 });
  console.log('Launch button visible! Clicking to launch fighter...');
  await launchBtn.click();

  console.log('Fighter launched! Waiting 3.5s for 3D flight combat loop...');
  await page.waitForTimeout(3500);

  const outPath =
    'C:/Users/Akshan sharma/.gemini/antigravity/brain/b4cb1339-bae8-4948-a6e1-0557a4708b93/live_3d_combat_flight_active.png';
  await page.screenshot({ path: outPath });
  console.log('Captured', outPath);

  await browser.close();
}

test().catch((err) => {
  console.error(err);
  process.exit(1);
});
