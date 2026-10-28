import { chromium } from 'playwright-core';

async function test() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--use-gl=angle'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3008/', { waitUntil: 'domcontentloaded' });

  // 1. Open workspace with a test query
  await page.evaluate(() => {
    window.openWorkspace('Make me a full voxel minecraft clone in HTML');
    // Load the verified voxel game into center stage
    window.loadHeroArtifact({
      url: '/workspace/game_voxel_complete_single_file_html5_minec_1792219877980.html',
      name: 'game_voxel_complete_single_file_html5_minec_1792219877980.html',
      title: 'VoxelCraft 3D',
    });
  });

  console.log('Waiting for iframe to render canvas...');
  // Use Playwright frameLocator which auto-waits for the frame to load and canvas to appear
  const canvasLocator = page.frameLocator('#sideHeroArtifactIframe').locator('#game-canvas');
  await canvasLocator.waitFor({ state: 'attached', timeout: 15000 });

  // Evaluate WebGL health inside the iframe
  const frame = page.frame({ url: (url) => url.href.includes('game_voxel') });
  console.log('Frame URL:', frame?.url());

  const stats = await frame.evaluate(() => {
    const canvas = document.getElementById('game-canvas');
    const gl = canvas ? canvas.getContext('webgl2') || canvas.getContext('webgl') : null;
    return {
      hasCanvas: !!canvas,
      canvasWidth: canvas?.width,
      canvasHeight: canvas?.height,
      webglOk: !!gl && !gl.isContextLost(),
      fpsText: document.getElementById('fps-stat')?.textContent,
      posText: document.getElementById('pos-stat')?.textContent,
    };
  });

  console.log('Frame Evaluation Stats:', stats);

  // Take screenshot of Center Stage with the game mounted
  await page.screenshot({ path: 'test_workspace_game_mounted.png' });
  console.log('Screenshot saved: test_workspace_game_mounted.png');

  await browser.close();
}

test().catch(console.error);
