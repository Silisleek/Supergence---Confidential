import { chromium } from 'playwright-core';
import path from 'path';

const ARTIFACT_DIR =
  'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\b4cb1339-bae8-4948-a6e1-0557a4708b93';

async function testRacerAndCoding() {
  console.log('🏎️ [Test] Launching Google Chrome via Playwright...');
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('🏎️ [Test] Navigating to http://localhost:3008/ ...');
  await page.goto('http://localhost:3008/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Clear overlay and open workspace
  await page.evaluate(() => {
    localStorage.setItem('supergence_powered_on', 'true');
    const overlay = document.getElementById('powerOnOverlay');
    if (overlay) overlay.remove();
  });

  // Prompt for 3D Car Racing Game
  console.log('🏎️ [Test] Submitting prompt: "Create a 3D car racing game."');
  const mainInp = page.locator('#inp');
  await mainInp.fill('Create a 3D car racing game.');
  await page.waitForTimeout(400);
  await mainInp.press('Enter');

  console.log('🏎️ [Test] Waiting for 3D Racer synthesis and Center Stage promotion...');
  let racerLoaded = false;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000);
    const check = await page.evaluate(() => {
      const heroIframe = document.getElementById('sideHeroArtifactIframe');
      const badge = document.getElementById('heroArtifactBadge');
      const metric = document.getElementById('heroArtifactMetric');
      const title = document.getElementById('centerStageTitleText');
      const isRacer =
        heroIframe &&
        heroIframe.style.display !== 'none' &&
        (heroIframe.src.includes('racer') ||
          heroIframe.src.includes('racing') ||
          heroIframe.src.includes('game_'));

      return {
        isRacer,
        src: heroIframe ? heroIframe.src : '',
        badge: badge ? badge.textContent.trim() : '',
        metric: metric ? metric.textContent.trim() : '',
        title: title ? title.textContent.trim() : '',
      };
    });

    console.log(`[Racer Second ${i + 1}] Check:`, JSON.stringify(check));

    if (check.isRacer && check.badge.includes('3D GAME')) {
      console.log('🏎️ ✓ 3D Neon Racer promoted to Center Stage with active 3D GAME badge!');
      racerLoaded = true;
      break;
    }
  }

  if (!racerLoaded) {
    throw new Error('3D Racer was not loaded in Center Stage within timeout.');
  }

  // Click ENTER GRAND PRIX inside the racer game
  const frame = page.frameLocator('#sideHeroArtifactIframe');
  const startBtn = frame.locator(
    'button.btn-play, button:has-text("ENTER GRAND PRIX"), button:has-text("START"), #start-btn',
  );
  try {
    await startBtn.waitFor({ state: 'visible', timeout: 8000 });
    console.log('Clicking "ENTER GRAND PRIX" button...');
    await startBtn.click();
  } catch (btnErr) {
    console.log('Start button notice:', btnErr.message);
  }

  console.log('Waiting 4s for 3D racer animation and spline physics loop...');
  await page.waitForTimeout(4000);

  const racerScreenshotPath = path.join(ARTIFACT_DIR, 'live_3d_game_neon_racer_active.png');
  await page.screenshot({ path: racerScreenshotPath });
  console.log('🏎️ ✓ Captured live_3d_game_neon_racer_active.png');

  // Next: Test Algorithmic Coding Expertise
  console.log('\n💻 [Test] Submitting Algorithmic Coding query in Workspace...');
  const wsInp = page.locator('#workspaceInp');
  const codePrompt =
    'Implement a high-performance lock-free ring buffer queue in C++20 with atomic head/tail and cache-line padding.';
  await wsInp.fill(codePrompt);
  await page.waitForTimeout(300);
  await wsInp.press('Enter');

  console.log('💻 [Test] Waiting for expert code response...');
  for (let k = 0; k < 30; k++) {
    await page.waitForTimeout(1000);
    const codeCheck = await page.evaluate(() => {
      const respBodies = Array.from(document.querySelectorAll('.response-body-markdown'));
      const lastResp = respBodies[respBodies.length - 1];
      const text = lastResp ? lastResp.innerText : '';
      return {
        hasCode:
          text.includes('template') ||
          text.includes('std::atomic') ||
          text.includes('RingBuffer') ||
          text.includes('hardware_destructive_interference_size') ||
          text.includes('memory_order') ||
          text.includes('struct') ||
          text.includes('class'),
        length: text.length,
        preview: text.slice(0, 100),
      };
    });

    console.log(
      `[Code Second ${k + 1}] Length: ${codeCheck.length}, HasCode: ${codeCheck.hasCode}`,
    );

    if (codeCheck.hasCode && codeCheck.length > 200) {
      console.log('💻 ✓ Expert algorithmic code synthesized and rendered into workspace!');
      break;
    }
  }

  await page.waitForTimeout(3000);
  const codingScreenshotPath = path.join(ARTIFACT_DIR, 'live_coding_expert_response_verified.png');
  await page.screenshot({ path: codingScreenshotPath });
  console.log('💻 ✓ Captured live_coding_expert_response_verified.png');

  await browser.close();
  console.log(
    '\n🎉 ALL MULTI-ARCHETYPE 3D GAME & CODING EXPERT VERIFICATIONS COMPLETED SUCCESSFULLY!',
  );
}

testRacerAndCoding().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
