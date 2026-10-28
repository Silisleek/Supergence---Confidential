// SIS 1.0 — Tool Capability Classifier & Isolated Execution
// Determines what a synthesized tool actually needs access to, then runs it in
// the narrowest scope that satisfies that need. Pure computation stays fast and
// in-process; anything reaching outside the process runs isolated.
//
// Classification is derived from the tool's own source. Nothing here is assumed
// or defaulted: a tool that cannot be classified is treated as privileged.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import crypto from 'crypto';
import { ContainerRunner } from '../sandbox/container-runner.js';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../');
const SANDBOX_BASE = path.join(ROOT_DIR, 'workspace', '.sandbox', 'forged');

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

// Capabilities ordered from least to most privileged.
export const CAPABILITY = {
  PURE: 'pure',
  CRYPTO: 'crypto',
  FILESYSTEM: 'filesystem',
  NETWORK: 'network',
  PROCESS: 'process',
};

const PRIVILEGED = new Set([CAPABILITY.FILESYSTEM, CAPABILITY.NETWORK, CAPABILITY.PROCESS]);

// Modules a tool may import, mapped to the capability they confer.
const MODULE_CAPABILITY = {
  fs: CAPABILITY.FILESYSTEM,
  'fs/promises': CAPABILITY.FILESYSTEM,
  'node:fs': CAPABILITY.FILESYSTEM,
  'node:fs/promises': CAPABILITY.FILESYSTEM,
  child_process: CAPABILITY.PROCESS,
  'node:child_process': CAPABILITY.PROCESS,
  worker_threads: CAPABILITY.PROCESS,
  'node:worker_threads': CAPABILITY.PROCESS,
  net: CAPABILITY.NETWORK,
  'node:net': CAPABILITY.NETWORK,
  http: CAPABILITY.NETWORK,
  'node:http': CAPABILITY.NETWORK,
  https: CAPABILITY.NETWORK,
  'node:https': CAPABILITY.NETWORK,
  dgram: CAPABILITY.NETWORK,
  'node:dgram': CAPABILITY.NETWORK,
  crypto: CAPABILITY.CRYPTO,
  'node:crypto': CAPABILITY.CRYPTO,
};

/**
 * Determine the capabilities a synthesized tool requires, from its source alone.
 * @param {string} code - Tool function body (receives `params`, returns an object)
 * @returns {{ capabilities: string[], privileged: boolean, reasons: string[], forbidden: string[] }}
 */
export function classifyCapabilities(code = '') {
  const src = String(code);
  const found = new Set();
  const reasons = [];
  const forbidden = [];

  const requireMatches = src.matchAll(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
  const importMatches = src.matchAll(/(?:import|from)\s*['"]([^'"]+)['"]/g);
  for (const m of [...requireMatches, ...importMatches]) {
    const mod = m[1];
    const cap = MODULE_CAPABILITY[mod];
    if (cap) {
      if (!found.has(cap)) {
        found.add(cap);
        reasons.push(`imports "${mod}"`);
      }
    } else if (!mod.startsWith('.') && mod !== 'crypto') {
      // An unrecognised module cannot be classified; treat it as privileged.
      if (!found.has(CAPABILITY.PROCESS)) {
        found.add(CAPABILITY.PROCESS);
        reasons.push(`imports unclassified module "${mod}"`);
      }
    }
  }

  if (/process\s*\.\s*(env|exit|kill|argv|mainModule)/.test(src)) {
    if (!found.has(CAPABILITY.PROCESS)) {
      found.add(CAPABILITY.PROCESS);
      reasons.push('reads process state');
    }
  }

  // eval / Function-constructor: the tool can synthesise arbitrary code at runtime,
  // so its static classification cannot be trusted to bound its behaviour.
  if (/\beval\s*\(|new\s+Function\s*\(/.test(src)) {
    forbidden.push('dynamic code construction (eval / new Function) cannot be capability-bounded');
  }

  if (/globalThis\s*\.\s*process|global\s*\.\s*process/.test(src)) {
    if (!found.has(CAPABILITY.PROCESS)) {
      found.add(CAPABILITY.PROCESS);
      reasons.push('reaches global process');
    }
  }

  if (found.size === 0) {
    found.add(CAPABILITY.PURE);
    reasons.push('performs computation only');
  }

  const capabilities = Object.values(CAPABILITY).filter((c) => found.has(c));
  return {
    capabilities,
    privileged: capabilities.some((c) => PRIVILEGED.has(c)),
    reasons,
    forbidden,
  };
}

/**
 * Execute a pure (non-privileged) tool in-process, with no module access.
 * Receives only its parameters and a cryptographic helper.
 */
async function executePure(code, params) {
  const fn = new AsyncFunction(
    'params',
    'crypto',
    `
    "use strict";
    try {
      ${code}
    } catch (err) {
      return { success: false, error: err.message };
    }
  `,
  );
  return await fn(Object.freeze({ ...params }), crypto);
}

/**
 * Execute a privileged tool in an isolated child process. The tool keeps the
 * capabilities it declared, but cannot reach this process's memory or event loop.
 */
async function executeIsolated(code, params, { toolName = 'forged_tool', timeoutMs = 15000 } = {}) {
  const runId = `${toolName}_${Date.now().toString(36)}`;
  const runDir = path.join(SANDBOX_BASE, runId);
  fs.mkdirSync(runDir, { recursive: true });

  const payloadPath = path.join(runDir, 'payload.json');
  const runnerPath = path.join(runDir, 'runner.cjs');

  fs.writeFileSync(payloadPath, JSON.stringify({ code, params }), 'utf8');
  fs.writeFileSync(
    runnerPath,
    `
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

(async () => {
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(path.join(__dirname, 'payload.json'), 'utf8'));
  } catch (err) {
    process.stdout.write('__SIS_RESULT__' + JSON.stringify({ success: false, error: 'payload unreadable: ' + err.message }));
    return;
  }
  try {
    const fn = new AsyncFunction('params', 'require', 'crypto', 'process', 'console', payload.code);
    const result = await fn(payload.params, require, crypto, process, console);
    process.stdout.write('__SIS_RESULT__' + JSON.stringify({ success: true, result }));
  } catch (err) {
    process.stdout.write('__SIS_RESULT__' + JSON.stringify({ success: false, error: err.message }));
  }
})();
`,
    'utf8',
  );

  const runner = new ContainerRunner({ workspaceDir: runDir });
  try {
    const execResult = await runner.exec('node', [runnerPath], { cwd: runDir, timeoutMs });
    const marker = (execResult.stdout || '').lastIndexOf('__SIS_RESULT__');
    if (marker === -1) {
      return {
        success: false,
        error: execResult.timedOut
          ? `Tool exceeded ${timeoutMs}ms execution limit`
          : (execResult.stderr || 'Tool produced no result').trim().split('\n')[0],
      };
    }
    const parsed = JSON.parse(execResult.stdout.slice(marker + '__SIS_RESULT__'.length));
    // Return the tool's own value, matching executePure's shape, so verification
    // inspects the tool's output rather than this transport envelope.
    if (parsed.success && parsed.result !== undefined) return parsed.result;
    return parsed;
  } finally {
    try {
      fs.rmSync(runDir, { recursive: true, force: true });
    } catch {}
  }
}

/**
 * Execute a synthesized tool at the isolation level its capabilities require.
 * @returns {Promise<object>} The tool's own return value, or { success:false, error }
 */
export async function executeWithCapabilities(code, params, options = {}) {
  const { capabilities, privileged, forbidden } = classifyCapabilities(code);

  if (forbidden.length > 0) {
    return {
      success: false,
      error: `Tool rejected: ${forbidden[0]}`,
      capabilities,
      rejected: true,
    };
  }

  if (privileged) {
    return await executeIsolated(code, params, options);
  }
  return await executePure(code, params);
}

// Phrases that mean "a placeholder was installed here", not "work was done".
const PLACEHOLDER_PHRASES = [
  'autonomous ada-si synthesis completed',
  'tool executed successfully',
  'default execution',
  'synthesized custom utility',
];

function isPlaceholderValue(value) {
  if (typeof value !== 'string') return false;
  const low = value.toLowerCase().trim();
  return PLACEHOLDER_PHRASES.some((p) => low === p || low.includes(p));
}

/**
 * Verify a tool before it is installed. Structural validity is always required.
 * Execution against sample arguments is required for pure tools, because a pure
 * tool can always be exercised with fabricated inputs — if it cannot run on
 * samples, it cannot run at all.
 *
 * Privileged tools are exempt from the execution requirement: their inputs
 * reference real resources (a file that must exist, a host that must resolve)
 * that synthetic samples cannot satisfy, so failing them on samples would
 * reject working tools. They still must parse and must not defeat capability
 * bounding, and the verdict records whether execution was actually confirmed
 * so the reviewer is never told more than was measured.
 *
 * @param {string} code - Tool body
 * @param {object} sampleParams - Arguments derived from the tool's own spec
 * @param {object} [options]
 * @param {boolean} [options.requireExecution] - Override the default requirement
 */
export async function verifyTool(code, sampleParams = {}, options = {}) {
  const classification = classifyCapabilities(code);

  if (classification.forbidden.length > 0) {
    return {
      verified: false,
      classification,
      executionConfirmed: false,
      error: classification.forbidden[0],
    };
  }

  try {
    // Constructing the function proves the source parses before anything runs.
    if (classification.privileged) {
      new AsyncFunction('params', 'require', 'crypto', 'process', 'console', code);
    } else {
      new AsyncFunction('params', 'crypto', code);
    }
  } catch (err) {
    return {
      verified: false,
      classification,
      executionConfirmed: false,
      error: `Syntax error: ${err.message}`,
    };
  }

  const requireExecution = options.requireExecution ?? !classification.privileged;

  const output = await executeWithCapabilities(code, sampleParams, options);
  const executionConfirmed = Boolean(output && output.success !== false && !output.error);
  const runError = executionConfirmed
    ? null
    : output?.error || 'Tool did not return a successful result';

  if (!requireExecution) {
    // Verified as far as static analysis and the human gate can take it.
    return { verified: true, classification, executionConfirmed, output, note: runError };
  }

  if (!executionConfirmed) {
    return { verified: false, classification, executionConfirmed, error: runError };
  }

  // A tool that returns nothing observable has not demonstrated any behaviour.
  const meaningful = Object.keys(output).filter((k) => k !== 'success');
  if (meaningful.length === 0) {
    return {
      verified: false,
      classification,
      executionConfirmed,
      error: 'Tool returned no output beyond a success flag',
    };
  }

  // A tool that echoes its own input back has computed nothing — it added no
  // information, so it is not a capability. Compare against the actual sample.
  const sampleKeys = Object.keys(sampleParams || {});
  if (sampleKeys.length > 0) {
    const echoed = meaningful.every((k) => {
      const value = output[k];
      if (typeof value !== 'object' || value === null) return false;
      const keys = sampleKeys.filter((sk) => sk in value);
      if (keys.length === 0) return false;
      return keys.every((sk) => JSON.stringify(value[sk]) === JSON.stringify(sampleParams[sk]));
    });
    if (echoed) {
      return {
        verified: false,
        classification,
        executionConfirmed,
        error: 'Tool only echoes its input without computing anything',
      };
    }
  }

  // A return value carrying only an acknowledgement string and the input is a
  // placeholder, not a computation. Its output adds no derived value.
  const derived = meaningful
    .map((k) => output[k])
    .filter((v) => {
      if (typeof v === 'object' && v !== null) return false; // containers hold echoed input
      if (isPlaceholderValue(v)) return false; // acknowledgement text
      return true;
    });
  if (derived.length === 0) {
    return {
      verified: false,
      classification,
      executionConfirmed,
      error: 'Tool returns no computed value, only echoed input',
    };
  }

  return { verified: true, classification, executionConfirmed, output };
}

/**
 * Derive sample arguments for verification from a tool's own declared parameters.
 * Uses each parameter's declared type; yields nothing when no type is declared.
 */
export function sampleParamsFromSpec(parameters = {}, required = []) {
  const sample = {};
  const names = required.length > 0 ? required : Object.keys(parameters || {});
  for (const name of names) {
    const spec = parameters[name];
    const type = typeof spec === 'string' ? spec : spec?.type;
    if (type === 'number' || type === 'integer') sample[name] = 1;
    else if (type === 'boolean') sample[name] = true;
    else if (type === 'array') sample[name] = ['sample'];
    else if (type === 'string') sample[name] = 'sample';
  }
  return sample;
}

export default {
  classifyCapabilities,
  executeWithCapabilities,
  verifyTool,
  sampleParamsFromSpec,
  CAPABILITY,
};
