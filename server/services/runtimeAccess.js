import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicToolArguments } from './assistantStream.js';
import { actionMonitor, assessAction } from '../security/action-monitor.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const defaults = { mode: 'full-access', browser: true, terminal: true, files: true };
const sourceReviewFindings = new Set([
  'Live application source modification requires review',
  'Shell command may modify live application source',
]);
export const accessModes = ['full-access', 'approve-for-me', 'ask-before-executing'];

export function operationPolicy(name, args = {}) {
  const tool = String(name).toLowerCase();
  const capabilities = new Set();
  if (/browser|web_|search_web|navigate|crawl/.test(tool)) capabilities.add('browser');
  if (
    /file|directory|knowledge|memory|skill|artifact|design|generate|build|retain|forge|dynamic_tool|evolution/.test(
      tool,
    ) ||
    (/workspace/.test(tool) && !/browser/.test(tool))
  )
    capabilities.add('files');
  if (
    /exec|shell|terminal|command|sandbox|verify.*code|verify_evolution|run_|openclaw|forge|synthesiz|generate_|build_|start_/.test(
      tool,
    )
  )
    capabilities.add('terminal');
  // Unknown and synthesized operations require approval in either restricted mode.
  const readOnly =
    /^(read_|get_|list_|search_|recall_|inspect_|reverse_engineer|reverse_engineering_status|tool_cognition_query)/.test(
      tool,
    ) || /^(web_search|web_fetch|system_telemetry|telemetry|hardware_audit)$/.test(tool);
  const localEdit =
    /^(write_file|create_file|retain_knowledge|edit_knowledge|retain_browser_page|store_memory|update_memory)$/.test(
      tool,
    ) &&
    !path.isAbsolute(String(args.path || args.filepath || '')) &&
    !String(args.path || args.filepath || '')
      .split(/[\\/]/)
      .includes('..');
  const routine =
    readOnly || localEdit || tool === 'open_workspace_browser' || tool === 'send_agent_message';
  return { capabilities: [...capabilities], readOnly, routine };
}

export class RuntimeAccess {
  constructor({
    directory = process.env.SIS_DATA_DIR || path.join(root, 'data'),
    timeoutMs = 240000,
  } = {}) {
    this.file = path.join(directory, 'runtime-access.json');
    this.timeoutMs = timeoutMs;
    this.context = new AsyncLocalStorage();
    this.pending = new Map();
    this.audit = [];
    this.settings = { ...defaults };
    try {
      this.settings = this.validate(JSON.parse(fs.readFileSync(this.file, 'utf8')), defaults);
    } catch {}
  }
  validate(patch, original = this.settings) {
    if (!patch || typeof patch !== 'object') throw new Error('Access settings required.');
    if (patch.mode !== undefined && !accessModes.includes(patch.mode))
      throw new Error('Unknown access mode.');
    const next = { ...original };
    for (const key of ['browser', 'terminal', 'files']) {
      if (patch[key] !== undefined) {
        if (typeof patch[key] !== 'boolean') throw new Error(`${key} must be a boolean.`);
        next[key] = patch[key];
      }
    }
    if (patch.mode) next.mode = patch.mode;
    return next;
  }
  update(patch) {
    const next = this.validate(patch);
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(`${this.file}.tmp`, JSON.stringify(next, null, 2));
    fs.renameSync(`${this.file}.tmp`, this.file);
    this.settings = next;
    // A capability revoked while an action awaits approval cancels that action.
    for (const [id, entry] of this.pending) {
      if (entry.capabilities.some((cap) => next[cap] === false)) this.resolve(id, false);
      else if (
        next.mode === 'full-access' &&
        entry.findings.every((finding) => sourceReviewFindings.has(finding))
      )
        this.resolve(id, true, 'full-access');
    }
    return this.snapshot();
  }
  currentContext() {
    return this.context.getStore() || {};
  }
  run(context, work) {
    return this.context.run({ ...this.currentContext(), ...context, grants: new Set() }, work);
  }
  snapshot() {
    return {
      settings: { ...this.settings },
      pending: [...this.pending.values()].map(
        ({ resolve: _resolve, timer: _timer, signal: _signal, onAbort: _onAbort, ...entry }) => ({
          ...entry,
          args: publicToolArguments(entry.tool, entry.args),
        }),
      ),
      audit: this.audit.slice(-40),
    };
  }
  describe() {
    const { mode, browser, terminal, files } = this.settings;
    return `Runtime access mode: ${mode}. Built-in shared Chrome browser: ${browser ? 'enabled' : 'disabled'}. Terminal/code execution: ${terminal ? 'enabled' : 'disabled'}. Local workspace files: ${files ? 'enabled' : 'disabled'}. These are actual installed tools, not hypothetical capabilities. Use open_workspace_browser/read_workspace_browser/browser interaction tools for the shared browser, run_command for shell commands, read_file/write_file for workspace files, or read_local_file/write_local_file/list_local_directory for explicitly selected host paths. In full-access mode, all requested execution, file operations, shell commands, and source edits are fully authorized: proceed autonomously and continue to completion without asking whether to proceed. Do not prompt for confirmation or permission checkpoints; execute the needed actions directly. Report actual tool errors; do not invent a permission requirement. In ask-before-executing mode the runtime pauses actions for user approval; approve-for-me allows read-only tools and routine workspace edits, and asks for terminal or unclassified actions. Never claim execution or completion before it occurs.`;
  }
  async authorize(tool, args = {}) {
    const policy = operationPolicy(tool, args);
    const assessment = assessAction(tool, args);
    actionMonitor.record(tool, assessment.risk === 'high' ? 'flagged' : 'screened', assessment);
    for (const capability of policy.capabilities) {
      if (this.settings[capability] === false)
        throw new Error(`${capability} access is disabled in Access settings.`);
    }
    const normalizedTool = tool === 'create_file' ? 'write_file' : tool;
    const key = createHash('sha256')
      .update(JSON.stringify([normalizedTool, args]))
      .digest('hex');
    const context = this.currentContext();
    context.signal?.throwIfAborted();
    if (context.grants?.has(key)) return;
    if (
      (assessment.risk !== 'high' ||
        (this.settings.mode === 'full-access' &&
          assessment.findings.every((finding) => sourceReviewFindings.has(finding)))) &&
      (this.settings.mode === 'full-access' ||
        policy.readOnly ||
        (this.settings.mode === 'approve-for-me' && policy.routine))
    )
      return;
    if (this.pending.size >= 20) throw new Error('Too many actions awaiting approval.');
    const id = randomUUID();
    const allowed = await new Promise((resolve) => {
      const entry = {
        id,
        tool,
        args,
        ...policy,
        risk: assessment.risk,
        findings: assessment.findings,
        agentId: context.agentId || 'agent-supergence',
        conversationId: context.conversationId || null,
        createdAt: new Date().toISOString(),
        resolve,
      };
      entry.timer = setTimeout(() => this.resolve(id, false, 'expired'), this.timeoutMs);
      this.pending.set(id, entry);
      if (context.signal) {
        entry.onAbort = () => {
          if (this.pending.has(id)) this.resolve(id, false, 'cancelled');
        };
        entry.signal = context.signal;
        context.signal.addEventListener('abort', entry.onAbort, { once: true });
      }
    });
    if (!allowed) throw new Error(`Execution declined or approval expired: ${tool}`);
    for (const capability of policy.capabilities) {
      if (this.settings[capability] === false)
        throw new Error(`${capability} access was disabled before execution.`);
    }
    context.grants?.add(key);
  }
  resolve(id, allow, reason = allow ? 'allowed' : 'declined') {
    const entry = this.pending.get(id);
    if (!entry) throw new Error('Approval is no longer pending.');
    this.pending.delete(id);
    clearTimeout(entry.timer);
    entry.signal?.removeEventListener('abort', entry.onAbort);
    this.audit.push({
      id,
      tool: entry.tool,
      agentId: entry.agentId,
      decision: reason,
      at: new Date().toISOString(),
    });
    this.audit = this.audit.slice(-100);
    actionMonitor.record(entry.tool, reason, { risk: entry.risk, findings: entry.findings });
    entry.resolve(allow === true);
    return { id, decision: reason };
  }
}
export const runtimeAccess = new RuntimeAccess();
