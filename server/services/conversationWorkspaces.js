import { AsyncLocalStorage } from 'node:async_hooks';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const context = new AsyncLocalStorage();
const validId = (value) => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,180}$/.test(value);
const ignored = (value) =>
  value
    .split(/[\\/]/)
    .some((part) => ['node_modules', '.git', '.cache', '__pycache__'].includes(part));
export const currentWorkspace = () => context.getStore();

export function containedPath(root, relative = '') {
  const target = path.resolve(root, relative);
  const rel = path.relative(root, target);
  if (rel.startsWith('..') || path.isAbsolute(rel))
    throw new Error('Path is outside this chat workspace.');
  let cursor = path.resolve(root);
  for (const segment of ['', ...rel.split(path.sep).filter(Boolean)]) {
    if (segment) cursor = path.join(cursor, segment);
    try {
      if (fs.lstatSync(cursor).isSymbolicLink())
        throw new Error('Linked paths are not exposed by the chat workspace.');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return target;
}

export class ConversationWorkspaces {
  constructor({
    directory = process.env.SIS_DATA_DIR || fileURLToPath(new URL('../../data', import.meta.url)),
  } = {}) {
    this.directory = path.join(directory, 'chat-workspaces');
    this.records = new Map();
  }
  ensure(baseRoot, conversationId) {
    if (!validId(conversationId)) throw new Error('Invalid conversation ID.');
    const root = containedPath(baseRoot, `chats/${conversationId}`);
    const existing = this.records.get(conversationId);
    if (existing && existing.root === root) {
      fs.mkdirSync(root, { recursive: true });
      return existing;
    }
    fs.mkdirSync(root, { recursive: true });
    fs.mkdirSync(this.directory, { recursive: true });
    const journal = path.join(this.directory, `${conversationId}.jsonl`);
    let events = [];
    try {
      events = fs
        .readFileSync(journal, 'utf8')
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line))
        .slice(-1000);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const record = {
      conversationId,
      root,
      baseRoot,
      journal,
      events,
      sequence: events.at(-1)?.sequence || 0,
      listeners: new Set(),
      timers: new Map(),
      watching: false,
    };
    this.records.set(conversationId, record);
    this.watch(record);
    return record;
  }
  watch(record) {
    if (record.watcher) return;
    try {
      record.watcher = fs.watch(
        record.root,
        { recursive: true, persistent: false },
        (_kind, filename) => {
          const relative = String(filename || '').replaceAll('\\', '/');
          if (!relative || ignored(relative)) return;
          clearTimeout(record.timers.get(relative));
          const timer = setTimeout(() => {
            record.timers.delete(relative);
            try {
              const target = containedPath(record.root, relative);
              let stat;
              try {
                stat = fs.statSync(target);
              } catch (error) {
                if (error.code !== 'ENOENT') throw error;
              }
              this.record(record, {
                kind: 'file-change',
                path: relative,
                exists: Boolean(stat),
                type: !stat ? 'unknown' : stat.isDirectory() ? 'directory' : 'file',
                bytes: stat?.size ?? null,
              });
            } catch {
              /* Linked paths and vanished parents are not followed. */
            }
          }, 120);
          timer.unref();
          record.timers.set(relative, timer);
        },
      );
      record.watching = true;
      record.watcher.on('error', (error) => {
        record.watching = false;
        this.record(record, { kind: 'watch-error', message: error.message });
      });
    } catch (error) {
      record.watchError = error.message;
    }
  }
  record(record, event) {
    const entry = {
      ...event,
      conversationId: record.conversationId,
      requestId: currentWorkspace()?.requestId || record.requestId || null,
      sequence: ++record.sequence,
      at: new Date().toISOString(),
    };
    record.events.push(entry);
    record.events = record.events.slice(-1000);
    try {
      fs.appendFileSync(record.journal, JSON.stringify(entry) + '\n');
      if (fs.statSync(record.journal).size > 4 * 1024 * 1024) {
        record.events = record.events.slice(-100);
        fs.writeFileSync(
          record.journal,
          record.events.map((item) => JSON.stringify(item)).join('\n') + '\n',
        );
      }
    } catch (error) {
      record.journalError = error.message;
    }
    for (const listener of record.listeners) {
      try {
        listener(entry);
      } catch {}
    }
    return entry;
  }
  publish(event) {
    const scope = currentWorkspace();
    if (scope) return scope.service.record(scope.record, event);
  }
  async run({ baseRoot, conversationId, requestId }, work) {
    const record = this.ensure(baseRoot, conversationId);
    record.requestId = requestId;
    return context.run(
      { service: this, record, root: record.root, baseRoot, conversationId, requestId },
      work,
    );
  }
  snapshot(record) {
    return {
      conversationId: record.conversationId,
      root: record.root,
      relativeRoot: path.relative(record.baseRoot, record.root).replaceAll('\\', '/'),
      watching: record.watching,
      watchError: record.watchError,
      journalError: record.journalError,
      sequence: record.sequence,
      events: record.events,
      historyLimited: true,
    };
  }
  list(record, relative = '', offset = 0) {
    const directory = containedPath(record.root, relative);
    const entries = fs
      .readdirSync(directory, { withFileTypes: true })
      .sort(
        (a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name),
      );
    const files = entries.slice(offset, offset + 200).map((entry) => {
      const file = path.join(directory, entry.name),
        rel = path.relative(record.root, file).replaceAll('\\', '/');
      const stat = fs.lstatSync(file);
      return {
        name: entry.name,
        path: rel,
        type: stat.isSymbolicLink() ? 'link' : stat.isDirectory() ? 'directory' : 'file',
        bytes: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      };
    });
    return {
      path: relative,
      entries: files,
      total: entries.length,
      nextOffset: offset + files.length < entries.length ? offset + files.length : null,
    };
  }
  close() {
    for (const record of this.records.values()) {
      record.watcher?.close();
      for (const timer of record.timers.values()) clearTimeout(timer);
    }
    this.records.clear();
  }
}
export const conversationWorkspaces = new ConversationWorkspaces();
