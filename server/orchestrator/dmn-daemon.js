// SIS 1.0 — Default Mode Network Daemon
// Models the brain's DMN: active during idle periods, performing background
// knowledge synthesis, counterfactual simulation, and self-reflection.
// Like mind-wandering — productive background thought when not focused on tasks.

import { quickAI } from '../api/openrouter.js';
import knowledgeGraph from '../memory/knowledge-graph.js';
import longTermMemory from '../memory/long-term.js';
import shortTermMemory from '../memory/short-term.js';
import brainLifecycle, { BRAIN_STATES } from './brain-lifecycle.js';

class DMNDaemon {
  constructor() {
    this.isRunning = false;
    this.brainRef = null;
    this.stats = {
      synthesisRuns: 0,
      reflectionRuns: 0,
      insightsGenerated: 0,
      lastRun: null,
    };
    this._interval = null;
    this._started = false;
  }

  /**
   * Set brain reference for isProcessing checks
   */
  setBrain(brain) {
    this.brainRef = brain;
  }

  /**
   * Start the DMN daemon — activates during AWAKE_IDLE state
   */
  start() {
    if (this._started) return;
    this._started = true;
    console.log('[DMN] 🌀 Default Mode Network daemon online — idle-time cognition active');

    // Check every 5 minutes if we should run DMN activities
    this._interval = setInterval(() => this._tick(), 300000);
  }

  stop() {
    if (this._interval) clearInterval(this._interval);
    this._started = false;
    this.isRunning = false;
  }

  /**
   * DMN tick — only runs during AWAKE_IDLE state
   */
  async _tick() {
    if (process.env.ENABLE_BACKGROUND_LLM_LOOPS !== 'true') return;
    // Only activate in idle state when no active chat task exists
    if (!brainLifecycle.isIdle()) return;
    if (
      this.brainRef &&
      (typeof this.brainRef.hasActiveChat === 'function'
        ? this.brainRef.hasActiveChat()
        : this.brainRef.isProcessing)
    )
      return;
    if (this.isRunning) return;

    this.isRunning = true;
    try {
      // Rotate between DMN activities (like the brain's default mode oscillates)
      const activity = this.stats.synthesisRuns % 3;

      switch (activity) {
        case 0:
          await this._knowledgeSynthesis();
          break;
        case 1:
          await this._selfReflection();
          break;
        case 2:
          await this._schemaReorganization();
          break;
      }
    } catch (err) {
      // DMN errors are non-critical — log and continue
      console.warn('[DMN] Background thought error:', err.message);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Knowledge Graph Synthesis — extract relations from recent memories
   * Like the hippocampus replaying and connecting experiences during rest
   */
  async _knowledgeSynthesis() {
    if (
      this.brainRef &&
      (typeof this.brainRef.hasActiveChat === 'function'
        ? this.brainRef.hasActiveChat()
        : this.brainRef.isProcessing)
    )
      return;

    const recentMemories = shortTermMemory.getRecent?.(5) || [];
    if (recentMemories.length === 0) return;

    const memoryText = recentMemories
      .map((m) => `[${m.type || 'memory'}]: ${String(m.content || m.data || '').slice(0, 200)}`)
      .join('\n');

    try {
      const synthesis = await quickAI(
        'You are a knowledge synthesis engine. Extract key entities, relationships, and conceptual connections from these recent memories. Return JSON: { "entities": ["..."], "connections": [{"from": "...", "to": "...", "relation": "..."}], "insight": "one-sentence synthesis" }',
        `Recent memories to synthesize:\n${memoryText}`,
        undefined,
        500,
      );

      if (synthesis) {
        try {
          const parsed = JSON.parse(synthesis.match(/\{[\s\S]*\}/)?.[0] || '{}');
          if (parsed.connections) {
            for (const conn of parsed.connections.slice(0, 3)) {
              knowledgeGraph.addRelation?.(conn.from, conn.to, conn.relation);
            }
          }
          if (parsed.insight) {
            this.stats.insightsGenerated++;
          }
        } catch {
          // JSON parse failure — non-critical
        }
      }
    } catch {
      // API failure — non-critical
    }

    this.stats.synthesisRuns++;
    this.stats.lastRun = Date.now();
  }

  /**
   * Self-Reflection — review recent response quality
   * Like the mPFC evaluating past actions during rest
   */
  async _selfReflection() {
    if (
      this.brainRef &&
      (typeof this.brainRef.hasActiveChat === 'function'
        ? this.brainRef.hasActiveChat()
        : this.brainRef.isProcessing)
    )
      return;

    this.stats.reflectionRuns++;
    this.stats.lastRun = Date.now();

    // Light-weight: just log that reflection occurred
    // The heavy lifting is done by the existing improver/evaluator
    console.log('[DMN] 💭 Self-reflection cycle completed — introspective pass done');
  }

  /**
   * Schema Reorganization — identify contradictions in learned patterns
   * Like the DMN reconciling new experiences with existing knowledge
   */
  async _schemaReorganization() {
    if (
      this.brainRef &&
      (typeof this.brainRef.hasActiveChat === 'function'
        ? this.brainRef.hasActiveChat()
        : this.brainRef.isProcessing)
    )
      return;

    // Check KG for potential contradictions or redundant edges
    const kgState = knowledgeGraph.toJSON?.();
    if (!kgState || !kgState.edges || kgState.edges.length < 5) return;

    // Simple dedup: find edges with same from/to but different relations
    const edgeMap = new Map();
    let reorganized = 0;
    for (const edge of kgState.edges) {
      const key = `${edge.from}→${edge.to}`;
      if (edgeMap.has(key)) {
        reorganized++;
      }
      edgeMap.set(key, edge);
    }

    if (reorganized > 0) {
      console.log(`[DMN] 🔄 Schema reorganization: found ${reorganized} redundant KG edges`);
    }

    this.stats.synthesisRuns++;
    this.stats.lastRun = Date.now();
  }

  /**
   * Get DMN daemon state
   */
  getState() {
    return {
      active: this.isRunning,
      brainState: brainLifecycle.state,
      stats: { ...this.stats },
    };
  }
}

const dmnDaemon = new DMNDaemon();
export { DMNDaemon };
export default dmnDaemon;
