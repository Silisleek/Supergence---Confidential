// SIS 1.0 — Glymphatic System Daemon (Glial Maintenance & Waste Clearance)
// Models the human brain's glymphatic clearance: predominantly active during
// deep sleep (NREM). Flushes cognitive debris, prunes dead memories, clears
// orphaned context, and defragments memory trees to prevent mental bloat.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import shortTermMemory from '../memory/short-term.js';
import longTermMemory from '../memory/long-term.js';
import knowledgeGraph from '../memory/knowledge-graph.js';
import brainLifecycle, { BRAIN_STATES } from './brain-lifecycle.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class GlymphaticDaemon {
  constructor() {
    this.brainRef = null;
    this.isFlushing = false;
    this.stats = {
      flushCycles: 0,
      staleMemoriesPruned: 0,
      orphanedFilesRemoved: 0,
      kgEdgesPruned: 0,
      lastFlushTime: null,
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
    console.log('[Glymphatics] 🧹 Glymphatic clearance system online — waste management ready');

    // Check every 45s if deep sleep maintenance should execute
    this._interval = setInterval(() => this._tick(), 45000);
  }

  stop() {
    if (this._interval) clearInterval(this._interval);
    this._started = false;
  }

  async _tick() {
    if (this.brainRef?.isProcessing) return;
    if (this.isFlushing) return;

    // Only run convective clearance when the brain enters deep sleep
    const state = brainLifecycle.state;
    if (state !== BRAIN_STATES.DEEP_SLEEP && state !== BRAIN_STATES.LIGHT_SLEEP) {
      return;
    }

    await this.runConvectiveClearance();
  }

  /**
   * Run full convective glymphatic clearance pass
   */
  async runConvectiveClearance() {
    if (this.isFlushing) return;
    this.isFlushing = true;

    try {
      console.log('[Glymphatics] 🌊 Initiating convective glymphatic clearance pass...');
      let prunedMemories = 0;
      let removedFiles = 0;

      // 1. Prune Short-Term Memory Debris
      try {
        const removed = shortTermMemory.cleanup();
        prunedMemories += removed || 0;
      } catch (err) {
        console.warn('[Glymphatics] STM cleanup warning:', err.message);
      }

      // 2. Prune Sandbox & Stale Run Folders
      try {
        const sandboxDir = path.join(__dirname, '../../workspace/.sandbox');
        if (fs.existsSync(sandboxDir)) {
          const entries = fs.readdirSync(sandboxDir);
          const now = Date.now();
          for (const entry of entries) {
            const fullPath = path.join(sandboxDir, entry);
            const stat = fs.statSync(fullPath);
            // If older than 1 hour, purge
            if (now - stat.mtimeMs > 60 * 60 * 1000) {
              fs.rmSync(fullPath, { recursive: true, force: true });
              removedFiles++;
            }
          }
        }
      } catch (err) {
        console.warn('[Glymphatics] Sandbox purge warning:', err.message);
      }

      // 3. Compact Knowledge Graph isolated nodes
      try {
        const graph = knowledgeGraph.toJSON?.();
        if (graph && Array.isArray(graph.nodes) && Array.isArray(graph.edges)) {
          const connectedIds = new Set();
          for (const e of graph.edges) {
            connectedIds.add(e.from);
            connectedIds.add(e.to);
          }
          // Count isolated nodes that have no edges and are older than 24h
          let isolated = 0;
          for (const n of graph.nodes) {
            if (!connectedIds.has(n.id) && Date.now() - (n.createdAt || 0) > 24 * 60 * 60 * 1000) {
              isolated++;
            }
          }
          if (isolated > 0) {
            console.log(`[Glymphatics] Identified ${isolated} isolated conceptual fragments in KG`);
          }
        }
      } catch (err) {
        console.warn('[Glymphatics] KG compaction warning:', err.message);
      }

      this.stats.flushCycles++;
      this.stats.staleMemoriesPruned += prunedMemories;
      this.stats.orphanedFilesRemoved += removedFiles;
      this.stats.lastFlushTime = Date.now();

      console.log(
        `[Glymphatics] ✨ Convective pass complete: ${prunedMemories} memories cleared, ${removedFiles} orphaned files pruned`,
      );
    } catch (err) {
      console.warn('[Glymphatics] Clearance pass error:', err.message);
    } finally {
      this.isFlushing = false;
    }
  }

  getState() {
    return {
      isFlushing: this.isFlushing,
      brainState: brainLifecycle.state,
      stats: { ...this.stats },
    };
  }
}

const glymphaticDaemon = new GlymphaticDaemon();
export { GlymphaticDaemon };
export default glymphaticDaemon;
