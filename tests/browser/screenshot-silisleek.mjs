import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const outDir = path.join(root, 'test-results', 'silisleek-screenshots');
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

console.log('[Screenshot] Loading http://localhost:3009/silisleek ...');
await page.goto('http://localhost:3009/silisleek', { waitUntil: 'networkidle' });
// Wait for all images to decode completely
await page.evaluate(async () => {
  const imgs = Array.from(document.querySelectorAll('img'));
  await Promise.all(imgs.map((img) => img.decode().catch(() => {})));
});
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(outDir, 'silisleek-hero.png'), fullPage: false });
await page.screenshot({ path: path.join(outDir, 'silisleek-full.png'), fullPage: true });

console.log('[Screenshot] Loading http://localhost:3009/installer ...');
await page.goto('http://localhost:3009/installer', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(outDir, 'installer-hero.png'), fullPage: false });
await page.screenshot({ path: path.join(outDir, 'installer-full.png'), fullPage: true });

await browser.close();
console.log('✓ Screenshots saved to test-results/silisleek-screenshots/');
