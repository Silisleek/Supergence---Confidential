import { chromium } from 'playwright-core';
import path from 'node:path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const brainDir = 'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\cc78a903-c95c-43ff-b918-06eb784f9796';

async function main() {
  console.log('Launching Playwright with Chrome executable...');
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });

  const page = await context.newPage();

  console.log('1. Navigating to landing page...');
  await page.goto('http://127.0.0.1:3009/', { waitUntil: 'load' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = resolve;
      img.src = '/images/cosmic-hyperspace.png';
    });
    const orbImgs = Array.from(document.querySelectorAll('.sg-dock-orb-item img'));
    await Promise.all(
      orbImgs.map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete) return resolve();
            img.onload = resolve;
            img.onerror = resolve;
          }),
      ),
    );
  });
  await page.waitForTimeout(600);

  const landingOut = path.join(brainDir, 'chat-landing-render.png');
  await page.screenshot({ path: landingOut });
  console.log('✓ Captured chat-landing-render.png');

  console.log('2. Clicking Supermull in dock...');
  const supermullOrb = page.locator('.sg-dock-orb-item[data-agent="supermull"]');
  if (await supermullOrb.count() > 0) {
    await supermullOrb.click();
    await page.waitForTimeout(800);
    const mullOut = path.join(brainDir, 'agent-selected-render.png');
    await page.screenshot({ path: mullOut });
    console.log('✓ Captured agent-selected-render.png');
  }

  console.log('3. Clicking + button to open Add Agent Modal...');
  const addBtn = page.locator('#sgDockAddBtn');
  if (await addBtn.count() > 0) {
    await addBtn.click();
    await page.waitForTimeout(600);
    const modalOut = path.join(brainDir, 'add-agent-modal-render.png');
    await page.screenshot({ path: modalOut });
    console.log('✓ Captured add-agent-modal-render.png');

    // Close modal before moving to sample
    await page.click('#sgModalCloseBtn');
    await page.waitForTimeout(300);
  }

  console.log('4. Navigating to sample conversation card...');
  await page.goto('http://127.0.0.1:3009/?turn=sample', { waitUntil: 'load' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = resolve;
      img.src = '/images/cosmic-hyperspace.png';
    });
  });
  await page.waitForTimeout(600);
  const cardOut = path.join(brainDir, 'chat-active-card-render.png');
  await page.screenshot({ path: cardOut });
  console.log('✓ Captured chat-active-card-render.png');

  await browser.close();
  console.log('Done capturing all views with Playwright!');
}

main().catch(console.error);
