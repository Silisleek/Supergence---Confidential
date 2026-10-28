const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('console', (msg) => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost:3009/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  const res = await page.evaluate(() => {
    return {
      activeConv: window.__activeWorkspaceConvId,
      localStorageConv: localStorage.getItem('sis_workspace_conv'),
      hasIframe: Boolean(document.getElementById('sideHeroArtifactIframe')),
      iframeSrc: document.getElementById('sideHeroArtifactIframe')?.src,
      placeholderDisplay: document.getElementById('sideHeroSynthesizingPlaceholder')
        ? window.getComputedStyle(document.getElementById('sideHeroSynthesizingPlaceholder'))
            .display
        : null,
    };
  });

  console.log('Result:', res);
  await browser.close();
})();
