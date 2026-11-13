import { chromium } from 'playwright-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../');
const profileDir = path.join(ROOT_DIR, 'data/browser-profiles/agent-live-verify');

async function verifyComposer() {
  console.log('🚀 Verifying Redesigned Composer interaction in real Chrome...');
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

  await page.goto('http://127.0.0.1:3009/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // 1. Click resting bar to expand
  console.log('1. Expanding composer...');
  await page.click('#sisComposerRestingBar');
  await page.waitForTimeout(400);

  // 2. Click the "⚡ 3D World" chip
  console.log('2. Clicking action chip [⚡ 3D World]...');
  await page.click(
    'button[data-directive="Generate procedural 3D terrain with glowing shader wireframe"]',
  );
  await page.waitForTimeout(300);

  const inpVal = await page.$eval('#workspaceInp', (el) => el.value);
  console.log('   Input value after chip click:', inpVal);

  const charCount = await page.$eval('#sisCharCounter', (el) => el.textContent);
  console.log('   Char counter text:', charCount);

  // 3. Test Agent Switcher popover
  console.log('3. Opening agent dropdown menu...');
  await page.click('#sisComposerAgentSelectBtn');
  await page.waitForTimeout(300);

  const isMenuOpen = await page.$eval('#sisAgentDropdownWrap', (el) =>
    el.classList.contains('is-open'),
  );
  console.log('   Dropdown is-open:', isMenuOpen);

  // Select Superake
  console.log('   Selecting Superake...');
  await page.click('.sis-agent-opt[data-agent="superake"]');
  await page.waitForTimeout(300);

  const selectedAgent = await page.$eval('#sisComposerCurrentAgentName', (el) => el.textContent);
  console.log('   Active agent updated to:', selectedAgent);

  // 4. Click Send / Run button
  console.log('4. Clicking Run button...');
  await page.click('#workspaceSendBtn');

  // Wait for typing bubble and eventual assistant message
  console.log('   Waiting for response from Supergence backend...');
  await page.waitForSelector('.sis-msg-assistant', { timeout: 15000 });
  const responseCount = await page.$$eval('.sis-msg-assistant', (els) => els.length);
  console.log(`   Received ${responseCount} assistant response bubble(s)!`);

  const memoryPill = await page.$('.sis-memory-pill');
  if (memoryPill) {
    const pillText = await memoryPill.textContent();
    console.log('   AREM Memory pill rendered:', pillText.trim());
  }

  // Save screenshot of interaction
  const interactionPath = path.join(ROOT_DIR, 'studio-composer-interaction.png');
  await page.screenshot({ path: interactionPath });
  console.log('📸 Saved interaction screenshot to:', interactionPath);

  await context.close();
  console.log('✅ Composer verification successful!');
}

verifyComposer().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
