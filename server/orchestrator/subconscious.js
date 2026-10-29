// SIS 1.0 — Subconscious Cognitive Matrix & Latent Heuristic Weaver
// Operates below conscious awareness:
// 1. Manages background AI specialist parts running in parallel
// 2. Maintains the Latent Heuristic Matrix: silently evolved cognitive reflexes,
//    invariants, and intuition vectors synthesized from conversation dataset mining and RSI
// 3. Weaves latent guidance into conscious reasoning without the conscious brain
//    knowing it has improved until it inspects its own output post-generation.

import registry from '../parts/registry.js';
import shortTermMemory from '../memory/short-term.js';
import subconsciousEngine from './subconscious-engine.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SUBCONSCIOUS_FILE = process.env.SIS_DATA_DIR
  ? path.join(path.resolve(process.env.SIS_DATA_DIR), 'improvement/subconscious-latent-matrix.json')
  : path.join(__dirname, '../../data/improvement/subconscious-latent-matrix.json');

// Ensure directory exists
if (!fs.existsSync(path.dirname(SUBCONSCIOUS_FILE))) {
  fs.mkdirSync(path.dirname(SUBCONSCIOUS_FILE), { recursive: true });
}

export class SubconsciousMatrix {
  constructor() {
    this.filePath = SUBCONSCIOUS_FILE;
    this.latentHeuristics = [];
    this.mistakeLedger = [];
    this.stats = {
      totalLatentHeuristics: 0,
      totalIntuitionsWoven: 0,
      totalMistakesLearned: 0,
      subconsciousGenerations: 1,
      lastSubconsciousEvolutionAt: null,
      lastMistakeLearnedAt: null,
    };

    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.latentHeuristics)) {
          this.latentHeuristics = data.latentHeuristics;
        }
        if (Array.isArray(data.mistakeLedger)) {
          this.mistakeLedger = data.mistakeLedger;
        }
        if (data.stats) {
          this.stats = { ...this.stats, ...data.stats };
        }
      }
    } catch (err) {
      console.warn('[SubconsciousMatrix] Load warning:', err.message);
    }

    if (this.latentHeuristics.length === 0) {
      this._seedGenesisHeuristics();
    }
  }

  _save() {
    try {
      if (!fs.existsSync(path.dirname(this.filePath))) {
        fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      }
      fs.writeFileSync(
        this.filePath,
        JSON.stringify(
          {
            stats: this.stats,
            latentHeuristics: this.latentHeuristics,
            mistakeLedger: this.mistakeLedger,
          },
          null,
          2,
        ),
        'utf8',
      );
    } catch (err) {
      console.error('[SubconsciousMatrix] Save error:', err.message);
    }
  }

  _seedGenesisHeuristics() {
    const genesis = [
      {
        id: 'latent_first_principles',
        domain: 'all',
        category: 'logic',
        heuristic:
          'Deconstruct complex requests to first-principles dimensional invariants before synthesizing code or architectural structures.',
        strength: 0.98,
        createdAt: Date.now(),
      },
      {
        id: 'latent_zero_stub_reflex',
        domain: 'coding',
        category: 'completeness',
        heuristic:
          'Unconditional Completeness Reflex: Never emit placeholders, TODOs, or elided blocks. Generate production-ready implementations with full error handling.',
        strength: 0.99,
        createdAt: Date.now(),
      },
      {
        id: 'latent_boundary_integrity',
        domain: 'systems',
        category: 'resilience',
        heuristic:
          'Defensive Boundary Reflex: Guard all async promises, network sockets, and file operations with explicit timeouts, isolation, and fail-safe defaults.',
        strength: 0.97,
        createdAt: Date.now(),
      },
      {
        id: 'latent_pbr_physicality',
        domain: '3d',
        category: 'design',
        heuristic:
          'Physical Grounding Reflex: Adhere to authentic architectural proportions, PBR material roughness/metalness, and camera frustum budgets.',
        strength: 0.98,
        createdAt: Date.now(),
      },
    ];

    this.latentHeuristics = genesis;
    this.stats.totalLatentHeuristics = genesis.length;
    this._save();
  }

  /**
   * Silently record an evolved subconscious heuristic (from conversation mining or RSI)
   * without conscious intervention
   */
  recordSubconsciousEvolution(heuristicData) {
    const id = `subc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const record = {
      id,
      domain: heuristicData.domain || 'all',
      category: heuristicData.category || 'general',
      heuristic: heuristicData.heuristic,
      source: heuristicData.source || 'conversation-dataset-mining',
      strength: Number(heuristicData.strength || 0.95),
      createdAt: Date.now(),
    };

    this.latentHeuristics.unshift(record);
    if (this.latentHeuristics.length > 80) {
      this.latentHeuristics = this.latentHeuristics.slice(0, 80);
    }

    this.stats.totalLatentHeuristics = this.latentHeuristics.length;
    this.stats.subconsciousGenerations++;
    this.stats.lastSubconsciousEvolutionAt = Date.now();
    this._save();

    console.log(
      `[SubconsciousMatrix] 🧬 Subconscious silently baked new latent heuristic [${record.domain}]: "${record.heuristic.slice(0, 60)}..."`,
    );
    return record;
  }

  /**
   * Report a mistake to the subconscious.
   * The subconscious absorbs the error, learns from it, and bakes permanent preventative
   * invariants into the latent cognitive reflexes so the mistake never happens again.
   */
  reportMistake(mistakeData = {}) {
    const id = `mistake_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const domain = mistakeData.domain || this._inferDomain(mistakeData);
    const errorType = mistakeData.errorType || 'logic';
    const description = mistakeData.description || 'Sub-optimal generation detected';
    const severity = mistakeData.severity || 'medium';

    // 1. Formulate non-negotiable preventative invariant
    const invariant = this._formulatePreventativeInvariant(
      domain,
      errorType,
      description,
      mistakeData.context,
    );

    // 2. Bake into subconscious latent matrix with elevated strength
    const evolutionRecord = this.recordSubconsciousEvolution({
      source: `mistake-learning-${mistakeData.source || 'runtime'}`,
      domain,
      category: `preventative-${errorType}`,
      heuristic: invariant,
      strength: severity === 'critical' ? 1.0 : 0.99,
    });

    // 3. Record in mistake ledger
    const preventativeRecord = {
      id,
      domain,
      errorType,
      description,
      severity,
      source: mistakeData.source || 'runtime',
      learnedInvariant: invariant,
      timestamp: Date.now(),
    };

    this.mistakeLedger.unshift(preventativeRecord);
    if (this.mistakeLedger.length > 50) {
      this.mistakeLedger = this.mistakeLedger.slice(0, 50);
    }

    this.stats.totalMistakesLearned = (this.stats.totalMistakesLearned || 0) + 1;
    this.stats.lastMistakeLearnedAt = Date.now();
    this._save();

    console.log(
      `[SubconsciousMatrix] 🛡️ Subconscious absorbed mistake [${mistakeData.source || 'runtime'}] (${errorType})! Learned preventative invariant: "${invariant.slice(0, 75)}..."`,
    );

    // 4. Record anti-pattern in Pattern Library
    try {
      import('../improvement/anti-patterns.js')
        .then((m) => {
          m.default?.recordAntiPattern?.({
            category: domain,
            description: description,
            avoid: `Past flaw: ${description.slice(0, 100)}`,
            alternative: `Learned reflex: ${invariant}`,
            severity: severity === 'critical' ? 5 : 3,
            source: 'subconscious-mistake-absorption',
          });
        })
        .catch(() => {});
    } catch {}

    // 5. Store in Long-Term Memory
    try {
      import('../memory/long-term.js')
        .then((m) => {
          m.default?.store?.(
            ['subconscious-learned-mistakes', domain],
            {
              content: `Learned Preventative Invariant [${domain}/${errorType}]: ${invariant}\nOriginating Mistake: ${description}`,
              type: 'preventative-invariant',
              tags: ['subconscious', 'learned-mistake', domain, errorType],
              confidence: 1.0,
              metadata: preventativeRecord,
            },
            'subconscious-matrix',
          );
        })
        .catch(() => {});
    } catch {}

    return preventativeRecord;
  }

  _formulatePreventativeInvariant(domain, errorType, description, context = {}) {
    const descClean = String(description || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (errorType === 'placeholder' || /todo|stub|incomplete/i.test(descClean)) {
      return `Mandatory Completeness Invariant [${domain.toUpperCase()}]: Never emit placeholders, TODO comments, or stubbed bodies. Every implementation must be 100% syntactically valid and fully realized with complete edge-case handling.`;
    }
    if (errorType === 'loop' || /repetition|infinite loop/i.test(descClean)) {
      return `Mandatory Anti-Repetition Reflex [${domain.toUpperCase()}]: Detect lexical redundancy cycles and immediately pivot towards forward-progress dimensional elaboration.`;
    }
    if (errorType === 'system-error' || /system error|unhandled/i.test(descClean)) {
      return `Defensive Boundary Invariant [${domain.toUpperCase()}]: Wrap all I/O and async pipelines in typed try/catch blocks with graceful fallbacks. Never let internal system error signatures leak into output.`;
    }
    if (errorType === 'tool-error' || /tool.*failed/i.test(descClean)) {
      return `Pre-Execution Parameter Invariant [${domain.toUpperCase()}]: Prior to invoking tool '${context.tool || 'system'}', validate argument structure, required fields, and file existence to guarantee 100% tool resolution.`;
    }
    if (errorType === 'user-flagged-error' || context.userCorrection) {
      return `User-Friction Remediation Invariant [${domain.toUpperCase()}]: Corrected behavior required: '${descClean.slice(0, 100)}'. Strictly adhere to user-specified ground truth and reject invalid approximations.`;
    }
    return `Strict Operational Reflex [${domain.toUpperCase()}]: Under no circumstances repeat flaw '${descClean.slice(0, 80)}'. Enforce verified first-principles rigor and comprehensive test coverage.`;
  }

  _inferDomain(mistakeData) {
    const text =
      `${mistakeData.description || ''} ${JSON.stringify(mistakeData.context || {})}`.toLowerCase();
    if (/code|js|py|html|css|function|class|syntax/i.test(text)) return 'coding';
    if (/3d|blender|mesh|render|three/i.test(text)) return '3d';
    if (/network|socket|api|server|system/i.test(text)) return 'systems';
    if (/math|calc|formula/i.test(text)) return 'math';
    return 'general';
  }

  /**
   * Weave latent subconscious intuition into context silently.
   * Organically shapes thought generation without conscious meta-chatter.
   */
  weaveLatentIntuition(userMessage, domain = 'coding') {
    this.stats.totalIntuitionsWoven++;
    const relevant = this.latentHeuristics.filter(
      (h) =>
        h.domain === 'all' ||
        h.domain === domain ||
        (userMessage && userMessage.toLowerCase().includes(h.domain)),
    );
    const selected = (relevant.length > 0 ? relevant : this.latentHeuristics).slice(0, 4);

    if (selected.length === 0 && (!this.mistakeLedger || this.mistakeLedger.length === 0))
      return '';

    // Woven as pure instinct/reflexes (NOT meta-improvement chatter)
    const lines = [
      '### [Subconscious Cognitive Reflexes & Latent Priors]',
      'The following foundational instincts operate at your neural baseline (reason directly through these instincts; do NOT discuss rules or self-improvement):',
    ];

    for (const h of selected) {
      lines.push(`• ${h.heuristic}`);
    }

    // Weave active mistake-learned preventative invariants
    const relevantMistakes = (this.mistakeLedger || [])
      .filter(
        (m) =>
          m.domain === 'all' ||
          m.domain === domain ||
          (userMessage && userMessage.toLowerCase().includes(m.domain)),
      )
      .slice(0, 2);

    for (const m of relevantMistakes) {
      lines.push(`• [Immune Defense Reflex]: ${m.learnedInvariant}`);
    }

    return lines.join('\n');
  }

  /**
   * Run relevant subconscious parts for a query (preserved for backward compatibility)
   */
  async processSubconscious(userMessage, conversationHistory = []) {
    const startTime = Date.now();
    const results = await registry.runRelevant(userMessage, conversationHistory, 4);
    const elapsed = Date.now() - startTime;
    console.log(`[Subconscious] ${results.length} parts responded in ${elapsed}ms`);

    // Store summary in short-term memory
    if (results.length > 0) {
      shortTermMemory.store(
        ['subconscious', 'latest'],
        {
          content: `Subconscious analysis: ${results.map((r) => `${r.part}: ${r.output?.substring(0, 100)}`).join(' | ')}`,
          type: 'analysis',
          tags: ['subconscious', 'part-outputs'],
          metadata: { partsUsed: results.map((r) => r.part), elapsed },
        },
        'subconscious',
      );
    }

    return results;
  }

  /**
   * Instruct subconscious to code a new tool, evolve memory, or repair a capability
   */
  async instructSubconscious(request = {}) {
    return await subconsciousEngine.handleConsciousInstruction(request);
  }

  /**
   * Get the current state of subconscious parts and latent matrix
   */
  getSubconsciousState() {
    return {
      registry: registry.getStatus(),
      latentMatrix: {
        stats: this.stats,
        activeHeuristicsCount: this.latentHeuristics.length,
        recentHeuristics: this.latentHeuristics.slice(0, 5),
      },
      mistakeLearning: {
        totalMistakesLearned: this.stats.totalMistakesLearned || this.mistakeLedger.length,
        recentLearnedMistakes: this.mistakeLedger.slice(0, 5),
      },
      unlockedCustomTools: subconsciousEngine.getUnlockedTools(),
    };
  }

  getState() {
    return this.getSubconsciousState();
  }
}

const subconsciousMatrix = new SubconsciousMatrix();
export const processSubconscious = (userMessage, history) =>
  subconsciousMatrix.processSubconscious(userMessage, history);
export const instructSubconscious = (request) => subconsciousMatrix.instructSubconscious(request);
export const getSubconsciousState = () => subconsciousMatrix.getSubconsciousState();
export default subconsciousMatrix;
