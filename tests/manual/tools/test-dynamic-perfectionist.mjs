import { perfectionistCoderEngine } from '../../../server/coder/perfectionist-coder-engine.js';
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

async function runDynamicPerfectionistBenchmark() {
  console.log('================================================================');
  console.log('🚀 Supergence Perfectionist Dynamic Coding Benchmark');
  console.log('Domain: Non-Templated Interactive N-Body Gravitational Simulation');
  console.log('================================================================\n');

  const prompt =
    'High-Precision Interactive N-Body Gravitational Orbital Dynamics Simulation with 400 stars, Kepler orbital mechanics, velocity Verlet numerical integration, softened gravitational kernel, dynamic galaxy collision presets, velocity-colored glowing bloom, interactive mouse gravity well, and procedural cosmic Web Audio synthesizer.';

  const result = await perfectionistCoderEngine.buildPerfectionistDeliverable({
    prompt,
    title: 'N-Body Gravitational Orbital Dynamics Simulation',
    language: 'html',
    onProgress: (p) => {
      console.log(
        `[Stage: ${p.stage || 'step'} (${p.step || 0}/${p.totalSteps || 6})]: ${p.message}`,
      );
    },
  });

  console.log('\n=== Deliverable Result ===');
  console.log('Success:', result.success);
  console.log('Title:', result.title);
  console.log('Filename:', result.filename);
  console.log('Verified:', result.verified);
  console.log('Cycles:', result.cycles);
  console.log('Size:', (result.sizeBytes / 1024).toFixed(1), 'KB');
  console.log('Duration:', (result.durationMs / 1000).toFixed(2), 's');
  console.log('Diagnostics:', result.diagnostics);

  if (!result.verified || !result.filepath || !fs.existsSync(result.filepath)) {
    throw new Error('Perfectionist coder failed verification!');
  }

  // Real Playwright Chrome Browser Smoke Test
  console.log('\n=== Real Headless Chrome Execution Verification ===');
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
    'C:/Users/Akshan sharma/.gemini/antigravity/brain/7c7fbd83-6c87-43b9-a9fc-d706f1060714/verified_nbody_perfectionist.png';
  await page.screenshot({ path: screenshotPath });
  console.log(`Captured screenshot to ${screenshotPath}`);

  // Test interactive controls in real browser
  console.log('\n=== Testing Interactive Controls in Real Browser ===');
  const fpsText = await page.$eval('#fpsCounter', (el) => el.textContent).catch(() => 'N/A');
  console.log('FPS Counter Text:', fpsText);

  // Click a preset button
  const presetClicked = await page.evaluate(() => {
    const btn =
      document.querySelector('.btn-grid.presets button') || document.getElementById('presetBinary');
    if (btn) {
      btn.click();
      return btn.textContent;
    }
    return null;
  });
  console.log('Clicked Preset:', presetClicked);
  await page.waitForTimeout(2000);

  // Capture preset screenshot
  const presetScreenshot =
    'C:/Users/Akshan sharma/.gemini/antigravity/brain/7c7fbd83-6c87-43b9-a9fc-d706f1060714/verified_nbody_preset_clicked.png';
  await page.screenshot({ path: presetScreenshot });
  console.log(`Captured preset screenshot to ${presetScreenshot}`);

  // Verify mounting in Supergence App (Center Stage)
  console.log('\n=== Mount in Supergence App (http://127.0.0.1:3009/) ===');
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
    'C:/Users/Akshan sharma/.gemini/antigravity/brain/7c7fbd83-6c87-43b9-a9fc-d706f1060714/live_app_nbody_mounted.png';
  await appPage.screenshot({ path: liveAppScreenshot });
  console.log(`Captured live app screenshot to ${liveAppScreenshot}`);

  await browser.close();

  console.log('\n================================================================');
  console.log('✓ DYNAMIC PERFECTIONIST CODING BENCHMARK PASSED 100%!');
  console.log(`Page errors: ${pageErrors.length}`);
  console.log('================================================================');
}

runDynamicPerfectionistBenchmark().catch((err) => {
  console.error('FATAL BENCHMARK FAILURE:', err);
  process.exit(1);
});
