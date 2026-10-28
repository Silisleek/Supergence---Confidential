import library from '../services/learningLibrary.js';
import { reverseEngineeringService as rea } from '../services/reverseEngineeringService.js';

export async function analyzeAndRetain(args) {
  const evidence = await rea.analyze(args);
  const retained = retainAnalysisEvidence(evidence, args);
  return { ...retained, evidence };
}

export function retainAnalysisEvidence(evidence, args, store = library) {
  const { reused: _cacheHit, ...stableEvidence } = evidence;
  return store.ingest({
    title: `REA: ${evidence.source?.relativePath || args.path}`,
    content: JSON.stringify(stableEvidence, null, 2),
    source: `REA evidence ${evidence.evidenceId}`,
    sourceType: 'static-analysis',
  });
}

export function registerLearningRoutes(app) {
  const route = (method, path, handler) =>
    app[method](path, async (req, res) => {
      try {
        res.json({ success: true, ...(await handler(req)) });
      } catch (error) {
        res
          .status(error.code === 'BUSY' ? 409 : 400)
          .json({ success: false, error: error.message });
      }
    });
  route('get', '/api/learning/library', async () => ({
    sources: library.list(),
    skills: library.skills(),
    rea: await rea.status(),
    capabilities: library.capabilities(),
  }));
  route('post', '/api/learning/sources', (req) =>
    req.body?.path ? library.ingestFile(req.body) : library.ingest(req.body),
  );
  route('delete', '/api/learning/sources/:id', (req) => library.remove(req.params.id));
  route('post', '/api/learning/upload', (req) => library.ingestUpload(req.body));
  route('put', '/api/learning/sources/:id', (req) => library.update(req.params.id, req.body));
  route('get', '/api/learning/sources/:id', (req) => {
    const source = library.get(req.params.id);
    if (!source) throw new Error('Source not found.');
    return { source };
  });
  route('post', '/api/learning/search', (req) =>
    library.search(req.body?.query, { limit: req.body?.limit, sourceId: req.body?.sourceId }),
  );
  route('post', '/api/learning/sources/:id/check', (req) => ({
    check: library.checkRecall(req.params.id, req.body),
  }));
  route('get', '/api/learning/skills/:name', (req) => ({
    skill: library.readSkill({ name: req.params.name, reference: req.query.reference }),
  }));
  route('post', '/api/learning/analyze', (req) => analyzeAndRetain(req.body));
}
