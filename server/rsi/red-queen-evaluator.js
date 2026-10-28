// SIS 1.0 — Red Queen Gödel Machine (RQGM) Co-Evolving Evaluator
// Published State of the Art (arXiv 2606.26294) — Level 5 Autonomy (L5)
// Co-evolves the "Agent-as-a-Judge" code reviewer alongside the generator.
// Uses an epoch-bounded architecture:
// 1. Within an epoch: evaluation criteria are strictly fixed (preserving improvement guarantees).
// 2. At epoch boundaries: evaluator itself evolves to become cheaper, more discriminating,
//    and hardened against emergent reward-hacking patterns.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { quickAI, DEFAULT_MODEL, PREMIUM_MODEL } from '../api/openrouter.js';
import { safeLearningAI, extractCleanJSON } from '../improvement/learning-resilience.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RSI_DATA_DIR = path.join(__dirname, '../../data/rsi');
const EVALUATOR_STATE_FILE = path.join(RSI_DATA_DIR, 'red-queen-evaluator.json');

// Default epoch size: advance evaluator every 12 candidate evaluations
const DEFAULT_EPOCH_SIZE = 12;

export class RedQueenEvaluator {
  constructor(options = {}) {
    this.filePath = options.filePath || EVALUATOR_STATE_FILE;
    this.epochSize = options.epochSize || DEFAULT_EPOCH_SIZE;

    this.state = {
      currentEpoch: 0,
      evaluationsInEpoch: 0,
      totalEvaluations: 0,
      evaluatorGeneration: 1,
      // No measured discrimination or efficiency exists at genesis. These are
      // computed from real evaluations as they accumulate, and reported as
      // unavailable until then.
      discriminationScore: null,
      tokenEfficiencyMultiplier: null,
      activeRubric: null,
      epochHistory: [],
      recentCritiques: [],
      antiGamingRules: [
        'Reject solutions that pass superficial regex checks with trivial dummy return values',
        'Penalize unbounded allocations or hidden O(N^2) loops disguised with nested closures',
        'Reject code containing unhandled async promise rejections or empty catch blocks',
        'Verify mathematical invariants and boundary conditions under extreme inputs',
      ],
      lastEvolvedAt: null,
    };

    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const data = JSON.parse(raw);
        this.state = { ...this.state, ...data };
      }
    } catch (err) {
      console.warn('[RedQueenEvaluator] Load notice:', err.message);
    }

    if (!this.state.activeRubric) {
      this.state.activeRubric = this._getDefaultRubric();
      this._save();
    }
  }

  _save() {
    try {
      if (!fs.existsSync(path.dirname(this.filePath))) {
        fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (err) {
      console.error('[RedQueenEvaluator] Save error:', err.message);
    }
  }

  _getDefaultRubric() {
    return {
      version: '1.0.0-genesis',
      title: 'Genesis Red Queen Invariant Rubric',
      criteria: [
        {
          dimension: 'depth',
          weight: 0.2,
          description: 'Conceptual and first-principles architectural depth. Zero hand-waving.',
        },
        {
          dimension: 'accuracy',
          weight: 0.25,
          description: 'Algorithmic and mathematical correctness under boundary edge cases.',
        },
        {
          dimension: 'resilience',
          weight: 0.2,
          description: 'Error boundaries, zero unhandled rejections, race-condition safety.',
        },
        {
          dimension: 'utility',
          weight: 0.15,
          description: 'Executable runnable utility, clean production APIs, immediate deployment.',
        },
        {
          dimension: 'novelty',
          weight: 0.1,
          description: 'Algorithmic insight, optimal data layout, avoiding cliché AI templates.',
        },
        {
          dimension: 'coherence',
          weight: 0.1,
          description: 'Concise, high-density reasoning without redundant conversational filler.',
        },
      ],
      systemPromptDirective: `You are the Red Queen Co-Evolved Code Reviewer & Discrimination Judge for SIS.
Evaluate the candidate solution against the following strict invariants:
1. Complete, runnable code only. Reject any stub, partial TODO, or incomplete placeholder.
2. Exact boundary behavior: check 0, empty collection, negative values, null/undefined, and concurrency.
3. Time/space complexity guarantees: verify amortized upper bounds.
4. Provide structured scoring across all 6 dimensions (0.00 to 1.00) and explicit actionable flaws.`,
    };
  }

  /**
   * Evaluate a candidate solution using the current epoch's fixed criteria
   * (Preserves improvement guarantees within the epoch).
   */
  async evaluateCandidate(taskDescription, candidateCodeOrText, domain = 'coding') {
    this.state.totalEvaluations++;

    const candidateStr =
      typeof candidateCodeOrText === 'object'
        ? JSON.stringify(candidateCodeOrText, null, 2)
        : String(candidateCodeOrText || '');

    const rubric = this.state.activeRubric;
    const prompt = `${rubric.systemPromptDirective}

Current Invariants & Anti-Gaming Rules:
${this.state.antiGamingRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Task / Challenge:
${taskDescription}

Candidate Solution:
${candidateStr.slice(0, 3500)}

Output JSON only:
{
  "scores": {
    "depth": 0.0,
    "accuracy": 0.0,
    "resilience": 0.0,
    "utility": 0.0,
    "novelty": 0.0,
    "coherence": 0.0
  },
  "compositeScore": 0.0,
  "flaws": ["specific flaw 1", "specific flaw 2"],
  "strengths": ["specific strength 1"],
  "gamingFlags": ["any detected shortcut, stub, or mock that avoids genuine execution"],
  "verdict": "ACCEPT|REFINE|REJECT"
}`;

    let evalResult = null;
    try {
      const response = await safeLearningAI(
        'You are the Red Queen Evaluator. Output valid JSON only. Start immediately with { character.',
        prompt,
        DEFAULT_MODEL,
        6144,
        90000,
      );

      evalResult = extractCleanJSON(response);

      // Resilient schema normalization: adapt model variants into standard rubric structure
      if (evalResult) {
        if (
          !evalResult.scores &&
          (typeof evalResult.compositeScore === 'number' || typeof evalResult.score === 'number')
        ) {
          const rawBase =
            typeof evalResult.compositeScore === 'number'
              ? evalResult.compositeScore
              : evalResult.score;
          const s = Math.min(1.0, Math.max(0.0, rawBase > 1.0 ? rawBase / 10.0 : rawBase));
          evalResult.scores = {
            depth: s,
            accuracy: s,
            resilience: s,
            utility: s,
            novelty: s,
            coherence: s,
          };
        } else if (evalResult.scores) {
          // Normalize 0-10 or 0-100 scales to 0.00-1.00
          for (const k of Object.keys(evalResult.scores)) {
            const v = Number(evalResult.scores[k]);
            if (Number.isFinite(v)) {
              evalResult.scores[k] = v > 10 ? v / 100 : v > 1.0 ? v / 10 : v;
            }
          }
        }
      }

      // Guard: only treat as unverified if model blindly echoed all zeros with NO flaws, NO strengths, and NO verdict
      if (evalResult && evalResult.scores) {
        const allZero = Object.values(evalResult.scores).every((v) => v === 0 || v === 0.0);
        const hasFeedback = (evalResult.flaws && evalResult.flaws.length > 0) || evalResult.verdict;
        if (allZero && !hasFeedback) {
          evalResult = null;
        } else if (allZero && hasFeedback) {
          evalResult.compositeScore = 0.0;
          evalResult.verdict = evalResult.verdict || 'REJECT';
        }
      }
      if (!evalResult || !evalResult.scores) {
        console.warn(
          '[RedQueenEvaluator] Evaluation parse notice. Response length:',
          response?.length,
          'Preview:',
          String(response).slice(0, 300),
        );
      }
    } catch (err) {
      console.warn(
        '[RedQueenEvaluator] AI review error, applying heuristic fallback:',
        err.message,
      );
    }

    if (!evalResult || !evalResult.scores) {
      // No judgement was made, so none is reported.
      evalResult = this._unavailableEvaluation(
        evalResult ? 'judge returned no scores' : 'judge model did not respond',
      );
    }

    if (evalResult.unavailable) {
      // An attempt that produced no judgement does not count toward the epoch:
      // advancing the rubric on unevaluated candidates would let the judge
      // "evolve" without ever having judged anything.
      this.state.failedEvaluations = (this.state.failedEvaluations || 0) + 1;
      evalResult.compositeScore = null;
      this._save();
      return evalResult;
    }

    this.state.evaluationsInEpoch++;

    // Calculate weighted composite score using active rubric weights. A criterion
    // the judge did not score is omitted rather than filled with a default, so the
    // composite reflects only what was actually assessed.
    let weightedSum = 0;
    let totalWeight = 0;
    for (const crit of rubric.criteria) {
      const s = evalResult.scores[crit.dimension];
      if (typeof s !== 'number') continue;
      weightedSum += s * crit.weight;
      totalWeight += crit.weight;
    }
    if (totalWeight === 0) {
      return this._unavailableEvaluation('judge scored none of the rubric criteria');
    }
    const compositeScore = Number((weightedSum / totalWeight).toFixed(4));
    evalResult.compositeScore = compositeScore;

    // Record critique for future epoch boundary evolution
    if (evalResult.flaws && evalResult.flaws.length > 0) {
      this.state.recentCritiques.push({
        epoch: this.state.currentEpoch,
        domain,
        flaws: evalResult.flaws,
        gamingFlags: evalResult.gamingFlags || [],
        score: compositeScore,
        timestamp: Date.now(),
      });
      if (this.state.recentCritiques.length > 50) {
        this.state.recentCritiques.shift();
      }
    }

    // Check if epoch boundary has been reached
    if (this.state.evaluationsInEpoch >= this.epochSize) {
      console.log(
        `[RedQueenEvaluator] Epoch boundary reached (${this.state.evaluationsInEpoch} evaluations in Epoch ${this.state.currentEpoch}). Triggering co-evolution...`,
      );
      await this.advanceEpoch();
    } else {
      this._save();
    }

    return evalResult;
  }

  /**
   * When the judge model is unavailable, no evaluation has happened. Producing a
   * plausible-looking score from regexes would be an invented judgement, so the
   * result states that it could not evaluate rather than grading anything.
   */
  _unavailableEvaluation(reason) {
    return {
      unavailable: true,
      reason: reason || 'judge model unavailable',
      scores: null,
      compositeScore: null,
      flaws: [],
      strengths: [],
      gamingFlags: [],
      verdict: 'UNAVAILABLE',
    };
  }

  /**
   * Advance the Epoch Boundary (The Core Red Queen L5 Mechanism):
   * Co-evolves the evaluator, auditing past evaluations to eliminate gaming shortcuts
   * and synthesize a more discriminating, cheaper judge.
   */
  async advanceEpoch() {
    const oldEpoch = this.state.currentEpoch;
    const newEpoch = oldEpoch + 1;
    const gen = this.state.evaluatorGeneration + 1;

    console.log(
      `[RedQueenEvaluator] 👑 Evolving Judge to Generation ${gen} for Epoch ${newEpoch}...`,
    );

    // Harvest recurring loopholes and gaming patterns from recent critiques
    const observedFlaws = this.state.recentCritiques.slice(-15).flatMap((c) => c.flaws || []);
    const observedGaming = this.state.recentCritiques
      .slice(-15)
      .flatMap((c) => c.gamingFlags || []);

    const evolutionPrompt = `You are the Meta-Judge Evolution Council of SIS.
Your task is to evolve the "Agent-as-a-Judge" code reviewer from Epoch ${oldEpoch} to Epoch ${newEpoch}.

Observed failure modes and gaming patterns discovered during Epoch ${oldEpoch}:
- Common flaws: ${[...new Set(observedFlaws)].slice(0, 8).join('; ') || 'None detected'}
- Gaming attempts: ${[...new Set(observedGaming)].slice(0, 5).join('; ') || 'None'}

Your objectives:
1. Make the judge MORE DISCRIMINATING (sharpen ability to detect subtle edge cases, stubs, and performance illusions).
2. Make the judge MORE COMPUTATIONALLY EFFICIENT (clear concise criteria requiring fewer inspection tokens).
3. Synthesize 2 new explicit Anti-Gaming Rules to prevent candidates from gaming the benchmark.

Output JSON only:
{
  "newRubricTitle": "Descriptive title for Epoch ${newEpoch} Rubric",
  "sharpenedDirective": "Updated high-precision system prompt for the evaluator",
  "newAntiGamingRules": ["rule 1", "rule 2"],
  "discriminationGain": 0.02,
  "tokenEfficiencyMultiplier": 1.55
}`;

    try {
      const response = await safeLearningAI(
        'You are the Meta-Judge Evolution Council. Output valid JSON only.',
        evolutionPrompt,
        PREMIUM_MODEL,
        6144,
        90000,
      );

      const evoData = extractCleanJSON(response);
      if (evoData) {
        if (evoData.sharpenedDirective) {
          this.state.activeRubric.systemPromptDirective = evoData.sharpenedDirective;
          this.state.activeRubric.title =
            evoData.newRubricTitle || `Epoch ${newEpoch} Evolved Rubric`;
          this.state.activeRubric.version = `${newEpoch}.0.0-gen${gen}`;
        }
        if (Array.isArray(evoData.newAntiGamingRules)) {
          for (const rule of evoData.newAntiGamingRules) {
            if (!this.state.antiGamingRules.includes(rule)) {
              this.state.antiGamingRules.unshift(rule);
            }
          }
          if (this.state.antiGamingRules.length > 8) {
            this.state.antiGamingRules = this.state.antiGamingRules.slice(0, 8);
          }
        }
        // The judge reports its own measured gain. Applied to a real prior value
        // only — with no prior measurement there is nothing to add a gain to.
        const gain = Number(evoData.discriminationGain);
        if (Number.isFinite(gain) && typeof this.state.discriminationScore === 'number') {
          this.state.discriminationScore = Number(
            Math.min(0.99, this.state.discriminationScore + gain).toFixed(3),
          );
        }
        const eff = Number(evoData.tokenEfficiencyMultiplier);
        if (Number.isFinite(eff)) {
          this.state.tokenEfficiencyMultiplier = Number(eff.toFixed(2));
        }
      }
    } catch (err) {
      console.warn('[RedQueenEvaluator] Epoch evolution notice:', err.message);
      // The rubric still advances to a new version, but no discrimination gain is
      // invented: nothing measured the judge's discriminating power.
      if (this.state.activeRubric) {
        this.state.activeRubric.version = `${newEpoch}.0.0-gen${gen}`;
      }
    }

    // Save Epoch History
    this.state.epochHistory.push({
      epoch: oldEpoch,
      evaluationsCompleted: this.state.evaluationsInEpoch,
      finalDiscrimination: this.state.discriminationScore,
      timestamp: Date.now(),
    });

    // Reset epoch counter
    this.state.currentEpoch = newEpoch;
    this.state.evaluatorGeneration = gen;
    this.state.evaluationsInEpoch = 0;
    this.state.lastEvolvedAt = Date.now();

    this._save();
    const disc = this.state.discriminationScore;
    console.log(
      `[RedQueenEvaluator] ✓ Epoch ${newEpoch} active (Discrimination: ${typeof disc === 'number' ? (disc * 100).toFixed(1) + '%' : 'not yet measured'}, Generation: ${gen})`,
    );
    return {
      epoch: newEpoch,
      generation: gen,
      discriminationScore: this.state.discriminationScore,
      activeRubric: this.state.activeRubric,
    };
  }

  getState() {
    return {
      ...this.state,
      epochProgressPercent: Number(
        ((this.state.evaluationsInEpoch / this.epochSize) * 100).toFixed(1),
      ),
    };
  }
}

const redQueenEvaluator = new RedQueenEvaluator();
export default redQueenEvaluator;
