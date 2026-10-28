// Test suite: Learner Scheduler & Dot-Connecting Theory Engine Verification
import autonomousLearner from '../../server/improvement/autonomous-learner.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runTests() {
  console.log('===============================================================');
  console.log('  VERIFYING LEARNER SCHEDULER & DOT-CONNECTING THEORY ENGINE   ');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
    }
  }

  // ── TEST 1: Rate Limiter & Scheduler Config Enforcement ──
  console.log('[Test 1] Learner Scheduler Config & Strict Rate Limiting Cap (Max 20/hr)...');

  // Try setting 25 cycles/hr (should be capped at 20)
  const cfg1 = autonomousLearner.updateSchedulerConfig({
    maxCyclesPerHour: 25,
    scheduleMode: '24_7',
  });

  assert(
    cfg1.maxCyclesPerHour === 20,
    `Capped maxCyclesPerHour at 20 (requested 25, got ${cfg1.maxCyclesPerHour})`,
  );
  assert(cfg1.scheduleMode === '24_7', 'Schedule mode set to 24_7');

  // Try setting 5 cycles/hr
  const cfg2 = autonomousLearner.updateSchedulerConfig({
    maxCyclesPerHour: 5,
    scheduleMode: 'quiet_hours',
  });
  assert(
    cfg2.maxCyclesPerHour === 5,
    `Configured maxCyclesPerHour to 5 (got ${cfg2.maxCyclesPerHour})`,
  );
  assert(cfg2.scheduleMode === 'quiet_hours', 'Schedule mode set to quiet_hours');

  // Reset to default 10 cycles/hr
  autonomousLearner.updateSchedulerConfig({ maxCyclesPerHour: 10, scheduleMode: '24_7' });

  // ── TEST 2: Sliding Window Rate Limit Enforcement ──
  console.log('\n[Test 2] Sliding Window Rate Limiting Enforcement...');

  // Simulate 10 cycle timestamps in past hour
  const now = Date.now();
  autonomousLearner.state.cycleTimestamps = Array.from({ length: 10 }, (_, i) => now - i * 60000);

  const cycleResult = await autonomousLearner.runCycle(false);
  assert(
    cycleResult.skipped === true && cycleResult.reason === 'rate-limited',
    `Skipped cycle due to 10/10 rate limit in past hour (reason: ${cycleResult.reason})`,
  );

  // Clear timestamps for theory test
  autonomousLearner.state.cycleTimestamps = [];

  // ── TEST 3: Dot-Connecting Theory Generation & Instant Gap Web Search ──
  console.log('\n[Test 3] Dot-Connecting Theory Engine & File Generation...');

  const activity = await autonomousLearner._executeTheoryAndDotConnectingPhase(
    'Quantum Lock-Free Memory Trees',
  );

  assert(activity && activity.id, 'Activity record created');
  assert(activity.title && activity.title.length > 0, `Theory generated: "${activity.title}"`);
  assert(
    Array.isArray(activity.dotConnections) && activity.dotConnections.length > 0,
    `Connected ${activity.dotConnections.length} dots across domains`,
  );
  assert(
    Array.isArray(activity.gapsResearched),
    `Researched ${activity.gapsResearched.length} instant web knowledge gaps`,
  );
  assert(
    Array.isArray(activity.files) && activity.files.length >= 2,
    `Generated ${activity.files.length} report/code files`,
  );

  // Verify theory report file exists on disk
  const reportFile = activity.files.find((f) => f.type === 'report');
  assert(
    reportFile && fs.existsSync(path.join(__dirname, '../..', reportFile.path)),
    `Theory report file exists on disk (${reportFile.path})`,
  );

  // Verify code prototype file exists on disk
  const codeFile = activity.files.find((f) => f.type === 'code');
  assert(
    codeFile && fs.existsSync(path.join(__dirname, '../..', codeFile.path)),
    `Theory prototype code file exists on disk (${codeFile.path})`,
  );

  // Verify theory is NOT the old hardcoded static string
  assert(
    activity.title !== 'Unified Lock-Free Vector Memory Synchronization Theory',
    `Theory is dynamically synthesized and not static hardcoded: "${activity.title}"`,
  );

  // ── TEST 4: Consecutively Generated Theories Must Be Unique ──
  console.log('\n[Test 4] Generating Second Theory to Verify Non-Duplication...');
  const activity2 = await autonomousLearner._executeTheoryAndDotConnectingPhase(
    'Spiking Neuromorphic Neural Synthesis',
  );
  assert(activity2 && activity2.title, `Second theory generated: "${activity2.title}"`);
  assert(
    activity2.title !== activity.title,
    `Consecutive theories have distinct titles ("${activity.title}" vs "${activity2.title}")`,
  );

  // ── TEST 5: Idle Activities Feed & Telemetry Status ──
  console.log('\n[Test 5] Idle Activities Feed & Telemetry Status...');

  const status = autonomousLearner.getStatus();
  assert(
    Array.isArray(status.idleActivities) && status.idleActivities.length > 0,
    `Idle activities feed populated (${status.idleActivities.length} items)`,
  );
  assert(
    status.stats.totalTheoriesGenerated >= 1,
    `totalTheoriesGenerated count tracked (${status.stats.totalTheoriesGenerated})`,
  );
  assert(
    status.schedulerConfig && status.schedulerConfig.maxCyclesPerHour <= 20,
    `getStatus() returns valid schedulerConfig (max ${status.schedulerConfig.maxCyclesPerHour}/hr)`,
  );

  console.log('\n===============================================================');
  console.log(
    `  VERIFICATION COMPLETE: ${passed}/${total} TESTS PASSED (${((passed / total) * 100).toFixed(0)}%)`,
  );
  console.log('===============================================================');

  process.exit(passed === total ? 0 : 1);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
