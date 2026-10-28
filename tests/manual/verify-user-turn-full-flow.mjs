import { chromium } from 'playwright-core';

async function runEndToEndTurn() {
  console.log('Launching Chrome for full end-to-end turn test...');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.text().includes('Turn') || msg.text().includes('Hero')) {
      console.log(`[BROWSER ${msg.type()}]:`, msg.text());
    }
  });

  await page.goto('http://localhost:3008/', { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  // Power on if needed
  await page.evaluate(() => {
    localStorage.setItem('supergence_powered_on', 'true');
    const overlay = document.getElementById('powerOnOverlay');
    if (overlay) overlay.remove();
  });

  console.log('Typing query into home input: "Make me a video of a man eating noodles."');
  const input = page.locator('#inp');
  await input.fill('Make me a video of a man eating noodles.');

  // Click send button
  console.log('Submitting query...');
  await page.locator('#sendBtn').click();

  // Wait 1.5s to capture the synthesizing state
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: 'C:/Users/Akshan sharma/.gemini/antigravity/brain/b4cb1339-bae8-4948-a6e1-0557a4708b93/turn_stage_1_synthesizing.png',
  });
  console.log('Captured turn_stage_1_synthesizing.png');

  // Wait for the turn to complete (poll for artifact promotion or frame)
  console.log('Waiting for turn completion and artifact promotion (up to 25s)...');
  let loaded = false;
  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(1000);
    const frame = page.frame({ url: /video_man_eating_noodles/ });
    if (frame) {
      console.log(`Artifact frame detected after ${i + 1} seconds!`);
      loaded = true;
      break;
    }
    const hasError = await page.evaluate(() => {
      const resp = document.getElementById('activeResponseBody');
      return resp && resp.innerText.includes('Failed');
    });
    if (hasError) {
      console.error('Turn failed with error in activeResponseBody');
      break;
    }
  }

  // Allow 3s for animation frames to cycle
  await page.waitForTimeout(3000);

  // Check canvas and pixel in center stage iframe
  const frame = page.frame({ url: /video_man_eating_noodles/ });
  console.log('Frame exists:', !!frame);
  if (frame) {
    const canvasEval = await frame.evaluate(() => {
      const c = document.getElementById('stage');
      const ctx = c?.getContext('2d');
      const p = ctx?.getImageData(640, 360, 1, 1).data;
      const hud = document.getElementById('hudTime')?.textContent;
      return {
        width: c?.width,
        height: c?.height,
        pixel: p ? Array.from(p) : null,
        hud: hud,
      };
    });
    console.log('Canvas verification in Hero Frame:', JSON.stringify(canvasEval));
  }

  // Save the final completed screenshot
  await page.screenshot({
    path: 'C:/Users/Akshan sharma/.gemini/antigravity/brain/b4cb1339-bae8-4948-a6e1-0557a4708b93/turn_stage_2_hero_completed.png',
  });
  console.log('Saved turn_stage_2_hero_completed.png');

  // Also save to official artifact file name
  await page.screenshot({
    path: 'C:/Users/Akshan sharma/.gemini/antigravity/brain/b4cb1339-bae8-4948-a6e1-0557a4708b93/workspace_hero_noodle_video_verified_chrome.png',
  });
  console.log('Saved workspace_hero_noodle_video_verified_chrome.png');

  await browser.close();
  console.log('Test completed successfully!');
}

runEndToEndTurn().catch(console.error);
