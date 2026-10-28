import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

export const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
export class EvolutionSettings {
  constructor(
    directory = path.join(process.env.SIS_DATA_DIR || path.join(repoRoot, 'data'), 'evolution'),
  ) {
    this.directory = directory;
    fs.mkdirSync(directory, { recursive: true });
    this.file = path.join(directory, 'settings.json');
    this.keyFile = path.join(directory, 'credentials.key');
    this.value = {
      proactive: true,
      research: false,
      adaptiveRole: true,
      maxRepairAttempts: 3,
      maxToolSteps: 24,
      maxOutputTokens: 16384,
      provider: { enabled: false, baseURL: '', model: '' },
      composio: { userId: '', sessionId: '', toolkits: [] },
    };
    try {
      this.value = { ...this.value, ...JSON.parse(fs.readFileSync(this.file, 'utf8')) };
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  key() {
    try {
      return fs.readFileSync(this.keyFile);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const key = randomBytes(32);
      fs.writeFileSync(this.keyFile, key, { flag: 'wx', mode: 0o600 });
      return key;
    }
  }
  encrypt(text) {
    if (!text) return '';
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    return Buffer.concat([
      iv,
      cipher.update(text, 'utf8'),
      cipher.final(),
      cipher.getAuthTag(),
    ]).toString('base64');
  }
  decrypt(value) {
    if (!value) return '';
    const data = Buffer.from(value, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', this.key(), data.subarray(0, 12));
    decipher.setAuthTag(data.subarray(-16));
    return Buffer.concat([decipher.update(data.subarray(12, -16)), decipher.final()]).toString(
      'utf8',
    );
  }
  public() {
    const { secret: providerSecret, ...provider } = this.value.provider;
    const { secret: composioSecret, ...composio } = this.value.composio;
    return {
      ...this.value,
      provider: { ...provider, hasKey: Boolean(providerSecret) },
      composio: { ...composio, hasKey: Boolean(composioSecret || process.env.COMPOSIO_API_KEY) },
    };
  }
  update(patch) {
    const next = structuredClone(this.value);
    for (const [key, min, max] of [
      ['maxToolSteps', 4, 64],
      ['maxOutputTokens', 1024, 65536],
    ]) {
      if (patch[key] !== undefined) {
        if (!Number.isInteger(patch[key]) || patch[key] < min || patch[key] > max)
          throw new Error(`${key} must be an integer from ${min} to ${max}.`);
        next[key] = patch[key];
      }
    }
    for (const key of ['proactive', 'research', 'adaptiveRole'])
      if (patch[key] !== undefined) {
        if (typeof patch[key] !== 'boolean') throw new Error(`${key} must be boolean.`);
        next[key] = patch[key];
      }
    if (patch.maxRepairAttempts !== undefined) {
      if (
        !Number.isInteger(patch.maxRepairAttempts) ||
        patch.maxRepairAttempts < 1 ||
        patch.maxRepairAttempts > 5
      )
        throw new Error('Repair limit must be 1–5.');
      next.maxRepairAttempts = patch.maxRepairAttempts;
    }
    if (patch.provider) {
      const p = patch.provider;
      if (p.baseURL !== undefined && p.baseURL !== '') {
        const url = new URL(p.baseURL);
        if (url.hostname === 'groq.com' || url.hostname.endsWith('.groq.com'))
          throw new Error('Groq has been removed. Use the configured router or another provider.');
        if (
          !['http:', 'https:'].includes(url.protocol) ||
          url.username ||
          url.password ||
          url.search ||
          url.hash
        )
          throw new Error('Use a plain HTTP(S) provider endpoint.');
        if (
          url.protocol !== 'https:' &&
          !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
        )
          throw new Error('Remote providers require HTTPS.');
      }
      for (const key of ['baseURL', 'model'])
        if (p[key] !== undefined) {
          if (typeof p[key] !== 'string' || p[key].length > 500)
            throw new Error(`Invalid provider ${key}.`);
          next.provider[key] = p[key].trim();
        }
      if (p.enabled !== undefined) {
        if (typeof p.enabled !== 'boolean') throw new Error('Invalid provider toggle.');
        next.provider.enabled = p.enabled;
      }
      if (p.apiKey !== undefined) {
        if (typeof p.apiKey !== 'string' || p.apiKey.length > 4096)
          throw new Error('Invalid API key.');
        next.provider.secret = this.encrypt(p.apiKey);
      }
      if (
        next.provider.enabled &&
        (!next.provider.baseURL || !next.provider.model || !next.provider.secret)
      )
        throw new Error('An enabled provider needs endpoint, model, and key.');
    }
    if (patch.composio) {
      const c = patch.composio;
      for (const key of ['userId', 'sessionId'])
        if (c[key] !== undefined) {
          if (typeof c[key] !== 'string' || c[key].length > 180 || /[^\w@.:-]/.test(c[key]))
            throw new Error(`Invalid Composio ${key}.`);
          next.composio[key] = c[key];
        }
      if (c.toolkits !== undefined) {
        if (
          !Array.isArray(c.toolkits) ||
          c.toolkits.length > 30 ||
          c.toolkits.some((t) => typeof t !== 'string' || !/^[a-z0-9_]+$/.test(t))
        )
          throw new Error('Use up to 30 toolkit slugs.');
        next.composio.toolkits = c.toolkits;
      }
      if (c.apiKey !== undefined) {
        if (typeof c.apiKey !== 'string' || c.apiKey.length > 4096)
          throw new Error('Invalid Composio key.');
        next.composio.secret = this.encrypt(c.apiKey);
      }
    }
    fs.writeFileSync(`${this.file}.tmp`, JSON.stringify(next, null, 2), { mode: 0o600 });
    fs.renameSync(`${this.file}.tmp`, this.file);
    this.value = next;
    return this.public();
  }
  provider() {
    return this.value.provider.enabled
      ? { ...this.value.provider, apiKey: this.decrypt(this.value.provider.secret) }
      : null;
  }
  composioKey() {
    return this.decrypt(this.value.composio.secret) || process.env.COMPOSIO_API_KEY || '';
  }
}
export const evolutionSettings = new EvolutionSettings();
