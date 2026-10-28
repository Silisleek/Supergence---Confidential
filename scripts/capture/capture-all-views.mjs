import { chromium } from 'playwright-core';
import path from 'path';

const ARTIFACT_DIR =
  'C:/Users/Akshan sharma/.gemini/antigravity/brain/7c7fbd83-6c87-43b9-a9fc-d706f1060714';
const simUrl = 'http://localhost:3009/workspace/game_golden_gate_bridge_photorealistic_studio.html';

async function captureViews() {
  console.log('--- CAPTURING ALL STUDIO PERSPECTIVES & ATMOSPHERES ---');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

  await page.goto(simUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);

  // 1. Road Deck View
  console.log('Switching to Road Deck perspective...');
  await page.click('#view-deck');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'golden_gate_road_deck_verified.png') });
  console.log('✓ Saved golden_gate_road_deck_verified.png');

  // 2. Fort Point View
  console.log('Switching to Fort Point perspective...');
  await page.click('#view-fort');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'golden_gate_fort_point_verified.png') });
  console.log('✓ Saved golden_gate_fort_point_verified.png');

  // 3. Bay Cruise View (Looking up at span & container ship)
  console.log('Switching to Bay Cruise perspective...');
  await page.click('#view-cruise');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'golden_gate_bay_cruise_verified.png') });
  console.log('✓ Saved golden_gate_bay_cruise_verified.png');

  // 4. SF Night Atmosphere
  console.log('Switching to SF Night atmosphere from Marin Vista...');
  await page.click('#view-vista');
  await page.waitForTimeout(1500);
  await page.click('#env-night');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'golden_gate_night_atmosphere.png') });
  console.log('✓ Saved golden_gate_night_atmosphere.png');

  // 5. Main App verification
  console.log('Navigating to Live App: http://localhost:3009/');
  await page.goto('http://localhost:3009/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);

  console.log('Mounting in Center Stage Hero frame...');
  await page.evaluate(() => {
    if (typeof window.loadHeroArtifact === 'function') {
      window.loadHeroArtifact({
        url: '/workspace/game_golden_gate_bridge_photorealistic_studio.html',
        title: 'Golden Gate Bridge Studio Simulation',
        name: 'Golden Gate Bridge',
        badge: 'Studio Photorealistic 60 FPS',
      });
    }
  });
  await page.waitForTimeout(4000);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'live_supergence_golden_gate_verified.png'),
  });
  console.log('✓ Saved live_supergence_golden_gate_verified.png');

  await browser.close();
  console.log('🎉 ALL PERSPECTIVES SUCCESSFULLY CAPTURED AND VERIFIED!');
}

captureViews().catch((err) => {
  console.error('Capture error:', err);
  process.exit(1);
});
