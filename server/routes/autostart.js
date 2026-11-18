import autostartManager from '../services/autostartManager.js';

export function registerAutostartRoutes(app) {
  app.get('/api/autostart/status', (_req, res) => {
    try {
      const status = autostartManager.getStatus();
      res.json(status);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/autostart/enable', (_req, res) => {
    try {
      const result = autostartManager.enable();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/autostart/disable', (_req, res) => {
    try {
      const result = autostartManager.disable();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/autostart/toggle', (_req, res) => {
    try {
      const result = autostartManager.toggle();
      const status = autostartManager.getStatus();
      res.json({ ...result, status });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

export default registerAutostartRoutes;
