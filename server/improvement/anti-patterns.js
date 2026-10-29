// SIS 1.0 — Anti-Patterns & Success Patterns Library
// Persistent knowledge base: what NOT to do (anti-patterns) and what TO do (success patterns)
// Auto-evolves by recording failures, user corrections, and high-quality outcomes

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import hybridSearch from '../memory/hybrid-search.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.SIS_DATA_DIR ? path.join(path.resolve(process.env.SIS_DATA_DIR), 'improvement/patterns.json') : path.join(__dirname, '../../data/improvement/patterns.json');

class PatternLibrary {
  constructor() {
    this.antiPatterns = []; // what NOT to do
    this.successPatterns = []; // what TO do
    this.strategies = {}; // per-domain learned strategies
    this.stats = {
      totalInteractions: 0,
      failuresRecorded: 0,
      successesRecorded: 0,
      patternsPruned: 0,
      lastCycleAt: null,
    };
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        this.antiPatterns = data.antiPatterns || [];
        this.successPatterns = data.successPatterns || [];
        this.strategies = data.strategies || {};
        this.stats = { ...this.stats, ...data.stats };
      }
    } catch (e) {
      console.log('[Patterns] Starting fresh — no existing patterns found');
    }
  }

  _save() {
    try {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        DB_PATH,
        JSON.stringify(
          {
            antiPatterns: this.antiPatterns,
            successPatterns: this.successPatterns,
            strategies: this.strategies,
            stats: this.stats,
          },
          null,
          2,
        ),
      );
    } catch (e) {
      console.error('[Patterns] Save error:', e.message);
    }
  }

  /**
   * Record an anti-pattern (something that caused a bad outcome)
   * @param {Object} pattern
   * @param {string} pattern.category - 'quality', 'formatting', 'hallucination', 'incomplete', 'off-topic', 'code-error'
   * @param {string} pattern.description - what went wrong
   * @param {string} pattern.context - the type of user request
   * @param {string} pattern.avoid - what to avoid doing
   * @param {string} pattern.alternative - what to do instead
   * @param {number} pattern.severity - 1 (minor) to 5 (critical)
   * @param {string} pattern.source - which interaction/system generated this
   */
  recordAntiPattern(pattern) {
    const entry = {
      id: `ap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      category: pattern.category || 'general',
      description: pattern.description || '',
      context: pattern.context || '',
      avoid: pattern.avoid || '',
      alternative: pattern.alternative || '',
      severity: Math.min(5, Math.max(1, pattern.severity || 3)),
      source: pattern.source || 'system',
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
      occurrences: 1,
      decayScore: 1.0, // decays over time if not reinforced
    };

    // Deduplicate: if a similar anti-pattern exists, reinforce it instead of adding
    const existing = this.antiPatterns.find(
      (ap) =>
        ap.category === entry.category && this._similarity(ap.description, entry.description) > 0.6,
    );

    if (existing) {
      existing.occurrences++;
      existing.lastSeenAt = Date.now();
      existing.severity = Math.min(5, existing.severity + 0.5);
      existing.decayScore = Math.min(2.0, existing.decayScore + 0.2);
    } else {
      this.antiPatterns.push(entry);
    }

    this.stats.failuresRecorded++;
    this.stats.totalInteractions++;
    this._prune();
    this._save();
    return entry;
  }

  /**
   * Record a success pattern (something that produced a great outcome)
   */
  recordSuccessPattern(pattern) {
    const entry = {
      id: `sp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      category: pattern.category || 'general',
      description: pattern.description || '',
      context: pattern.context || '',
      strategy: pattern.strategy || '',
      outcome: pattern.outcome || '',
      qualityScore: pattern.qualityScore || 0.9,
      source: pattern.source || 'system',
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
      occurrences: 1,
      decayScore: 1.0,
    };

    const existing = this.successPatterns.find(
      (sp) =>
        sp.category === entry.category && this._similarity(sp.description, entry.description) > 0.6,
    );

    if (existing) {
      existing.occurrences++;
      existing.lastSeenAt = Date.now();
      existing.qualityScore = Math.max(existing.qualityScore, entry.qualityScore);
      existing.decayScore = Math.min(2.0, existing.decayScore + 0.2);
    } else {
      this.successPatterns.push(entry);
    }

    this.stats.successesRecorded++;
    this.stats.totalInteractions++;
    this._prune();
    this._save();
    return entry;
  }

  /**
   * Store a learned strategy for a specific domain/task type
   */
  setStrategy(domain, strategy) {
    this.strategies[domain] = {
      ...strategy,
      updatedAt: Date.now(),
      occurrences: (this.strategies[domain]?.occurrences || 0) + 1,
    };
    this._save();
  }

  /**
   * Get strategies relevant to a domain
   */
  getStrategy(domain) {
    return this.strategies[domain] || null;
  }

  /**
   * Get all strategies
   */
  getAllStrategies() {
    return this.strategies;
  }

  /**
   * Get high-severity anti-patterns relevant to a context
   */
  getRelevantAntiPatterns(context = '', limit = 8) {
    const now = Date.now();
    return this.antiPatterns
      .filter((ap) => {
        // Decay: patterns older than 7 days without reinforcement lose weight
        const age = now - ap.lastSeenAt;
        if (age > 7 * 24 * 60 * 60 * 1000) ap.decayScore *= 0.9;
        return ap.decayScore > 0.1;
      })
      .filter((ap) => !context || this._contextMatch(ap.context, context))
      .sort((a, b) => b.severity * b.decayScore - a.severity * a.decayScore)
      .slice(0, limit);
  }

  /**
   * Get top success patterns relevant to a context
   */
  getRelevantSuccessPatterns(context = '', limit = 5) {
    const now = Date.now();
    return this.successPatterns
      .filter((sp) => {
        const age = now - sp.lastSeenAt;
        if (age > 7 * 24 * 60 * 60 * 1000) sp.decayScore *= 0.9;
        return sp.decayScore > 0.1;
      })
      .filter((sp) => !context || this._contextMatch(sp.context, context))
      .sort((a, b) => b.qualityScore * b.occurrences - a.qualityScore * a.occurrences)
      .slice(0, limit);
  }

  /**
   * Format anti-patterns as injectable context for AI prompts
   */
  formatForPrompt(context = '', maxChars = 1500) {
    const aps = this.getRelevantAntiPatterns(context, 6);
    const sps = this.getRelevantSuccessPatterns(context, 4);

    if (aps.length === 0 && sps.length === 0) return '';

    let output = '## Self-Learned Rules (from past interactions)\n\n';

    if (aps.length > 0) {
      output += '### ⛔ Things to NEVER do (learned from failures):\n';
      for (const ap of aps) {
        output += `- [${ap.category}] ${ap.avoid || ap.description}`;
        if (ap.alternative) output += ` → Instead: ${ap.alternative}`;
        output += '\n';
      }
      output += '\n';
    }

    if (sps.length > 0) {
      output += '### ✅ Things that work well (learned from successes):\n';
      for (const sp of sps) {
        output += `- [${sp.category}] ${sp.strategy || sp.description}\n`;
      }
      output += '\n';
    }

    return output.slice(0, maxChars);
  }

  /**
   * Format strategies as injectable context
   */
  formatStrategiesForPrompt(context = '', maxChars = 1000) {
    const entries = Object.entries(this.strategies);
    if (entries.length === 0) return '';

    const lowerCtx = (context || '').toLowerCase();
    let relevant = entries.filter(
      ([domain]) => !lowerCtx || lowerCtx.includes(domain.toLowerCase()),
    );

    // If no direct domain name match, supply top active strategies
    if (relevant.length === 0) {
      relevant = entries
        .sort((a, b) => (b[1].occurrences || 0) - (a[1].occurrences || 0))
        .slice(0, 3);
    } else {
      relevant = relevant
        .sort((a, b) => (b[1].occurrences || 0) - (a[1].occurrences || 0))
        .slice(0, 5);
    }

    let output = '## Learned Operational Strategies & Invariants\n';
    for (const [domain, strategy] of relevant) {
      const approachDesc =
        strategy.approach || strategy.description || strategy.title || 'Operational protocol';
      output += `- **${domain.toUpperCase()}**: ${approachDesc}\n`;
      if (strategy.keyInsight) output += `  Key insight: ${strategy.keyInsight}\n`;
      if (strategy.rules && strategy.rules.length > 0) {
        output += `  Invariants: ${strategy.rules.slice(0, 2).join('; ')}\n`;
      }
    }

    return output.slice(0, maxChars);
  }

  /**
   * Prune low-value patterns to keep the library manageable
   */
  _prune() {
    const before = this.antiPatterns.length + this.successPatterns.length;

    // Remove anti-patterns with very low decay score
    this.antiPatterns = this.antiPatterns.filter((ap) => ap.decayScore > 0.05);

    // Keep at most 100 anti-patterns and 80 success patterns
    if (this.antiPatterns.length > 100) {
      this.antiPatterns.sort((a, b) => b.severity * b.decayScore - a.severity * a.decayScore);
      this.antiPatterns = this.antiPatterns.slice(0, 100);
    }
    if (this.successPatterns.length > 80) {
      this.successPatterns.sort(
        (a, b) => b.qualityScore * b.occurrences - a.qualityScore * a.occurrences,
      );
      this.successPatterns = this.successPatterns.slice(0, 80);
    }

    const after = this.antiPatterns.length + this.successPatterns.length;
    if (before > after) {
      this.stats.patternsPruned += before - after;
    }
  }

  /**
   * Semantic cosine similarity powered by Cognitive Hybrid Search
   */
  _similarity(a, b) {
    if (!a || !b) return 0;
    try {
      return hybridSearch.semanticSimilarity(a, b);
    } catch {
      const wordsA = new Set(a.toLowerCase().split(/\s+/));
      const wordsB = new Set(b.toLowerCase().split(/\s+/));
      const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
      const union = new Set([...wordsA, ...wordsB]).size;
      return union === 0 ? 0 : intersection / union;
    }
  }

  /**
   * Check if an anti-pattern's context is semantically relevant to query
   */
  _contextMatch(patternContext, queryContext) {
    if (!patternContext) return true;
    const pc = patternContext.toLowerCase();
    const qc = (queryContext || '').toLowerCase();
    if (pc.includes('all') || pc.includes('general')) return true;

    try {
      const semScore = hybridSearch.semanticSimilarity(pc, qc);
      if (semScore >= 0.22) return true;
    } catch {}

    // Fallback keyword overlap
    const pcWords = new Set(pc.split(/\s+/));
    const qcWords = new Set(qc.split(/\s+/));
    const overlap = [...pcWords].filter((w) => qcWords.has(w) && w.length > 3).length;
    return overlap >= 1;
  }

  /**
   * Instant Episodic Learning: Record an explicit user correction or negative feedback
   */
  recordUserCorrection(userMessage, previousAiResponse = '', correction = '') {
    const desc = correction || `User corrected response to "${userMessage.slice(0, 60)}"`;
    console.log(`[Patterns] Instant episodic learning recorded: "${desc.slice(0, 60)}"`);
    return this.recordAntiPattern({
      category: 'user-correction',
      description: desc,
      context: userMessage.slice(0, 150),
      avoid: previousAiResponse.slice(0, 150) || 'Previous incorrect assumption or behavior',
      alternative: desc,
      severity: 5,
      source: 'user-feedback',
    });
  }

  /**
   * Get full stats for UI
   */
  getStats() {
    return {
      ...this.stats,
      antiPatternCount: this.antiPatterns.length,
      successPatternCount: this.successPatterns.length,
      strategyCount: Object.keys(this.strategies).length,
      topAntiCategories: this._categoryStats(this.antiPatterns),
      topSuccessCategories: this._categoryStats(this.successPatterns),
    };
  }

  _categoryStats(patterns) {
    const cats = {};
    for (const p of patterns) {
      cats[p.category] = (cats[p.category] || 0) + 1;
    }
    return Object.entries(cats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, count]) => ({ category: cat, count }));
  }

  /**
   * Force a save (for manual triggers)
   */
  flush() {
    this._save();
  }
}

const patternLibrary = new PatternLibrary();
export default patternLibrary;
