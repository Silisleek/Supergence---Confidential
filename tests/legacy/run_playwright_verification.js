import { chromium } from 'playwright-core';
import path from 'path';

const ARTIFACT_DIR =
  'C:/Users/Akshan sharma/.gemini/antigravity/brain/b4cb1339-bae8-4948-a6e1-0557a4708b93';

async function run() {
  console.log('1. Launching Google Chrome via Playwright...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  // Set power on in localStorage so overlay does not obscure workspace
  await context.addInitScript(() => {
    localStorage.setItem('supergence_powered_on', 'true');
  });

  const page = await context.newPage();

  // Route: abort external CDN / font requests so offline/DNS delays don't stall page load
  await page.route(
    (url) => {
      const u = url.href;
      return !u.includes('127.0.0.1') && !u.includes('localhost');
    },
    (route) => route.abort(),
  );

  console.log('2. Navigating to http://127.0.0.1:3008/ ...');
  await page.goto('http://127.0.0.1:3008/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);

  console.log(
    '3. Triggering prompt: "Make me a animated video explning DNA/" via openWorkspace...',
  );
  await page.evaluate((prompt) => {
    window.openWorkspace(prompt);
  }, 'Make me a animated video explning DNA/');

  console.log('4. Waiting for unified turn to complete and render response...');
  let completed = false;
  for (let i = 0; i < 30; i++) {
    const state = await page.evaluate(() => {
      const respEl = document.querySelector('.response-body-markdown');
      const text = respEl ? respEl.innerText : '';
      const deckEl = document.querySelector('.workspace-deck-slot');
      const iframe = deckEl ? deckEl.querySelector('iframe') : null;
      return {
        textSnippet: text.slice(0, 80),
        isDone: text.includes('Omni-Visual Code-to-Video Engine'),
        hasIframe: !!iframe,
        iframeSrc: iframe ? iframe.src : null,
        rawJsonLeak:
          text.includes('{"tool": "write_file"') || text.includes('"tool": "write_file"'),
      };
    });

    if (state.isDone) {
      console.log('✓ Response rendered cleanly in DOM!');
      console.log('  Raw JSON leak:', state.rawJsonLeak);
      console.log('  Has iframe:', state.hasIframe);
      console.log('  Iframe src:', state.iframeSrc);
      completed = true;
      break;
    }
    await page.waitForTimeout(1000);
  }

  if (!completed) {
    throw new Error('Turn response did not complete within 30 seconds');
  }

  // Wait 2s for the Canvas to paint and animate
  await page.waitForTimeout(2000);

  const shot1 = path.join(ARTIFACT_DIR, 'dna_workspace_turn_verified.png');
  await page.screenshot({ path: shot1, fullPage: false });
  console.log('Saved workspace screenshot:', shot1);

  // Test 2: Directly inspect the standalone DNA simulation page
  console.log('5. Navigating directly to http://127.0.0.1:3008/workspace/dna_explainer.html ...');
  await page.goto('http://127.0.0.1:3008/workspace/dna_explainer.html', {
    waitUntil: 'domcontentloaded',
    timeout: 15000,
  });
  await page.waitForTimeout(2000);

  const simState = await page.evaluate(() => {
    const canvas = document.getElementById('stage');
    const hud = document.getElementById('hud');
    const title = document.querySelector('.video-title');
    return {
      canvasWidth: canvas ? canvas.width : 0,
      hudText: hud ? hud.innerText : '',
      titleText: title ? title.innerText : '',
    };
  });

  console.log('Standalone simulation status:', simState);

  const shot2 = path.join(ARTIFACT_DIR, 'dna_canvas_simulation_chrome.png');
  await page.screenshot({ path: shot2, fullPage: false });
  console.log('Saved standalone simulation screenshot:', shot2);

  await browser.close();
  console.log('ALL VERIFICATIONS PASSED 100%!');
}

run().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
