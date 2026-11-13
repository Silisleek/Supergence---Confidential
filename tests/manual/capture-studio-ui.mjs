import { chromium } from 'playwright-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../');
const profileDir = path.join(ROOT_DIR, 'data/browser-profiles/agent-live-verify');
const screenshotPath = path.join(ROOT_DIR, 'studio-ui-polished.png');

async function capture() {
  const context = await chromium.launchPersistentContext(profileDir, {
    channel: 'chrome',
    headless: true,
    viewport: { width: 1440, height: 900 },
    args: ['--no-first-run'],
  });

  await context.addInitScript(() => {
    localStorage.setItem('sis_setup_completed', 'true');
    localStorage.setItem('sis_model_setup_seen', 'true');
  });

  const page = context.pages()[0] || (await context.newPage());
  page.setDefaultTimeout(30000);

  await page.goto('http://127.0.0.1:3009/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500); // Wait for initial spring transitions and 3D canvas

  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('Polished UI Screenshot saved to:', screenshotPath);

  // Now focus / click composer resting bar to expand it
  await page.click('#sisComposerRestingBar');
  await page.waitForTimeout(600); // Wait for spring animation
  const expandedPath = path.join(ROOT_DIR, 'studio-composer-expanded.png');
  await page.screenshot({ path: expandedPath, fullPage: false });
  console.log('Expanded Composer Screenshot saved to:', expandedPath);
  await context.close();
}

capture().catch((err) => {
  console.error('Capture error:', err);
  process.exit(1);
});
