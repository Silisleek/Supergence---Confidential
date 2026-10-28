const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errs = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push(m.text().slice(0, 200));
  });
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message.slice(0, 200)));
  await page.goto('http://localhost:3009/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);
  const info = await page.evaluate(() => ({
    title: document.title,
    scripts: [...document.querySelectorAll('script[src]')].map((s) => s.getAttribute('src')),
    hasChatInput: !!document.getElementById('chat-input'),
    hasSendBtn: !!document.getElementById('sendBtn'),
    hasDeck: !!document.querySelector('.hud-floating-dock'),
    hasSbt: document.querySelectorAll('[id^="sbt-"]').length,
    bodyLen: document.body.innerHTML.length,
    wsState: typeof window.SISContinuousDock,
  }));
  console.log(JSON.stringify(info, null, 2));
  console.log('ERRORS:', errs.slice(0, 10));
  await browser.close();
})();
