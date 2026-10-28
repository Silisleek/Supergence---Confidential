// SIS 1.0 — Darwinian Meta-Prompt & Directive Evolution Engine
// Inspired by DSPy / MIPROv2 / EvoPrompt: Treats prompt directives as an evolving genome.
// Mutates, refines, and hardens domain system instructions based on empirical performance,
// user corrections, and autonomous breakthroughs.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { quickAI, DEFAULT_MODEL } from '../api/openrouter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIRECTIVES_FILE = path.join(__dirname, '../../data/improvement/evolved-directives.json');

// Ensure directory exists
if (!fs.existsSync(path.dirname(DIRECTIVES_FILE))) {
  fs.mkdirSync(path.dirname(DIRECTIVES_FILE), { recursive: true });
}

// Initial frontier baselines tailored to SIS's primary domains
const BASELINE_DIRECTIVES = {
  '3d': [
    {
      id: 'dir_3d_pbr_physicality',
      rule: 'Mandate authentic physical scale, PBR materials (roughness/metalness), and proper surface normals. Prohibit flat unlit shaders unless explicitly requested.',
      fitness: 0.96,
      generation: 1,
      source: 'baseline-invariant',
    },
    {
      id: 'dir_3d_anti_ai_slop',
      rule: 'Anti-Slop Directive: Do NOT generate cliché cyberpunk purple/pink neon generic clutter. Produce distinctive architectural proportions, subtle traditional accents, believable signage, and tangible urban structure.',
      fitness: 0.99,
      generation: 1,
      source: 'user-preference-alignment',
    },
    {
      id: 'dir_3d_instanced_performance',
      rule: 'Performance Invariant: For dense geometry (>50 repetitive objects like buildings, windows, trees, vehicles), ALWAYS use THREE.InstancedMesh with pooled matrix buffers to guarantee 60 FPS.',
      fitness: 0.98,
      generation: 1,
      source: 'empirical-optimization',
    },
    {
      id: 'dir_3d_blender_live_integration',
      rule: 'Blender Execution: When creating Blender assets via live MCP, structure operations with bpy.ops context overrides and ensure object origin points, transforms, and materials are cleanly initialized.',
      fitness: 0.97,
      generation: 1,
      source: 'tool-hardening',
    },
  ],
  coding: [
    {
      id: 'dir_code_zero_stub',
      rule: 'Zero-Stub Mandate: Output 100% complete, fully runnable code with rigorous try/catch error handling. Never leave "TODO", "insert logic here", or incomplete stub functions.',
      fitness: 0.98,
      generation: 1,
      source: 'baseline-invariant',
    },
    {
      id: 'dir_code_async_boundary',
      rule: 'Async Boundary Invariant: Guard all external network, filesystem, and database promises with timeouts and explicit error fallbacks. Never allow unhandled promise rejections.',
      fitness: 0.97,
      generation: 1,
      source: 'empirical-optimization',
    },
    {
      id: 'dir_code_spatial_efficiency',
      rule: 'Performance: Prefer zero-allocation loops, spatial array locality, and amortized O(1) lookups using Map/Set over deep nested object walks.',
      fitness: 0.95,
      generation: 1,
      source: 'baseline-invariant',
    },
  ],
  systems: [
    {
      id: 'dir_sys_linearizable_mutations',
      rule: 'Architecture Mandate: Decoupled component DAGs with explicit linearizable state mutation boundaries. Prohibit global mutable singleton side-effects without synchronization.',
      fitness: 0.96,
      generation: 1,
      source: 'baseline-invariant',
    },
    {
      id: 'dir_sys_circuit_breaker',
      rule: 'Resilience Invariant: Design for transient partition recovery with exponential backoff and circuit-breaker trip thresholds for all upstream connections.',
      fitness: 0.97,
      generation: 1,
      source: 'empirical-optimization',
    },
  ],
  math: [
    {
      id: 'dir_math_formal_rigor',
      rule: 'Formal Rigor: Provide complete first-principles derivations with unequivocal boundary conditions. Format equations in clean standard LaTeX ($...$ inline, $$...$$ block).',
      fitness: 0.98,
      generation: 1,
      source: 'baseline-invariant',
    },
    {
      id: 'dir_math_physical_grounding',
      rule: 'Physical Grounding: Every symbolic term must carry physical interpretation, standard SI units, and dimensional sanity verification.',
      fitness: 0.96,
      generation: 1,
      source: 'baseline-invariant',
    },
  ],
  design: [
    {
      id: 'dir_design_tactical_clarity',
      rule: 'Tactical Aesthetic: Apply high-contrast functional aesthetics (solid surfaces, tactical accents, clean 1px borders, smooth motion). Avoid muddy gradients and visual noise.',
      fitness: 0.95,
      generation: 1,
      source: 'baseline-invariant',
    },
  ],
  general: [
    {
      id: 'dir_gen_depth_over_fluff',
      rule: 'Depth Mandate: Deliver frontier-level depth, razor-sharp technical precision, zero lorem ipsum, and zero generic conversational filler.',
      fitness: 0.98,
      generation: 1,
      source: 'baseline-invariant',
    },
  ],
};

export class MetaPromptOptimizer {
  constructor(options = {}) {
    this.filePath = options.filePath || DIRECTIVES_FILE;
    this.generation = 1;
    this.lastEvolvedAt = null;
    this.totalMutations = 0;
    this.directives = JSON.parse(JSON.stringify(BASELINE_DIRECTIVES));
    this.evolutionLog = [];
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const data = JSON.parse(raw);
        if (data && data.directives) {
          this.directives = {
            ...this.directives,
            ...data.directives,
          };
          this.generation = data.generation || 1;
          this.lastEvolvedAt = data.lastEvolvedAt || null;
          this.totalMutations = data.totalMutations || 0;
          this.evolutionLog = data.evolutionLog || [];
        }
      }
    } catch (err) {
      console.warn(
        '[MetaPromptOptimizer] Error loading directives, keeping baseline:',
        err.message,
      );
    }
  }

  _save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const payload = {
        version: '1.0.0',
        generation: this.generation,
        lastEvolvedAt: this.lastEvolvedAt,
        totalMutations: this.totalMutations,
        directives: this.directives,
        evolutionLog: this.evolutionLog.slice(-50),
      };

      const tempPath = `${this.filePath}.tmp_${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2), 'utf8');
      fs.renameSync(tempPath, this.filePath);
    } catch (err) {
      console.error('[MetaPromptOptimizer] Save error:', err.message);
    }
  }

  getEvolvedDirectives(domain = 'general', maxCount = 5) {
    const list = this.directives[domain] || this.directives.general || [];
    return (
      list
        .slice()
        // Sort key only — `fitness: null` means "never measured", ranked at the
        // neutral 0.9 so an unmeasured rule neither outranks nor is hidden by
        // measured ones. Nothing renders this number as a score.
        .sort((a, b) => (b.fitness ?? 0.9) - (a.fitness ?? 0.9))
        .slice(0, maxCount)
        .map((d) => d.rule)
    );
  }

  formatForPrompt(domain = 'general', maxChars = 1000) {
    const rules = this.getEvolvedDirectives(domain, 5);
    if (!rules || rules.length === 0) return '';

    const lines = [
      `### [EVOLVED META-DIRECTIVES // GEN ${this.generation} // ${domain.toUpperCase()}]`,
    ];
    for (const r of rules) {
      lines.push(`• ${r}`);
    }

    const out = lines.join('\n');
    return out.length > maxChars ? out.slice(0, maxChars) + '...' : out;
  }

  async evolveFromCycle(cycleRecord) {
    if (!cycleRecord || !cycleRecord.domain) return;
    const domain = cycleRecord.domain;
    const rules = cycleRecord.simulation?.rulesLearned || [];
    if (rules.length === 0) return;

    this.generation++;
    this.totalMutations++;
    this.lastEvolvedAt = Date.now();

    if (!this.directives[domain]) {
      this.directives[domain] = [];
    }

    const newRuleText = rules[0].trim();
    if (newRuleText.length < 15) return;

    const isDup = this.directives[domain].some((d) =>
      d.rule.toLowerCase().includes(newRuleText.toLowerCase().slice(0, 30)),
    );
    if (isDup) return;

    const newDirective = {
      id: `dir_${domain}_gen${this.generation}_${Date.now()}`,
      rule: newRuleText,
      // A directive distilled from a cycle that measured nothing has no
      // fitness. The old `|| 0.95` gave every unmeasured rule a top-tier score
      // and let it displace measured ones (ledger E-05).
      fitness: Number.isFinite(cycleRecord.finalScore)
        ? Number(cycleRecord.finalScore.toFixed(3))
        : null,
      generation: this.generation,
      source: `autonomous-cycle-#${cycleRecord.cycleNumber}`,
      questionRef: (cycleRecord.question || '').slice(0, 80),
    };

    this.directives[domain].push(newDirective);

    if (this.directives[domain].length > 12) {
      this.directives[domain].sort((a, b) => b.fitness - a.fitness);
      this.directives[domain] = this.directives[domain].slice(0, 12);
    }

    this.evolutionLog.unshift({
      timestamp: Date.now(),
      domain,
      type: 'autonomous-cycle-evolution',
      generation: this.generation,
      rule: newRuleText,
    });

    this._save();
    console.log(
      `[MetaPromptOptimizer] ✓ Evolved Gen ${this.generation} directive for [${domain}]: "${newRuleText.slice(0, 60)}..."`,
    );
  }

  async evolveFromCorrection(userCorrection, prevAssistantMsg = '', domain = 'general') {
    if (!userCorrection || userCorrection.length < 5) return;

    try {
      const prompt = `You are the Meta-Prompt Genome Compiler for SIS.
The user corrected the AI with the following negative feedback or correction:
"${userCorrection}"

Previous Assistant Output snippet:
"${prevAssistantMsg.slice(0, 500)}"

Task: Formulate a single, concise, imperative operational directive (max 25 words) that instructs the AI system NEVER to repeat this mistake, stating what to avoid and what positive pattern to follow instead.

Output strict JSON only:
{
  "rule": "Exact concise imperative directive",
  "rationale": "Why this rule prevents the error"
}`;

      const res = await quickAI(prompt, 'Formulate imperative directive now', DEFAULT_MODEL, 300);
      let parsed = null;
      try {
        const match = res.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
      } catch {}

      if (parsed && parsed.rule) {
        this.generation++;
        this.totalMutations++;
        this.lastEvolvedAt = Date.now();

        if (!this.directives[domain]) this.directives[domain] = [];

        const newDirective = {
          id: `dir_${domain}_correction_${Date.now()}`,
          rule: parsed.rule.trim(),
          fitness: 0.99,
          generation: this.generation,
          source: 'user-correction-hardening',
          rationale: parsed.rationale || '',
        };

        this.directives[domain].unshift(newDirective);
        if (this.directives[domain].length > 12) {
          this.directives[domain].pop();
        }

        this.evolutionLog.unshift({
          timestamp: Date.now(),
          domain,
          type: 'user-correction-hardening',
          generation: this.generation,
          rule: parsed.rule,
        });

        this._save();
        console.log(
          `[MetaPromptOptimizer] ⚡ Hardened Gen ${this.generation} directive from user correction [${domain}]: "${parsed.rule}"`,
        );
        return newDirective;
      }
    } catch (err) {
      console.warn('[MetaPromptOptimizer] Correction directive synthesis notice:', err.message);
    }
    return null;
  }

  getStats() {
    let totalDirectives = 0;
    const domainCounts = {};
    for (const [dom, list] of Object.entries(this.directives)) {
      domainCounts[dom] = list.length;
      totalDirectives += list.length;
    }

    return {
      generation: this.generation,
      totalDirectives,
      totalMutations: this.totalMutations,
      lastEvolvedAt: this.lastEvolvedAt,
      domainCounts,
      recentEvolutions: this.evolutionLog.slice(0, 10),
    };
  }
}

const metaPromptOptimizer = new MetaPromptOptimizer();
export default metaPromptOptimizer;
