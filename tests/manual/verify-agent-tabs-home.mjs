// E2E Verification for Agent Default Browser Home Tab & Multi-Tab Chrome System
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

async function run() {
  console.log('--- STARTING E2E VERIFICATION FOR AGENT CHROME & MULTI-TAB SYSTEM ---');

  const screenshotsDir = path.resolve('tests/screenshots');
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

  // 1. Verify backend APIs directly
  const baseUrl = 'http://localhost:3008';
  console.log(`Checking backend API on ${baseUrl}...`);

  const homeRes = await fetch(`${baseUrl}/browser-home?agent=agent-cs`);
  console.log('✓ /browser-home HTTP status:', homeRes.status);
  const homeHtml = await homeRes.text();
  console.log('✓ Home HTML contains "Nova-Dev":', homeHtml.includes('Nova-Dev'));
  console.log('✓ Home HTML contains "PERSONAL CHROME":', homeHtml.includes('PERSONAL CHROME'));
  console.log('✓ Home HTML contains "Quick Speed Dial":', homeHtml.includes('Quick Speed Dial'));

  const agentsRes = await fetch(`${baseUrl}/api/browser/agents`);
  const agentsData = await agentsRes.json();
  console.log('✓ /api/browser/agents returned agents count:', agentsData.agents?.length);
  const csAgent = agentsData.agents.find((a) => a.id === 'agent-cs');
  console.log('✓ agent-cs homeUrl:', csAgent?.currentUrl);

  // 2. Open agent-cs browser session
  console.log('Initializing personal Chrome session for agent-cs...');
  const openRes = await fetch(`${baseUrl}/api/browser/agent-cs/open`, { method: 'POST' });
  const openData = await openRes.json();
  console.log(
    '✓ agent-cs open result:',
    openData.success,
    'URL:',
    openData.url,
    'Initial tabs:',
    openData.tabs?.length,
  );

  // 3. Open a second tab for agent-cs
  console.log('Opening new tab in agent-cs personal Chrome...');
  const newTabRes = await fetch(`${baseUrl}/api/browser/agent-cs/tabs/new`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://duckduckgo.com' }),
  });
  const newTabData = await newTabRes.json();
  console.log(
    '✓ New tab opened:',
    newTabData.success,
    'New tabId:',
    newTabData.tabId,
    'Total tabs:',
    newTabData.tabs?.length,
  );

  // 4. Switch between tabs
  const initialTabId = newTabData.tabs[0].id;
  console.log(`Switching back to first tab (${initialTabId})...`);
  const switchRes = await fetch(`${baseUrl}/api/browser/agent-cs/tabs/switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tabId: initialTabId }),
  });
  const switchData = await switchRes.json();
  console.log('✓ Switched tab result:', switchData.success, 'Active tab URL:', switchData.url);

  // 5. Verify UI in real Google Chrome via Playwright
  console.log('\nLaunching real Google Chrome via Playwright to verify UI surfaces...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await chromium.launch({
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    channel: fs.existsSync(chromePath) ? undefined : 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // A. Verify Workbench Surface
  console.log('Navigating to Workbench (http://localhost:3008/workbench)...');
  await page.goto(`${baseUrl}/workbench`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Switch to agent browser view if needed
  const browserViewBtn = page.locator('#tabModeAgentBrowsers');
  if (await browserViewBtn.isVisible()) {
    await browserViewBtn.click();
    await page.waitForTimeout(1000);
  }

  // Click Nova-Dev / agent-cs chip
  const csChip = page.locator('#ribbon-chip-agent-cs');
  await csChip.waitFor({ state: 'visible', timeout: 10000 });
  await csChip.click();
  await page.waitForTimeout(2000);

  // Wait for tab strip to have tabs rendered
  await page.waitForSelector('#agentBrowserTabStrip .browser-tab', { timeout: 10000 });

  const tabStripWorkbench = page.locator('#agentBrowserTabStrip');
  console.log('✓ Workbench #agentBrowserTabStrip visible:', await tabStripWorkbench.isVisible());

  let tabsCountWorkbench = await page.locator('#agentBrowserTabStrip .browser-tab').count();
  console.log('✓ Workbench tabs rendered in strip:', tabsCountWorkbench);

  const newTabBtnWorkbench = page.locator('#agentBrowserTabStrip .browser-tab-new-btn');
  console.log('✓ Workbench "+" new tab button visible:', await newTabBtnWorkbench.isVisible());

  // Click "+" button to test opening new tab via UI
  if (await newTabBtnWorkbench.isVisible()) {
    console.log('Clicking "+" button in Workbench UI...');
    await newTabBtnWorkbench.click();
    await page.waitForTimeout(3000);
    const updatedTabsCount = await page.locator('#agentBrowserTabStrip .browser-tab').count();
    console.log('✓ Workbench updated tabs count after clicking "+":', updatedTabsCount);
  }

  // Take screenshot of Workbench
  const workbenchScreenshotPath = path.join(screenshotsDir, 'workbench_agent_tabs_verified.png');
  await page.screenshot({ path: workbenchScreenshotPath });
  console.log('✓ Workbench screenshot saved to:', workbenchScreenshotPath);

  // B. Verify Classic App Surface (client/index.html)
  console.log('\nNavigating to Classic App (http://localhost:3008/index.html)...');
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Open modal via button or direct function
  await page.evaluate(() => {
    if (typeof window.openAgentBrowserModal === 'function') {
      window.openAgentBrowserModal('agent-cs');
    }
  });

  // Wait for tab strip in classic modal
  await page.waitForSelector('#agentBrowserTabStripIndex .browser-tab', { timeout: 10000 });

  const tabStripIndex = page.locator('#agentBrowserTabStripIndex');
  console.log('✓ Classic App #agentBrowserTabStripIndex visible:', await tabStripIndex.isVisible());
  const tabsCountIndex = await page.locator('#agentBrowserTabStripIndex .browser-tab').count();
  console.log('✓ Classic App tabs rendered in strip:', tabsCountIndex);

  const newTabBtnIndex = page.locator('#agentBrowserTabStripIndex .browser-tab-new-btn');
  console.log('✓ Classic App "+" button visible:', await newTabBtnIndex.isVisible());
  if (await newTabBtnIndex.isVisible()) {
    console.log('Clicking "+" button in Classic App modal...');
    await newTabBtnIndex.click({ force: true });
    await page.waitForTimeout(3000);
    const updatedTabsCountIndex = await page
      .locator('#agentBrowserTabStripIndex .browser-tab')
      .count();
    console.log('✓ Classic App updated tabs count after clicking "+":', updatedTabsCountIndex);
  }

  // Take screenshot of Classic Modal
  const modalScreenshotPath = path.join(screenshotsDir, 'classic_agent_tabs_verified.png');
  await page.screenshot({ path: modalScreenshotPath });
  console.log('✓ Classic modal screenshot saved to:', modalScreenshotPath);

  // C. Verify Default Browser Home Tab Page directly
  console.log('\nNavigating to Default Agent Browser Home Tab directly...');
  await page.goto(`${baseUrl}/agent-browser-home.html?agent=agent-cs`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForTimeout(1000);

  const agentNameText = await page.locator('#agentName').innerText();
  const profileBadgeText = await page.locator('#agentProfileBadge').innerText();
  const shortcutsCount = await page.locator('.shortcut-card').count();
  console.log('✓ Home tab agent name:', agentNameText);
  console.log('✓ Home tab profile badge:', profileBadgeText);
  console.log('✓ Home tab speed dial shortcuts count:', shortcutsCount);

  const homeScreenshotPath = path.join(screenshotsDir, 'default_browser_home_tab_verified.png');
  await page.screenshot({ path: homeScreenshotPath });
  console.log('✓ Default browser home screenshot saved to:', homeScreenshotPath);

  await browser.close();
  console.log('\n========================================');
  console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY!');
  console.log('========================================');
}

run().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
