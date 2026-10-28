// SIS 1.0 — 24/7 Continuous Simultaneous Recursive Self-Improvement (RSI) Daemon
// Upgraded based on RSI_Report.pdf (Level 5 Autonomy):
// Concurrently executes 4 simultaneous evolutionary strands:
// 1. [RQGM] Red Queen Gödel Machine (Co-evolving Agent-as-a-Judge + HGM Clade Metaproductivity)
// 2. [AZR] Absolute Zero Reasoner (Zero-human-data self-play reasoning curriculum)
// 3. [AlphaEvolve] Dual-Tier Ensemble Algorithm & Production Tool Discovery
// 4. [SEAL] Memory Consolidation & Anti-Catastrophic Forgetting Replay Buffer

import rsiOrchestrator from '../server/rsi/simultaneous-orchestrator.js';
import cladeArchive from '../server/rsi/clade-archive.js';
import redQueenEvaluator from '../server/rsi/red-queen-evaluator.js';
import absoluteZeroEngine from '../server/rsi/absolute-zero-engine.js';
import alphaEvolveEngine from '../server/rsi/alpha-evolve-engine.js';
import autonomousLearner from '../server/improvement/autonomous-learner.js';

console.log('═════════════════════════════════════════════════════════════════════════════');
console.log('  SIS 1.0 — 24/7 CONTINUOUS & SIMULTANEOUS RECURSIVE SELF-IMPROVEMENT (RSI)  ');
console.log('═════════════════════════════════════════════════════════════════════════════');
console.log('• Autonomy Rating: Level 5 (RQGM Co-Evolving Evaluator & Agent Scaffolding)');
console.log('• Multi-Strand Concurrency: 4 Simultaneous Parallel Evolutionary Fibers Active');
console.log('  ├── Strand 1: RQGM Scaffold Co-Evolution (HGM Clade Metaproductivity Tree)');
console.log('  ├── Strand 2: Absolute Zero Self-Play Reasoner (Zero-Human-Data Tasks)');
console.log('  ├── Strand 3: AlphaEvolve Algorithm Discovery (Dual-Tier Ensemble)');
console.log('  └── Strand 4: SEAL Memory Consolidation (Anti-Forgetting Replay Buffer)');
console.log('• Storage: ./data/rsi/, ./data/memory/, ./data/improvement/\n');

// Start autonomous research engine & simultaneous RSI multi-strand orchestrator
autonomousLearner.start();
rsiOrchestrator.start();

// Real-time Console Monitor Dashboard
setInterval(() => {
  const status = rsiOrchestrator.getStatus();
  const rqgm = redQueenEvaluator.getState();
  const clades = cladeArchive.getStats();
  const azr = absoluteZeroEngine.getState();
  const ae = alphaEvolveEngine.getState();

  console.log('\n[24/7 RSI Monitor] ─────────────────────────────────────────────────────────');
  console.log(
    `  ⏱️  Uptime: ${status.stats.uptimeSeconds}s | Total Cycles: ${status.stats.totalSimultaneousCycles}`,
  );
  console.log(
    `  👑 [RQGM Epoch ${rqgm.currentEpoch}]: Gen ${rqgm.evaluatorGeneration} Judge | Discrim: ${(rqgm.discriminationScore * 100).toFixed(1)}% | In-Epoch: ${rqgm.evaluationsInEpoch}/${rqgm.epochSize}`,
  );
  console.log(
    `  🌳 [HGM Clade Tree]: ${clades.nodesCount} Nodes | ${clades.activeClades} Clades | Peak CMP: ${clades.highestCMP} | Stones: ${clades.steppingStonesPreserved}`,
  );
  console.log(
    `  ⚡ [AZR Self-Play]: ${azr.tasksSolvedVerifiably}/${azr.tasksAcceptedByLearnability} Solved (${azr.overallPassRate}% Pass Rate) | Theorems: ${azr.recentTheoremsCount}`,
  );
  console.log(
    `  🧬 [AlphaEvolve]: ${ae.totalProgramsInArchive} Programs | Peak Speedup: ${ae.peakSpeedupMultiplier}x | Avg Speedup: ${ae.averageSpeedup}x`,
  );
  console.log(
    `  🛡️ [SEAL Replay]: ${status.replayBufferSize} Golden Traces Preserved (Catastrophic Forgetting Safeguard)`,
  );
  console.log('────────────────────────────────────────────────────────────────────────────\n');
}, 60000);

// Continuous autonomous background inquiry runner
async function loopAutonomousInquiry() {
  let count = 0;
  while (true) {
    count++;
    try {
      await autonomousLearner.runCycle(true);
    } catch (e) {
      console.warn(`[Inquiry Runner] Cycle #${count} note:`, e.message);
    }
    await new Promise((r) => setTimeout(r, 45000));
  }
}

loopAutonomousInquiry().catch((err) => console.error('[24/7 Daemon] Error:', err));
