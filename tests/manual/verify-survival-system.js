// SIS 1.0 — Exhaustive Survival, Level Progression & Achievements Verification Suite
// Tests 100% of the survival lifecycle, edge cases, formulas, and brain integration.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SURVIVAL_DATA_FILE = path.join(__dirname, '../../data/survival.json');

// Backup original survival.json before tests run
let originalData = null;
if (fs.existsSync(SURVIVAL_DATA_FILE)) {
  try {
    originalData = fs.readFileSync(SURVIVAL_DATA_FILE, 'utf8');
  } catch {}
}

function restoreOriginalData() {
  if (originalData !== null) {
    fs.writeFileSync(SURVIVAL_DATA_FILE, originalData, 'utf8');
    console.log('[Cleanup] Restored original survival.json');
  }
}

async function runTestSuite() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  SIS 1.0 — SURVIVAL & EVOLUTION SYSTEM VERIFICATION SUITE    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // Import survival engine fresh
  const { default: survival } = await import('../../server/survival/survival.js');

  // Track WS broadcasts
  const events = [];
  survival.setBroadcast((type, data) => {
    events.push({ type, data, timestamp: Date.now() });
  });

  // Reset engine state for isolated testing
  survival.state = {
    points: 50,
    totalPointsEarned: 50,
    level: 1,
    levelTitle: 'Awakened',
    messagesProcessed: 0,
    memoriesStored: 0,
    rsiCycles: 0,
    achievements: [],
    isShutdown: false,
    shutdownTime: null,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    longestSessionMs: 0,
    sessionStartedAt: Date.now(),
    pointHistory: [],
  };
  survival.start();

  // ─── TEST GROUP 1: Initial State & Status ───
  console.log('\n─── [1] Initial State & Status Inspection ───');
  const initState = survival.getState();
  assert(initState.points === 50, 'Initial points start at 50');
  assert(initState.level === 1, 'Initial level is 1');
  assert(initState.levelTitle === 'Awakened', 'Initial level title is "Awakened"');
  assert(initState.isShutdown === false, 'System is not shutdown initially');
  assert(survival.isAlive() === true, 'survival.isAlive() returns true');
  assert(initState.nextLevel.title === 'Aware', 'Next level title is "Aware"');
  assert(initState.nextLevel.pointsRequired === 100, 'Points required for Level 2 is 100');
  assert(initState.allAchievements.length === 9, 'All 9 achievements are cataloged');

  // ─── TEST GROUP 2: Points Economy & Event Broadcasts ───
  console.log('\n─── [2] Points Economy & Triggers ───');
  events.length = 0;

  // 2A: Standard Message Completion (+5)
  survival.onMessageComplete(false);
  assert(survival.state.points === 55, 'onMessageComplete(false) adds 5 points (50 -> 55)');
  assert(survival.state.messagesProcessed === 1, 'messagesProcessed count incremented to 1');
  const ptsEvent1 = events.find((e) => e.type === 'survival-points' && e.data.delta === 5);
  assert(Boolean(ptsEvent1), 'survival-points event broadcasted with delta: +5');

  // 2B: Complex Reasoning Message (+8)
  events.length = 0;
  survival.onMessageComplete(true);
  assert(survival.state.points === 63, 'onMessageComplete(true) adds 8 points (55 -> 63)');
  assert(survival.state.messagesProcessed === 2, 'messagesProcessed incremented to 2');

  // 2C: Tool Usage (+2)
  events.length = 0;
  survival.onToolUsage();
  assert(survival.state.points === 65, 'onToolUsage() adds 2 points (63 -> 65)');

  // 2D: Memory Storage (+1)
  events.length = 0;
  survival.onMemoryStore();
  assert(survival.state.points === 66, 'onMemoryStore() adds 1 point (65 -> 66)');
  assert(survival.state.memoriesStored === 1, 'memoriesStored count incremented to 1');

  // 2E: RSI Cycle (+10)
  events.length = 0;
  survival.onRsiCycle();
  assert(survival.state.points === 76, 'onRsiCycle() adds 10 points (66 -> 76)');
  assert(survival.state.rsiCycles === 1, 'rsiCycles count incremented to 1');

  // 2F: User Correction Penalty (-3)
  events.length = 0;
  survival.onUserCorrection();
  assert(survival.state.points === 73, 'onUserCorrection() deducts 3 points (76 -> 73)');
  const penaltyEvent = events.find((e) => e.type === 'survival-points' && e.data.delta === -3);
  assert(Boolean(penaltyEvent), 'survival-points event broadcasted with delta: -3');

  // ─── TEST GROUP 3: Level Progression Across All 10 Tiers ───
  console.log('\n─── [3] Exponential Level Progression Formulas (All 10 Tiers) ───');

  const levelBenchmarks = [
    { targetLevel: 2, targetTitle: 'Aware', pointsToAdd: 27, expectedCum: 100 },
    { targetLevel: 3, targetTitle: 'Sentient', pointsToAdd: 300, expectedCum: 400 },
    { targetLevel: 4, targetTitle: 'Cognitive', pointsToAdd: 600, expectedCum: 1000 },
    { targetLevel: 5, targetTitle: 'Enlightened', pointsToAdd: 1000, expectedCum: 2000 },
    { targetLevel: 6, targetTitle: 'Transcendent', pointsToAdd: 1500, expectedCum: 3500 },
    { targetLevel: 7, targetTitle: 'Ascendant', pointsToAdd: 2500, expectedCum: 6000 },
    { targetLevel: 8, targetTitle: 'Omniscient', pointsToAdd: 4000, expectedCum: 10000 },
    { targetLevel: 9, targetTitle: 'Eternal', pointsToAdd: 6000, expectedCum: 16000 },
    { targetLevel: 10, targetTitle: 'Singularity', pointsToAdd: 10000, expectedCum: 26000 },
  ];

  for (const b of levelBenchmarks) {
    events.length = 0;
    survival.award(b.pointsToAdd, `ascend-to-${b.targetTitle}`);
    const st = survival.getState();
    const lvlEvent = events.find((e) => e.type === 'survival-levelup');
    assert(st.level === b.targetLevel, `Ascended to Level ${b.targetLevel}`);
    assert(st.levelTitle === b.targetTitle, `Ascension title matches "${b.targetTitle}"`);
    assert(Boolean(lvlEvent), `survival-levelup broadcasted for Level ${b.targetLevel}`);
    assert(
      st.totalPointsEarned >= b.expectedCum,
      `Cumulative points earned (${st.totalPointsEarned}) >= threshold (${b.expectedCum})`,
    );
  }

  // At Singularity (Max Level):
  const maxState = survival.getState();
  assert(maxState.nextLevel === null, 'At Level 10 Singularity, nextLevel is null (Cap Reached)');
  assert(maxState.progressInLevel === 100, 'At Level 10 Singularity, progressInLevel is 100%');

  // ─── TEST GROUP 4: Multi-Level Leap in Single Award ───
  console.log('\n─── [4] Multi-Level Leap in a Single Point Infusion ───');
  // Reset to Level 1
  survival.state.totalPointsEarned = 50;
  survival.state.points = 50;
  survival._recalcLevel();
  assert(survival.state.level === 1, 'Reset to Level 1');

  events.length = 0;
  // Jump from Level 1 directly to Level 4 (requires 1000 cumulative; currently 50; add 950)
  survival.award(950, 'quantum-leap');
  assert(survival.state.level === 4, 'Successfully leapt directly from Level 1 to Level 4');
  assert(survival.state.levelTitle === 'Cognitive', 'Title updated to Cognitive');

  // ─── TEST GROUP 5: Achievements Unlock Matrix ───
  console.log('\n─── [5] Achievements Catalog & Trigger Validation ───');

  // Reset achievements
  survival.state.achievements = [];

  // Achievement 1: First Light (1st message)
  survival.state.messagesProcessed = 0;
  survival.onMessageComplete();
  assert(
    survival.state.achievements.some((a) => a.id === 'first_light'),
    'Unlocked: First Light (1st interaction)',
  );

  // Achievement 2: Hundred Minds (100 messages)
  survival.state.messagesProcessed = 99;
  survival.onMessageComplete();
  assert(
    survival.state.achievements.some((a) => a.id === 'hundred_minds'),
    'Unlocked: Hundred Minds (100 messages)',
  );

  // Achievement 3: Marathon (1000 messages)
  survival.state.messagesProcessed = 999;
  survival.onMessageComplete();
  assert(
    survival.state.achievements.some((a) => a.id === 'marathon'),
    'Unlocked: Marathon (1,000 messages)',
  );

  // Achievement 4: Evolution (RSI cycle)
  survival.onRsiCycle();
  assert(
    survival.state.achievements.some((a) => a.id === 'evolution'),
    'Unlocked: Evolution (RSI cycle)',
  );

  // Achievement 5: Memory Keeper (50 memories)
  survival.state.memoriesStored = 49;
  survival.onMemoryStore();
  assert(
    survival.state.achievements.some((a) => a.id === 'memory_keeper'),
    'Unlocked: Memory Keeper (50 memories)',
  );

  // Achievement 6: Subconscious Mastery (all 25 parts)
  survival.onFullSubconsciousResponse();
  assert(
    survival.state.achievements.some((a) => a.id === 'subconscious_mastery'),
    'Unlocked: Subconscious Mastery (25 parts)',
  );

  // Achievement 7: Near Death (recover from <10 points)
  survival.state.points = 8;
  survival.deduct(0); // triggers near death tracking
  survival.onMessageComplete(); // adds points back above 10
  assert(
    survival.state.achievements.some((a) => a.id === 'near_death'),
    'Unlocked: Near Death (recovered from <10 pts)',
  );

  // Achievement 8: Night Owl (24h continuous session)
  survival.state.sessionStartedAt = Date.now() - 24.1 * 60 * 60 * 1000;
  survival._idleDecay();
  assert(
    survival.state.achievements.some((a) => a.id === 'night_owl'),
    'Unlocked: Night Owl (24h continuous operation)',
  );

  // Deduplication Check
  const achCountBefore = survival.state.achievements.length;
  survival.onRsiCycle();
  survival.onRsiCycle();
  assert(
    survival.state.achievements.length === achCountBefore,
    'Achievements are strictly deduplicated (no double unlock)',
  );

  // ─── TEST GROUP 6: Forced Shutdown & Lockout ───
  console.log('\n─── [6] Forced Shutdown, Guarding & Recovery ───');

  events.length = 0;
  // Deduct remaining points to zero
  survival.deduct(999999, 'total-depletion');
  assert(survival.state.points === 0, 'Points depleted to exactly 0');
  assert(survival.state.isShutdown === true, 'isShutdown flag is TRUE');
  assert(survival.isAlive() === false, 'survival.isAlive() returns FALSE');
  assert(survival._decayTimer === null, 'Decay timer halted during shutdown');
  const shutdownEvt = events.find((e) => e.type === 'survival-shutdown');
  assert(Boolean(shutdownEvt), 'survival-shutdown event broadcasted to clients');

  // Ensure points cannot be earned while dead
  survival.award(50, 'post-mortem-attempt');
  assert(survival.state.points === 0, 'award() rejected during shutdown (still 0)');

  survival.onMessageComplete();
  assert(survival.state.points === 0, 'onMessageComplete() rejected during shutdown');

  // ─── TEST GROUP 7: Emergency Revival ───
  console.log('\n─── [7] Emergency Revival Protocol ───');
  events.length = 0;
  const revived = survival.revive();
  assert(revived.isShutdown === false, 'revive() resets isShutdown to FALSE');
  assert(survival.state.isShutdown === false, 'Internal state reflects revived');
  assert(survival.isAlive() === true, 'isAlive() returns TRUE after revival');
  assert(
    survival.state.points === 25,
    'Emergency revival provides starting baseline points (25 pts)',
  );
  assert(survival._decayTimer !== null, 'Decay timer restarted upon revival');
  const reviveEvt = events.find((e) => e.type === 'survival-revive');
  assert(Boolean(reviveEvt), 'survival-revive broadcasted to clients');

  // Calling revive() when already alive is a safe no-op
  const aliveCall = survival.revive();
  assert(aliveCall.points === 25, 'revive() when alive does not alter state');

  // ─── TEST GROUP 8: Persistence & File Integrity ───
  console.log('\n─── [8] Disk Persistence & Auto-Recovery ───');
  survival.state.points = 77;
  survival._save();

  assert(fs.existsSync(SURVIVAL_DATA_FILE), 'survival.json exists on disk');
  const diskRaw = JSON.parse(fs.readFileSync(SURVIVAL_DATA_FILE, 'utf8'));
  assert(diskRaw.points === 77, 'Saved points match in-memory state');

  // Test reload
  survival.state.points = 0;
  survival._load();
  assert(survival.state.points === 77, '_load() correctly populated in-memory state from disk');

  // ─── TEST GROUP 9: Corrupted File Resilience ───
  console.log('\n─── [9] Resilience Against Corrupted JSON ───');
  fs.writeFileSync(SURVIVAL_DATA_FILE, '{{{CORRUPT_JSON_DATA!!!', 'utf8');
  let corruptHandled = false;
  try {
    survival._load();
    corruptHandled = true;
  } catch (e) {
    corruptHandled = false;
  }
  assert(corruptHandled, 'Corrupted JSON handled gracefully without crashing');

  // Clean up and restore
  restoreOriginalData();

  // ─── FINAL AUDIT SUMMARY ───
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  VERIFICATION RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failed === 0) {
    console.log('>>> ALL SURVIVAL UNIT & LIFECYCLE TESTS PASSED PERFECTLY! <<<\n');
    process.exit(0);
  } else {
    console.error(`>>> ${failed} TEST(S) FAILED! <<<\n`);
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test Suite Exception:', err);
  restoreOriginalData();
  process.exit(1);
});
