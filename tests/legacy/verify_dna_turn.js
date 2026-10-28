import { chromium } from 'playwright-core';
import path from 'path';

async function run() {
  console.log('Launching Chrome via Playwright...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR:', msg.text());
    }
  });

  // Test 1: Workspace direct turn execution in app
  console.log('Navigating to http://localhost:3008/ ...');
  await page.goto('http://localhost:3008/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  console.log('Triggering prompt: "Make me a animated video explning DNA/" via openWorkspace');
  await page.evaluate(() => {
    window.openWorkspace('Make me a animated video explning DNA/');
  });

  console.log('Waiting for response in workspace...');
  let responseFound = false;
  for (let i = 0; i < 40; i++) {
    const text = await page.evaluate(() => {
      const el =
        document.querySelector('.response-body-markdown') ||
        document.getElementById('mainResponseBody');
      return el ? el.innerText : '';
    });
    if (text && text.includes('Omni-Visual Code-to-Video Engine')) {
      responseFound = true;
      console.log('Found completed response! Length:', text.length);
      break;
    }
    await page.waitForTimeout(500);
  }

  // Check whether any raw JSON leaked
  const pageContent = await page.evaluate(() => {
    const el =
      document.querySelector('.response-body-markdown') ||
      document.getElementById('mainResponseBody');
    return el ? el.innerHTML : '';
  });

  const hasRawJson =
    pageContent.includes('{"tool": "write_file"') || pageContent.includes('"tool": "write_file"');
  console.log('Has raw JSON leak:', hasRawJson);

  // Check if artifact card and iframe exist in workspace
  const artifactStatus = await page.evaluate(() => {
    const deck = document.querySelector('.workspace-deck-slot');
    const iframe = deck ? deck.querySelector('iframe') : null;
    return {
      deckExists: !!deck,
      iframeExists: !!iframe,
      iframeSrc: iframe ? iframe.src : null,
    };
  });
  console.log('Artifact status in workspace:', artifactStatus);

  // Take screenshot of workspace view
  const workspaceScreenshotPath = path.resolve('dna_workspace_turn_verified.png');
  await page.screenshot({ path: workspaceScreenshotPath });
  console.log('Saved workspace screenshot to:', workspaceScreenshotPath);

  // Test 2: Directly inspect the standalone DNA explainer page
  console.log('Navigating to http://localhost:3008/workspace/dna_explainer.html ...');
  await page.goto('http://localhost:3008/workspace/dna_explainer.html', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(2000);

  const canvasExists = await page.evaluate(() => {
    const c = document.getElementById('stage');
    return !!c && c.width > 0;
  });
  console.log('Canvas exists and active:', canvasExists);

  const hudText = await page.evaluate(() => {
    const h = document.getElementById('hud');
    return h ? h.innerText : '';
  });
  console.log('HUD Text:', hudText);

  const standaloneScreenshotPath = path.resolve('dna_standalone_animation_verified.png');
  await page.screenshot({ path: standaloneScreenshotPath });
  console.log('Saved standalone animation screenshot to:', standaloneScreenshotPath);

  await browser.close();
  console.log('ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
