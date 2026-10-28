import { chromium } from 'playwright-core';

async function test() {
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('Loading http://localhost:3008/ ...');
  await page.goto('http://localhost:3008/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Remove overlay
  await page.evaluate(() => {
    localStorage.setItem('supergence_powered_on', 'true');
    const overlay = document.getElementById('powerOnOverlay');
    if (overlay) overlay.remove();
  });

  // Type in the bottom input (#workspaceInp)
  const input = page.locator('#workspaceInp');
  await input.waitFor({ state: 'visible', timeout: 5000 });
  await input.fill('Make me a video of a man eating noodles.');
  await page.waitForTimeout(300);

  const sendBtn = page.locator('#workspaceSendBtn');
  await sendBtn.click();
  console.log('Sent turn, waiting for turn completion...');

  // Wait for either response body or artifact slot to populate
  await page.waitForTimeout(12000);

  const outPath =
    'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\b4cb1339-bae8-4948-a6e1-0557a4708b93\\user_perspective_after_turn.png';
  await page.screenshot({ path: outPath, fullPage: false });
  console.log('Saved screenshot to:', outPath);

  await browser.close();
}

test().catch(console.error);
