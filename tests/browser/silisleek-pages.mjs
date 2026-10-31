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

  // Verify Hero centerpiece orb exists and is visible
  const centerSphere = page.locator('.sl-center-sphere');
  await centerSphere.waitFor({ timeout: 5000 });
  assert.equal(await centerSphere.isVisible(), true, 'Centerpiece orb must be visible');

  // Verify Hero editorial quote
  const heroQuote = page.locator('.sl-hero-editorial-quote');
  assert.equal(await heroQuote.isVisible(), true, 'Hero editorial quote must be visible');
  assert.match(await heroQuote.innerText(), /We have reached a new era/i);

  // Verify Panel 2 Cognition cutouts
  assert.equal(await page.locator('.sl-galaxy-img').isVisible(), true, 'Galaxy must be visible');
  assert.equal(await page.locator('.sl-starburst-img').isVisible(), true, 'Starburst must be visible');

  // Verify Panel 3 Memories cutouts
  assert.equal(await page.locator('.sl-golden-record-img').isVisible(), true, 'Golden Record must be visible');
  assert.equal(await page.locator('.sl-chess-knight-img').first().isVisible(), true, 'Chess Knight must be visible');

  // Verify Panel 4 Security cutouts
  assert.equal(await page.locator('.sl-glass-neuron-img').first().isVisible(), true, 'Glass Neuron must be visible');
  assert.equal(await page.locator('.sl-glass-chains-img').isVisible(), true, 'Glass Chains must be visible');

  // Verify Panel 5 Superintelligence cutouts
  assert.equal(await page.locator('.sl-emblem-butterfly').isVisible(), true, 'Butterfly must be visible');
  assert.equal(await page.locator('.sl-emblem-atom').isVisible(), true, 'Atom ring must be visible');
  assert.equal(await page.locator('.sl-science-badge-img').isVisible(), true, 'Science badge must be visible');

  // Verify Verified Release Packages section on silisleek page
  const pageSetupHash = await page.locator('#hashSetup').innerText();
  assert.equal(pageSetupHash, 'BB1CDB8BFB6A2FE519E3C7AFF91F85826C73AD8EDB297AAF8415ACF0152571DE');

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
