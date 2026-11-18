import { chromium } from 'playwright-core';
import path from 'node:path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir =
  'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\126f6264-933d-4eb8-8b72-020c31e72b62';
const sessionToken = process.env.SIS_SESSION_SECRET;

(async () => {
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1680,1050'],
  });

  const context = await browser.newContext({ viewport: { width: 1680, height: 1050 } });

  await context.addCookies([
    {
      name: 'sis_session_3009',
      value: sessionToken,
      domain: '127.0.0.1',
      path: '/',
    },
    {
      name: 'sis_session_3009',
      value: sessionToken,
      domain: 'localhost',
      path: '/',
    },
  ]);

  await context.addInitScript(() => {
    localStorage.setItem('sis_setup_completed', 'true');
    localStorage.setItem('sis_model_setup_seen', 'true');
    localStorage.setItem('sis-ui-theme', 'liquid-glass');
  });

  const page = await context.newPage();

  console.log('Navigating to http://127.0.0.1:3009/...');
  await page.goto('http://127.0.0.1:3009/', { waitUntil: 'commit' });

  console.log('Waiting for #sgDualWorkspaceWrapper...');
  await page.waitForSelector('#sgDualWorkspaceWrapper', { timeout: 12000 });
  await page.waitForTimeout(2500);

  // 1. Capture primary symmetrical dual workspace with Activity tab
  await page
    .waitForFunction(
      () => {
        const el = document.getElementById('sgStatTotalContributions');
        return el && el.textContent !== '--';
      },
      { timeout: 8000 },
    )
    .catch(() => {});
  await page.waitForTimeout(2000);
  const previewPath = path.join(artifactDir, 'rendered_workspace_preview.png');
  await page.screenshot({ path: previewPath, fullPage: false });
  console.log('1. Saved preview:', previewPath);

  // 2. Click Browser tab and capture
  await page.click('[data-tab="browser"]');
  await page.waitForTimeout(1000);
  const browserPath = path.join(artifactDir, 'rendered_browser_tab.png');
  await page.screenshot({ path: browserPath, fullPage: false });
  console.log('2. Saved browser tab:', browserPath);

  // 3. Click Files tab and capture
  await page.click('[data-tab="files"]');
  await page.waitForSelector('.sg-file-tree-item', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const filesPath = path.join(artifactDir, 'rendered_files_tab.png');
  await page.screenshot({ path: filesPath, fullPage: false });
  console.log('3. Saved files tab:', filesPath);

  // 4. Click Memory tab and capture
  await page.click('[data-tab="memory"]');
  await page.waitForSelector('.sg-memory-card', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const memoryPath = path.join(artifactDir, 'rendered_memory_tab.png');
  await page.screenshot({ path: memoryPath, fullPage: false });
  console.log('4. Saved memory tab:', memoryPath);

  // 5. Switch back to Activity tab and capture
  await page.click('[data-tab="activity"]');
  await page.waitForSelector('.sg-heatmap-tile', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const activityPath = path.join(artifactDir, 'rendered_activity_tab.png');
  await page.screenshot({ path: activityPath, fullPage: false });
  console.log('5. Saved activity tab:', activityPath);

  await browser.close();
  console.log('All verification captures completed successfully!');
})();
