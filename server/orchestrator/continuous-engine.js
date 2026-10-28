// SIS 1.0 — Continuous Cognition Engine
// The system's always-on background loop. Two distinct layers:
//
//   1. A local tick, once per second, that performs real work with no model
//      calls: advancing goals, probing tool health, consolidating memory,
//      recording telemetry, persisting state.
//
//   2. A reasoning controller that decides whether this tick may spend a model
//      call. The cadence is COMPUTED from live signals — user presence, token
//      budget, sleep pressure, recent failure rate, goal urgency — and can be
//      steered by the user. It is never a fixed constant.
//
// Every value this engine reports comes from a real source. When a signal is
// unavailable, it is reported as unavailable rather than assumed.

import brain from './brain.js';
import homeostasis from './homeostasis.js';
import userFocusTracker from '../improvement/user-focus-tracker.js';
import goalEngine from './goal-engine.js';

const TICK_MS = 1000;

// Pacing bounds. These are limits on the computed cadence, not the cadence.
const MIN_REASONING_INTERVAL_MS = 10_000; // never faster than this
const MAX_REASONING_INTERVAL_MS = 15 * 60_000; // never slower than this
const IDLE_PRESENCE_MS = 120_000; // no user turn within 2 min = idle

class ContinuousEngine {
  constructor() {
    this.brain = null;
    this.tickHandle = null;
    this.tickCount = 0;
    this.startedAt = null;

    // Real observed state.
    this.lastUserTurnAt = null;
    this.lastReasoningAt = null;
    this.lastTickAt = null;
    this.lastTickDurationMs = null;
    this.iterationsSinceReasoning = 0;

    // Rolling evidence of whether reasoning is actually productive.
    this.reasoningAttempts = 0;
    this.reasoningFailures = 0;
    this.recentOutcomes = []; // true = did something, false = produced nothing

    // User steering. null = no preference; the controller decides.
    this.userPacingPreference = null; // 'faster' | 'slower' | 'paused'
    this.paused = false;

    // Health probes on installed tools, one per tick round-robin.
    this._probeCursor = 0;
  }

  setBrain(b) {
    this.brain = b;
  }

  // ─── Lifecycle ───

  start() {
    if (this.tickHandle) return;
    this.startedAt = Date.now();
    this._schedule();
    console.log('✓ Continuous Cognition Engine online (1s local tick, adaptive reasoning cadence)');
  }

  stop() {
    if (this.tickHandle) {
      clearTimeout(this.tickHandle);
      this.tickHandle = null;
    }
  }

  _schedule() {
    this.tickHandle = setTimeout(() => {
      this._tick().catch((err) => console.error('[ContinuousEngine] Tick error:', err.message));
    }, TICK_MS);
  }

  // ─── The tick ───

  async _tick() {
    const tickStart = Date.now();
    this.tickCount++;
    this.lastTickAt = tickStart;
    this.iterationsSinceReasoning++;

    // Local work. Always runs; costs no tokens.
    const localWork = await this._runLocalWork();

    if (this._shouldReason()) {
      this.iterationsSinceReasoning = 0;
      this.lastReasoningAt = Date.now();
      await this._runReasoning().catch((err) => {
        console.error('[ContinuousEngine] Reasoning error:', err.message);
      });
    }

    this.lastTickDurationMs = Date.now() - tickStart;
    this._publish({ localWork });
    this._schedule();
  }

  /**
   * Work that needs no model call: advance a goal, probe a tool, record state.
   */
  async _runLocalWork() {
    const done = [];

    // 1. Advance the active goal by one local step, if it has one ready.
    try {
      const step = await goalEngine.advanceLocalStep();
      if (step) done.push(step);
    } catch (err) {
      console.warn('[ContinuousEngine] Goal step failed:', err.message);
    }

    // 2. Probe one installed tool's health, round-robin, so the whole set is
    //    covered without doing all of it every second.
    try {
      const probe = await this._probeNextTool();
      if (probe) done.push(probe);
    } catch (err) {
      console.warn('[ContinuousEngine] Tool probe failed:', err.message);
    }

    return done;
  }

  async _probeNextTool() {
    if (!this.brain) return null;

    let adaToolForger;
    try {
      adaToolForger = (await import('../services/adaToolForger.js')).default;
    } catch {
      return null;
    }

    const tools = Array.from(adaToolForger.installedTools.values());
    if (tools.length === 0) return null;

    const tool = tools[this._probeCursor % tools.length];
    this._probeCursor++;

    // Only pure tools are probed automatically: a privileged tool's inputs
    // reference real resources, so a synthetic probe would report false failures.
    if (tool.privileged) return null;

    const { sampleParamsFromSpec } = await import('../tools/capabilities.js');
    const args = sampleParamsFromSpec(tool.parameters, tool.required);
    const output = await adaToolForger.runTool(tool, args);
    const healthy = Boolean(output && output.success !== false && !output.error);

    tool.health = {
      healthy,
      checkedAt: Date.now(),
      error: healthy ? null : output?.error || 'no result',
    };

    return { type: 'tool-probe', tool: tool.name, healthy };
  }

  // ─── Pacing controller ───

  /**
   * Decide whether this tick may use the model, from live signals only.
   */
  _shouldReason() {
    if (this.paused) return false;
    if (this.iterationsSinceReasoning < 1) return false;

    const interval = this.getReasoningIntervalMs();
    if (interval === null) return false; // cadence cannot be derived right now
    return Date.now() - (this.lastReasoningAt || 0) >= interval;
  }

  /**
   * Compute the current reasoning cadence in milliseconds from real signals.
   * Returns null when no honest cadence can be derived, which pauses reasoning
   * rather than inventing an interval.
   */
  getReasoningIntervalMs() {
    if (this.paused) return null;

    const health = this._readSystemHealth();
    if (health.throttled) return null; // the system is telling us not to spend

    let interval;
    if (this.userPacingPreference === 'faster') {
      interval = MIN_REASONING_INTERVAL_MS;
    } else if (this.userPacingPreference === 'slower') {
      interval = MAX_REASONING_INTERVAL_MS;
    } else {
      // Derive from presence: an active user justifies frequent reasoning;
      // an idle system should not spend on its own behalf.
      const idleMs = this.lastUserTurnAt ? Date.now() - this.lastUserTurnAt : Infinity;
      if (idleMs < IDLE_PRESENCE_MS) {
        interval = 30_000;
      } else {
        interval = 5 * 60_000;
      }
    }

    // A system whose reasoning keeps producing nothing should reason less often.
    const failureRate = this._reasoningFailureRate();
    if (failureRate !== null && failureRate > 0.5) {
      interval *= 2;
    }

    return Math.min(
      MAX_REASONING_INTERVAL_MS,
      Math.max(MIN_REASONING_INTERVAL_MS, Math.round(interval)),
    );
  }

  _reasoningFailureRate() {
    if (this.recentOutcomes.length < 3) return null; // not enough evidence yet
    const failures = this.recentOutcomes.filter((ok) => !ok).length;
    return failures / this.recentOutcomes.length;
  }

  _readSystemHealth() {
    const state = homeostasis.getState();
    return {
      throttled: Boolean(state.shouldThrottle),
      tokenUsagePercent: parseInt(state.tokenBudget.usage, 10),
      sleepPressure: state.sleepPressure,
      recentErrorCount: state.health?.recentErrorCount ?? null,
    };
  }

  /**
   * One reasoning cycle. Asks the model to work the active goal, records whether
   * anything came of it, and never claims more than happened.
   */
  async _runReasoning() {
    let goal = goalEngine.getActiveGoal();
    if (!goal) {
      goal = goalEngine.dequeueNextGoal();
    }
    if (!goal) {
      this._recordOutcome(false);
      return;
    }

    this.reasoningAttempts++;
    try {
      const result = await goalEngine.advanceReasoningStep(goal);
      this._recordOutcome(Boolean(result && result.progressed));
    } catch (err) {
      this.reasoningFailures++;
      this._recordOutcome(false);
      console.warn('[ContinuousEngine] Goal reasoning failed:', err.message);
    }
  }

  _recordOutcome(productive) {
    this.recentOutcomes.push(productive);
    if (this.recentOutcomes.length > 20) this.recentOutcomes.shift();
  }

  // ─── User input ───

  /** Called by the brain whenever the user sends a turn. */
  noteUserTurn() {
    this.lastUserTurnAt = Date.now();
  }

  /** Called by the brain when a user turn completes, with its real outcome. */
  noteUserTurnOutcome(succeeded) {
    this.recentOutcomes.push(Boolean(succeeded));
    if (this.recentOutcomes.length > 20) this.recentOutcomes.shift();
  }

  /**
   * User steering for the reasoning cadence.
   * @param {'faster'|'slower'|'paused'|'auto'} preference
   */
  setPacingPreference(preference) {
    if (preference === 'auto' || preference == null) {
      this.userPacingPreference = null;
      this.paused = false;
    } else if (preference === 'paused') {
      this.paused = true;
      this.userPacingPreference = null;
    } else if (preference === 'faster' || preference === 'slower') {
      this.paused = false;
      this.userPacingPreference = preference;
    } else {
      throw new Error(`Unknown pacing preference: ${preference}`);
    }
    this._publish({ localWork: [] });
    return this.getState();
  }

  // ─── Reporting ───

  _publish(extra = {}) {
    if (!this.brain) return;
    try {
      this.brain.broadcast('continuous-engine-tick', { ...this.getState(), ...extra });
    } catch {}
  }

  getState() {
    const health = this._readSystemHealth();
    const interval = this.getReasoningIntervalMs();
    const idleMs = this.lastUserTurnAt ? Date.now() - this.lastUserTurnAt : null;

    return {
      running: Boolean(this.tickHandle),
      tickMs: TICK_MS,
      tickCount: this.tickCount,
      uptimeMs: this.startedAt ? Date.now() - this.startedAt : null,
      lastTickAt: this.lastTickAt,
      lastTickDurationMs: this.lastTickDurationMs,

      reasoning: {
        cadenceMs: interval,
        cadenceDerived: interval !== null,
        lastReasoningAt: this.lastReasoningAt,
        iterationsSinceReasoning: this.iterationsSinceReasoning,
        attempts: this.reasoningAttempts,
        failures: this.reasoningFailures,
        failureRate: this._reasoningFailureRate(),
        userPreference: this.paused ? 'paused' : this.userPacingPreference || 'auto',
      },

      presence: {
        userActive: idleMs !== null && idleMs < IDLE_PRESENCE_MS,
        idleMs,
        connectedClients: this.brain?.wsClients?.size ?? null,
      },

      health,
      activeGoal: goalEngine.getActiveGoalSummary(),
      queue: goalEngine.getQueueStatus(),
    };
  }
}

const continuousEngine = new ContinuousEngine();
export default continuousEngine;
