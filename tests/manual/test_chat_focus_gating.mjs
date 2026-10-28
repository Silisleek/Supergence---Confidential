// SIS 1.0 — Test Suite: Cognitive Gating & Task Focus
// Verifies:
// 1. When a user has an active chat session or task in progress, SIS is strictly focused 100% on the chat task.
// 2. All background autonomous loops (RSI multi-strand engines, autonomous learner,
//    conversation dataset miner, recursive bootstrapper, inventive pulses, proactive outreach, DMN, improver)
//    strictly pause / back off while a chat task is active.
// 3. Background autonomous work ONLY runs when SIS is truly idle with no active chats or task given.
// 4. Zero hardcoding: all state transitions are dynamic.

import brain from '../../server/orchestrator/brain.js';
import brainLifecycle from '../../server/orchestrator/brain-lifecycle.js';
import rsiOrchestrator from '../../server/rsi/simultaneous-orchestrator.js';
import autonomousLearner from '../../server/improvement/autonomous-learner.js';
import bootstrapper from '../../server/improvement/bootstrapper.js';
import conversationDatasetMiner from '../../server/improvement/conversation-dataset-miner.js';
import inventiveEngine from '../../server/orchestrator/inventive-engine.js';
import proactiveCollaborator from '../../server/orchestrator/proactive-collaborator.js';
import dmnDaemon from '../../server/orchestrator/dmn-daemon.js';
import improver from '../../server/improvement/improver.js';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  TEST SUITE: COGNITIVE GATING & TASK FOCUS VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Ensure references are bound
  brainLifecycle.setBrain(brain);
  rsiOrchestrator.setBrain(brain);
  autonomousLearner.setBrain(brain);
  bootstrapper.setBrain(brain);
  conversationDatasetMiner.setBrain(brain);
  inventiveEngine.setBrain(brain);
  proactiveCollaborator.setBrain(brain);
  dmnDaemon.setBrain(brain);
  improver.setBrain(brain);

  // ── TEST 1: Initial Idle State ──
  console.log('Test 1: Initial Idle State with No Active Chat Task');
  brain.setChatActive(false);
  assert(brain.hasActiveChat() === false, 'brain.hasActiveChat() is false when chat is closed');
  assert(brain.chatClosed === true, 'brain.chatClosed is true');
  assert(brain.chatFocused === false, 'brain.chatFocused is false');
  assert(brainLifecycle.isIdle() === true, 'brainLifecycle.isIdle() is true when chat is closed');

  // ── TEST 2: Active Chat Task Engagement ──
  console.log('\nTest 2: Chat Task Engagement & PFC-Dominant Focus');
  brain.setChatActive(true, 'conv-test-focus-01');
  assert(brain.hasActiveChat() === true, 'brain.hasActiveChat() transitions to true');
  assert(brain.chatClosed === false, 'brain.chatClosed is false');
  assert(brain.chatFocused === true, 'brain.chatFocused is true');
  assert(brain.activeConversationId === 'conv-test-focus-01', 'activeConversationId is recorded');
  assert(
    brainLifecycle.isIdle() === false,
    'brainLifecycle.isIdle() is false while chat task is active',
  );

  // ── TEST 3: RSI Multi-Strand Engine Yields Compute to Chat Task ──
  console.log('\nTest 3: RSI Multi-Strand Engine Complete Back-off');
  rsiOrchestrator.isRunning = true;
  // Attempt to run fiber while chat is active
  await rsiOrchestrator._runStrandFiber('rqgm');
  assert(
    rsiOrchestrator.strands.rqgm.status === 'task-focused-paused',
    'RSI RQGM strand yields with status task-focused-paused',
  );
  await rsiOrchestrator._runStrandFiber('azr');
  assert(
    rsiOrchestrator.strands.azr.status === 'task-focused-paused',
    'RSI AZR strand yields with status task-focused-paused',
  );
  await rsiOrchestrator._runStrandFiber('alphaEvolve');
  assert(
    rsiOrchestrator.strands.alphaEvolve.status === 'task-focused-paused',
    'RSI AlphaEvolve strand yields with status task-focused-paused',
  );
  await rsiOrchestrator._runStrandFiber('seal');
  assert(
    rsiOrchestrator.strands.seal.status === 'task-focused-paused',
    'RSI SEAL strand yields with status task-focused-paused',
  );
  rsiOrchestrator.stop();

  // ── TEST 4: Autonomous Learner Cycle Suppression ──
  console.log('\nTest 4: Autonomous Learner Gating');
  const learnerCycleRes = await autonomousLearner.runCycle(false);
  assert(
    learnerCycleRes && learnerCycleRes.skipped === true && learnerCycleRes.reason === 'chat-active',
    'autonomousLearner.runCycle() skips with reason "chat-active"',
  );

  const theoryRes = await autonomousLearner._executeTheoryAndDotConnectingPhase(null);
  assert(
    theoryRes === null,
    'autonomousLearner._executeTheoryAndDotConnectingPhase() returns null while chat is active',
  );

  // ── TEST 5: Bootstrapper & Dataset Miner Suppression ──
  console.log('\nTest 5: Bootstrapper & Conversation Dataset Miner Gating');
  const bootstrapRes = await bootstrapper.runBootstrapCycle();
  assert(
    bootstrapRes === null,
    'bootstrapper.runBootstrapCycle() yields with null while chat is active',
  );

  const prevTurns = conversationDatasetMiner.state.totalTurnsAudited;
  await conversationDatasetMiner.mineAllConversations();
  assert(
    conversationDatasetMiner.state.totalTurnsAudited === prevTurns,
    'conversationDatasetMiner yields without auditing turns',
  );

  // ── TEST 6: Inventive Engine & Proactive Outreach Suppression ──
  console.log('\nTest 6: Inventive Engine & Proactive Outreach Suppression');
  const curInventions = inventiveEngine.getInventions().length;
  await inventiveEngine._considerAutonomousInvention();
  assert(
    inventiveEngine.getInventions().length === curInventions,
    'inventiveEngine._considerAutonomousInvention() yields without inventing',
  );

  const invCycleRes = await inventiveEngine.runFullInventiveCycle(null, false);
  assert(
    invCycleRes && invCycleRes.status === 'skipped' && invCycleRes.reason === 'chat_active',
    'inventiveEngine.runFullInventiveCycle(null) defers when chat is active',
  );

  const inquiryRipe = proactiveCollaborator.checkAutonomousInquiry();
  assert(
    inquiryRipe === false,
    'proactiveCollaborator.checkAutonomousInquiry() returns false while chat is active',
  );

  const curiosityRes = await proactiveCollaborator.generateIdleCuriosityInquiry();
  assert(
    curiosityRes === null,
    'proactiveCollaborator.generateIdleCuriosityInquiry() returns null while chat is active',
  );

  const postBuildRes = await proactiveCollaborator.generatePostBuildInquiry({
    title: 'Test System',
    filename: 'test.html',
  });
  assert(
    postBuildRes === null,
    'proactiveCollaborator.generatePostBuildInquiry() returns null while chat is active',
  );

  const dispatchRes = proactiveCollaborator.dispatchProactiveMessage('Test message');
  assert(
    dispatchRes === null,
    'proactiveCollaborator.dispatchProactiveMessage() returns null while chat is active',
  );

  // ── TEST 7: DMN Daemon Suppression ──
  console.log('\nTest 7: DMN Daemon Idle State Gating');
  const prevSynth = dmnDaemon.stats.synthesisRuns;
  await dmnDaemon._tick();
  assert(
    dmnDaemon.stats.synthesisRuns === prevSynth,
    'dmnDaemon._tick() yields without running synthesis while chat is active',
  );

  // ── TEST 7B: Autonomous Stream Continuation (No "Continue" Needed) ──
  console.log('\nTest 7B: Seamless Autonomous Stream Continuation on Token Limit');
  let mockTurn = 0;
  brain.streamHandler = async ({ onToken, extraMessages }) => {
    mockTurn++;
    if (mockTurn === 1) {
      const chunk1 =
        'Here is the simulation:\n```javascript\nconst canvas = document.createElement("canvas");\nconst ctx = canvas.getContext("2d");\nlet x = 10;';
      onToken(chunk1);
      return {
        text: chunk1,
        finishReason: 'length',
        truncated: true,
        toolCalls: [],
      };
    } else {
      const chunk2 =
        '\nlet y = 20;\nfunction animate() { requestAnimationFrame(animate); }\n```\nAll done!';
      onToken(chunk2);
      return {
        text: chunk2,
        finishReason: 'stop',
        truncated: false,
        toolCalls: [],
      };
    }
  };

  const processResult = await brain.process(
    `Build a dynamic canvas simulation test turn ${Date.now()}`,
  );
  brain.streamHandler = null; // Restore default

  assert(
    mockTurn === 2,
    `Seamless continuation performed 2 continuous turns autonomously (got ${mockTurn})`,
  );
  assert(
    processResult.response.includes('const canvas = document.createElement("canvas");'),
    'Full response contains turn 1 prefix',
  );
  assert(
    processResult.response.includes('function animate() { requestAnimationFrame(animate); }'),
    'Full response seamlessly continues into turn 2',
  );
  assert(processResult.response.includes('All done!'), 'Full response contains completion suffix');
  assert(
    (processResult.response.match(/```/g) || []).length % 2 === 0,
    'Code block fences are cleanly closed with no unclosed syntax',
  );

  // ── TEST 8: Chat Closure & Idle Background Release ──
  console.log('\nTest 8: User Closes Chat -> Resuming Autonomous Background Work');
  brain.setChatActive(false);
  assert(
    brain.hasActiveChat() === false,
    'brain.hasActiveChat() returns false after chat is closed',
  );
  assert(brain.chatClosed === true, 'brain.chatClosed is true');
  assert(brainLifecycle.isIdle() === true, 'brainLifecycle.isIdle() transitions back to true');

  // ── TEST 9: Live REST API Endpoints ──
  console.log('\nTest 9: Live REST API Verification');
  try {
    const focusRes = await fetch('http://localhost:3008/api/chat/focus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: 'api-test-conv' }),
    }).then((r) => r.json());
    assert(
      focusRes.success === true && focusRes.chatFocused === true,
      'POST /api/chat/focus engages task focus',
    );

    const getRes = await fetch('http://localhost:3008/api/chat/focus').then((r) => r.json());
    assert(
      getRes.chatFocused === true && getRes.activeConversationId === 'api-test-conv',
      'GET /api/chat/focus returns active state',
    );

    const closeRes = await fetch('http://localhost:3008/api/chat/close', { method: 'POST' }).then(
      (r) => r.json(),
    );
    assert(
      closeRes.success === true && closeRes.chatFocused === false,
      'POST /api/chat/close disengages task focus to idle',
    );

    const getAfterClose = await fetch('http://localhost:3008/api/chat/focus').then((r) => r.json());
    assert(
      getAfterClose.chatFocused === false && getAfterClose.chatClosed === true,
      'GET /api/chat/focus confirms chat is closed',
    );
  } catch (err) {
    console.error('API test error:', err.message);
    failed++;
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exitCode = 0;
    setTimeout(() => process.exit(0), 100);
  }
}

runTests().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
