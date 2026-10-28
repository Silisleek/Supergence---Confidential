// SIS 1.0 — Sleep Consolidation Engine
// Models NREM deep sleep (experience replay, STM→LTM transfer) and
// REM dreaming (synthetic stress-testing, overfitting prevention).
// Activates during LIGHT_SLEEP, DEEP_SLEEP, and REM_DREAMING states.

import { quickAI } from '../api/openrouter.js';
import shortTermMemory from '../memory/short-term.js';
import longTermMemory from '../memory/long-term.js';
import homeostasis from './homeostasis.js';
import brainLifecycle, { BRAIN_STATES } from './brain-lifecycle.js';

class SleepEngine {
  constructor() {
    this.brainRef = null;
    this.isConsolidating = false;
    this.stats = {
      nremCycles: 0,
      remCycles: 0,
      memoriesPromoted: 0,
      memoriesPruned: 0,
      syntheticTestsRun: 0,
      lastConsolidation: null,
    };
    this._interval = null;
    this._started = false;
  }

  setBrain(brain) {
    this.brainRef = brain;
  }

  start() {
    if (this._started) return;
    this._started = true;
    console.log('[SleepEngine] 😴 Sleep consolidation engine online — memory maintenance ready');

    // Check every 30 seconds if we should run consolidation
    this._interval = setInterval(() => this._tick(), 30000);
  }

  stop() {
    if (this._interval) clearInterval(this._interval);
    this._started = false;
  }

  async _tick() {
    if (this.brainRef?.isProcessing) return;
    if (this.isConsolidating) return;

    // Only run when user has placed the brain in sleep mode
    if (!brainLifecycle.isSleeping()) return;

    const state = brainLifecycle.state;
    if (state === BRAIN_STATES.DEEP_SLEEP) {
      await this._deepConsolidation();
    } else if (state === BRAIN_STATES.REM_DREAMING) {
      await this._remDreaming();
    }
  }

  /**
   * Light Sleep — quick memory tagging and prioritization
   * Like Stage 2 NREM: sleep spindles organizing memory traces
   */
  async _lightConsolidation() {
    if (this.brainRef?.isProcessing) return;
    this.isConsolidating = true;

    try {
      // Tag recent STM entries with importance scores
      const stmTree = shortTermMemory.getTree?.();
      if (stmTree && stmTree.nodes) {
        let tagged = 0;
        for (const node of Object.values(stmTree.nodes).slice(0, 10)) {
          if (!node._sleepTagged) {
            node._sleepTagged = true;
            node._importance = this._estimateImportance(node);
            tagged++;
          }
        }
        if (tagged > 0) {
          console.log(`[SleepEngine] 💤 Light consolidation: tagged ${tagged} memory nodes`);
        }
      }

      // Reduce sleep pressure slightly
      homeostasis.reduceSleepPressure(5);
    } catch (err) {
      console.warn('[SleepEngine] Light consolidation error:', err.message);
    } finally {
      this.isConsolidating = false;
    }
  }

  /**
   * Deep Sleep (NREM SWS) — heavy experience replay and STM→LTM transfer
   * Like sharp-wave ripples replaying experiences at 10-20x speed
   */
  async _deepConsolidation() {
    if (this.brainRef?.isProcessing) return;
    this.isConsolidating = true;

    try {
      const stmTree = shortTermMemory.getTree?.();
      if (!stmTree || !stmTree.nodes) return;

      const candidates = Object.values(stmTree.nodes)
        .filter((n) => n._importance >= 0.7 || (n.accessCount && n.accessCount >= 2))
        .slice(0, 5);

      for (const node of candidates) {
        if (this.brainRef?.isProcessing) break; // Instant wake check

        try {
          // Promote high-importance memories to LTM
          const content = String(node.content || node.data || '').slice(0, 500);
          if (content.length > 20) {
            longTermMemory.store?.(
              ['sleep', 'consolidated'],
              {
                content,
                importance: node._importance || 0.8,
                tags: node.tags || [],
                timestamp: Date.now(),
              },
              'sleep-consolidation-nrem',
            );
            this.stats.memoriesPromoted++;
          }
        } catch {
          // Individual memory promotion failure — continue
        }
      }

      this.stats.nremCycles++;
      this.stats.lastConsolidation = Date.now();
      homeostasis.reduceSleepPressure(15);
      console.log(
        `[SleepEngine] 🧠 Deep NREM consolidation: ${candidates.length} memories replayed, ${this.stats.memoriesPromoted} total promoted`,
      );
    } catch (err) {
      console.warn('[SleepEngine] Deep consolidation error:', err.message);
    } finally {
      this.isConsolidating = false;
    }
  }

  /**
   * REM Dreaming — synthetic stress-testing and overfitting prevention
   * Like dreams generating out-of-distribution scenarios to prevent brittle learning
   */
  async _remDreaming() {
    if (this.brainRef?.isProcessing) return;
    this.isConsolidating = true;

    try {
      // Generate a synthetic out-of-distribution challenge
      const recentTopics = shortTermMemory
        .getRecent?.(3)
        ?.map((m) => String(m.content || '').slice(0, 100))
        .filter(Boolean) || ['general knowledge'];

      const dreamPrompt = `Based on these recent conversation topics: ${recentTopics.join('; ')} — generate ONE unexpected, edge-case question that tests robustness. Return ONLY the question, nothing else.`;

      const dream = await quickAI(
        'You are a dream generator that creates unexpected test scenarios.',
        dreamPrompt,
        undefined,
        200,
      );

      if (dream && dream.trim().length > 10) {
        this.stats.syntheticTestsRun++;
        console.log(`[SleepEngine] 🌙 REM dream generated: "${dream.trim().slice(0, 80)}..."`);
      }

      this.stats.remCycles++;
      this.stats.lastConsolidation = Date.now();
      homeostasis.reduceSleepPressure(10);
    } catch (err) {
      console.warn('[SleepEngine] REM dreaming error:', err.message);
    } finally {
      this.isConsolidating = false;
    }
  }

  /**
   * Estimate memory importance (0-1) based on heuristics
   */
  _estimateImportance(node) {
    let score = 0.5;
    const content = String(node.content || node.data || '');

    // Longer content = more detail = more important
    if (content.length > 200) score += 0.1;
    if (content.length > 500) score += 0.1;

    // Frequently accessed = important
    if (node.accessCount >= 2) score += 0.15;
    if (node.accessCount >= 5) score += 0.1;

    // User input memories are more important than system
    if (node.type === 'user-input') score += 0.1;
    if (node.type === 'correction') score += 0.2;

    return Math.min(1, score);
  }

  getState() {
    return {
      isConsolidating: this.isConsolidating,
      brainState: brainLifecycle.state,
      stats: { ...this.stats },
    };
  }
}

const sleepEngine = new SleepEngine();
export { SleepEngine };
export default sleepEngine;
