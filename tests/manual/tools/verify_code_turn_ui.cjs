const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1560, height: 960 } });

  console.log('Navigating to http://localhost:3009/ ...');
  await page.goto('http://localhost:3009/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Click on the newly created conversation in the sidebar if available
  const convItems = await page.$$('.sidebar-conv-item');
  console.log(`Found ${convItems.length} conversations in sidebar.`);
  if (convItems.length > 0) {
    const firstText = await convItems[0].innerText();
    console.log('First conversation in sidebar:', firstText.replace(/\n/g, ' | '));
    await convItems[0].click();
    await page.waitForTimeout(2000);
  }

  const shotPath = path.resolve(
    'C:/Users/Akshan sharma/.gemini/antigravity/brain/7c7fbd83-6c87-43b9-a9fc-d706f1060714/live_coding_turn_verified.png',
  );
  await page.screenshot({ path: shotPath, fullPage: false });
  console.log('Saved screenshot to:', shotPath);

  await browser.close();
})();
