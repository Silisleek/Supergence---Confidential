// SIS 1.0 — Huxley-Gödel (HGM) & Darwin-Gödel (DGM) Clade Archive
// Solves the "Metaproductivity-Performance Mismatch" (arXiv 2510.21614)
// An agent's current benchmark score is a poor predictor of descendant quality.
// CMP (Clade Metaproductivity) measures how good, on average, are the children
// this agent tends to produce, preserving critical "stepping stone" nodes.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RSI_DATA_DIR = process.env.SIS_DATA_DIR ? path.join(path.resolve(process.env.SIS_DATA_DIR), 'rsi') : path.join(__dirname, '../../data/rsi');
const ARCHIVE_FILE = path.join(RSI_DATA_DIR, 'clade-archive.json');

// Ensure directory exists
if (!fs.existsSync(RSI_DATA_DIR)) {
  fs.mkdirSync(RSI_DATA_DIR, { recursive: true });
}

export class CladeArchive {
  constructor(options = {}) {
    this.filePath = options.filePath || ARCHIVE_FILE;
    this.nodes = new Map(); // id -> CladeNode
    this.rootId = 'root_origin';
    this.stats = {
      totalNodes: 0,
      activeClades: 1,
      maxDepth: 1,
      steppingStonesPreserved: 0,
      highestCMP: 0,
      highestRawScore: 0,
      lastEvolvedAt: null,
    };

    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const data = JSON.parse(raw);
        if (data.nodes && Array.isArray(data.nodes)) {
          this.nodes.clear();
          for (const node of data.nodes) {
            this.nodes.set(node.id, {
              ...node,
              childrenIds: node.childrenIds || [],
            });
          }
        }
        if (data.stats) {
          this.stats = { ...this.stats, ...data.stats };
        }
      }
    } catch (err) {
      console.warn('[CladeArchive] Load warning:', err.message);
    }

    // Seed root ancestor if archive is empty
    if (this.nodes.size === 0) {
      this._seedRoot();
    }
  }

  _seedRoot() {
    const rootNode = {
      id: this.rootId,
      parentId: null,
      generation: 0,
      type: 'scaffold_root',
      domain: 'core',
      name: 'SIS 1.0 Foundation Scaffold',
      description:
        'Genesis archetype containing baseline cognitive prompts and execution scaffolds',
      content: 'Baseline SIS Orchestration & Prompt Directive System',
      rawScore: 0,
      cmpScore: 0,
      descendantCount: 0,
      childrenIds: [],
      metadata: {
        epoch: 0,
        isSteppingStone: false,
        verifiedInvariants: ['zero-stub-mandate', 'empirical-sandbox-validation'],
      },
      createdAt: Date.now(),
    };
    this.nodes.set(this.rootId, rootNode);
    this.stats.totalNodes = 1;
    this._save();
  }

  _save() {
    try {
      if (!fs.existsSync(path.dirname(this.filePath))) {
        fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      }
      const serialized = {
        stats: this.stats,
        nodes: Array.from(this.nodes.values()),
      };
      fs.writeFileSync(this.filePath, JSON.stringify(serialized, null, 2), 'utf8');
    } catch (err) {
      console.error('[CladeArchive] Save error:', err.message);
    }
  }

  /**
   * Register a newly evolved agent variant, prompt directive, or tool scaffold
   */
  registerVariant(variantData) {
    const parentId = variantData.parentId || this.rootId;
    const parent = this.nodes.get(parentId) || this.nodes.get(this.rootId);
    const generation = (parent?.generation || 0) + 1;
    const id =
      variantData.id ||
      `clade_gen${generation}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const node = {
      id,
      parentId: parent ? parent.id : null,
      generation,
      type: variantData.type || 'agent_scaffold', // agent_scaffold | prompt_directive | tool_impl | evaluator_rubric
      domain: variantData.domain || 'coding',
      name: variantData.name || `Variant Gen ${generation}`,
      description: variantData.description || '',
      content: variantData.content || '',
      rawScore: Number(variantData.rawScore || 0),
      cmpScore: Number(variantData.rawScore || 0), // initialized to raw, updated recursively
      descendantCount: 0,
      childrenIds: [],
      metadata: {
        epoch: variantData.epoch || 0,
        isSteppingStone: Boolean(variantData.isSteppingStone),
        speedupMultiplier: variantData.speedupMultiplier || 1.0,
        latencyGainPercent: variantData.latencyGainPercent || 0,
        ...variantData.metadata,
      },
      createdAt: Date.now(),
    };

    this.nodes.set(id, node);

    // Link parent -> child
    if (parent) {
      if (!parent.childrenIds.includes(id)) {
        parent.childrenIds.push(id);
      }
    }

    // Recursively recalculate CMP from parent up to root
    this.recalculateLineageCMP(id);

    // Update global archive statistics
    this.stats.totalNodes = this.nodes.size;
    this.stats.maxDepth = Math.max(this.stats.maxDepth, generation);
    this.stats.lastEvolvedAt = Date.now();
    this.stats.highestRawScore = Math.max(this.stats.highestRawScore, node.rawScore);

    // Count preserved stepping stones
    let steppingCount = 0;
    let maxCMP = 0;
    for (const n of this.nodes.values()) {
      if (n.metadata?.isSteppingStone) steppingCount++;
      if (n.cmpScore > maxCMP) maxCMP = n.cmpScore;
    }
    this.stats.steppingStonesPreserved = steppingCount;
    this.stats.highestCMP = Number(maxCMP.toFixed(4));

    // Calculate active clades (branching factor)
    const branches = new Set();
    for (const n of this.nodes.values()) {
      if (n.childrenIds.length === 0) branches.add(n.parentId || 'root');
    }
    this.stats.activeClades = Math.max(1, branches.size);

    this._save();
    return node;
  }

  /**
   * Calculate Clade (all descendants of a given node)
   */
  getClade(nodeId) {
    const root = this.nodes.get(nodeId);
    if (!root) return [];
    const clade = [];
    const queue = [root];

    while (queue.length > 0) {
      const curr = queue.shift();
      clade.push(curr);
      for (const childId of curr.childrenIds || []) {
        const child = this.nodes.get(childId);
        if (child) queue.push(child);
      }
    }
    return clade;
  }

  /**
   * Recalculate Clade Metaproductivity (CMP) for a node and all its ancestors
   * CMP(A) = average score across all descendants in Clade(A)
   */
  recalculateLineageCMP(startNodeId) {
    let currId = startNodeId;
    const visited = new Set();

    while (currId && !visited.has(currId)) {
      visited.add(currId);
      const currNode = this.nodes.get(currId);
      if (!currNode) break;

      const clade = this.getClade(currId);
      const descendants = clade.filter((n) => n.id !== currId);
      currNode.descendantCount = descendants.length;

      if (descendants.length === 0) {
        currNode.cmpScore = currNode.rawScore;
      } else {
        const totalScore = descendants.reduce((sum, d) => sum + (d.rawScore || 0), 0);
        const avgDescendantScore = totalScore / descendants.length;
        // HGM metric: Blended CMP weighting descendant potential with node's own fitness
        currNode.cmpScore = Number(
          (avgDescendantScore * 0.75 + currNode.rawScore * 0.25).toFixed(4),
        );

        // Mark as stepping stone if node's own score was modest but its descendant yield is high
        if (currNode.rawScore < 0.88 && currNode.cmpScore >= 0.9) {
          currNode.metadata.isSteppingStone = true;
        }
      }

      currId = currNode.parentId;
    }
  }

  /**
   * Sample parent candidate for breeding/mutation using HGM Clade Metaproductivity
   * Avoids greedy performance traps by weighting CMP over raw score.
   */
  sampleParent(domain = null, exploreRate = 0.25) {
    let pool = Array.from(this.nodes.values());
    if (domain) {
      const domainMatches = pool.filter((n) => n.domain === domain);
      if (domainMatches.length > 0) pool = domainMatches;
    }

    if (pool.length === 0) return this.nodes.get(this.rootId);
    if (pool.length === 1) return pool[0];

    // Exploration: Random sample from stepping stones or diverse branches
    if (Math.random() < exploreRate) {
      const steppingStones = pool.filter((n) => n.metadata?.isSteppingStone);
      if (steppingStones.length > 0) {
        return steppingStones[Math.floor(Math.random() * steppingStones.length)];
      }
      return pool[Math.floor(Math.random() * pool.length)];
    }

    // Exploitation with CMP: Softmax selection based on Clade Metaproductivity
    const temperature = 0.15;
    const weights = pool.map((n) => {
      // Priority formula: 70% CMP + 30% Raw Score + Bonus for novel stepping stones
      const priority =
        n.cmpScore * 0.7 + n.rawScore * 0.3 + (n.metadata?.isSteppingStone ? 0.05 : 0);
      return Math.exp(priority / temperature);
    });

    const sumWeights = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * sumWeights;

    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }

    return pool[pool.length - 1];
  }

  /**
   * Get stepping-stone nodes (nodes that were not local maxima but produced elite descendants)
   */
  getSteppingStones(limit = 10) {
    return Array.from(this.nodes.values())
      .filter((n) => n.metadata?.isSteppingStone)
      .sort((a, b) => b.cmpScore - a.cmpScore)
      .slice(0, limit);
  }

  /**
   * Get the Pareto frontier of current archive (trade-off between raw score and CMP)
   */
  getParetoFrontier() {
    const all = Array.from(this.nodes.values());
    const frontier = [];

    for (const a of all) {
      let dominated = false;
      for (const b of all) {
        if (
          b.id !== a.id &&
          b.rawScore >= a.rawScore &&
          b.cmpScore >= a.cmpScore &&
          (b.rawScore > a.rawScore || b.cmpScore > a.cmpScore)
        ) {
          dominated = true;
          break;
        }
      }
      if (!dominated) frontier.push(a);
    }
    return frontier.sort((a, b) => b.cmpScore - a.cmpScore);
  }

  /**
   * Return hierarchical tree structure for visualization
   */
  getTree() {
    const buildSubtree = (nodeId) => {
      const node = this.nodes.get(nodeId);
      if (!node) return null;
      return {
        id: node.id,
        name: node.name,
        generation: node.generation,
        domain: node.domain,
        type: node.type,
        rawScore: node.rawScore,
        cmpScore: node.cmpScore,
        descendantCount: node.descendantCount,
        isSteppingStone: Boolean(node.metadata?.isSteppingStone),
        children: (node.childrenIds || []).map((cid) => buildSubtree(cid)).filter(Boolean),
      };
    };

    return buildSubtree(this.rootId);
  }

  getStats() {
    return {
      ...this.stats,
      nodesCount: this.nodes.size,
      paretoFrontierCount: this.getParetoFrontier().length,
    };
  }
}

const cladeArchive = new CladeArchive();
export default cladeArchive;
