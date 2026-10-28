import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { evolutionSettings } from './evolutionSettings.js';
import { actionMonitor } from '../security/action-monitor.js';

export class ComposioBridge {
  constructor({ settings = evolutionSettings, monitor = actionMonitor, request = fetch } = {}) {
    this.settings = settings;
    this.monitor = monitor;
    this.request = request;
    this.file = path.join(settings.directory, 'connector-requests.json');
    this.pending = [];
    try {
      this.pending = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    for (const item of this.pending) if (item.status === 'executing') item.status = 'uncertain';
  }
  save() {
    fs.writeFileSync(`${this.file}.tmp`, JSON.stringify(this.pending, null, 2), { mode: 0o600 });
    fs.renameSync(`${this.file}.tmp`, this.file);
  }
  async api(suffix, body) {
    const key = this.settings.composioKey();
    if (!key) throw new Error('Add a Composio project API key in Evolution settings.');
    const response = await this.request(`https://backend.composio.dev/api/v3.1${suffix}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(45000),
      redirect: 'error',
    });
    if (!response.ok)
      throw new Error(
        `Composio HTTP ${response.status}. Check the configured session, account, and toolkit permissions.`,
      );
    const result = await response.json();
    if (result.error)
      throw new Error('Composio returned an execution error; inspect the provider dashboard.');
    return result;
  }
  sessionPath() {
    const id = this.settings.value.composio.sessionId;
    if (!id) throw new Error('Create or enter a Composio session first.');
    return `/tool_router/session/${encodeURIComponent(id)}`;
  }
  async connect() {
    const c = this.settings.value.composio;
    if (!c.userId || !c.toolkits.length)
      throw new Error('Set a user ID and an explicit toolkit allowlist first.');
    const result = await this.api('/tool_router/session', {
      user_id: c.userId,
      toolkits: { enable: c.toolkits },
      instant: false,
      workbench: { enable: false },
      proxy_execute: { enable: false },
    });
    const id = result.session_id || result.id;
    if (!id) throw new Error('Composio did not return a session ID.');
    this.settings.update({ composio: { sessionId: id } });
    return { sessionId: id };
  }
  async discover() {
    return this.api(`${this.sessionPath()}/tools`);
  }
  requestAction({ tool, arguments: args = {} }) {
    if (
      typeof tool !== 'string' ||
      !/^[A-Z][A-Z0-9_]{1,150}$/.test(tool) ||
      tool.startsWith('COMPOSIO_')
    )
      throw new Error(
        'Select an app tool from the discovered session schemas; meta tools are disabled.',
      );
    if (
      !args ||
      typeof args !== 'object' ||
      Array.isArray(args) ||
      JSON.stringify(args).length > 50000
    )
      throw new Error('Supply tool arguments as an object at most 50 KB.');
    const sessionId = this.settings.value.composio.sessionId;
    if (!sessionId) throw new Error('Configure a Composio session first.');
    if (this.pending.filter((item) => item.status === 'pending').length >= 20)
      throw new Error('Review pending connector requests first.');
    const item = {
      id: randomUUID(),
      tool,
      arguments: args,
      sessionId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    this.pending.unshift(item);
    this.save();
    this.monitor.record(
      'composio_request',
      'awaiting-user',
      {
        risk: 'high',
        findings: ['External account action requires review of exact tool and arguments.'],
      },
      { requestId: item.id },
    );
    return {
      id: item.id,
      status: item.status,
      message: 'User must review the exact connector action in Evolution Studio.',
    };
  }
  async decide(id, allow) {
    const item = this.pending.find((item) => item.id === id);
    if (!item || item.status !== 'pending')
      throw new Error('Connector request is no longer pending.');
    if (item.sessionId !== this.settings.value.composio.sessionId)
      throw new Error('Session changed; request a fresh action.');
    if (!allow) {
      item.status = 'rejected';
      this.save();
      return item;
    }
    item.status = 'executing';
    this.save();
    try {
      item.result = await this.api(`${this.sessionPath()}/execute`, {
        tool_slug: item.tool,
        arguments: item.arguments,
      });
      item.status = item.result.result_type === 'completed' ? 'completed' : 'needs-attention';
    } catch (error) {
      item.status = 'uncertain';
      item.error = error.message;
    }
    item.finishedAt = new Date().toISOString();
    this.save();
    this.monitor.record(
      'composio_execute',
      item.status,
      {
        risk: 'high',
        findings: [
          'User reviewed this external account action. Uncertain actions are never retried automatically.',
        ],
      },
      { requestId: id },
    );
    return item;
  }
  snapshot() {
    return this.pending.slice(0, 40);
  }
}
export const composioBridge = new ComposioBridge();
