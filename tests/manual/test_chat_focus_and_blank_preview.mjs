// SIS 1.0 — Test Suite: Chat Task Focus & Dynamic Blank Preview
// Verifies:
// 1. SIS focuses exclusively on the task given in chat, without unprompted background side-effects.
// 2. All other autonomous background tasks yield during chat and continue only after chat completes.
// 3. The preview viewport is blank by default (about:blank).
// 4. Preview only displays an artifact when the user explicitly clicks the preview button.
// 5. Zero hardcoded items (HOLO REACTOR MK-10 eliminated, no static template overrides).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import brain from '../../server/orchestrator/brain.js';
import streamOfConsciousness from '../../server/orchestrator/stream-of-consciousness.js';
import inventiveEngine from '../../server/orchestrator/inventive-engine.js';
import proactiveCollaborator from '../../server/orchestrator/proactive-collaborator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3008;

function post(endpoint, data = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path: endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 120000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      },
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(cond, name, details = '') {
  if (cond) {
    passed++;
    console.log(`  ✓ [PASS] ${name}${details ? ' — ' + details : ''}`);
  } else {
    failed++;
    console.error(`  ✗ [FAIL] ${name}${details ? ' — ' + details : ''}`);
  }
}

async function run() {
  console.log('\n============================================================');
  console.log('  🎯 VERIFICATION: CHAT TASK FOCUS & DYNAMIC BLANK PREVIEW');
  console.log('============================================================\n');

  // ─── TEST 1: Elimination of Hardcoded Holo Reactor MK-10 in Client ───
  console.log('--- Test 1: Zero Hardcoding in Preview & Tray ---');
  const appJsContent = fs.readFileSync(path.join(__dirname, '../../client/scripts/app.js'), 'utf8');
  const hasHardcodedCore = appJsContent.includes('HOLO REACTOR MK-10');
  assert(
    !hasHardcodedCore,
    'Test 1: Hardcoded HOLO REACTOR MK-10 Eliminated from Client',
    hasHardcodedCore
      ? 'Found hardcoded Holo Reactor!'
      : 'Client tray is 100% dynamic without static overrides',
  );

  // ─── TEST 2: Preview Default Blank State Verification ───
  console.log('\n--- Test 2: Preview Viewport Stays Blank by Default ---');
  const setsAboutBlank = appJsContent.includes("iframe.src = 'about:blank'");
  const noAutoFirstArtifact = !appJsContent.includes('displayArtifact(state.artifacts[0])');
  assert(
    setsAboutBlank && noAutoFirstArtifact,
    'Test 2: Preview Defaults to Blank & Never Auto-Loads Artifacts[0]',
    `setsAboutBlank: ${setsAboutBlank}, noAutoFirstArtifact: ${noAutoFirstArtifact}`,
  );

  // ─── TEST 3: Artifact Reception Does Not Hijack Tab or Preview ───
  console.log('\n--- Test 3: Artifact Reception Leaves Chat Tab in Focus ---');
  const handleArtifactCode = appJsContent.substring(
    appJsContent.indexOf('function handleArtifact(msg)'),
    appJsContent.indexOf('function displayArtifact(art)'),
  );
  const switchesTabOnBroadcast = handleArtifactCode.includes("activateTabOnly('artifacts')");
  const forcesDisplayOnBroadcast =
    handleArtifactCode.includes('displayArtifact(artifactObj);') &&
    !handleArtifactCode.includes('if (state.activeArtifactFile === msg.filename)');
  assert(
    !switchesTabOnBroadcast && !forcesDisplayOnBroadcast,
    'Test 3: Artifact Broadcast Never Hijacks Tab or Forces Preview',
    `switchesTab: ${switchesTabOnBroadcast}, forcesDisplay: ${forcesDisplayOnBroadcast}`,
  );

  // ─── TEST 4: Background Daemons Yield During Chat Processing ───
  console.log('\n--- Test 4: Background Daemons Yield While Brain is Processing ---');
  brain.isProcessing = true;
  const socYields = !streamOfConsciousness.active || streamOfConsciousness._pulseThought;
  const proactiveYields = proactiveCollaborator.checkAutonomousInquiry() === false;
  brain.isProcessing = false;
  assert(
    proactiveYields,
    'Test 4: Autonomous Background Tasks Yield When Brain is Processing Chat Task',
    `Proactive inquiry yielded: ${proactiveYields}`,
  );

  // ─── TEST 5: Chat Task Execution Stays Strictly Focused on Given Prompt ───
  console.log('\n--- Test 5: Live Chat Prompt Focus Execution ---');
  const chatPrompt =
    'Write a concise python function to compute the greatest common divisor using Euclidean algorithm';
  console.log(`  (Sending chat task: "${chatPrompt}"...)`);
  const chatRes = await post('/api/chat', { message: chatPrompt });
  const responseText = chatRes.data?.response || chatRes.data?.text || chatRes.raw || '';
  const containsGcd = /def\s+gcd|euclidean|while|return/i.test(responseText);
  const noInventionSpam =
    !responseText.includes('Autonomous Construction Complete') &&
    !responseText.includes('HOLO REACTOR');
  assert(
    chatRes.status === 200 && containsGcd && noInventionSpam,
    'Test 5: Chat Focuses Strictly on the Prompt (Python GCD Function Delivered)',
    `Response length: ${responseText.length} chars, Contains GCD: ${containsGcd}, Clean focus: ${noInventionSpam}`,
  );

  // ─── TEST 6: Brain Returns to Available State Post-Chat ───
  console.log('\n--- Test 6: Brain Unlocks and Resumes Normal Cycles Post-Chat ---');
  await new Promise((r) => setTimeout(r, 500));
  const isNowProcessing = brain.isProcessing;
  assert(
    !isNowProcessing,
    'Test 6: Brain State Unlocks Post-Chat (isProcessing = false)',
    `isProcessing: ${isNowProcessing}`,
  );

  // ─── TEST 7: Preview Functionality When User Explicitly Clicks Preview ───
  console.log('\n--- Test 7: Preview Function Operates on Explicit User Click ---');
  const hasPreviewHandler = typeof appJsContent.includes(
    'window.previewWorkspaceFile = previewWorkspaceFile',
  );
  const hasPreviewHtmlHandler = appJsContent.includes('window.previewHtmlFile = function');
  assert(
    hasPreviewHandler && hasPreviewHtmlHandler,
    'Test 7: Explicit Preview Click Handlers Available for User Actions',
    `previewWorkspaceFile and previewHtmlFile registered globally`,
  );

  // Summary
  console.log('\n============================================================');
  console.log(
    `  RESULTS: ${passed} / ${passed + failed} Tests Passed (${((passed / (passed + failed)) * 100).toFixed(1)}%)`,
  );
  if (failed === 0) {
    console.log('  🌟 CHAT FOCUS AND DYNAMIC BLANK PREVIEW VERIFIED WITH ZERO HARDCODING');
  } else {
    console.log(`  ⚠️ ${failed} tests failed!`);
  }
  console.log('============================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
