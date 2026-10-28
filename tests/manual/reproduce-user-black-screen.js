import { chromium } from 'playwright-core';
import path from 'path';

async function test() {
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[Console Error] ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    errors.push(`[Page Error] ${err.message}`);
  });

  console.log('Loading http://localhost:3008/ ...');
  await page.goto('http://localhost:3008/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Remove overlay
  await page.evaluate(() => {
    localStorage.setItem('supergence_powered_on', 'true');
    const overlay = document.getElementById('powerOnOverlay');
    if (overlay) overlay.remove();
  });

  // Type in workspace input
  const input = page.locator('#workspaceInp');
  if (await input.isVisible()) {
    console.log('Typing into #workspaceInp...');
    await input.fill('Make me a video of a man eating noodles.');
    await page.waitForTimeout(300);
    const sendBtn = page.locator('#workspaceSendBtn');
    await sendBtn.click();
    console.log('Clicked send button, waiting for turn response...');
  } else {
    console.log('#workspaceInp not visible, checking #inp...');
    const mainInp = page.locator('#inp');
    await mainInp.fill('Make me a video of a man eating noodles.');
    await mainInp.press('Enter');
  }

  // Wait for artifact card or iframe to appear
  await page.waitForTimeout(6000);

  // Take screenshot of what the user is looking at
  const outPath =
    'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\b4cb1339-bae8-4948-a6e1-0557a4708b93\\user_perspective_screen.png';
  await page.screenshot({ path: outPath, fullPage: false });
  console.log('Saved screenshot of user screen to:', outPath);

  // Check all iframes on page
  const iframes = await page.evaluate(() => {
    const list = Array.from(document.querySelectorAll('iframe'));
    return list.map((f) => ({
      id: f.id,
      src: f.src,
      width: f.offsetWidth,
      height: f.offsetHeight,
      parentHeight: f.parentElement ? f.parentElement.offsetHeight : null,
    }));
  });
  console.log('Iframes on page:', iframes);
  console.log('Page errors:', errors);

  await browser.close();
}

test().catch(console.error);
