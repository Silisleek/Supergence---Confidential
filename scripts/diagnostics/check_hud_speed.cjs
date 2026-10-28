const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3009/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  for (let i = 0; i < page.frames().length; i++) {
    const f = page.frames()[i];
    console.log(`Frame [${i}]: ${f.url()}`);
    try {
      const title = await f.title();
      const bodySnippet = await f.$eval('body', (el) => (el ? el.innerHTML.slice(0, 200) : 'none'));
      console.log(`  Title: ${title}, Body snippet: ${bodySnippet.slice(0, 100)}`);
    } catch (e) {
      console.log(`  Error inspecting frame: ${e.message}`);
    }
  }
  await browser.close();
})();
