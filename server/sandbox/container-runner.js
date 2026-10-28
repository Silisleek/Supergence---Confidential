import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

export class ContainerRunner {
  constructor({ workspaceDir, useDocker = false, dockerImage = 'node:20-slim' } = {}) {
    this.workspaceDir = workspaceDir || process.cwd();
    this.useDocker = useDocker;
    this.dockerImage = dockerImage;
  }

  /**
   * Executes a command inside the container or sandboxed child process.
   * @param {string} command - Command executable or full command line string
   * @param {string[]} [args=[]] - Optional array of arguments
   * @param {Object} [options={}] - Execution options
   * @param {number} [options.timeoutMs=15000] - Execution timeout
   * @param {string} [options.cwd] - Working directory override
   * @param {Object} [options.env] - Additional environment variables
   * @returns {Promise<{ exitCode: number, stdout: string, stderr: string, timedOut: boolean, durationMs: number }>}
   */
  async exec(command, args = [], options = {}) {
    const timeoutMs = options.timeoutMs || 15000;
    const workingDir = options.cwd || this.workspaceDir;

    let execCmd = command;
    let execArgs = Array.isArray(args) ? [...args] : [];

    // If args is empty and command contains spaces, parse into cmd and args if not using shell
    if (
      execArgs.length === 0 &&
      typeof command === 'string' &&
      command.includes(' ') &&
      this.useDocker
    ) {
      const parts = command.trim().split(/\s+/);
      execCmd = parts[0];
      execArgs = parts.slice(1);
    }

    if (this.useDocker) {
      execCmd = 'docker';
      execArgs = [
        'run',
        '--rm',
        '--network',
        'none',
        '--memory',
        '512m',
        '--cpus',
        '1.0',
        '-v',
        `${workingDir}:/workspace`,
        '-w',
        '/workspace',
        this.dockerImage,
        command,
        ...execArgs,
      ];
    }

    const startTime = Date.now();

    return new Promise((resolve) => {
      const isWin = process.platform === 'win32';
      // Use shell if explicitly requested, or when command is a complex shell string without separate args
      const useShell =
        options.shell !== undefined
          ? options.shell
          : !this.useDocker &&
            execArgs.length === 0 &&
            typeof execCmd === 'string' &&
            /[\s|&<>]/.test(execCmd);

      const child = spawn(execCmd, execArgs, {
        cwd: workingDir,
        shell: useShell,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          PYTHONIOENCODING: 'utf-8',
          PYTHONUTF8: '1',
          ...(options.env || {}),
        },
      });

      let stdout = '';
      let stderr = '';
      let killed = false;

      const timer = setTimeout(() => {
        killed = true;
        try {
          if (isWin && !this.useDocker && child.pid) {
            // Windows kill child tree safely
            child.kill();
          } else {
            child.kill('SIGKILL');
          }
        } catch {}
      }, timeoutMs);

      child.stdout?.on('data', (d) => {
        stdout += d.toString();
      });

      child.stderr?.on('data', (d) => {
        stderr += d.toString();
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        const durationMs = Date.now() - startTime;
        resolve({
          exitCode: 1,
          stdout,
          stderr: (stderr ? stderr + '\n' : '') + err.message,
          timedOut: false,
          durationMs,
        });
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        const durationMs = Date.now() - startTime;
        resolve({
          exitCode: killed ? 124 : (code ?? 0),
          stdout,
          stderr,
          timedOut: killed,
          durationMs,
        });
      });
    });
  }

  /**
   * Automatically dispatches to the appropriate language test runner.
   * @param {string} testFilePath - Path to test file
   * @param {Object} [options={}] - Options
   */
  async executeTest(testFilePath, options = {}) {
    const ext = path.extname(testFilePath).toLowerCase();
    const resolvedPath = path.isAbsolute(testFilePath)
      ? testFilePath
      : path.resolve(this.workspaceDir, testFilePath);

    if (!fs.existsSync(resolvedPath)) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `Test file not found: ${resolvedPath}`,
        timedOut: false,
        durationMs: 0,
      };
    }

    if (ext === '.js' || ext === '.mjs') {
      return this.exec('node', ['--test', resolvedPath], options);
    }
    if (ext === '.py') {
      return this.exec('python', ['-m', 'unittest', resolvedPath], options);
    }
    // Generic fallback: execute file directly with node
    return this.exec('node', [resolvedPath], options);
  }
}

export default ContainerRunner;
