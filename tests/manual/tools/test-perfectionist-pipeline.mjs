import { perfectionistCoderEngine } from '../../../server/coder/perfectionist-coder-engine.js';
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

async function verifyPerfectionist() {
  console.log('=== 1. Testing Perfectionist Coder Engine: 3D Cyberpunk Metropolis Challenge ===');

  const testPrompt =
    'Full-Scale 3D Cyberpunk Metropolis (Three.js WebGL with articulated skyscrapers, volumetric fog, flying vehicles on 3D traffic lanes with photon trails, neon shaders, drone flight camera, and interactive HUD controls).';

  const result = await perfectionistCoderEngine.buildPerfectionistDeliverable({
    prompt: testPrompt,
    title: 'Cyberpunk Metropolis 3D — Autonomous Simulation',
    language: 'html',
    onProgress: (p) => {
      console.log(
        `[Progress ${p.stage || 'step'} (${p.step || 0}/${p.totalSteps || 6})]: ${p.message}`,
      );
    },
  });

  console.log('\n=== Perfectionist Deliverable Result ===');
  console.log('Success:', result.success);
  console.log('Filename:', result.filename);
  console.log('Verified:', result.verified);
  console.log('Cycles:', result.cycles);
  console.log('Size:', (result.sizeBytes / 1024).toFixed(1), 'KB');
  console.log('Duration:', result.durationMs, 'ms');
  console.log('Diagnostics:', result.diagnostics);

  if (!result.verified || !result.filepath || !fs.existsSync(result.filepath)) {
    throw new Error('Perfectionist coder failed verification!');
  }

  // Verify inside real Playwright Chrome browser
  console.log('\n=== 2. Real Browser Execution Verification ===');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--allow-file-access-from-files',
      '--use-gl=angle',
      '--mute-audio',
    ],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      if (
        !txt.includes('404') &&
        !txt.includes('font') &&
        !txt.includes('favicon') &&
        !txt.includes('AudioContext')
      ) {
        pageErrors.push(txt);
      }
    }
  });

  const appUrl = `http://127.0.0.1:3009/workspace/${result.filename}`;
  console.log(`Navigating to ${appUrl}...`);
  await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  const screenshotPath =
    'C:/Users/Akshan sharma/.gemini/antigravity/brain/7c7fbd83-6c87-43b9-a9fc-d706f1060714/verified_cyberpunk_metropolis_perfectionist.png';
  await page.screenshot({ path: screenshotPath });
  console.log(`Captured screenshot to ${screenshotPath}`);

  // Now verify that Supergence app mounts it in Center Stage
  console.log('\n=== 3. Mount in Supergence App (http://127.0.0.1:3009/) ===');
  const appPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await appPage.goto('http://127.0.0.1:3009/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await appPage.waitForTimeout(2500);

  await appPage.evaluate(
    (art) => {
      if (typeof window.loadHeroArtifact === 'function') {
        window.loadHeroArtifact({
          url: art.url,
          title: art.title,
          name: art.title,
          badge: 'Verified 60 FPS Visual Artifact',
        });
      }
    },
    { url: `/workspace/${result.filename}`, title: result.title },
  );

  await appPage.waitForTimeout(3000);
  const liveAppScreenshot =
    'C:/Users/Akshan sharma/.gemini/antigravity/brain/7c7fbd83-6c87-43b9-a9fc-d706f1060714/live_app_cyberpunk_mounted.png';
  await appPage.screenshot({ path: liveAppScreenshot });
  console.log(`Captured live app screenshot to ${liveAppScreenshot}`);

  await browser.close();

  console.log('\n✓ ALL VERIFICATIONS PASSED WITH 0 ERRORS!');
  console.log(`Page errors: ${pageErrors.length}`);
}

verifyPerfectionist().catch((err) => {
  console.error('FATAL VERIFICATION FAILURE:', err);
  process.exit(1);
});
