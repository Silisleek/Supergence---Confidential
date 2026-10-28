// SIS 1.0 — Homeostatic Controller
// Models the brain's continuous self-regulation: E/I balance, energy budgeting,
// sleep pressure accumulation, and hallucination dampening.
// Like the hypothalamus + adenosine system — always active, maintaining stability.

import brainLifecycle from './brain-lifecycle.js';

class Homeostasis {
  constructor() {
    this.tokenBudget = {
      consumed: 0,
      windowStart: Date.now(),
      windowMs: 60 * 60 * 1000, // 1 hour budget window
      maxPerWindow: 50000, // Token budget per hour (conservative for free models)
      warningThreshold: 0.8, // Warn at 80% consumption
    };

    this.sleepPressure = 0; // 0-100, like adenosine accumulation
    this.excitationLevel = 50; // 0-100, target: 50 (balanced E/I)
    this.inhibitionLevel = 50; // 0-100, target: 50

    this.healthMetrics = {
      avgResponseLatency: 0,
      errorRate: 0,
      hallucination_flags: 0,
      loopDetections: 0,
      lastHealthCheck: Date.now(),
    };

    this.recentErrors = []; // Sliding window of recent errors
    this._heartbeatInterval = null;
    this._started = false;
  }

  /**
   * Start homeostatic regulation loop
   */
  start() {
    if (this._started) return;
    this._started = true;
    console.log(
      '[Homeostasis] 🫀 Hypothalamic controller online — continuous self-regulation active',
    );

    // Heartbeat every 30s — check brain health, accumulate sleep pressure
    this._heartbeatInterval = setInterval(() => this._heartbeat(), 30000);
  }

  stop() {
    if (this._heartbeatInterval) clearInterval(this._heartbeatInterval);
    this._started = false;
  }

  /**
   * Record token consumption — updates budget and sleep pressure
   */
  recordTokens(count) {
    this.tokenBudget.consumed += count;

    // Accumulate sleep pressure (adenosine analog)
    this.sleepPressure = Math.min(100, this.sleepPressure + Math.ceil(count / 1000));
    brainLifecycle.recordTokens(count);

    // Check budget
    if (this._getBudgetUsage() >= this.tokenBudget.warningThreshold) {
      console.warn(
        `[Homeostasis] ⚠️ Token budget at ${Math.round(this._getBudgetUsage() * 100)}% — applying backpressure`,
      );
    }
  }

  /**
   * Record a response latency for health monitoring
   */
  recordLatency(ms) {
    const alpha = 0.3; // Exponential moving average
    this.healthMetrics.avgResponseLatency =
      alpha * ms + (1 - alpha) * this.healthMetrics.avgResponseLatency;
  }

  /**
   * Record an error for E/I balance tracking
   */
  recordError(type) {
    this.recentErrors.push({ type, timestamp: Date.now() });
    // Keep last 50
    if (this.recentErrors.length > 50) this.recentErrors.shift();

    this.healthMetrics.errorRate = this._calculateErrorRate();

    if (type === 'hallucination') this.healthMetrics.hallucination_flags++;
    if (type === 'loop') this.healthMetrics.loopDetections++;

    // Increase inhibition when errors spike (E/I balance)
    this.inhibitionLevel = Math.min(90, this.inhibitionLevel + 5);
    this.excitationLevel = Math.max(10, this.excitationLevel - 5);
  }

  /**
   * Record a success — reduces inhibition toward baseline
   */
  recordSuccess() {
    // Relax toward equilibrium (target: 50/50)
    this.inhibitionLevel += (50 - this.inhibitionLevel) * 0.1;
    this.excitationLevel += (50 - this.excitationLevel) * 0.1;
  }

  /**
   * Check if the system should throttle (budget exceeded or high sleep pressure)
   */
  shouldThrottle() {
    return this._getBudgetUsage() >= 0.95 || this.sleepPressure >= 90;
  }

  /**
   * Get recommended temperature adjustment based on E/I balance
   * High inhibition → lower temperature (more conservative)
   * High excitation → higher temperature (more creative but risky)
   */
  getTemperatureModifier() {
    const eiRatio = this.excitationLevel / Math.max(1, this.inhibitionLevel);
    if (eiRatio > 1.3) return -0.1; // Too excited → cool down
    if (eiRatio < 0.7) return 0.05; // Too inhibited → warm up slightly
    return 0; // Balanced
  }

  /**
   * Reduce sleep pressure (called during consolidation/sleep phases)
   */
  reduceSleepPressure(amount) {
    this.sleepPressure = Math.max(0, this.sleepPressure - amount);
  }

  /**
   * Get current homeostatic state
   */
  getState() {
    return {
      tokenBudget: {
        consumed: this.tokenBudget.consumed,
        maxPerWindow: this.tokenBudget.maxPerWindow,
        usage: Math.round(this._getBudgetUsage() * 100) + '%',
        windowRemainingMs: Math.max(
          0,
          this.tokenBudget.windowMs - (Date.now() - this.tokenBudget.windowStart),
        ),
      },
      sleepPressure: Math.round(this.sleepPressure),
      eiBalance: {
        excitation: Math.round(this.excitationLevel),
        inhibition: Math.round(this.inhibitionLevel),
        ratio: +(this.excitationLevel / Math.max(1, this.inhibitionLevel)).toFixed(2),
      },
      health: {
        ...this.healthMetrics,
        avgResponseLatency: Math.round(this.healthMetrics.avgResponseLatency),
        recentErrorCount: this.recentErrors.filter((e) => Date.now() - e.timestamp < 10 * 60 * 1000)
          .length,
      },
      shouldThrottle: this.shouldThrottle(),
    };
  }

  // ─── Internal ───

  _getBudgetUsage() {
    // Reset window if expired
    if (Date.now() - this.tokenBudget.windowStart >= this.tokenBudget.windowMs) {
      this.tokenBudget.consumed = 0;
      this.tokenBudget.windowStart = Date.now();
    }
    return this.tokenBudget.consumed / this.tokenBudget.maxPerWindow;
  }

  _calculateErrorRate() {
    const recent = this.recentErrors.filter(
      (e) => Date.now() - e.timestamp < 10 * 60 * 1000, // Last 10 minutes
    );
    return recent.length;
  }

  _heartbeat() {
    this.healthMetrics.lastHealthCheck = Date.now();

    // Natural sleep pressure increase (1 point per 30s of operation)
    this.sleepPressure = Math.min(100, this.sleepPressure + 0.5);

    // E/I balance natural drift toward equilibrium
    this.excitationLevel += (50 - this.excitationLevel) * 0.02;
    this.inhibitionLevel += (50 - this.inhibitionLevel) * 0.02;

    // Reset token budget window if expired
    this._getBudgetUsage();
  }
}

const homeostasis = new Homeostasis();
export { Homeostasis };
export default homeostasis;
