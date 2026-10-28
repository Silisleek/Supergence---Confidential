// SIS 1.0 — Surgical Diff Patcher
// Implements the Surgical Editing & Diff Budget specification from the Elite Coding Blueprint (§2.4 & §2.5).
// 1. Enforces unique-match exact replacement (fails loudly on ambiguity).
// 2. Enforces hard diff budget (<= 40 changed lines per file unless explicit refactor declared).
// 3. Enforces test-tree protection (source fixes cannot modify test assertions).
// 4. Pre-emptively scans replacement content for slop suppressions before applying.

import fs from 'node:fs';
import path from 'node:path';
import { scanCodeForSlop } from '../../scripts/anti-slop.js';

export class DiffPatcher {
  /**
   * Applies an exact search-and-replace edit to a file.
   * Fails if oldString is not unique, missing, exceeds diff budget, or contains un justified slop.
   *
   * @param {string} filePath - Absolute or relative path to file
   * @param {string} oldString - Exact code block to replace
   * @param {string} newString - Replacement code block
   * @param {Object} [options]
   * @param {number} [options.maxDiffLines=40] - Hard diff ceiling per file
   * @param {boolean} [options.isRefactor=false] - Explicit refactor override
   * @param {string} [options.refactorJustification=''] - Justification if exceeding budget
   * @param {boolean} [options.isTestTask=false] - True if task is explicitly to write/modify tests
   * @returns {{ success: boolean, filePath: string, bytesWritten: number, linesChanged: number }}
   */
  static applyExactReplace(filePath, oldString, newString, options = {}) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`DiffPatcher: File does not exist: ${filePath}`);
    }

    // Anti-Reward-Hacking: Check if source patch touches test file
    const normPath = filePath.replace(/\\/g, '/');
    const isTestFile =
      normPath.includes('.test.') || normPath.includes('__tests__') || normPath.includes('/tests/');
    if (isTestFile && !options.isTestTask) {
      throw new Error(
        `DiffPatcher Security Error: Modifying a test file (${filePath}) during a source code repair is prohibited.`,
      );
    }

    // Pre-emptive Anti-Slop Check: Never allow unjustified suppressions or escape hatches
    const slopCheck = scanCodeForSlop(newString);
    if (!slopCheck.clean) {
      const details = slopCheck.unjustified
        .map((u) => `[${u.id}] ${u.why} ("${u.line}")`)
        .join('; ');
      throw new Error(
        `DiffPatcher Anti-Slop Gate Failed: Replacement contains banned escape hatches: ${details}`,
      );
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const matches = content.split(oldString).length - 1;

    if (matches === 0) {
      throw new Error(`DiffPatcher Error: Target string not found in ${filePath}`);
    }
    if (matches > 1) {
      throw new Error(
        `DiffPatcher Error: Target string matches ${matches} locations in ${filePath}. Provide more surrounding context to disambiguate.`,
      );
    }

    // Diff Budget Check: Calculate lines added / removed
    const oldLines = oldString.split(/\r?\n/).length;
    const newLines = newString.split(/\r?\n/).length;
    const linesChanged = Math.max(oldLines, newLines);
    const maxBudget = options.maxDiffLines || 40;

    if (linesChanged > maxBudget && !options.isRefactor) {
      throw new Error(
        `DiffPatcher Budget Violation: Change touches ${linesChanged} lines, exceeding the hard ${maxBudget}-line budget. Declare change as an explicit refactor with written justification.`,
      );
    }

    const updated = content.replace(oldString, newString);
    fs.writeFileSync(filePath, updated, 'utf8');

    return {
      success: true,
      filePath,
      bytesWritten: Buffer.byteLength(updated, 'utf8'),
      linesChanged,
      oldLines,
      newLines,
    };
  }

  /**
   * Generates a preview diff of the patch without modifying the file on disk.
   */
  static previewPatch(filePath, oldString, newString, options = {}) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = content.split(oldString).length - 1;
    if (matches === 0) {
      return { valid: false, error: `Target string not found in ${filePath}`, matches: 0 };
    }
    if (matches > 1) {
      return {
        valid: false,
        error: `Target string matches ${matches} locations in ${filePath}`,
        matches,
      };
    }

    const oldLines = oldString.split(/\r?\n/).length;
    const newLines = newString.split(/\r?\n/).length;
    const linesChanged = Math.max(oldLines, newLines);

    return {
      valid: true,
      matches: 1,
      oldLength: content.length,
      linesChanged,
      withinBudget: linesChanged <= (options.maxDiffLines || 40),
      diffSummary: `-${oldLines} lines, +${newLines} lines`,
    };
  }

  /**
   * Applies a series of exact replacements in sequence.
   */
  static applyMultiReplace(filePath, replacements = [], options = {}) {
    const results = [];
    for (const { oldString, newString } of replacements) {
      const res = DiffPatcher.applyExactReplace(filePath, oldString, newString, options);
      results.push(res);
    }
    return { success: true, filePath, replacementsCount: results.length, results };
  }
}

export default DiffPatcher;
