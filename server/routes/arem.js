// SIS 1.0 — AREM Memory REST Routes
// Exposes the Anthropic-style 3-layer memory stack and dream consolidation state

import aremEngine from '../arem/arem-engine.js';
import aremStore from '../arem/arem-memory-store.js';

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

  // Trigger Dream Consolidation Cycle (Can be simultaneous/concurrent)
  route('post', '/api/arem/dream', async (req) => {
    const simultaneous = req.body?.simultaneous !== false;
    const manualTrigger = true;
    return aremEngine.runDreamCycle({ simultaneous, manualTrigger });
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
    const query = req.query.q || req.query.query || '';
    const results = aremStore.searchWiki(query, Number(req.query.limit || 5));
    return { query, results };
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
