// SIS 1.0 — AREM Autonomous Memory Dream Engine
// Inspired by human sleep-dependent memory consolidation & Anthropic's Long-Term Agent Memory
// Orchestrates the Supergence AREM Team to find mistakes, self-repair, prune, and cross-link memories
// Scheduled every 2-3 hours and runs simultaneously/continuously in the background

import aremStore from './arem-memory-store.js';
import aremAgents, { AREM_TEAM_MEMBERS } from './arem-agents.js';
import { EventEmitter } from 'node:events';

export const aremEvents = new EventEmitter();

export const DEFAULT_CADENCE_MS = 2 * 60 * 60 * 1000; // 2 hours
export const MAX_CADENCE_MS = 3 * 60 * 60 * 1000; // 3 hours

export class AremEngine {
  constructor({ store = aremStore, agents = aremAgents, cadenceMs = DEFAULT_CADENCE_MS } = {}) {
    this.store = store;
    this.agents = agents;
    this.cadenceMs = cadenceMs;

    this.isDreaming = false;
    this.dreamProgress = 'idle';
    this.activePulse = null;
    this.timer = null;
    this.isRunning = false;

    this.stats = {
      totalDreamCycles: 0,
      lastDreamTimestamp: null,
      mistakesDiscovered: 0,
      invariantsSynthesized: 0,
      notesPruned: 0,
      wikiPagesCount: 0,
      indexLines: 0,
      recentDreamLogs: [],
    };

    this._restoreInitialStats();
  }

  _restoreInitialStats() {
    const state = this.store.getState();
    if (state) {
      this.stats.totalDreamCycles = state.totalDreamCycles || 0;
      this.stats.lastDreamTimestamp = state.lastDreamTimestamp || null;
      this.stats.mistakesDiscovered = state.totalMistakesFixed || 0;
      this.stats.notesPruned = state.totalNotesCurated || 0;
    }
    const pages = this.store.listWikiPages();
    this.stats.wikiPagesCount = pages.length;
    const index = this.store.getIndex();
    this.stats.indexLines = index ? index.split('\n').length : 0;
  }

  startScheduler(cadenceMs = this.cadenceMs) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.cadenceMs = cadenceMs;

    console.log(
      `[AREM] 🌌 Autonomous Memory Dream Scheduler online (cadence: ${Math.round(cadenceMs / 60000)}m / 2-3 hrs)`,
    );

    // Initial check: if never dreamed, schedule a dream soon
    const elapsedSinceLast = Date.now() - (this.stats.lastDreamTimestamp || 0);
    const initialDelay = this.stats.lastDreamTimestamp
      ? Math.max(30000, cadenceMs - elapsedSinceLast)
      : 15000;

    this._scheduleNextDream(initialDelay);
  }

  _scheduleNextDream(delayMs) {
    if (this.timer) clearTimeout(this.timer);
    if (!this.isRunning) return;

    this.timer = setTimeout(async () => {
      try {
        await this.runDreamCycle();
      } catch (err) {
        console.warn('[AREM] Dream cycle error:', err.message);
      } finally {
        // Add random jitter between 2 and 3 hours for human-like circadian variation
        const jitter = Math.floor(Math.random() * (MAX_CADENCE_MS - DEFAULT_CADENCE_MS));
        const nextInterval = this.cadenceMs + jitter;
        this._scheduleNextDream(nextInterval);
      }
    }, delayMs);
  }

  stopScheduler() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('[AREM] Memory Dream Scheduler paused.');
  }

  /**
   * Runs the complete multi-agent dream consolidation cycle:
   * 1. Arem-Inspector audits transcripts for mistakes & flaws.
   * 2. Arem-Corrector synthesizes zero-regression invariants ("never/always").
   * 3. Arem-Curator deduplicates, prunes bloat, and resolves contradictions.
   * 4. Arem-Cartographer structures wiki notes and bounds the Top-Layer Index (<200 lines).
   */
  async runDreamCycle({ simultaneous = false, manualTrigger = false } = {}) {
    if (this.isDreaming && !simultaneous) {
      console.log(
        '[AREM] A dream consolidation cycle is already active. Skipping overlapping run.',
      );
      return { status: 'already_running', cycle: this.stats.totalDreamCycles };
    }

    this.isDreaming = true;
    const cycleId = `dream-${Date.now()}`;
    const startTime = Date.now();
    console.log(
      `[AREM] 🌌 Starting Dream Consolidation Cycle #${this.stats.totalDreamCycles + 1} (${cycleId})`,
    );

    this._broadcastPulse({
      stage: 'initiating_dream',
      agentId: 'arem-dreammaster',
      agentName: 'Arem-DreamMaster',
      action: 'Entering REM Memory Consolidation State...',
      details: 'Waking the Supergence AREM Team to reflect and synthesize experiences.',
    });

    const dreamReport = {
      cycleId,
      startTime,
      mistakesFound: [],
      invariantsCreated: [],
      curatedPages: [],
      indexUpdated: false,
    };

    try {
      // ─── STEP 1: Gather Episodic Transcripts ───
      this.dreamProgress = 'gathering_episodes';
      let transcripts = this.store.getUnconsolidatedTranscripts(50);
      if (transcripts.length === 0) {
        // Offline replay: inspect recent history to deepen patterns even during quiet periods
        transcripts = this.store.getRecentTranscripts(15);
      }

      const existingPages = this.store.listWikiPages().map((p) => ({
        ...p,
        content: this.store.readWikiPage(p.slug)?.content || '',
      }));
      const existingSummary = existingPages.map((p) => `- [[${p.slug}]]: ${p.title}`).join('\n');

      // ─── STEP 2: Arem-Inspector Audits Transcripts ───
      this.dreamProgress = 'auditing_transcripts';
      this._broadcastPulse({
        stage: 'auditing_transcripts',
        agentId: 'arem-inspector',
        agentName: 'Arem-Inspector',
        action: 'Auditing episodic traces and identifying flaws...',
        details: `Examining ${transcripts.length} session transcripts for latent mistakes and user corrections.`,
      });

      const mistakes = await this.agents.inspectTranscripts({
        transcripts,
        existingNotesSummary: existingSummary,
      });

      dreamReport.mistakesFound = mistakes;
      this.stats.mistakesDiscovered += mistakes.length;

      // ─── STEP 3: Arem-Corrector Synthesizes Invariants ───
      this.dreamProgress = 'synthesizing_corrections';
      this._broadcastPulse({
        stage: 'synthesizing_corrections',
        agentId: 'arem-corrector',
        agentName: 'Arem-Corrector',
        action: 'Synthesizing zero-regression invariants & procedures...',
        details: `Formulating ${mistakes.length} permanent rules ("never do X / always do Y") to prevent regression.`,
      });

      const fixes = await this.agents.synthesizeCorrections({
        mistakes,
        currentInvariants: [],
      });

      dreamReport.invariantsCreated = fixes;
      this.stats.invariantsSynthesized += fixes.length;

      // ─── STEP 4: Arem-Curator Prunes & Deduplicates ───
      this.dreamProgress = 'curating_memory';
      this._broadcastPulse({
        stage: 'curating_memory',
        agentId: 'arem-curator',
        agentName: 'Arem-Curator',
        action: 'Pruning bloat, deduplicating, and resolving contradictions...',
        details:
          'Reviewing wiki notes to ensure memories remain lean, truthful, and non-redundant.',
      });

      const curatedPages = await this.agents.curateAndPrune({
        existingPages,
        newFixes: fixes,
      });

      dreamReport.curatedPages = curatedPages;
      const prunedCount = curatedPages.reduce((acc, p) => acc + (p.prunedItemsCount || 0), 0);
      this.stats.notesPruned += prunedCount;

      // ─── STEP 5: Arem-Cartographer Weaves Wiki & Bounds Top Index ───
      this.dreamProgress = 'compiling_wiki_index';
      this._broadcastPulse({
        stage: 'compiling_wiki_index',
        agentId: 'arem-cartographer',
        agentName: 'Arem-Cartographer',
        action: 'Weaving cross-linked Markdown wiki pages & compiling bounded index...',
        details: 'Enforcing strictly bounded <200 lines and <25KB top-layer prompt index.',
      });

      const compiled = await this.agents.compileIndexAndWiki({
        curatedPages,
        topInvariants: fixes.filter((f) => f.promoteToTopIndex || f.invariantNever),
      });

      // Save wiki pages to disk
      if (Array.isArray(compiled?.wikiPages)) {
        for (const wp of compiled.wikiPages) {
          if (wp.slug && wp.markdown) {
            this.store.writeWikiPage(wp.slug, wp.markdown, { title: wp.title });
          }
        }
      }

      // If curator returned updated pages, ensure they are also persisted
      for (const cp of curatedPages) {
        if (cp.slug && cp.content) {
          this.store.writeWikiPage(cp.slug, cp.content, { title: cp.title });
        }
      }

      // Update Top-Layer Index
      if (compiled?.indexContent) {
        const bounded = this.store.updateIndex(compiled.indexContent);
        dreamReport.indexUpdated = true;
        this.stats.indexLines = bounded.split('\n').length;
      }

      // Mark processed transcripts as consolidated
      this.store.markTranscriptsConsolidated(transcripts.map((t) => t.id));

      // ─── STEP 6: Finalize Dream Cycle ───
      this.stats.totalDreamCycles++;
      this.stats.lastDreamTimestamp = Date.now();
      this.stats.wikiPagesCount = this.store.listWikiPages().length;
      this.store.updateState({
        lastDreamTimestamp: this.stats.lastDreamTimestamp,
        totalDreamCycles: this.stats.totalDreamCycles,
        totalMistakesFixed: this.stats.mistakesDiscovered,
        totalNotesCurated: this.stats.notesPruned,
      });

      dreamReport.durationMs = Date.now() - startTime;
      this.stats.recentDreamLogs.unshift(dreamReport);
      if (this.stats.recentDreamLogs.length > 20) this.stats.recentDreamLogs.pop();

      this._broadcastPulse({
        stage: 'completed',
        agentId: 'arem-dreammaster',
        agentName: 'Arem-DreamMaster',
        action: 'Memory Consolidation Cycle Complete',
        details: `Dream cycle finished in ${Math.round(dreamReport.durationMs / 1000)}s: ${mistakes.length} flaws resolved, ${fixes.length} invariants synthesized, top index bounded.`,
      });

      console.log(
        `[AREM] ✨ Dream Cycle #${this.stats.totalDreamCycles} complete in ${dreamReport.durationMs}ms. Memory updated and bounded.`,
      );
      return { status: 'success', report: dreamReport };
    } catch (err) {
      console.error('[AREM] Dream cycle failed:', err);
      this._broadcastPulse({
        stage: 'error',
        agentId: 'arem-dreammaster',
        agentName: 'Arem-DreamMaster',
        action: 'Dream cycle encountered an exception',
        details: err.message,
      });
      return { status: 'error', error: err.message };
    } finally {
      this.isDreaming = false;
      this.dreamProgress = 'idle';
    }
  }

  _broadcastPulse(pulse) {
    this.activePulse = { ...pulse, timestamp: Date.now() };
    try {
      aremEvents.emit('pulse', this.activePulse);
      if (globalThis.__supergence_brain?.broadcast) {
        globalThis.__supergence_brain.broadcast('arem:pulse', this.activePulse);
      }
    } catch (_) {}
  }

  getTopLayerIndex() {
    return this.store.getIndex();
  }

  searchMemory(query, limit = 5) {
    return this.store.searchWiki(query, limit);
  }

  getStatus() {
    return {
      name: 'Supergence AREM Memory System',
      version: '3.0.0-ANTHROPIC',
      isRunning: this.isRunning,
      isDreaming: this.isDreaming,
      dreamProgress: this.dreamProgress,
      activePulse: this.activePulse,
      cadenceHours: Number((this.cadenceMs / (60 * 60 * 1000)).toFixed(1)),
      stats: { ...this.stats },
      team: AREM_TEAM_MEMBERS,
      wikiPagesCount: this.store.listWikiPages().length,
      indexLines: this.store.getIndex().split('\n').length,
    };
  }
}

export const aremEngine = new AremEngine();
export default aremEngine;
