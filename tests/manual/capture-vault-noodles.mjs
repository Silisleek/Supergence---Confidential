import { chromium } from 'playwright-core';
import path from 'path';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3008/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Remove overlay & open vault
  await page.evaluate(() => {
    localStorage.setItem('supergence_powered_on', 'true');
    const overlay = document.getElementById('powerOnOverlay');
    if (overlay) overlay.remove();
    if (typeof window.openArtifactsVaultModal === 'function') {
      window.openArtifactsVaultModal();
    }
  });

  // Wait for artifact card
  const firstCard = page.locator('.vault-artifact-card').first();
  await firstCard.waitFor({ state: 'visible', timeout: 8000 });
  console.log('Artifacts cards visible!');

  // Click card to preview in right-hand pane
  await firstCard.click();
  console.log('Clicked first card to preview...');

  // Wait for the preview iframe to load and render the canvas simulation
  const iframeEl = page.frameLocator('#vaultPreviewIframe');
  await iframeEl.locator('#stage').waitFor({ state: 'visible', timeout: 8000 });
  console.log('Preview iframe canvas stage is visible and rendering!');
  await page.waitForTimeout(3000);

  const out =
    'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\b4cb1339-bae8-4948-a6e1-0557a4708b93\\supergence_vault_live_man_eating_noodles_chrome.png';
  await page.screenshot({ path: out, fullPage: false });
  console.log('Saved screenshot to:', out);
  await browser.close();
}

main().catch(console.error);
