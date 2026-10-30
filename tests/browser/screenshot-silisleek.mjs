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
await page.goto('http://localhost:3009/silisleek', { waitUntil: 'domcontentloaded' });
// Wait for animations and canvases to render a few frames
await page.waitForTimeout(1000);

// Capture individual showcase sections
const sec1 = page.locator('#imagination');
if (await sec1.count()) {
  await sec1.screenshot({ path: path.join(outDir, 'silisleek-section-1-imagination.png') });
}

const sec2 = page.locator('#cognition');
if (await sec2.count()) {
  await sec2.screenshot({ path: path.join(outDir, 'silisleek-section-2-cognition.png') });
}

const sec3 = page.locator('#memories');
if (await sec3.count()) {
  await sec3.screenshot({ path: path.join(outDir, 'silisleek-section-3-memories.png') });
}

const sec4 = page.locator('#security');
if (await sec4.count()) {
  await sec4.screenshot({ path: path.join(outDir, 'silisleek-section-4-security.png') });
}

const sec5 = page.locator('#superintelligence');
if (await sec5.count()) {
  await sec5.screenshot({ path: path.join(outDir, 'silisleek-section-5-superintelligence.png') });
}

await page.screenshot({ path: path.join(outDir, 'silisleek-full.png'), fullPage: true });

console.log('[Screenshot] Loading http://localhost:3009/installer ...');
await page.goto('http://localhost:3009/installer', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(outDir, 'installer-hero.png'), fullPage: false });
await page.screenshot({ path: path.join(outDir, 'installer-full.png'), fullPage: true });

await browser.close();
console.log('✓ Screenshots saved to test-results/silisleek-screenshots/');
