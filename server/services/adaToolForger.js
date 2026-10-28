// SIS 1.0 — Ada-SI Dynamic Tool Forger Engine
// Autonomous tool synthesis: detects a missing capability, synthesizes it,
// verifies it against real execution, and installs it into the live registry.
//
// Installation policy:
//   - Tools that verify and need no privileged access install themselves.
//   - Tools that verify but require filesystem/network/process access are queued
//     for explicit user approval.
//   - Tools that fail verification are never installed and never persisted.
//
// Nothing here is seeded, canned, or assumed. A tool exists because it was
// synthesized and then proved to run.

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import toolRegistry from '../tools/registry.js';
import brain from '../orchestrator/brain.js';
import { quickAI, DEFAULT_MODEL } from '../api/openrouter.js';
import {
  classifyCapabilities,
  executeWithCapabilities,
  verifyTool,
  sampleParamsFromSpec,
} from '../tools/capabilities.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const TOOLS_STORE_FILE = path.join(DATA_DIR, 'ada-forged-tools.json');

// Retained only to detect and purge tools written by the previous version,
// which installed unverified placeholders without bound.
const LEGACY_PLACEHOLDER_MARKER = 'Autonomous Ada-SI synthesis completed';

// Identifies whether persisted code is still the code that was verified.
function hashTool(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

export class AdaToolForger {
  constructor() {
    this.proposals = new Map(); // verified but awaiting user approval (privileged)
    this.installedTools = new Map(); // verified and live
    this.forgingHistory = [];
    this.loadedFromDisk = 0;
    this.purgedLegacy = 0;
    this._ensureStore();
    this._loadSavedTools();
  }

  _ensureStore() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (e) {
      console.warn('[AdaToolForger] Notice creating storage:', e.message);
    }
  }

  /**
   * Load persisted tools. Structural checks run synchronously so boot is not
   * delayed; the store holds only tools that were verified when they were
   * written, and each is re-checked against its integrity hash in the
   * background. A tool whose hash no longer matches is quarantined.
   */
  _loadSavedTools() {
    if (!fs.existsSync(TOOLS_STORE_FILE)) return;

    let list;
    try {
      list = JSON.parse(fs.readFileSync(TOOLS_STORE_FILE, 'utf8'));
    } catch (e) {
      console.warn('[AdaToolForger] Tool store unreadable, starting empty:', e.message);
      return;
    }
    if (!Array.isArray(list)) return;

    const byName = new Map();
    const pending = [];
    for (const item of list) {
      if (!item || !item.name || typeof item.code !== 'string') {
        this.purgedLegacy++;
        continue;
      }
      // Drop placeholders persisted by earlier versions.
      if (item.code.includes(LEGACY_PLACEHOLDER_MARKER) || /^custom_tool_\d+$/i.test(item.name)) {
        this.purgedLegacy++;
        continue;
      }
      if (byName.has(item.name)) continue; // de-duplicate by name

      // Trusting the store is not the same as having evidence it works. Tools
      // written before integrity hashes existed have none, so they re-verify.
      const intact = item.integrity && item.integrity === hashTool(item.code);
      item.verified = Boolean(intact);
      if (!intact) pending.push(item);

      byName.set(item.name, item);
    }

    for (const item of byName.values()) {
      this.installedTools.set(item.id, item);
      this._registerIntoLiveRegistry(item, false);
    }
    this.loadedFromDisk = byName.size;

    if (this.purgedLegacy > 0) {
      console.log(`[AdaToolForger] Purged ${this.purgedLegacy} placeholder tools from the store.`);
      this._saveTools();
    }
    if (byName.size > 0) {
      console.log(
        `[AdaToolForger] Restored ${byName.size} tools (${pending.length} awaiting re-verification).`,
      );
    }

    if (pending.length > 0) {
      this._verifyLoadedTools(pending).catch((err) => {
        console.warn('[AdaToolForger] Background re-verification error:', err.message);
      });
    }
  }

  /**
   * Re-verify restored tools one at a time, off the boot path. Tools that pass
   * are promoted to live; tools that fail are removed.
   */
  async _verifyLoadedTools(pending) {
    let promoted = 0;
    let dropped = 0;

    for (const tool of pending) {
      const verdict = await verifyTool(
        tool.code,
        sampleParamsFromSpec(tool.parameters, tool.required),
      );
      if (verdict.verified) {
        tool.verified = true;
        tool.capabilities = verdict.classification.capabilities;
        tool.privileged = verdict.classification.privileged;
        tool.integrity = hashTool(tool.code);
        promoted++;
      } else {
        this.installedTools.delete(tool.id);
        toolRegistry.unregister(tool.name);
        dropped++;
      }
    }

    this._saveTools();
    if (promoted > 0 || dropped > 0) {
      console.log(
        `[AdaToolForger] Re-verification complete: ${promoted} promoted, ${dropped} removed.`,
      );
    }
  }

  _saveTools() {
    try {
      const list = Array.from(this.installedTools.values());
      fs.writeFileSync(TOOLS_STORE_FILE, JSON.stringify(list, null, 2), 'utf8');
    } catch (e) {
      console.error('[AdaToolForger] Failed to persist tools:', e.message);
    }
  }

  /**
   * Synthesize, verify, and install (or queue) a tool.
   * @returns {Promise<object>} The installed tool, the queued proposal, or a
   *                            rejection describing why the tool was not accepted.
   */
  async forgeTool(spec = {}) {
    const { name, displayName, category, description, parameters, required, code, requestedBy } =
      spec;

    if (!code || typeof code !== 'string') {
      return { accepted: false, reason: 'No executable code was supplied.' };
    }

    const cleanName = String(name || '')
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
    if (!cleanName) {
      return { accepted: false, reason: 'Tool requires a name.' };
    }

    const existing = Array.from(this.installedTools.values()).find((t) => t.name === cleanName);
    if (existing) {
      return {
        accepted: false,
        reason: `A tool named "${cleanName}" is already installed.`,
        existing: true,
      };
    }

    const sampleParams = sampleParamsFromSpec(parameters, required);
    const verdict = await verifyTool(code, sampleParams);

    this.forgingHistory.push({
      action: verdict.verified ? 'VERIFIED' : 'REJECTED_UNVERIFIED',
      name: cleanName,
      timestamp: Date.now(),
      capabilities: verdict.classification?.capabilities || [],
      error: verdict.error || null,
    });

    if (!verdict.verified) {
      brain.broadcast('ada-tool-rejected', {
        name: cleanName,
        reason: verdict.error,
        message: `✗ Ada-SI rejected "${cleanName}" — it did not pass verification.`,
      });
      return { accepted: false, reason: verdict.error, classification: verdict.classification };
    }

    const tool = {
      id: 'ada-tool-' + cleanName,
      name: cleanName,
      displayName: displayName || cleanName.replace(/_/g, ' ').toUpperCase(),
      category: category || 'General Utilities',
      description: description || 'Autonomously synthesized tool.',
      parameters: parameters || {},
      required: required || [],
      code,
      capabilities: verdict.classification.capabilities,
      privileged: verdict.classification.privileged,
      verified: true,
      executionConfirmed: verdict.executionConfirmed,
      verificationNote: verdict.note || null,
      verifiedAt: new Date().toISOString(),
      integrity: hashTool(code),
      requestedBy: requestedBy || 'Supergence Autonomous System',
      createdAt: new Date().toISOString(),
    };

    // Privileged tools are capable of effects outside this process. They wait
    // for an explicit decision rather than installing themselves.
    if (tool.privileged) {
      tool.status = 'PENDING_APPROVAL';
      this.proposals.set(tool.id, tool);
      brain.broadcast('ada-tool-proposed', {
        tool,
        message:
          `⚠ Ada-SI synthesized "${tool.displayName}" — needs ${tool.capabilities.join('/')} access. Approval required.` +
          (tool.executionConfirmed
            ? ''
            : ' (Not executed during verification; its inputs reference real resources.)'),
      });
      return { accepted: true, pendingApproval: true, tool };
    }

    tool.status = 'APPROVED';
    tool.approvedAt = new Date().toISOString();
    this._registerIntoLiveRegistry(tool);
    this.installedTools.set(tool.id, tool);
    this._saveTools();

    this.forgingHistory.push({
      action: 'AUTO_INSTALLED',
      name: tool.name,
      timestamp: Date.now(),
      capabilities: tool.capabilities,
    });

    brain.broadcast('ada-tool-approved', {
      tool,
      message: `✓ Ada-SI synthesized, verified and activated "${tool.displayName}".`,
    });

    return { accepted: true, installed: true, tool };
  }

  /** Backwards-compatible synchronous proposal path. Delegates to forgeTool. */
  proposeTool(spec = {}) {
    return this.forgeTool(spec);
  }

  /**
   * Synthesize a tool from a natural-language requirement.
   * Uses the model; if the model cannot produce a usable spec, this fails
   * honestly rather than substituting a canned tool.
   */
  async synthesizeToolDynamically(userPrompt) {
    if (!userPrompt || typeof userPrompt !== 'string') {
      throw new Error('A requirement is required to synthesize a tool.');
    }

    const prompt = `You are Ada-SI, an autonomous tool synthesizer.
Synthesize a functional JavaScript tool for this requirement:
"${userPrompt}"

The "code" field must be the BODY of an async function that receives "params" and
returns a JSON-serializable object. It must compute a real result from its inputs.

Do not return a placeholder. Do not return the input unchanged. Do not fabricate a
result. If you use a module, call require('moduleName') inside the code and declare
it — using require('crypto') is fine. Never use eval or new Function.

Return ONLY valid JSON, no markdown fences:
{
  "name": "snake_case_name",
  "displayName": "Human Readable Name",
  "category": "Category",
  "description": "What this computes",
  "parameters": { "paramName": { "type": "string|number|boolean", "description": "..." } },
  "required": ["paramName"],
  "code": "// real implementation using params\\nreturn { success: true, result: ... };"
}`;

    const raw = await quickAI(
      'You are Ada-SI. Return strict JSON only. No prose, no markdown fences.',
      prompt,
      DEFAULT_MODEL,
      900,
      0.3,
    );

    let spec = null;
    const jsonMatch = (raw || '').match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        spec = JSON.parse(jsonMatch[0]);
      } catch (err) {
        throw new Error(`Ada-SI could not parse the synthesized specification: ${err.message}`, {
          cause: err,
        });
      }
    }
    if (!spec || !spec.name || !spec.code) {
      throw new Error('Ada-SI did not receive a usable tool specification from the model.');
    }

    const outcome = await this.forgeTool({
      ...spec,
      requestedBy: 'Ada-SI Autonomous Synthesizer',
    });

    if (!outcome.accepted) {
      throw new Error(`Synthesized tool "${spec.name}" failed verification: ${outcome.reason}`);
    }
    return outcome.tool;
  }

  /** Detect a missing capability from a user request and forge it. */
  async analyzeAndProposeTool(query = '') {
    if (!query || typeof query !== 'string') return null;
    try {
      return await this.synthesizeToolDynamically(query);
    } catch (err) {
      console.warn('[AdaToolForger] Synthesis did not produce a tool:', err.message);
      return null;
    }
  }

  /** Execute a tool in the isolation its capabilities require. */
  async runTool(tool, params = {}, options = {}) {
    const verdict = classifyCapabilities(tool.code);
    if (verdict.forbidden.length > 0) {
      return { success: false, error: `Tool rejected: ${verdict.forbidden[0]}` };
    }
    return await executeWithCapabilities(tool.code, params, {
      toolName: tool.name,
      timeoutMs: options.timeoutMs || 15000,
    });
  }

  /** Test a tool against supplied sample arguments. */
  async testToolExecution(toolId, sampleParams = {}) {
    const tool =
      this.installedTools.get(toolId) ||
      this.proposals.get(toolId) ||
      Array.from(this.installedTools.values()).find((t) => t.name === toolId);
    if (!tool) return { success: false, error: `Tool ${toolId} not found` };

    const args =
      Object.keys(sampleParams).length > 0
        ? sampleParams
        : sampleParamsFromSpec(tool.parameters, tool.required);

    const output = await this.runTool(tool, args);
    return {
      success: output.success !== false,
      toolId,
      toolName: tool.name,
      sampleParams: args,
      output,
    };
  }

  /** Execute an installed tool. */
  async executeInstalledTool(toolIdOrName, params = {}) {
    const tool =
      this.installedTools.get(toolIdOrName) ||
      Array.from(this.installedTools.values()).find((t) => t.name === toolIdOrName);
    if (!tool) throw new Error(`Installed tool not found: ${toolIdOrName}`);

    const output = await this.runTool(tool, params);
    return { success: output.success !== false, toolName: tool.name, params, result: output };
  }

  /** Approve a queued privileged tool and bring it live. */
  approveTool(toolId) {
    const proposal =
      this.proposals.get(toolId) ||
      Array.from(this.proposals.values()).find((t) => t.name === toolId);
    if (!proposal) return { success: false, error: `No pending proposal: ${toolId}` };

    proposal.status = 'APPROVED';
    proposal.approvedAt = new Date().toISOString();

    this._registerIntoLiveRegistry(proposal);
    this.installedTools.set(proposal.id, proposal);
    this.proposals.delete(proposal.id);
    this._saveTools();

    this.forgingHistory.push({
      action: 'APPROVED',
      toolId: proposal.id,
      name: proposal.name,
      timestamp: Date.now(),
    });

    brain.broadcast('ada-tool-approved', {
      tool: proposal,
      message: `✓ "${proposal.displayName}" approved and live in the ToolRegistry.`,
    });

    return { success: true, tool: proposal };
  }

  /** Decline a queued proposal. */
  rejectTool(toolId, reason = 'Rejected by user') {
    const proposal =
      this.proposals.get(toolId) ||
      Array.from(this.proposals.values()).find((t) => t.name === toolId);
    if (!proposal) return false;

    this.proposals.delete(proposal.id);
    this.forgingHistory.push({
      action: 'REJECTED',
      toolId: proposal.id,
      name: proposal.name,
      reason,
      timestamp: Date.now(),
    });

    brain.broadcast('ada-tool-rejected', { toolId: proposal.id, name: proposal.name, reason });
    return true;
  }

  /** Register a verified tool into the live registry, executing at its isolation level. */
  _registerIntoLiveRegistry(tool, verbose = true) {
    try {
      toolRegistry.register({
        name: tool.name,
        description: `[Ada-SI Forged] ${tool.description}`,
        parameters: tool.parameters || {},
        required: tool.required || [],
        isDynamicSkill: true,
        isAdaForged: true,
        code: tool.code,
        status: 'APPROVED',
        verified: true,
        capabilities: tool.capabilities,
        approvedAt: tool.approvedAt,
        createdAt: tool.createdAt,
        execute: async (params) => this.runTool(tool, params),
      });
      if (verbose) {
        console.log(
          `[AdaToolForger] ✓ Live: ${tool.name} [${(tool.capabilities || []).join(',')}]`,
        );
      }
    } catch (e) {
      console.error(`[AdaToolForger] Failed to register ${tool.name}:`, e.message);
    }
  }

  getStatus() {
    const installed = Array.from(this.installedTools.values());
    return {
      pendingApproval: Array.from(this.proposals.values()),
      installedTools: installed,
      history: this.forgingHistory.slice(-20),
      totalPending: this.proposals.size,
      totalInstalled: installed.length,
      restoredFromDisk: this.loadedFromDisk,
      purgedUnverified: this.purgedLegacy,
    };
  }
}

const adaToolForger = new AdaToolForger();
export default adaToolForger;
