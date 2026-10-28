import { chromium } from 'playwright-core';

async function verifyAppSurface() {
  console.log('Launching Chrome to verify App surface at http://localhost:3009/ ...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  const errors = [];
  page.on('response', (res) => {
    if (res.status() >= 400) {
      console.log('App 404 URL:', res.status(), res.url());
    }
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log('[App Console Error]', msg.text());
    }
  });

  page.on('pageerror', (err) => {
    errors.push(err.message);
    console.log('[App Page Error]', err.message);
  });

  await page.goto('http://localhost:3009/', {
    waitUntil: 'networkidle',
    timeout: 30000,
  });

  console.log('✓ App page loaded');

  // Verify key interface elements
  const appState = await page.evaluate(() => {
    return {
      title: document.title,
      hasBottomDeck:
        !!document.getElementById('bottom-deck') ||
        !!document.querySelector('.bottom-deck') ||
        !!document.querySelector('footer'),
      hasWorkspace:
        !!document.getElementById('center-stage') ||
        !!document.querySelector('.center-stage') ||
        !!document.querySelector('main'),
      activeWsConnected: window.__wsConnected || false,
    };
  });

  console.log('App State:', JSON.stringify(appState, null, 2));

  const screenshotPath =
    'C:/Users/Akshan sharma/.gemini/antigravity/brain/7c7fbd83-6c87-43b9-a9fc-d706f1060714/live_app_surface_verified.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('✓ App screenshot captured to:', screenshotPath);

  await browser.close();
  console.log('Total App Console Errors:', errors.length);
}

verifyAppSurface().catch((err) => {
  console.error('App verification failed:', err);
  process.exit(1);
});
