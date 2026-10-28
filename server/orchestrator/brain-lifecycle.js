// SIS 1.0 — Brain Lifecycle Manager (The Brainstem & Waking Controller)
// Models the human brainstem, reticular activating system, and waking consciousness:
// NEVER STOPS until the user explicitly puts it in sleep mode.
// Waking States: AWAKE_ACTIVE (user task) <-> AWAKE_STREAM_OF_CONSCIOUSNESS (unceasing inner thoughts).
// Sleep States: DEEP_SLEEP (NREM consolidation) <-> REM_DREAMING (overfitting prevention).

import { EventEmitter } from 'events';
import neuralOscillations from './neural-oscillations.js';

const STATES = {
  AWAKE_ACTIVE: 'awake-active', // PFC dominant — actively processing user interaction
  AWAKE_STREAM_OF_CONSCIOUSNESS: 'awake-stream', // Waking inner monologue — continuous associative cognition
  DEEP_SLEEP: 'deep-sleep', // User-commanded sleep — NREM consolidation & glymphatics
  REM_DREAMING: 'rem-dreaming', // User-commanded sleep — REM synthetic dream stress-testing
};

const ACTIVE_TO_STREAM_THRESHOLD = 10 * 1000; // 10s after turn completion -> stream of consciousness
const REM_CYCLE_DURATION = 5 * 60 * 1000; // 5min deep sleep -> REM cycle
const REM_DURATION = 3 * 60 * 1000; // 3min REM -> deep sleep

class BrainLifecycle extends EventEmitter {
  constructor() {
    super();
    this.state = STATES.AWAKE_STREAM_OF_CONSCIOUSNESS;
    this.lastActivityTime = Date.now();
    this.lastStateChange = Date.now();
    this.sleepPressure = 0; // Adenosine analog (0-100)
    this.userSleepModeActive = false; // User explicit sleep toggle
    this.totalTokensConsumed = 0;
    this.deepSleepCycles = 0;
    this.remCycles = 0;
    this.stateHistory = []; // Sliding window of transitions
    this._heartbeatInterval = null;
    this._started = false;
    this.brainRef = null;
  }

  setBrain(brainInstance) {
    this.brainRef = brainInstance;
  }

  /**
   * Start the continuous lifecycle manager
   */
  start() {
    if (this._started) return;
    this._started = true;
    console.log(
      '[BrainLifecycle] 🧠 Brainstem online — continuous waking operation active (never stops)',
    );

    neuralOscillations.setCognitiveMode('waking-stream');

    // Heartbeat every 3 seconds to manage waking transitions and sleep cycles
    this._heartbeatInterval = setInterval(() => this._evaluateTransition(), 3000);

    this.emit('state-change', {
      from: null,
      to: this.state,
      userSleepMode: this.userSleepModeActive,
      sleepPressure: this.sleepPressure,
      timestamp: Date.now(),
    });
  }

  stop() {
    if (this._heartbeatInterval) clearInterval(this._heartbeatInterval);
    this._started = false;
    console.log('[BrainLifecycle] Brainstem offline');
  }

  /**
   * RAS Interrupt — instant wake on user interaction (<10ms)
   * If sleeping, immediately awakens. If already awake, switches to active processing.
   */
  wake(reason = 'user-action') {
    this.lastActivityTime = Date.now();
    this.userSleepModeActive = false;

    if (this.state !== STATES.AWAKE_ACTIVE) {
      const from = this.state;
      this._transitionTo(STATES.AWAKE_ACTIVE);
      neuralOscillations.setCognitiveMode('active-deliberation');
      console.log(
        `[BrainLifecycle] ⚡ RAS INTERRUPT: ${from} ➜ AWAKE_ACTIVE (instant wake, reason: ${reason})`,
      );
    }
  }

  /**
   * User explicitly commands sleep mode
   * The brain enters restorative deep sleep only when commanded by the user
   */
  enterSleepMode(reason = 'user-command') {
    this.userSleepModeActive = true;
    this._transitionTo(STATES.DEEP_SLEEP);
    neuralOscillations.setCognitiveMode('deep-sleep');
    console.log(
      `[BrainLifecycle] 🌙 User initiated sleep mode (${reason}) — entering restorative deep sleep`,
    );
  }

  /**
   * User explicitly commands wake from sleep
   */
  exitSleepMode() {
    this.userSleepModeActive = false;
    this.wake('user-wake-command');
  }

  /**
   * Active conscious turn completed — transition back to waking stream of thought ONLY if no active chat task exists
   */
  onProcessingComplete() {
    this.lastActivityTime = Date.now();
    this.sleepPressure = Math.min(100, this.sleepPressure + 2);
    this.totalTokensConsumed += 1;

    // If user has an active chat task, maintain PFC-dominant focused wakefulness
    if (!this.userSleepModeActive) {
      if (
        this.brainRef &&
        typeof this.brainRef.hasActiveChat === 'function' &&
        this.brainRef.hasActiveChat()
      ) {
        if (this.state !== STATES.AWAKE_ACTIVE) {
          this._transitionTo(STATES.AWAKE_ACTIVE);
          neuralOscillations.setCognitiveMode('active-deliberation');
        }
      } else {
        this._transitionTo(STATES.AWAKE_STREAM_OF_CONSCIOUSNESS);
        neuralOscillations.setCognitiveMode('waking-stream');
      }
    }
  }

  recordTokens(count) {
    this.totalTokensConsumed += count;
    this.sleepPressure = Math.min(100, this.sleepPressure + Math.ceil(count / 500));
  }

  /**
   * Evaluate state transitions
   * CRITICAL: NEVER enters sleep automatically. Only transitions to sleep if userSleepModeActive is true.
   */
  _evaluateTransition() {
    const idleMs = Date.now() - this.lastActivityTime;

    // 1. If user commanded sleep mode, manage NREM <-> REM sleep cycles
    if (this.userSleepModeActive) {
      if (this.state === STATES.DEEP_SLEEP) {
        const timeInDeep = Date.now() - this.lastStateChange;
        if (timeInDeep >= REM_CYCLE_DURATION) {
          this._transitionTo(STATES.REM_DREAMING);
        }
      } else if (this.state === STATES.REM_DREAMING) {
        const timeInRem = Date.now() - this.lastStateChange;
        if (timeInRem >= REM_DURATION) {
          this.sleepPressure = Math.max(0, this.sleepPressure - 25);
          this.remCycles++;
          this._transitionTo(STATES.DEEP_SLEEP);
        }
      } else {
        this._transitionTo(STATES.DEEP_SLEEP);
        neuralOscillations.setCognitiveMode('deep-sleep');
      }
      return;
    }

    // 2. Waking Consciousness:
    // If chat task is active, strictly preserve AWAKE_ACTIVE (task-focused state)
    if (
      this.brainRef &&
      typeof this.brainRef.hasActiveChat === 'function' &&
      this.brainRef.hasActiveChat()
    ) {
      if (this.state !== STATES.AWAKE_ACTIVE) {
        this._transitionTo(STATES.AWAKE_ACTIVE);
        neuralOscillations.setCognitiveMode('active-deliberation');
      }
      return;
    }

    // If in AWAKE_ACTIVE and idle > 10s without an active chat task, return to continuous waking stream of consciousness
    if (this.state === STATES.AWAKE_ACTIVE && idleMs >= ACTIVE_TO_STREAM_THRESHOLD) {
      this._transitionTo(STATES.AWAKE_STREAM_OF_CONSCIOUSNESS);
      neuralOscillations.setCognitiveMode('waking-stream');
    }
  }

  _transitionTo(newState) {
    if (newState === this.state) return;

    const from = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();

    if (newState === STATES.DEEP_SLEEP) this.deepSleepCycles++;

    this.stateHistory.push({
      from,
      to: newState,
      timestamp: Date.now(),
      sleepPressure: this.sleepPressure,
      userSleepMode: this.userSleepModeActive,
    });
    if (this.stateHistory.length > 20) this.stateHistory.shift();

    this.emit('state-change', {
      from,
      to: newState,
      sleepPressure: this.sleepPressure,
      userSleepMode: this.userSleepModeActive,
      deepSleepCycles: this.deepSleepCycles,
      remCycles: this.remCycles,
      timestamp: Date.now(),
    });
  }

  getState() {
    return {
      state: this.state,
      userSleepModeActive: this.userSleepModeActive,
      sleepPressure: this.sleepPressure,
      lastActivityTime: this.lastActivityTime,
      lastStateChange: this.lastStateChange,
      idleMs: Date.now() - this.lastActivityTime,
      timeInCurrentState: Date.now() - this.lastStateChange,
      deepSleepCycles: this.deepSleepCycles,
      remCycles: this.remCycles,
      totalTokensConsumed: this.totalTokensConsumed,
      recentTransitions: this.stateHistory.slice(-5),
    };
  }

  isSleeping() {
    return (
      this.userSleepModeActive ||
      this.state === STATES.DEEP_SLEEP ||
      this.state === STATES.REM_DREAMING
    );
  }

  isAwake() {
    return !this.isSleeping();
  }

  isIdle() {
    if (
      this.brainRef &&
      typeof this.brainRef.hasActiveChat === 'function' &&
      this.brainRef.hasActiveChat()
    ) {
      return false;
    }
    return this.state === STATES.AWAKE_STREAM_OF_CONSCIOUSNESS;
  }

  isActive() {
    return this.state === STATES.AWAKE_ACTIVE;
  }
}

export const BRAIN_STATES = STATES;
const brainLifecycle = new BrainLifecycle();
export { BrainLifecycle };
export default brainLifecycle;
