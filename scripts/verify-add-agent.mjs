import { chromium } from 'playwright-core';
import path from 'node:path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const brainDir = 'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\cc78a903-c95c-43ff-b918-06eb784f9796';

async function main() {
  console.log('Testing Add Agent flow with Playwright...');
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });

  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3009/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Click + button to open modal
  await page.click('#sgDockAddBtn');
  await page.waitForTimeout(500);

  // Click "+ Add" on Atlas preset
  const atlasCard = page.locator('.sg-preset-agent-card[data-preset="atlas"]');
  await atlasCard.click();
  await page.waitForTimeout(600);

  // Take screenshot
  const outFile = path.join(brainDir, 'agent-added-render.png');
  await page.screenshot({ path: outFile });
  console.log('✓ Successfully deployed Atlas and captured agent-added-render.png!');

  // Check placeholder
  const placeholder = await page.getAttribute('#sgLandingInput', 'placeholder');
  console.log('Current placeholder:', placeholder);

  await browser.close();
}

main().catch(console.error);
