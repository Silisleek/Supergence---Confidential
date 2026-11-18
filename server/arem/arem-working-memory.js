import path from 'node:path';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import store from './arem-memory-store.js';

const scopes = new Set(['short-term', 'chat', 'long-term']);
const rulesBudget = 12000;
const scopedRequest =
  /^(?:please\s+)?(?:(short[- ]term|per[- ]chat|chat|long[- ]term) rule\s*:|(?:remember|for)\s+(this (?:turn|chat)|all (?:chats|conversations))\s*:)\s*([\s\S]+)$/i;

export function isTurnRule(text) {
  const match = scopedRequest.exec(String(text || '').trim());
  return Boolean(match && /^(?:short[- ]term|this turn)$/i.test(match[1] || match[2]));
}

export class AremWorkingMemory {
  constructor(filename = path.join(store.baseDir, 'working-memory.sqlite')) {
    this.filename = filename;
    this.shortTerm = new Map();
  }

  database() {
    if (!this.db) {
      this.db = new DatabaseSync(this.filename);
      this.db.exec(`PRAGMA busy_timeout = 3000;
        CREATE TABLE IF NOT EXISTS rules (
          id TEXT PRIMARY KEY, scope TEXT NOT NULL, chat TEXT NOT NULL,
          text TEXT NOT NULL, saved INTEGER NOT NULL
        );`);
    }
    return this.db;
  }

  capture(query, chat, turn) {
    const match = scopedRequest.exec(query.trim());
    if (!match) return null;
    const requested = (match[1] || match[2]).toLowerCase().replace(' ', '-');
    const scope = ['short-term', 'this-turn'].includes(requested)
      ? 'short-term'
      : ['chat', 'per-chat', 'this-chat'].includes(requested)
        ? 'chat'
        : 'long-term';
    return this.saveRule({ scope, text: match[3], chat, turn });
  }

  saveRule({ scope, text, chat, turn }) {
    if (!scopes.has(scope) || typeof text !== 'string' || !text.trim() || text.length > 2000)
      throw new Error('Provide a rule of up to 2,000 characters and a valid AREM scope.');
    if (scope !== 'long-term' && !chat) throw new Error('Chat ID required.');
    if (scope === 'short-term' && !turn) throw new Error('Turn ID required for a short-term rule.');
    text = text.trim();
    const owner = scope === 'long-term' ? '' : chat;
    const id = createHash('sha256')
      .update(JSON.stringify([scope, owner, text]))
      .digest('hex')
      .slice(0, 24);
    const rule = { id, scope, text, saved: Date.now() };
    if (scope === 'short-term') {
      this.shortTerm.set(JSON.stringify([chat, turn]), rule);
      return rule;
    }
    const db = this.database();
    db.exec('BEGIN IMMEDIATE');
    try {
      const { size } = db
        .prepare(
          'SELECT COALESCE(SUM(length(text)), 0) AS size FROM rules WHERE scope = ? AND chat = ? AND id != ?',
        )
        .get(scope, owner, id);
      if (size + text.length > rulesBudget)
        throw new Error('This rule scope is full. Remove an old rule before adding another.');
      db.prepare('INSERT OR REPLACE INTO rules VALUES (?, ?, ?, ?, ?)').run(
        id,
        scope,
        owner,
        text,
        rule.saved,
      );
      db.exec('COMMIT');
      return rule;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  rules(chat, turn) {
    const rules = this.database()
      .prepare(
        "SELECT id, scope, text, saved FROM rules WHERE scope = 'long-term' OR (scope = 'chat' AND chat = ?) ORDER BY saved, rowid",
      )
      .all(chat || '');
    const temporary = this.shortTerm.get(JSON.stringify([chat, turn]));
    return temporary ? [...rules, temporary] : rules;
  }

  clearTurn(chat, turn) {
    this.shortTerm.delete(JSON.stringify([chat, turn]));
  }

  removeRule(id) {
    return this.database().prepare('DELETE FROM rules WHERE id = ?').run(id).changes > 0;
  }
}

export const aremWorkingMemory = new AremWorkingMemory();
