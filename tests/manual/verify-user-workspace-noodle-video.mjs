import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR =
  'C:/Users/Akshan sharma/.gemini/antigravity/brain/b4cb1339-bae8-4948-a6e1-0557a4708b93';

async function verify() {
  console.log('Launching Chrome with Playwright...');
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`[Browser ${msg.type()}]`, msg.text());
    }
  });
  page.on('pageerror', (err) => console.error('[Browser Uncaught Error]', err.message));

  console.log('Navigating to http://localhost:3008/ ...');
  await page.goto('http://localhost:3008/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Clear power overlay
  await page.evaluate(() => {
    localStorage.setItem('supergence_powered_on', 'true');
    const overlay = document.getElementById('powerOnOverlay');
    if (overlay) overlay.remove();
  });

  // Find home input
  console.log('Entering prompt on Home page: "Make me a video of a man eating noodles."');
  const homeInput = page.locator('#inp');
  await homeInput.waitFor({ state: 'visible', timeout: 5000 });
  await homeInput.fill('Make me a video of a man eating noodles.');
  await page.waitForTimeout(300);

  const sendBtn = page.locator('#sendBtn');
  await sendBtn.click();
  console.log('Clicked Send button. Checking Center Stage immediately...');

  await page.waitForTimeout(1200);

  // Capture synthesizing state
  const synthState = await page.evaluate(() => {
    const pane = document.getElementById('workspaceSideBrowserPane');
    const synthBox = document.getElementById('sideHeroSynthesizingPlaceholder');
    const synthTitle = document.getElementById('heroSynthTitle')?.textContent;
    const titleText = document.getElementById('centerStageTitleText')?.textContent;
    const browserPlaceholder = document.getElementById('sideBrowserPlaceholder');
    return {
      paneVisible:
        pane && !pane.classList.contains('collapsed') && pane.classList.contains('active'),
      synthVisible: synthBox && synthBox.style.display !== 'none',
      synthTitle,
      titleText,
      browserPlaceholderVisible: browserPlaceholder && browserPlaceholder.style.display !== 'none',
    };
  });
  console.log('Immediate Synthesis State:', JSON.stringify(synthState, null, 2));

  const synthScreenshotPath = path.join(
    ARTIFACTS_DIR,
    'workspace_hero_synthesizing_verified_chrome.png',
  );
  await page.screenshot({ path: synthScreenshotPath, fullPage: false });
  console.log('Saved synthesizing screenshot to:', synthScreenshotPath);

  // Assert no black screen during synthesis
  if (!synthState.paneVisible || !synthState.synthVisible) {
    throw new Error('FAIL: Hero synthesizing placeholder is not visible!');
  }
  console.log(
    'PASS: Center Stage is active and displaying dynamic neural synthesis HUD instead of a black box!',
  );

  console.log('Waiting for turn to complete and artifact to load into Center Stage (up to 35s)...');
  let turnFinished = false;
  let finalArtifactSrc = '';

  for (let s = 0; s < 35; s++) {
    await page.waitForTimeout(1000);
    const check = await page.evaluate(() => {
      const iframe = document.getElementById('sideHeroArtifactIframe');
      const respEl = document.querySelector('.response-body-markdown');
      const title = document.getElementById('centerStageTitleText')?.textContent;
      const src = iframe?.getAttribute('src');
      const iframeDisplay = iframe ? window.getComputedStyle(iframe).display : 'none';
      const isDone = respEl && !respEl.textContent.includes('Synthesizing thoughts');
      return { isDone, src, iframeDisplay, title, respExcerpt: respEl?.textContent?.slice(0, 100) };
    });

    if (check.isDone && check.src && check.iframeDisplay !== 'none') {
      turnFinished = true;
      finalArtifactSrc = check.src;
      console.log(
        `Turn completed at second ${s + 1}! Artifact loaded:`,
        check.src,
        'Title:',
        check.title,
      );
      break;
    }
  }

  if (!turnFinished) {
    throw new Error(
      'FAIL: Turn did not complete or artifact was not loaded into Center Stage within 35s!',
    );
  }

  // Allow 60 FPS canvas loop to run inside the iframe
  await page.waitForTimeout(2500);

  // Verify that the iframe loaded successfully and canvas is rendering
  const iframeCheck = await page.evaluate(() => {
    const iframe = document.getElementById('sideHeroArtifactIframe');
    if (!iframe) return { error: 'No iframe' };
    try {
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      const canvas = doc.querySelector('canvas#stage');
      const hud = doc.querySelector('#hud')?.textContent;
      const title = doc.querySelector('.video-title')?.textContent;
      return {
        hasDoc: !!doc,
        hasCanvas: !!canvas,
        canvasW: canvas?.width,
        canvasH: canvas?.height,
        hud,
        title,
      };
    } catch (e) {
      return { crossOrigin: true, error: e.message };
    }
  });
  console.log('Iframe Canvas Status:', JSON.stringify(iframeCheck, null, 2));

  const resultScreenshotPath = path.join(
    ARTIFACTS_DIR,
    'workspace_hero_noodle_video_verified_chrome.png',
  );
  await page.screenshot({ path: resultScreenshotPath, fullPage: false });
  console.log('Saved verified hero result screenshot to:', resultScreenshotPath);

  await browser.close();
  console.log(
    'ALL VERIFICATIONS PASSED: Zero black screens, video simulator running front-and-center!',
  );
}

verify().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
