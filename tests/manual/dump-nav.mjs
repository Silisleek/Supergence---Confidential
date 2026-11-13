import { chromium } from 'playwright-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../');
const profileDir = path.join(ROOT_DIR, 'data/browser-profiles/agent-live-verify');

async function main() {
  const context = await chromium.launchPersistentContext(profileDir, {
    channel: 'chrome',
    headless: true,
  });
  const page = context.pages()[0] || (await context.newPage());
  await page.goto('http://127.0.0.1:3009/');
  await page.waitForTimeout(1000);

  const navButtons = await page.evaluate(() => {
    const nav = document.querySelector('.sis-top-nav-items');
    if (!nav) return 'Nav not found';
    return Array.from(nav.children).map((c) => ({
      id: c.id,
      className: c.className,
      outerHTML: c.outerHTML,
    }));
  });

  console.log(JSON.stringify(navButtons, null, 2));
  await context.close();
}

main().catch(console.error);
