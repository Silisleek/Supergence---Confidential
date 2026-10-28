// SIS 1.0 — Output Elevation Engine
// Pillar 15: Quality rubric evaluation and iterative autonomous output elevation

import refinerEngine from './refiner-engine.js';
import mathExpertEngine from './math-expert.js';

export class OutputElevationEngine {
  constructor() {
    this.elevationStats = {
      totalEvaluations: 0,
      elevationsPerformed: 0,
      averageQualityGain: 0.12,
    };
  }

  /**
   * Evaluate draft quality across 5 superintelligence rubrics
   */
  evaluateQuality(text = '', userGoal = '') {
    if (!text || typeof text !== 'string') return { compositeScore: 0, dimensions: {} };

    const clean = text.trim();
    const dimensions = {
      completeness: this._scoreCompleteness(clean),
      rigor: this._scoreRigor(clean),
      structure: this._scoreStructure(clean),
      concision: this._scoreConcision(clean),
      alignment: this._scoreAlignment(clean, userGoal),
    };

    const compositeScore = Number(
      (
        dimensions.completeness * 0.25 +
        dimensions.rigor * 0.25 +
        dimensions.structure * 0.2 +
        dimensions.concision * 0.15 +
        dimensions.alignment * 0.15
      ).toFixed(2),
    );

    return {
      compositeScore,
      passed: compositeScore >= 0.9,
      dimensions,
    };
  }

  _scoreCompleteness(text) {
    let score = 1.0;
    if (/\/\/\s*TODO\b/i.test(text)) score -= 0.3;
    if (/\b(?:lorem ipsum|placeholder|sample code here|fill in later)\b/i.test(text)) score -= 0.4;
    const fences = (text.match(/```/g) || []).length;
    if (fences % 2 !== 0) score -= 0.2;
    return Math.max(0, Number(score.toFixed(2)));
  }

  _scoreRigor(text) {
    let score = 0.85;
    if (/\$\$[\s\S]*?\$\$|\$[^\$]+\$/g.test(text)) score += 0.1; // Rich KaTeX formulas
    if (/```[a-z]+/i.test(text)) score += 0.05; // Explicit language fences
    return Math.min(1.0, Number(score.toFixed(2)));
  }

  _scoreStructure(text) {
    let score = 0.7;
    if (/#{1,4}\s+/m.test(text)) score += 0.15; // Structured headings
    if (/\|[\s\S]*?\|[\s\S]*?\|/m.test(text)) score += 0.1; // Markdown tables
    if (/^[\*\-]\s+/m.test(text)) score += 0.05; // Bulleted lists
    return Math.min(1.0, Number(score.toFixed(2)));
  }

  _scoreConcision(text) {
    let score = 0.9;
    if (/\b(?:as an ai|in order to|it is important to note that)\b/i.test(text)) score -= 0.15;
    return Math.max(0.5, Number(score.toFixed(2)));
  }

  _scoreAlignment(text, goal) {
    if (!goal) return 1.0;
    const terms = goal
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);
    if (terms.length === 0) return 1.0;
    const textLower = text.toLowerCase();
    let hits = 0;
    for (const t of terms) {
      if (textLower.includes(t)) hits++;
    }
    return Number(Math.min(1.0, 0.5 + (hits / terms.length) * 0.5).toFixed(2));
  }

  /**
   * Elevate output iteratively if quality threshold is not met
   */
  elevate(text, userGoal = '', options = {}) {
    this.elevationStats.totalEvaluations++;
    const initialEval = this.evaluateQuality(text, userGoal);

    if (initialEval.passed && options.force !== true) {
      return {
        elevatedText: text,
        qualityScore: initialEval.compositeScore,
        elevated: false,
        evaluations: initialEval,
      };
    }

    // Perform elevation passes
    const refined = refinerEngine.refine(text, {
      passes: ['precision', 'logic', 'technical', 'presentation'],
    });

    let elevatedText = refined.refinedText;

    // Validate and auto-balance KaTeX formulas
    if (elevatedText.includes('$')) {
      const katexFix = mathExpertEngine.validateKaTeX(elevatedText);
      if (!katexFix.valid) {
        elevatedText = katexFix.formatted;
      }
    }

    const finalEval = this.evaluateQuality(elevatedText, userGoal);
    this.elevationStats.elevationsPerformed++;

    return {
      originalScore: initialEval.compositeScore,
      qualityScore: finalEval.compositeScore,
      qualityGain: Number((finalEval.compositeScore - initialEval.compositeScore).toFixed(2)),
      elevatedText,
      elevated: true,
      modifications: refined.modifications,
    };
  }
}

const outputElevationEngine = new OutputElevationEngine();
export default outputElevationEngine;
