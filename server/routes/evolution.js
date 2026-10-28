import { randomBytes, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { evolutionEngine as engine } from '../services/evolutionEngine.js';
import { evolutionSettings } from '../services/evolutionSettings.js';
import { composioBridge } from '../services/composioBridge.js';
import { actionMonitor } from '../security/action-monitor.js';

export function registerEvolutionRoutes(app) {
  // Local UI capability blocks cross-origin mutation. It is not user authentication
  // against arbitrary programs already running with filesystem/terminal access.
  const token = randomBytes(32).toString('hex');
  const local = (req, res, next) => {
    const address = req.socket.remoteAddress;
    const origin = req.get('origin');
    let validHost = false,
      validOrigin = !origin;
    try {
      const host = new URL(`http://${req.get('host')}`);
      validHost = ['localhost', '127.0.0.1', '[::1]'].includes(host.hostname);
      if (origin) validOrigin = new URL(origin).host === host.host;
    } catch {}
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address) || !validHost || !validOrigin)
      return res
        .status(403)
        .json({ success: false, error: 'Evolution Studio requires a local same-origin session.' });
    next();
  };
  app.use('/api/evolution', local);
  app.get('/api/evolution', (_req, res) =>
    res.json({
      success: true,
      ...engine.snapshot(),
      connectors: composioBridge.snapshot(),
      uiToken: token,
    }),
  );
  app.get('/api/evolution/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    const listener = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);
    actionMonitor.listeners.add(listener);
    const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 25000);
    req.on('close', () => {
      clearInterval(heartbeat);
      actionMonitor.listeners.delete(listener);
    });
  });
  const route = (method, url, handler) =>
    app[method](`/api/evolution${url}`, async (req, res) => {
      try {
        if (method !== 'get') {
          const supplied = Buffer.from(req.get('x-evolution-token') || '');
          if (supplied.length !== token.length || !timingSafeEqual(supplied, Buffer.from(token)))
            return res
              .status(403)
              .json({ success: false, error: 'Open Evolution Studio to review this action.' });
        }
        res.json({ success: true, ...(await handler(req)) });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
    });
  route('get', '/proposals/:id', (req) => ({ proposal: engine.detail(req.params.id) }));
  app.get('/api/evolution/proposals/:id/proof', (req, res) => {
    try {
      const p = engine.detail(req.params.id);
      if (!p.evidence.some((item) => item.kind === 'browser' && item.passed))
        throw new Error('No passing browser evidence for this revision.');
      res.sendFile(
        path.join(engine.directory, 'staging', p.id, `revision-${p.revision}`, 'browser-proof.png'),
      );
    } catch (error) {
      res.status(404).json({ success: false, error: error.message });
    }
  });
  route('post', '/proposals', (req) => ({ proposal: engine.create(req.body) }));
  route('post', '/proposals/:id/verify', async (req) => ({
    proposal: await engine.verify(req.params.id, { executeTests: req.body.executeTests === true }),
  }));
  route('post', '/proposals/:id/apply', async (req) => ({
    proposal: await engine.apply(req.params.id),
  }));
  route('post', '/proposals/:id/rollback', (req) => ({ proposal: engine.rollback(req.params.id) }));
  route('post', '/proposals/:id/reject', (req) => ({ proposal: engine.reject(req.params.id) }));
  route('post', '/proposals/:id/archive', (req) => ({ proposal: engine.archive(req.params.id) }));
  route('patch', '/settings', (req) => {
    const settings = evolutionSettings.update(req.body);
    actionMonitor.record('evolution_settings', 'user-updated', { risk: 'medium', findings: [] });
    return { settings };
  });
  route('post', '/provider/test', async () => {
    const provider = evolutionSettings.provider();
    if (!provider) throw new Error('Save and enable a provider first.');
    const start = performance.now();
    const response = await fetch(`${provider.baseURL.replace(/\/$/, '')}/models`, {
      headers: { Authorization: `Bearer ${provider.apiKey}` },
      signal: AbortSignal.timeout(15000),
      redirect: 'error',
    });
    if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}.`);
    const data = await response.json();
    return {
      durationMs: performance.now() - start,
      modelListed: Array.isArray(data.data) ? data.data.some((m) => m.id === provider.model) : null,
      limitation:
        'Models endpoint reachable; generation and tool calling are not verified by this check.',
    };
  });
  route('post', '/research', (req) => ({ job: engine.queueResearch(req.body.topic) }));
  route('post', '/composio/connect', () => composioBridge.connect());
  route('get', '/composio/tools', async () => ({ catalog: await composioBridge.discover() }));
  route('post', '/composio/:id/decision', async (req) => {
    if (typeof req.body.allow !== 'boolean') throw new Error('Explicit allow boolean required.');
    return { request: await composioBridge.decide(req.params.id, req.body.allow) };
  });
}
