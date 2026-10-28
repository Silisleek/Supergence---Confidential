// SIS 1.0 — AI Parts Registry
// Manages all 25+ AI parts, dynamic creation, and routing

import { BasePart } from './base-part.js';
import { CoderPart } from '../coder/coder-part.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { quickAI } from '../api/openrouter.js';
import shortTermMemory from '../memory/short-term.js';
import hybridSearch from '../memory/hybrid-search.js';
import optimizer from '../improvement/optimizer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Part configurations for all 25 built-in parts
const PART_CONFIGS = [
  {
    name: 'mathematician',
    promptFile: 'mathematician.md',
    capabilities: ['math', 'calculations', 'proofs', 'algebra', 'calculus', 'statistics'],
    tags: ['math', 'calculate', 'equation', 'formula', 'number'],
    priority: 3,
  },
  {
    name: 'physicist',
    promptFile: 'physicist.md',
    capabilities: ['physics', 'mechanics', 'quantum', 'relativity', 'thermodynamics'],
    tags: ['physics', 'force', 'energy', 'motion', 'wave'],
    priority: 4,
  },
  {
    name: 'coder',
    promptFile: 'coder.md',
    capabilities: ['coding', 'programming', 'debugging', 'algorithms', 'software'],
    tags: [
      'code',
      'program',
      'function',
      'bug',
      'software',
      'app',
      'website',
      'api',
      'build',
      'create',
      'make',
      'develop',
    ],
    priority: 1,
  },
  {
    name: 'architect',
    promptFile: 'architect.md',
    capabilities: ['system design', 'architecture', 'scalability', 'patterns'],
    tags: ['design', 'system', 'architecture', 'scale', 'structure'],
    priority: 2,
  },
  {
    name: 'researcher',
    promptFile: 'researcher.md',
    capabilities: ['research', 'analysis', 'citations', 'literature review'],
    tags: ['research', 'study', 'paper', 'evidence', 'find', 'search', 'investigate'],
    priority: 2,
  },
  {
    name: 'writer',
    promptFile: 'writer.md',
    capabilities: ['writing', 'documentation', 'creative writing', 'editing'],
    tags: ['write', 'essay', 'article', 'story', 'document', 'blog', 'content'],
    priority: 3,
  },
  {
    name: 'analyst',
    promptFile: 'analyst.md',
    capabilities: ['data analysis', 'pattern recognition', 'visualization', 'insights'],
    tags: ['analyze', 'data', 'pattern', 'trend', 'insight', 'chart'],
    priority: 3,
  },
  {
    name: 'debugger',
    promptFile: 'debugger.md',
    capabilities: ['debugging', 'error detection', 'root cause analysis', 'fixing'],
    tags: ['bug', 'error', 'fix', 'crash', 'issue', 'debug', 'problem'],
    priority: 1,
  },
  {
    name: 'security',
    promptFile: 'security.md',
    capabilities: ['security audit', 'vulnerability', 'encryption', 'authentication'],
    tags: ['security', 'vulnerability', 'hack', 'encrypt', 'auth', 'safe'],
    priority: 4,
  },
  {
    name: 'optimizer',
    promptFile: 'optimizer.md',
    capabilities: ['performance', 'optimization', 'speed', 'efficiency'],
    tags: ['optimize', 'performance', 'speed', 'slow', 'efficient', 'fast'],
    priority: 4,
  },
  {
    name: 'designer',
    promptFile: 'designer.md',
    capabilities: ['UI design', 'UX design', 'visual design', 'layout'],
    tags: ['design', 'ui', 'ux', 'layout', 'color', 'style', 'beautiful', 'visual'],
    priority: 3,
  },
  {
    name: 'chemist',
    promptFile: 'chemist.md',
    capabilities: [
      'chemistry',
      'molecules',
      'chemical reactions',
      'compounds',
      'chemistor',
      'pubchem',
      'stoichiometry',
      'thermodynamics',
      'vsepr',
      'molecular modeling',
      'chemical prediction',
    ],
    tags: [
      'chemistry',
      'chemical',
      'molecule',
      'reaction',
      'element',
      'compound',
      'chemistor',
      'pubchem',
      'stoichiometry',
      'enthalpy',
      'entropy',
      'gibbs',
      'vsepr',
      'acid',
      'base',
      'synthesis',
      'atom',
      'periodic table',
    ],
    priority: 2,
  },
  {
    name: 'biologist',
    promptFile: 'biologist.md',
    capabilities: ['biology', 'genetics', 'ecology', 'medicine'],
    tags: ['biology', 'gene', 'cell', 'organism', 'health', 'medical', 'disease'],
    priority: 5,
  },
  {
    name: 'economist',
    promptFile: 'economist.md',
    capabilities: ['economics', 'finance', 'markets', 'modeling'],
    tags: ['economy', 'finance', 'market', 'money', 'price', 'trade', 'business'],
    priority: 5,
  },
  {
    name: 'philosopher',
    promptFile: 'philosopher.md',
    capabilities: ['ethics', 'logic', 'reasoning', 'philosophy'],
    tags: ['philosophy', 'ethics', 'moral', 'logic', 'meaning', 'why', 'think'],
    priority: 6,
  },
  {
    name: 'linguist',
    promptFile: 'linguist.md',
    capabilities: ['language', 'translation', 'grammar', 'semantics'],
    tags: ['language', 'translate', 'grammar', 'word', 'sentence', 'meaning'],
    priority: 5,
  },
  {
    name: 'strategist',
    promptFile: 'strategist.md',
    capabilities: ['strategy', 'planning', 'game theory', 'decision making'],
    tags: ['strategy', 'plan', 'decide', 'option', 'risk', 'goal'],
    priority: 3,
  },
  {
    name: 'observer',
    promptFile: 'observer.md',
    capabilities: ['observation', 'pattern detection', 'anomaly detection', 'monitoring'],
    tags: ['observe', 'watch', 'notice', 'detect', 'unusual', 'pattern'],
    priority: 2,
  },
  {
    name: 'connector',
    promptFile: 'connector.md',
    capabilities: ['cross-domain thinking', 'analogies', 'synthesis', 'novel insights'],
    tags: ['connect', 'relate', 'similar', 'analogy', 'combine', 'bridge'],
    priority: 3,
  },
  {
    name: 'inventor',
    promptFile: 'inventor.md',
    capabilities: ['invention', 'innovation', 'creative solutions', 'novel ideas'],
    tags: ['invent', 'new', 'idea', 'create', 'novel', 'innovative', 'solution'],
    priority: 4,
  },
  {
    name: 'critic',
    promptFile: 'critic.md',
    capabilities: ['criticism', 'quality assessment', 'review', 'feedback'],
    tags: ['review', 'quality', 'improve', 'better', 'feedback', 'assess'],
    priority: 4,
  },
  {
    name: 'historian',
    promptFile: 'historian.md',
    capabilities: ['history', 'context', 'precedent', 'timeline'],
    tags: ['history', 'past', 'era', 'when', 'origin', 'tradition'],
    priority: 6,
  },
  {
    name: 'futurist',
    promptFile: 'futurist.md',
    capabilities: ['prediction', 'trends', 'future modeling', 'forecasting'],
    tags: ['future', 'predict', 'trend', 'next', 'upcoming', 'forecast'],
    priority: 5,
  },
  {
    name: 'game-designer',
    promptFile: 'game-designer.md',
    capabilities: ['game design', 'mechanics', 'level design', 'gameplay'],
    tags: ['game', 'play', 'level', 'mechanic', 'gameplay', 'interactive', '3d game'],
    priority: 2,
  },
  {
    name: '3d-modeler',
    promptFile: '3d-modeler.md',
    capabilities: [
      '3d modeling',
      'blender',
      'bpy',
      'textures',
      'scenes',
      'rendering',
      'pbr materials',
    ],
    tags: [
      '3d',
      'model',
      'render',
      'texture',
      'scene',
      'mesh',
      'object',
      'blender',
      'bpy',
      'blend',
    ],
    priority: 2,
  },
  {
    name: 'pattern_recognizer',
    promptFile: 'pattern-recognizer.md',
    capabilities: [
      'pattern recognition',
      'motifs',
      'invariants',
      'symmetries',
      'anomalies',
      'inductive rules',
    ],
    tags: ['pattern', 'motif', 'invariant', 'symmetry', 'anomaly', 'sequence', 'structure'],
    priority: 2,
  },
  {
    name: 'refiner',
    promptFile: 'refiner.md',
    capabilities: [
      'refinement',
      'polishing',
      'precision',
      'logic',
      'formatting',
      'output elevation',
    ],
    tags: ['refine', 'polish', 'perfect', 'elevate', 'improve', 'format'],
    priority: 1,
  },
  {
    name: 'interpreter_refiner',
    promptFile: 'interpreter-refiner.md',
    capabilities: [
      'interpreter refinement',
      'data schemas',
      'schema validation',
      'data enrichment',
      'format polish',
    ],
    tags: ['interpreter', 'transmute', 'schema', 'convert', 'enrich', 'data transform'],
    priority: 2,
  },
];

class PartsRegistry {
  constructor() {
    this.parts = new Map();
    this.dynamicParts = new Map();
  }

  /**
   * Initialize all built-in parts
   */
  initialize() {
    for (const config of PART_CONFIGS) {
      const part = config.name === 'coder' ? new CoderPart(config) : new BasePart(config);
      this.parts.set(part.name, part);
    }
    console.log(
      `[Registry] Initialized ${this.parts.size} AI parts (Coder: 4-Step Self-Correcting Execution Loop enabled)`,
    );
  }

  /**
   * Get a specific part
   */
  get(name) {
    if (this.parts.size === 0) this.initialize();
    return this.parts.get(name) || this.dynamicParts.get(name);
  }

  /**
   * Get all parts
   */
  getAll() {
    if (this.parts.size === 0) this.initialize();
    return [...this.parts.values(), ...this.dynamicParts.values()];
  }

  /**
   * Dynamic Sparse Mixture-of-Specialists (MoS) Gating Router
   * Combines semantic vector similarity, capability matching, and learned optimizer weights.
   */
  findRelevant(userMessage, maxParts = 5, conversationHistory = []) {
    let effectiveQuery = userMessage;
    const isContinuation = /^(continue|go on|keep going|proceed|finish|do it|implement it)/i.test(
      userMessage.trim(),
    );
    if (isContinuation && conversationHistory.length > 0) {
      for (let i = conversationHistory.length - 1; i >= 0; i--) {
        const item = conversationHistory[i];
        if (
          item.role === 'user' &&
          !/^(continue|go on|keep going|proceed|finish)/i.test(item.content.trim())
        ) {
          effectiveQuery = `${item.content} ${userMessage}`;
          break;
        }
      }
    }

    const all = this.getAll();
    const scored = all.map((part) => {
      let score = 0;
      const msg = effectiveQuery.toLowerCase();

      // 1. Semantic Vector Cosine Similarity
      const partProfile = `${part.name} ${part.capabilities.join(' ')} ${part.tags.join(' ')}`;
      const semanticSim = hybridSearch.semanticSimilarity(effectiveQuery, partProfile);
      score += semanticSim * 35; // 0 to 35 points from dense semantic similarity

      // 2. Exact keyword / tag match
      for (const tag of part.tags) {
        if (msg.includes(tag)) score += 10;
      }

      // 3. Capability matching
      for (const cap of part.capabilities) {
        if (msg.includes(cap.toLowerCase())) score += 8;
      }

      // 4. Learned Performance Optimization Weight
      const partMetrics = optimizer.partMetrics?.[part.name];
      if (partMetrics && partMetrics.avgScore) {
        score += (partMetrics.avgScore - 0.7) * 15; // Reward high-performing parts
      }

      // 5. Gentle priority tie-breaker (0 to 2.7 points), so semantic vectors and capability tags drive routing
      score += (10 - part.priority) * 0.3;

      return { part, score: Number(score.toFixed(2)), semanticSim };
    });

    return scored
      .filter((s) => s.score >= 10 || s.semanticSim >= 0.15)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxParts)
      .map((s) => s.part);
  }

  /**
   * Get always-on parts (observer, connector)
   */
  getAlwaysOn() {
    return ['observer', 'connector'].map((name) => this.parts.get(name)).filter(Boolean);
  }

  /**
   * Dynamically create a new AI part at runtime
   */
  async createPart(config) {
    const { name, description, capabilities, tags, priority } = config;

    // Generate a system prompt for the new part
    const prompt = await quickAI(
      'You are a prompt engineer. Generate a detailed system prompt for an AI specialist.',
      `Create a system prompt for an AI part named "${name}" with these capabilities: ${capabilities.join(', ')}. Description: ${description}. The prompt should define the part's role, expertise, how it thinks, and how it outputs results. Format as markdown.`,
    );

    // Save the generated prompt
    const promptFile = `dynamic-${name}.md`;
    const promptPath = path.join(__dirname, '../prompts', promptFile);
    fs.writeFileSync(promptPath, prompt);

    const part = new BasePart({
      name,
      promptFile,
      capabilities: capabilities || [],
      tags: tags || [],
      priority: priority || 5,
    });

    this.dynamicParts.set(name, part);

    // Log to memory
    shortTermMemory.store(
      ['parts', 'dynamic'],
      {
        content: `New AI part created: ${name} — ${description}`,
        type: 'system-event',
        tags: ['dynamic-part', name],
      },
      'registry',
    );

    console.log(`[Registry] Created dynamic part: ${name}`);
    return part;
  }

  /**
   * Run relevant parts in parallel for a query
   */
  async runRelevant(userMessage, conversationHistory = [], maxParts = 4) {
    const relevant = this.findRelevant(userMessage, maxParts, conversationHistory);

    if (relevant.length === 0) {
      // Fallback to always-on parts
      relevant.push(...this.getAlwaysOn().slice(0, 2));
    }

    console.log(`[Registry] Running parts: ${relevant.map((p) => p.name).join(', ')}`);

    const results = await Promise.allSettled(
      relevant.map((part) => {
        const timeoutMs = part.name === 'coder' ? 55000 : 25000;
        return Promise.race([
          part.process(userMessage, conversationHistory),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`${part.name} timeout`)), timeoutMs),
          ),
        ]);
      }),
    );

    return results
      .filter((r) => r.status === 'fulfilled' && r.value && r.value.output)
      .map((r) => r.value);
  }

  /**
   * Run decomposed sub-tasks in parallel across assigned agents.
   * Each agent receives its specific sub-task objective (not the full user message).
   * Calls onAgentComplete(agentName, subtaskId, result) as each agent finishes.
   *
   * @param {Array<{id: string, objective: string, agents: string[]}>} subtasks
   * @param {Array} conversationHistory
   * @param {Function} onAgentComplete - callback(agentName, subtaskId, result) fired per-agent completion
   * @returns {Promise<Array>} all results when every agent finishes
   */
  async runParallelTasks(subtasks, conversationHistory = [], onAgentComplete = null) {
    const results = [];
    console.log(`[Registry] Executing ${subtasks.length} subtasks concurrently in real time...`);

    const taskPromises = subtasks.flatMap((subtask) => {
      return (subtask.agents || []).map(async (agentName) => {
        const part = this.get(agentName);
        if (!part) {
          console.warn(`[Registry] Agent "${agentName}" not found for subtask ${subtask.id}`);
          return null;
        }

        const timeoutMs = agentName === 'coder' ? 65000 : 25000;
        const startTime = Date.now();

        try {
          const result = await Promise.race([
            part.process(subtask.objective, conversationHistory),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`${agentName} timeout`)), timeoutMs),
            ),
          ]);

          const enrichedResult = {
            ...result,
            subtaskId: subtask.id,
            subtaskObjective: subtask.objective,
            elapsed: Date.now() - startTime,
          };

          if (result && result.output) {
            if (onAgentComplete) {
              onAgentComplete(agentName, subtask.id, enrichedResult);
            }
          }

          return enrichedResult;
        } catch (err) {
          console.warn(
            `[Registry] Agent "${agentName}" failed on subtask ${subtask.id}:`,
            err.message,
          );
          const errorResult = {
            part: agentName,
            output: '',
            error: err.message,
            confidence: 0,
            subtaskId: subtask.id,
            subtaskObjective: subtask.objective,
            elapsed: Date.now() - startTime,
            timestamp: Date.now(),
          };

          if (onAgentComplete) {
            onAgentComplete(agentName, subtask.id, errorResult);
          }

          return errorResult;
        }
      });
    });

    const settled = await Promise.all(taskPromises);
    settled.filter(Boolean).forEach((r) => results.push(r));
    return results;
  }

  /**
   * Get total number of registered agents
   */
  getAgentCount() {
    return this.getAll().length;
  }

  /**
   * Get status of all parts
   */
  getStatus() {
    const all = this.getAll();
    return {
      total: all.length,
      active: all.filter((p) => p.isActive).length,
      parts: all.map((p) => p.getStatus()),
    };
  }
}

const registry = new PartsRegistry();
export default registry;
