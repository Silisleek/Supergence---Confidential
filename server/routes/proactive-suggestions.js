import path from 'node:path';
import { fileURLToPath } from 'node:url';
import workspace from '../workspace/manager.js';
import { callAI } from '../api/openrouter.js';
import brain from '../orchestrator/brain.js';
import { ProactiveSuggestions } from '../services/proactiveSuggestions.js';

export async function registerProactiveSuggestionRoutes(app, busy) {
  const directory =
    process.env.SIS_DATA_DIR || fileURLToPath(new URL('../../data', import.meta.url));
  const service = await new ProactiveSuggestions({
    directory: path.resolve(directory),
    workspace: workspace.root,
    complete: callAI,
    busy,
    broadcast: (event, data) => brain.broadcast?.(event, data),
  }).init();
  app.get('/api/proactive-suggestions', (_req, res) => res.json(service.snapshot()));
  app.patch('/api/proactive-suggestions/settings', async (req, res) => {
    try {
      res.json(await service.update(req.body));
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app.post('/api/proactive-suggestions/check', async (_req, res) => {
    try {
      res.json(await service.check());
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app.post('/api/proactive-suggestions/activity', (req, res) => {
    service.recordActivity(req.body);
    res.json({ recorded: service.state.settings.enabled && service.state.settings.activity });
  });
  app.post('/api/proactive-suggestions/read', async (req, res) => {
    try {
      res.json(await service.markRead(req.body.id));
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  return service;
}
