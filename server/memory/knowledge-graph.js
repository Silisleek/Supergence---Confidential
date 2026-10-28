// SIS 1.0 — Relational Associative Knowledge Graph
// Connects cognitive memory nodes via typed, weighted, semantic associative edges.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GRAPH_FILE = process.env.SIS_DATA_DIR
  ? path.join(path.resolve(process.env.SIS_DATA_DIR), 'memory/knowledge-graph.json')
  : path.join(__dirname, '../../data/memory/knowledge-graph.json');

export const RELATION_TYPES = {
  IMPLEMENTS: 'implements',
  REFUTES: 'refutes',
  GENERALIZES: 'generalizes',
  SUPERSEDES: 'supersedes',
  PREREQUISITE_OF: 'prerequisite_of',
  ANALOGOUS_TO: 'analogous_to',
  CAUSED_BY: 'caused_by',
  CORRELATED_WITH: 'correlated_with',
};

export class KnowledgeGraph {
  constructor() {
    this.storagePath = GRAPH_FILE;
    // node id -> { id, label, type, tags, metadata }
    this.nodes = new Map();
    // node id -> Map(targetId -> { relation, weight, createdAt, metadata })
    this.outEdges = new Map();
    // target id -> Map(sourceId -> { relation, weight, createdAt, metadata })
    this.inEdges = new Map();

    this._load();
  }

  /**
   * Dynamically switch storage file for isolated SIS systems
   */
  setStoragePath(newPath) {
    this.storagePath = path.resolve(newPath);
    this.nodes.clear();
    this.outEdges.clear();
    this.inEdges.clear();
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf8');
        const data = JSON.parse(raw);
        if (data.nodes) {
          for (const n of data.nodes) {
            this.nodes.set(n.id, n);
            this.outEdges.set(n.id, new Map());
            this.inEdges.set(n.id, new Map());
          }
        }
        if (data.edges) {
          for (const e of data.edges) {
            this.addEdge(e.from, e.to, e.relation, e.weight, e.metadata, false);
          }
        }
        console.log(
          `[KnowledgeGraph] Loaded ${this.nodes.size} nodes, ${data.edges?.length || 0} relational edges from ${this.storagePath}`,
        );
      }
    } catch (err) {
      console.warn('[KnowledgeGraph] Starting fresh graph:', err.message);
    }
  }

  _save() {
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(async () => {
      this._saveTimer = null;
      try {
        const dir = path.dirname(this.storagePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const nodesArr = [...this.nodes.values()];
        const edgesArr = [];
        for (const [fromId, targets] of this.outEdges.entries()) {
          for (const [toId, edge] of targets.entries()) {
            edgesArr.push({
              from: fromId,
              to: toId,
              relation: edge.relation,
              weight: edge.weight,
              createdAt: edge.createdAt,
              metadata: edge.metadata,
            });
          }
        }

        await fs.promises.writeFile(
          this.storagePath,
          JSON.stringify({ nodes: nodesArr, edges: edgesArr }, null, 2),
          'utf8',
        );
      } catch (err) {
        console.error('[KnowledgeGraph] Save error:', err.message);
      }
    }, 5000);
  }

  /**
   * Register or update a node in the graph
   */
  addNode(id, label, type = 'concept', tags = [], metadata = {}) {
    if (!id) return;
    const strLabel = String(label || id);
    if (
      strLabel.includes('DIRECT RESPONSE MODE') ||
      strLabel.includes('DIRECT-FALLBACK') ||
      strLabel.includes('EVOLVED META-DIRECTIVES') ||
      strLabel.includes('All specialist agents were unavailable')
    ) {
      return null;
    }
    const node = {
      id,
      label: String(label || id).slice(0, 100),
      type,
      tags: Array.isArray(tags) ? tags : [],
      metadata,
      updatedAt: Date.now(),
    };
    this.nodes.set(id, node);
    if (!this.outEdges.has(id)) this.outEdges.set(id, new Map());
    if (!this.inEdges.has(id)) this.inEdges.set(id, new Map());
    return node;
  }

  /**
   * Add a directional relational edge between two nodes
   */
  addEdge(
    fromId,
    toId,
    relation = RELATION_TYPES.CORRELATED_WITH,
    weight = 1.0,
    metadata = {},
    autoSave = true,
  ) {
    if (!fromId || !toId || fromId === toId) return;

    if (!this.nodes.has(fromId)) this.addNode(fromId, fromId);
    if (!this.nodes.has(toId)) this.addNode(toId, toId);

    if (!this.outEdges.has(fromId)) this.outEdges.set(fromId, new Map());
    if (!this.inEdges.has(toId)) this.inEdges.set(toId, new Map());

    const edgeData = {
      relation,
      weight: Number(Math.min(1.0, Math.max(0.1, weight)).toFixed(2)),
      createdAt: Date.now(),
      metadata,
    };

    this.outEdges.get(fromId).set(toId, edgeData);
    this.inEdges.get(toId).set(fromId, edgeData);

    if (autoSave) this._save();
    return edgeData;
  }

  /**
   * Get direct neighbors of a node
   */
  getNeighbors(id, relationFilter = null) {
    const results = [];
    const outMap = this.outEdges.get(id);
    if (outMap) {
      for (const [targetId, edge] of outMap.entries()) {
        if (!relationFilter || edge.relation === relationFilter) {
          results.push({
            nodeId: targetId,
            node: this.nodes.get(targetId),
            direction: 'out',
            relation: edge.relation,
            weight: edge.weight,
          });
        }
      }
    }

    const inMap = this.inEdges.get(id);
    if (inMap) {
      for (const [sourceId, edge] of inMap.entries()) {
        if (!relationFilter || edge.relation === relationFilter) {
          results.push({
            nodeId: sourceId,
            node: this.nodes.get(sourceId),
            direction: 'in',
            relation: edge.relation,
            weight: edge.weight,
          });
        }
      }
    }

    return results;
  }

  /**
   * Associative Recall traversal: expands a root set of node IDs into their
   * 1-hop and 2-hop connected concepts for deep contextual grounding.
   */
  traverseAssociative(startNodeIds = [], maxDepth = 2, maxResults = 8) {
    const visited = new Set();
    const results = [];
    const queue = [];

    const roots = Array.isArray(startNodeIds) ? startNodeIds : [startNodeIds];
    for (const id of roots) {
      if (this.nodes.has(id)) {
        queue.push({ id, depth: 0, weight: 1.0, path: [id] });
        visited.add(id);
      }
    }

    while (queue.length > 0 && results.length < maxResults) {
      const current = queue.shift();
      if (current.depth > 0) {
        results.push({
          node: this.nodes.get(current.id),
          depth: current.depth,
          accumulatedWeight: Number(current.weight.toFixed(2)),
          path: current.path,
        });
      }

      if (current.depth >= maxDepth) continue;

      const neighbors = this.getNeighbors(current.id);
      for (const n of neighbors) {
        if (!visited.has(n.nodeId)) {
          visited.add(n.nodeId);
          queue.push({
            id: n.nodeId,
            depth: current.depth + 1,
            weight: current.weight * n.weight,
            path: [...current.path, n.nodeId],
          });
        }
      }
    }

    return results;
  }

  /**
   * Spreading Activation Algorithm (Cognitive Psychology Model):
   * Simulates neural activation spreading across conceptual nodes.
   * Initial seed nodes pass activation energy through weighted edges.
   */
  spreadingActivation(seedNodeIds = [], decayFactor = 0.5, threshold = 0.15, maxNodes = 15) {
    const activation = new Map();
    const seeds = Array.isArray(seedNodeIds) ? seedNodeIds : [seedNodeIds];
    const queue = [];

    // Inject initial activation energy into seed nodes
    for (const id of seeds) {
      if (this.nodes.has(id)) {
        activation.set(id, 1.0);
        queue.push(id);
      }
    }

    while (queue.length > 0) {
      const currentId = queue.shift();
      const currentEnergy = activation.get(currentId) || 0;
      if (currentEnergy < threshold) continue;

      const neighbors = this.getNeighbors(currentId);
      for (const n of neighbors) {
        const spreadEnergy = currentEnergy * n.weight * decayFactor;
        if (spreadEnergy >= threshold) {
          const prevEnergy = activation.get(n.nodeId) || 0;
          const newEnergy = Math.min(1.0, prevEnergy + spreadEnergy);
          activation.set(n.nodeId, newEnergy);

          if (prevEnergy === 0) {
            queue.push(n.nodeId);
          }
        }
      }
    }

    // Rank activated nodes by final energy (excluding seed nodes unless reactivated)
    const activatedList = [];
    for (const [id, energy] of activation.entries()) {
      if (energy >= threshold && this.nodes.has(id)) {
        activatedList.push({
          nodeId: id,
          node: this.nodes.get(id),
          activationEnergy: Number(energy.toFixed(3)),
          isSeed: seeds.includes(id),
        });
      }
    }

    return activatedList.sort((a, b) => b.activationEnergy - a.activationEnergy).slice(0, maxNodes);
  }

  /**
   * Search knowledge graph entities by query keywords and tags
   */
  search(query, limit = 8) {
    if (!query || typeof query !== 'string') return [];
    const cleanWords = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(
        (w) =>
          w.length > 2 &&
          ![
            'what',
            'when',
            'where',
            'which',
            'who',
            'how',
            'make',
            'use',
            'from',
            'this',
            'that',
            'with',
          ].includes(w),
      );

    if (cleanWords.length === 0) return [];
    const scored = [];

    for (const [id, node] of this.nodes.entries()) {
      const label = (node.label || '').toLowerCase();
      const tags = (node.tags || []).join(' ').toLowerCase();
      let score = 0;

      for (const w of cleanWords) {
        if (label === w) score += 15;
        else if (label.includes(w)) score += 6;
        if (tags.includes(w)) score += 3;
      }

      if (score > 0) {
        const neighbors = this.getNeighbors(id)
          .slice(0, 3)
          .map((nb) => {
            const target = this.nodes.get(nb.nodeId);
            return `${nb.relation} -> "${target?.label || nb.nodeId}"`;
          });
        scored.push({
          id,
          label: node.label,
          type: node.type,
          tags: node.tags || [],
          relationships: neighbors,
          score,
        });
      }
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Get graph structure for UI visualizer
   */
  toJSON() {
    const nodes = [];
    for (const n of this.nodes.values()) {
      nodes.push({
        id: n.id,
        label: n.label,
        type: n.type,
        tags: n.tags,
      });
      if (nodes.length >= 150) break;
    }

    const edges = [];
    let edgeCount = 0;
    for (const [fromId, targets] of this.outEdges.entries()) {
      edgeCount += targets.size;
      if (edges.length < 300) {
        for (const [toId, edge] of targets.entries()) {
          edges.push({
            from: fromId,
            to: toId,
            relation: edge.relation,
            weight: edge.weight,
          });
          if (edges.length >= 300) break;
        }
      }
    }

    return {
      nodeCount: this.nodes.size,
      edgeCount,
      nodes,
      edges,
    };
  }

  /**
   * Sample truly dynamic and divergent nodes from the Knowledge Graph
   * for zero-hardcoding epistemic frontier exploration.
   */
  sampleRandomFrontierNodes(count = 2) {
    if (this.nodes.size === 0) return [];
    const nodeKeys = Array.from(this.nodes.keys());
    const sampled = [];
    const seen = new Set();
    for (let i = 0; i < count * 8 && sampled.length < count; i++) {
      const randKey = nodeKeys[Math.floor(Math.random() * nodeKeys.length)];
      if (!seen.has(randKey)) {
        seen.add(randKey);
        const n = this.nodes.get(randKey);
        if (n && n.label && n.label.trim().length > 3) {
          sampled.push(n);
        }
      }
    }
    return sampled;
  }
}

const knowledgeGraph = new KnowledgeGraph();
export default knowledgeGraph;
