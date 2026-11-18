import { execFile } from 'node:child_process';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { promisify } from 'node:util';
import { sandboxEnvironment } from '../security/child-environment.js';
import { resolveWithinRoot } from '../utils/path-confinement.js';

const execFileAsync = promisify(execFile);
const nodeExtensions = new Set(['.js', '.mjs', '.cjs']);

/** Node permission limits for trusted scripts. Model-generated programs need an OS boundary. */
export class ContainerRunner {
  constructor({ workspaceDir = process.cwd() } = {}) {
    this.workspaceDir = path.resolve(workspaceDir);
  }

  async exec(command, args = [], options = {}) {
    const started = performance.now();
    try {
      if (command !== 'node' && command !== process.execPath) {
        throw new Error('Only Node scripts can run through this runner.');
      }
      const cwd = resolveWithinRoot(this.workspaceDir, options.cwd || this.workspaceDir);
      const nodeArgs = this._scriptArgs(cwd, args);
      const realCwd = realpathSync.native(cwd);
      const { stdout, stderr } = await execFileAsync(
        process.execPath,
        ['--permission', `--allow-fs-read=${realCwd}`, ...nodeArgs],
        {
          cwd: realCwd,
          env: { ...sandboxEnvironment(), NODE_ENV: 'test' },
          timeout: options.timeoutMs ?? 15000,
          maxBuffer: 1024 * 1024,
          windowsHide: true,
        },
      );
      return {
        exitCode: 0,
        stdout,
        stderr,
        timedOut: false,
        durationMs: performance.now() - started,
      };
    } catch (error) {
      return {
        exitCode: error.killed ? 124 : Number.isInteger(error.code) ? error.code : 1,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        timedOut: Boolean(error.killed),
        durationMs: performance.now() - started,
      };
    }
  }

  _scriptArgs(cwd, args) {
    if (args.length === 2 && args[0] === '-e' && typeof args[1] === 'string') return args;
    const testing = args.length === 2 && args[0] === '--test';
    const entry = testing ? args[1] : args.length === 1 ? args[0] : null;
    if (
      typeof entry !== 'string' ||
      entry.startsWith('-') ||
      !nodeExtensions.has(path.extname(entry).toLowerCase())
    ) {
      throw new Error('Expected a JavaScript entry file or an explicit Node test invocation.');
    }
    const file = resolveWithinRoot(cwd, entry);
    if (!testing) return [path.relative(cwd, file)];
    return [
      '--test',
      '--experimental-test-isolation=none',
      '--test-reporter=tap',
      path.relative(cwd, file).split(path.sep).join('/'),
    ];
  }

  async executeTest(testFilePath, options = {}) {
    const result = await this.exec('node', ['--test', testFilePath], options);
    const counts = Object.fromEntries(
      [...result.stdout.matchAll(/^# (tests|pass|fail) (\d+)\s*$/gm)].map(([, name, count]) => [
        name,
        Number(count),
      ]),
    );
    const testSummary = {
      total: counts.tests ?? 0,
      passed: counts.pass ?? 0,
      failed: counts.fail ?? 0,
    };
    return { ...result, executed: testSummary.total > 0 && !result.timedOut, testSummary };
  }
}

export default ContainerRunner;
