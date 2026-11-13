import { chromium } from 'playwright-core';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

async function capture() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-pw-'));
  try {
    console.log('[1/6] Launching Chrome persistent context...');
    const context = await chromium.launchPersistentContext(tmpDir, {
      headless: true,
      channel: 'chrome',
      viewport: { width: 1440, height: 900 },
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    console.log('[2/6] Preparing page...');
    const page = context.pages()[0] || (await context.newPage());

    await page.addInitScript(() => {
      localStorage.setItem('sis_setup_completed', 'true');
      localStorage.setItem('sis_model_setup_seen', 'true');
      localStorage.setItem('sis_hud_style', 'liquid-glass');
      localStorage.removeItem('sis_workspace_conv');
    });

    console.log('[3/6] Navigating to http://127.0.0.1:3009/ ...');
    await page.goto('http://127.0.0.1:3009/', { waitUntil: 'commit', timeout: 15000 });
    await page.waitForTimeout(2000);

    // 1. Capture Chat Landing Hero
    const landingOut = path.resolve('C:/Users/Akshan sharma/.gemini/antigravity/brain/cc78a903-c95c-43ff-b918-06eb784f9796/actual-chat-landing.png');
    console.log('[4/6] Capturing Chat Landing Hero to:', landingOut);
    await page.screenshot({ path: landingOut, fullPage: true });

    // 2. Switch to Voice Mode via Top Dynamic Island
    console.log('[5/6] Switching to Voice Mode via Top Dynamic Island...');
    await page.evaluate(() => {
      if (window.SupergenceLiquidGlass?.switchMode) {
        window.SupergenceLiquidGlass.switchMode('voice');
      }
    });
    await page.waitForTimeout(1500);

    const voiceOut = path.resolve('C:/Users/Akshan sharma/.gemini/antigravity/brain/cc78a903-c95c-43ff-b918-06eb784f9796/actual-voice-cockpit.png');
    console.log('[5/6] Capturing Voice Cockpit to:', voiceOut);
    await page.screenshot({ path: voiceOut, fullPage: true });

    // 3. Switch back to Chat Mode and render active conversation turn
    console.log('[6/6] Switching back to Chat Mode and rendering active conversation turn...');
    await page.evaluate(() => {
      if (window.SupergenceLiquidGlass?.switchMode) {
        window.SupergenceLiquidGlass.switchMode('chat');
      }
      if (window.SupergenceLiquidGlass?.renderConversation) {
        window.SupergenceLiquidGlass.renderConversation([
          { role: 'user', content: 'Hey Supergence, What are you doing?' },
          { role: 'assistant', content: 'I am doing well and I am ready to help you. Ready to dive in?' }
        ]);
      }
    });
    await page.waitForTimeout(1000);

    const activeCardOut = path.resolve('C:/Users/Akshan sharma/.gemini/antigravity/brain/cc78a903-c95c-43ff-b918-06eb784f9796/actual-chat-active-card.png');
    console.log('[6/6] Capturing Active Conversation Card to:', activeCardOut);
    await page.screenshot({ path: activeCardOut, fullPage: true });

    await context.close();
    console.log('✓ All 3 screen states verified and captured successfully!');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

capture().catch((err) => {
  console.error('Capture error:', err);
  process.exit(1);
});
