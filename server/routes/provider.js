import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { evolutionSettings } from '../services/evolutionSettings.js';
import { callAI, resolveClientAndModel, configureDefaultProvider } from '../api/provider.js';
import { checkProviderConnection } from '../services/providerConnection.js';

function current() {
  const saved = evolutionSettings.provider();
  const resolved = resolveClientAndModel();
  const configured = Boolean(saved || process.env.BASE_URL || process.env.OPENROUTER_BASE_URL);
  const digest = createHash('sha256')
    .update(
      JSON.stringify(
        saved || {
          baseURL: resolved.baseURL,
          model: resolved.model,
          key:
            process.env.API_KEY ||
            process.env.OPENROUTER_API_KEY ||
            process.env.LOCAL_ROUTER_API_KEY ||
            '',
        },
      ),
    )
    .digest('hex');
  return { configured, model: resolved.model, baseURL: resolved.baseURL, digest };
}

export function registerProviderRoutes(app) {
  const file = path.join(evolutionSettings.directory, 'provider-check.json');
  const status = () => {
    const config = current();
    let check = null;
    try {
      const stored = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (stored.digest === config.digest) check = stored.check;
    } catch {}
    return {
      configured: config.configured,
      model: config.model,
      baseURL: config.baseURL,
      ready: Boolean(check?.passed),
      check,
    };
  };
  app.get('/api/provider/status', (_req, res) => res.json(status()));
  app.post('/api/provider/configure', (req, res) => {
    try {
      const { baseURL, model, apiKey } = req.body || {};
      const url = new URL(baseURL);
      const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
      const saved = evolutionSettings.provider();
      if (
        !local &&
        !apiKey?.trim() &&
        saved?.baseURL?.replace(/\/+$/, '') !== baseURL.replace(/\/+$/, '')
      )
        return res
          .status(400)
          .json({ error: 'Enter a key when connecting a different remote endpoint.' });
      evolutionSettings.update({
        provider: {
          enabled: true,
          baseURL,
          model,
          ...(apiKey ? { apiKey } : local ? { apiKey: 'local' } : {}),
        },
      });
      res.json({ success: true, ...status() });
    } catch {
      res.status(400).json({
        error: 'Provide a valid endpoint, model ID and API key. Remote endpoints must use HTTPS.',
      });
    }
  });
  let checking = false;
  app.post('/api/provider/check', async (_req, res) => {
    if (checking)
      return res.status(409).json({ error: 'A model connection check is already running.' });
    checking = true;
    try {
      const config = current();
      if (!config.configured)
        return res.status(400).json({ error: 'Configure a model provider first.' });
      const check = await checkProviderConnection((args) =>
        callAI({ ...args, signal: AbortSignal.timeout(30000) }),
      );
      if (current().digest !== config.digest)
        return res
          .status(409)
          .json({ error: 'Provider settings changed during the check. Run it again.' });
      const temporary = `${file}.${randomUUID()}.tmp`;
      try {
        fs.writeFileSync(temporary, JSON.stringify({ digest: config.digest, check }), {
          flag: 'wx',
        });
        fs.renameSync(temporary, file);
      } finally {
        if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
      }
      res.json({ success: true, ...status() });
    } catch (error) {
      try {
        fs.unlinkSync(file);
      } catch {}
      res.status(400).json({
        error: error.message.startsWith('The model did not')
          ? error.message
          : 'Model check failed. Check endpoint, credentials, model support and network availability.',
      });
    } finally {
      checking = false;
    }
  });
}
