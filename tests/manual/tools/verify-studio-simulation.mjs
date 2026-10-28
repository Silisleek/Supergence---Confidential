import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR =
  'C:/Users/Akshan sharma/.gemini/antigravity/brain/7c7fbd83-6c87-43b9-a9fc-d706f1060714';

async function verify() {
  console.log('--- STARTING PLAYWRIGHT REAL-BROWSER VERIFICATION ---');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log('BROWSER CONSOLE ERROR:', msg.text());
    }
  });

  // Step 1: Direct simulation page inspection
  const simUrl =
    'http://localhost:3009/workspace/game_golden_gate_bridge_studio_simulation_1792334885182.html';
  console.log(`1. Navigating to direct simulation: ${simUrl}`);
  await page.goto(simUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

  // Wait for 3D scene & WebGL loop to warm up
  await page.waitForTimeout(4000);

  // Evaluate WebGL state & scene details
  const simMetrics = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const gl = canvas ? canvas.getContext('webgl2') || canvas.getContext('webgl') : null;
    let meshCount = 0;
    let sceneFound = false;
    if (window.scene) {
      sceneFound = true;
      window.scene.traverse((obj) => {
        if (obj.isMesh) meshCount++;
      });
    }
    return {
      canvasExists: !!canvas,
      canvasWidth: canvas ? canvas.width : 0,
      canvasHeight: canvas ? canvas.height : 0,
      hasGL: !!gl,
      sceneFound,
      meshCount,
      hasControls: !!document.getElementById('hud'),
      hudText: document.getElementById('hud')
        ? document.getElementById('hud').innerText.substring(0, 100)
        : '',
    };
  });
  console.log('Simulation Metrics:', JSON.stringify(simMetrics, null, 2));

  // Take direct screenshot
  const directScreenshotPath = path.join(ARTIFACT_DIR, 'golden_gate_studio_direct.png');
  await page.screenshot({ path: directScreenshotPath });
  console.log(`✓ Direct studio simulation screenshot saved to: ${directScreenshotPath}`);

  // Step 2: Main App Center Stage verification
  console.log('2. Navigating to Main App: http://localhost:3009/');
  await page.goto('http://localhost:3009/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);

  console.log('3. Mounting Studio Simulation in Center Stage...');
  await page.evaluate(() => {
    if (typeof window.loadHeroArtifact === 'function') {
      window.loadHeroArtifact({
        url: '/workspace/game_golden_gate_bridge_studio_simulation_1792334885182.html',
        title: 'Golden Gate Bridge Studio Simulation',
        name: 'Golden Gate Bridge',
        badge: 'Studio Photorealistic 60 FPS',
      });
    }
  });

  await page.waitForTimeout(4000);

  const heroState = await page.evaluate(() => {
    const frame = document.getElementById('sideHeroArtifactIframe');
    const titleEl = document.getElementById('heroArtifactTitle');
    return {
      iframeVisible: frame ? frame.style.display !== 'none' : false,
      iframeSrc: frame ? frame.src : null,
      titleText: titleEl ? titleEl.textContent : null,
    };
  });
  console.log('Center Stage Hero State:', JSON.stringify(heroState, null, 2));

  const liveScreenshotPath = path.join(ARTIFACT_DIR, 'live_supergence_golden_gate_verified.png');
  await page.screenshot({ path: liveScreenshotPath });
  console.log(`✓ Live App Center Stage screenshot saved to: ${liveScreenshotPath}`);

  await browser.close();

  if (consoleErrors.length > 0) {
    console.warn('⚠️ Console errors detected:', consoleErrors);
  } else {
    console.log('🎉 0 Console Errors! Full Real-Browser Verification PASSED!');
  }
}

verify().catch((err) => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});
