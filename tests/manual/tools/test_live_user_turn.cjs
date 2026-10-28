const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1560, height: 960 } });

  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.text().includes('Error')) {
      console.log('BROWSER ERR:', msg.text());
    }
  });

  console.log('Navigating to http://localhost:3009/ ...');
  await page.goto('http://localhost:3009/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // 1. Click New Chat button
  console.log('Clicking "+ New Chat" button...');
  const newChatBtn = await page.$('.new-chat-btn');
  if (newChatBtn) {
    await newChatBtn.click();
    await page.waitForTimeout(1000);
  }

  // 2. Type query into textarea
  const query =
    'Create a high-performance interactive 2D Particle Life simulation in HTML5 Canvas with multiple color-coded particle species, customizable attraction matrices, and mouse gravity controls.';
  console.log('Typing query into #workspaceInp...');
  await page.fill('#workspaceInp', query);
  await page.waitForTimeout(500);

  // 3. Press Enter to submit
  console.log('Pressing Enter to submit...');
  await page.press('#workspaceInp', 'Enter');

  // 4. Wait for generation to complete (up to 90s)
  console.log('Waiting for completion...');
  let completed = false;
  for (let i = 0; i < 45; i++) {
    await page.waitForTimeout(2000);
    const isRunning = await page.evaluate(() => {
      const btn = document.getElementById('workspaceSendBtn');
      return btn && btn.disabled;
    });
    const turns = await page.evaluate(() => {
      const items = document.querySelectorAll('.chat-turn-item');
      const last = items[items.length - 1];
      const resp = last ? last.querySelector('.response-body-markdown')?.innerText : '';
      return {
        count: items.length,
        lastRespLen: (resp || '').length,
        isGenerating: resp?.includes('Generating response...'),
      };
    });
    console.log(
      `[${i * 2}s] Running: ${isRunning}, Turns: ${turns.count}, RespLen: ${turns.lastRespLen}, Generating: ${turns.isGenerating}`,
    );
    if (!isRunning && !turns.isGenerating && turns.lastRespLen > 100) {
      completed = true;
      console.log('Turn successfully completed!');
      break;
    }
  }

  await page.waitForTimeout(3000);

  const shotPath = path.resolve(
    'C:/Users/Akshan sharma/.gemini/antigravity/brain/7c7fbd83-6c87-43b9-a9fc-d706f1060714/live_user_particle_turn.png',
  );
  await page.screenshot({ path: shotPath, fullPage: false });
  console.log('Saved screenshot to:', shotPath);

  const evaluation = await page.evaluate(() => {
    const iframe = document.getElementById('sideHeroArtifactIframe');
    const studio = document.getElementById('sideHeroCodeStudio');
    const title = document.getElementById('centerStageTitleText');
    return {
      iframeVisible: iframe ? window.getComputedStyle(iframe).display !== 'none' : false,
      iframeSrc: iframe ? iframe.src : null,
      studioVisible: studio ? window.getComputedStyle(studio).display !== 'none' : false,
      centerStageTitle: title ? title.textContent : null,
    };
  });
  console.log('Final Evaluation:', evaluation);

  await browser.close();
})();
