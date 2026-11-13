import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseURL = 'http://127.0.0.1:3009/';

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const executablePath = chromePaths.find((p) => fs.existsSync(p));
console.log('Using executablePath:', executablePath || 'channel chrome');

const testProfileDir = path.join(os.tmpdir(), 'sis-browser-verify-' + Date.now());
fs.mkdirSync(testProfileDir, { recursive: true });

const context = await chromium.launchPersistentContext(testProfileDir, {
  executablePath,
  channel: executablePath ? undefined : 'chrome',
  headless: true,
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-first-run',
  ],
});
const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

const token = '9b703f8045495b7d05864d15fd4e0f39cec2e2df4af091786f7a97a818494050';
const sessionURL = `http://127.0.0.1:3009/__session?token=${token}`;

try {
  console.log('Navigating to session URL:', sessionURL);
  await page.goto(sessionURL, { waitUntil: 'commit', timeout: 30000 });
  await page.waitForSelector('#supergenceWorkspace', { timeout: 15000 });
  await page.waitForTimeout(1500);
  console.log('Supergence workspace loaded successfully!');

  // 1. Verify legacy elements are hidden
  const railVisible = await page.locator('.workspace-rail').isVisible();
  const topBarVisible = await page.locator('.workspace-top-bar').isVisible();
  const sideBrowserVisible = await page.locator('.workspace-side-browser-pane').isVisible();
  const legacyComposerVisible = await page.locator('.workspace-composer-wrap').isVisible();

  console.log('Legacy elements visibility check:');
  console.log('- workspace-rail visible:', railVisible);
  console.log('- workspace-top-bar visible:', topBarVisible);
  console.log('- workspace-side-browser-pane visible:', sideBrowserVisible);
  console.log('- workspace-composer-wrap visible:', legacyComposerVisible);

  assert.equal(railVisible, false, 'workspace-rail should be hidden');
  assert.equal(topBarVisible, false, 'workspace-top-bar should be hidden');
  assert.equal(sideBrowserVisible, false, 'workspace-side-browser-pane should be hidden');
  assert.equal(legacyComposerVisible, false, 'legacy composer should be hidden');

  // 2. Verify liquid-glass components exist and are visible
  const topIsland = await page.locator('#sgTopDynamicIsland').isVisible();
  const agentDock = await page.locator('#sgFloatingAgentDock').isVisible();
  console.log('Liquid glass elements:');
  console.log('- Top Dynamic Island visible:', topIsland);
  console.log('- Right Floating Agent Dock visible:', agentDock);
  assert.equal(topIsland, true, 'Top Dynamic Island must be visible');
  assert.equal(agentDock, true, 'Right Floating Agent Dock must be visible');

  const artifactDir = path.resolve(__dirname, '../../../../.gemini/antigravity/brain/cc78a903-c95c-43ff-b918-06eb784f9796');

  // 3. Mount Landing Hero and capture screenshot
  console.log('Mounting Landing Hero...');
  await page.evaluate(() => {
    const stream = document.getElementById('chatTurnsStream');
    window.SupergenceLiquidGlass.mountLandingHero(stream);
  });
  await page.waitForTimeout(500);

  const landingHeroVisible = await page.locator('#sgLiquidGlassStage').isVisible();
  const cinematicTitle = await page.locator('.sg-cinematic-title').textContent();
  console.log('- Landing Hero visible:', landingHeroVisible);
  console.log('- Cinematic Title text:', cinematicTitle);
  assert.equal(landingHeroVisible, true);
  assert.equal(cinematicTitle.trim(), 'Supergence');

  const landingPath = path.join(artifactDir, 'cockpit-landing.png');
  await page.screenshot({ path: landingPath });
  console.log('Captured landing screenshot to:', landingPath);

  // 4. Mount Active Conversation Card and capture screenshot
  console.log('Mounting Active Conversation Card...');
  await page.evaluate(() => {
    const stream = document.getElementById('chatTurnsStream');
    window.SupergenceLiquidGlass.renderConversation([
      { role: 'user', content: 'Hey Supergence, What are you doing?' },
      { role: 'assistant', content: 'I am doing well and I am ready to help you. Ready to dive in?' }
    ], stream);
  });
  await page.waitForTimeout(500);

  const activeCardVisible = await page.locator('#sgActiveConversationCard').isVisible();
  const orbsRowVisible = await page.locator('.sg-active-orbs-row').isVisible();
  const waveformVisible = await page.locator('.sg-waveform-bars').isVisible();
  const dockedComposerVisible = await page.locator('.sg-card-composer-wrap').isVisible();

  console.log('- Active Conversation Card visible:', activeCardVisible);
  console.log('- Active Orbs Row visible:', orbsRowVisible);
  console.log('- Waveform bars visible:', waveformVisible);
  console.log('- Docked card composer visible:', dockedComposerVisible);

  assert.equal(activeCardVisible, true);
  assert.equal(orbsRowVisible, true);
  assert.equal(waveformVisible, true);
  assert.equal(dockedComposerVisible, true);

  const activeCardPath = path.join(artifactDir, 'cockpit-active-card.png');
  await page.screenshot({ path: activeCardPath });
  console.log('Captured active card screenshot to:', activeCardPath);

  // 5. Test Conversations Drawer slide-out
  console.log('Testing Conversations Drawer toggle...');
  await page.click('#sgIslandChatBtn');
  await page.waitForTimeout(400);
  const drawerOpen = await page.locator('.workspace-conversations-sidebar.drawer-open').isVisible();
  console.log('- Drawer open state:', drawerOpen);
  assert.equal(drawerOpen, true);

  // Close via backdrop click
  await page.click('#workspaceDrawerBackdrop');
  await page.waitForTimeout(400);
  const drawerClosed = await page.locator('.workspace-conversations-sidebar.drawer-open').isVisible();
  console.log('- Drawer closed state:', !drawerClosed);
  assert.equal(drawerClosed, false);

  console.log('\n========================================');
  console.log('ALL REAL BROWSER VERIFICATIONS PASSED!');
  console.log('========================================\n');
} catch (err) {
  console.error('Verification failed:', err);
  process.exitCode = 1;
} finally {
  await context.close();
  try { fs.rmSync(testProfileDir, { recursive: true, force: true }); } catch (_) {}
}
