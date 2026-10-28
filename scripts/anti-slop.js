// SIS 1.0 — Anti-Slop Scanner
// Implements the Anti-Slop Rule Set from the Elite Coding Blueprint (§3.3 & §4.3).
// Scans diffs and proposed code for banned suppression patterns and escape hatches.
// A suppression is a GATE FAILURE unless it carries an explicit justification comment.

import fs from 'node:fs';

export const SLOP_PATTERNS = [
  { id: 'eslint-disable', re: /eslint-disable/, why: 'suppresses the lint gate' },
  { id: 'noqa', re: /#\s*noqa/, why: 'suppresses the lint gate' },
  { id: 'type-ignore', re: /#\s*type:\s*ignore/, why: 'suppresses the type gate' },
  { id: 'ts-expect-error', re: /@ts-expect-error/, why: 'suppresses the type gate' },
  { id: 'rust-allow', re: /#\s*\[allow\(/, why: 'suppresses the Rust lint gate' },
  { id: 'nolint', re: /\/\/\s*nolint/, why: 'suppresses the lint gate' },
  { id: 'suppress-warnings', re: /@SuppressWarnings/, why: 'suppresses the compiler warning' },
  {
    id: 'empty-catch-js',
    re: /catch\s*\([^)]*\)\s*\{\s*\}/,
    why: 'swallows the error without handling or logging',
  },
  {
    id: 'empty-except-py',
    re: /except[^:]*:\s*pass/,
    why: 'swallows the error without handling or logging',
  },
  { id: 'fake-branch', re: /\bif\s*\(\s*false\s*\)/, why: 'dead branch to fake a code path' },
  { id: 'as-any', re: /\bas\s+any\b/, why: 'type-system escape hatch' },
  { id: 'returns-any', re: /->\s*Any\b/, why: 'type-system escape hatch' },
  { id: 'empty-interface', re: /interface\s*\{\s*\}/, why: 'type-system escape hatch' },
  { id: 'eval', re: /\beval\s*\(/, why: 'arbitrary code execution' },
  { id: 'new-function', re: /new\s+Function\s*\(/, why: 'arbitrary code execution' },
];

/**
 * Scan a code string or diff for slop patterns.
 * Returns violations list with justification check.
 *
 * @param {string} text - Code content or diff string
 * @returns {{ clean: boolean, violations: Array<{ id: string, why: string, line: string, lineNumber: number, justified: boolean }> }}
 */
export function scanCodeForSlop(text) {
  if (!text) return { clean: true, violations: [] };
  const lines = String(text).split(/\r?\n/);
  const violations = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // In a diff, only inspect added lines (starting with '+', not '+++')
    if (text.includes('diff --git') || text.includes('@@')) {
      if (!line.startsWith('+') || line.startsWith('+++')) continue;
    }

    for (const pattern of SLOP_PATTERNS) {
      if (pattern.re.test(line)) {
        // Justification check: requires '--' or 'reason:' with explanation of >= 10 chars
        const hasJustification = /--\s+[a-zA-Z0-9_\s]{10,}|reason:\s*[a-zA-Z0-9_\s]{10,}/i.test(
          line,
        );
        violations.push({
          id: pattern.id,
          why: pattern.why,
          line: line.trim(),
          lineNumber: i + 1,
          justified: hasJustification,
        });
      }
    }
  }

  // Gate fails if any violation lacks an explicit justification comment
  const unjustified = violations.filter((v) => !v.justified);
  return {
    clean: unjustified.length === 0,
    violations,
    unjustified,
  };
}

// CLI Execution support
if (process.argv[1] && process.argv[1].endsWith('anti-slop.js')) {
  const isDiffMode = process.argv.includes('--diff');
  let target = '';

  if (isDiffMode) {
    // Read from stdin if piped, or check git diff
    try {
      target = fs.readFileSync(0, 'utf8');
    } catch (_) {}
  } else {
    const fileArg = process.argv[2];
    if (fileArg && fs.existsSync(fileArg)) {
      target = fs.readFileSync(fileArg, 'utf8');
    }
  }

  const result = scanCodeForSlop(target);
  if (!result.clean) {
    console.error(
      `[AntiSlopGate] ❌ Gate failed: Detected ${result.unjustified.length} unjustified slop patterns:`,
    );
    result.unjustified.forEach((u) => {
      console.error(`  - Line ${u.lineNumber}: [${u.id}] ${u.why} -> "${u.line}"`);
    });
    process.exit(1);
  } else {
    console.log('[AntiSlopGate] ✓ Passed: 0 unjustified slop suppressions detected.');
    process.exit(0);
  }
}

export default scanCodeForSlop;
