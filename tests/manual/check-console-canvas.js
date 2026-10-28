import { chromium } from 'playwright-core';

async function test() {
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`[Console Error] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    errors.push(`[Page Error] ${err.message}\n${err.stack}`);
  });

  console.log('Navigating to http://localhost:3008/workspace/man_eating_noodles.html...');
  await page.goto('http://localhost:3008/workspace/man_eating_noodles.html');
  await page.waitForTimeout(1500);

  // Check canvas dimensions and getContext
  const canvasInfo = await page.evaluate(() => {
    const canvas = document.getElementById('stage');
    if (!canvas) return { found: false };
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    // Check pixel at center
    const pixel = ctx.getImageData(
      Math.floor(canvas.width / 2),
      Math.floor(canvas.height / 2),
      1,
      1,
    ).data;
    return {
      found: true,
      width: canvas.width,
      height: canvas.height,
      rectWidth: rect.width,
      rectHeight: rect.height,
      centerPixel: Array.from(pixel),
    };
  });

  console.log('Canvas info at standalone full page:', canvasInfo);
  console.log('Errors at standalone full page:', errors);

  await browser.close();
}

test().catch(console.error);
