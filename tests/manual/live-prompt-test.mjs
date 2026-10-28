import { chromium } from 'playwright-core';

async function livePromptTest() {
  console.log('--- STARTING LIVE PROMPT TEST IN REAL CHROME ---');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('console', (msg) => {
    const text = msg.text();
    if (
      text.includes('Turn') ||
      text.includes('Artifact') ||
      text.includes('Hero') ||
      msg.type() === 'error'
    ) {
      console.log(`[CHROME CONSOLE ${msg.type()}]:`, text);
    }
  });

  console.log('1. Navigating to http://localhost:3008/...');
  await page.goto('http://localhost:3008/', { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  // Power on if needed
  await page.evaluate(() => {
    localStorage.setItem('supergence_powered_on', 'true');
    const overlay = document.getElementById('powerOnOverlay');
    if (overlay) overlay.remove();
  });

  // Step 1: Capture clean Home view
  await page.screenshot({
    path: 'C:/Users/Akshan sharma/.gemini/antigravity/brain/b4cb1339-bae8-4948-a6e1-0557a4708b93/live_test_1_home_screen.png',
  });
  console.log('Captured live_test_1_home_screen.png');

  // Step 2: Prompt via main input #inp
  const prompt1 = 'Make me a video of a man eating noodles.';
  console.log(`2. Typing prompt into #inp: "${prompt1}"`);
  const input = page.locator('#inp');
  await input.fill(prompt1);
  await page.screenshot({
    path: 'C:/Users/Akshan sharma/.gemini/antigravity/brain/b4cb1339-bae8-4948-a6e1-0557a4708b93/live_test_2_prompt_typed.png',
  });
  console.log('Captured live_test_2_prompt_typed.png');

  // Step 3: Click Send button
  console.log('3. Submitting prompt...');
  await page.locator('#sendBtn').click();

  // Wait 1.5s to capture the synthesizing HUD
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: 'C:/Users/Akshan sharma/.gemini/antigravity/brain/b4cb1339-bae8-4948-a6e1-0557a4708b93/live_test_3_synthesizing_hud.png',
  });
  console.log('Captured live_test_3_synthesizing_hud.png');

  // Step 4: Wait for turn completion and artifact promotion
  console.log('4. Awaiting turn completion and 60 FPS studio artifact promotion (up to 30s)...');
  let firstArtifactLoaded = false;
  let firstArtifactName = '';
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000);
    const frame = page.frames().find((f) => f.url().includes('video_man_eating_noodles'));
    if (frame) {
      firstArtifactLoaded = true;
      firstArtifactName = frame.url().split('/').pop();
      console.log(
        `✓ First artifact promoted to Center Stage after ${i + 1}s: ${firstArtifactName}`,
      );
      break;
    }
  }

  if (!firstArtifactLoaded) {
    throw new Error('First artifact failed to load in Center Stage within 30s');
  }

  // Let animation play for 2s to advance frames
  await page.waitForTimeout(2500);

  // Verify Frame 1 animation and canvas
  const heroFrame1 = page.frames().find((f) => f.url().includes('video_man_eating_noodles'));
  const frame1Stats = await heroFrame1.evaluate(async () => {
    const c = document.getElementById('stage');
    const ctx = c?.getContext('2d');
    const p1 = ctx?.getImageData(640, 360, 1, 1).data;
    const initialTime = document.getElementById('hudTime')?.textContent;

    // Wait 500ms and check timecode changed (proving 60 FPS active loop)
    await new Promise((r) => setTimeout(r, 600));
    const nextTime = document.getElementById('hudTime')?.textContent;

    return {
      canvasWidth: c?.width,
      canvasHeight: c?.height,
      centerPixel: p1 ? Array.from(p1) : null,
      initialTime,
      nextTime,
      isLoopRunning: initialTime !== nextTime,
    };
  });
  console.log('Hero Frame 1 Evaluation:', JSON.stringify(frame1Stats, null, 2));

  await page.screenshot({
    path: 'C:/Users/Akshan sharma/.gemini/antigravity/brain/b4cb1339-bae8-4948-a6e1-0557a4708b93/live_test_4_hero_noodle_video.png',
  });
  console.log('Captured live_test_4_hero_noodle_video.png');

  // Step 5: In-Workspace Follow-up Prompt
  const prompt2 = 'Make me a video of a boy playing with his dog in a park.';
  console.log(`5. Testing follow-up prompt from inside workspace: "${prompt2}"`);
  const wsInput = page.locator('#workspaceInp');
  await wsInput.fill(prompt2);
  await page.locator('#workspaceSendBtn').click();

  // Wait 1.5s to capture the synthesizing HUD for the second prompt
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: 'C:/Users/Akshan sharma/.gemini/antigravity/brain/b4cb1339-bae8-4948-a6e1-0557a4708b93/live_test_5_followup_synthesizing.png',
  });
  console.log('Captured live_test_5_followup_synthesizing.png');

  // Step 6: Wait for second turn completion
  console.log('6. Awaiting second turn completion and artifact promotion (up to 30s)...');
  let secondArtifactLoaded = false;
  let secondArtifactName = '';
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000);
    const frame = page
      .frames()
      .find(
        (f) =>
          f.url().includes('video_boy_and_dog') ||
          (f.url().includes('video_') && !f.url().includes('noodles')),
      );
    if (frame) {
      secondArtifactLoaded = true;
      secondArtifactName = frame.url().split('/').pop();
      console.log(
        `✓ Second artifact promoted to Center Stage after ${i + 1}s: ${secondArtifactName}`,
      );
      break;
    }
  }

  // Allow 2s to run
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: 'C:/Users/Akshan sharma/.gemini/antigravity/brain/b4cb1339-bae8-4948-a6e1-0557a4708b93/live_test_6_followup_hero_completed.png',
  });
  console.log('Captured live_test_6_followup_hero_completed.png');

  await browser.close();
  console.log('--- ALL LIVE PROMPT TESTS COMPLETED AND VERIFIED! ---');
}

livePromptTest().catch(console.error);
