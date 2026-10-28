// SIS 1.0 — Dynamic Meta-Prompt Compiler
// World-Class RSI Prompt Optimization Engine:
// Continuously evolves, compiles, and optimizes the system prompts of Conscious Streamer,
// Coder, and AI Specialists using:
// 1. Darwinian Evolved Directives (MetaPromptOptimizer)
// 2. STaR Golden Trace Few-Shot Demonstrations (ExemplarBank)
// 3. Autonomously Compiled RSI Skills & Recipes (UserFocusTracker / Voyager)
// 4. User Friction Remediation & Gravitational Biasing
// 5. Semantically Retrieved Autonomous Breakthroughs & Verified Invariants

import hybridSearch from '../memory/hybrid-search.js';
import patternLibrary from './anti-patterns.js';
import autonomousLearner from './autonomous-learner.js';
import metaPromptOptimizer from './meta-prompt-optimizer.js';
import exemplarBank from './exemplar-bank.js';
import userFocusTracker from './user-focus-tracker.js';

export class PromptCompiler {
  constructor() {
    this.fallbackDirectives = {
      coding: [
        'Mandate: Production-grade, zero-stub, fully runnable code with rigorous error handling.',
        'Invariants: Guard all external boundary inputs; ensure zero unhandled rejections or silent failures.',
        'Performance: Prefer zero-allocation loops, spatial locality, and amortized O(1) lookups.',
      ],
      systems: [
        'Mandate: Decoupled component DAGs with explicit linearizable state mutation boundaries.',
        'Resilience: Design for transient partition recovery, circuit-breaker backoffs, and idempotent retry.',
        'Scalability: Eliminate global contention locks; prefer message-passing or atomic CAS epochs.',
      ],
      math: [
        'Mandate: Multi-hop first-principles deductive chains with explicit boundary conditions.',
        'Notation: Strict clean standard LaTeX math ($...$ inline, $$...$$ block).',
        'Grounding: State dimensional analysis and physical interpretations for all symbolic constants.',
      ],
      '3d': [
        'Mandate: Real physical scale, authentic PBR materials, proper lighting normals, and performant render budgets.',
        'Anti-Slop: Distinctive architectural proportions, subtle traditional accents, tangible urban structure.',
        'Performance: InstancedMesh with pooled matrix buffers for dense geometry; 60 FPS requestAnimationFrame loop.',
      ],
      general: [
        'Mandate: Frontier-level depth, razor-sharp technical precision, zero lorem ipsum, zero generic fluff.',
      ],
    };
  }

  /**
   * Detect primary and secondary domain
   */
  detectDomains(text = '') {
    const t = text.toLowerCase();
    const domains = [];
    if (
      /3d|three\.js|threejs|blender|mesh|render|shader|scene|model|texture|pbr|webgl|glb|gltf/i.test(
        t,
      )
    )
      domains.push('3d');
    if (
      /code|function|program|bug|api|build|script|debug|html|css|javascript|typescript|node|python|express|sse/i.test(
        t,
      )
    )
      domains.push('coding');
    if (
      /schrodinger|quantum|equation|math|calc|integral|derivative|algebra|proof|matrix|tensor|physics/i.test(
        t,
      )
    )
      domains.push('math');
    if (
      /architecture|system|distributed|scale|database|microservice|concurrency|cluster|cache|lock-free/i.test(
        t,
      )
    )
      domains.push('systems');
    if (/design|ui|ux|layout|palette|aesthetic|glassmorphism/i.test(t)) domains.push('design');
    if (domains.length === 0) domains.push('general');
    return domains;
  }

  /**
   * Dynamically compile tailored system directives, exemplars, and learned skills for a user query
   * @param {string} userQuery The user request
   * @param {number} maxChars Max length of compiled directives
   * @returns {string} Compiled prompt context
   */
  compileContext(userQuery = '', maxChars = 2800) {
    if (!userQuery) return '';
    const domains = this.detectDomains(userQuery);
    const primaryDomain = domains[0] || 'general';

    const sections = [];

    // 1. Darwinian Evolved Meta-Directives (MIPROv2 / EvoPrompt)
    const evolvedDirectives = metaPromptOptimizer.formatForPrompt(primaryDomain, 750);
    if (evolvedDirectives) {
      sections.push(evolvedDirectives);
    } else {
      const fallbackRules =
        this.fallbackDirectives[primaryDomain] || this.fallbackDirectives.general;
      sections.push(`### [BASE DIRECTIVES // ${primaryDomain.toUpperCase()}]`);
      for (const r of fallbackRules) {
        sections.push(`• ${r}`);
      }
    }

    // 2. Autonomously Compiled RSI Skills & Production Recipes (Voyager / LATM)
    const learnedSkills = userFocusTracker.formatSkillsForPrompt(primaryDomain, userQuery, 750);
    if (learnedSkills) {
      sections.push(learnedSkills);
    }

    // 3. STaR Few-Shot Golden Reasoning Exemplar
    const goldenExemplar = exemplarBank.formatForPrompt(primaryDomain, userQuery, 850);
    if (goldenExemplar) {
      sections.push(goldenExemplar);
    }

    // 4. User Friction Remediation (Direct Invariants Against Past User Errors/Corrections)
    const frictionRemediation = userFocusTracker.getFrictionRemediationContext(primaryDomain, 450);
    if (frictionRemediation) {
      sections.push(frictionRemediation);
    }

    // 5. Semantically Retrieved Autonomous Master Breakthroughs
    const autoBreakthroughs = autonomousLearner.formatForPrompt(userQuery, 600);
    if (autoBreakthroughs) {
      sections.push(autoBreakthroughs);
    }

    // 6. Dynamic Anti-Patterns & Success Patterns
    const patterns = patternLibrary.formatForPrompt(userQuery, 500);
    if (patterns) {
      sections.push(patterns);
    }

    // 7. Learned Domain Strategies
    const strategy = patternLibrary.getStrategy(primaryDomain);
    if (strategy && strategy.approach) {
      sections.push(
        `### [OPTIMAL DOMAIN STRATEGY: ${primaryDomain.toUpperCase()}]\n• Approach: ${strategy.approach}\n• Key Insight: ${strategy.keyInsight || 'Maximize empirical rigor'}`,
      );
    }

    const compiled = sections.join('\n\n');
    return compiled.length > maxChars ? compiled.slice(0, maxChars) + '...' : compiled;
  }
}

const promptCompiler = new PromptCompiler();
export default promptCompiler;
