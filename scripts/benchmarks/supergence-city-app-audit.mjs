import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
try {
  await page.goto('http://localhost:3009/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => typeof window.openCreationStudio === 'function');
  await page.evaluate(() => window.openCreationStudio());
  const project = page
    .locator('#studioProjects button')
    .filter({ hasText: 'meridian-harbor-20261024' });
  await project.click();
  const preview = page.locator('#studioSavedAssets a').filter({ hasText: 'Open project preview' });
  await preview.waitFor();
  const url = await preview.getAttribute('href');
  await page.screenshot({
    path: 'workspace/supergence/city-evaluation-20261024/app-project-preview.png',
  });
  const result = {
    url,
    status: (await page.request.get('http://localhost:3009' + url)).status(),
    observed:
      'Actual app creation studio selected existing Supergence city and exposed its existing preview.',
  };
  await fs.writeFile(
    'workspace/supergence/city-evaluation-20261024/app-project-preview.json',
    JSON.stringify(result, null, 2),
  );
  console.log(result);
} finally {
  await browser.close();
}
