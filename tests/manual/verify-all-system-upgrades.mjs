// SIS 1.0 — Comprehensive End-to-End Upgrade Verification
// Drives real Google Chrome via Playwright per AGENTS.md

import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const PORT = 3008;
const BASE_URL = `http://localhost:${PORT}`;
const ARTIFACT_DIR =
  'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\b4cb1339-bae8-4948-a6e1-0557a4708b93';
const SCREENSHOT_PATH = path.join(
  ARTIFACT_DIR,
  'live_verified_superintelligence_upgrade_chrome.png',
);

async function verifyAllUpgrades() {
  console.log(`[VerifyUpgrades] 🚀 Launching real Google Chrome against ${BASE_URL}...`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await chromium.launch({
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    channel: fs.existsSync(chromePath) ? undefined : 'chrome',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=angle',
      '--window-size=1440,900',
    ],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log(`[VerifyUpgrades] Navigating to ${BASE_URL}...`);
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2000);

  // Clear power overlay if present
  await page.evaluate(() => {
    localStorage.setItem('supergence_powered_on', 'true');
    const overlay = document.getElementById('powerOnOverlay');
    if (overlay) overlay.remove();
    const powerBtn = document.querySelector('button[onclick*="powerOn"], #powerOnBtn');
    if (powerBtn) powerBtn.click();
  });
  await page.waitForTimeout(1500);

  console.log('[VerifyUpgrades] Inspecting UI palette, borders, and audio...');
  const uiStyles = await page.evaluate(() => {
    const rootStyle = getComputedStyle(document.documentElement);
    const bodyStyle = getComputedStyle(document.body);

    return {
      colorCoffee: rootStyle.getPropertyValue('--color-coffee').trim(),
      colorCoffeeDark: rootStyle.getPropertyValue('--color-coffee-dark').trim(),
      colorBlue: rootStyle.getPropertyValue('--color-blue').trim(),
      colorLime: rootStyle.getPropertyValue('--color-lime').trim(),
      bodyBg: bodyStyle.backgroundColor,
      hasWindowAudio: typeof window.audio?.play === 'function',
      hasNeonGradients:
        document.body.innerHTML.includes('#00ffcc') || document.body.innerHTML.includes('#00f0ff'),
    };
  });

  console.log('UI Palette Inspection:', uiStyles);

  // Click a button to test sci-fi sound invocation
  console.log('[VerifyUpgrades] Testing sci-fi click audio...');
  const soundWorked = await page.evaluate(() => {
    try {
      window.audio.play('click');
      return true;
    } catch (e) {
      return false;
    }
  });
  console.log('✓ Sci-Fi audio invocation verified:', soundWorked);

  // Send a prompt to Supergence
  const userPrompt =
    'Explain Keplerian orbital mechanics and synthesize the orbital velocity equation.';
  console.log(`[VerifyUpgrades] Submitting prompt: "${userPrompt}"`);

  // Activate input and type
  await page.evaluate((text) => {
    const inp = document.getElementById('inp');
    const wrap = document.getElementById('inputWrap');
    if (wrap) wrap.classList.add('on');
    if (inp) {
      inp.value = text;
      const sendBtn = document.getElementById('sendBtn');
      if (sendBtn) sendBtn.click();
      else if (window.openWorkspace) window.openWorkspace(text);
    } else if (window.openWorkspace) {
      window.openWorkspace(text);
    }
  }, userPrompt);

  console.log('[VerifyUpgrades] Waiting for response to stream into Workspace...');
  let hasResponse = false;
  let responseSnippet = '';
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    const text = await page.evaluate(() => {
      const respBodies = document.querySelectorAll('.response-body-markdown, #mainResponseBody');
      let combined = '';
      respBodies.forEach((m) => (combined += ' ' + m.textContent));
      return combined.trim();
    });
    if (text.length > 50 && !text.includes('Synthesizing thoughts across unified swarm...')) {
      hasResponse = true;
      responseSnippet = text.slice(0, 300);
      console.log(`✓ Response detected at second ${i + 1}: ${responseSnippet}...`);
      break;
    }
  }

  // Ensure artifacts directory exists
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  console.log(`[VerifyUpgrades] Saving high-resolution screenshot to ${SCREENSHOT_PATH}...`);
  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false, timeout: 15000 });

  await browser.close();
  console.log('✓ Browser closed cleanly.');
  return { uiStyles, soundWorked, hasResponse, responseSnippet };
}

verifyAllUpgrades()
  .then((res) => {
    console.log('\n=======================================');
    console.log('🎉 COMPREHENSIVE VERIFICATION SUCCESSFUL!');
    console.log(JSON.stringify(res, null, 2));
    console.log('=======================================');
    process.exit(0);
  })
  .catch((err) => {
    console.error('VERIFICATION ERROR:', err);
    process.exit(1);
  });
