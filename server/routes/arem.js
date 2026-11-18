// SIS 1.0 — AREM Memory REST Routes
// Exposes the Anthropic-style 3-layer memory stack and dream consolidation state

import aremEngine from '../arem/arem-engine.js';
import aremStore from '../arem/arem-memory-store.js';
import { aremWorkingMemory } from '../arem/arem-working-memory.js';
import { aremAgentMemory } from '../arem/arem-agent-memory.js';
import { aremCatalog } from '../arem/arem-catalog.js';
import learningLibrary from '../services/learningLibrary.js';
import { runtimeAccess } from '../services/runtimeAccess.js';
import conversations from '../conversations.js';

export function registerAremRoutes(app) {
  const route = (method, path, handler) =>
    app[method](path, async (req, res) => {
      try {
        const result = await handler(req, res);
        if (!res.headersSent) {
          res.json({ success: true, ...result });
        }
      } catch (error) {
        if (!res.headersSent) {
          res.status(400).json({ success: false, error: error.message });
        }
      }
    });

  // System Status & Metrics
  route('get', '/api/arem/status', async () => aremEngine.getStatus());
  route('get', '/api/arem/catalog', async () => ({
    prompts: aremCatalog.list('prompt'),
    tools: aremCatalog.list('tool'),
    skills: aremCatalog.list('skill'),
  }));
  route('get', '/api/arem/nodes', async (req) => ({
    nodes: aremAgentMemory.search({
      chat: String(req.query.conversationId || ''),
      query: String(req.query.q || ''),
      limit: req.query.limit,
    }),
  }));
  route('get', '/api/arem/graph', async (req) => {
    const conversationId = String(req.query.conversationId || '').slice(0, 500);
    const result = aremAgentMemory.graph({ chat: conversationId });
    const nodes = result.nodes.map((node) => ({ ...node, kind: 'memory' }));
    const present = new Set(nodes.map(({ id }) => id));
    const edges = nodes.filter(({ parent }) => parent && present.has(parent))
      .map(({ id, parent }) => ({ source: parent, target: id, kind: 'parent' }));
    edges.push(...result.links.map((link) => ({ ...link, kind: 'association' })));
    const pages = aremStore.listWikiPages().slice(0, 100);
    const pageIds = new Set(pages.map(({ slug }) => slug));
    for (const page of pages) {
      nodes.push({ id: `wiki:${page.slug}`, kind: 'wiki', scope: 'permanent', title: page.title,
        note: (aremStore.readWikiPage(page.slug)?.content || '').slice(0, 6000),
        evidence: `AREM wiki / ${page.filename}`, updated: page.updatedAt });
      for (const link of page.links) {
        if (pageIds.has(link)) edges.push({ source: `wiki:${page.slug}`, target: `wiki:${link}`, kind: 'wiki-link' });
      }
    }
    const sleep = conversationId ? aremEngine.getSleepStatus(conversationId) : null;
    for (const note of sleep?.notes || []) {
      nodes.push({ id: `sleep:${note.id}`, kind: 'consolidated', scope: 'chat',
        title: note.title, note: note.note, evidence: note.sourceId });
    }
    const lastTurn = conversationId ? conversations.get(conversationId)?.messages?.findLast((message) => message.role === 'assistant' && message.arem?.system === 'AREM') : null;
    const trace = lastTurn?.arem;
    const activity = trace ? { at: lastTurn.timestamp, agentNodes: trace.agentNodes?.length || 0,
      linkedNodes: trace.linkedNodes?.length || 0, sleepNotes: trace.sleepNotes || 0, wikiPages: trace.wikiPages?.length || 0,
      retainedSources: trace.retainedSources?.length || 0, agentWrites: trace.agentWrites?.length || 0,
      workingCheckpoint: trace.workingCheckpoint || 'unknown', agentMemoryUnavailable: Boolean(trace.agentMemoryUnavailable) } : null;
    return { nodes, edges, activity, totalMemoryNodes: result.total, truncated: result.truncated,
      automaticSleep: aremEngine.isRunning,
      sleep: sleep ? { phase: sleep.phase, pending: sleep.pending, organized: sleep.organized, lastOutcome: sleep.lastOutcome } : null };
  });
  route('get', '/api/arem/rules', async (req) => ({
    rules: aremWorkingMemory.rules(String(req.query.conversationId || '')),
  }));
  route('post', '/api/arem/rules', async (req) => {
    const { scope, text, conversationId } = req.body || {};
    return { rule: aremWorkingMemory.saveRule({ scope, text, chat: conversationId }) };
  });
  route('delete', '/api/arem/rules/:id', async (req) => ({
    removed: aremWorkingMemory.removeRule(req.params.id),
  }));

  route('get', '/api/arem/sleep/:conversationId', async (req, res) => {
    const sleep = aremEngine.getSleepStatus(req.params.conversationId);
    if (!sleep) return res.status(404).json({ success: false, error: 'Conversation not found.' });
    return { sleep };
  });

  route('post', '/api/arem/dream', async (req) => {
    const { conversationId } = req.body || {};
    if (typeof conversationId !== 'string' || !conversationId)
      throw new Error('Choose a saved conversation to review.');
    return aremEngine.runDreamCycle({
      conversationId,
      manualTrigger: true,
      signal: runtimeAccess.currentContext().signal,
    });
  });

  // Top-Layer Index (Bounded Context)
  route('get', '/api/arem/index', async () => {
    const index = aremEngine.getTopLayerIndex();
    return {
      index,
      lineCount: index ? index.split('\n').length : 0,
      byteCount: Buffer.byteLength(index || '', 'utf8'),
      maxLines: 200,
      maxBytes: 25 * 1024,
    };
  });

  route('put', '/api/arem/index', async (req) => {
    const content = req.body?.content || '';
    const bounded = aremStore.updateIndex(content);
    return {
      index: bounded,
      lineCount: bounded.split('\n').length,
      byteCount: Buffer.byteLength(bounded, 'utf8'),
    };
  });

  // Middle-Layer Wiki Pages
  route('get', '/api/arem/wiki', async () => ({
    pages: aremStore.listWikiPages(),
  }));

  route('get', '/api/arem/wiki/:slug', async (req) => {
    const page = aremStore.readWikiPage(req.params.slug);
    if (!page) throw new Error(`Wiki page "${req.params.slug}" not found.`);
    return { page };
  });

  route('post', '/api/arem/wiki/:slug', async (req) => {
    const { content, title, metadata } = req.body || {};
    if (!content) throw new Error('Content is required for wiki page.');
    const result = aremStore.writeWikiPage(req.params.slug, content, { title, ...metadata });
    return { written: result };
  });

  route('delete', '/api/arem/wiki/:slug', async (req) => {
    const deleted = aremStore.deleteWikiPage(req.params.slug);
    return { deleted };
  });

  // Wiki Search
  route('get', '/api/arem/search', async (req) => {
    const query = String(req.query.q || req.query.query || '').slice(0, 4000);
    const limit = Math.max(1, Math.min(12, Number(req.query.limit) || 5));
    const results = aremStore.searchWiki(query, limit);
    const sources = query ? learningLibrary.search(query, { limit }) : null;
    return { query, results, sources };
  });

  // Bottom-Layer Raw Transcripts
  route('get', '/api/arem/transcripts', async (req) => {
    const limit = Number(req.query.limit || 30);
    return {
      transcripts: aremStore.getRecentTranscripts(limit),
      unconsolidatedCount: aremStore.getUnconsolidatedTranscripts(100).length,
    };
  });

  route('post', '/api/arem/transcripts', async (req) => {
    const entry = aremStore.appendTranscript(req.body || {});
    return { transcript: entry };
  });
}

export default registerAremRoutes;
