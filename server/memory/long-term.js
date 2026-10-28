// SIS 1.0 — Long-Term Memory
// Persistent memory tree — only the verifier writes, AI parts can read

import { MemoryTree, toText } from './tree.js';
import { memoryVerificationMetadata } from '../trajectory/learning-grade.js';
import knowledgeGraph, { RELATION_TYPES } from './knowledge-graph.js';
import survivalEngine from '../survival/survival.js';
import enterpriseVault from '../security/vault.js';
import enterpriseAuditTrail from '../security/audit-trail.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LTM_PATH = process.env.SIS_DATA_DIR
  ? path.join(path.resolve(process.env.SIS_DATA_DIR), 'memory/long-term.json')
  : path.join(__dirname, '../../data/memory/long-term.json');

class LongTermMemory {
  constructor() {
    this.storagePath = LTM_PATH;
    this.tree = new MemoryTree('long-term-memory');
    this._load();
  }

  /**
   * Dynamically switch storage file for isolated SIS systems
   */
  setStoragePath(newPath) {
    this.storagePath = path.resolve(newPath);
    this.tree = new MemoryTree('long-term-memory');
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const data = enterpriseVault.secureReadJson(this.storagePath);
        if (data) {
          this.tree = MemoryTree.fromJSON(data);
          console.log(
            `[LTM] Loaded ${this.tree.root.flatten().length} memory nodes from ${this.storagePath}`,
          );
          return;
        }
      }
      this.tree = new MemoryTree('long-term-memory');
    } catch (e) {
      console.log('[LTM] Starting fresh — no existing memory found');
      this.tree = new MemoryTree('long-term-memory');
    }
  }

  _save() {
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(async () => {
      this._saveTimer = null;
      try {
        const payload = this.tree.toJSON();
        await fs.promises.writeFile(this.storagePath, JSON.stringify(payload, null, 2), 'utf8');
      } catch (e) {
        console.error('[LTM] Save error:', e.message);
      }
    }, 5000);
  }

  /**
   * Store verified information (called by verifier and autonomous learner)
   */
  store(categoryPath, data, source = 'verifier', autoSave = true) {
    const contentStr = typeof data === 'string' ? data : JSON.stringify(data);
    if (
      contentStr.includes('DIRECT RESPONSE MODE') ||
      contentStr.includes('DIRECT-FALLBACK') ||
      contentStr.includes('EVOLVED META-DIRECTIVES') ||
      contentStr.includes('All specialist agents were unavailable')
    ) {
      return null;
    }
    const node = this.tree.add(categoryPath, {
      ...data,
      source,
      metadata: memoryVerificationMetadata(data.metadata, data.verification),
    });

    // Auto-link to related concepts in knowledge graph if tags exist
    if (Array.isArray(node.tags)) {
      for (const t of node.tags) {
        knowledgeGraph.addNode(`tag:${t}`, t, 'concept-tag');
        knowledgeGraph.addEdge(node.id, `tag:${t}`, RELATION_TYPES.CORRELATED_WITH, 0.9, {}, false);
      }
    }

    // Link explicit related nodes
    if (data.relatedNodeId) {
      knowledgeGraph.addEdge(
        node.id,
        data.relatedNodeId,
        data.relation || RELATION_TYPES.IMPLEMENTS,
        0.95,
      );
    }

    try {
      survivalEngine.onMemoryStore();
    } catch {}

    if (autoSave) this._save();
    return node;
  }

  /**
   * Read a memory by ID (available to all parts)
   */
  read(id) {
    const node = this.tree.get(id);
    if (node) {
      node.accessCount++;
      node.metadata = memoryVerificationMetadata(node.metadata);
    }
    return node;
  }

  /**
   * Search memories (available to all parts)
   */
  search(query) {
    return this.tree.search(query).map((node) => {
      node.metadata = memoryVerificationMetadata(node.metadata);
      if (!node.metadata.verified) node.tags = node.tags.filter((tag) => tag !== 'verified');
      return node;
    });
  }

  /**
   * Find by tag (available to all parts)
   */
  findByTag(tag) {
    const nodes = this.tree.findByTag(tag).map((node) => {
      node.metadata = memoryVerificationMetadata(node.metadata);
      if (!node.metadata.verified) node.tags = node.tags.filter((entry) => entry !== 'verified');
      return node;
    });
    return tag === 'verified' ? nodes.filter((node) => node.metadata.verified) : nodes;
  }

  /**
   * Mark a memory as potentially wrong (verifier only)
   */
  markUncertain(id) {
    const node = this.tree.get(id);
    if (node) {
      node.markCouldBeWrong();
      this._save();
    }
    return node;
  }

  /**
   * Verify/confirm a memory (verifier only)
   */
  verify(id) {
    const node = this.tree.get(id);
    if (node) {
      node.metadata = memoryVerificationMetadata(node.metadata);
      if (node.metadata.verified) node.verify();
      this._save();
    }
    return node;
  }

  /**
   * Update an existing memory node's content and metadata
   */
  update(id, updates = {}) {
    const node = this.tree.get(id);
    if (!node) return null;
    if (updates.content !== undefined) node.content = toText(updates.content);
    if (updates.tags !== undefined && Array.isArray(updates.tags)) node.tags = updates.tags;
    if (updates.confidence !== undefined) node.confidence = updates.confidence;
    if (updates.couldBeWrong !== undefined) node.couldBeWrong = updates.couldBeWrong;
    node.metadata = memoryVerificationMetadata({
      ...node.metadata,
      ...updates.metadata,
      updatedAt: Date.now(),
    });
    node.updatedAt = Date.now();
    this._save();
    return node;
  }

  /**
   * Remove a memory node by ID
   */
  remove(id) {
    this.tree.remove(id);
    this._save();
    return true;
  }

  /**
   * Get the full tree for visualization
   */
  getTree() {
    const tree = this.tree.toJSON();
    const normalize = (node) => {
      node.metadata = memoryVerificationMetadata(node.metadata);
      if (!node.metadata.verified)
        node.tags = (node.tags || []).filter((tag) => tag !== 'verified');
      for (const child of node.children || []) normalize(child);
    };
    normalize(tree);
    return tree;
  }

  /**
   * Get all memories
   */
  getAll() {
    return this.tree.root
      .flatten()
      .filter((n) => n.type !== 'root' && n.type !== 'category')
      .map((node) => {
        node.metadata = memoryVerificationMetadata(node.metadata);
        if (!node.metadata.verified) node.tags = node.tags.filter((tag) => tag !== 'verified');
        return node;
      });
  }

  /**
   * Get stats
   */
  getStats() {
    return this.tree.getStats();
  }

  /**
   * Generate summary for AI context
   */
  getSummary(topic = '') {
    let items;
    if (topic) {
      items = this.search(topic).slice(0, 6);
    } else {
      items = this.getAll().slice(0, 8);
    }
    if (items.length === 0) return 'No relevant long-term memories found.';
    const lines = items.map((n) => {
      const wrongTag = n.couldBeWrong ? ' (could be wrong)' : '';
      return `- [${n.type}] ${toText(n.content).substring(0, 150)}${wrongTag}`;
    });
    return `Long-term memory (${items.length} items):\n${lines.join('\n')}`;
  }

  /**
   * Load skills into long-term memory from skill files
   */
  loadSkills(skillsDir) {
    if (this._skillsLoaded) return;
    try {
      if (!fs.existsSync(skillsDir)) return;
      const existingNodes = this.findByTag('skill') || [];
      const existingNames = new Set(
        existingNodes
          .map((n) => n.metadata?.title || n.tags?.find((t) => t !== 'skill'))
          .filter(Boolean),
      );
      const files = fs.readdirSync(skillsDir).filter((f) => f.endsWith('.json'));
      let loaded = 0;
      for (const file of files) {
        const skill = JSON.parse(fs.readFileSync(path.join(skillsDir, file), 'utf8'));
        if (!existingNames.has(skill.name)) {
          this.store(
            ['skills', skill.domain],
            {
              content: JSON.stringify(skill),
              type: 'skill',
              tags: ['skill', skill.domain, skill.name, ...(skill.tags || [])],
              metadata: { title: skill.name, domain: skill.domain, level: skill.level },
            },
            'skill-loader',
            false,
          );
          existingNames.add(skill.name);
          loaded++;
        }
      }
      this._skillsLoaded = true;
      if (loaded > 0) {
        console.log(`[LTM] Loaded ${loaded} new skills`);
        this._save();
      }
    } catch (e) {
      console.error('[LTM] Skills load error:', e.message);
    }
  }
}

// Singleton
const longTermMemory = new LongTermMemory();
export default longTermMemory;
