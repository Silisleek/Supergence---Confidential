const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const logs = [];
  page.on('console', (msg) => logs.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', (err) => logs.push({ type: 'error', text: err.message }));

  console.log('Navigating to http://localhost:3009/...');
  await page.goto('http://localhost:3009/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  // Check visibility of key elements
  const isWorkspaceActive = await page.$eval('#supergenceWorkspace', (el) =>
    el ? el.classList.contains('active') : false,
  );
  const isSidebarVisible = await page.$eval('#workspaceConversationsSidebar', (el) =>
    el ? !el.classList.contains('collapsed') : false,
  );
  const activeTitle = await page.$eval('#activeWorkspaceTitleDisplay', (el) =>
    el ? el.textContent.trim() : '',
  );
  const convCount = await page.$$eval('.sidebar-conv-item', (els) => els.length);
  const streamTurns = await page.$$eval('.chat-turn-item', (els) => els.length);
  const iframeSrc = await page
    .$eval('#sideHeroArtifactIframe', (el) =>
      el ? (el.src || el.srcdoc ? 'LOADED' : 'BLANK') : 'NONE',
    )
    .catch(() => 'NONE');
  const iframeDisplay = await page
    .$eval('#sideHeroArtifactIframe', (el) => (el ? window.getComputedStyle(el).display : 'NONE'))
    .catch(() => 'NONE');

  console.log('--- ENTERPRISE UI VERIFICATION ---');
  console.log('Workspace Active:', isWorkspaceActive);
  console.log('Conversations Sidebar Visible:', isSidebarVisible);
  console.log('Active Title:', activeTitle);
  console.log('Sidebar Conversations Count:', convCount);
  console.log('Chat Stream Turns Count:', streamTurns);
  console.log('Hero Iframe State:', iframeSrc, 'Display:', iframeDisplay);

  const errors = logs.filter((l) => l.type === 'error');
  console.log('Errors count:', errors.length);
  if (errors.length > 0) {
    console.log('First error:', errors[0]);
  }

  const screenshotPath = path.join(__dirname, '../../../scripts/enterprise_ui_verified.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('Saved screenshot to:', screenshotPath);

  await browser.close();
})();
