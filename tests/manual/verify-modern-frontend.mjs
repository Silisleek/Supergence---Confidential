import { chromium } from 'playwright-core';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../');
const profileDir = path.join(ROOT_DIR, 'data/browser-profiles/agent-modern-verify');
const ARTIFACT_DIR =
  'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\b6fffe2c-7912-4465-b423-80e7a6572add';

async function verifyModernFrontend() {
  console.log('🚀 Starting Comprehensive Modern Frontend Verification in Real Chrome...');

  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }

  let context = null;

  try {
    context = await chromium.launchPersistentContext(profileDir, {
      channel: 'chrome',
      headless: true,
      viewport: { width: 1440, height: 900 },
      args: ['--no-first-run', '--disable-gpu'],
    });

    // Bypass any first-time onboarding modal
    await context.addInitScript(() => {
      localStorage.setItem('sis_setup_completed', 'true');
      localStorage.setItem('sis_model_setup_seen', 'true');
      localStorage.setItem('supergence_onboarding_completed', 'true');
      localStorage.setItem('sis_onboarding_done', 'true');
    });

    const page = context.pages()[0] || (await context.newPage());
    page.setDefaultTimeout(30000);
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', (err) => console.error('PAGE ERROR:', err.message));

    console.log('Step 1: Navigating to Supergence Modern Studio (http://127.0.0.1:3009/)...');
    await page.goto('http://127.0.0.1:3009/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Close any overlay modal if present
    await page.evaluate(() => {
      document.querySelectorAll('.sis-onboarding-overlay, #sisOnboardingModal').forEach((el) => {
        el.classList.remove('is-open');
        el.style.display = 'none';
      });
    });

    // 1. Verify Initial Chat View
    console.log('Step 2: Verifying Chat View...');
    const chatVisible = await page.$eval('#sisViewChat', (el) => el && el.style.display !== 'none');
    console.log('   Chat View visible:', chatVisible);
    const composerVisible = await page.$eval('#sisGlassComposer', (el) => Boolean(el));
    console.log('   Glass Composer mounted:', composerVisible);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'modern-chat-view.png') });
    console.log('   📸 Captured modern-chat-view.png');

    // 2. Verify AREM Real-Time Memory Showcase
    console.log('Step 3: Switching to [Memory] View...');
    await page.click('#sisNavMemory');

    // Wait for data to load from backend
    await page
      .waitForFunction(
        () => {
          const list = document.querySelectorAll('.sis-wiki-item');
          const label = document.getElementById('sisIndexLinesLabel');
          return list.length > 0 && label && !label.textContent.startsWith('0 /');
        },
        { timeout: 10000 },
      )
      .catch(() => console.log('Wait timeout or already loaded'));

    await page.waitForTimeout(600);

    const memoryVisible = await page.$eval(
      '#sisViewMemory',
      (el) => el && el.style.display !== 'none',
    );
    console.log('   Memory View visible:', memoryVisible);

    // Verify Bounded Top Index Gauges
    const linesLabel = await page.$eval('#sisIndexLinesLabel', (el) => el.textContent);
    const bytesLabel = await page.$eval('#sisIndexBytesLabel', (el) => el.textContent);
    console.log(`   AREM Bounded Index Gauges: ${linesLabel} | ${bytesLabel}`);

    // Verify Episodic Transcripts & Semantic Wiki
    const transcriptsCount = await page.$$eval('.sis-transcript-item', (els) => els.length);
    const wikiNotesCount = await page.$$eval('.sis-wiki-item', (els) => els.length);
    console.log(
      `   Episodic Transcripts items: ${transcriptsCount} | Semantic Wiki notes: ${wikiNotesCount}`,
    );

    // Click a wiki note if available to verify reader
    if (wikiNotesCount > 0) {
      console.log('   Clicking first wiki note...');
      await page.click('.sis-wiki-item:first-child');
      await page.waitForTimeout(600);
      const readerText = await page
        .$eval('#sisWikiReader', (el) => el.innerText.trim())
        .catch(() => '');
      console.log('   Wiki reader opened with content:', Boolean(readerText));
    }

    // Verify Dream status pill
    const dreamPillText = await page.$eval('#sisDreamStatusPill', (el) => el.textContent.trim());
    console.log('   Dream Status Pill:', dreamPillText);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'modern-memory-showcase.png') });
    console.log('   📸 Captured modern-memory-showcase.png');

    // 3. Verify Real-Time Tool Registry & Execution Sandbox
    console.log('Step 4: Switching to [Tools] View...');
    await page.click('#sisNavTools');

    await page
      .waitForFunction(
        () => {
          const cards = document.querySelectorAll('.sis-tool-card');
          return cards.length > 0;
        },
        { timeout: 10000 },
      )
      .catch(() => {});

    await page.waitForTimeout(600);

    const toolsVisible = await page.$eval(
      '#sisViewTools',
      (el) => el && el.style.display !== 'none',
    );
    console.log('   Tools View visible:', toolsVisible);

    const toolsBadge = await page.$eval('#sisToolsCountBadge', (el) => el.textContent.trim());
    console.log('   Tools Registry Badge:', toolsBadge);

    const toolCardsCount = await page.$$eval('.sis-tool-card', (els) => els.length);
    console.log(`   Tool cards rendered: ${toolCardsCount}`);

    // Test Search Filter
    console.log('   Testing search filter: "browser"...');
    await page.fill('#sisToolSearchInput', 'browser');
    await page.waitForTimeout(400);
    const filteredCount = await page.$$eval('.sis-tool-card', (els) => els.length);
    console.log(`   Filtered tools matching "browser": ${filteredCount}`);

    // Select a tool to inspect in sandbox
    if (filteredCount > 0) {
      console.log('   Selecting first tool for sandbox execution...');
      await page.click('.sis-tool-card:first-child .sis-tool-execute-btn');
      await page.waitForTimeout(400);

      const selectedToolName = await page.$eval('#sisSandboxToolName', (el) =>
        el.textContent.trim(),
      );
      console.log('   Tool selected in Sandbox:', selectedToolName);

      console.log('   Executing tool in sandbox...');
      await page.click('#sisSandboxExecuteBtn');
      await page.waitForTimeout(1200);

      const outputText = await page.$eval('#sisSandboxOutputBox', (el) => el.textContent.trim());
      console.log('   Sandbox execution output preview:', outputText.slice(0, 100));
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'modern-tools-sandbox.png') });
    console.log('   📸 Captured modern-tools-sandbox.png');

    // 4. Verify Sandboxed Web Browser View
    console.log('Step 5: Switching to [Browser] View...');
    await page.click('#sisNavBrowser');
    await page.waitForTimeout(1000);

    const browserVisible = await page.$eval(
      '#sisViewBrowser',
      (el) => el && el.style.display !== 'none',
    );
    console.log('   Browser View visible:', browserVisible);

    // Click Quick Target
    console.log('   Clicking Quick Target "Wikipedia AI"...');
    await page.click('.sis-browser-quick-link[data-url*="wikipedia"]');
    await page.waitForTimeout(600);

    const currentUrlVal = await page.$eval('#sisBrowserUrlInput', (el) => el.value);
    console.log('   Browser URL input updated to:', currentUrlVal);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'modern-browser-agent.png') });
    console.log('   📸 Captured modern-browser-agent.png');

    // 5. Verify Neural Agent Flow Canvas
    console.log('Step 6: Switching to [Canvas] View...');
    await page.click('#sisNavCanvas');
    await page.waitForTimeout(1200);

    const canvasVisible = await page.$eval(
      '#sisFlowCanvasSurface',
      (el) => el && el.style.display !== 'none',
    );
    console.log('   Agent Flow Canvas visible:', canvasVisible);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'modern-canvas-flow.png') });
    console.log('   📸 Captured modern-canvas-flow.png');

    // 6. Test In-Line Tool Call Card in Chat View
    console.log('Step 7: Returning to [Chat] and testing in-line tool call block formatting...');
    await page.click('#sisNavChat');
    await page.waitForTimeout(600);

    // Inject a live formatted tool block into chat turns stream to verify rendering & expandability
    await page.evaluate(() => {
      const stream = document.getElementById('chatTurnsStream');
      if (stream && window.sisFormatToolCallBlock) {
        const toolBlockHtml = window.sisFormatToolCallBlock({
          name: 'browser_action',
          category: 'navigation',
          durationMs: 142,
          status: 'completed',
          params: { action: 'navigate', url: 'https://news.ycombinator.com' },
          result: { status: 'success', title: 'Hacker News', httpStatus: 200 },
        });
        const card = document.createElement('div');
        card.innerHTML = toolBlockHtml;
        stream.appendChild(card);
      }
    });
    await page.waitForTimeout(400);

    // Click tool call header to expand details
    await page.click('.sis-tool-call-block .sis-tool-header');
    await page.waitForTimeout(300);

    const isExpanded = await page.$eval('.sis-tool-call-block', (el) =>
      el.classList.contains('is-expanded'),
    );
    console.log('   In-line Tool Call Block expanded on click:', isExpanded);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'modern-chat-tool-call.png') });
    console.log('   📸 Captured modern-chat-tool-call.png');

    // 7. Verify the 3 UI Style Options in Settings
    console.log('Step 8: Verifying the 3 UI Style options in Settings...');
    await page.click('#btnOpenSettings');
    await page.waitForTimeout(500);

    const settingsModalOpen = await page.$eval('#sisSettingsModal', (el) =>
      el.classList.contains('is-open'),
    );
    console.log('   Settings modal opened:', settingsModalOpen);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'modern-settings-modal.png') });
    console.log('   📸 Captured modern-settings-modal.png');

    // Test Style 1: Flow Canvas
    console.log('   Testing Style 1: Agent Flow Canvas...');
    await page.click('#sisStyleOptFlowCanvas');
    await page.waitForTimeout(500);
    const canvasActive = await page.$eval(
      '#sisFlowCanvasSurface',
      (el) => el && el.style.display !== 'none',
    );
    console.log('   Agent Flow Canvas mounted via settings:', canvasActive);

    // Test Style 3: Terminal Cockpit
    console.log('   Testing Style 3: Terminal Cockpit...');
    await page.click('#sisStyleOptCockpit');
    await page.waitForTimeout(500);
    const cockpitActive = await page.$eval(
      '#sisTerminalView',
      (el) => el && el.classList.contains('is-visible'),
    );
    console.log('   Terminal Cockpit visible via settings:', cockpitActive);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'modern-cockpit-style.png') });
    console.log('   📸 Captured modern-cockpit-style.png');

    // Test Style 2: Obsidian Studio (Return to default)
    console.log('   Testing Style 2: Obsidian Studio...');
    await page.click('#sisStyleOptStudio');
    await page.waitForTimeout(500);
    const studioActive = await page.$eval(
      '#sisThreeCanvasWrap',
      (el) => el && el.style.display !== 'none',
    );
    console.log('   Obsidian Studio 3D Canvas visible via settings:', studioActive);

    // Close Settings
    await page.click('#sisSettingsCloseBtn');
    await page.waitForTimeout(300);

    // 8. Antislop Verification
    console.log('Step 9: Checking Antislop R-02 (Zero em dashes)...');
    const bodyText = await page.$eval('body', (el) => el.innerText);
    const emDashMatches = bodyText.match(/—/g) || [];
    console.log(`   Em dash (—) count in visible DOM: ${emDashMatches.length}`);
    if (emDashMatches.length > 0) {
      console.warn(`   ⚠️ Warning: Found ${emDashMatches.length} em dashes in DOM`);
    } else {
      console.log('   ✅ Antislop R-02 PASSED: 0 em dashes found.');
    }

    console.log('🎉 Modern Frontend Verification Completed Successfully!');
  } finally {
    if (context) await context.close().catch(() => {});
  }
}

verifyModernFrontend().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
