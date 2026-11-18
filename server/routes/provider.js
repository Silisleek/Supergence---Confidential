import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import OpenAI from 'openai';
import { evolutionSettings } from '../services/evolutionSettings.js';
import {
  callAI,
  getBaseURL,
  getDefaultModel,
  configureDefaultProvider,
  resolveProviderKey,
  getStartupProviderKey,
  providerEndpoint,
  startupProvider,
  validateProviderEndpoint,
} from '../api/provider.js';
import { checkProviderConnection } from '../services/providerConnection.js';

function current() {
  const saved = evolutionSettings.provider();
  const baseURL = saved?.baseURL || getBaseURL();
  const model = saved?.model || getDefaultModel();
  const configured = Boolean(saved || process.env.BASE_URL || process.env.OPENROUTER_BASE_URL);
  const digest = createHash('sha256')
    .update(
      JSON.stringify(
        saved || {
          baseURL,
          model,
          key:
            process.env.API_KEY ||
            process.env.OPENROUTER_API_KEY ||
            process.env.LOCAL_ROUTER_API_KEY ||
            '',
        },
      ),
    )
    .digest('hex');
  return { configured, model, baseURL, digest, profileId: saved?.profileId, saved: Boolean(saved) };
}

const configuredProfile = {
  id: 'configured-provider',
  name: 'Configured provider',
  ...startupProvider,
};
function sameEndpoint(left, right) {
  try {
    return providerEndpoint(left) === providerEndpoint(right);
  } catch {
    return false;
  }
}
const sameProvider = (profile, config) =>
  sameEndpoint(profile.baseURL, config.baseURL) && profile.model === config.model;

export function registerProviderRoutes(app) {
  const file = path.join(evolutionSettings.directory, 'provider-check.json');
  const profilesFile = path.join(evolutionSettings.directory, 'provider-profiles.json');

  const loadProfiles = () => {
    try {
      if (fs.existsSync(profilesFile)) {
        const stored = JSON.parse(fs.readFileSync(profilesFile, 'utf8'));
        if (Array.isArray(stored))
          return [
            configuredProfile,
            ...stored.filter((p) => p?.id && p.id !== configuredProfile.id),
          ];
      }
    } catch {}
    return [
      configuredProfile,
      {
        id: 'openrouter',
        name: 'OpenRouter (Recommended)',
        baseURL: 'https://openrouter.ai/api/v1',
        model: 'openai/gpt-4o-mini',
        hasKey: Boolean(process.env.API_KEY || process.env.OPENROUTER_API_KEY),
      },
      {
        id: 'openai',
        name: 'OpenAI Direct',
        baseURL: 'https://api.openai.com/v1',
        model: 'gpt-4o',
        hasKey: false,
      },
      {
        id: 'ollama',
        name: 'Ollama (Local Offline)',
        baseURL: 'http://127.0.0.1:11434/v1',
        model: 'llama3.2',
        hasKey: true,
      },
    ];
  };

  const saveProfiles = (list) => {
    const temporary = `${profilesFile}.${randomUUID()}.tmp`;
    try {
      fs.writeFileSync(
        temporary,
        JSON.stringify(
          list.filter((p) => p.id !== configuredProfile.id),
          null,
          2,
        ),
        { flag: 'wx', mode: 0o600 },
      );
      fs.renameSync(temporary, profilesFile);
    } finally {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
  };

  const profileKey = (profile, selected) => {
    if (profile.id === configuredProfile.id) return getStartupProviderKey();
    const key = evolutionSettings.decrypt(profile.secret);
    const useActiveKey =
      selected?.id === profile.id && sameEndpoint(selected.baseURL, profile.baseURL);
    return resolveProviderKey(profile.baseURL, key, { useActiveKey });
  };

  const describeProfile = (record, selected) => {
    const { id, name, baseURL, model } = record;
    const profile = { id, name, baseURL, model, editable: id !== configuredProfile.id };
    try {
      validateProviderEndpoint(baseURL);
    } catch (error) {
      return { ...profile, hasKey: false, issue: error.message };
    }
    try {
      profileKey(record, selected);
      return { ...profile, hasKey: true };
    } catch {
      return { ...profile, hasKey: false, issue: 'Add an API key for this provider.' };
    }
  };

  const activeProfile = (profiles) => {
    const config = current();
    return (
      (config.profileId
        ? profiles.find((p) => p.id === config.profileId && sameProvider(p, config))
        : (config.saved &&
            profiles.find((p) => p.id !== configuredProfile.id && sameProvider(p, config))) ||
          profiles.find((p) => sameProvider(p, config))) || {
        id: 'active',
        name: 'Active Model',
        baseURL: config.baseURL,
        model: config.model,
      }
    );
  };

  const activateProfile = (profile, key) => {
    evolutionSettings.update({
      provider: {
        enabled: true,
        profileId: profile.id,
        baseURL: profile.baseURL,
        model: profile.model,
        apiKey: key,
      },
    });
    configureDefaultProvider({
      baseURL: profile.baseURL,
      defaultModel: profile.model,
      apiKey: key,
    });
  };

  const describeProfiles = (profiles) => {
    const selected = activeProfile(profiles);
    const summaries = profiles.map((profile) => describeProfile(profile, selected));
    return {
      active: summaries.find((profile) => profile.id === selected.id) || selected,
      profiles: summaries,
    };
  };
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

  app.post('/api/config/validate', async (req, res) => {
    const { baseURL, apiKey, model, orgId, profileId } = req.body || {};
    try {
      if (typeof baseURL !== 'string' || !baseURL.trim()) throw new Error('Base URL is required.');
      const { endpoint } = validateProviderEndpoint(baseURL.trim());
      const profiles = profileId ? loadProfiles() : [];
      const profile = profiles.find((entry) => entry.id === profileId);
      if (profileId && !profile) throw new Error('Provider profile no longer exists.');
      const key =
        !apiKey && profile && sameEndpoint(profile.baseURL, endpoint)
          ? profileKey(profile, activeProfile(profiles))
          : resolveProviderKey(endpoint, apiKey, { useActiveKey: profileId === undefined });
      const testModel = String(model || 'gpt-4o-mini').trim();
      const client = new OpenAI({
        baseURL: endpoint,
        apiKey: key,
        maxRetries: 0,
        timeout: 9000,
        defaultHeaders: orgId ? { 'OpenAI-Organization': String(orgId).trim() } : undefined,
      });
      const startTime = Date.now();
      const completion = await client.chat.completions.create({
        model: testModel,
        messages: [{ role: 'user', content: 'Ping. Reply with "pong".' }],
        max_tokens: 128,
      });
      const reply = completion?.choices?.[0]?.message?.content?.trim();
      if (!reply) throw new Error('The provider returned no message.');
      res.json({ success: true, latencyMs: Date.now() - startTime, modelUsed: testModel, reply });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message || 'Connection failed.' });
    }
  });

  app.get('/api/provider/profiles', (_req, res) => {
    res.json(describeProfiles(loadProfiles()));
  });

  app.post('/api/provider/profiles', (req, res) => {
    try {
      const { id, name, baseURL, model, apiKey, activate = true } = req.body || {};
      if (
        typeof baseURL !== 'string' ||
        typeof model !== 'string' ||
        !baseURL.trim() ||
        !model.trim() ||
        baseURL.length > 500 ||
        model.length > 500
      ) {
        return res.status(400).json({ error: 'Base URL and Model Name are required.' });
      }
      const { endpoint, local } = validateProviderEndpoint(baseURL.trim());
      const url = new URL(endpoint);
      if (
        (id !== undefined &&
          (typeof id !== 'string' || !/^[\w-]{1,100}$/.test(id) || id === configuredProfile.id)) ||
        (name !== undefined && (typeof name !== 'string' || name.length > 160)) ||
        (apiKey !== undefined && (typeof apiKey !== 'string' || apiKey.length > 4096)) ||
        typeof activate !== 'boolean'
      )
        return res.status(400).json({ error: 'Invalid provider profile details.' });
      const profiles = loadProfiles();
      const selected = activeProfile(profiles);
      const profileId = id || 'profile-' + randomUUID();
      const profileName = name?.trim() || url.hostname;

      const existingIdx = profiles.findIndex((p) => p.id === profileId);
      const profileData = {
        id: profileId,
        name: profileName,
        baseURL: endpoint,
        model: model.trim(),
        hasKey: Boolean(apiKey || local),
        ...(apiKey ? { secret: evolutionSettings.encrypt(apiKey) } : {}),
      };

      if (existingIdx !== -1) {
        if (
          !apiKey &&
          profiles[existingIdx].secret &&
          sameEndpoint(profiles[existingIdx].baseURL, endpoint)
        ) {
          profileData.secret = profiles[existingIdx].secret;
          profileData.hasKey = true;
        }
        profiles[existingIdx] = profileData;
      } else {
        profiles.push(profileData);
      }
      const effectiveKey = activate ? profileKey(profileData, selected) : '';
      if (activate && !profileData.secret && effectiveKey !== 'local')
        profileData.secret = evolutionSettings.encrypt(effectiveKey);

      if (!activate && selected.id === profileId)
        return res.status(400).json({ error: 'Use Save & Switch to update the active provider.' });
      saveProfiles(profiles);
      if (activate) activateProfile(profileData, effectiveKey);

      res.json({
        success: true,
        ...describeProfiles(profiles),
      });
    } catch (err) {
      res.status(400).json({ error: err.message || 'Failed to save provider profile.' });
    }
  });

  app.post('/api/provider/profiles/switch', (req, res) => {
    try {
      const { id } = req.body || {};
      const profiles = loadProfiles();
      const target = profiles.find((p) => p.id === id);
      if (!target) {
        return res.status(404).json({ error: `Provider profile "${id}" not found.` });
      }
      const key = profileKey(target, activeProfile(profiles));

      activateProfile(target, key);

      res.json({
        success: true,
        active: describeProfile(target, target),
      });
    } catch (err) {
      res.status(400).json({ error: err.message || 'Failed to switch provider profile.' });
    }
  });

  app.delete('/api/provider/profiles/:id', (req, res) => {
    try {
      const { id } = req.params;
      const profiles = loadProfiles();
      const target = profiles.find((p) => p.id === id);
      if (!target) {
        return res.status(404).json({ error: `Provider profile "${id}" not found.` });
      }
      if (target.id === configuredProfile.id || activeProfile(profiles).id === target.id) {
        return res.status(400).json({
          error: 'Cannot delete the currently active profile. Switch to another profile first.',
        });
      }
      const remaining = profiles.filter((p) => p.id !== id);
      saveProfiles(remaining);
      res.json({
        success: true,
        ...describeProfiles(remaining),
      });
    } catch (err) {
      res.status(400).json({ error: err.message || 'Failed to delete provider profile.' });
    }
  });

  app.post('/api/provider/configure', (req, res) => {
    try {
      const { baseURL, model, apiKey } = req.body || {};
      const effectiveKey = resolveProviderKey(baseURL, apiKey);
      evolutionSettings.update({
        provider: {
          enabled: true,
          baseURL,
          model,
          apiKey: effectiveKey,
        },
      });
      configureDefaultProvider({
        baseURL,
        apiKey: effectiveKey,
        defaultModel: model,
      });
      res.json({ success: true, ...status() });
    } catch (error) {
      res.status(400).json({
        error: error.message,
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
