import { chromium } from 'playwright-core';

async function diag() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('console', (msg) => console.log('[Racer Console]', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.error('[Racer PageError]', err.message));

  console.log('Navigating to car racing game...');
  await page.goto('http://localhost:3008/workspace/game_3d_car_racing_game_1792038413782.html');
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: 'C:/Users/Akshan sharma/.gemini/antigravity/brain/b4cb1339-bae8-4948-a6e1-0557a4708b93/diag_direct_racer.png',
  });

  console.log('Navigating to space shooter game...');
  await page.goto('http://localhost:3008/workspace/game_3d_space_shooter_game_1792038054503.html');
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: 'C:/Users/Akshan sharma/.gemini/antigravity/brain/b4cb1339-bae8-4948-a6e1-0557a4708b93/diag_direct_space.png',
  });

  await browser.close();
  console.log('Screenshots complete.');
}

diag().catch(console.error);
