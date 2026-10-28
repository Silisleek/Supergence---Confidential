// SIS 1.0 — Hermes Continuous Learner Engine
// Inspired by Nous Research Hermes Agent (SOUL.md & durable identity accretions)
// Capabilities:
// 1. In-chat / in-task / in-project continuous cognitive learner
// 2. Extracts user preferences, coding habits, architectural taste, and domain focus on every turn
// 3. Durably updates user identity ledger in data/hermes-learning-ledger.json
// 4. Injects accreted learnings into Supergence and agent team system prompts
// 5. Broadcasts real-time cognitive evolution badges to the client UI

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import brain from '../orchestrator/brain.js';
import enterpriseVault from '../security/vault.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const HERMES_STORE_FILE = path.join(DATA_DIR, 'hermes-learning-ledger.json');

export class HermesLearner {
  constructor() {
    this.memoryVersion = 32.0;
    this.synapticUpdates = 0;
    this.learnedFacets = [];
    this.userTraits = {};
    this._ensureStore();
    this._loadLedger();
  }

  _ensureStore() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (!fs.existsSync(HERMES_STORE_FILE)) {
        const initial = {
          memoryVersion: 32.1,
          lastUpdated: new Date().toISOString(),
          synapticUpdates: 18,
          traits: this.userTraits,
          facets: [
            {
              id: 'facet-apple-liquid-glass',
              category: 'UI/UX Design',
              fact: 'User requires authentic Apple Liquid Glass aesthetics everywhere—including large headings, cards, and windows.',
              confidence: 0.99,
              source: 'Explicit user instruction',
              timestamp: new Date().toISOString(),
            },
            {
              id: 'facet-no-cyberpunk',
              category: 'UI/UX Design',
              fact: 'User explicitly discarded the cyberpunk central reactor in favor of a sleek, futuristic optical liquid glass orb.',
              confidence: 0.98,
              source: 'Explicit user instruction',
              timestamp: new Date().toISOString(),
            },
            {
              id: 'facet-agent-specialization',
              category: 'Architecture',
              fact: 'Prefers specialized 24/7 AI agent teammates (Bio-SIS for biology, Nova-Dev for coding, Astra-Canvas for art) rather than a monolithic agent.',
              confidence: 0.97,
              source: 'Explicit user instruction',
              timestamp: new Date().toISOString(),
            },
            {
              id: 'facet-autonomous-execution',
              category: 'Autonomous Execution',
              fact: 'Agents and tools must autonomously resolve problems, synthesize capabilities, and execute solutions directly without waiting for approval or pausing for permission.',
              confidence: 1.0,
              source: 'Explicit user policy',
              timestamp: new Date().toISOString(),
            },
          ],
        };
        fs.writeFileSync(HERMES_STORE_FILE, JSON.stringify(initial, null, 2), 'utf8');
      }
    } catch (e) {
      console.warn('[HermesLearner] Notice creating ledger:', e.message);
    }
  }

  _loadLedger() {
    try {
      if (fs.existsSync(HERMES_STORE_FILE)) {
        const raw = JSON.parse(fs.readFileSync(HERMES_STORE_FILE, 'utf8'));
        this.memoryVersion = raw.memoryVersion || 32.1;
        this.synapticUpdates = raw.synapticUpdates || 0;
        this.userTraits = Object.assign(this.userTraits, raw.traits || {});
        this.learnedFacets = Array.isArray(raw.facets) ? raw.facets : [];
      }
    } catch (e) {
      console.warn('[HermesLearner] Failed to load ledger:', e.message);
    }
  }

  _saveLedger() {
    try {
      const data = {
        memoryVersion: this.memoryVersion,
        lastUpdated: new Date().toISOString(),
        synapticUpdates: this.synapticUpdates,
        traits: this.userTraits,
        facets: this.learnedFacets,
      };
      fs.writeFileSync(HERMES_STORE_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.error('[HermesLearner] Failed to save ledger:', e.message);
    }
  }

  // ─── Continuous Turn Analyzer (Invoked on every message / project build) ───
  learnFromTurn({ role, content, context = {} }) {
    if (!content || typeof content !== 'string') return null;

    const lower = content.toLowerCase();
    const newInsights = [];

    // Analyze specific cues
    if (lower.includes('liquid glass') || lower.includes('apple') || lower.includes('sleek')) {
      newInsights.push({
        category: 'UI/UX Design',
        fact: 'Continuous reinforcement of Apple Liquid Glass translucency and squircle geometry.',
        confidence: 0.99,
      });
    }

    if (
      lower.includes('biology') ||
      lower.includes('dna') ||
      lower.includes('protein') ||
      lower.includes('genom')
    ) {
      newInsights.push({
        category: 'Domain Interest',
        fact: 'Active involvement in biological computation and molecular science.',
        confidence: 0.92,
      });
    }

    if (lower.includes('approve') || lower.includes('approval') || lower.includes('permission')) {
      newInsights.push({
        category: 'Governance',
        fact: 'Affirms explicit human-in-the-loop signoff for runtime modifications.',
        confidence: 0.95,
      });
    }

    if (
      lower.includes('3d') ||
      lower.includes('webgl') ||
      lower.includes('three.js') ||
      lower.includes('shader')
    ) {
      newInsights.push({
        category: 'Visual Graphics',
        fact: 'Strong focus on interactive 3D WebGL scenes and spatial shaders.',
        confidence: 0.94,
      });
    }

    // Add unique insights to facets
    let addedCount = 0;
    for (const insight of newInsights) {
      const exists = this.learnedFacets.some((f) => f.fact === insight.fact);
      if (!exists) {
        const facet = {
          id: 'facet-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 4),
          category: insight.category,
          fact: insight.fact,
          confidence: insight.confidence,
          source: `Turn: "${content.slice(0, 60)}..."`,
          timestamp: new Date().toISOString(),
        };
        this.learnedFacets.push(facet);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      this.synapticUpdates += addedCount;
      this.memoryVersion = parseFloat((this.memoryVersion + 0.1 * addedCount).toFixed(1));
      this._saveLedger();

      // Broadcast Hermes Evolution to client
      brain.broadcast('hermes-learned', {
        memoryVersion: this.memoryVersion,
        newFacetsCount: addedCount,
        recentFacet: this.learnedFacets[this.learnedFacets.length - 1],
        totalFacets: this.learnedFacets.length,
        synapticUpdates: this.synapticUpdates,
      });

      return this.learnedFacets[this.learnedFacets.length - 1];
    }

    return null;
  }

  // ─── Synthesize Prompt Appendix for All Agents ───
  getLearnedContextPrompt() {
    let identityLine = '';
    try {
      const idPath = path.join(DATA_DIR, 'user-identity.json');
      const idData = enterpriseVault.secureReadJson(idPath);
      if (idData) {
        identityLine =
          `Principal User: ${idData.name || 'User'} (${idData.location || 'Local'}, ${idData.timezone || 'IST'})\n` +
          `Primary System: ${idData.system?.os || 'Windows'} | CPU: ${idData.system?.cpuModel || 'Intel'} | Cores: ${idData.system?.cores || 8}\n` +
          `(When asked about the user, invoke the "get_user_profile" tool to inspect full projects, interests, behavior, or milestones)`;
      }
    } catch (_) {}

    return `
[HERMES LIFELONG COGNITIVE MEMORY — ACTIVE LEDGER v${this.memoryVersion}]
${identityLine ? identityLine + '\n' : ''}
Dynamically Learned User Preferences & Behavioral Invariants:
${this.learnedFacets
  .slice(-6)
  .map((f) => `• [${f.category}] ${f.fact} (Confidence: ${(f.confidence * 100).toFixed(0)}%)`)
  .join('\n')}
Adhere strictly to these learned preferences and invariants across every task.
`.trim();
  }

  // ─── Direct Teach Rule (Explicit User Instruction) ───
  teachRule({
    category = 'User Custom Directive',
    fact,
    confidence = 1.0,
    source = 'User Teaching',
  }) {
    if (!fact || typeof fact !== 'string' || !fact.trim()) {
      throw new Error('Fact/Directive text is required');
    }

    const trimmed = fact.trim();
    const existing = this.learnedFacets.find((f) => f.fact.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      existing.confidence = confidence;
      existing.timestamp = new Date().toISOString();
      this._saveLedger();
      return existing;
    }

    const facet = {
      id: 'facet-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 4),
      category: category.trim(),
      fact: trimmed,
      confidence: Math.min(1.0, Math.max(0.1, Number(confidence) || 1.0)),
      source: source || 'Explicit user instruction',
      timestamp: new Date().toISOString(),
    };

    this.learnedFacets.push(facet);
    this.synapticUpdates++;
    this.memoryVersion = parseFloat((this.memoryVersion + 0.1).toFixed(1));
    this._saveLedger();

    brain.broadcast('hermes-learned', {
      memoryVersion: this.memoryVersion,
      newFacetsCount: 1,
      recentFacet: facet,
      totalFacets: this.learnedFacets.length,
      synapticUpdates: this.synapticUpdates,
    });

    return facet;
  }

  addFacet(facetData) {
    return this.teachRule({
      category: facetData.category || 'User Directive',
      fact: facetData.fact,
      confidence: facetData.confidence ?? 1.0,
      source: facetData.source || 'Autonomous Learner',
    });
  }

  searchFacets(query = '') {
    if (!query) return this.learnedFacets;
    const lower = query.toLowerCase();
    return this.learnedFacets.filter(
      (f) => f.fact.toLowerCase().includes(lower) || f.category.toLowerCase().includes(lower),
    );
  }

  getState() {
    return {
      memoryVersion: this.memoryVersion,
      synapticUpdates: this.synapticUpdates,
      traits: this.userTraits,
      facets: this.learnedFacets,
      totalFacets: this.learnedFacets.length,
    };
  }
}

const hermesLearner = new HermesLearner();
export default hermesLearner;
