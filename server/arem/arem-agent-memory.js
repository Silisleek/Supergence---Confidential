import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { sparseVector, cosine } from '../memory/knowledge-index.js';
import store from './arem-memory-store.js';

const MAX_TEXT = 6000;
const validScopes = new Set(['working', 'chat', 'permanent']);

export class AremAgentMemory {
  constructor(filename = path.join(store.baseDir, 'agent-memory.sqlite')) {
    this.filename = filename;
  }

  database() {
    if (!this.db) {
      this.db = new DatabaseSync(this.filename);
      this.db.exec(`PRAGMA busy_timeout = 3000;
        CREATE TABLE IF NOT EXISTS nodes (
          id TEXT PRIMARY KEY, scope TEXT NOT NULL, chat TEXT NOT NULL,
          parent TEXT, title TEXT NOT NULL, note TEXT NOT NULL,
          evidence TEXT NOT NULL, vector TEXT NOT NULL, updated INTEGER NOT NULL,
          archived INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS nodes_scope ON nodes(chat, scope, archived, updated);
        CREATE TABLE IF NOT EXISTS node_links (
          source TEXT NOT NULL, target TEXT NOT NULL, relation TEXT NOT NULL,
          chat TEXT NOT NULL, evidence TEXT NOT NULL, updated INTEGER NOT NULL,
          PRIMARY KEY (source, target, relation)
        );
        CREATE INDEX IF NOT EXISTS node_links_target ON node_links(target, chat);
        CREATE INDEX IF NOT EXISTS node_links_scope ON node_links(chat, updated);`);
    }
    return this.db;
  }

  read(id, chat) {
    const row = this.lookup(id, chat);
    if (!row) return null;
    const { vector: _vector, chat: _chat, ...node } = row;
    return { ...node, origin: 'Supergence', verified: false };
  }

  lookup(id, chat) {
    return (
      this.database()
        .prepare(
          "SELECT * FROM nodes WHERE id = ? AND archived = 0 AND (scope = 'permanent' OR chat = ?)",
        )
        .get(id, chat || '') || null
    );
  }

  save({ id, scope = 'chat', parent, title, note, evidence, chat }) {
    const db = this.database();
    id = typeof id === 'string' && /^(?:\s*|new|null|undefined)$/i.test(id.trim()) ? undefined : id;
    db.exec('BEGIN IMMEDIATE');
    try {
      const old = id ? this.lookup(id, chat) : null;
      if (id && !old) throw new Error('AREM node not found in this scope. To create a new note, omit id; to edit, use an id returned by search_arem_memory.');
      const targetScope = old?.scope || scope;
      if (!validScopes.has(targetScope) || (targetScope !== 'permanent' && !chat))
        throw new Error('Choose a valid AREM memory scope.');
      const owner = targetScope === 'permanent' ? '' : chat;
      const name = String(title ?? old?.title ?? '').trim();
      const text = String(note ?? old?.note ?? '').trim();
      const reference = String(evidence ?? old?.evidence ?? '').trim();
      if (
        !name ||
        name.length > 160 ||
        !text ||
        text.length > MAX_TEXT ||
        !reference ||
        reference.length > 400
      )
        throw new Error(
          'Provide a title, a note up to 6,000 characters, and a source or turn reference.',
        );
      if (
        /-----BEGIN .*PRIVATE KEY-----|\bBearer\s+[A-Za-z0-9._~+/-]{16,}|\b(?:api[_ -]?key|password|access[_ -]?token|client[_ -]?secret)\s*[:=]\s*\S+/i.test(
          `${name}\n${text}\n${reference}`,
        )
      )
        throw new Error('Remove credentials before saving an AREM note.');
      const parentId = parent === undefined ? old?.parent || null : parent || null;
      let ancestor = parentId;
      while (ancestor) {
        const node = this.lookup(ancestor, chat);
        if (!node || node.scope !== targetScope || node.chat !== owner || ancestor === id)
          throw new Error('Choose a parent in the same memory scope without creating a cycle.');
        ancestor = node.parent;
      }
      const nodeId = id || randomUUID();
      db.prepare(
        `INSERT INTO nodes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        ON CONFLICT(id) DO UPDATE SET parent=excluded.parent, title=excluded.title,
        note=excluded.note, evidence=excluded.evidence, vector=excluded.vector, updated=excluded.updated`,
      ).run(
        nodeId,
        targetScope,
        owner,
        parentId,
        name,
        text,
        reference,
        JSON.stringify(sparseVector(`${name} ${text}`)),
        Date.now(),
      );
      db.exec('COMMIT');
      return this.read(nodeId, chat);
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  search({ chat, query = '', limit = 8 } = {}) {
    const vector = sparseVector(String(query).slice(0, 2000));
    const rows = this.database()
      .prepare(
        "SELECT * FROM nodes WHERE archived = 0 AND (scope = 'permanent' OR chat = ?) ORDER BY updated DESC",
      )
      .all(chat || '');
    return rows
      .map(({ vector: stored, chat: _chat, ...node }) => ({
        ...node,
        origin: 'Supergence',
        verified: false,
        score: query ? cosine(vector, JSON.parse(stored)) : 1,
      }))
      .filter((node) => node.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, Math.min(20, Number(limit) || 8)));
  }

  link({ source, target, relation = 'related', evidence, chat = '' }) {
    const db = this.database();
    db.exec('BEGIN IMMEDIATE');
    try {
      const from = this.lookup(source, chat);
      const to = this.lookup(target, chat);
      if (!from || !to) throw new Error('Both AREM nodes must be available in this chat.');
      if (from.id === to.id) throw new Error('A memory cannot link to itself.');
      if (from.id.startsWith('checkpoint:') || to.id.startsWith('checkpoint:'))
        throw new Error('Working checkpoints cannot be linked as memories.');
      if (!['related', 'supports', 'contradicts', 'depends_on'].includes(relation))
        throw new Error('Choose related, supports, contradicts, or depends_on.');
      const reference = String(evidence || '').trim();
      if (!reference || reference.length > 400 || /-----BEGIN .*PRIVATE KEY-----|\bBearer\s+\S+|\b(?:api[_ -]?key|password|access[_ -]?token|client[_ -]?secret)\s*[:=]\s*\S+/i.test(reference))
        throw new Error('Provide a source reference without credentials, up to 400 characters.');
      const owner = from.scope === 'permanent' && to.scope === 'permanent' ? '' : chat;
      if (!owner && (from.scope !== 'permanent' || to.scope !== 'permanent'))
        throw new Error('Chat-scoped links require an active chat.');
      if (relation === 'related' && source > target) [source, target] = [target, source];
      const updated = Date.now();
      db.prepare(`INSERT INTO node_links (source, target, relation, chat, evidence, updated)
        VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(source, target, relation)
        DO UPDATE SET evidence=excluded.evidence, updated=excluded.updated`)
        .run(source, target, relation, owner, reference, updated);
      db.exec('COMMIT');
      return { source, target, relation, evidence: reference, updated };
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  unlink({ source, target, relation = 'related', chat = '' }) {
    const db = this.database();
    db.exec('BEGIN IMMEDIATE');
    try {
      if (!this.lookup(source, chat) || !this.lookup(target, chat))
        throw new Error('Both AREM nodes must be available in this chat.');
      if (relation === 'related' && source > target) [source, target] = [target, source];
      const removed = db.prepare("DELETE FROM node_links WHERE source = ? AND target = ? AND relation = ? AND (chat = '' OR chat = ?)")
        .run(source, target, relation, chat).changes;
      db.exec('COMMIT');
      return { removed: Boolean(removed) };
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  connections({ id, chat = '', limit = 30 } = {}) {
    if (!this.lookup(id, chat)) throw new Error('AREM node is not available in this chat.');
    return this.database().prepare(`SELECT l.source, l.target, l.relation, l.evidence, l.updated
      FROM node_links l JOIN nodes a ON a.id = l.source JOIN nodes b ON b.id = l.target
      WHERE (l.source = ? OR l.target = ?) AND (l.chat = '' OR l.chat = ?)
        AND a.archived = 0 AND b.archived = 0
        AND (a.scope = 'permanent' OR a.chat = ?) AND (b.scope = 'permanent' OR b.chat = ?)
      ORDER BY l.updated DESC LIMIT ?`).all(id, id, chat, chat, chat, Math.max(1, Math.min(50, Number(limit) || 30)));
  }

  linkedContext({ nodes = [], chat = '', limit = 4 } = {}) {
    const seen = new Set(nodes.map(({ id }) => id));
    const related = [];
    const maximum = Math.max(0, Math.min(8, Number(limit) || 0));
    if (!maximum) return related;
    for (const node of nodes) {
      if (!this.lookup(node.id, chat)) continue;
      for (const link of this.connections({ id: node.id, chat, limit: 20 })) {
        const id = link.source === node.id ? link.target : link.source;
        if (seen.has(id)) continue;
        const target = this.read(id, chat);
        if (!target) continue;
        seen.add(id);
        related.push({ node: target, link });
        if (related.length >= maximum) return related;
      }
    }
    return related;
  }

  graph({ chat = '', limit = 200 } = {}) {
    const maximum = Math.max(1, Math.min(250, Number(limit) || 200));
    const db = this.database();
    const where = "archived = 0 AND id NOT LIKE 'checkpoint:%' AND (scope = 'permanent' OR chat = ?)";
    const total = db.prepare(`SELECT COUNT(*) AS count FROM nodes WHERE ${where}`).get(chat).count;
    const nodes = db.prepare(
      `SELECT id, scope, parent, title, note, evidence, updated FROM nodes WHERE ${where} ORDER BY updated DESC LIMIT ?`,
    ).all(chat, maximum);
    const nodeIds = new Set(nodes.map(({ id }) => id));
    const links = db.prepare(`SELECT l.source, l.target, l.relation, l.evidence, l.updated
      FROM node_links l JOIN nodes a ON a.id = l.source JOIN nodes b ON b.id = l.target
      WHERE (l.chat = '' OR l.chat = ?) AND a.archived = 0 AND b.archived = 0
        AND (a.scope = 'permanent' OR a.chat = ?) AND (b.scope = 'permanent' OR b.chat = ?)
      ORDER BY l.updated DESC LIMIT 1000`).all(chat, chat, chat)
      .filter(({ source, target }) => nodeIds.has(source) && nodeIds.has(target));
    return { nodes, links, total, truncated: total > nodes.length };
  }

  checkpoint({ chat, requestId, sourceCount, toolCount }) {
    if (!chat || !requestId) return;
    const db = this.database();
    const id = `checkpoint:${JSON.stringify([chat, requestId])}`;
    const title = 'Completed working context';
    const note = `Turn finished with ${toolCount} recorded tool actions and ${sourceCount} retrieved sources.`;
    db.prepare('INSERT OR IGNORE INTO nodes VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, 0)').run(
      id,
      'working',
      chat,
      title,
      note,
      requestId,
      JSON.stringify(sparseVector(note)),
      Date.now(),
    );
  }

  archive(id, chat) {
    const db = this.database();
    db.exec('BEGIN IMMEDIATE');
    try {
      const node = this.lookup(id, chat);
      if (!node) throw new Error('AREM node not found in this scope.');
      db.prepare('UPDATE nodes SET parent = ? WHERE parent = ?').run(node.parent, id);
      db.prepare('DELETE FROM node_links WHERE source = ? OR target = ?').run(id, id);
      db.prepare('UPDATE nodes SET archived = 1 WHERE id = ?').run(id);
      db.exec('COMMIT');
      return { id, archived: true };
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
}

export const aremAgentMemory = new AremAgentMemory();
