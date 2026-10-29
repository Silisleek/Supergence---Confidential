// SIS 1.0 — Routing Optimizer
// Learns which AI parts produce the best outcomes for different task types
// and dynamically adjusts routing weights to prefer the most effective parts

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import patternLibrary from './anti-patterns.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OPT_PATH = process.env.SIS_DATA_DIR ? path.join(path.resolve(process.env.SIS_DATA_DIR), 'improvement/optimizer.json') : path.join(__dirname, '../../data/improvement/optimizer.json');

class RoutingOptimizer {
  constructor() {
    // Per-part performance tracking: { partName: { successes, failures, avgScore, domains } }
    this.partMetrics = {};
    // Per-domain best parts: { domain: [partName, ...] }
    this.domainBestParts = {};
    // Dynamic routing overrides: { queryPattern: [partName, ...] }
    this.routingOverrides = {};
    // Global routing adjustments
    this.adjustments = {
      confidenceBoost: {}, // { partName: boostAmount }
      confidencePenalty: {}, // { partName: penaltyAmount }
      alwaysInclude: [], // parts that should always run
      neverInclude: [], // parts that should be deprioritized
    };
    this.stats = {
      totalRoutings: 0,
      optimizationsApplied: 0,
      lastOptimizationAt: null,
    };
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(OPT_PATH)) {
        const data = JSON.parse(fs.readFileSync(OPT_PATH, 'utf8'));
        this.partMetrics = data.partMetrics || {};
        this.domainBestParts = data.domainBestParts || {};
        this.routingOverrides = data.routingOverrides || {};
        this.adjustments = { ...this.adjustments, ...data.adjustments };
        this.stats = { ...this.stats, ...data.stats };
      }
    } catch {}
  }

  _save() {
    try {
      const dir = path.dirname(OPT_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        OPT_PATH,
        JSON.stringify(
          {
            partMetrics: this.partMetrics,
            domainBestParts: this.domainBestParts,
            routingOverrides: this.routingOverrides,
            adjustments: this.adjustments,
            stats: this.stats,
          },
          null,
          2,
        ),
      );
    } catch {}
  }

  /**
   * Record the outcome of a routing decision
   */
  recordOutcome(partsUsed, qualityScore, domain = 'general') {
    this.stats.totalRoutings++;

    for (const partName of partsUsed) {
      if (!this.partMetrics[partName]) {
        this.partMetrics[partName] = {
          successes: 0,
          failures: 0,
          totalScore: 0,
          avgScore: 0.85,
          domains: {},
          lastUpdated: Date.now(),
        };
      }

      const m = this.partMetrics[partName];
      if (qualityScore >= 0.8) {
        m.successes++;
      } else {
        m.failures++;
      }
      m.totalScore += qualityScore;
      m.avgScore = m.totalScore / (m.successes + m.failures);
      m.lastUpdated = Date.now();

      // Track per-domain performance
      if (!m.domains[domain]) m.domains[domain] = { count: 0, avgScore: 0 };
      const d = m.domains[domain];
      d.avgScore = (d.avgScore * d.count + qualityScore) / (d.count + 1);
      d.count++;
    }

    this._optimize();
    this._save();
  }

  /**
   * Run optimization: analyze metrics and compute routing adjustments
   */
  _optimize() {
    const now = Date.now();
    // Only optimize every 5 minutes
    if (this.stats.lastOptimizationAt && now - this.stats.lastOptimizationAt < 5 * 60 * 1000) {
      return;
    }

    console.log('[Optimizer] Running optimization cycle...');
    this.stats.lastOptimizationAt = now;
    this.stats.optimizationsApplied++;

    // 1. Identify best/worst parts
    const sorted = Object.entries(this.partMetrics)
      .filter(([_, m]) => m.successes + m.failures >= 3) // need minimum data
      .sort((a, b) => b[1].avgScore - a[1].avgScore);

    // 2. Compute confidence boosts/penalties
    this.adjustments.confidenceBoost = {};
    this.adjustments.confidencePenalty = {};

    for (const [name, metrics] of sorted) {
      const performance = metrics.avgScore;
      const sampleSize = metrics.successes + metrics.failures;

      if (sampleSize >= 5) {
        if (performance >= 0.9) {
          this.adjustments.confidenceBoost[name] = Math.min(0.3, (performance - 0.8) * 1.5);
        } else if (performance < 0.6) {
          this.adjustments.confidencePenalty[name] = Math.min(0.4, (0.7 - performance) * 2);
        }
      }
    }

    // 3. Update domain best-parts mapping
    const domains = {};
    for (const [name, metrics] of Object.entries(this.partMetrics)) {
      for (const [domain, d] of Object.entries(metrics.domains)) {
        if (d.count >= 2) {
          if (!domains[domain]) domains[domain] = [];
          domains[domain].push({ name, score: d.avgScore, count: d.count });
        }
      }
    }

    this.domainBestParts = {};
    for (const [domain, parts] of Object.entries(domains)) {
      this.domainBestParts[domain] = parts
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((p) => p.name);
    }

    // 4. Prune old metrics (keep last 30 days of data)
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    for (const [name, m] of Object.entries(this.partMetrics)) {
      if (m.lastUpdated < thirtyDaysAgo && (m.successes + m.failers || 0) < 5) {
        delete this.partMetrics[name];
      }
    }

    console.log(
      `[Optimizer] Optimization complete. Boosted: ${Object.keys(this.adjustments.confidenceBoost).length}, Penalized: ${Object.keys(this.adjustments.confidencePenalty).length}`,
    );
  }

  /**
   * Get routing adjustments for a specific query
   */
  getAdjustments(query = '') {
    const adjustments = { ...this.adjustments };

    // Check for query-specific overrides
    for (const [pattern, parts] of Object.entries(this.routingOverrides)) {
      if (query.toLowerCase().includes(pattern.toLowerCase())) {
        adjustments.alwaysInclude = [...new Set([...adjustments.alwaysInclude, ...parts])];
      }
    }

    return adjustments;
  }

  /**
   * Get the best parts for a domain
   */
  getBestPartsForDomain(domain) {
    return this.domainBestParts[domain] || [];
  }

  /**
   * Record that a user specifically praised or blamed a part's contribution
   */
  recordPartFeedback(partName, positive, domain = 'general') {
    if (!this.partMetrics[partName]) {
      this.partMetrics[partName] = {
        successes: 0,
        failures: 0,
        totalScore: 0,
        avgScore: 0.85,
        domains: {},
        lastUpdated: Date.now(),
      };
    }

    const m = this.partMetrics[partName];
    const score = positive ? 0.95 : 0.3;

    if (positive) m.successes++;
    else m.failures++;
    m.totalScore += score;
    m.avgScore = m.totalScore / (m.successes + m.failures);
    m.lastUpdated = Date.now();

    if (!m.domains[domain]) m.domains[domain] = { count: 0, avgScore: 0 };
    const d = m.domains[domain];
    d.avgScore = (d.avgScore * d.count + score) / (d.count + 1);
    d.count++;

    this._optimize();
    this._save();
  }

  /**
   * Format optimizer data for AI context injection
   */
  formatForPrompt(domain = '', maxChars = 800) {
    let output = '';

    // Domain-specific best parts
    if (domain && this.domainBestParts[domain]) {
      const best = this.domainBestParts[domain].slice(0, 3);
      output += `## Best parts for "${domain}" (learned from past results):\n`;
      output += `Prioritize: ${best.join(', ')}\n\n`;
    }

    // Confidence adjustments
    const boosted = Object.entries(this.adjustments.confidenceBoost)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    const penalized = Object.entries(this.adjustments.confidencePenalty)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (boosted.length > 0) {
      output += `### High-performing parts:\n`;
      for (const [name, boost] of boosted) {
        const m = this.partMetrics[name];
        output += `- ${name}: avg score ${m.avgScore.toFixed(2)} (+${(boost * 100).toFixed(0)}% boost)\n`;
      }
    }

    if (penalized.length > 0) {
      output += `### Under-performing parts (use with caution):\n`;
      for (const [name, penalty] of penalized) {
        const m = this.partMetrics[name];
        output += `- ${name}: avg score ${m.avgScore.toFixed(2)} (${(penalty * 100).toFixed(0)}% penalty)\n`;
      }
    }

    return output.slice(0, maxChars);
  }

  /**
   * Get stats for UI
   */
  getStats() {
    const partRankings = Object.entries(this.partMetrics)
      .map(([name, m]) => ({
        name,
        avgScore: m.avgScore,
        totalRuns: m.successes + m.failures,
        successRate: m.successes + m.failures > 0 ? m.successes / (m.successes + m.failures) : 0,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 10);

    return {
      ...this.stats,
      partRankings,
      domainCount: Object.keys(this.domainBestParts).length,
      boostedParts: Object.keys(this.adjustments.confidenceBoost).length,
      penalizedParts: Object.keys(this.adjustments.confidencePenalty).length,
    };
  }
}

const optimizer = new RoutingOptimizer();
export default optimizer;
