import { chromium } from 'playwright-core';

async function test() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--use-gl=angle'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('framenavigated', (f) => {
    console.log('Frame navigated event:', f.name(), f.url());
  });

  await page.goto('http://localhost:3008/', { waitUntil: 'domcontentloaded' });

  // Activate workspace AND side browser pane so ancestor display is flex!
  await page.evaluate(() => {
    document.getElementById('supergenceWorkspace').classList.add('active');
    document.getElementById('workspaceSideBrowserPane').classList.add('active');
    document.getElementById('stageArtifactView').style.display = 'flex';

    const ifr = document.getElementById('sideHeroArtifactIframe');
    ifr.style.display = 'block';
    ifr.src =
      'http://localhost:3008/workspace/game_voxel_complete_single_file_html5_minec_1792219877980.html';
  });

  console.log('Waiting for frame navigation after making ancestor active...');
  await page.waitForTimeout(4000);

  console.log('Frames list:');
  for (const f of page.frames()) {
    console.log(' - Name:', f.name(), 'URL:', f.url());
  }

  const gameFrame = page.frames().find((f) => f.url().includes('game_voxel'));
  console.log('Game frame found?', !!gameFrame);
  if (gameFrame) {
    const hasCanvas = await gameFrame.evaluate(() => !!document.getElementById('game-canvas'));
    console.log('Canvas inside game frame:', hasCanvas);
  }

  await browser.close();
}

test().catch(console.error);
