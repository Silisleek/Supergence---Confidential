import { chromium } from 'playwright-core';

async function run() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--use-gl=angle'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3008/', { waitUntil: 'domcontentloaded' });

  await page.evaluate(() => {
    window.openWorkspace('Make me a full voxel minecraft clone');
    window.loadHeroArtifact({
      url: '/workspace/game_voxel_complete_single_file_html5_minec_1792219877980.html',
      name: 'game_voxel_complete_single_file_html5_minec_1792219877980.html',
      title: 'VoxelCraft 3D',
    });
  });

  console.log('Waiting 3s for iframe navigation...');
  await page.waitForTimeout(3000);

  console.log('Active frames in page:');
  for (const f of page.frames()) {
    console.log(' - Frame name:', f.name(), 'url:', f.url());
  }

  const gameFrame = page.frames().find((f) => f.url().includes('game_voxel'));
  console.log('Game frame found?', !!gameFrame);

  if (gameFrame) {
    const canvasExists = await gameFrame.evaluate(() => !!document.getElementById('game-canvas'));
    console.log('Canvas exists in gameFrame?', canvasExists);
  }

  await browser.close();
}

run().catch(console.error);
