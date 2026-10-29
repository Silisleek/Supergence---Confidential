// SIS 1.0 — Autonomous Code Auto-Healer & Surgical Repair Engine
// Diagnoses runtime errors, syntax errors, and defect traces;
// synthesizes surgical patches, verifies in sandbox, and updates workspace automatically.
// STRICT ZERO HARDCODING.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callAI, PREMIUM_MODEL } from '../api/openrouter.js';
import sandbox from '../coder/sandbox.js';
import workspace from '../workspace/manager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = process.env.SIS_WORKSPACE_DIR
  ? path.resolve(process.env.SIS_WORKSPACE_DIR)
  : path.join(__dirname, '../../workspace');

export class AutoHealer {
  constructor() {
    this.maxAttempts = 3;
  }

  /**
   * Resolve an absolute workspace path safely
   */
  resolveFilePath(target) {
    if (!target) return null;
    const clean = String(target)
      .trim()
      .replace(/^workspace[\\\/]/i, '');
    const candidates = [
      path.isAbsolute(target) ? target : null,
      path.join(WORKSPACE_DIR, target),
      path.join(WORKSPACE_DIR, clean),
      path.join(workspace.root, target),
      path.join(workspace.root, clean),
    ].filter(Boolean);

    for (const c of candidates) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) {
        return c;
      }
    }
    return null;
  }

  /**
   * Autonomously heal a broken file given defect telemetry or user feedback
   *
   * @param {Object} options
   * @param {string} options.filename - Name or relative path of the broken file
   * @param {string} [options.filepath] - Absolute path if known
   * @param {string} options.error - Error message or exception string
   * @param {number} [options.lineno] - Failing line number
   * @param {number} [options.colno] - Failing column number
   * @param {string} [options.stack] - Full error stack trace
   * @param {string} [options.userContext] - Additional user prompt or description
   * @returns {Promise<Object>}
   */
  async healFile(options = {}) {
    const rawTarget = options.filepath || options.filename;
    let fullPath = this.resolveFilePath(rawTarget);

    // If file not directly found, attempt fuzzy search in workspace
    if (!fullPath && options.filename) {
      const bn = path.basename(options.filename);
      const matches = workspace.searchFiles(bn);
      if (matches.length > 0) {
        fullPath = path.join(workspace.root, matches[0].path);
      }
    }

    if (!fullPath || !fs.existsSync(fullPath)) {
      throw new Error(`Target file for auto-healing not found: "${rawTarget || 'unknown'}"`);
    }

    const filename = path.basename(fullPath);
    const originalCode = fs.readFileSync(fullPath, 'utf8');
    const ext = path.extname(filename).slice(1).toLowerCase();
    const extLangMap = {
      js: 'javascript',
      mjs: 'javascript',
      ts: 'typescript',
      html: 'html',
      css: 'css',
      py: 'python',
      json: 'json',
      sh: 'bash',
      bash: 'bash',
      sql: 'sql',
    };
    const language = extLangMap[ext] || 'text';

    if (!options.lineno) {
      const lineMatch =
        (options.error || '').match(/:(\d+)(?::\d+)?/) ||
        (options.error || '').match(/line\s+(\d+)/i);
      if (lineMatch) options.lineno = parseInt(lineMatch[1], 10);
    }

    console.log(
      `[AutoHealer] ⚡ Diagnosing defect in "${filename}" (line ${options.lineno || 'unknown'})...`,
    );
    console.log(`[AutoHealer] Defect: ${options.error || 'Syntax / Runtime flaw'}`);

    let currentCode = originalCode;
    let rootCause = 'Identified and repaired runtime defect.';
    let attempts = 0;
    let verified = false;
    let lastErrorTrace = options.error || 'Unknown runtime defect';
    const runId = `heal_${Date.now()}`;

    while (attempts < this.maxAttempts && !verified) {
      attempts++;
      console.log(
        `[AutoHealer] Attempt ${attempts}/${this.maxAttempts} — synthesizing surgical repair...`,
      );

      // Extract localized context window around failing line if known
      let lineContext = '';
      if (options.lineno && options.lineno > 0) {
        const lines = originalCode.split('\n');
        const start = Math.max(0, options.lineno - 15);
        const end = Math.min(lines.length, options.lineno + 15);
        lineContext =
          `\n### FOCUSED SURROUNDING CODE (Lines ${start + 1} to ${end}):\n` +
          lines
            .slice(start, end)
            .map((l, i) => `${start + i + 1}: ${l}`)
            .join('\n');
      }

      const prompt = `You are the SIS Master Autonomous Code Healer & Surgical Repair Engine.
Your mission is to perform a surgical fix on the broken file "${filename}" with ZERO regressions.

### DEFECT TELEMETRY:
- Target File: ${filename} (${language})
- Error Message: ${lastErrorTrace}
${options.lineno ? `- Failing Line Number: ${options.lineno}` : ''}
${options.colno ? `- Failing Column: ${options.colno}` : ''}
${options.stack ? `- Stack Trace:\n${options.stack.slice(0, 1000)}` : ''}
${options.userContext ? `- User Feedback: "${options.userContext}"` : ''}
${lineContext}

### COMPLETE SOURCE CODE:
\`\`\`${language}
${currentCode.length > 24000 ? currentCode.slice(0, 24000) + '\n// ... [trimmed for model context budget — output complete repaired file]' : currentCode}
\`\`\`

### SURGICAL INSTRUCTIONS:
1. Pinpoint the exact root cause of the failure (e.g. syntax error, undefined reference, missing script/library import, unclosed tag, API mismatch, unhandled promise).
2. Fix the defect with surgical precision. Preserve ALL existing architecture, styling, controls, animations, and functionality.
3. If it is an HTML file or web app, you MUST output the COMPLETE HTML document starting with <!DOCTYPE html> and ending with </html>. Do NOT return an isolated snippet or partial fragment.
4. If it is an HTML/Three.js simulation or web app, ensure all required external CDNs (Three.js, Tailwind, etc.) are valid and accessible.
5. Output your response in this EXACT format:
ROOT_CAUSE: <Concise 1-sentence technical explanation of the defect and the surgical fix>

\`\`\`${language}
<COMPLETE FIXED SOURCE CODE WITHOUT PLACEHOLDERS>
\`\`\`
Never truncate, never use "// rest of code here", never leave fences unclosed.`;

      const aiResponse = await callAI({
        model: PREMIUM_MODEL,
        systemPrompt:
          'You are an elite autonomous code healing engine. Output ROOT_CAUSE followed by the complete, fully repaired code block. Zero placeholders.',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2, // Low temperature for maximum precision
        maxTokens: 5000,
      });

      const rawOutput = aiResponse.choices[0]?.message?.content || '';

      // Extract root cause
      const causeMatch = rawOutput.match(/ROOT_CAUSE:\s*(.+?)(?:\r?\n|```|$)/i);
      if (causeMatch) {
        rootCause = causeMatch[1].trim();
      }

      // Extract repaired code block — search for all code fences and prioritize full documents or the largest code block
      let repairedCode = '';
      const allFences = [
        ...rawOutput.matchAll(/```(?:[a-zA-Z0-9_\-\.]+)?\s*[\r\n]([\s\S]*?)(?:```|$)/g),
      ];
      if (allFences.length > 0) {
        // Find if any block is a complete HTML document
        const htmlDocBlock = allFences.find(
          (b) => b[1].includes('<!DOCTYPE html>') || b[1].includes('<html'),
        );
        if (htmlDocBlock) {
          repairedCode = htmlDocBlock[1].trim();
        } else {
          // Sort descending by length so full implementations are chosen over short illustrative snippets
          const sorted = allFences
            .map((b) => b[1].trim())
            .filter((code) => code.length >= 20)
            .sort((a, b) => b.length - a.length);
          if (sorted.length > 0) {
            repairedCode = sorted[0];
          }
        }
      }
      if (!repairedCode && (rawOutput.includes('<!DOCTYPE html>') || rawOutput.includes('<html'))) {
        const docMatch = rawOutput.match(/(<!DOCTYPE html>[\s\S]*?(?:<\/html>|$))/i);
        if (docMatch) repairedCode = docMatch[1].trim();
      }

      if (!repairedCode || repairedCode.length < 20) {
        console.warn(`[AutoHealer] Attempt ${attempts}: No code block extracted from AI response`);
        lastErrorTrace = 'AI response did not contain a valid formatted code block.';
        continue;
      }

      // If target is an HTML document and the repaired snippet is pure JavaScript, splice into the main script block
      if (
        filename.endsWith('.html') &&
        originalCode.includes('<script') &&
        !repairedCode.includes('<html') &&
        !repairedCode.includes('<!DOCTYPE')
      ) {
        const scripts = [
          ...originalCode.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi),
        ];
        if (scripts.length > 0) {
          // Sort descending by length to find the main application logic script
          scripts.sort((a, b) => b[1].length - a[1].length);
          const targetScript = scripts[0];
          const scriptContent = targetScript[1];

          // Check if repairedCode is a function declaration (e.g. function buildModel ...)
          const funcMatch = repairedCode.match(/function\s+([a-zA-Z0-9_$]+)\s*\(/);
          if (funcMatch && scriptContent.includes(`function ${funcMatch[1]}`)) {
            console.log(
              `[AutoHealer] Detected surgical function replacement for "${funcMatch[1]}" (${repairedCode.length} bytes). Splicing...`,
            );
            const funcName = funcMatch[1];
            // Find start of function
            const fIdx = scriptContent.indexOf(`function ${funcName}`);
            if (fIdx !== -1) {
              // Extract balanced braces for the old function
              let openB = 0;
              let foundB = false;
              let endIdx = -1;
              for (let i = fIdx; i < scriptContent.length; i++) {
                if (scriptContent[i] === '{') {
                  openB++;
                  foundB = true;
                } else if (scriptContent[i] === '}') {
                  openB--;
                  if (foundB && openB === 0) {
                    endIdx = i + 1;
                    break;
                  }
                }
              }
              if (endIdx !== -1) {
                const updatedScript =
                  scriptContent.slice(0, fIdx) + repairedCode + scriptContent.slice(endIdx);
                repairedCode = originalCode.replace(scriptContent, updatedScript);
              }
            }
          } else if (repairedCode.length >= Math.max(scriptContent.length * 0.45, 1200)) {
            console.log(
              `[AutoHealer] Detected surgical full JavaScript script for HTML file (${repairedCode.length} bytes). Splicing into main <script> block...`,
            );
            repairedCode = originalCode.replace(scriptContent, `\n${repairedCode}\n`);
          } else {
            console.warn(
              `[AutoHealer] Repaired snippet is partial (${repairedCode.length} vs script ${scriptContent.length} bytes). For HTML files, a complete document or complete script is required.`,
            );
            lastErrorTrace =
              'For HTML files, you must output either the COMPLETE HTML document starting with <!DOCTYPE html>, or the full function definition starting with function funcName(...) { ... }. Do not output an incomplete code fragment.';
            continue;
          }
        }
      }

      // Strict Regression Guards: prevent truncations and feature dropping
      if (originalCode && originalCode.length >= 1000) {
        if (repairedCode.length < originalCode.length * 0.45) {
          console.warn(
            `[AutoHealer] Attempt ${attempts}: Repaired code truncated (${repairedCode.length} vs ${originalCode.length} bytes). Rejecting.`,
          );
          lastErrorTrace = `Repair was severely truncated (${repairedCode.length} bytes vs original ${originalCode.length} bytes). Output the COMPLETE file without omitting sections.`;
          continue;
        }
        if (originalCode.includes('<script') && !repairedCode.includes('<script')) {
          console.warn(
            `[AutoHealer] Attempt ${attempts}: Repaired code dropped <script> tags. Rejecting.`,
          );
          lastErrorTrace =
            'Repaired code dropped all <script> tags. You must preserve the application script.';
          continue;
        }
        if (originalCode.includes('<canvas') && !repairedCode.includes('<canvas')) {
          console.warn(
            `[AutoHealer] Attempt ${attempts}: Repaired code dropped <canvas> elements. Rejecting.`,
          );
          lastErrorTrace =
            'Repaired code dropped canvas elements. You must preserve all canvas viewports.';
          continue;
        }
      }

      currentCode = repairedCode;

      // Run automated sandbox verification
      console.log(`[AutoHealer] Running sandbox verification on repaired code...`);
      const testResult = await sandbox.execute(
        {
          targetFile: filename,
          language,
          code: repairedCode,
        },
        `${runId}_att${attempts}`,
      );

      if (testResult.success) {
        verified = true;
        console.log(`[AutoHealer] ✓ Verification passed on attempt ${attempts}!`);
        break;
      } else {
        lastErrorTrace =
          testResult.stderr ||
          testResult.error ||
          testResult.stdout ||
          'Sandbox verification failed';
        console.warn(
          `[AutoHealer] Attempt ${attempts} failed sandbox check: ${lastErrorTrace.slice(0, 120)}`,
        );
      }
    }

    // Persist ONLY verified repaired code to workspace (do not overwrite with broken sandbox code)
    if (verified) {
      fs.writeFileSync(fullPath, currentCode, 'utf8');
    }

    const diff = this.computeDiff(originalCode, currentCode);

    console.log(`[AutoHealer] 🚀 Repaired "${filename}" — ${diff.summary}. Verified: ${verified}`);

    return {
      success: true,
      filename,
      filepath: fullPath,
      language,
      code: currentCode,
      rootCause,
      diff,
      verified,
      attempts,
    };
  }

  /**
   * Compute a clean line-based diff summary
   */
  computeDiff(oldText, newText) {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');

    let added = 0;
    let deleted = 0;
    const oldSet = new Set(oldLines);
    const newSet = new Set(newLines);

    for (const l of newLines) {
      if (!oldSet.has(l) && l.trim().length > 0) added++;
    }
    for (const l of oldLines) {
      if (!newSet.has(l) && l.trim().length > 0) deleted++;
    }

    // Find first changed line range for concise before/after display
    let firstDiffLine = 1;
    for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
      if (oldLines[i] !== newLines[i]) {
        firstDiffLine = i + 1;
        break;
      }
    }

    const beforeSnippet = oldLines
      .slice(Math.max(0, firstDiffLine - 3), Math.min(oldLines.length, firstDiffLine + 6))
      .join('\n');
    const afterSnippet = newLines
      .slice(Math.max(0, firstDiffLine - 3), Math.min(newLines.length, firstDiffLine + 6))
      .join('\n');

    return {
      linesAdded: added,
      linesDeleted: deleted,
      firstDiffLine,
      summary: `+${added} / -${deleted} lines modified (starting line ${firstDiffLine})`,
      beforeSnippet,
      afterSnippet,
    };
  }
}

export const autoHealer = new AutoHealer();
export default autoHealer;
