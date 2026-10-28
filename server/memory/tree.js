// SIS 1.0 — Memory Tree Data Structure
// Hierarchical tree + Cognitive Hybrid Semantic Vector Search + Associative Knowledge Graph

import { v4 as uuidv4 } from 'uuid';
import hybridSearch from './hybrid-search.js';
import knowledgeGraph, { RELATION_TYPES } from './knowledge-graph.js';

// Coerce anything (AI tool args, persisted JSON, numbers, objects) to safe text.
export function toText(v) {
  if (typeof v === 'string') return v;
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v);
    } catch {
      return Object.prototype.toString.call(v);
    }
  }
  return String(v);
}

export function toTextArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(toText);
}

export class MemoryNode {
  constructor(data = {}, autoIndex = true) {
    this.id = data.id || uuidv4();
    this.content = toText(data.content);
    this.type = data.type || 'text'; // text, file, image, tag, structured, autonomous-breakthrough
    this.tags = toTextArray(data.tags);
    this.metadata = data.metadata || {};
    this.confidence = data.confidence ?? 1.0; // 1.0 = certain, 0.0 = uncertain
    this.couldBeWrong = data.couldBeWrong || false;
    this.children = [];
    this.createdAt = data.createdAt || Date.now();
    this.updatedAt = data.updatedAt || Date.now();
    this.accessCount = data.accessCount || 0;
    this.source = data.source || 'system';

    // Index into hybrid semantic search and knowledge graph if meaningful content
    if (autoIndex) {
      this._indexCognitive();
    }
  }

  _indexCognitive() {
    if (this.type === 'root' || this.type === 'category' || !this.content) return;
    const searchText = `${this.metadata?.title || ''} ${this.content} ${this.tags.join(' ')}`;
    hybridSearch.indexDocument(this.id, searchText, {
      id: this.id,
      type: this.type,
      tags: this.tags,
      confidence: this.confidence,
      source: this.source,
    });

    knowledgeGraph.addNode(
      this.id,
      this.metadata?.title || this.content.slice(0, 50),
      this.type,
      this.tags,
      this.metadata,
    );
  }

  addChild(nodeData) {
    const child = new MemoryNode(nodeData);
    this.children.push(child);
    this.updatedAt = Date.now();

    // Link child to parent in knowledge graph
    knowledgeGraph.addEdge(this.id, child.id, RELATION_TYPES.GENERALIZES, 0.8, {}, false);
    return child;
  }

  removeChild(id) {
    this.children = this.children.filter((c) => c.id !== id);
    hybridSearch.removeDocument(id);
    this.updatedAt = Date.now();
  }

  findById(id) {
    if (this.id === id) return this;
    for (const child of this.children) {
      const found = child.findById(id);
      if (found) return found;
    }
    return null;
  }

  findByTag(tag) {
    const results = [];
    const safeTags = Array.isArray(this.tags) ? this.tags : [];
    if (safeTags.includes(tag)) results.push(this);
    for (const child of this.children || []) {
      try {
        results.push(...child.findByTag(tag));
      } catch (e) {}
    }
    return results;
  }

  search(query) {
    const results = [];
    try {
      const q = toText(query).toLowerCase();
      const safeContent = toText(this.content).toLowerCase();
      const title = toText(this.metadata?.title).toLowerCase();
      const safeTags = Array.isArray(this.tags) ? this.tags : [];
      if (
        safeContent.includes(q) ||
        safeTags.some((t) => toText(t).toLowerCase().includes(q)) ||
        (title && title.includes(q))
      ) {
        this.accessCount++;
        results.push(this);
      }
    } catch (e) {}

    for (const child of this.children || []) {
      try {
        results.push(...child.search(query));
      } catch (e) {}
    }
    return results;
  }

  markCouldBeWrong() {
    this.couldBeWrong = true;
    this.confidence = Math.min(this.confidence, 0.5);
    if (!this.tags.includes('(could be wrong)')) {
      this.tags.push('(could be wrong)');
    }
    if (typeof this.content === 'string' && !this.content.includes('(could be wrong)')) {
      this.content = `${this.content} (could be wrong)`;
    }
    this.updatedAt = Date.now();
  }

  verify() {
    this.couldBeWrong = false;
    this.confidence = 1.0;
    this.updatedAt = Date.now();
  }

  toJSON() {
    return {
      id: this.id,
      content: this.content,
      type: this.type,
      tags: this.tags,
      metadata: this.metadata,
      confidence: this.confidence,
      couldBeWrong: this.couldBeWrong,
      children: this.children.map((c) => c.toJSON()),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      accessCount: this.accessCount,
      source: this.source,
    };
  }

  static fromJSON(data) {
    const source = data && typeof data === 'object' ? data : {};
    const node = new MemoryNode({ ...source, content: toText(source.content) }, false);
    if (Array.isArray(source.children)) {
      node.children = source.children.map((c) => {
        try {
          return MemoryNode.fromJSON(c);
        } catch (e) {
          return new MemoryNode({ content: '[corrupted]', type: 'error' }, false);
        }
      });
    }
    return node;
  }

  flatten() {
    const all = [this];
    for (const child of this.children) {
      all.push(...child.flatten());
    }
    return all;
  }

  prune(maxAge = 3600000) {
    const now = Date.now();
    this.children = this.children.filter((c) => {
      if (now - c.updatedAt > maxAge && c.accessCount === 0) {
        hybridSearch.removeDocument(c.id);
        return false;
      }
      c.prune(maxAge);
      return true;
    });
  }

  getStats() {
    const all = this.flatten();
    return {
      totalNodes: all.length,
      byType: all.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      }, {}),
      uncertain: all.filter((n) => n.couldBeWrong).length,
      avgConfidence: all.reduce((a, n) => a + n.confidence, 0) / (all.length || 1),
    };
  }
}

export class MemoryTree {
  constructor(name = 'root') {
    this.root = new MemoryNode({
      content: name,
      type: 'root',
      tags: ['root'],
    });
  }

  add(path, nodeData) {
    let current = this.root;
    if (path && path.length > 0) {
      for (const rawSegment of path) {
        const segment = toText(rawSegment);
        let child = current.children.find((c) => c.content === segment || c.tags.includes(segment));
        if (!child) {
          child = current.addChild({ content: segment, type: 'category', tags: [segment] });
        }
        current = child;
      }
    }
    return current.addChild(nodeData);
  }

  get(id) {
    return this.root.findById(id);
  }

  /**
   * Cognitive Hybrid Search:
   * Combines vector semantic similarity + BM25 lexical relevance + associative knowledge graph links.
   */
  search(query, limit = 10) {
    const qStr = toText(query);
    if (!qStr) return [];

    const foundNodes = new Map();

    // 1. Run Cognitive Hybrid Vector + BM25 search
    const hybridHits = hybridSearch.search(qStr, limit);
    for (const hit of hybridHits) {
      const node = this.get(hit.id);
      if (node) {
        node.accessCount++;
        foundNodes.set(node.id, {
          node,
          score: hit.score,
          matchType: 'hybrid-semantic',
        });
      }
    }

    // 2. Run structural tree search as fallback / complement
    const lexicalNodes = this.root.search(qStr);
    for (const node of lexicalNodes) {
      if (!foundNodes.has(node.id)) {
        foundNodes.set(node.id, {
          node,
          score: 0.5,
          matchType: 'lexical',
        });
      }
    }

    // 3. Spreading Activation: Priming conceptual neighbors via neural energy propagation
    const topNodeIds = [...foundNodes.keys()].slice(0, 3);
    const activatedHits = knowledgeGraph.spreadingActivation(topNodeIds, 0.5, 0.15, 5);
    for (const act of activatedHits) {
      if (act.node && !foundNodes.has(act.node.id)) {
        const actNode = this.get(act.node.id);
        if (actNode) {
          foundNodes.set(actNode.id, {
            node: actNode,
            score: 0.4 * act.activationEnergy,
            matchType: 'spreading-activation',
          });
        }
      }
    }

    // Return ranked array of MemoryNodes
    const ranked = [...foundNodes.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.node);

    return ranked;
  }

  findByTag(tag) {
    return this.root.findByTag(tag);
  }

  remove(id) {
    const parent = this._findParent(id);
    if (parent) parent.removeChild(id);
  }

  _findParent(childId) {
    const _find = (node) => {
      for (const child of node.children) {
        if (child.id === childId) return node;
        const found = _find(child);
        if (found) return found;
      }
      return null;
    };
    return _find(this.root);
  }

  toJSON() {
    return this.root.toJSON();
  }

  static fromJSON(data) {
    const tree = new MemoryTree();
    tree.root = MemoryNode.fromJSON(data);

    // Index the most relevant/recent nodes immediately, defer remaining historical nodes to gentle background ticks
    const all = tree.root.flatten().filter((n) => n.type !== 'root' && n.type !== 'category');
    const immediateCount = Math.min(all.length, 500);
    for (let i = 0; i < immediateCount; i++) {
      all[i]._indexCognitive();
    }
    if (all.length > immediateCount) {
      let offset = immediateCount;
      const step = () => {
        const batch = all.slice(offset, offset + 300);
        for (const n of batch) {
          n._indexCognitive();
        }
        offset += 300;
        if (offset < all.length) {
          setTimeout(step, 30);
        }
      };
      setTimeout(step, 100);
    }
    return tree;
  }

  getStats() {
    return this.root.getStats();
  }
}

export default { MemoryTree, MemoryNode };
