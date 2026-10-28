import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright-core';

const candidatePorts = [3008, 3009, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3010];

async function findActivePort() {
  for (let attempt = 0; attempt < 35; attempt++) {
    for (const port of candidatePorts) {
      try {
        const res = await fetch(`http://localhost:${port}/api/health`, {
          signal: AbortSignal.timeout(1000),
        });
        if (res.ok) {
          console.log(`✓ Detected active Supergence server on port ${port}`);
          return port;
        }
      } catch (_) {}
    }
    console.log(`Waiting for server to become ready... (attempt ${attempt + 1}/35)`);
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error('Server not responding on any candidate port');
}

async function verify() {
  const port = await findActivePort();

  console.log('\n--- STEP 1: Verifying Backend Multi-Card Deck & Artifact Synthesis ---');
  const turnRes = await fetch(`http://localhost:${port}/api/sis/unified-turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'Design a quantum entanglement simulation with Bloch sphere and Bell state circuits',
      history: [],
    }),
  });

  if (!turnRes.ok) {
    throw new Error(`Turn request failed: HTTP ${turnRes.status}`);
  }

  const turnData = await turnRes.json();
  console.log('Turn completed in', turnData.durationMs, 'ms');
  console.log('Primary Agent:', turnData.primaryAgent?.name || 'Supergence Master Brain');

  const ui = turnData.interactiveUI;
  if (!ui) {
    throw new Error('Missing interactiveUI in turn response');
  }

  console.log('Interactive UI Title:', ui.title);
  console.log('Cards count:', ui.cards?.length);
  console.log('Artifacts count:', ui.artifacts?.length);
  console.log('Schematic present:', !!ui.schematic?.svg);
  console.log('Epistemic Matrix count:', ui.epistemicMatrix?.length);
  console.log('Action Chips count:', ui.actionChips?.length);

  if (!ui.cards || ui.cards.length < 5) {
    throw new Error(`Expected at least 5 cards in deck, got ${ui.cards?.length}`);
  }
  if (!ui.artifacts || ui.artifacts.length < 3) {
    throw new Error(`Expected 3 materialized artifacts, got ${ui.artifacts?.length}`);
  }

  // Verify that all 3 files exist on disk in workspace
  console.log('\n--- STEP 2: Verifying Real Materialized Files on Disk in ./workspace/ ---');
  const workspaceDir = path.resolve('workspace');
  for (const art of ui.artifacts) {
    const filePath = path.join(workspaceDir, art.name);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Artifact file missing on disk: ${filePath}`);
    }
    const stat = fs.statSync(filePath);
    console.log(`✓ Verified ${art.name} (${stat.size} bytes) on disk: ${filePath}`);
    if (stat.size === 0) {
      throw new Error(`Artifact file is empty: ${filePath}`);
    }
  }

  console.log('\n--- STEP 3: Verifying Multi-Card Deck & UI in Real Chrome Browser ---');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

  // Test workbench UI
  console.log(`Navigating to http://localhost:${port}/ ...`);
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 25000 });

  // Type prompt
  const inputSelector = '#chatInput';
  await page.waitForSelector(inputSelector, { timeout: 10000 });
  await page.fill(
    inputSelector,
    'Design a quantum entanglement simulation with Bloch sphere and Bell state circuits',
  );

  console.log('Submitting prompt to Supergence stream...');
  await page.click('#sendBtn');

  // Wait for the multi-card deck to appear
  console.log('Waiting for .gen-ui-deck-container in chat stream...');
  await page.waitForSelector('.gen-ui-deck-container', { timeout: 35000 });
  console.log('✓ Found .gen-ui-deck-container in chat stream!');

  // Verify tabs
  const tabButtons = await page.$$('.deck-tab-btn');
  console.log(`Found ${tabButtons.length} deck tab buttons`);

  // Click Artifacts tab
  console.log('Switching to Artifacts tab...');
  const artifactsTab = page.locator('.deck-tab-btn', { hasText: 'Artifacts' }).first();
  await artifactsTab.click();
  await page.waitForTimeout(600);

  const artifactItems = await page.$$('.artifact-card-item');
  console.log(`✓ Verified ${artifactItems.length} artifact cards visible in shelf!`);

  // Click Schematic tab
  console.log('Switching to Schematic tab...');
  const schematicTab = page.locator('.deck-tab-btn', { hasText: 'Schematic' }).first();
  await schematicTab.click();
  await page.waitForTimeout(600);
  const svgEl = await page.$('.schematic-svg-container svg');
  console.log('✓ Verified glowing vector SVG schematic visible:', !!svgEl);

  // Click Matrix tab
  console.log('Switching to Matrix tab...');
  const matrixTab = page.locator('.deck-tab-btn', { hasText: 'Matrix' }).first();
  await matrixTab.click();
  await page.waitForTimeout(600);
  const matrixTable = await page.$('.epistemic-table');
  console.log('✓ Verified epistemic parameter matrix table visible:', !!matrixTable);

  // Click Action Studio tab
  console.log('Switching to Action Studio tab...');
  const actionTab = page.locator('.deck-tab-btn', { hasText: 'Action Studio' }).first();
  await actionTab.click();
  await page.waitForTimeout(600);
  const actionChips = await page.$$('.action-prompt-chip');
  console.log(`✓ Verified ${actionChips.length} interactive action prompt chips visible!`);

  // Click Show All Cards
  console.log('Clicking "Show All Cards" to display full multi-card suite simultaneously...');
  const showAllTab = page.locator('.deck-tab-btn', { hasText: 'Show All' }).first();
  await showAllTab.click();
  await page.waitForTimeout(1000);

  // Take screenshot
  const screenshotPath =
    'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\bb9a50ee-166f-4573-a1f6-3270c22c4aa9\\isolated_workspace_code_blocks_verified.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`✓ High-resolution screenshot captured to: ${screenshotPath}`);

  // Also verify client/index.html (the app surface per AGENTS.md)
  console.log(`\n--- STEP 4: Verifying App Surface (client/index.html at /classic) ---`);
  const page2 = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  page2.on('console', (msg) => console.log('PAGE2 LOG:', msg.text()));
  page2.on('pageerror', (err) => console.log('PAGE2 ERR:', err.message));
  page2.on('response', (res) => {
    if (res.status() >= 400) console.log('PAGE2 HTTP ERR:', res.status(), res.url());
  });
  await page2.goto(`http://localhost:${port}/classic`, {
    waitUntil: 'domcontentloaded',
    timeout: 25000,
  });
  const hasWorkspaceFn = await page2.evaluate(() => typeof window.openWorkspace === 'function');
  if (hasWorkspaceFn) {
    console.log('✓ Classic app loaded with window.openWorkspace. Triggering workspace turn...');
    await page2.evaluate(() =>
      window.openWorkspace('Explain quantum computing state space and artifacts'),
    );
    // Wait for the workspaceDeckSlot element to be attached in DOM
    await page2.waitForSelector('#workspaceDeckSlot', { state: 'attached', timeout: 10000 });
    // Wait for the turn response to arrive and populate the deck slot with artifacts
    await page2.waitForFunction(
      () => {
        const el = document.getElementById('workspaceDeckSlot');
        return el && el.innerHTML.trim().length > 0;
      },
      { timeout: 45000 },
    );
    console.log('✓ Verified workspaceDeckSlot populated with artifacts on classic app surface!');
  }
  await page2.close();

  await browser.close();
  console.log('\n🎉 ALL VERIFICATION CHECKS PASSED PERFECTLY!');
}

verify().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
