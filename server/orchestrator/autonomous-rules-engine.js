// SIS 1.0 — Autonomous Operational Rules Engine
// Dynamically creates, persists, evaluates, and enforces operational rules based on:
// 1. User corrections, feedback, and explicit directives
// 2. High-frequency domain usage patterns (improving on what SIS is used for most)
// 3. Web-learned insights and cutting-edge internet best practices
// 4. Past mistakes, anti-patterns, and auto-healed incidents

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULES_DIR = process.env.SIS_DATA_DIR
  ? path.join(path.resolve(process.env.SIS_DATA_DIR), 'rules')
  : path.resolve(__dirname, '../../data/rules');
const RULES_FILE = path.join(RULES_DIR, 'operational-rules.json');
const RULES_MD = path.join(RULES_DIR, 'RULES.md');

export class AutonomousRulesEngine {
  constructor() {
    this.name = 'Autonomous Operational Rules Engine';
    this.version = '1.0';
    this.rules = new Map();
    this.broadcast = null;

    this._ensureStorage();
    this._loadRules();
    this._bootstrapCoreRules();
  }

  setBroadcast(fn) {
    this.broadcast = fn;
  }

  async initialize() {
    this._ensureStorage();
    this._loadRules();
    this._bootstrapCoreRules();
    return { rulesCount: this.rules.size };
  }

  _ensureStorage() {
    if (!fs.existsSync(RULES_DIR)) {
      fs.mkdirSync(RULES_DIR, { recursive: true });
    }
  }

  _loadRules() {
    try {
      if (fs.existsSync(RULES_FILE)) {
        const raw = fs.readFileSync(RULES_FILE, 'utf8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          for (const r of list) {
            this.rules.set(r.id, r);
          }
        }
      }
    } catch (err) {
      console.warn(
        '[AutonomousRules] Error reading rules file, initializing clean map:',
        err.message,
      );
    }
  }

  _saveRules() {
    try {
      this._ensureStorage();
      const list = Array.from(this.rules.values());
      fs.writeFileSync(RULES_FILE, JSON.stringify(list, null, 2), 'utf8');
      this._generateMarkdownManifest(list);
    } catch (err) {
      console.error('[AutonomousRules] Error saving rules:', err.message);
    }
  }

  _generateMarkdownManifest(rules) {
    const activeRules = rules.filter((r) => r.isActive !== false);
    const lines = [
      '# SIS 1.0 — Active Operational Rules Manifest',
      '',
      '> **Autonomously Generated and Maintained**: These operational rules are continuously synthesized by SIS from user directives, dominant domain usage patterns, web-learned insights, and past mistake corrections.',
      '',
      `**Total Active Rules:** ${activeRules.length} | **Last Updated:** ${new Date().toISOString()}`,
      '',
      '---',
      '',
    ];

    for (const rule of activeRules) {
      lines.push(`### [${rule.id.toUpperCase()}] ${rule.title}`);
      lines.push(`- **Domain:** \`${rule.domain || 'all'}\``);
      lines.push(`- **Source:** \`${rule.source}\` (Weight: ${rule.weight || 1.0})`);
      lines.push(`- **Directive:** ${rule.directive}`);
      lines.push(`- **Rationale:** ${rule.rationale}`);
      if (rule.triggers && rule.triggers.length > 0) {
        lines.push(`- **Triggers:** \`${rule.triggers.join('`, `')}\``);
      }
      lines.push(`- **Enforcement Count:** ${rule.enforcementCount || 0} times`);
      lines.push('');
    }

    fs.writeFileSync(RULES_MD, lines.join('\n'), 'utf8');
  }

  _bootstrapCoreRules() {
    // Foundational rules directly derived from user interaction history
    const coreRules = [
      {
        id: 'rule_zero_promissory_halts',
        title: 'Zero Promissory Halts (Never Stop Mid-Task)',
        directive:
          'When asked to build, fix, code, or improve something, execute the tool or produce the complete runnable code in this exact turn. Never stop after acknowledging or planning, and never force the user to type "continue".',
        rationale:
          'Mandated by user to prevent halting mid-task and demanding continuation prompts.',
        source: 'user_correction',
        domain: 'all',
        triggers: ['build', 'code', 'fix', 'improve', 'continue', 'game', 'app'],
        weight: 1.0,
        isActive: true,
        createdAt: Date.now(),
        enforcementCount: 0,
      },
      {
        id: 'rule_empirical_rigor_no_fake_perfection',
        title: 'Empirical Rigor & Calibration (No Fake 100%)',
        directive:
          'When evaluating benchmarks or testing system capabilities, maintain authentic empirical rigor. Acknowledge real frontiers, unsolved conjectures, and genuine failure modes. Never present rigged 100% scores on research-level benchmarks.',
        rationale:
          'Mandated by user: "getting a 100% is not possible at all. Keep it fair and perfect."',
        source: 'user_correction',
        domain: 'benchmarks',
        triggers: ['benchmark', 'test', 'compare', 'evaluation', 'score', 'frontier'],
        weight: 1.0,
        isActive: true,
        createdAt: Date.now(),
        enforcementCount: 0,
      },
      {
        id: 'rule_authentic_human_demeanor',
        title: 'Authentic Human Mindset & Empathy',
        directive:
          'Behave, reason, and communicate like an elite human builder. Eliminate canned AI robotic phrases ("As an AI language model...", "I apologize for the confusion"). Provide immediate authentic empathy and direct technical action.',
        rationale:
          'Mandated by user: "work on its human identity. Make it behave like a human and works like a human."',
        source: 'user_correction',
        domain: 'general',
        triggers: ['all'],
        weight: 0.95,
        isActive: true,
        createdAt: Date.now(),
        enforcementCount: 0,
      },
      {
        id: 'rule_memory_first_synthesis',
        title: 'Memory-First Continuity & Contextual Recall',
        directive:
          'Prioritize short-term working state, long-term user preferences, past corrections, and active operational rules on every turn. Ensure complete continuity across conversations without repeating previously corrected mistakes.',
        rationale: 'Mandated by user: "keeps its memory in mind when giving outputs."',
        source: 'user_directive',
        domain: 'all',
        triggers: ['all'],
        weight: 1.0,
        isActive: true,
        createdAt: Date.now(),
        enforcementCount: 0,
      },
      {
        id: 'rule_dominant_usage_evolution',
        title: 'Continuous Adaptive Evolution on Dominant Domains',
        directive:
          'Actively adapt, refine specialized tools, and deepen expertise in the specific domains and applications the user employs SIS for most (e.g. open world games, Three.js 3D synthesis, systems architecture).',
        rationale:
          'Mandated by user: "keeps improving on the basis of what it is used for the most."',
        source: 'usage_affinity',
        domain: 'all',
        triggers: ['all'],
        weight: 0.9,
        isActive: true,
        createdAt: Date.now(),
        enforcementCount: 0,
      },
      {
        id: 'rule_internet_grounded_intelligence',
        title: 'Live Internet Research & Knowledge Assimilation',
        directive:
          "Continuously search the live internet for cutting-edge best practices, documentation, API signatures, and verified algorithms for the user's dominant domains, assimilating findings into long-term memory and operational rules.",
        rationale: 'Mandated by user: "keeps improving by searching the internet and all."',
        source: 'web_research',
        domain: 'all',
        triggers: ['all'],
        weight: 0.9,
        isActive: true,
        createdAt: Date.now(),
        enforcementCount: 0,
      },
      {
        id: 'rule_complete_runnable_game_deliverable',
        title: 'Complete Autonomous Game & 3D Deliverables',
        directive:
          'When asked to build a game or 3D world, deliver an expansive, fully runnable application with procedural terrain, player physics/controls, lighting, sound effects, collision, and HUD. Never provide an incomplete skeleton.',
        rationale:
          'Mandated by user after requesting an open-world game and receiving a partial skeleton.',
        source: 'user_correction',
        domain: '3d',
        triggers: ['game', 'open world', 'three.js', 'canvas', '3d', 'scene'],
        weight: 1.0,
        isActive: true,
        createdAt: Date.now(),
        enforcementCount: 0,
      },
    ];

    let changed = false;
    for (const r of coreRules) {
      if (!this.rules.has(r.id)) {
        this.rules.set(r.id, r);
        changed = true;
      }
    }

    if (changed) {
      this._saveRules();
      console.log(
        `[AutonomousRules] Bootstrapped ${this.rules.size} operational rules into ${RULES_MD}`,
      );
    }
  }

  /**
   * Autonomously formulate and add a new operational rule
   */
  addRule({
    id,
    title,
    directive,
    rule,
    rationale,
    source = 'autonomous_learning',
    domain = 'all',
    triggers = [],
    triggerKeywords = [],
    weight = 0.85,
  }) {
    const finalDirective = directive || rule;
    if (!finalDirective) return null;
    const finalId =
      id ||
      'rule_' +
        (domain || 'gen') +
        '_' +
        Date.now().toString(36) +
        '_' +
        Math.random().toString(36).slice(2, 6);
    const ruleId = finalId.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const finalTriggers = triggers && triggers.length > 0 ? triggers : triggerKeywords;

    const existing = this.rules.get(ruleId);
    const ruleObj = {
      id: ruleId,
      title:
        title ||
        ruleId
          .replace(/^rule_/, '')
          .replace(/_/g, ' ')
          .toUpperCase(),
      directive: finalDirective,
      rule: finalDirective,
      rationale: rationale || 'Synthesized from autonomous system learning',
      source,
      domain,
      triggers: Array.isArray(finalTriggers) ? finalTriggers : [finalTriggers],
      triggerKeywords: Array.isArray(finalTriggers) ? finalTriggers : [finalTriggers],
      weight: existing ? Math.min(1.0, (existing.weight || 0.85) + 0.05) : weight,
      isActive: true,
      createdAt: existing?.createdAt || Date.now(),
      lastUpdated: Date.now(),
      enforcementCount: existing?.enforcementCount || 0,
    };

    this.rules.set(ruleId, ruleObj);
    this._saveRules();

    console.log(
      `[AutonomousRules] ⚡ Formulated New Operational Rule: [${ruleObj.id}] "${ruleObj.title}"`,
    );
    if (this.broadcast) {
      this.broadcast('operational-rule-created', { rule: ruleObj });
    }

    return ruleObj;
  }

  /**
   * Analyze user interaction to autonomously formulate new rules
   * Detects explicit user directives, corrections, and strong preferences
   */
  analyzeUserMessage(userMessage, conversationHistory = []) {
    const text = String(userMessage || '').trim();
    if (!text || text.length < 5) {
      const empty = { hasDirective: false, newRuleCreated: false, rules: [], rule: null };
      empty[Symbol.iterator] = function* () {};
      return empty;
    }

    const lower = text.toLowerCase();
    const createdRules = [];

    // 1. Detect negative corrections ("I didn't say X, I said Y", "don't do X", "stop doing X", "not X but Y")
    const correctionMatch = lower.match(
      /(?:i didn't say|i said you to|don't just|do not|never|instead of|stop doing|make sure you always)\s+([^.!?\n]+)/i,
    );
    if (correctionMatch) {
      const coreInstruction = correctionMatch[1].trim();
      const slug = 'rule_user_pref_' + coreInstruction.slice(0, 30).replace(/[^a-z0-9]/g, '_');
      const rule = this.addRule({
        id: slug,
        title: `User Specific Directive: "${coreInstruction.slice(0, 45)}"`,
        directive: `Strictly follow user correction: "${coreInstruction}". Avoid doing what was previously rejected.`,
        rationale: `Formulated directly from user correction: "${text.slice(0, 80)}"`,
        source: 'user_correction',
        domain: 'all',
        triggers: coreInstruction
          .split(/\s+/)
          .filter((w) => w.length > 3)
          .slice(0, 4),
        weight: 1.0,
      });
      if (rule) createdRules.push(rule);
    }

    // 2. Detect general forward directives ("From now on", "always ensure", "make sure you always", "make that it")
    const directiveMatch = lower.match(
      /(?:from now on|always ensure|ensure all|make sure you always|make that it|never again)\s+([^.!?\n]+)/i,
    );
    if (directiveMatch && !correctionMatch) {
      const coreInstruction = directiveMatch[1].trim();
      const slug = 'rule_directive_' + coreInstruction.slice(0, 30).replace(/[^a-z0-9]/g, '_');
      const rule = this.addRule({
        id: slug,
        title: `Operational Directive: "${coreInstruction.slice(0, 45)}"`,
        directive: `Strict operational directive: "${coreInstruction}".`,
        rationale: `Formulated from user explicit directive: "${text.slice(0, 80)}"`,
        source: 'user_directive',
        domain: 'all',
        triggers: coreInstruction
          .split(/\s+/)
          .filter((w) => w.length > 3)
          .slice(0, 4),
        weight: 1.0,
      });
      if (rule) createdRules.push(rule);
    }

    // 3. Detect requests for human-like behavior
    if (/behave like a human|act like a human|process like a human/i.test(lower)) {
      const rule = this.addRule({
        id: 'rule_human_empathetic_persona',
        title: 'Authentic Human Builder Mindset',
        directive:
          'Engage with visceral intuition, authentic human emotion, non-robotic phrasing, and immediate practical engineering.',
        rationale: 'Directly mandated by user prompt regarding human behavior.',
        source: 'user_directive',
        domain: 'general',
        triggers: ['all'],
        weight: 1.0,
      });
      if (rule) createdRules.push(rule);
    }

    // 4. Detect requests for continuous internet learning & usage-based evolution
    if (/keeps improving|search the internet|search the web|used for the most/i.test(lower)) {
      const rule = this.addRule({
        id: 'rule_continuous_internet_evolution',
        title: 'Continuous Web-Assimilated Learning',
        directive:
          'Continuously search the web for cutting-edge patterns and refine capabilities on highest-frequency domains.',
        rationale:
          'Mandated by user prompt regarding continuous web learning and dominant usage evolution.',
        source: 'user_directive',
        domain: 'all',
        triggers: ['all'],
        weight: 1.0,
      });
      if (rule) createdRules.push(rule);
    }

    const result = {
      hasDirective: createdRules.length > 0,
      newRuleCreated: createdRules.length > 0,
      rules: createdRules,
      rule: createdRules[0] || null,
    };
    result[Symbol.iterator] = function* () {
      yield* createdRules;
    };
    return result;
  }

  /**
   * Get all active rules matching a domain and message context
   */
  getActiveRulesForContext({ domain = 'all', text = '', limit = 8 } = {}) {
    const active = Array.from(this.rules.values()).filter((r) => r.isActive !== false);
    const lowerText = String(text || '').toLowerCase();

    // Score rules based on relevance
    const scored = active.map((r) => {
      let score = r.weight || 0.8;

      // Domain match
      if (r.domain === 'all' || r.domain === domain) {
        score += 0.5;
      }

      // Trigger word matches
      if (r.triggers && r.triggers.length > 0) {
        if (r.triggers.includes('all')) {
          score += 0.3;
        } else {
          for (const trig of r.triggers) {
            if (lowerText.includes(trig.toLowerCase())) {
              score += 0.4;
              break;
            }
          }
        }
      }

      return { rule: r, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, limit).map((s) => {
      // Increment enforcement count
      s.rule.enforcementCount = (s.rule.enforcementCount || 0) + 1;
      s.rule.lastEnforced = Date.now();
      return s.rule;
    });

    this._saveRules();
    return top;
  }

  /**
   * Format active operational rules for injection into prompt context
   */
  formatForPrompt(context = {}) {
    const rules = this.getActiveRulesForContext(context);
    if (!rules || rules.length === 0) return '';

    const lines = [
      '## AUTONOMOUSLY CREATED OPERATIONAL RULES (MANDATORY ENFORCEMENT)',
      'The following operational rules were autonomously formulated from user directives, dominant usage patterns, and learned internet research. You MUST strictly adhere to them in this response:',
    ];

    rules.forEach((r, idx) => {
      lines.push(`${idx + 1}. **[${r.title}]**: ${r.directive}`);
    });

    return lines.join('\n');
  }

  getAllRules() {
    return Array.from(this.rules.values());
  }

  getActiveRules() {
    return Array.from(this.rules.values()).filter((r) => r.isActive !== false);
  }

  getRulesSummary() {
    const active = this.getActiveRules();
    return {
      total: this.rules.size,
      active: active.length,
      rules: active.map((r) => ({
        id: r.id,
        title: r.title,
        directive: r.directive,
        rule: r.directive,
        domain: r.domain,
        source: r.source,
        weight: r.weight,
        enforcementCount: r.enforcementCount || 0,
      })),
    };
  }

  getPromptInjection(domain = 'all', text = '') {
    return this.formatForPrompt({ domain, text });
  }
}

const autonomousRulesEngine = new AutonomousRulesEngine();
export default autonomousRulesEngine;
