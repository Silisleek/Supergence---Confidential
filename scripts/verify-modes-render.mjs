import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 1
  });

  await context.addInitScript(() => {
    localStorage.setItem('sis_setup_completed', 'true');
    localStorage.setItem('sis_model_setup_seen', 'true');
    localStorage.setItem('sis_hud_style', 'liquid-glass');
    localStorage.removeItem('sis_workspace_conv');
  });

  const page = await context.newPage();

  // Read current session token from server log or use token directly
  const sessionUrl = 'http://127.0.0.1:3009/__session?token=9b703f8045495b7d05864d15fd4e0f39cec2e2df4af091786f7a97a818494050';
  console.log('Authenticating via', sessionUrl);
  await page.goto(sessionUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

  await page.waitForTimeout(1500);

  // 1. Capture Chat Landing Hero (Matching left panel of user spec media_1794296648507_75f2c431.png)
  const landingPath = path.resolve('c:/Users/Akshan sharma/.gemini/antigravity/brain/cc78a903-c95c-43ff-b918-06eb784f9796/chat-landing-render.png');
  await page.screenshot({ path: landingPath, fullPage: true });
  console.log('Saved chat landing render to:', landingPath);

  // 2. Click Voice Mode button in top dynamic island
  console.log('Switching to Voice Mode via Top Island...');
  await page.click('#sgModeVoiceBtn');
  await page.waitForTimeout(1500);

  const voicePath = path.resolve('c:/Users/Akshan sharma/.gemini/antigravity/brain/cc78a903-c95c-43ff-b918-06eb784f9796/voice-mode-render.png');
  await page.screenshot({ path: voicePath, fullPage: true });
  console.log('Saved voice mode render to:', voicePath);

  // 3. Switch back to Chat Mode and test sending a message
  console.log('Switching back to Chat Mode via Top Island...');
  await page.click('#sgModeChatBtn');
  await page.waitForTimeout(800);

  console.log('Submitting question in Chat Mode...');
  await page.fill('#sgLandingInput', 'Hey Supergence, What are you doing?');
  await page.click('#sgLandingSubmitBtn');

  // Wait for response to populate in active card
  console.log('Waiting for response...');
  await page.waitForTimeout(3000);

  const activeCardPath = path.resolve('c:/Users/Akshan sharma/.gemini/antigravity/brain/cc78a903-c95c-43ff-b918-06eb784f9796/chat-active-card-render.png');
  await page.screenshot({ path: activeCardPath, fullPage: true });
  console.log('Saved active card render to:', activeCardPath);

  await browser.close();
  console.log('Verification finished successfully!');
}

main().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
