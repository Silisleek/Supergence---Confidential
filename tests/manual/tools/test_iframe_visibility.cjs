const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3009/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  const res = await page.evaluate(() => {
    const iframe = document.getElementById('sideHeroArtifactIframe');
    const placeholder = document.getElementById('sideHeroSynthesizingPlaceholder');
    return {
      iframeExists: Boolean(iframe),
      iframeDisplay: iframe ? window.getComputedStyle(iframe).display : null,
      iframeSrc: iframe ? iframe.src : null,
      iframeClientWidth: iframe ? iframe.clientWidth : null,
      iframeClientHeight: iframe ? iframe.clientHeight : null,
      placeholderDisplay: placeholder ? window.getComputedStyle(placeholder).display : null,
    };
  });

  console.log('DOM Evaluation:', res);
  await browser.close();
})();
