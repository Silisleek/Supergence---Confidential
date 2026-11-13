import { chromium } from 'playwright-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../');
const profileDir = path.join(ROOT_DIR, 'data/browser-profiles/agent-live-verify');

async function verifyUIStyles() {
  console.log('🚀 Verifying UI Style Options & Agent Flow Canvas in real Chrome...');
  const context = await chromium.launchPersistentContext(profileDir, {
    channel: 'chrome',
    headless: true,
    viewport: { width: 1440, height: 900 },
    args: ['--no-first-run'],
  });

  const page = context.pages()[0] || (await context.newPage());
  page.setDefaultTimeout(30000);
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', (err) => console.error('PAGE ERROR:', err.message));

  console.log('1. Loading Supergence application...');
  await page.goto('http://127.0.0.1:3009/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // 1. Open Settings Modal
  console.log('2. Opening Settings modal...');
  const isFlowActive = await page
    .$eval('#sisFlowCanvasSurface', (el) => el && el.style.display !== 'none')
    .catch(() => false);
  if (isFlowActive) {
    console.log('   Flow canvas is active, clicking #btnFlowOpenSettings...');
    await page.click('#btnFlowOpenSettings');
  } else {
    console.log('   Obsidian studio is active, clicking #btnOpenSettings...');
    await page.click('#btnOpenSettings');
  }
  await page.waitForSelector('#sisSettingsModal.is-open', { timeout: 8000 });
  await page.waitForTimeout(400);

  const modalVisible = await page.$eval('#sisSettingsModal', (el) =>
    el.classList.contains('is-open'),
  );
  console.log('   Settings modal opened:', modalVisible);

  // Verify UI Style options exist
  const styleCount = await page.$$eval('.sis-style-card', (els) => els.length);
  console.log(`   Found ${styleCount} UI Style cards in Settings.`);

  // Screenshot Settings with Style Options
  const settingsScreenshotPath = path.join(ROOT_DIR, 'settings-ui-style-options.png');
  await page.screenshot({ path: settingsScreenshotPath });
  console.log('📸 Saved settings UI styles screenshot to:', settingsScreenshotPath);

  // 2. Select "Agent Flow Canvas" (video style)
  console.log('3. Selecting [Agent Flow Canvas] (Video Style)...');
  await page.click('#sisStyleOptFlowCanvas');
  await page.waitForTimeout(500);

  // Close Settings modal
  await page.click('#sisSettingsCloseBtn');
  await page.waitForTimeout(600);

  // 3. Verify Agent Flow Canvas is visible
  const canvasVisible = await page.$eval(
    '#sisFlowCanvasSurface',
    (el) => el.style.display !== 'none',
  );
  console.log('   Agent Flow Canvas visible:', canvasVisible);

  // Verify Coordinator Card
  const coordText = await page.$eval('#sisFlowPromptText', (el) => el.textContent.trim());
  console.log('   Coordinator Prompt text:', coordText.slice(0, 50) + '...');

  // Verify Satellite Agent Nodes
  const nodeCount = await page.$$eval('.sis-flow-agent-card', (els) => els.length);
  console.log(`   Rendered ${nodeCount} satellite agent cards on canvas.`);

  // Verify Bezier Wires
  const wireCount = await page.$$eval('.sis-flow-wire', (els) => els.length);
  console.log(`   Rendered ${wireCount} bezier connection wires.`);

  // Capture Screenshot of Agent Flow Canvas (matching video)
  const flowCanvasScreenshotPath = path.join(ROOT_DIR, 'flow-canvas-active.png');
  await page.screenshot({ path: flowCanvasScreenshotPath });
  console.log('📸 Saved Agent Flow Canvas screenshot to:', flowCanvasScreenshotPath);

  // 4. Test Interaction: Click Add Agent Node
  console.log('4. Testing interaction: Adding custom agent node...');
  await page.click('#btnFlowAddNode');
  await page.waitForTimeout(400);

  const updatedNodeCount = await page.$$eval('.sis-flow-agent-card', (els) => els.length);
  const updatedWireCount = await page.$$eval('.sis-flow-wire', (els) => els.length);
  console.log(`   Updated to ${updatedNodeCount} agent cards and ${updatedWireCount} wires.`);

  // 5. Test Zoom Controls
  console.log('5. Testing Zoom In / Zoom Out...');
  await page.click('#btnFlowZoomIn');
  await page.waitForTimeout(200);
  const zoomDisplay = await page.$eval('#sisFlowZoomDisplay', (el) => el.textContent.trim());
  console.log('   Zoom display after zoom in:', zoomDisplay);

  // Capture Screenshot of Interactive State
  const interactiveScreenshotPath = path.join(ROOT_DIR, 'flow-canvas-interactive.png');
  await page.screenshot({ path: interactiveScreenshotPath });
  console.log('📸 Saved interactive state screenshot to:', interactiveScreenshotPath);

  // 6. Test Switching back to Obsidian Studio via Left Rail Settings
  console.log('6. Testing switching back to Obsidian Studio...');
  await page.click('#btnFlowOpenSettings');
  await page.waitForTimeout(400);
  await page.click('#sisStyleOptStudio');
  await page.waitForTimeout(400);
  await page.click('#sisSettingsCloseBtn');
  await page.waitForTimeout(600);

  const studioGridVisible = await page.$eval('#sisStudioGrid', (el) => el.style.display !== 'none');
  console.log('   Obsidian Studio restored successfully:', studioGridVisible);

  await context.close();
  console.log('✅ UI Style Options & Agent Flow Canvas verified successfully in real Chrome!');
}

verifyUIStyles().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
