// SIS 1.0 — Neuromodulatory Chemical System
// Models the biophysical chemical substrate of the human brain:
// Dopamine, Norepinephrine, Serotonin, Acetylcholine, Glutamate, and GABA.
// Tonic baselines, phasic bursts, reuptake decay, and modulatory gain control.

import { EventEmitter } from 'events';

class NeuromodulatorySystem extends EventEmitter {
  constructor() {
    super();
    // Chemical concentrations bounded [0.0, 1.0]
    this.levels = {
      dopamine: 0.5, // Motivation, novelty, reward prediction error (RPE)
      norepinephrine: 0.45, // Locus coeruleus vigilance, arousal, signal-to-noise ratio
      serotonin: 0.55, // Patience, constraint satisfaction, stability against hallucinations
      acetylcholine: 0.5, // Attention gating, learning rate, memory encoding rate
      glutamate: 0.6, // Primary excitatory drive (signal transmission)
      gaba: 0.6, // Primary inhibitory clamp (lateral inhibition, anti-runaway)
    };

    // Homeostatic tonic baselines
    this.baselines = { ...this.levels };

    // Decay rate toward baseline (biological reuptake per second)
    this.reuptakeRate = 0.05;

    this.stats = {
      phasicBursts: 0,
      rpeEvents: 0,
      lastBurstType: null,
      lastBurstTime: null,
    };

    this._interval = null;
    this._started = false;
  }

  /**
   * Start the continuous reuptake and homeostatic modulation loop
   */
  start() {
    if (this._started) return;
    this._started = true;
    console.log(
      '[Neurochemistry] 🧪 Neuromodulatory chemical substrate active (DA, NE, 5-HT, ACh, Glu, GABA)',
    );

    // Pulse reuptake every 1 second
    this._interval = setInterval(() => this._reuptakeStep(), 1000);
  }

  stop() {
    if (this._interval) clearInterval(this._interval);
    this._started = false;
  }

  /**
   * Continuous homeostatic reuptake toward baseline levels
   */
  _reuptakeStep() {
    for (const transmitter of Object.keys(this.levels)) {
      const current = this.levels[transmitter];
      const baseline = this.baselines[transmitter];
      // Exponential decay toward baseline
      this.levels[transmitter] += (baseline - current) * this.reuptakeRate;
      this.levels[transmitter] = Math.max(0.05, Math.min(0.99, this.levels[transmitter]));
    }
  }

  /**
   * Trigger a phasic burst of a specific neurotransmitter
   */
  triggerBurst(transmitter, delta = 0.15, source = 'system') {
    if (this.levels[transmitter] === undefined) return;
    const prior = this.levels[transmitter];
    this.levels[transmitter] = Math.max(0.05, Math.min(0.99, this.levels[transmitter] + delta));
    this.stats.phasicBursts++;
    this.stats.lastBurstType = transmitter;
    this.stats.lastBurstTime = Date.now();

    this.emit('phasic-burst', {
      transmitter,
      prior,
      current: this.levels[transmitter],
      delta,
      source,
      timestamp: Date.now(),
    });
  }

  /**
   * Reward Prediction Error (RPE) event
   * If actual outcome > expected: positive dopamine burst.
   * If actual outcome < expected: dopamine dip + serotonin/GABA rise.
   */
  computeRPE(actualValue, expectedValue = 0.5) {
    const error = actualValue - expectedValue;
    this.stats.rpeEvents++;

    if (error > 0) {
      // Better than expected: Dopamine burst (+0.1 to +0.25)
      this.triggerBurst('dopamine', Math.min(0.25, error * 0.4), 'rpe-positive');
      this.triggerBurst('acetylcholine', 0.1, 'rpe-reinforcement');
    } else {
      // Worse than expected: Dopamine dip, Serotonin and GABA clamp to prevent erratic actions
      this.triggerBurst('dopamine', Math.max(-0.25, error * 0.4), 'rpe-negative');
      this.triggerBurst('serotonin', 0.15, 'rpe-inhibition');
      this.triggerBurst('gaba', 0.12, 'rpe-clamp');
    }

    return error;
  }

  /**
   * High cognitive load or urgent stimulus event (Locus Coeruleus surge)
   */
  onHighSalience(urgency = 0.2) {
    this.triggerBurst('norepinephrine', Math.min(0.3, urgency), 'locus-coeruleus');
    this.triggerBurst('glutamate', 0.1, 'cortex-excitation');
  }

  /**
   * Novelty or curiosity discovery
   */
  onNovelty(noveltyScore = 0.2) {
    this.triggerBurst('dopamine', Math.min(0.25, noveltyScore), 'mesolimbic-curiosity');
    this.triggerBurst('acetylcholine', 0.15, 'encoding-gate');
  }

  /**
   * User correction / critical error detected
   */
  onCorrection() {
    this.triggerBurst('dopamine', -0.2, 'correction-dip');
    this.triggerBurst('serotonin', 0.2, 'impulse-clamp');
    this.triggerBurst('gaba', 0.15, 'lateral-inhibition');
    this.triggerBurst('norepinephrine', 0.15, 'vigilance');
  }

  /**
   * Get dynamic cognitive modulatory gains for LLM inference
   */
  getModulatorGains() {
    // E/I ratio (Glutamate / GABA)
    const eiRatio = this.levels.glutamate / Math.max(0.1, this.levels.gaba);

    // Temperature modifier: driven by Dopamine (curiosity/exploration), dampened by Serotonin & GABA
    const tempDelta =
      (this.levels.dopamine - 0.5) * 0.2 -
      (this.levels.serotonin - 0.5) * 0.15 -
      (this.levels.gaba - 0.5) * 0.1;

    // Attentional gain: driven by Norepinephrine (Locus Coeruleus signal-to-noise ratio)
    const attentionalGain = 1.0 + (this.levels.norepinephrine - 0.45) * 0.5;

    // Learning rate multiplier: driven by Acetylcholine
    const learningRateMultiplier = 1.0 + (this.levels.acetylcholine - 0.5) * 0.8;

    return {
      temperatureDelta: +tempDelta.toFixed(3),
      attentionalGain: +attentionalGain.toFixed(3),
      learningRateMultiplier: +learningRateMultiplier.toFixed(3),
      eiRatio: +eiRatio.toFixed(3),
    };
  }

  getState() {
    const formattedLevels = {};
    for (const [k, v] of Object.entries(this.levels)) {
      formattedLevels[k] = +v.toFixed(3);
    }
    return {
      levels: formattedLevels,
      gains: this.getModulatorGains(),
      stats: { ...this.stats },
    };
  }
}

const neuromodulators = new NeuromodulatorySystem();
export { NeuromodulatorySystem };
export default neuromodulators;
