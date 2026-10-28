// SIS 1.0 — Thalamocortical Sensory Relay & Predictive Coding Engine
// Models the Thalamus and Thalamic Reticular Nucleus (TRN):
// Sensory gating, predictive coding, prediction error computation,
// and routing between cerebellar automated reflexes (System 1) and
// conscious prefrontal deliberation (System 2).

import { EventEmitter } from 'events';
import neuromodulators from './neuromodulators.js';
import neuralOscillations from './neural-oscillations.js';

class ThalamocorticalRelay extends EventEmitter {
  constructor() {
    super();
    this.stats = {
      gatedSignals: 0,
      system1Routes: 0,
      system2Routes: 0,
      avgPredictionError: 0.25,
      lastSalienceScore: 0.5,
    };
    this.trnInhibition = 0.5; // Thalamic Reticular Nucleus inhibitory gate level (0.0 to 1.0)
  }

  /**
   * Filter and route an incoming user message using predictive coding
   * @param {string} userMessage - Raw user input
   * @param {Array} predictions - Anticipatory predictions from POSSAP
   * @returns {Object} { route: 'system1' | 'system2', predictionError, salience }
   */
  processSensoryInput(userMessage, predictions = []) {
    this.stats.gatedSignals++;
    const clean = String(userMessage || '')
      .trim()
      .toLowerCase();

    // 1. Calculate bottom-up sensory salience
    const wordCount = clean.split(/\s+/).length;
    const isUrgent = /(urgent|asap|critical|error|crash|broken|fail|alert)/i.test(clean);
    const isQuestion = /(\?|what|how|why|where|who|explain|show|build|create|fix)/i.test(clean);

    let salience = 0.3;
    if (wordCount > 15) salience += 0.25;
    if (isUrgent) salience += 0.35;
    if (isQuestion) salience += 0.2;
    salience = Math.min(1.0, salience);
    this.stats.lastSalienceScore = +salience.toFixed(3);

    // 2. Compute Prediction Error against top-down POSSAP expectations
    let bestMatchScore = 0.0;
    if (Array.isArray(predictions) && predictions.length > 0) {
      for (const pred of predictions) {
        const text = String(pred.prediction || pred.text || '').toLowerCase();
        if (text && clean.includes(text.slice(0, 20))) {
          bestMatchScore = Math.max(bestMatchScore, pred.confidence || 0.6);
        }
      }
    }

    // Prediction Error = 1.0 - expected familiarity
    const predictionError = +(1.0 - bestMatchScore).toFixed(3);
    this.stats.avgPredictionError = +(
      0.2 * predictionError +
      0.8 * this.stats.avgPredictionError
    ).toFixed(3);

    // 3. Neuromodulatory response based on salience & surprise
    if (predictionError > 0.6 || isUrgent) {
      neuromodulators.onHighSalience(salience);
      neuralOscillations.setCognitiveMode('active-deliberation');
    }

    // 4. Decision: Route to System 1 (Cerebellar Fast-Path) vs System 2 (Conscious Cortex)
    // Low word count, low salience, and predictable -> Candidate for System 1
    const candidateForSystem1 = wordCount <= 6 && salience < 0.6 && !isUrgent;

    const route = candidateForSystem1 ? 'system1' : 'system2';
    if (route === 'system1') this.stats.system1Routes++;
    else this.stats.system2Routes++;

    return {
      route,
      salience,
      predictionError,
      trnGate: this.trnInhibition,
    };
  }

  getState() {
    return {
      trnInhibition: this.trnInhibition,
      stats: { ...this.stats },
    };
  }
}

const thalamocortical = new ThalamocorticalRelay();
export { ThalamocorticalRelay };
export default thalamocortical;
