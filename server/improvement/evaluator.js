// SIS 1.0 — Interaction Evaluator
// Post-interaction quality assessment: evaluates every response, tracks user signals,
// and feeds findings into the pattern library for self-improvement

import { quickAI } from '../api/openrouter.js';
import shortTermMemory from '../memory/short-term.js';
import patternLibrary from './anti-patterns.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const EVAL_PROMPT = `You are the Self-Improvement Evaluator for SIS (Superintelligence System).

Your job: analyze an interaction pair (user request → assistant response) and extract:
1. Quality assessment (score 0.0–1.0)
2. What went wrong (if anything) — specific anti-patterns
3. What went well — specific success patterns
4. Actionable lessons for future similar requests

Output a JSON object:
{
  "qualityScore": 0.0-1.0,
  "antiPatterns": [
    {
      "category": "quality|formatting|hallucination|incomplete|off-topic|code-error|verbose|unclear",
      "description": "what went wrong",
      "avoid": "what to avoid",
      "alternative": "what to do instead",
      "severity": 1-5
    }
  ],
  "successPatterns": [
    {
      "category": "quality|formatting|completeness|code|creativity|research|structure",
      "description": "what worked well",
      "strategy": "the approach that worked",
      "outcome": "why it was effective"
    }
  ],
  "lessons": ["actionable lesson 1", "actionable lesson 2"],
  "domain": "the primary domain of this interaction (coding, research, writing, math, etc.)",
  "satisfactionPrediction": 0.0-1.0
}

Be specific and concise. Only flag real issues, not style preferences.`;

class InteractionEvaluator {
  constructor() {
    this.pendingEvaluations = [];
    this.recentScores = []; // rolling window of quality scores
    this.maxRecentScores = 50;
    this.stats = {
      evaluated: 0,
      avgScore: 0.85,
      scoreHistory: [], // daily averages
      currentStreak: 0, // consecutive above-threshold
      degradationDetected: false,
      lastEvaluationAt: null,
    };
    this.interval = null;
    this._loadStats();
  }

  _loadStats() {
    try {
      const statsPath = path.join(__dirname, '../../data/improvement/eval-stats.json');
      if (fs.existsSync(statsPath)) {
        const data = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
        this.stats = { ...this.stats, ...data.stats };
        this.recentScores = data.recentScores || [];
      }
      // Seed scoreHistory from autonomous-learning cycles if empty
      if (!this.stats.scoreHistory || this.stats.scoreHistory.length === 0) {
        const autoPath = path.join(__dirname, '../../data/improvement/autonomous-learning.json');
        if (fs.existsSync(autoPath)) {
          const autoData = JSON.parse(fs.readFileSync(autoPath, 'utf8'));
          if (autoData.recentCycles && autoData.recentCycles.length > 0) {
            const cyclesReversed = [...autoData.recentCycles].reverse();
            // A cycle without a score yields null, not 0.88. The old fallbacks
            // drew a near-flat 0.78→0.88 curve for cycles that measured
            // nothing, which is why the dashboard always looked healthy.
            this.stats.scoreHistory = cyclesReversed.map((c) => ({
              cycle: c.cycleNumber,
              score: Number.isFinite(c.finalScore) ? c.finalScore : null,
              baseline: Number.isFinite(c.baselineScore) ? c.baselineScore : null,
              verifiedReward: typeof c.verifiedReward === 'number' ? c.verifiedReward : null,
              scoreGrade: c.scoreGrade || null,
              timestamp: c.completedAt || c.startedAt || Date.now(),
            }));
          }
        }
      }
    } catch {}
  }

  _saveStats() {
    try {
      const statsPath = path.join(__dirname, '../../data/improvement/eval-stats.json');
      const dir = path.dirname(statsPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        statsPath,
        JSON.stringify(
          {
            stats: this.stats,
            recentScores: this.recentScores,
          },
          null,
          2,
        ),
      );
    } catch {}
  }

  /**
   * Evaluate an interaction (called after every brain.process() completes)
   * Runs asynchronously — never blocks the response
   */
  async evaluate(userMessage, aiResponse, metadata = {}) {
    const evalId = `eval_${Date.now()}`;

    // Quick heuristic pre-score (always available, zero latency)
    const heuristicScore = this._heuristicScore(userMessage, aiResponse);

    // Queue for AI evaluation (async, non-blocking)
    this.pendingEvaluations.push({
      id: evalId,
      userMessage,
      aiResponse,
      metadata,
      heuristicScore,
      timestamp: Date.now(),
    });

    // Process queue (max 3 concurrent)
    if (this.pendingEvaluations.length <= 3) {
      this._processEvaluation(this.pendingEvaluations[this.pendingEvaluations.length - 1]);
    }

    return { evalId, heuristicScore };
  }

  /**
   * Fast heuristic score without AI call
   */
  _heuristicScore(userMessage, aiResponse) {
    let score = 0.8; // baseline

    // Length checks
    if (!aiResponse || aiResponse.trim().length < 20) return 0.3;
    if (aiResponse.length > 10000) score += 0.05; // thoroughness bonus

    // Code quality signals
    if (aiResponse.includes('```')) {
      // Has code — check for quality signals
      if (/TODO|lorem ipsum|placeholder|implement here/i.test(aiResponse)) score -= 0.15;
      if (aiResponse.includes('```html') && aiResponse.includes('style')) score += 0.05;
    }

    // Structural quality
    if (aiResponse.includes('##') || aiResponse.includes('**')) score += 0.05; // formatted
    if (aiResponse.split('\n').length > 10) score += 0.05; // multi-paragraph

    // Anti-signals
    if (/\[object Object\]|critical error|unhandled/i.test(aiResponse)) score -= 0.2;
    if (/(.{20})\1{3,}/.test(aiResponse)) score -= 0.1; // repetition

    // Relevance (basic keyword overlap)
    const userWords = new Set(
      userMessage
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3),
    );
    const responseWords = new Set(
      aiResponse
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3),
    );
    const overlap = [...userWords].filter((w) => responseWords.has(w)).length;
    const relevance = userWords.size > 0 ? overlap / Math.min(userWords.size, 20) : 0.5;
    score += (relevance - 0.5) * 0.2;

    return Math.max(0.1, Math.min(1.0, score));
  }

  /**
   * AI-powered deep evaluation (async, non-blocking)
   */
  async _processEvaluation(evaluation) {
    try {
      const response = await quickAI(
        EVAL_PROMPT,
        `User request:\n${evaluation.userMessage.slice(0, 1500)}\n\nAssistant response:\n${evaluation.aiResponse.slice(0, 5000)}`,
        undefined,
        1500,
      );

      let result;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        result = null;
      }

      if (result) {
        // Record anti-patterns
        for (const ap of result.antiPatterns || []) {
          patternLibrary.recordAntiPattern({
            ...ap,
            context: evaluation.userMessage.slice(0, 200),
            source: 'evaluator',
          });
        }

        // Record success patterns
        for (const sp of result.successPatterns || []) {
          patternLibrary.recordSuccessPattern({
            ...sp,
            context: evaluation.userMessage.slice(0, 200),
            qualityScore: result.qualityScore || evaluation.heuristicScore,
            source: 'evaluator',
          });
        }

        // Record learned strategy if domain is identified
        if (result.domain && result.lessons && result.lessons.length > 0) {
          patternLibrary.setStrategy(result.domain, {
            approach: result.lessons.join('; '),
            keyInsight: result.lessons[0],
            qualityScore: result.qualityScore,
          });
        }

        // Update rolling score window
        const score = result.qualityScore || evaluation.heuristicScore;
        this.recentScores.push({ score, timestamp: Date.now(), domain: result.domain });
        if (this.recentScores.length > this.maxRecentScores) {
          this.recentScores = this.recentScores.slice(-this.maxRecentScores);
        }

        // Detect degradation
        this._detectDegradation();

        // Store evaluation in memory
        shortTermMemory.store(
          ['improvement', 'evaluations'],
          {
            content: `Eval: score ${score.toFixed(2)}, domain ${result.domain || 'unknown'}, anti-patterns ${(result.antiPatterns || []).length}, lessons ${(result.lessons || []).length}`,
            type: 'evaluation',
            tags: ['improvement', 'evaluation', result.domain || 'general'],
            metadata: {
              score,
              antiPatternCount: (result.antiPatterns || []).length,
              successPatternCount: (result.successPatterns || []).length,
              lessons: (result.lessons || []).slice(0, 3),
            },
          },
          'evaluator',
        );
      }

      this.stats.evaluated++;
      this.stats.avgScore =
        this.recentScores.length > 0
          ? this.recentScores.reduce((s, r) => s + r.score, 0) / this.recentScores.length
          : 0.85;
      this.stats.lastEvaluationAt = Date.now();
      this._saveStats();
    } catch (e) {
      console.error('[Evaluator] AI evaluation failed:', e.message);
      // Still record the heuristic score
      this.recentScores.push({ score: evaluation.heuristicScore, timestamp: Date.now() });
      this.stats.evaluated++;
      this._saveStats();
    } finally {
      // Remove from pending
      const idx = this.pendingEvaluations.findIndex((e) => e.id === evaluation.id);
      if (idx !== -1) this.pendingEvaluations.splice(idx, 1);
    }
  }

  /**
   * Detect quality degradation trend
   */
  _detectDegradation() {
    if (this.recentScores.length < 10) {
      this.stats.degradationDetected = false;
      return;
    }

    const recent = this.recentScores.slice(-10);
    const older = this.recentScores.slice(-20, -10);

    if (older.length < 5) {
      this.stats.degradationDetected = false;
      return;
    }

    const recentAvg = recent.reduce((s, r) => s + r.score, 0) / recent.length;
    const olderAvg = older.reduce((s, r) => s + r.score, 0) / older.length;

    // Degradation: recent scores dropped by more than 10%
    this.stats.degradationDetected = olderAvg - recentAvg > 0.1;

    if (this.stats.degradationDetected) {
      console.warn(
        `[Evaluator] ⚠️ Quality degradation detected: ${olderAvg.toFixed(2)} → ${recentAvg.toFixed(2)}`,
      );
      shortTermMemory.store(
        ['improvement', 'alerts'],
        {
          content: `Quality degradation detected: avg score dropped from ${olderAvg.toFixed(2)} to ${recentAvg.toFixed(2)}`,
          type: 'alert',
          tags: ['improvement', 'degradation', 'alert'],
        },
        'evaluator',
      );
    }

    // Update streak
    const aboveThreshold = recentAvg >= 0.8;
    if (aboveThreshold) {
      this.stats.currentStreak++;
    } else {
      this.stats.currentStreak = 0;
    }
  }

  /**
   * Record a user satisfaction signal (e.g., user corrected, user was happy, user restarted)
   */
  recordSignal(type, context = {}) {
    const signal = {
      type, // 'correction', 'positive-feedback', 'restart', 'continuation', 'abandon'
      context: context.message || '',
      timestamp: Date.now(),
      ...context,
    };

    switch (type) {
      case 'correction':
        // User had to correct the output — strong anti-pattern signal
        patternLibrary.recordAntiPattern({
          category: 'quality',
          description: context.description || 'User required correction',
          context: context.message || '',
          avoid: context.wrong || 'Providing incorrect or incomplete output',
          alternative: context.correct || 'Verify accuracy before responding',
          severity: 4,
          source: 'user-correction',
        });
        break;

      case 'positive-feedback':
        patternLibrary.recordSuccessPattern({
          category: context.category || 'quality',
          description: context.description || 'User expressed satisfaction',
          context: context.message || '',
          strategy: context.strategy || 'Effective response',
          qualityScore: 0.95,
          source: 'user-feedback',
        });
        break;

      case 'restart':
        // User started a new conversation — possible dissatisfaction
        if (context.reason === 'dissatisfaction') {
          patternLibrary.recordAntiPattern({
            category: 'quality',
            description: 'User restarted due to poor response quality',
            context: context.lastMessage || '',
            avoid: 'Producing low-quality or irrelevant responses',
            alternative: 'Ensure response addresses the exact user request',
            severity: 3,
            source: 'user-behavior',
          });
        }
        break;

      case 'abandon':
        patternLibrary.recordAntiPattern({
          category: 'incomplete',
          description: 'User abandoned interaction without follow-up',
          context: context.message || '',
          avoid: "Producing responses that don't invite further engagement",
          alternative: 'Provide actionable next steps or ask clarifying questions',
          severity: 2,
          source: 'user-behavior',
        });
        break;
    }

    this._saveStats();
  }

  /**
   * Get current evaluation stats
   */
  getStats() {
    return {
      ...this.stats,
      recentScores: this.recentScores.slice(-10).map((r) => ({
        score: r.score,
        domain: r.domain,
        time: r.timestamp,
      })),
      pendingEvaluations: this.pendingEvaluations.length,
      patternLibrary: patternLibrary.getStats(),
    };
  }
}

const evaluator = new InteractionEvaluator();
export default evaluator;
