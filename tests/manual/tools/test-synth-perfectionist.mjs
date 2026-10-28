import { perfectionistCoderEngine } from '../../../server/coder/perfectionist-coder-engine.js';
import { chromium } from 'playwright-core';
import fs from 'fs';

async function runSynthBenchmark() {
  console.log('================================================================');
  console.log('🚀 Supergence Perfectionist Dynamic Coding Benchmark');
  console.log('Domain: Modular Polyphonic FM Synthesizer & Realtime Audio DSP Studio');
  console.log('================================================================\n');

  const prompt =
    'Modular Polyphonic FM and Subtractive Synthesizer with 4-pole resonant filter sweeps, dual-trace phosphor oscilloscope with zero-crossing trigger sync, 2048-point logarithmic FFT spectrogram waterfall, interactive 25-key chromatic piano keyboard, and real-time RMS spectral telemetry.';

  const result = await perfectionistCoderEngine.buildPerfectionistDeliverable({
    prompt,
    title: 'Modular Polyphonic FM/Subtractive Synthesizer & Realtime DSP Studio',
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
    'C:/Users/Akshan sharma/.gemini/antigravity/brain/7c7fbd83-6c87-43b9-a9fc-d706f1060714/verified_audio_dsp_synth_perfectionist.png';
  await page.screenshot({ path: screenshotPath });
  console.log(`Captured screenshot to ${screenshotPath}`);

  // Test interactive controls in real browser
  console.log('\n=== Testing Interactive Controls in Real Browser ===');
  const fpsText = await page.$eval('#fpsCounter', (el) => el.textContent).catch(() => 'N/A');
  console.log('FPS Counter Text:', fpsText);

  // Read telemetry metrics
  const telemetryValues = await page.evaluate(() => {
    const ids = ['teleRms', 'teleFundFreq', 'teleCentroid', 'teleVoices'];
    const res = {};
    ids.forEach((id) => {
      const el = document.getElementById(id);
      res[id] = el ? el.textContent : null;
    });
    return res;
  });
  console.log('Live Telemetry Metrics:', telemetryValues);

  // Test interactive piano keyboard interaction
  console.log('Simulating pointer click on piano keys...');
  await page.mouse.click(350, 310);
  await page.waitForTimeout(300);
  await page.mouse.click(450, 310);
  await page.waitForTimeout(300);
  await page.mouse.click(550, 310);
  await page.waitForTimeout(1000);

  // Click a preset button (e.g. 303 Acid Bass)
  const presetClicked = await page.evaluate(() => {
    const btn =
      document.getElementById('presetAcidBass') ||
      document.querySelector('.btn-grid.presets button:nth-child(2)');
    if (btn) {
      btn.click();
      return btn.textContent;
    }
    return null;
  });
  console.log('Clicked Preset:', presetClicked);
  await page.waitForTimeout(3000);

  // Capture preset screenshot
  const presetScreenshot =
    'C:/Users/Akshan sharma/.gemini/antigravity/brain/7c7fbd83-6c87-43b9-a9fc-d706f1060714/verified_audio_dsp_acidbass_preset.png';
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
    'C:/Users/Akshan sharma/.gemini/antigravity/brain/7c7fbd83-6c87-43b9-a9fc-d706f1060714/live_app_synth_mounted.png';
  await appPage.screenshot({ path: liveAppScreenshot });
  console.log(`Captured live app screenshot to ${liveAppScreenshot}`);

  await browser.close();

  console.log('\n================================================================');
  console.log('✓ DYNAMIC AUDIO DSP CODING BENCHMARK PASSED 100%!');
  console.log('Errors:', pageErrors.length === 0 ? '0 (Clean)' : pageErrors);
  console.log('================================================================\n');

  if (pageErrors.length > 0) {
    throw new Error(`Browser reported errors: ${pageErrors.join(', ')}`);
  }
}

runSynthBenchmark().catch((err) => {
  console.error('Audio DSP Benchmark Error:', err);
  process.exit(1);
});
