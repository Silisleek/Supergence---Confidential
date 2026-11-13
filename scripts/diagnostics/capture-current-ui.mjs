import { chromium } from 'playwright-core';
import path from 'node:path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const screenshotDir = path.resolve('test-results/current-ui');

(async () => {
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1600,1000'],
  });

  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

  // Authenticate as local operator to get session cookie
  await page.goto('http://127.0.0.1:3009/sleek-login');
  await page.evaluate(async () => {
    await fetch('/api/silisleek/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ local: true }),
    });
    localStorage.setItem('sis_setup_completed', 'true');
    localStorage.setItem('sis_model_setup_seen', 'true');
  });

  await page.goto('http://127.0.0.1:3009/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const screenshotPath = path.join(screenshotDir, 'current-view.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('Current UI screenshot saved to:', screenshotPath);

  // Check what theme is applied, what elements are on the screen
  const pageState = await page.evaluate(() => {
    return {
      bodyClass: document.body.className,
      themeAttr: document.documentElement.getAttribute('data-theme'),
      activeThemeLocalStorage: localStorage.getItem('sis-ui-theme'),
      hasOnboardingModal: Boolean(document.getElementById('sisOnboardingModal')),
      onboardingModalHidden: document.getElementById('sisOnboardingModal')?.hidden,
      hasInjectedWidget: Boolean(document.getElementById('sis-widget-eval_live_hud')),
      floatingLayerChildren: document.getElementById('sisFloatingLayer')?.children.length,
      turnsCount: document.querySelectorAll('.chat-turn-item').length,
      mainResponseBody: document.getElementById('mainResponseBody')?.textContent.trim().slice(0, 100),
      currentTitle: document.getElementById('activeWorkspaceTitleDisplay')?.textContent,
      navItems: Array.from(document.querySelectorAll('nav a, .nav-item, [role="tab"]')).map(el => el.textContent.trim()).filter(Boolean),
    };
  });
  console.log('Page State:', JSON.stringify(pageState, null, 2));

  await browser.close();
})();
