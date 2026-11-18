// SIS 1.0 — Coder Sandbox Runner
// Parses draft sources without running them.

import fs from 'fs';
import path from 'path';
import os from 'node:os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { resolveWithinRoot } from '../utils/path-confinement.js';
import { sandboxEnvironment } from '../security/child-environment.js';

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

export class SandboxRunner {
  constructor(baseDir = SANDBOX_BASE) {
    this.baseDir = baseDir;
  }

  async exec() {
    return {
      exitCode: null,
      stdout: '',
      stderr: 'Runtime execution requires a host-isolated executor.',
      timedOut: false,
      executed: false,
      durationMs: 0,
    };
  }

  async executeTest() {
    return this.exec();
  }

  async execute(draft, runId = `run_${Date.now()}`) {
    const runRoot = runDirectory(this.baseDir, runId);
    const targetFile = draft.targetFile || 'main.js';
    const targetPath = resolveWithinRoot(runRoot, targetFile);
    if (targetPath === runRoot) throw new Error('Target must name a file.');
    const targetExt = path.extname(targetFile).toLowerCase();
    const lang = targetExt.slice(1) || (draft.language || 'javascript').toLowerCase();
    const sandboxDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'sis-syntax-'));

    try {
      const filePath = path.join(
        sandboxDir,
        `source${['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts', '.py', '.json', '.html'].includes(targetExt) ? targetExt : ''}`,
      );
      await fs.promises.writeFile(filePath, draft.code || '', { flag: 'wx' });

      const syntaxResult = await this._checkSyntax(filePath, lang, sandboxDir);
      const runtimeRequested = Boolean(
        draft.execute || draft.testCode?.trim() || draft.runCommand?.trim(),
      );
      const executionUnavailable = syntaxResult.success && runtimeRequested;
      const error = executionUnavailable
        ? (await this.exec()).stderr
        : (syntaxResult.error ?? null);

      return {
        success: syntaxResult.success && !syntaxResult.skipped && !runtimeRequested,
        syntaxValid: syntaxResult.success && !syntaxResult.skipped,
        phase: executionUnavailable ? 'execution-unavailable' : 'syntax',
        executed: false,
        stdout: executionUnavailable ? '' : syntaxResult.stdout || '',
        stderr: error || syntaxResult.stderr || '',
        exitCode:
          executionUnavailable || syntaxResult.skipped ? null : syntaxResult.success ? 0 : 1,
        error,
      };
    } finally {
      await fs.promises.rm(sandboxDir, { recursive: true, force: true });
    }
  }

  async _checkSyntax(filePath, lang, cwd) {
    if (['javascript', 'js', 'mjs', 'cjs', 'typescript', 'ts', 'mts', 'cts'].includes(lang)) {
      try {
        const args = ['--permission', `--allow-fs-read=${cwd}`];
        if (['typescript', 'ts', 'mts', 'cts'].includes(lang))
          args.push('--experimental-strip-types');
        const { stdout, stderr } = await execFileAsync(
          process.execPath,
          [...args, '--check', filePath],
          {
            cwd,
            timeout: 8000,
            env: sandboxEnvironment(),
          },
        );
        return { success: true, stdout, stderr };
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
        const { stdout, stderr } = await execFileAsync(
          'python',
          [
            '-I',
            '-S',
            '-c',
            'import ast, pathlib, sys; ast.parse(pathlib.Path(sys.argv[1]).read_bytes())',
            filePath,
          ],
          {
            cwd,
            timeout: 8000,
            env: sandboxEnvironment({ includePath: true }),
          },
        );
        return { success: true, stdout, stderr };
      } catch (err) {
        // Python may be absent from the host.
        if (err.code === 'ENOENT') {
          return {
            success: true,
            skipped: true,
            stdout: 'Python syntax check unavailable.',
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

    return { success: true, skipped: true, stdout: 'Syntax check unavailable for this file type.' };
  }

  // Validation now removes its private temporary directory before returning.
  cleanup() {}
}

const sandbox = new SandboxRunner();
export default sandbox;
