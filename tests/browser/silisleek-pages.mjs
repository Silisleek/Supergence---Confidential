import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const port = process.env.PORT || '3009';
const baseURL = process.env.SIS_BASE_URL || `http://localhost:${port}`;
console.log(`[Test] Launching Chrome against ${baseURL}...`);

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

const pageErrors = [];
page.on('pageerror', (err) => pageErrors.push(err.message));

try {
  // 1. Verify /silisleek (Supergence on silisleek.com)
  console.log('[Test] Navigating to /silisleek...');
  const resSilisleek = await page.goto(`${baseURL}/silisleek`, { waitUntil: 'domcontentloaded' });
  assert.equal(resSilisleek.status(), 200, 'silisleek page must return 200');

  const title = await page.title();
  assert.match(title, /Supergence/i, 'Title should mention Supergence');

  // Verify Hero headline
  const heroH1 = await page.locator('.sl-hero-title').innerText();
  assert.match(heroH1, /Agents limited/i);
  assert.match(heroH1, /to your imagination/i);

  // Verify all 5 master design panels are rendered
  const panels = page.locator('.sl-panel-stage');
  assert.equal(await panels.count(), 5, 'Should render all 5 master design panels');

  // Verify Cockpit tabs exist and interactive switching works
  const cockpitNav = page.locator('#cockpitNav');
  await cockpitNav.waitFor({ timeout: 5000 });
  const tabs = page.locator('.sl-cockpit-tab');
  assert.equal(await tabs.count(), 4, 'Should have 4 cockpit tabs');

  // Switch to Coder tab
  await page.locator('.sl-cockpit-tab[data-target="tabCoder"]').click();
  const coderContent = page.locator('#tabCoder');
  assert.equal(await coderContent.isVisible(), true, 'Coder tab content must be visible');
  assert.match(await coderContent.innerText(), /4-Step Verification Loop/i);

  // Switch to Tools tab
  await page.locator('.sl-cockpit-tab[data-target="tabTools"]').click();
  const toolsContent = page.locator('#tabTools');
  assert.equal(await toolsContent.isVisible(), true, 'Tools tab content must be visible');
  assert.match(await toolsContent.innerText(), /193 Active Capabilities/i);

  // Switch to Security tab
  await page.locator('.sl-cockpit-tab[data-target="tabSecurity"]').click();
  const secContent = page.locator('#tabSecurity');
  assert.equal(await secContent.isVisible(), true, 'Security tab content must be visible');
  assert.match(await secContent.innerText(), /Strict 127.0.0.1 Binding Only/i);

  // Verify Download CTA links to installer
  const installerLink = page.locator('a[href="/installer.html"]').first();
  assert.equal(
    await installerLink.isVisible(),
    true,
    'Installer link must be present in hero or nav',
  );

  console.log('✓ /silisleek verified in real Chrome.');

  // 2. Verify /installer (Dedicated Installer Hub)
  console.log('[Test] Navigating to /installer...');
  const resInstaller = await page.goto(`${baseURL}/installer`, { waitUntil: 'domcontentloaded' });
  assert.equal(resInstaller.status(), 200, 'installer page must return 200');

  const installerH1 = await page.locator('.sl-hero-title').innerText();
  assert.match(installerH1, /Deploy Supergence/i);
  assert.match(installerH1, /Native\. Zero-Telemetry/i);

  // Verify download cards
  const distCards = page.locator('.sl-dist-card');
  assert.equal(await distCards.count(), 3, 'Should render 3 distribution cards');

  // Verify genuine SHA-256 hashes
  const setupHash = await page.locator('#hashSetup').innerText();
  assert.equal(setupHash, 'BB1CDB8BFB6A2FE519E3C7AFF91F85826C73AD8EDB297AAF8415ACF0152571DE');

  const portableHash = await page.locator('#hashPortable').innerText();
  assert.equal(portableHash, '02730AD008BDF2ECBBD0B35912853E0E354FD6260404E168B69324EDFB9CE77E');

  // Verify download links
  const setupHref = await page
    .locator('a[href*="Supergence%20Setup%201.0.0.exe"]')
    .first()
    .getAttribute('href');
  assert.ok(setupHref.includes('Supergence%20Setup%201.0.0.exe'));

  const portableHref = await page
    .locator('a[href*="Supergence-Portable-1.0.0.exe"]')
    .first()
    .getAttribute('href');
  assert.ok(portableHref.includes('Supergence-Portable-1.0.0.exe'));

  // Verify live diagnostic element populated
  const diagOS = await page.locator('#diagOS').innerText();
  assert.ok(diagOS.length > 0, 'OS diagnostic should be populated');

  // Test copy button functionality
  const copyBtn = page.locator('.sl-copy-btn').first();
  await copyBtn.click();
  const toast = page.locator('#slToast');
  await toast.waitFor({ timeout: 3000 });
  assert.equal(await toast.isVisible(), true, 'Toast notification must show on copy');
  assert.match(await toast.innerText(), /Copied to clipboard/i);

  // Test CLI tab switching
  const bashTab = page.locator('#cliNav button[data-cli="cliBash"]');
  await bashTab.click();
  const bashPane = page.locator('#cliBash');
  assert.equal(await bashPane.isVisible(), true, 'Bash pane should be visible');

  console.log('✓ /installer verified in real Chrome.');

  assert.equal(pageErrors.length, 0, `Uncaught page errors: ${pageErrors.join(', ')}`);
  console.log('All Silisleek & Installer browser checks passed cleanly!');
} finally {
  await browser.close();
}
