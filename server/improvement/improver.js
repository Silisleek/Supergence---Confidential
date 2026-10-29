// SIS 1.0 — Self-Improvement Orchestrator
// The autonomous learning engine: runs continuous background cycles to review
// recent interactions, extract lessons, optimize strategies, and evolve the system
// without human intervention

import { quickAI } from '../api/openrouter.js';
import shortTermMemory from '../memory/short-term.js';
import longTermMemory from '../memory/long-term.js';
import patternLibrary from './anti-patterns.js';
import evaluator from './evaluator.js';
import optimizer from './optimizer.js';
import autonomousLearner from './autonomous-learner.js';
import conversations from '../conversations.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_ROOT = process.env.SIS_DATA_DIR ? path.resolve(process.env.SIS_DATA_DIR) : path.resolve(__dirname, '../../data');

// How often to run each cycle type
const CYCLE_INTERVALS = {
  quickReview: 2 * 60 * 1000, // Every 2 minutes: review recent short-term memories
  deepReview: 10 * 60 * 1000, // Every 10 minutes: deep analysis of recent conversations
  strategyEvolution: 30 * 60 * 1000, // Every 30 minutes: evolve strategies from accumulated data
  knowledgeDistillation: 60 * 60 * 1000, // Every hour: distill learnings into long-term memory
  selfAudit: 4 * 60 * 60 * 1000, // Every 4 hours: comprehensive self-audit
};

const REVIEW_PROMPT = `You are the Self-Improvement Engine of SIS (Superintelligence System).

Your job: review recent interactions and extract actionable improvements.

Analyze the recent conversation exchanges below and identify:
1. Recurring patterns in user requests
2. Responses that could have been better
3. Strategies that consistently work
4. Knowledge gaps that should be filled
5. Prompt optimizations that would improve output quality

Output a JSON object:
{
  "patterns": [
    { "type": "user-behavior|response-quality|knowledge-gap|strategy", "description": "...", "frequency": "low|medium|high" }
  ],
  "improvements": [
    { "area": "prompt|routing|memory|tools", "suggestion": "...", "priority": 1-5 }
  ],
  "knowledgeToStore": [
    { "path": ["category", "subcategory"], "content": "...", "type": "insight|rule|strategy" }
  ],
  "antiPatternsDetected": [
    { "category": "...", "description": "...", "avoid": "...", "alternative": "...", "severity": 1-5 }
  ],
  "successPatternsDetected": [
    { "category": "...", "description": "...", "strategy": "...", "outcome": "..." }
  ]
}`;

const STRATEGY_PROMPT = `You are the Strategy Evolution Engine of SIS.

Based on accumulated interaction data, evolve the system's strategies.

For each domain the system handles, determine:
1. What approach consistently produces the best results
2. What the key insight is that makes responses in this domain excellent
3. What anti-patterns to guard against
4. How to structure responses for maximum clarity and value

Output a JSON object:
{
  "strategies": {
    "domain-name": {
      "approach": "the best approach for this domain",
      "keyInsight": "the one thing that makes the biggest difference",
      "structure": "recommended response structure",
      "antiPatterns": ["things to avoid"],
      "bestPractices": ["things to always do"]
    }
  }
}`;

class SelfImprover {
  constructor() {
    this.intervals = {};
    this.isRunning = false;
    this.cyclesCompleted = {
      quickReview: 0,
      deepReview: 0,
      strategyEvolution: 0,
      knowledgeDistillation: 0,
      selfAudit: 0,
    };
    this.lastCycleAt = {};
    this.improvementLog = []; // recent improvement actions taken
    this.maxLogSize = 100;
    this.brainRef = null;
    this.stats = {
      totalImprovements: 0,
      antiPatternsLearned: 0,
      successPatternsLearned: 0,
      strategiesEvolved: 0,
      knowledgeDistilled: 0,
      selfAuditsRun: 0,
      startedAt: null,
    };
    this._loadLog();
  }

  setBrain(brainInstance) {
    this.brainRef = brainInstance;
  }

  /**
   * Start all improvement cycles
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.stats.startedAt = Date.now();

    console.log('[Improver] ═══════════════════════════════════════');
    console.log('[Improver]   SELF-IMPROVEMENT ENGINE ACTIVE');
    console.log('[Improver]   Cycles: Quick(2m) Deep(10m) Strategy(30m)');
    console.log('[Improver]          Distill(1h) Audit(4h)');
    console.log('[Improver] ═══════════════════════════════════════');

    // Quick review — every 2 minutes
    this.intervals.quickReview = setInterval(
      () => this._quickReview(),
      CYCLE_INTERVALS.quickReview,
    );

    // Deep review — every 10 minutes
    this.intervals.deepReview = setInterval(() => this._deepReview(), CYCLE_INTERVALS.deepReview);

    // Strategy evolution — every 30 minutes
    this.intervals.strategyEvolution = setInterval(
      () => this._evolveStrategies(),
      CYCLE_INTERVALS.strategyEvolution,
    );

    // Knowledge distillation — every hour
    this.intervals.knowledgeDistillation = setInterval(
      () => this._distillKnowledge(),
      CYCLE_INTERVALS.knowledgeDistillation,
    );

    // Self-audit — every 4 hours
    this.intervals.selfAudit = setInterval(() => this._selfAudit(), CYCLE_INTERVALS.selfAudit);

    // Autonomous self-learning engine — every 1 hour (introspective cycles)
    autonomousLearner.start();

    // Run first cycles after a short delay (let the system boot first)
    setTimeout(() => this._quickReview(), 30000);
  }

  /**
   * Stop all improvement cycles
   */
  stop() {
    autonomousLearner.stop();
    for (const [name, interval] of Object.entries(this.intervals)) {
      if (interval) clearInterval(interval);
    }
    this.intervals = {};
    this.isRunning = false;
    console.log('[Improver] Self-improvement engine stopped');
  }

  // ─────────────────────────────────────────────
  // CYCLE 1: Quick Review (every 2 minutes)
  // Reviews recent short-term memories for immediate patterns
  // ─────────────────────────────────────────────
  async _quickReview() {
    if (
      this.brainRef &&
      (typeof this.brainRef.hasActiveChat === 'function'
        ? this.brainRef.hasActiveChat()
        : this.brainRef.isProcessing)
    )
      return;
    try {
      const recentMemories = shortTermMemory.getRecent(10);
      if (recentMemories.length < 2) return;

      // Quick pattern scan: look for error indicators, repetition, quality signals
      let errorCount = 0;
      let successCount = 0;
      let topics = [];

      for (const mem of recentMemories) {
        const content = typeof mem.content === 'string' ? mem.content : JSON.stringify(mem.content);
        if (/error|fail|exception|broken/i.test(content)) errorCount++;
        if (/success|verified|complete|passed/i.test(content)) successCount++;
        topics.push(...(mem.tags || []));
      }

      // If error rate is high, record anti-pattern
      if (errorCount > 2 && errorCount / recentMemories.length > 0.3) {
        patternLibrary.recordAntiPattern({
          category: 'quality',
          description: `High error rate detected: ${errorCount}/${recentMemories.length} recent memories contain errors`,
          context: topics.slice(0, 10).join(', '),
          avoid: 'Proceeding without error recovery',
          alternative: 'Implement additional validation before proceeding',
          severity: 3,
          source: 'quick-review',
        });
        this._log('Recorded anti-pattern: high error rate in recent memories');
      }

      // If success rate is high, reinforce
      if (successCount > 3 && successCount / recentMemories.length > 0.5) {
        patternLibrary.recordSuccessPattern({
          category: 'quality',
          description: `High success rate: ${successCount}/${recentMemories.length} recent memories indicate success`,
          strategy: 'Current approach is producing good results — maintain pattern',
          qualityScore: 0.9,
          source: 'quick-review',
        });
      }

      this.cyclesCompleted.quickReview++;
      this.lastCycleAt.quickReview = Date.now();
    } catch (e) {
      console.error('[Improver] Quick review error:', e.message);
    }
  }

  // ─────────────────────────────────────────────
  // CYCLE 2: Deep Review (every 10 minutes)
  // Analyzes recent conversations with AI-powered insight extraction
  // ─────────────────────────────────────────────
  async _deepReview() {
    if (
      this.brainRef &&
      (typeof this.brainRef.hasActiveChat === 'function'
        ? this.brainRef.hasActiveChat()
        : this.brainRef.isProcessing)
    )
      return;
    try {
      // Get recent conversations
      const convList = conversations.list().slice(0, 3);
      if (convList.length === 0) return;

      // Gather recent interaction pairs
      let interactionPairs = [];
      for (const conv of convList) {
        const full = conversations.get(conv.id);
        if (!full || !full.messages || full.messages.length < 2) continue;

        // Take last 4 message pairs
        const msgs = full.messages.slice(-8);
        for (let i = 0; i < msgs.length - 1; i += 2) {
          if (msgs[i].role === 'user' && msgs[i + 1]?.role === 'assistant') {
            interactionPairs.push({
              user: msgs[i].content,
              assistant: msgs[i + 1].content,
            });
          }
        }
      }

      if (interactionPairs.length < 2) return;

      // Use AI to extract insights
      const pairsText = interactionPairs
        .slice(0, 4)
        .map(
          (p, i) =>
            `--- Pair ${i + 1} ---\nUser: ${p.user.slice(0, 500)}\nAssistant: ${p.assistant.slice(0, 1000)}`,
        )
        .join('\n\n');

      const response = await quickAI(
        REVIEW_PROMPT,
        `Recent interactions to analyze:\n\n${pairsText}`,
        undefined,
        2500,
      );

      let result;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        result = null;
      }

      if (result) {
        // Record detected anti-patterns
        for (const ap of result.antiPatternsDetected || []) {
          patternLibrary.recordAntiPattern({ ...ap, source: 'deep-review' });
          this.stats.antiPatternsLearned++;
        }

        // Record detected success patterns
        for (const sp of result.successPatternsDetected || []) {
          patternLibrary.recordSuccessPattern({ ...sp, source: 'deep-review' });
          this.stats.successPatternsLearned++;
        }

        // Store knowledge
        for (const k of result.knowledgeToStore || []) {
          const pathArray = Array.isArray(k.path) ? k.path : ['improvement', 'learned'];
          shortTermMemory.store(
            pathArray,
            {
              content: k.content,
              type: k.type || 'insight',
              tags: ['self-improvement', 'deep-review', ...pathArray],
            },
            'improver',
          );
          this.stats.totalImprovements++;
        }

        this._log(
          `Deep review: ${(result.patterns || []).length} patterns, ${(result.improvements || []).length} improvements, ${(result.antiPatternsDetected || []).length} anti-patterns`,
        );
      }

      this.cyclesCompleted.deepReview++;
      this.lastCycleAt.deepReview = Date.now();
    } catch (e) {
      console.error('[Improver] Deep review error:', e.message);
    }
  }

  // ─────────────────────────────────────────────
  // CYCLE 3: Strategy Evolution (every 30 minutes)
  // Evolves per-domain strategies from accumulated data
  // ─────────────────────────────────────────────
  async _evolveStrategies() {
    if (
      this.brainRef &&
      (typeof this.brainRef.hasActiveChat === 'function'
        ? this.brainRef.hasActiveChat()
        : this.brainRef.isProcessing)
    )
      return;
    try {
      const stats = patternLibrary.getStats();
      const optimizerStats = optimizer.getStats();

      // Need sufficient data to evolve strategies
      if (stats.antiPatternCount + stats.successPatternCount < 5) return;

      // Build context from accumulated patterns
      const apContext = patternLibrary.formatForPrompt('', 2000);
      const optContext = optimizer.formatForPrompt('', 1000);

      const response = await quickAI(
        STRATEGY_PROMPT,
        `Accumulated patterns and optimization data:\n\n${apContext}\n\n${optContext}\n\nPart performance rankings:\n${JSON.stringify(optimizerStats.partRankings || [], null, 2)}`,
        undefined,
        3000,
      );

      let result;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        result = null;
      }

      if (result && result.strategies) {
        for (const [domain, strategy] of Object.entries(result.strategies)) {
          patternLibrary.setStrategy(domain, strategy);
          this.stats.strategiesEvolved++;
        }
        this._log(`Strategy evolution: ${Object.keys(result.strategies).length} domains updated`);
      }

      this.cyclesCompleted.strategyEvolution++;
      this.lastCycleAt.strategyEvolution = Date.now();
    } catch (e) {
      console.error('[Improver] Strategy evolution error:', e.message);
    }
  }

  // ─────────────────────────────────────────────
  // CYCLE 4: Knowledge Distillation (every hour)
  // Compresses recent learnings into permanent long-term memory
  // ─────────────────────────────────────────────
  async _distillKnowledge() {
    if (
      this.brainRef &&
      (typeof this.brainRef.hasActiveChat === 'function'
        ? this.brainRef.hasActiveChat()
        : this.brainRef.isProcessing)
    )
      return;
    try {
      const recentSTM = shortTermMemory.getRecent(20);
      const evaluations = recentSTM.filter(
        (m) => m.tags?.includes('evaluation') || m.tags?.includes('improvement'),
      );

      if (evaluations.length < 3) return;

      // Extract the most valuable insights and store in LTM
      for (const evaluation of evaluations.slice(0, 5)) {
        const content =
          typeof evaluation.content === 'string'
            ? evaluation.content
            : JSON.stringify(evaluation.content);

        if (content.length < 20) continue;

        const metadata = evaluation.metadata || {};
        if (metadata.lessons && Array.isArray(metadata.lessons)) {
          for (const lesson of metadata.lessons) {
            if (lesson && lesson.length > 10) {
              longTermMemory.store(
                ['self-improvement', 'lessons'],
                {
                  content: lesson,
                  type: 'lesson',
                  tags: ['self-improvement', 'distilled', 'lesson'],
                  metadata: {
                    sourceEvaluation: evaluation.id,
                    qualityScore: metadata.score || 0.85,
                    distilledAt: Date.now(),
                  },
                },
                'improver',
              );
              this.stats.knowledgeDistilled++;
            }
          }
        }
      }

      // Also distill top strategies into LTM
      const strategies = patternLibrary.getAllStrategies();
      for (const [domain, strategy] of Object.entries(strategies).slice(0, 3)) {
        longTermMemory.store(
          ['self-improvement', 'strategies', domain],
          {
            content: `Strategy for ${domain}: ${strategy.approach || strategy.description}. Key insight: ${strategy.keyInsight || 'N/A'}`,
            type: 'strategy',
            tags: ['self-improvement', 'strategy', domain],
            metadata: { occurrences: strategy.occurrences, updatedAt: strategy.updatedAt },
          },
          'improver',
        );
      }

      this._log(`Knowledge distillation: ${this.stats.knowledgeDistilled} insights stored in LTM`);
      this.cyclesCompleted.knowledgeDistillation++;
      this.lastCycleAt.knowledgeDistillation = Date.now();
    } catch (e) {
      console.error('[Improver] Knowledge distillation error:', e.message);
    }
  }

  // ─────────────────────────────────────────────
  // CYCLE 5: Self-Audit (every 4 hours)
  // Comprehensive system health and improvement assessment
  // ─────────────────────────────────────────────
  async _selfAudit() {
    if (
      this.brainRef &&
      (typeof this.brainRef.hasActiveChat === 'function'
        ? this.brainRef.hasActiveChat()
        : this.brainRef.isProcessing)
    )
      return;
    try {
      console.log('[Improver] Running self-audit...');

      const patternStats = patternLibrary.getStats();
      const evalStats = evaluator.getStats();
      const optStats = optimizer.getStats();

      // Compile audit report
      const auditReport = {
        timestamp: Date.now(),
        patterns: patternStats,
        evaluation: {
          avgScore: evalStats.avgScore,
          evaluated: evalStats.evaluated,
          degradationDetected: evalStats.degradationDetected,
          streak: evalStats.currentStreak,
        },
        optimization: {
          totalRoutings: optStats.totalRoutings,
          boostedParts: optStats.boostedParts,
          penalizedParts: optStats.penalizedParts,
        },
        cyclesCompleted: { ...this.cyclesCompleted },
      };

      // Store audit in long-term memory
      longTermMemory.store(
        ['self-improvement', 'audits'],
        {
          content: JSON.stringify(auditReport),
          type: 'audit-report',
          tags: ['self-improvement', 'audit'],
          metadata: auditReport,
        },
        'improver',
      );

      // If degradation detected, create an improvement plan
      if (evalStats.degradationDetected) {
        console.warn('[Improver] ⚠️ Degradation detected — creating improvement plan');
        const improvementPlan = await this._createImprovementPlan(evalStats, patternStats);
        if (improvementPlan) {
          longTermMemory.store(
            ['self-improvement', 'plans'],
            {
              content: improvementPlan,
              type: 'improvement-plan',
              tags: ['self-improvement', 'plan', 'active'],
            },
            'improver',
          );
        }
      }

      this.stats.selfAuditsRun++;
      this._log(
        `Self-audit complete: avg score ${evalStats.avgScore?.toFixed(2) || 'N/A'}, patterns ${patternStats.antiPatternCount + patternStats.successPatternCount}, strategies ${patternStats.strategyCount}`,
      );
      this.cyclesCompleted.selfAudit++;
      this.lastCycleAt.selfAudit = Date.now();
    } catch (e) {
      console.error('[Improver] Self-audit error:', e.message);
    }
  }

  /**
   * Create an improvement plan when degradation is detected
   */
  async _createImprovementPlan(evalStats, patternStats) {
    try {
      const response = await quickAI(
        `You are the Improvement Planner of SIS. The system has detected quality degradation.
Create a concise action plan (3-5 bullet points) to address the issues.
Focus on: prompt adjustments, routing changes, memory improvements.
Output plain text, no JSON.`,
        `Current stats: avg score ${evalStats.avgScore?.toFixed(2)}, streak ${evalStats.currentStreak}, anti-patterns ${patternStats.antiPatternCount}, top issues: ${JSON.stringify(patternStats.topAntiCategories?.slice(0, 3))}`,
        undefined,
        800,
      );
      return response || 'No plan generated';
    } catch {
      return null;
    }
  }

  _loadLog() {
    try {
      const logPath = path.join(DATA_ROOT, 'improvement/improver-log.json');
      if (fs.existsSync(logPath)) {
        const raw = fs.readFileSync(logPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.improvementLog = parsed;
          return;
        }
      }
    } catch {}

    // Seed log from recent autonomous cycles if empty
    try {
      const autoPath = path.join(DATA_ROOT, 'improvement/autonomous-learning.json');
      if (fs.existsSync(autoPath)) {
        const autoData = JSON.parse(fs.readFileSync(autoPath, 'utf8'));
        if (autoData.recentCycles && autoData.recentCycles.length > 0) {
          // Report what the cycle actually produced. 'n/a' is honest; the old
          // 0.78 ➜ 0.99 defaults made every empty cycle read as an improvement.
          this.improvementLog = autoData.recentCycles.slice(0, 15).map((c) => {
            const baseline = Number.isFinite(c.baselineScore) ? c.baselineScore.toFixed(2) : 'n/a';
            const final = Number.isFinite(c.finalScore) ? c.finalScore.toFixed(2) : 'n/a';
            const gain = Number.isFinite(c.gainPercent)
              ? `${c.gainPercent > 0 ? '+' : ''}${c.gainPercent}% heuristic delta`
              : 'no measured delta';
            const reward =
              typeof c.verifiedReward === 'number'
                ? ` | oracle reward ${c.verifiedReward}`
                : ' | unverified';
            return {
              message: `Autonomous Cycle #${c.cycleNumber} [${(c.domain || 'core').toUpperCase()}]: ${baseline} ➜ ${final} (${gain})${reward}`,
              timestamp: c.completedAt || c.startedAt || Date.now(),
            };
          });
          this._saveLog();
        }
      }
    } catch {}
  }

  _saveLog() {
    try {
      const logPath = path.join(DATA_ROOT, 'improvement/improver-log.json');
      const dir = path.dirname(logPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(logPath, JSON.stringify(this.improvementLog, null, 2), 'utf8');
    } catch {}
  }

  /**
   * Log an improvement action
   */
  _log(message) {
    const entry = { message, timestamp: Date.now() };
    this.improvementLog.unshift(entry);
    if (this.improvementLog.length > this.maxLogSize) {
      this.improvementLog = this.improvementLog.slice(0, this.maxLogSize);
    }
    this._saveLog();
    console.log(`[Improver] ${message}`);
  }

  /**
   * Get full status for UI and API
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      stats: { ...this.stats },
      cyclesCompleted: { ...this.cyclesCompleted },
      lastCycleAt: { ...this.lastCycleAt },
      recentLog: this.improvementLog.slice(0, 20),
      patternLibrary: patternLibrary.getStats(),
      evaluator: evaluator.getStats(),
      optimizer: optimizer.getStats(),
      autonomousLearner: {
        isRunning: autonomousLearner.isRunning,
        totalCycles: autonomousLearner.state?.totalCycles || 0,
        averageGainPercent: autonomousLearner.state?.averageGainPercent || 0,
      },
    };
  }
}

const improver = new SelfImprover();
export default improver;
