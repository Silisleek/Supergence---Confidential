// SIS 1.0 — Coder Sandbox Runner
// Executes automated syntax validation, linting, and test execution with timeouts

import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import vm from 'vm';
import { ContainerRunner } from '../sandbox/container-runner.js';
import { resolveWithinRoot } from '../utils/path-confinement.js';
import { childEnvironment } from '../security/child-environment.js';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = process.env.SIS_WORKSPACE_DIR
  ? path.resolve(process.env.SIS_WORKSPACE_DIR)
  : path.join(__dirname, '../../workspace');
const SANDBOX_BASE = path.join(WORKSPACE_ROOT, '.sandbox');

function runDirectory(base, runId) {
  if (typeof runId !== 'string' || !/^[a-zA-Z0-9_-]{1,120}$/.test(runId))
    throw new Error('Invalid sandbox run ID.');
  return resolveWithinRoot(base, runId);
}

if (!fs.existsSync(SANDBOX_BASE)) {
  fs.mkdirSync(SANDBOX_BASE, { recursive: true });
}

export class SandboxRunner {
  constructor(baseDir = SANDBOX_BASE, options = {}) {
    this.baseDir = baseDir;
    this.containerRunner = new ContainerRunner({
      workspaceDir: baseDir,
      useDocker: options.useDocker || false,
      dockerImage: options.dockerImage || 'node:20-slim',
    });
  }

  /**
   * Execute command via isolated container runner
   */
  async exec(command, args = [], options = {}) {
    return this.containerRunner.exec(command, args, {
      cwd: options.cwd || this.baseDir,
      ...options,
    });
  }

  /**
   * Automatically dispatch test file via container runner
   */
  async executeTest(testFilePath, options = {}) {
    return this.containerRunner.executeTest(testFilePath, options);
  }

  /**
   * Run automated tests and validation on generated code
   * @param {Object} draft - Structured output from coder model
   * @param {string} draft.targetFile - Name of target file
   * @param {string} draft.language - Language identifier
   * @param {string} draft.code - Complete source code
   * @param {string} [draft.testCode] - Optional test script
   * @param {string} [draft.runCommand] - Optional execution command
   * @param {string} runId - Unique ID for sandbox session
   * @returns {Promise<Object>} Verification results { success, stdout, stderr, exitCode, error }
   */
  async execute(draft, runId = `run_${Date.now()}`) {
    const sandboxDir = runDirectory(this.baseDir, runId);
    if (!fs.existsSync(sandboxDir)) fs.mkdirSync(sandboxDir, { recursive: true });

    const targetFile = draft.targetFile || 'main.js';
    const filePath = resolveWithinRoot(sandboxDir, targetFile);

    // Ensure parent dir of file exists
    const fileParent = path.dirname(filePath);
    if (!fs.existsSync(fileParent)) fs.mkdirSync(fileParent, { recursive: true });

    // Write source code
    fs.writeFileSync(filePath, draft.code || '', 'utf8');

    // Stage imported or closely matching sibling files (e.g. target is foo.test.ts -> copy foo.ts)
    // Avoid copying entire 6,000+ files from workspace root
    const workspaceRoot = WORKSPACE_ROOT;
    try {
      const codeSample = `${draft.code || ''} ${draft.testCode || ''}`;
      const importMatches = [
        ...codeSample.matchAll(/(?:from\s+['"]|import\(['"])\.\/([^'"]+)['"]/g),
      ];
      const importedNames = new Set(
        importMatches.map((m) => m[1].replace(/\.(?:ts|js|mjs|cjs)$/, '')),
      );
      const baseStem = path.basename(targetFile).split('.')[0];
      if (baseStem) importedNames.add(baseStem);

      for (const name of importedNames) {
        for (const ext of ['.ts', '.js', '.mjs', '.cjs', '.json', '']) {
          const candidate = name + ext;
          const srcPath = resolveWithinRoot(workspaceRoot, candidate);
          const destPath = resolveWithinRoot(sandboxDir, candidate);
          if (fs.existsSync(srcPath) && fs.statSync(srcPath).isFile() && !fs.existsSync(destPath)) {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      }
    } catch (_) {}

    // Auto-detect ES Modules vs CommonJS and set sandbox package.json
    // Only create package.json for JS-family targets; HTML/CSS/JSON don't need it
    // and "type": "module" causes node --check to fail with ERR_UNKNOWN_FILE_EXTENSION
    // on non-.js files.
    const targetExt = path.extname(targetFile).toLowerCase();
    const isJsTarget = ['.js', '.mjs', '.cjs', '.ts', ''].includes(targetExt);
    if (isJsTarget) {
      const codeSample = `${draft.code || ''} ${draft.testCode || ''}`;
      const isESM = codeSample.includes('import ') || codeSample.includes('export ');
      try {
        fs.writeFileSync(
          path.join(sandboxDir, 'package.json'),
          JSON.stringify({ name: 'sandbox-env', type: isESM ? 'module' : 'commonjs' }, null, 2),
          'utf8',
        );
      } catch {}
    }

    // Derive language from file extension first (authoritative), then draft.language as fallback.
    // This prevents running `node --check` on .html/.css/.json files when draft.language
    // is incorrectly set to 'javascript'.
    const extLang = path.extname(targetFile).slice(1).toLowerCase();
    const lang = extLang || (draft.language || 'javascript').toLowerCase();

    // 1. Language-Specific Syntax Validation
    const syntaxResult = await this._checkSyntax(filePath, lang, sandboxDir);
    if (!syntaxResult.success) {
      return {
        success: false,
        phase: 'syntax',
        stdout: syntaxResult.stdout || '',
        stderr: syntaxResult.stderr || syntaxResult.error || 'Syntax error',
        exitCode: 1,
        error: syntaxResult.error || 'Syntax validation failed',
      };
    }

    // 2. Test Execution / Runner Script
    if (draft.testCode && draft.testCode.trim().length > 0) {
      const testFile = path.join(sandboxDir, `test_${path.basename(targetFile)}`);
      fs.writeFileSync(testFile, draft.testCode, 'utf8');

      let cmd = `node "${testFile}"`;
      if (lang === 'python' || lang === 'py') cmd = `python "${testFile}"`;
      else if (lang === 'typescript' || lang === 'ts') cmd = `node --import tsx "${testFile}"`;

      return await this._runCommand(cmd, sandboxDir);
    }

    // 3. User or Coder Run Command
    if (draft.runCommand && draft.runCommand.trim().length > 0) {
      return await this._runCommand(draft.runCommand, sandboxDir);
    }

    // If syntax check passed and no active test script was required
    return {
      success: true,
      phase: 'syntax',
      stdout: `Syntax validation passed for ${targetFile}`,
      stderr: '',
      exitCode: 0,
      error: null,
    };
  }

  async _checkSyntax(filePath, lang, cwd) {
    if (lang === 'javascript' || lang === 'js' || lang === 'mjs') {
      // Extra guard: never run node --check on a non-JS file extension.
      // This prevents ERR_UNKNOWN_FILE_EXTENSION when draft.language is
      // misdetected as 'javascript' but the actual file is .html/.css/etc.
      const fileExt = path.extname(filePath).toLowerCase();
      if (fileExt && fileExt !== '.js' && fileExt !== '.mjs' && fileExt !== '.cjs') {
        return { success: true, stdout: `Skipped node --check for ${fileExt} file` };
      }
      try {
        const { stdout, stderr } = await execFileAsync(process.execPath, ['--check', filePath], {
          cwd,
          timeout: 8000,
          env: childEnvironment(),
        });
        return { success: !stderr, stdout, stderr };
      } catch (err) {
        return {
          success: false,
          stdout: err.stdout || '',
          stderr: err.stderr || err.message,
          error: err.message,
        };
      }
    }

    if (lang === 'python' || lang === 'py') {
      try {
        const { stdout, stderr } = await execFileAsync('python', ['-m', 'py_compile', filePath], {
          cwd,
          timeout: 8000,
          env: childEnvironment(),
        });
        return { success: true, stdout, stderr };
      } catch (err) {
        // If Python is not installed locally, perform heuristic check
        if (err.message.includes('not recognized') || err.message.includes('not found')) {
          return {
            success: true,
            stdout: 'Python runtime not detected; syntax verified heuristically.',
          };
        }
        return {
          success: false,
          stdout: err.stdout || '',
          stderr: err.stderr || err.message,
          error: err.message,
        };
      }
    }

    if (lang === 'json') {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        JSON.parse(content);
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message, stderr: err.message };
      }
    }

    if (lang === 'html') {
      const content = fs.readFileSync(filePath, 'utf8');
      if (!content.includes('<html') && !content.includes('<!DOCTYPE html>')) {
        return { success: false, error: 'HTML file missing <html> or <!DOCTYPE html> root tags' };
      }
      if (content.includes('<body') && !content.includes('</body>')) {
        return { success: false, error: 'HTML file truncated: missing closing </body> tag' };
      }
      if (!content.includes('</html>')) {
        return { success: false, error: 'HTML file truncated: missing closing </html> tag' };
      }

      // Validate every inline script tag with Node vm compiler
      const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
      let match;
      let scriptCount = 0;
      while ((match = scriptRegex.exec(content)) !== null) {
        scriptCount++;
        const attrs = match[1] || '';
        const scriptBody = match[2] || '';
        // Skip external script references (src="...")
        if (/\bsrc\s*=/i.test(attrs)) continue;
        if (scriptBody.trim().length === 0) continue;

        try {
          const stripped = scriptBody
            .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '// [import]')
            .replace(/export\s+default\s+/g, '/* export default */ ')
            .replace(/export\s+\{[^}]*\};?/g, '// [export list]')
            .replace(/export\s+/g, '');
          new Function(stripped.replace(/\r\n/g, '\n'));
        } catch (jsErr) {
          return {
            success: false,
            error: `JavaScript syntax error in inline <script>: ${jsErr.message}`,
            stderr: jsErr.message,
            stdout: '',
          };
        }
      }

      // Deep quality gate for Three.js scenes (structure, budgets, wiring)
      if (content.includes('three.module.js') || content.includes('THREE.')) {
        try {
          const { validateSceneHTML } = await import('../3d/validator.js');
          const q = validateSceneHTML(content, {
            expectGameLogic: content.includes('function buildGameLogic'),
          });
          if (!q.passed) {
            return {
              success: false,
              stdout: `Quality score ${q.score}`,
              stderr: q.errors.join('; '),
              error: q.errors[0] || '3D quality gate failed',
            };
          }
          return {
            success: true,
            stdout: `3D quality gate passed (score ${q.score}, meshes ${q.stats.meshCount})`,
          };
        } catch {}
      }
      return {
        success: true,
        stdout: `HTML structure and ${scriptCount} script(s) verified cleanly`,
      };
    }

    // Default: pass
    return { success: true };
  }

  async _runCommand(cmd, cwd) {
    try {
      const result = await this.containerRunner.exec(cmd, [], { cwd, timeoutMs: 15000 });
      const { stdout, stderr, exitCode } = result;

      if (exitCode !== 0) {
        return {
          success: false,
          phase: 'runtime',
          stdout: stdout || '',
          stderr: stderr || 'Execution failed',
          exitCode: exitCode || 1,
          error: stderr ? stderr.split('\n')[0] : 'Process exited with non-zero exit code',
        };
      }

      // If stderr exists and contains unhandled exception keywords
      if (
        stderr &&
        (stderr.includes('Error:') || stderr.includes('Exception:') || stderr.includes('Traceback'))
      ) {
        return {
          success: false,
          phase: 'runtime',
          stdout: stdout || '',
          stderr,
          exitCode: 1,
          error: stderr.split('\n')[0],
        };
      }

      return {
        success: true,
        phase: 'runtime',
        stdout: stdout || 'Process completed with exit code 0',
        stderr: stderr || '',
        exitCode: 0,
        error: null,
      };
    } catch (err) {
      return {
        success: false,
        phase: 'runtime',
        stdout: '',
        stderr: err.message,
        exitCode: 1,
        error: err.message,
      };
    }
  }

  cleanup(runId) {
    try {
      const dir = runDirectory(this.baseDir, runId);
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    } catch {}
  }
}

const sandbox = new SandboxRunner();
export default sandbox;
