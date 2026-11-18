import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import store from './arem-memory-store.js';

export class AremCatalog {
  constructor(filename = path.join(store.baseDir, 'catalog.sqlite')) {
    this.filename = filename;
  }

  database() {
    if (!this.db) {
      this.db = new DatabaseSync(this.filename);
      this.db.exec(`PRAGMA busy_timeout = 3000;
        CREATE TABLE IF NOT EXISTS catalog (
          kind TEXT NOT NULL, name TEXT NOT NULL, digest TEXT NOT NULL,
          content TEXT NOT NULL, recorded INTEGER NOT NULL,
          PRIMARY KEY (kind, name, digest)
        );
        CREATE TABLE IF NOT EXISTS current_catalog (
          kind TEXT NOT NULL, name TEXT NOT NULL, digest TEXT NOT NULL,
          PRIMARY KEY (kind, name)
        );`);
    }
    return this.db;
  }

  sync(kind, entries) {
    const db = this.database();
    const add = db.prepare('INSERT OR IGNORE INTO catalog VALUES (?, ?, ?, ?, ?)');
    const current = db.prepare('INSERT INTO current_catalog VALUES (?, ?, ?)');
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('DELETE FROM current_catalog WHERE kind = ?').run(kind);
      for (const [name, content] of entries) {
        const digest = createHash('sha256').update(content).digest('hex');
        add.run(kind, name, digest, content, Date.now());
        current.run(kind, name, digest);
      }
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  list(kind) {
    return this.database()
      .prepare('SELECT kind, name, digest FROM current_catalog WHERE kind = ? ORDER BY name')
      .all(kind);
  }

  read(kind, name, digest) {
    const db = this.database();
    const version =
      digest ||
      db.prepare('SELECT digest FROM current_catalog WHERE kind = ? AND name = ?').get(kind, name)
        ?.digest;
    if (!version) return null;
    return (
      db
        .prepare('SELECT * FROM catalog WHERE kind = ? AND name = ? AND digest = ?')
        .get(kind, name, version) || null
    );
  }
}

export const aremCatalog = new AremCatalog();
let syncedPromptAndSkills = false;
let lastTools = '';

export function syncAremCatalog(tools, library) {
  if (!syncedPromptAndSkills) {
    aremCatalog.sync('prompt', [
      [
        'workspace-prompt',
        fs.readFileSync(new URL('../services/workspacePrompt.js', import.meta.url), 'utf8'),
      ],
    ]);
    aremCatalog.sync(
      'skill',
      library.skills().map(({ name }) => [name, library.readSkill({ name }).content]),
    );
    syncedPromptAndSkills = true;
  }
  const entries = tools.map((tool) => [
    tool.name,
    JSON.stringify({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      origin: tool.isDynamicSkill
        ? 'learned skill'
        : tool.isDynamicCustom || tool.isAdaForged
          ? 'created tool'
          : 'built-in',
      verified: tool.verified === true,
      quarantined: tool.quarantined === true,
    }),
  ]);
  const fingerprint = JSON.stringify(entries);
  if (lastTools !== fingerprint) {
    aremCatalog.sync('tool', entries);
    lastTools = fingerprint;
  }
}
