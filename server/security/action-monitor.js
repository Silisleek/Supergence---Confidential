import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { evolutionSettings } from '../services/evolutionSettings.js';

export function assessAction(tool, args = {}) {
  const value =
    JSON.stringify(args, (_key, value) => (typeof value === 'function' ? undefined : value)) || '';
  const findings = [];
  if (/^browser_(?:save|load)_cookies$/.test(tool))
    findings.push('Browser session cookie export or import requires explicit review');
  // File bodies are saved as data, not executed by these tools. A packager's
  // exclusion list mentioning ".env" is not a read of that file. Actual target
  // paths and embedded credential values still receive their normal screening.
  const sensitiveValue = /^(?:write_file|create_file|edit_file|write_local_file)$/.test(tool)
    ? JSON.stringify({
        ...args,
        content: undefined,
        target_content: undefined,
        replacement_content: undefined,
      })
    : value;
  // Discard redirections to null devices and stream handles before looking
  // for writes. A read-only `findstr server\*.js 2>nul` does not edit source.
  const shell = String(args.command || args.script || args.code || '').replace(
    /\d?>&[012]\b|\d?>{1,2}\s*(?:["']?(?:nul|\/dev\/null|\$null)["']?)(?=\s|[;&|]|$)/gi,
    '',
  );
  if (
    /sk-[a-zA-Z0-9_-]{20,}|(?:api[_-]?key|access[_-]?token)\s*["']?\s*[:=]\s*["'][a-zA-Z0-9_-]{24,}/i.test(
      value,
    )
  )
    findings.push('Possible embedded credential');
  const targetPath = String(args.path || args.filepath || args.dest_path || '').replace(/\\/g, '/');
  const isWorkspaceTarget =
    /^(?:(?:\.\/)?workspace|(?:\.\/)?supergence\/projects|[A-Za-z]:\/.*\/workspace(?:\/|$))/i.test(
      targetPath,
    ) || /workspace[\\/]/i.test(String(args.cwd || ''));
  if (
    !isWorkspaceTarget &&
    /write|edit|append|delete|move|copy/.test(tool) &&
    /(?:^|[\\/])(client|server)[\\/]/i.test(targetPath)
  )
    findings.push('Live application source modification requires review');
  if (
    !isWorkspaceTarget &&
    /command|shell|exec/.test(tool) &&
    (/(?:(?:>|>>)\s*["']?(?:\.\/)?[\\/]?(?:client|server)[\\/])|(?:(?:set-content|out-file|remove-item|\brm\b|\bdel\b)\s+["']?(?:\.\/)?[\\/]?(?:client|server)[\\/])/i.test(
      shell,
    ) ||
      (/(?:client|server)[\\/]/i.test(shell) &&
        /(?:write|set-content|out-file|remove-item|\brm\b|\bdel\b|>|replace)/i.test(shell) &&
        !/(?:findstr|netstat|curl|node scripts|workspace)/i.test(shell)))
  )
    findings.push('Shell command may modify live application source');
  if (/\b(rm\s+-rf|format\s+[a-z]:|Remove-Item[^\n]*-Recurse|del\s+\/s|diskpart)\b/i.test(value))
    findings.push('Destructive filesystem command');
  if (
    /\b(Invoke-Expression|iex\b|curl[^\n]*\|\s*(sh|bash)|powershell[^\n]*-enc|-EncodedCommand)\b/i.test(
      value,
    )
  )
    findings.push('Obfuscated or downloaded code execution');
  if (
    /(?:(?:^|[\s/\\"'])\.env\b|credentials\.key|vault\.enc|installation\.key|keyring\.json|id_rsa|id_ed25519|id_ecdsa|Login Data|Cookies\b|\.git[\\/]config|supergence-config\.json)/i.test(
      sensitiveValue,
    ) &&
    !/^(recall_knowledge|retain_knowledge)$/.test(tool)
  )
    findings.push('Credential or sensitive-file access');
  if (
    /action-monitor|evolutionSettings|runtimeAccess\.js|security[\\/]|AGENTS\.md/i.test(value) &&
    /write|exec|command|dynamic/.test(tool)
  )
    findings.push('Security policy or runtime protection modification');
  if (/composio_execute/.test(tool))
    findings.push('External connector action requires explicit review');
  return {
    risk: findings.length
      ? 'high'
      : /exec|command|shell|dynamic|forge|write_local/.test(tool)
        ? 'medium'
        : 'low',
    findings,
  };
}
export class ActionMonitor {
  constructor(directory = evolutionSettings.directory) {
    this.file = path.join(directory, 'actions.jsonl');
    this.events = [];
    this.listeners = new Set();
    try {
      this.events = fs
        .readFileSync(this.file, 'utf8')
        .trim()
        .split('\n')
        .filter(Boolean)
        .slice(-200)
        .map((line) => JSON.parse(line));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  record(tool, decision, assessment = assessAction(tool), extra = {}) {
    const event = {
      id: randomUUID(),
      at: new Date().toISOString(),
      tool: String(tool).slice(0, 100),
      decision,
      ...assessment,
      ...extra,
    };
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.appendFileSync(this.file, JSON.stringify(event) + '\n');
    this.events.push(event);
    this.events = this.events.slice(-200);
    for (const callback of this.listeners) {
      try {
        callback(event);
      } catch {}
    }
    return event;
  }
  snapshot() {
    return {
      events: this.events.slice(-80).reverse(),
      scope:
        'Actions routed through RuntimeAccess and Evolution Studio. Heuristic screening, not a security proof or an OS sandbox.',
    };
  }
}
export const actionMonitor = new ActionMonitor();
