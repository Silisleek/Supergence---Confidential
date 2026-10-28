// SIS 1.0 — Neural Oscillations & Thalamocortical Pacemaker
// Simulates continuous biological brainwave frequency spectra:
// Delta (0.5-4Hz), Theta (4-8Hz), Alpha (8-12Hz), Beta (13-30Hz), Gamma (30-80Hz).
// Implements Phase-Amplitude Coupling (PAC) for multi-item working memory multiplexing.

import { EventEmitter } from 'events';

class NeuralOscillations extends EventEmitter {
  constructor() {
    super();
    // Power spectral distribution summing to 1.0
    this.powerBands = {
      delta: 0.1, // 0.5 - 4 Hz (deep sleep / slow wave)
      theta: 0.25, // 4 - 8 Hz (episodic memory / associative chunking)
      alpha: 0.4, // 8 - 12 Hz (thalamocortical waking baseline / idle thought)
      beta: 0.15, // 13 - 30 Hz (active problem solving / motor actions)
      gamma: 0.1, // 30 - 80 Hz (feature binding / conscious synthesis)
    };

    this.dominantFrequencyHz = 10.2; // Baseline alpha peak
    this.pacIndex = 0.42; // Phase-Amplitude Coupling (Theta phase -> Gamma amplitude)
    this.cognitiveMode = 'waking-stream'; // 'waking-stream' | 'active-deliberation' | 'deep-sleep'

    this._interval = null;
    this._started = false;
  }

  /**
   * Start the continuous oscillatory pacemaker (1Hz tick)
   */
  start() {
    if (this._started) return;
    this._started = true;
    console.log(
      '[Brainwaves] ⚡ Thalamocortical oscillatory pacemaker active (Delta, Theta, Alpha, Beta, Gamma)',
    );

    this._interval = setInterval(() => this._oscillateStep(), 1500);
  }

  stop() {
    if (this._interval) clearInterval(this._interval);
    this._started = false;
  }

  /**
   * Set the cognitive mode which dynamically alters the power spectrum
   */
  setCognitiveMode(mode) {
    if (
      ['waking-stream', 'active-deliberation', 'deep-sleep', 'cerebellar-reflex'].includes(mode)
    ) {
      this.cognitiveMode = mode;
      for (let i = 0; i < 4; i++) {
        this._updateSpectrumForMode();
      }
      this._oscillateStep();
    }
  }

  /**
   * Periodic oscillatory step with micro-fluctuations simulating real LFPs
   */
  _oscillateStep() {
    this._updateSpectrumForMode();

    // Natural stochastic micro-jitter (±2%)
    for (const band of Object.keys(this.powerBands)) {
      const jitter = (Math.random() - 0.5) * 0.03;
      this.powerBands[band] = Math.max(0.02, this.powerBands[band] + jitter);
    }
    this._normalizeBands();

    // Calculate Theta-Gamma Phase Amplitude Coupling (PAC)
    // High PAC indicates active working memory coordination
    this.pacIndex = +Math.min(
      0.95,
      this.powerBands.theta * 1.5 * (this.powerBands.gamma * 2.0),
    ).toFixed(3);

    // Dominant frequency calculation
    if (this.cognitiveMode === 'active-deliberation') {
      this.dominantFrequencyHz = +(25 + Math.random() * 20).toFixed(1); // 25-45 Hz (Beta/Gamma)
    } else if (this.cognitiveMode === 'deep-sleep') {
      this.dominantFrequencyHz = +(1.2 + Math.random() * 1.5).toFixed(1); // 1-3 Hz (Delta)
    } else {
      this.dominantFrequencyHz = +(8.5 + Math.random() * 3.5).toFixed(1); // 8-12 Hz (Alpha/Theta)
    }

    this.emit('wave-update', this.getState());
  }

  _updateSpectrumForMode() {
    let target;

    if (this.cognitiveMode === 'active-deliberation') {
      // Active multi-agent reasoning: Beta and Gamma burst
      target = { delta: 0.02, theta: 0.18, alpha: 0.15, beta: 0.35, gamma: 0.3 };
    } else if (this.cognitiveMode === 'cerebellar-reflex') {
      // Fast procedural reflex: sharp Beta spike
      target = { delta: 0.05, theta: 0.15, alpha: 0.2, beta: 0.5, gamma: 0.1 };
    } else if (this.cognitiveMode === 'deep-sleep') {
      // Slow-wave deep sleep: Massive Delta dominance
      target = { delta: 0.7, theta: 0.15, alpha: 0.08, beta: 0.05, gamma: 0.02 };
    } else {
      // Continuous waking stream of consciousness: Alpha/Theta dominant
      target = { delta: 0.08, theta: 0.32, alpha: 0.42, beta: 0.1, gamma: 0.08 };
    }

    // Smooth relaxation toward target spectrum
    const alphaRate = 0.25;
    for (const b of Object.keys(this.powerBands)) {
      this.powerBands[b] += (target[b] - this.powerBands[b]) * alphaRate;
    }
    this._normalizeBands();
  }

  _normalizeBands() {
    const sum = Object.values(this.powerBands).reduce((acc, v) => acc + v, 0);
    if (sum > 0) {
      for (const k of Object.keys(this.powerBands)) {
        this.powerBands[k] = +(this.powerBands[k] / sum).toFixed(3);
      }
    }
  }

  getState() {
    return {
      bands: { ...this.powerBands },
      dominantFrequencyHz: this.dominantFrequencyHz,
      pacIndex: this.pacIndex,
      cognitiveMode: this.cognitiveMode,
      timestamp: Date.now(),
    };
  }
}

const neuralOscillations = new NeuralOscillations();
export { NeuralOscillations };
export default neuralOscillations;
