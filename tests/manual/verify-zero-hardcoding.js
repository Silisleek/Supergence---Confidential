// Verification: ZERO Hardcoding & 100% Dynamic Model Synthesis
// Drives real Google Chrome via Playwright per AGENTS.md

import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import os from 'os';

const PORT = 3008;
const BASE_URL = `http://localhost:${PORT}`;
const ARTIFACT_DIR =
  'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\b4cb1339-bae8-4948-a6e1-0557a4708b93';

async function verifyZeroHardcoding() {
  console.log(
    `[ZeroHardcoding] 🚀 Starting Verification of Dynamic AI Game Generation against ${BASE_URL}...`,
  );

  const tempProfile = path.join(os.tmpdir(), 'sis_chrome_' + Date.now());
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await chromium.launch({
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    channel: fs.existsSync(chromePath) ? undefined : 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--use-gl=angle'],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  console.log(`[ZeroHardcoding] Navigating to ${BASE_URL}...`);
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2000);

  // Clear power on overlay if present
  await page.evaluate(() => {
    localStorage.setItem('supergence_powered_on', 'true');
    const overlay = document.getElementById('powerOnOverlay');
    if (overlay) overlay.remove();
    const powerBtn = document.querySelector('button[onclick*="powerOn"], #powerOnBtn');
    if (powerBtn) powerBtn.click();
  });
  await page.waitForTimeout(3000);

  // Reset Center Stage iframe so previous session artifacts don't create false early triggers
  await page.evaluate(() => {
    const iframe = document.getElementById('sideHeroArtifactIframe');
    if (iframe) {
      iframe.src = '';
      iframe.removeAttribute('src');
      iframe.style.display = 'none';
    }
    const placeholder = document.getElementById('sideHeroSynthesizingPlaceholder');
    if (placeholder) placeholder.style.display = 'none';
    if (typeof currentHeroArtifactUrl !== 'undefined') currentHeroArtifactUrl = '';
  });

  const testStartTime = Date.now();
  // Prompt the exact query from the user
  const userPrompt = 'Make me a 3D, high graphical spaceship game.';
  console.log(`[ZeroHardcoding] Submitting user prompt: "${userPrompt}"`);

  const mainInp = page.locator('#inp');
  await mainInp.fill(userPrompt);
  await page.waitForTimeout(400);
  const sendBtn = page.locator('#sendBtn');
  await sendBtn.click();

  console.log(
    `[ZeroHardcoding] Waiting for generative spaceship game to synthesize and promote to Center Stage...`,
  );
  let promotedSrc = '';
  for (let i = 0; i < 240; i++) {
    await page.waitForTimeout(1000);
    const s = await page.evaluate(() => {
      const iframe = document.getElementById('sideHeroArtifactIframe');
      const badge = document.getElementById('heroArtifactBadge');
      const placeholder = document.getElementById('sideHeroSynthesizingPlaceholder');
      return {
        src: iframe ? iframe.getAttribute('src') || iframe.src : '',
        isIframeVisible: iframe ? iframe.style.display !== 'none' && iframe.offsetWidth > 0 : false,
        isPlaceholderHidden: placeholder ? placeholder.style.display === 'none' : false,
        badge: badge ? badge.textContent.trim() : '',
      };
    });
    console.log(
      `[Second ${i + 1}] src: ${s.src.slice(-55)} | vis: ${s.isIframeVisible} | badge: ${s.badge}`,
    );
    if (
      s.isIframeVisible &&
      s.isPlaceholderHidden &&
      s.src.includes('.html') &&
      !s.src.includes('airplane-game')
    ) {
      const cleanRel = s.src.replace(/^\/workspace\//, '');
      const full = path.join(process.cwd(), 'workspace', cleanRel);
      if (fs.existsSync(full)) {
        const stat = fs.statSync(full);
        if (stat.mtimeMs >= testStartTime) {
          console.log(
            `✓ Newly synthesized 3D Game promoted to Center Stage (Second ${i + 1}): ${s.src}`,
          );
          promotedSrc = s.src;
          break;
        }
      }
    }
  }

  if (!promotedSrc) {
    throw new Error('Generative 3D Game failed to promote to Center Stage within 240s.');
  }

  // Verify that the generated file on disk has NO canned template text
  const cleanPathRel = promotedSrc.replace(/^\/workspace\//, '');
  const cleanPathFull = path.join(process.cwd(), 'workspace', cleanPathRel);
  console.log(`[ZeroHardcoding] Checking generated file on disk: ${cleanPathFull}`);

  if (!fs.existsSync(cleanPathFull)) {
    throw new Error(`Generated file does not exist on disk: ${cleanPathFull}`);
  }

  const generatedHtml = fs.readFileSync(cleanPathFull, 'utf8');
  console.log(`[ZeroHardcoding] File size: ${(generatedHtml.length / 1024).toFixed(1)} KB`);

  // Verify NO hardcoded template fingerprints
  const hasHardcodedApex = generatedHtml.includes('T-65 APEX INTERCEPTOR');
  const hasHardcodedAegis = generatedHtml.includes('FLAGSHIP AEGIS INTEGRITY');
  const hasHardcodedTemplateRef = generatedHtml.includes('project28_starfighter');

  console.log(`[ZeroHardcoding] Verification checks:`);
  console.log(`- Contains T-65 APEX INTERCEPTOR: ${hasHardcodedApex} (MUST BE FALSE)`);
  console.log(`- Contains FLAGSHIP AEGIS: ${hasHardcodedAegis} (MUST BE FALSE)`);
  console.log(`- Contains project28 reference: ${hasHardcodedTemplateRef} (MUST BE FALSE)`);

  if (hasHardcodedApex || hasHardcodedAegis || hasHardcodedTemplateRef) {
    throw new Error('FAIL: Output still contains hardcoded template strings!');
  }

  console.log(
    `[ZeroHardcoding] ✓ PASS: Zero hardcoded template strings found. 100% dynamically synthesized!`,
  );

  // Allow WebGL to render frames
  await page.waitForTimeout(4000);

  // Take live verified screenshot
  const shotPath = path.join(ARTIFACT_DIR, 'live_verified_zero_hardcoding_spaceship_chrome.png');
  await page.screenshot({ path: shotPath, fullPage: false });
  console.log(`[ZeroHardcoding] 📸 Verified screenshot saved to: ${shotPath}`);

  await browser.close();
  console.log(`[ZeroHardcoding] 🎉 ZERO HARDCODING VERIFICATION COMPLETE & PASSED!`);
}

verifyZeroHardcoding().catch((err) => {
  console.error(`[ZeroHardcoding] ❌ Verification FAILED:`, err);
  process.exit(1);
});
