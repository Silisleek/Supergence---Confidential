import { runtimeAccess } from '../services/runtimeAccess.js';

export function registerRuntimeAccessRoutes(app, { waitForBrowserShutdown = async () => {} } = {}) {
  app.get('/api/access', (_req, res) => res.json({ success: true, ...runtimeAccess.snapshot() }));
  app.patch('/api/access', async (req, res) => {
    try {
      runtimeAccess.update(req.body);
      if (!runtimeAccess.settings.browser) await waitForBrowserShutdown();
      res.json({ success: true, ...runtimeAccess.snapshot() });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });
  app.post('/api/access/approvals/:id', (req, res) => {
    try {
      if (typeof req.body?.allow !== 'boolean') throw new Error('Explicit allow boolean required.');
      res.json({ success: true, ...runtimeAccess.resolve(req.params.id, req.body.allow) });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });
}
