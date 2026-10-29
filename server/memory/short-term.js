// SIS 1.0 — Short-Term Memory
// Temporary memory accessible by all AI parts — mimics human working memory

import { MemoryTree, toText, toTextArray } from './tree.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STM_PATH = process.env.SIS_DATA_DIR
  ? path.join(path.resolve(process.env.SIS_DATA_DIR), 'memory/short-term.json')
  : path.join(__dirname, '../../data/memory/short-term.json');

class ShortTermMemory {
  constructor() {
    this.storagePath = STM_PATH;
    this.tree = new MemoryTree('short-term-memory');
    this.ttl = 30 * 60 * 1000; // 30 minutes default TTL
    this.listeners = new Map(); // event listeners for memory changes
    this._load();
  }

  /**
   * Dynamically switch storage file for isolated SIS systems
   */
  setStoragePath(newPath) {
    this.storagePath = path.resolve(newPath);
    this.tree = new MemoryTree('short-term-memory');
    this._load();
    this._emit('reloaded', { path: this.storagePath });
  }

  _load() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const data = JSON.parse(fs.readFileSync(this.storagePath, 'utf8'));
        this.tree = MemoryTree.fromJSON(data);
      } else {
        this.tree = new MemoryTree('short-term-memory');
      }
    } catch (e) {
      console.log('[STM] Starting fresh — no existing memory found');
      this.tree = new MemoryTree('short-term-memory');
    }
  }

  _save() {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.storagePath, JSON.stringify(this.tree.toJSON(), null, 2));
    } catch (e) {
      console.error('[STM] Save error:', e.message);
    }
  }

  _emit(event, data) {
    const handlers = this.listeners.get(event) || [];
    handlers.forEach((fn) => fn(data));
  }

  on(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(handler);
  }

  /**
   * Store something in short-term memory
   * @param {string[]} path - Category path (e.g., ['user', 'preferences'])
   * @param {Object} data - Memory data { content, type, tags, metadata }
   * @param {string} source - Which AI part is storing this
   * @returns {Object} The created memory node
   */
  store(categoryPath, data, source = 'system') {
    const node = this.tree.add(categoryPath, {
      ...data,
      source,
      metadata: {
        ...data.metadata,
        expiresAt: Date.now() + this.ttl,
      },
    });
    this._save();
    this._emit('added', { node, path: categoryPath, source });
    return node;
  }

  /**
   * Read a memory by ID
   */
  read(id) {
    const node = this.tree.get(id);
    if (node) node.accessCount++;
    return node;
  }

  /**
   * Search memories
   */
  search(query) {
    return this.tree.search(query);
  }

  /**
   * Find by tag
   */
  findByTag(tag) {
    return this.tree.findByTag(tag);
  }

  /**
   * Update a memory node
   */
  update(id, updates) {
    const node = this.tree.get(id);
    if (!node) return null;
    if (updates.content !== undefined) node.content = toText(updates.content);
    if (updates.tags) node.tags = [...new Set([...node.tags, ...toTextArray(updates.tags)])];
    if (updates.metadata) node.metadata = { ...node.metadata, ...updates.metadata };
    if (updates.type) node.type = updates.type;
    node.updatedAt = Date.now();
    this._save();
    this._emit('updated', { node, updates });
    return node;
  }

  /**
   * Remove a memory
   */
  remove(id) {
    this.tree.remove(id);
    this._save();
    this._emit('removed', { id });
  }

  /**
   * Get all memories as flat array
   */
  getAll() {
    return this.tree.root.flatten().filter((n) => n.type !== 'root' && n.type !== 'category');
  }

  /**
   * Get recent memories
   */
  getRecent(count = 20) {
    return this.getAll()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, count);
  }

  /**
   * Get unverified memories (for the verifier to check)
   */
  getUnverified() {
    return this.getAll().filter((n) => !n.metadata.verified && n.type !== 'category');
  }

  /**
   * Clean up expired memories
   */
  cleanup() {
    const now = Date.now();
    const all = this.getAll();
    let removed = 0;
    for (const node of all) {
      if (node.metadata.expiresAt && node.metadata.expiresAt < now && node.accessCount < 3) {
        this.tree.remove(node.id);
        removed++;
      }
    }
    if (removed > 0) {
      this._save();
      console.log(`[STM] Cleaned up ${removed} expired memories`);
    }
    return removed;
  }

  /**
   * Get the full tree for visualization
   */
  getTree() {
    return this.tree.toJSON();
  }

  /**
   * Get stats
   */
  getStats() {
    return this.tree.getStats();
  }

  /**
   * Generate a summary of current short-term memory for AI context
   */
  getSummary() {
    const all = this.getAll();
    if (all.length === 0) return 'Short-term memory is empty.';
    const items = all.slice(0, 10).map((n) => {
      const wrongTag = n.couldBeWrong ? ' (could be wrong)' : '';
      return `- [${n.type}] ${toText(n.content).substring(0, 150)}${wrongTag}`;
    });
    return `Short-term memory (${items.length} items):\n${items.join('\n')}`;
  }
}

// Singleton
const shortTermMemory = new ShortTermMemory();

// Cleanup every 5 minutes
setInterval(() => shortTermMemory.cleanup(), 5 * 60 * 1000);

export default shortTermMemory;
