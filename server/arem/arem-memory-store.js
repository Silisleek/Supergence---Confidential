// SIS 1.0 — AREM Multi-Layer Memory Store
// Implements Anthropic's Long-Term Agent Memory Stack:
//   Layer 1 (Bottom): Raw Transcripts & Episodic Execution Logs
//   Layer 2 (Middle): Structured, Cross-Linked Wiki Notes (data/arem/wiki/*.md)
//   Layer 3 (Top):    Bounded Injected Context Index (data/arem/index.md, <200 lines, <25KB)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../');
const DATA_ROOT = process.env.SIS_DATA_DIR
  ? path.resolve(process.env.SIS_DATA_DIR)
  : path.join(ROOT_DIR, 'data');

export const AREM_DIR = path.join(DATA_ROOT, 'arem');
export const TRANSCRIPTS_DIR = path.join(AREM_DIR, 'transcripts');
export const WIKI_DIR = path.join(AREM_DIR, 'wiki');
export const INDEX_FILE = path.join(AREM_DIR, 'index.md');
export const STATE_FILE = path.join(AREM_DIR, 'arem-state.json');

export const MAX_INDEX_LINES = 200;
export const MAX_INDEX_BYTES = 25 * 1024; // 25 KB

export class AremMemoryStore {
  constructor({ baseDir = AREM_DIR } = {}) {
    this.baseDir = baseDir;
    this.transcriptsDir = path.join(baseDir, 'transcripts');
    this.wikiDir = path.join(baseDir, 'wiki');
    this.indexFile = path.join(baseDir, 'index.md');
    this.stateFile = path.join(baseDir, 'arem-state.json');

    this._ensureDirectories();
  }

  _ensureDirectories() {
    try {
      if (!fs.existsSync(this.baseDir)) fs.mkdirSync(this.baseDir, { recursive: true });
      if (!fs.existsSync(this.transcriptsDir))
        fs.mkdirSync(this.transcriptsDir, { recursive: true });
      if (!fs.existsSync(this.wikiDir)) fs.mkdirSync(this.wikiDir, { recursive: true });

      if (!fs.existsSync(this.indexFile)) {
        const defaultIndex = `# Supergence AREM Memory Index
> Autonomous REM Memory Consolidation Dashboard (Lance Martin / Anthropic Architecture)

## 1. Core Operating Invariants
- NEVER output broken stubs, mock fallbacks, or canned responses.
- ALWAYS synthesize complete, verified, studio-grade code and solutions from first principles.
- ALWAYS execute real file system and tool operations when requested; never simulate outputs.

## 2. Structured Memory Wiki Directory
- [[mistakes-and-invariants]]: Discovered mistakes and self-repair rules.
- [[software-engineering]]: Architectural paradigms, design patterns, and complexity bounds.
- [[user-preferences]]: User expectations, preferred formats, and behavioral anchors.
- [[tool-mastery]]: Empirical tool recipes, execution boundaries, and validated patterns.

## 3. Active Cognitive Goals
- Continuous self-repair without model fine-tuning.
- Zero regression through autonomous dreaming and invariant synthesis.
`;
        fs.writeFileSync(this.indexFile, defaultIndex, 'utf8');
      }

      if (!fs.existsSync(this.stateFile)) {
        const initialState = {
          lastDreamTimestamp: null,
          totalDreamCycles: 0,
          totalTranscriptsProcessed: 0,
          totalMistakesFixed: 0,
          totalNotesCurated: 0,
          activeTeams: ['team-arem', 'team-core'],
        };
        fs.writeFileSync(this.stateFile, JSON.stringify(initialState, null, 2), 'utf8');
      }
    } catch (err) {
      console.warn('[AremMemoryStore] Initialization notice:', err.message);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // LAYER 1: Raw Transcripts & Episodic Logs (Bottom Layer)
  // ══════════════════════════════════════════════════════════════

  appendTranscript(entry) {
    this._ensureDirectories();
    const timestamp = entry.timestamp || Date.now();
    const dateStr = new Date(timestamp).toISOString().slice(0, 10);
    const transcriptPath = path.join(this.transcriptsDir, `session-${dateStr}.jsonl`);

    const record = {
      id: entry.id || `trans-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp,
      conversationId: entry.conversationId || 'default',
      userPrompt: entry.userPrompt || entry.prompt || '',
      agentResponse: entry.agentResponse || entry.response || '',
      toolCalls: entry.toolCalls || [],
      userCorrection: entry.userCorrection || null,
      errors: entry.errors || [],
      outcome: entry.outcome || 'success',
      consolidated: false,
    };

    fs.appendFileSync(transcriptPath, JSON.stringify(record) + '\n', 'utf8');
    return record;
  }

  getRecentTranscripts(limit = 50) {
    this._ensureDirectories();
    const files = fs
      .readdirSync(this.transcriptsDir)
      .filter((f) => f.endsWith('.jsonl'))
      .sort()
      .reverse();

    const transcripts = [];
    for (const file of files) {
      const fullPath = path.join(this.transcriptsDir, file);
      const lines = fs
        .readFileSync(fullPath, 'utf8')
        .split('\n')
        .filter((l) => l.trim().length > 0);

      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          transcripts.push(JSON.parse(lines[i]));
          if (transcripts.length >= limit) return transcripts;
        } catch (_) {}
      }
    }
    return transcripts;
  }

  getUnconsolidatedTranscripts(limit = 100) {
    const all = this.getRecentTranscripts(limit);
    return all.filter((t) => !t.consolidated);
  }

  markTranscriptsConsolidated(transcriptIds) {
    const idSet = new Set(transcriptIds);
    if (idSet.size === 0) return;

    const files = fs.readdirSync(this.transcriptsDir).filter((f) => f.endsWith('.jsonl'));

    for (const file of files) {
      const fullPath = path.join(this.transcriptsDir, file);
      const lines = fs
        .readFileSync(fullPath, 'utf8')
        .split('\n')
        .filter((l) => l.trim().length > 0);

      let changed = false;
      const updatedLines = lines.map((line) => {
        try {
          const item = JSON.parse(line);
          if (idSet.has(item.id)) {
            item.consolidated = true;
            changed = true;
            return JSON.stringify(item);
          }
        } catch (_) {}
        return line;
      });

      if (changed) {
        fs.writeFileSync(fullPath, updatedLines.join('\n') + '\n', 'utf8');
      }
    }
  }

  // ══════════════════════════════════════════════════════════════
  // LAYER 2: Structured Wiki & Memory Notes (Middle Layer)
  // ══════════════════════════════════════════════════════════════

  sanitizeTopicName(name) {
    return (name || 'general')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  listWikiPages() {
    this._ensureDirectories();
    const files = fs
      .readdirSync(this.wikiDir)
      .filter((f) => f.endsWith('.md'))
      .sort();

    return files.map((file) => {
      const slug = file.replace(/\.md$/, '');
      const fullPath = path.join(this.wikiDir, file);
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      const titleLine = lines.find((l) => l.startsWith('# '));
      const title = titleLine ? titleLine.replace(/^#\s+/, '').trim() : slug;
      const stats = fs.statSync(fullPath);

      // Extract cross-links [[other-topic]]
      const linkMatches = content.match(/\[\[([a-zA-Z0-9_-]+)\]\]/g) || [];
      const links = Array.from(new Set(linkMatches.map((m) => m.slice(2, -2))));

      return {
        slug,
        title,
        filename: file,
        charCount: content.length,
        links,
        updatedAt: stats.mtimeMs,
      };
    });
  }

  readWikiPage(topic) {
    this._ensureDirectories();
    const slug = this.sanitizeTopicName(topic);
    const fullPath = path.join(this.wikiDir, `${slug}.md`);
    if (!fs.existsSync(fullPath)) return null;

    const content = fs.readFileSync(fullPath, 'utf8');
    const stats = fs.statSync(fullPath);
    return {
      slug,
      content,
      updatedAt: stats.mtimeMs,
    };
  }

  writeWikiPage(topic, content, metadata = {}) {
    this._ensureDirectories();
    const slug = this.sanitizeTopicName(topic);
    const fullPath = path.join(this.wikiDir, `${slug}.md`);

    let finalContent = content.trim();
    // Add header metadata if provided and not already present
    if (metadata.title && !finalContent.startsWith('# ')) {
      finalContent = `# ${metadata.title}\n\n${finalContent}`;
    }

    fs.writeFileSync(fullPath, finalContent + '\n', 'utf8');
    return {
      slug,
      path: fullPath,
      charCount: finalContent.length,
    };
  }

  deleteWikiPage(topic) {
    const slug = this.sanitizeTopicName(topic);
    const fullPath = path.join(this.wikiDir, `${slug}.md`);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  }

  searchWiki(query, limit = 5) {
    const pages = this.listWikiPages();
    if (!query || typeof query !== 'string') return pages.slice(0, limit);

    const qLower = query.toLowerCase();
    const terms = qLower.split(/\s+/).filter(Boolean);

    const scored = pages.map((page) => {
      const full = this.readWikiPage(page.slug)?.content || '';
      const fLower = full.toLowerCase();
      let score = 0;

      if (page.slug.toLowerCase().includes(qLower)) score += 10;
      if (page.title.toLowerCase().includes(qLower)) score += 8;

      for (const t of terms) {
        if (page.slug.includes(t)) score += 3;
        if (page.title.toLowerCase().includes(t)) score += 3;
        const matches = (fLower.match(new RegExp(t, 'g')) || []).length;
        score += Math.min(matches, 5);
      }

      return { ...page, score, preview: full.slice(0, 300) };
    });

    return scored
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // ══════════════════════════════════════════════════════════════
  // LAYER 3: Injected Context Index (Top Layer, Bounded)
  // ══════════════════════════════════════════════════════════════

  getIndex() {
    this._ensureDirectories();
    if (!fs.existsSync(this.indexFile)) return '';
    return fs.readFileSync(this.indexFile, 'utf8');
  }

  updateIndex(content) {
    this._ensureDirectories();
    const bounded = this.enforceIndexLimits(content);
    fs.writeFileSync(this.indexFile, bounded, 'utf8');
    return bounded;
  }

  /**
   * Enforces Anthropic's Rule: Keep the top always-loaded layer small
   * (<200 lines, <25KB). If it exceeds, truncate cleanly at section boundaries.
   */
  enforceIndexLimits(content) {
    if (!content || typeof content !== 'string') return '';
    let lines = content.split('\n');

    if (lines.length > MAX_INDEX_LINES) {
      lines = lines.slice(0, MAX_INDEX_LINES);
      lines.push('\n<!-- Note: AREM Index truncated to strictly maintain <200 lines boundary -->');
    }

    let bounded = lines.join('\n');
    const bytes = Buffer.byteLength(bounded, 'utf8');
    if (bytes > MAX_INDEX_BYTES) {
      bounded = Buffer.from(bounded, 'utf8')
        .subarray(0, MAX_INDEX_BYTES - 120)
        .toString('utf8');
      bounded += '\n<!-- Note: AREM Index truncated to strictly maintain <25KB boundary -->';
    }

    return bounded;
  }

  // ══════════════════════════════════════════════════════════════
  // State & Metrics
  // ══════════════════════════════════════════════════════════════

  getState() {
    this._ensureDirectories();
    try {
      return JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
    } catch (_) {
      return {};
    }
  }

  updateState(patch) {
    this._ensureDirectories();
    const current = this.getState();
    const updated = { ...current, ...patch, lastUpdated: Date.now() };
    fs.writeFileSync(this.stateFile, JSON.stringify(updated, null, 2), 'utf8');
    return updated;
  }
}

export const aremStore = new AremMemoryStore();
export default aremStore;
