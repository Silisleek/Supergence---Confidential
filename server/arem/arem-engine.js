import { createHash, randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import path from 'node:path';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import conversations from '../conversations.js';
import { cosine, sparseVector } from '../memory/knowledge-index.js';
import { isLegacyFailureReply } from '../services/conversationContext.js';
import aremStore from './arem-memory-store.js';
import aremAgents, { AREM_TEAM_MEMBERS } from './arem-agents.js';

export const aremEvents = new EventEmitter();
export const DEFAULT_CADENCE_MS = 2 * 60 * 60 * 1000;
export const MAX_CADENCE_MS = 3 * 60 * 60 * 1000;

const IDLE_MS = 60_000;
const BATCH_SIZE = 8;
const MAX_NOTES = 256;
const SECRET =
  /-----BEGIN .*PRIVATE KEY-----|\bBearer\s+\S+|\b(?:api[_ -]?key|password|access[_ -]?token|client[_ -]?secret)\s*[:=]\s*\S+|\b(?:sk-[\w-]{16,}|gh[pousr]_[\w]{20,})/i;

function digest(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function episodes(conversation) {
  const users = new Map();
  const turns = [];
  const messages = conversation.messages || [];
  for (const [index, message] of messages.entries()) {
    if (typeof message?.content !== 'string' || !message.content.trim()) continue;
    const { requestId, status, role, content } = message;
    if (role === 'user' && requestId) users.set(requestId, message);
    if (role !== 'assistant' || (status && status !== 'completed') || isLegacyFailureReply(content))
      continue;
    const source = requestId ? users.get(requestId) : messages[index - 1];
    if (source?.role !== 'user' || typeof source.content !== 'string') continue;
    if (!requestId && source.requestId) continue;
    if (requestId && status !== 'completed') continue;
    users.delete(requestId);
    turns.push({
      id: requestId || `legacy:${index}`,
      user: source.content,
      assistant: content,
    });
  }
  return turns;
}

function replayFingerprint(conversation, turns) {
  return digest([
    conversation.createdAt,
    turns.map(({ id, user, assistant }) => [id, user, assistant]),
  ]);
}

function ground(proposals, batch, existing, turns) {
  const notes = [];
  const quotes = new Set(existing.map(({ note }) => note));
  const order = new Map(turns.map(({ id }, index) => [id, index]));
  for (const proposal of proposals.slice(0, BATCH_SIZE)) {
    const { sourceId, title, quote, supersedes } = proposal || {};
    const source = batch.find(({ id }) => id === sourceId);
    const previous = existing.find(({ id }) => id === supersedes);
    if (
      !source ||
      typeof title !== 'string' ||
      !title.trim() ||
      title.length > 100 ||
      typeof quote !== 'string' ||
      quote.length < 12 ||
      quote.length > 420 ||
      quote !== quote.trim() ||
      !source.user.includes(quote) ||
      SECRET.test(title + '\n' + quote) ||
      quotes.has(quote) ||
      (supersedes != null && (!previous || order.get(previous.sourceId) >= order.get(sourceId)))
    )
      continue;
    quotes.add(quote);
    notes.push({
      id: randomUUID(),
      title: title.trim(),
      note: quote,
      sourceId,
      supersedes: supersedes ?? null,
    });
  }
  return notes;
}

export class AremEngine {
  constructor({
    store = aremStore,
    agents = aremAgents,
    history = conversations,
    cadenceMs = DEFAULT_CADENCE_MS,
    now = Date.now,
  } = {}) {
    this.store = store;
    this.agents = agents;
    this.history = history;
    this.cadenceMs = cadenceMs;
    this.now = now;
    this.active = null;
    this.lastAttempt = null;
    this.foreground = 0;
    this.idleSince = now();
    this.timer = null;
    this.isRunning = false;
  }

  database() {
    if (!this.db) {
      this.db = new DatabaseSync(path.join(this.store.baseDir, 'sleep.sqlite'));
      this.db.exec(`PRAGMA busy_timeout = 3000;
        CREATE TABLE IF NOT EXISTS sleep (
          chat TEXT PRIMARY KEY, cursor INTEGER NOT NULL, fingerprint TEXT NOT NULL,
          notes TEXT NOT NULL, report TEXT NOT NULL, cycles INTEGER NOT NULL
        );`);
    }
    return this.db;
  }

  snapshot(chat) {
    const conversation = this.history.get(chat);
    if (!conversation) return null;
    const turns = episodes(conversation);
    const saved = this.database().prepare('SELECT * FROM sleep WHERE chat = ?').get(chat);
    const current =
      saved && replayFingerprint(conversation, turns.slice(0, saved.cursor)) === saved.fingerprint;
    const notes = current ? JSON.parse(saved.notes) : [];
    if (saved && !current) this.removeOrganizedNotes(chat);
    else if (current && saved.cursor && JSON.stringify(this.readOrganizedNotes(chat)?.notes) !== JSON.stringify(notes))
      this.organizeNotes(chat, notes);
    return {
      conversation,
      turns,
      saved,
      cursor: current ? saved.cursor : 0,
      notes,
    };
  }

  memoryFor(chat, query = null) {
    const notes = this.snapshot(chat)?.notes || [];
    if (query === null) return notes;
    const vector = sparseVector(query.slice(0, 2000));
    return notes
      .map((note) => ({ note, score: cosine(vector, sparseVector(note.note)) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ note: { sourceId, note } }) => ({ sourceId, note }));
  }

  organizedFile(chat) {
    return path.join(this.store.baseDir, 'sleep-notes', `${digest(chat)}.json`);
  }

  readOrganizedNotes(chat) {
    try {
      const folder = path.join(this.store.baseDir, 'sleep-notes');
      if (fs.lstatSync(folder).isSymbolicLink()) return null;
      const file = this.organizedFile(chat);
      if (fs.lstatSync(file).isSymbolicLink()) return null;
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      return data?.format === 'arem-sleep-notes-v1' && data.conversationId === chat ? data : null;
    } catch {
      return null;
    }
  }

  organizeNotes(chat, notes) {
    const folder = path.join(this.store.baseDir, 'sleep-notes');
    let temporary;
    try {
      fs.mkdirSync(folder, { recursive: true });
      if (fs.lstatSync(folder).isSymbolicLink()) throw new Error('Sleep notes folder is a link');
      const file = this.organizedFile(chat);
      if (fs.existsSync(file) && !this.readOrganizedNotes(chat))
        throw new Error('Existing sleep notes file is not managed by AREM');
      temporary = path.join(folder, `.${randomUUID()}.tmp`);
      fs.writeFileSync(temporary, JSON.stringify({ format: 'arem-sleep-notes-v1', conversationId: chat, notes }, null, 2), { flag: 'wx', mode: 0o600 });
      fs.renameSync(temporary, file);
      return 'updated';
    } catch {
      if (temporary) {
        try { fs.unlinkSync(temporary); } catch { /* No temporary file to remove. */ }
      }
      return 'unavailable';
    }
  }

  removeOrganizedNotes(chat) {
    if (!this.readOrganizedNotes(chat)) return;
    try { fs.unlinkSync(this.organizedFile(chat)); } catch { /* Leave unremovable files unchanged. */ }
  }

  forgetChat(chat) {
    if (this.active?.chat === chat) this.active.controller.abort();
    this.removeOrganizedNotes(chat);
    if (this.lastAttempt?.chat === chat) this.lastAttempt = null;
    this.database().prepare('DELETE FROM sleep WHERE chat = ?').run(chat);
  }

  beginForeground() {
    this.foreground++;
    this.active?.controller.abort();
    return () => {
      this.foreground--;
      this.idleSince = this.now();
      if (!this.foreground && this.isRunning) this.schedule(IDLE_MS);
    };
  }

  startScheduler(cadenceMs = this.cadenceMs) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.cadenceMs = cadenceMs;
    this.schedule(IDLE_MS);
  }

  schedule(delay) {
    if (!this.isRunning) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(async () => {
      let next = this.cadenceMs;
      try {
        const result = await this.runDreamCycle();
        if (['busy', 'interrupted', 'already_running', 'success'].includes(result.status)) next = IDLE_MS;
        else if (result.status === 'error') next = 5 * IDLE_MS;
      } catch (error) {
        console.warn('[AREM] Could not start scheduled sleep:', error.message);
      } finally {
        this.schedule(next);
      }
    }, delay);
    this.timer.unref();
  }

  stopScheduler() {
    this.isRunning = false;
    clearTimeout(this.timer);
    this.timer = null;
    this.active?.controller.abort();
  }

  async runDreamCycle({ conversationId, manualTrigger = false, signal: callerSignal } = {}) {
    if (this.active) return { status: 'already_running' };
    if (this.foreground || (!manualTrigger && this.now() - this.idleSince < IDLE_MS))
      return { status: 'busy' };

    let chat = conversationId;
    let replay = chat ? this.snapshot(chat) : null;
    if (!chat) {
      const last = this.database().prepare('SELECT chat, report FROM sleep').all();
      const reviewed = new Map(last.map((row) => [row.chat, JSON.parse(row.report).finishedAt]));
      if (this.lastAttempt) reviewed.set(this.lastAttempt.chat, this.lastAttempt.at);
      const candidates = [...this.history.list()].sort(
        (a, b) => (reviewed.get(a.id) || 0) - (reviewed.get(b.id) || 0),
      );
      for (const candidate of candidates) {
        replay = this.snapshot(candidate.id);
        if (replay && replay.turns.length > replay.cursor) {
          chat = candidate.id;
          break;
        }
      }
    }
    if (!chat || !replay) return { status: conversationId ? 'missing' : 'empty' };

    const batch = replay.turns.slice(replay.cursor, replay.cursor + BATCH_SIZE);
    if (!batch.length) return { status: 'empty' };
    const evidence = batch
      .filter(({ user, assistant }) => !SECRET.test(user) && !SECRET.test(assistant))
      .map(({ id, user, assistant }) => ({
        id,
        user: user.slice(0, 2400),
        assistant: assistant.slice(0, 1600),
      }));
    const controller = new AbortController();
    const signal = callerSignal
      ? AbortSignal.any([controller.signal, callerSignal])
      : controller.signal;
    this.active = { chat, controller, phase: 'consolidating' };
    try {
      this.setPhase('consolidating');
      signal.throwIfAborted();
      let proposals = [];
      if (evidence.length) {
        proposals = ground(
          await this.agents.consolidateReplay({ evidence, retained: replay.notes, signal }),
          evidence,
          replay.notes,
          replay.turns,
        );
      }
      signal.throwIfAborted();
      const notes = [...replay.notes];
      let retained = 0;
      if (proposals.length) {
        this.setPhase('rehearsing');
        signal.throwIfAborted();
        const approved = await this.agents.reviewReplay({
          evidence,
          retained: replay.notes,
          proposals,
          signal,
        });
        for (const candidate of proposals) {
          if (!approved.has(candidate.id)) continue;
          const previous = notes.findIndex(({ id }) => id === candidate.supersedes);
          const { supersedes, ...note } = candidate;
          if (supersedes && previous < 0) continue;
          if (previous >= 0) notes.splice(previous, 1, note);
          else if (notes.length < MAX_NOTES) notes.push(note);
          else continue;
          retained++;
        }
      }
      signal.throwIfAborted();
      const fresh = this.history.get(chat);
      const cursor = replay.cursor + batch.length;
      const fingerprint = replayFingerprint(replay.conversation, replay.turns.slice(0, cursor));
      if (!fresh || replayFingerprint(fresh, episodes(fresh).slice(0, cursor)) !== fingerprint)
        return this.finish(chat, 'interrupted');
      const report = {
        reviewed: evidence.length,
        skipped: batch.length - evidence.length,
        retained,
        finishedAt: this.now(),
      };
      const expected = replay.saved?.cycles ?? 0;
      const saved = this.database()
        .prepare(
          `INSERT INTO sleep VALUES (?, ?, ?, ?, ?, 1)
        ON CONFLICT(chat) DO UPDATE SET cursor=excluded.cursor, fingerprint=excluded.fingerprint,
        notes=excluded.notes, report=excluded.report, cycles=sleep.cycles+1 WHERE sleep.cycles=?`,
        )
        .run(chat, cursor, fingerprint, JSON.stringify(notes), JSON.stringify(report), expected);
      if (!saved.changes) return this.finish(chat, 'interrupted');
      const organized = this.organizeNotes(chat, notes);
      return this.finish(chat, 'success', report, organized);
    } catch {
      return this.finish(chat, signal.aborted ? 'interrupted' : 'error');
    } finally {
      this.active = null;
    }
  }

  finish(chat, status, report, organized) {
    this.lastAttempt = { chat, status, at: this.now(), ...(organized && { organized }) };
    return { status, ...(report && { report }), ...(organized && { organized }) };
  }

  setPhase(phase) {
    this.active.phase = phase;
    const pulse = { stage: phase, timestamp: this.now() };
    aremEvents.emit('pulse', pulse);
    globalThis.__supergence_brain?.broadcast?.('arem:pulse', pulse);
  }

  getTopLayerIndex() {
    return this.store.getIndex();
  }

  searchMemory(query, limit = 5) {
    return this.store.searchWiki(query, limit);
  }

  getSleepStatus(chat) {
    const replay = this.snapshot(chat);
    if (!replay) return null;
    return {
      phase: this.active?.chat === chat ? this.active.phase : 'awake',
      pending: replay.turns.length - replay.cursor,
      report: replay.saved && replay.cursor ? JSON.parse(replay.saved.report) : null,
      lastOutcome: this.lastAttempt?.chat === chat ? this.lastAttempt.status : null,
      organized: replay.saved && replay.cursor
        ? (JSON.stringify(this.readOrganizedNotes(chat)?.notes) === JSON.stringify(replay.notes) ? 'up-to-date' : 'unavailable')
        : 'not-created',
      notes: replay.notes,
    };
  }

  getStatus() {
    const stats = this.database()
      .prepare('SELECT COALESCE(SUM(cycles), 0) AS totalDreamCycles FROM sleep')
      .get();
    return {
      name: 'Supergence AREM Memory System',
      isRunning: this.isRunning,
      isDreaming: Boolean(this.active),
      automaticSleep: this.isRunning,
      lastOutcome: this.lastAttempt?.status || null,
      dreamProgress: this.active?.phase || 'awake',
      cadenceHours: this.cadenceMs / (60 * 60 * 1000),
      stats,
      team: AREM_TEAM_MEMBERS,
      wikiPagesCount: this.store.listWikiPages().length,
      indexLines: this.store.getIndex().split('\n').length,
    };
  }
}

export function automaticSleepEnabled(value = process.env.ENABLE_AREM_SLEEP) {
  return String(value ?? '').trim().toLowerCase() !== 'false';
}

export const aremEngine = new AremEngine();
export default aremEngine;
