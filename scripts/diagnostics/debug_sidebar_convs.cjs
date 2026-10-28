const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('console', (msg) => console.log('BROWSER LOG:', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost:3009/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const res = await page.evaluate(async () => {
    const listEl = document.getElementById('sidebarConvList');
    const drawerEl = document.getElementById('workspaceHistoryList');
    const convsBefore = listEl ? listEl.children.length : -1;

    // Call loadConversationsList directly
    let err = null;
    try {
      if (typeof window.loadConversationsList === 'function') {
        await window.loadConversationsList();
      }
    } catch (e) {
      err = e.message;
    }

    const convsAfter = listEl ? listEl.querySelectorAll('.sidebar-conv-item').length : -1;
    const htmlPreview = listEl ? listEl.innerHTML.slice(0, 300) : 'none';

    return { convsBefore, convsAfter, err, htmlPreview };
  });

  console.log('Result:', res);
  await browser.close();
})();
