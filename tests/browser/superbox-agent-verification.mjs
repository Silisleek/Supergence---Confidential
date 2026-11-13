import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = fileURLToPath(new URL('../../', import.meta.url));
const baseURL = process.env.SIS_BASE_URL || 'http://127.0.0.1:3009';
const outputDir = path.join(root, 'test-results', 'superbox-verification');
await fs.mkdir(outputDir, { recursive: true });

console.log(`Starting Real Browser Verification at ${baseURL}...`);

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
});

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  // Bypass setup screens if any
  await context.addInitScript(() => {
    localStorage.setItem('sis_setup_completed', 'true');
    localStorage.setItem('sis_model_setup_seen', 'true');
    window.SpeechRecognition = class extends EventTarget {
      start() {}
      stop() {}
    };
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  // 1. Navigate to the main app URL
  console.log('1. Loading main application in Chrome...');
  const res = await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  assert.equal(res.status(), 200, 'Main app must return HTTP 200');

  // Wait for Superbox dock script and UI to initialize
  await page.waitForFunction(() => typeof window.Superbox === 'object' && !!window.Superbox.open, {
    timeout: 15000,
  });
  console.log('✓ Main app loaded and window.Superbox is online.');

  // 2. Test Superbox open action & UI Entrance Animation
  console.log('2. Opening Center Stage Superbox Dock...');
  await page.evaluate(() => window.Superbox.open());

  const superboxPane = page.locator('#superboxUnifiedPane');
  assert.equal(await page.locator('#workspaceSideBrowserPane').count(), 1);
  await superboxPane.waitFor({ state: 'visible', timeout: 5000 });
  const isSuperboxVisible = await superboxPane.isVisible();
  assert.ok(isSuperboxVisible, 'Superbox Center Stage must be visible');

  const paneClass = await superboxPane.getAttribute('class');
  assert.ok(
    paneClass.includes('sg-window-enter'),
    'Superbox must have sg-window-enter animation class',
  );
  console.log('✓ Superbox dock opened with sg-window-enter animation.');

  await page.screenshot({ path: path.join(outputDir, '01-superbox-opened.png') });

  const tabs = ['superbox', 'preview', 'files', 'tools'];
  for (const tab of tabs) {
    const tabBtn = page.locator(`.superbox-nav-tabs button[data-tab="${tab}"]`);
    assert.equal(await tabBtn.count(), 1, `Tab button [data-tab="${tab}"] must exist`);
    await tabBtn.click();

    // Verify active tab panel
    const tabPanel = page.locator(`#${tab}TabContent`);
    await tabPanel.waitFor({ state: 'visible', timeout: 3000 });
    assert.ok(await tabPanel.isVisible(), `Tab panel #${tab} must be active and visible`);

    console.log(`  ✓ Tab "${tab}" activated and rendered.`);
    await page.screenshot({ path: path.join(outputDir, `02-tab-${tab}.png`) });
  }
  await superboxPane.getByRole('button', { name: /Browser/ }).click();
  await page.locator('#workspaceBrowserPanel').waitFor();
  await superboxPane.waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Close workspace browser' }).click();
  await page.evaluate(() => window.Superbox.open());

  console.log('Testing authorized host execution from Superbox.');
  // Switch back to superbox tab and wait for panel visibility
  const superboxTabBtn = page.locator('.superbox-nav-tabs button[data-tab="superbox"]');
  await superboxTabBtn.click();
  const superboxPanel = page.locator('#superboxTabContent');
  await superboxPanel.waitFor({ state: 'visible', timeout: 5000 });

  const terminalInput = page.locator('#superboxTerminalInput');
  await terminalInput.waitFor({ state: 'visible', timeout: 5000 });
  const access = await (await page.request.get(new URL('/api/access', baseURL).href)).json();
  assert.ok(access.settings);
  const patchAccess = async (settings) => {
    const response = await page.request.patch(new URL('/api/access', baseURL).href, {
      data: settings,
    });
    assert.equal(response.ok(), true);
  };
  await terminalInput.fill('node -e "console.log(848484)"');
  const runBtn = page.locator('#superboxTerminalForm button[type="submit"]');
  const terminalOutput = page.locator('#superboxTerminalOutput');
  try {
    await patchAccess({ mode: 'full-access', terminal: false });
    await runBtn.click();
    await terminalOutput.getByText('terminal access is disabled', { exact: false }).waitFor();
    await patchAccess({ terminal: true });
    await terminalInput.fill('node -e "console.log(848484)"');
    await runBtn.click();
    await terminalOutput.getByText('[Exit: 0]', { exact: false }).waitFor();
    assert.match(await terminalOutput.innerText(), /\n848484\r?\n/);

    const staged = await page.request.post(new URL('/api/superbox/file/write', baseURL).href, {
      data: {
        path: 'superbox-preview.html',
        content: '<!doctype html><title>Preview fixture</title><p>Staged preview loaded.</p>',
      },
    });
    assert.equal(staged.ok(), true);
    page.on('dialog', (dialog) => dialog.accept());
    const [applied] = await Promise.all([
      page.waitForResponse((response) => response.url().endsWith('/api/superbox/apply')),
      page.locator('#superboxActionApply').click(),
    ]);
    assert.equal((await applied.json()).copiedCount, 1);
    await page.locator('.superbox-nav-tabs button[data-tab="files"]').click();
    await page.getByRole('button', { name: 'superbox-preview.html', exact: true }).click();
    await page.getByRole('button', { name: 'Open HTML preview' }).click();
    const frame = page.locator('#superboxPreviewSlot iframe');
    assert.doesNotMatch(await frame.getAttribute('sandbox'), /allow-same-origin/);
    await frame.contentFrame().getByText('Staged preview loaded.').waitFor();
  } finally {
    await patchAccess(access.settings);
  }

  await page.screenshot({ path: path.join(outputDir, '03-superbox-terminal-success.png') });

  // 5. Test Tool Studio & Verification Card Rendering
  console.log('5. Testing Tool Studio verification interface in browser...');
  await page.locator('.superbox-nav-tabs button[data-tab="tools"]').click();

  // Inject a simulated pending tool into AdaToolForger proposals to verify client rendering
  const verificationResult = await page.evaluate(async () => {
    // Call client-side render or simulate a proposal event
    window.dispatchEvent(
      new CustomEvent('ada-tool-proposal', {
        detail: {
          id: 'test_crypto_validator',
          name: 'test_crypto_validator',
          displayName: 'Test Crypto Validator Tool',
          description: 'Validates SHA256 hashes autonomously',
          status: 'PENDING_APPROVAL',
          parameters: { hash: { type: 'string', description: 'Hex hash' } },
          capabilities: ['SAFE_COMPUTE'],
          privileged: false,
        },
      }),
    );
    return true;
  });
  assert.ok(verificationResult);

  // Check if verification card rendered with Approve & Recreate buttons
  const approveBtn = page.locator('button:has-text("Approve & Unlock")');
  await approveBtn.waitFor({ state: 'visible', timeout: 5000 });
  assert.ok(await approveBtn.isVisible(), 'Verification Card Approve button must render');

  const recreateBtn = page.locator('button:has-text("Recreate / Modify")');
  assert.ok(await recreateBtn.isVisible(), 'Verification Card Recreate/Modify button must render');

  console.log(
    '✓ Tool Studio rendered verification card with [Approve & Unlock] and [Recreate / Modify].',
  );
  await page.screenshot({ path: path.join(outputDir, '04-tool-studio-verification.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.superbox-nav-tabs button[data-tab="superbox"]').click();
  const dimensions = await superboxPane.evaluate((pane) => ({
    right: pane.getBoundingClientRect().right,
    viewport: innerWidth,
    formWidth: pane.querySelector('#superboxTerminalForm').clientWidth,
    formContentWidth: pane.querySelector('#superboxTerminalForm').scrollWidth,
  }));
  assert.ok(dimensions.right <= dimensions.viewport);
  assert.equal(dimensions.formWidth, dimensions.formContentWidth);

  assert.deepEqual(pageErrors, []);
  console.log('Superbox browser checks passed.');
} finally {
  await browser.close();
}
