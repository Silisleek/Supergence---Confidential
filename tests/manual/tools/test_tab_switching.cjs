const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1560, height: 960 } });

  console.log('Navigating to http://localhost:3009/ ...');
  await page.goto('http://localhost:3009/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // 1. We are currently on C++ code studio
  const studioVisible1 = await page.isVisible('#sideHeroCodeStudio');
  const iframeVisible1 = await page.isVisible('#sideHeroArtifactIframe');
  console.log(
    'Initially: Code Studio visible =',
    studioVisible1,
    '| Iframe visible =',
    iframeVisible1,
  );

  // 2. Click the 3D car racing conversation in sidebar
  const convItems = await page.$$('.sidebar-conv-item');
  let clickedRacing = false;
  for (const item of convItems) {
    const txt = await item.innerText();
    if (txt.includes('3D car racing')) {
      console.log('Clicking 3D car racing thread...');
      await item.click();
      clickedRacing = true;
      break;
    }
  }

  await page.waitForTimeout(3000);

  const studioVisible2 = await page.isVisible('#sideHeroCodeStudio');
  const iframeVisible2 = await page.isVisible('#sideHeroArtifactIframe');
  console.log(
    'After clicking 3D car racing: Code Studio visible =',
    studioVisible2,
    '| Iframe visible =',
    iframeVisible2,
  );

  const shotPath = path.resolve(
    'C:/Users/Akshan sharma/.gemini/antigravity/brain/7c7fbd83-6c87-43b9-a9fc-d706f1060714/smooth_switch_to_game.png',
  );
  await page.screenshot({ path: shotPath, fullPage: false });
  console.log('Saved screenshot to:', shotPath);

  await browser.close();
})();
