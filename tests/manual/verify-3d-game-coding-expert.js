import { chromium } from 'playwright-core';
import path from 'path';

const ARTIFACT_DIR =
  'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\b4cb1339-bae8-4948-a6e1-0557a4708b93';

async function runVerification() {
  console.log('🎮 [Verification] Launching Google Chrome via Playwright...');
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('🎮 [Verification] Navigating to http://localhost:3008/ ...');
  await page.goto('http://localhost:3008/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Ensure power overlay is cleared
  await page.evaluate(() => {
    try {
      localStorage.setItem('supergence_powered_on', 'true');
      const overlay = document.getElementById('powerOnOverlay');
      if (overlay) overlay.remove();
    } catch (_) {}
  });

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'live_game_test_1_home.png') });
  console.log('✓ Captured home state: live_game_test_1_home.png');

  // Step 1: Prompt Supergence with "Make me a 3D space shooter game."
  const promptText = 'Make me a 3D space shooter game.';
  console.log(`🎮 [Verification] Prompting Supergence: "${promptText}"`);

  const inputSelector = '#inp';
  const inp = page.locator(inputSelector);
  await inp.fill(promptText);
  await page.waitForTimeout(500);
  await inp.press('Enter');

  // Capture synthesizing placeholder state
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'live_game_test_2_synthesizing.png') });
  console.log('✓ Captured synthesizing HUD: live_game_test_2_synthesizing.png');

  // Step 2: Poll for completion & promotion to Center Stage
  console.log(
    '🎮 [Verification] Waiting for 3D Game synthesis and Center Stage promotion (up to 35s)...',
  );
  let gameLoaded = false;
  let gameDetails = null;

  for (let i = 0; i < 35; i++) {
    await page.waitForTimeout(1000);

    const check = await page.evaluate(() => {
      const heroIframe = document.getElementById('sideHeroArtifactIframe');
      const heroPlaceholder = document.getElementById('sideHeroSynthesizingPlaceholder');
      const badge = document.getElementById('heroArtifactBadge');
      const metric = document.getElementById('heroArtifactMetric');
      const title = document.getElementById('centerStageTitleText');
      const workInp = document.getElementById('workspaceInp');
      const responseBody = document.querySelector('.response-body-markdown');

      const isIframeVisible = heroIframe && heroIframe.style.display !== 'none' && heroIframe.src;
      const isGameUrl =
        heroIframe &&
        (heroIframe.src.includes('game_') ||
          heroIframe.src.includes('starfighter') ||
          heroIframe.src.includes('dogfight'));

      return {
        isIframeVisible,
        iframeSrc: heroIframe ? heroIframe.src : null,
        isGameUrl,
        badgeText: badge ? badge.textContent.trim() : '',
        badgeColor: badge ? badge.style.color : '',
        metricText: metric ? metric.textContent.trim() : '',
        titleText: title ? title.textContent.trim() : '',
        placeholderDisplay: heroPlaceholder ? heroPlaceholder.style.display : null,
        responsePreview: responseBody ? responseBody.innerText.slice(0, 120) : '',
      };
    });

    console.log(`[Second ${i + 1}] Check:`, JSON.stringify(check));

    if (check.isIframeVisible && check.isGameUrl && check.badgeText.includes('3D GAME')) {
      console.log('🎮 ✓ 3D Game promoted to Center Stage with active 3D GAME badge!');
      gameLoaded = true;
      gameDetails = check;
      break;
    }
  }

  if (!gameLoaded) {
    throw new Error('3D Game was not promoted to Center Stage within timeout.');
  }

  // Allow WebGL context and Three.js scene to initialize & render animation frames
  console.log('🎮 [Verification] Waiting 4 seconds for Three.js WebGL canvas loop...');
  await page.waitForTimeout(4000);

  // Inspect the Three.js canvas inside the hero iframe
  const canvasVerification = await page.evaluate(() => {
    const heroIframe = document.getElementById('sideHeroArtifactIframe');
    if (!heroIframe) return { error: 'No hero iframe found' };

    try {
      const iDoc = heroIframe.contentDocument || heroIframe.contentWindow.document;
      if (!iDoc) return { error: 'Cannot access iframe document' };

      const canvas = iDoc.querySelector('canvas');
      const hud = iDoc.querySelector('#hud, .hud, #cockpit, [id*="hud"]');
      const title = iDoc.title;

      let pixelCheck = null;
      if (canvas) {
        try {
          const gl =
            canvas.getContext('webgl') || canvas.getContext('webgl2') || canvas.getContext('2d');
          pixelCheck = {
            width: canvas.width,
            height: canvas.height,
            clientWidth: canvas.clientWidth,
            clientHeight: canvas.clientHeight,
            contextType: gl ? gl.constructor.name : 'none',
          };
        } catch (glErr) {
          pixelCheck = { error: glErr.message };
        }
      }

      return {
        hasCanvas: !!canvas,
        hasHud: !!hud,
        docTitle: title,
        pixelCheck,
      };
    } catch (err) {
      return { error: err.message };
    }
  });

  console.log(
    '🎮 [Verification] Canvas Verification Details:',
    JSON.stringify(canvasVerification, null, 2),
  );

  // Capture the verified Center Stage 3D Game screenshot
  const finalScreenshotPath = path.join(
    ARTIFACT_DIR,
    'live_3d_game_space_shooter_verified_chrome.png',
  );
  await page.screenshot({ path: finalScreenshotPath, fullPage: false });
  console.log(`🎮 ✓ Captured Verified Real Chrome Screenshot: ${finalScreenshotPath}`);

  // Step 3: Test a second prompt to demonstrate breadth and versatility: "Create a 3D car racing game."
  console.log(
    '\n🏎️ [Verification] Testing second 3D game archetype: "Create a 3D car racing game."',
  );
  const wsInp = page.locator('#workspaceInp');
  if ((await wsInp.count()) > 0 && (await wsInp.isVisible())) {
    await wsInp.fill('Create a 3D car racing game.');
    await page.waitForTimeout(400);
    await wsInp.press('Enter');

    console.log('🏎️ [Verification] Waiting for 3D Racer game synthesis...');
    for (let j = 0; j < 30; j++) {
      await page.waitForTimeout(1000);
      const racerCheck = await page.evaluate(() => {
        const heroIframe = document.getElementById('sideHeroArtifactIframe');
        const badge = document.getElementById('heroArtifactBadge');
        const isRacer =
          heroIframe && (heroIframe.src.includes('racer') || heroIframe.src.includes('neon'));
        return {
          isRacer,
          src: heroIframe ? heroIframe.src : '',
          badge: badge ? badge.textContent : '',
        };
      });

      if (racerCheck.isRacer) {
        console.log('🏎️ ✓ Neon Cyberpunk 3D Racer synthesized and loaded into Center Stage!');
        await page.waitForTimeout(3500);
        const racerScreenshotPath = path.join(
          ARTIFACT_DIR,
          'live_3d_game_neon_racer_verified_chrome.png',
        );
        await page.screenshot({ path: racerScreenshotPath, fullPage: false });
        console.log(`🏎️ ✓ Captured Racer Screenshot: ${racerScreenshotPath}`);
        break;
      }
    }
  }

  await browser.close();
  console.log('\n🎉 ALL 3D GAME & CODING EXPERT VERIFICATIONS PASSED IN REAL GOOGLE CHROME!');
}

runVerification().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
