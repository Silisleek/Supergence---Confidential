// SIS 1.0 — Recursive Bootstrapping Engine
// Powers autonomous self-bootstrapping across the cognitive architecture:
// 1. Counterfactual-to-Synthetic Bootstrapping: Transforms mined mistakes & counterfactual blueprints
//    into self-generated bootstrapped challenge-solution pairs.
// 2. Invariant Compound Compression: Clusters domain-specific heuristics and compounds them
//    into higher-order universal cognitive axioms baked into the subconscious matrix.
// 3. Domain Cold-Start Bootstrapping: Autonomously synthesizes latent intuition vectors for
//    sparse or emerging domains without human assistance.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { quickAI, DEFAULT_MODEL, PREMIUM_MODEL } from '../api/openrouter.js';
import subconscious from '../orchestrator/subconscious.js';
import patternLibrary from './anti-patterns.js';
import exemplarBank from './exemplar-bank.js';
import longTermMemory from '../memory/long-term.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOOTSTRAP_FILE = process.env.SIS_DATA_DIR
  ? path.join(path.resolve(process.env.SIS_DATA_DIR), 'improvement/bootstrapper-state.json')
  : path.join(__dirname, '../../data/improvement/bootstrapper-state.json');

if (!fs.existsSync(path.dirname(BOOTSTRAP_FILE))) {
  fs.mkdirSync(path.dirname(BOOTSTRAP_FILE), { recursive: true });
}

export class Bootstrapper {
  constructor(options = {}) {
    this.filePath = options.filePath || BOOTSTRAP_FILE;
    this.timer = null;
    this.isBootstrapping = false;

    this.state = {
      totalBootstrappingCycles: 0,
      bootstrappedAxiomsCount: 0,
      syntheticChallengesBootstrapped: 0,
      domainPriorsBootstrapped: 0,
      compoundAxioms: [],
      recentCycles: [],
      lastCycleAt: null,
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
      console.warn('[Bootstrapper] Load warning:', err.message);
    }
  }

  _save() {
    try {
      if (!fs.existsSync(path.dirname(this.filePath))) {
        fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (err) {
      console.error('[Bootstrapper] Save error:', err.message);
    }
  }

  setBrain(brain) {
    this.brainRef = brain;
  }

  /**
   * Start 24/7 continuous recursive bootstrapping loop
   */
  start(intervalMs = 5 * 60 * 1000) {
    if (this.timer) return;
    console.log('[Bootstrapper] Starting 24/7 recursive bootstrapping loop (every 5m)...');
    setTimeout(() => this.runBootstrapCycle(), 45000);
    this.timer = setInterval(() => this.runBootstrapCycle(), intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Execute a full recursive bootstrapping cycle:
   * 1. Compound Compression of Subconscious Invariants
   * 2. Bootstrapping Synthetic Challenges from Counterfactuals
   * 3. Cold-Start Domain Prior Generation
   */
  async runBootstrapCycle() {
    if (this.isBootstrapping) return;
    const isChatActive =
      this.brainRef &&
      (typeof this.brainRef.hasActiveChat === 'function'
        ? this.brainRef.hasActiveChat()
        : this.brainRef.isProcessing);
    if (isChatActive) {
      console.log(
        '[Bootstrapper] User actively working in chat, skipping bootstrap cycle until idle...',
      );
      return null;
    }
    this.isBootstrapping = true;
    const cycleStartTime = Date.now();
    console.log('[Bootstrapper] 🌀 Executing recursive bootstrapping cycle...');

    try {
      // Step 1: Invariant Compound Compression
      const compressedAxiom = await this.compoundInvariants();

      // Step 2: Bootstrap Synthetic Challenges from recent mined counterfactuals
      const syntheticChallenge = await this.bootstrapSyntheticChallenge();

      // Step 3: Bootstrap sparse domain priors
      const domainBootstrapped = await this.bootstrapSparseDomains();

      this.state.totalBootstrappingCycles++;
      this.state.lastCycleAt = Date.now();

      const cycleSummary = {
        cycle: this.state.totalBootstrappingCycles,
        axiomSynthesized: Boolean(compressedAxiom),
        axiom: compressedAxiom?.heuristic || null,
        syntheticChallengeCreated: Boolean(syntheticChallenge),
        domainBootstrapped: domainBootstrapped?.domain || null,
        durationMs: Date.now() - cycleStartTime,
        timestamp: Date.now(),
      };

      this.state.recentCycles.unshift(cycleSummary);
      if (this.state.recentCycles.length > 30) {
        this.state.recentCycles = this.state.recentCycles.slice(0, 30);
      }

      this._save();
      console.log(
        `[Bootstrapper] ✓ Completed recursive bootstrap cycle #${this.state.totalBootstrappingCycles} in ${Date.now() - cycleStartTime}ms`,
      );
      return cycleSummary;
    } catch (err) {
      console.error('[Bootstrapper] Bootstrap cycle caught error:', err.message);
      return null;
    } finally {
      this.isBootstrapping = false;
    }
  }

  /**
   * Compound Compression: Clusters domain invariants and distills higher-order meta-axioms
   */
  async compoundInvariants() {
    const heuristics = subconscious.latentHeuristics || [];
    if (heuristics.length < 3) return null;

    // Pick top 4 recent or random heuristics to compound
    const candidates = heuristics.slice(0, 6);
    const heuristicsText = candidates
      .map((h, i) => `${i + 1}. [${h.domain || 'general'}/${h.category || 'core'}]: ${h.heuristic}`)
      .join('\n');

    const prompt = `You are the SIS Cognitive Bootstrapper.
Analyze these specific operational heuristics and recursively compound them into a single HIGHER-ORDER UNIVERSAL COGNITIVE AXIOM.
The synthesized axiom must be a powerful first-principles meta-rule that universally elevates reasoning across all domains.

Source Heuristics:
${heuristicsText}

Respond with valid JSON ONLY:
{
  "axiom": "The distilled higher-order meta-axiom starting with 'Universal Axiom:'",
  "domain": "all",
  "category": "compound-axiom",
  "rationale": "Brief explanation of how this compounds lower-level invariants into an elevated cognitive reflex"
}`;

    let result = null;
    try {
      const resp = await quickAI(
        'You are the SIS Cognitive Bootstrapper. Output valid JSON only.',
        prompt,
        DEFAULT_MODEL,
        800,
      );
      const clean = (resp || '').replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) result = JSON.parse(match[0]);
    } catch (e) {
      console.warn('[Bootstrapper] AI compounding fallback:', e.message);
    }

    if (!result || !result.axiom) {
      // Deterministic compounding fallback
      result = {
        axiom: `Universal Axiom [SYSTEMIC COHESION]: Unify first-principles deconstruction, zero-stub completeness, and defensive boundary guarantees into every synthetic output.`,
        domain: 'all',
        category: 'compound-axiom',
        rationale: 'Deterministic baseline compound compression',
      };
    }

    // Check if this axiom is already present
    const existing = this.state.compoundAxioms.find((a) => a.axiom === result.axiom);
    if (existing) {
      return existing;
    }

    const axiomRecord = {
      id: `axiom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      axiom: result.axiom,
      domain: result.domain || 'all',
      category: 'compound-axiom',
      rationale: result.rationale,
      strength: 0.99,
      createdAt: Date.now(),
    };

    this.state.compoundAxioms.unshift(axiomRecord);
    if (this.state.compoundAxioms.length > 30) {
      this.state.compoundAxioms = this.state.compoundAxioms.slice(0, 30);
    }
    this.state.bootstrappedAxiomsCount++;

    // Silently bake the compound axiom directly into the subconscious matrix
    subconscious.recordSubconsciousEvolution({
      source: 'recursive-bootstrapper-compounding',
      domain: axiomRecord.domain,
      heuristic: axiomRecord.axiom,
      category: 'compound-axiom',
      strength: 0.99,
    });

    // Also record in long term memory
    longTermMemory.store(
      ['bootstrapped-axioms', axiomRecord.domain],
      {
        content: `Bootstrapped Universal Axiom: ${axiomRecord.axiom}\nRationale: ${axiomRecord.rationale}`,
        type: 'axiom',
        tags: ['bootstrapping', 'universal-axiom', 'subconscious'],
        confidence: 0.99,
      },
      'bootstrapper',
    );

    console.log(
      `[Bootstrapper] 🧬 Bootstrapped and baked new Compound Axiom: "${axiomRecord.axiom.slice(0, 70)}..."`,
    );
    return axiomRecord;
  }

  /**
   * Synthesize a self-play challenge from mined counterfactuals to test cognitive reflexes
   */
  async bootstrapSyntheticChallenge() {
    const heuristics = subconscious.latentHeuristics || [];
    if (heuristics.length === 0) return null;

    const targetHeuristic = heuristics[Math.floor(Math.random() * heuristics.length)];

    const prompt = `Generate a realistic, complex technical user query and its optimal solution blueprint that rigorously stress-tests this cognitive invariant:
Invariant: "${targetHeuristic.heuristic}"
Domain: "${targetHeuristic.domain || 'general'}"

Output valid JSON ONLY:
{
  "syntheticQuery": "Complex realistic prompt that tempts mistakes",
  "keyInvariantCheck": "What this prompt tests",
  "masterBlueprint": "Concise outline of flawless execution demonstrating the invariant"
}`;

    let res = null;
    try {
      const resp = await quickAI(
        'You are the SIS Synthetic Dataset Bootstrapper. Output valid JSON only.',
        prompt,
        DEFAULT_MODEL,
        700,
      );
      const clean = (resp || '').replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) res = JSON.parse(match[0]);
    } catch {}

    if (res && res.syntheticQuery) {
      this.state.syntheticChallengesBootstrapped++;

      // Harvest as bootstrapped exemplar in ExemplarBank
      exemplarBank.recordExemplar({
        domain: targetHeuristic.domain || 'general',
        query: res.syntheticQuery,
        rationale: `Bootstrapped invariant test: ${res.keyInvariantCheck}`,
        solutionBlueprint: res.masterBlueprint,
        qualityScore: 0.96,
        source: 'recursive-bootstrapper',
      });

      console.log(
        `[Bootstrapper] 🧪 Bootstrapped synthetic challenge for [${targetHeuristic.domain}]: "${res.syntheticQuery.slice(0, 50)}..."`,
      );
      return res;
    }

    return null;
  }

  /**
   * Cold-Start Domain Prior Generation: If any core domain lacks heuristics, bootstrap it
   */
  async bootstrapSparseDomains() {
    const coreDomains = ['coding', 'systems', '3d', 'research', 'design', 'math', 'reasoning'];
    const heuristics = subconscious.latentHeuristics || [];

    const sparseDomain = coreDomains.find(
      (d) => heuristics.filter((h) => h.domain === d).length === 0,
    );
    if (!sparseDomain) return null;

    const prompt = `Distill 1 foundational, unbreakable cognitive reflex invariant for the domain "${sparseDomain}".
The invariant should instruct the neural baseline to avoid common pitfalls and exhibit master-level rigor.

Output valid JSON ONLY:
{
  "heuristic": "Mandate [${sparseDomain.toUpperCase()}]: ...",
  "category": "core-prior",
  "rationale": "Why this prior is essential for ${sparseDomain}"
}`;

    let parsed = null;
    try {
      const resp = await quickAI(
        'You are the SIS Cognitive Prior Bootstrapper. Output valid JSON only.',
        prompt,
        DEFAULT_MODEL,
        600,
      );
      const clean = (resp || '').replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch {}

    if (!parsed || !parsed.heuristic) {
      parsed = {
        heuristic: `Mandate [${sparseDomain.toUpperCase()}]: Enforce rigorous domain-specific constraints, full edge-case coverage, and clear structural separation.`,
        category: 'core-prior',
      };
    }

    const record = subconscious.recordSubconsciousEvolution({
      source: 'domain-coldstart-bootstrapper',
      domain: sparseDomain,
      heuristic: parsed.heuristic,
      category: parsed.category || 'core-prior',
      strength: 0.96,
    });

    this.state.domainPriorsBootstrapped++;
    this._save();
    console.log(
      `[Bootstrapper] 🌱 Bootstrapped sparse domain prior for [${sparseDomain}]: "${parsed.heuristic}"`,
    );
    return { domain: sparseDomain, record };
  }

  getState() {
    return {
      ...this.state,
      isBootstrapping: this.isBootstrapping,
      compoundAxiomsCount: this.state.compoundAxioms.length,
    };
  }
}

const bootstrapper = new Bootstrapper();
export default bootstrapper;
