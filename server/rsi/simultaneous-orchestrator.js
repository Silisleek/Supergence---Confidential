// SIS 1.0 — Simultaneous & Continuous RSI Multi-Strand Orchestrator
// Upgrades SIS to Level 5 Autonomy (L5 RSI) running 4 concurrent evolutionary strands:
// 1. Strand 1: RQGM Core Code & Scaffold Co-Evolution (L5, arXiv 2606.26294)
// 2. Strand 2: Absolute Zero Reasoner (AZR) Self-Play (arXiv 2505.03335)
// 3. Strand 3: AlphaEvolve Algorithm & Production Code Discovery (Google DeepMind)
// 4. Strand 4: SEAL Memory Consolidation & Anti-Forgetting Replay Buffer (MIT, arXiv 2506.10943)
// Runs continuously 24/7 without stopping, executing simultaneously in non-blocking async fibers.

import cladeArchive from './clade-archive.js';
import redQueenEvaluator from './red-queen-evaluator.js';
import absoluteZeroEngine from './absolute-zero-engine.js';
import alphaEvolveEngine from './alpha-evolve-engine.js';
import longTermMemory from '../memory/long-term.js';
import shortTermMemory from '../memory/short-term.js';
import knowledgeGraph from '../memory/knowledge-graph.js';
import patternLibrary from '../improvement/anti-patterns.js';
import userFocusTracker from '../improvement/user-focus-tracker.js';
import metaPromptOptimizer from '../improvement/meta-prompt-optimizer.js';
import exemplarBank from '../improvement/exemplar-bank.js';
import { quickAI, DEFAULT_MODEL, PREMIUM_MODEL } from '../api/openrouter.js';
import { safeLearningAI, extractCleanJSON } from '../improvement/learning-resilience.js';
import survivalEngine from '../survival/survival.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RSI_DATA_DIR = path.join(__dirname, '../../data/rsi');
const STATE_FILE = path.join(RSI_DATA_DIR, 'simultaneous-orchestrator.json');

export class RSISimultaneousOrchestrator {
  constructor(options = {}) {
    this.brainRef = null;
    this.onBroadcast = null;
    this.isRunning = false;
    this.filePath = STATE_FILE;

    // Concurrency configuration: independent intervals for simultaneous parallel execution
    this.cadences = {
      rqgm: options.rqgmIntervalMs || 3.5 * 60 * 1000, // Every 3.5m: RQGM scaffold evolution
      azr: options.azrIntervalMs || 4 * 60 * 1000, // Every 4.0m: AZR self-play cycle
      alphaEvolve: options.aeIntervalMs || 5 * 60 * 1000, // Every 5.0m: AlphaEvolve algorithm loop
      seal: options.sealIntervalMs || 3 * 60 * 1000, // Every 3.0m: Memory consolidation & replay
    };

    // Strand tracking states
    this.strands = {
      rqgm: {
        id: 'rqgm',
        name: 'RQGM Code & Scaffold Co-Evolution',
        autonomyLevel: 'L5 (Agent + Judge Co-Evolution)',
        status: 'standby', // standby | running | throttled | paused
        enabled: true,
        cyclesCompleted: 0,
        lastCycleAt: null,
        activeTask: null,
        recentEvents: [],
      },
      azr: {
        id: 'azr',
        name: 'Absolute Zero Self-Play Reasoner',
        autonomyLevel: 'L3 (Zero-Human-Data Self-Play)',
        status: 'standby',
        enabled: true,
        cyclesCompleted: 0,
        lastCycleAt: null,
        activeTask: null,
        recentEvents: [],
      },
      alphaEvolve: {
        id: 'alphaEvolve',
        name: 'AlphaEvolve Algorithm Discovery',
        autonomyLevel: 'L3 (Dual-Tier Ensemble Optimization)',
        status: 'standby',
        enabled: true,
        cyclesCompleted: 0,
        lastCycleAt: null,
        activeTask: null,
        recentEvents: [],
      },
      seal: {
        id: 'seal',
        name: 'SEAL Memory Consolidation & Replay',
        autonomyLevel: 'L4 (Continuous Deployment Adaptation)',
        status: 'standby',
        enabled: true,
        cyclesCompleted: 0,
        lastCycleAt: null,
        activeTask: null,
        recentEvents: [],
      },
    };

    this.replayBuffer = []; // Anti-catastrophic forgetting replay buffer (SEAL)
    this.timers = {};
    this.stats = {
      totalSimultaneousCycles: 0,
      systemAutonomyRating: 'Level 5 (Recursive Self-Improving Agent & Judge)',
      uptimeMs: 0,
      startedAt: null,
      lastSimultaneousHeartbeat: null,
    };

    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const data = JSON.parse(raw);
        if (data.strands) {
          for (const key of Object.keys(data.strands)) {
            if (this.strands[key]) {
              this.strands[key].cyclesCompleted = data.strands[key].cyclesCompleted || 0;
              this.strands[key].lastCycleAt = data.strands[key].lastCycleAt || null;
              this.strands[key].enabled = data.strands[key].enabled ?? true;
              this.strands[key].recentEvents = data.strands[key].recentEvents || [];
            }
          }
        }
        if (Array.isArray(data.replayBuffer)) {
          this.replayBuffer = data.replayBuffer;
        }
        if (data.stats) {
          this.stats = { ...this.stats, ...data.stats };
        }
      }
    } catch (err) {
      console.warn('[RSIOrchestrator] Load notice:', err.message);
    }
  }

  _save() {
    try {
      if (!fs.existsSync(path.dirname(this.filePath))) {
        fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      }
      const data = {
        stats: this.stats,
        strands: this.strands,
        replayBuffer: this.replayBuffer.slice(-50),
      };
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('[RSIOrchestrator] Save error:', err.message);
    }
  }

  setBrain(brainInstance) {
    this.brainRef = brainInstance;
  }

  setBroadcast(fn) {
    this.onBroadcast = fn;
  }

  /**
   * Start the continuous, simultaneous multi-strand engine
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.stats.startedAt = this.stats.startedAt || Date.now();

    console.log('\n═════════════════════════════════════════════════════════════════════');
    console.log('  SIS 1.0 — SIMULTANEOUS & CONTINUOUS RSI MULTI-STRAND ENGINE (L5)  ');
    console.log('═════════════════════════════════════════════════════════════════════');
    console.log('• [Strand 1] RQGM Code & Scaffold Co-Evolution (L5 Autonomy)');
    console.log('• [Strand 2] Absolute Zero Reasoner Self-Play (Zero-Human-Data)');
    console.log('• [Strand 3] AlphaEvolve Dual-Tier Algorithm Discovery (Google DeepMind)');
    console.log('• [Strand 4] SEAL Memory Consolidation & Replay Buffer (Anti-Forgetting)');
    console.log('• Mode: 24/7 Simultaneous Parallel Non-Stop Execution\n');

    // Launch all 4 strands simultaneously with slight staggered startup jitter
    setTimeout(() => this._runStrandFiber('rqgm'), 5000);
    setTimeout(() => this._runStrandFiber('azr'), 15000);
    setTimeout(() => this._runStrandFiber('alphaEvolve'), 25000);
    setTimeout(() => this._runStrandFiber('seal'), 35000);

    // Heartbeat ticker
    this.timers.heartbeat = setInterval(() => {
      this.stats.lastSimultaneousHeartbeat = Date.now();
      this.stats.uptimeMs = Date.now() - (this.stats.startedAt || Date.now());
      this._emitStatus();
    }, 15000);
  }

  /**
   * Stop all strands
   */
  stop() {
    this.isRunning = false;
    for (const key of Object.keys(this.timers)) {
      clearTimeout(this.timers[key]);
      clearInterval(this.timers[key]);
    }
    this.timers = {};
    for (const strand of Object.values(this.strands)) {
      strand.status = 'standby';
    }
    this._save();
    console.log('[RSIOrchestrator] Multi-strand engine stopped.');
    this._emitStatus();
  }

  /**
   * Persistent async fiber loop for a single strand
   */
  async _runStrandFiber(strandId) {
    if (!this.isRunning) return;

    const strand = this.strands[strandId];
    if (!strand || !strand.enabled) {
      // Check again after standard interval if strand is currently disabled
      this.timers[strandId] = setTimeout(() => this._runStrandFiber(strandId), 20000);
      return;
    }

    // Strict Cognitive Gating: If user has an active chat task, yield 100% of compute to chat
    if (
      this.brainRef &&
      (typeof this.brainRef.hasActiveChat === 'function'
        ? this.brainRef.hasActiveChat()
        : this.brainRef.isProcessing)
    ) {
      strand.status = 'task-focused-paused';
      this._emitStatus();
      this.timers[strandId] = setTimeout(() => this._runStrandFiber(strandId), 15000);
      return;
    }

    try {
      strand.status = 'running';
      this._emitStatus();

      // Dispatch to specialized strand runner
      switch (strandId) {
        case 'rqgm':
          await this.executeRQGMStep();
          break;
        case 'azr':
          await this.executeAZRStep();
          break;
        case 'alphaEvolve':
          await this.executeAlphaEvolveStep();
          break;
        case 'seal':
          await this.executeSEALStep();
          break;
      }

      strand.cyclesCompleted++;
      strand.lastCycleAt = Date.now();
      this.stats.totalSimultaneousCycles++;
      try {
        survivalEngine.onRsiCycle();
      } catch {}
      strand.status = 'standby';
    } catch (err) {
      console.warn(`[RSIOrchestrator] Strand [${strandId}] error notice:`, err.message);
      strand.status = 'standby';
      if (/rate limit|429|quota|free-models-per-day/i.test(err.message)) {
        console.warn(
          `[RSIOrchestrator] Strand [${strandId}] backing off 10m due to provider rate limit.`,
        );
        this._save();
        this._emitStatus();
        this.timers[strandId] = setTimeout(() => this._runStrandFiber(strandId), 600000);
        return;
      }
    }

    this._save();
    this._emitStatus();

    // Schedule next iteration of this strand independently
    if (this.isRunning) {
      const baseInterval = this.cadences[strandId] || 180000;
      // Add +/- 15% random jitter to eliminate lock-step synchronization
      const jitter = (Math.random() * 0.3 - 0.15) * baseInterval;
      const nextDelay = Math.max(15000, Math.round(baseInterval + jitter));
      this.timers[strandId] = setTimeout(() => this._runStrandFiber(strandId), nextDelay);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // STRAND 1: RQGM Core Code & Scaffold Co-Evolution (L5)
  // ─────────────────────────────────────────────────────────────
  async executeRQGMStep() {
    const strand = this.strands.rqgm;
    strand.activeTask = 'Co-evolving code scaffold with Red Queen judge...';

    // 1. Sample parent using Huxley Clade Metaproductivity (HGM CMP)
    const topDomain = userFocusTracker.getTopDomain() || 'coding';
    const parentNode = cladeArchive.sampleParent(topDomain);

    const rqPrompt = `You are the Red Queen Gödel Machine (RQGM) Code Evolution Proposer (Level 5 Autonomy).
Parent Clade: "${parentNode.name}" (CMP: ${parentNode.cmpScore.toFixed(3)}, Raw: ${parentNode.rawScore.toFixed(3)})
Domain: ${topDomain}

Evolve a superior production-grade JavaScript/Node.js module, algorithmic tool, or resilient execution scaffold:
- In the "content" field, write complete, self-contained executable code (classes, functions, zero stubs, zero TODOs).
- Include comprehensive edge case handling, bounded memory usage, and atomic operations.
- The Red Queen Judge will strictly reject any high-level prose, placeholder, or incomplete stub.

Output JSON only:
{
  "variantName": "Descriptive name for this evolved variant",
  "domain": "${topDomain}",
  "type": "tool_impl|agent_scaffold",
  "description": "What architectural change this makes and why",
  "content": "Complete runnable JS code implementing the module with full exports",
  "invariants": ["invariant 1", "invariant 2"]
}`;

    let proposal = null;
    try {
      const pRes = await safeLearningAI(
        'You are the RQGM Generator. Return valid JSON only.',
        rqPrompt,
        DEFAULT_MODEL,
        6144,
        90000,
      );
      proposal = extractCleanJSON(pRes);
      if (!proposal) proposal = {};
      if (!proposal.content) {
        // Resilient fallback: extract code fence if model formatted code outside or inside JSON string
        const codeMatch = (pRes || '').match(
          /```(?:javascript|js|typescript|ts)?\s*\r?\n([\s\S]*?)```/i,
        );
        if (codeMatch && codeMatch[1].length > 50) {
          proposal.content = codeMatch[1].trim();
          if (!proposal.variantName) {
            const nameMatch =
              (pRes || '').match(/"variantName"\s*:\s*"([^"]+)"/i) ||
              codeMatch[1].match(/(?:class|function)\s+([a-zA-Z0-9_$]+)/);
            proposal.variantName = nameMatch ? nameMatch[1] : `EvolvedVariant_${Date.now()}`;
          }
          if (!proposal.domain) proposal.domain = topDomain;
          if (!proposal.type) proposal.type = 'tool_impl';
          if (!proposal.description) proposal.description = 'Autonomous evolved module';
        }
      }
      if (!proposal.content) {
        console.warn(
          '[RQGM] Proposal parse notice. pRes length:',
          pRes?.length,
          'Preview:',
          String(pRes).slice(0, 400),
        );
      }
    } catch (e) {
      console.warn('[RQGM] Proposal generation error:', e.message);
    }

    if (!proposal || !proposal.content) {
      // No variant was produced. A canned one would be registered as if it were a
      // real mutation, so the cycle ends without evolving anything.
      strand.activeTask = null;
      console.log('[RQGM] No variant produced this cycle; nothing registered.');
      return;
    }

    // 2. Evaluate using Red Queen Co-Evolving Evaluator
    const evalResult = await redQueenEvaluator.evaluateCandidate(
      `Evolve scaffold variant from parent: ${parentNode.name}`,
      proposal.content,
      topDomain,
    );

    // Without a real score there is no basis to rank this variant, so it is not
    // entered into the archive.
    if (evalResult.unavailable || typeof evalResult.compositeScore !== 'number') {
      strand.activeTask = null;
      console.log(
        `[RQGM] Variant unevaluated (${evalResult.reason || 'no score'}); not registered.`,
      );
      return;
    }

    const isSuperior =
      evalResult.compositeScore >= parentNode.rawScore * 0.98 || evalResult.verdict === 'ACCEPT';

    // 3. Register in Clade Archive
    const registered = cladeArchive.registerVariant({
      parentId: parentNode.id,
      name: proposal.variantName,
      domain: proposal.domain,
      type: proposal.type,
      description: proposal.description,
      content: proposal.content,
      rawScore: evalResult.compositeScore,
      // Stepping-stone status follows the measured score alone. It was previously
      // decided partly by Math.random(), which made the archive non-deterministic.
      isSteppingStone: evalResult.compositeScore < 0.88,
      epoch: redQueenEvaluator.state.currentEpoch,
      metadata: {
        evaluatorVerdict: evalResult.verdict,
        flawsDetected: evalResult.flaws || [],
        antiGamingCheck: evalResult.gamingFlags?.length === 0,
      },
    });

    const event = `[RQGM Epoch ${redQueenEvaluator.state.currentEpoch}] Variant "${registered.name}" scored ${registered.rawScore.toFixed(3)} (CMP: ${registered.cmpScore.toFixed(3)}) -> ${isSuperior ? 'ACCEPTED' : 'STORED AS STEPPING STONE'}`;
    strand.recentEvents.unshift({ text: event, timestamp: Date.now() });
    if (strand.recentEvents.length > 20) strand.recentEvents.pop();

    strand.activeTask = null;
    this._broadcastEvent('rsi-rqgm-evolved', { variant: registered, evaluation: evalResult });
  }

  // ─────────────────────────────────────────────────────────────
  // STRAND 2: Absolute Zero Reasoner (AZR) Self-Play
  // ─────────────────────────────────────────────────────────────
  async executeAZRStep() {
    const strand = this.strands.azr;
    strand.activeTask =
      'Generating zero-human-data computational challenges & solving in sandbox...';

    const topDomain = userFocusTracker.getTopDomain() || 'coding';
    const result = await absoluteZeroEngine.runSelfPlayCycle(topDomain);

    const event = `[AZR Self-Play] Challenge "${result.title}" -> ${result.isVerified ? 'VERIFIED ✓' : 'UNVERIFIED'} (${result.testsPassed}/${result.totalTests} sandbox tests passed)`;
    strand.recentEvents.unshift({ text: event, timestamp: Date.now() });
    if (strand.recentEvents.length > 20) strand.recentEvents.pop();

    strand.activeTask = null;
    this._broadcastEvent('rsi-azr-cycle', result);
  }

  // ─────────────────────────────────────────────────────────────
  // STRAND 3: AlphaEvolve Algorithm & Production Code Discovery
  // ─────────────────────────────────────────────────────────────
  async executeAlphaEvolveStep() {
    const strand = this.strands.alphaEvolve;
    strand.activeTask = 'Evolving microsecond-latency algorithms with dual-tier LLM ensemble...';

    const targetDomain = userFocusTracker.getTopDomain() || '3d';
    const result = await alphaEvolveEngine.runEvolutionCycle(targetDomain);

    const event = `[AlphaEvolve] Evolved "${result.algorithmName}" -> ${result.speedupMultiplier}x speedup (+${result.latencyGainPercent}% latency gain) | ${result.verified ? 'VERIFIED ✓' : 'PARTIAL'}`;
    strand.recentEvents.unshift({ text: event, timestamp: Date.now() });
    if (strand.recentEvents.length > 20) strand.recentEvents.pop();

    strand.activeTask = null;
    this._broadcastEvent('rsi-alpha-evolve', result);
  }

  // ─────────────────────────────────────────────────────────────
  // STRAND 4: SEAL Memory Consolidation & Anti-Forgetting Replay
  // ─────────────────────────────────────────────────────────────
  async executeSEALStep() {
    const strand = this.strands.seal;
    strand.activeTask = 'Consolidating operational memory & testing against replay buffer...';

    // 1. Harvest recent short-term memories
    const stm = shortTermMemory.getRecent(5);
    const topDomain = userFocusTracker.getTopDomain() || 'coding';

    // 2. Anti-catastrophic forgetting replay: Sample older verified breakthroughs deterministically
    this._replayCursor = this._replayCursor || 0;
    const replaySample =
      this.replayBuffer.length > 0
        ? this.replayBuffer[this._replayCursor % this.replayBuffer.length]
        : null;
    this._replayCursor++;

    // 3. Consolidate into Long-Term Memory
    if (stm.length > 0) {
      const distilledContent = stm
        .map((m) => `- [${m.type}]: ${String(m.content).slice(0, 100)}`)
        .join('\n');
      const memoryNode = longTermMemory.store(
        ['rsi-consolidation', topDomain],
        {
          content: `SEAL Consolidated Operational Memory [${topDomain}]:\n${distilledContent}`,
          type: 'consolidated-operational-trace',
          tags: ['seal', 'consolidation', topDomain],
          confidence: 0.98,
          metadata: {
            consolidatedAt: Date.now(),
            domain: topDomain,
          },
        },
        'seal-consolidator',
      );

      // Add to replay buffer
      this.replayBuffer.push({
        id: memoryNode.id,
        domain: topDomain,
        summary: distilledContent.slice(0, 150),
        timestamp: Date.now(),
      });
      if (this.replayBuffer.length > 100) this.replayBuffer.shift();

      // Connect in Knowledge Graph
      knowledgeGraph.addNode(memoryNode.id, `SEAL Consolidation (${topDomain})`, 'memory-trace');
    }

    const event = `[SEAL Replay Buffer] Consolidated memory trace for [${topDomain}]. Active buffer depth: ${this.replayBuffer.length} golden traces.`;
    strand.recentEvents.unshift({ text: event, timestamp: Date.now() });
    if (strand.recentEvents.length > 20) strand.recentEvents.pop();

    strand.activeTask = null;
    this._broadcastEvent('rsi-seal-consolidated', {
      domain: topDomain,
      bufferSize: this.replayBuffer.length,
    });
  }

  triggerStrand(strandId) {
    if (!this.strands[strandId]) throw new Error(`Unknown strand: ${strandId}`);
    console.log(`[RSIOrchestrator] Immediate trigger requested for strand [${strandId}]...`);
    return this._runStrandFiber(strandId);
  }

  toggleStrand(strandId, enabledState = null) {
    if (!this.strands[strandId]) throw new Error(`Unknown strand: ${strandId}`);
    const nextState =
      enabledState !== null ? Boolean(enabledState) : !this.strands[strandId].enabled;
    this.strands[strandId].enabled = nextState;
    this._save();
    this._emitStatus();
    return { strandId, enabled: nextState };
  }

  _broadcastEvent(type, payload) {
    if (this.onBroadcast) {
      try {
        this.onBroadcast(type, payload);
      } catch {}
    }
    if (this.brainRef && typeof this.brainRef.broadcast === 'function') {
      try {
        this.brainRef.broadcast(type, payload);
      } catch {}
    }
  }

  _emitStatus() {
    const statusPayload = this.getStatus();
    this._broadcastEvent('rsi-multi-strand-update', statusPayload);
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      stats: {
        ...this.stats,
        uptimeSeconds: Math.floor((this.stats.uptimeMs || 0) / 1000),
      },
      strands: this.strands,
      cladeStats: cladeArchive.getStats(),
      rqgmState: redQueenEvaluator.getState(),
      azrState: absoluteZeroEngine.getState(),
      alphaEvolveState: alphaEvolveEngine.getState(),
      replayBufferSize: this.replayBuffer.length,
    };
  }
}

const rsiOrchestrator = new RSISimultaneousOrchestrator();
export default rsiOrchestrator;
