// SIS 1.0 — OpenClaw Computer Control Engine
// Inspired by OpenClaw (Autonomous Task Orchestrator & Full Computer/OS Execution)
// Capabilities:
// 1. Direct Shell Execution (PowerShell, CMD, Bash) with stdout/stderr capture
// 2. Real System Telemetry (CPU, RAM, Disks, Uptime, Network)
// 3. Process Management (List running processes, kill processes with safety boundaries)
// 4. File System Navigation & Manipulation (Browse, Read, Write, Delete, Search)
// 5. Desktop Application Launching & OS Automation
// 6. Real-time WebSocket streaming of terminal output to Supergence Workbench

import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, execFile, spawn } from 'child_process';
import { promisify } from 'util';
import brain from '../orchestrator/brain.js';
import { childEnvironment } from '../security/child-environment.js';
import { resolveWithinRoot } from '../utils/path-confinement.js';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../');
const WORKSPACE_DIR = process.env.SIS_WORKSPACE_DIR
  ? path.resolve(process.env.SIS_WORKSPACE_DIR)
  : path.join(ROOT_DIR, 'workspace');

export class OpenClawController {
  constructor() {
    this.name = 'OpenClaw Computer Controller';
    this.version = '2.4.0';
    this.status = 'READY_FULL_CONTROL';
    this.isProtected = true;
    this.history = [];
    this.maxHistory = 100;
    this._ensureWorkspace();
  }

  isDeadlyCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return false;
    const lower = cmd.toLowerCase().trim();
    // System disk wipe, raw formatting, or partition manipulation
    if (/format\s+[a-z]:/i.test(lower) || /format-volume/i.test(lower) || /diskpart/i.test(lower))
      return true;
    if (/rm\s+-rf\s+[\/\\]/i.test(lower) || /rmdir\s+\/s\s+\/q\s+[c-z]:[\\\/]?$/i.test(lower))
      return true;
    if (/remove-item\s+.*-recurse.*[c-z]:[\\\/]?$/i.test(lower)) return true;
    if (/(?:del|rmdir|remove-item)\s+.*\\windows\\system32/i.test(lower)) return true;
    if (/taskkill\s+.*(?:svchost|csrss|lsass|smss)\.exe/i.test(lower)) return true;
    if (/reg\s+delete\s+hklm/i.test(lower) || /remove-item\s+hklm:/i.test(lower)) return true;
    if (/dd\s+if=.*of=\/dev\/sd/i.test(lower) || /mkfs\./i.test(lower)) return true;
    return false;
  }

  isHighRiskCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return false;
    const lower = cmd.toLowerCase().trim();
    if (/(?:del|rm|remove-item)\s+.*-recurse/i.test(lower) && !lower.includes('workspace'))
      return true;
    if (/(?:shutdown|restart-computer|Stop-Computer)/i.test(lower)) return true;
    if (/drop\s+database/i.test(lower) || /truncate\s+table/i.test(lower)) return true;
    if (/(?:npm\s+uninstall|pip\s+uninstall)\s+-g/i.test(lower)) return true;
    return false;
  }

  _ensureWorkspace() {
    try {
      if (!fs.existsSync(WORKSPACE_DIR)) {
        fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
      }
    } catch (e) {
      console.warn('[OpenClaw] Workspace notice:', e.message);
    }
  }

  // ─── 1. Shell & Terminal Execution ───
  async executeShell(command, options = {}) {
    if (!command || typeof command !== 'string' || !command.trim()) {
      throw new Error('Command must be a non-empty string');
    }

    const trimmed = command.trim();
    const cwd = options.cwd ? path.resolve(ROOT_DIR, options.cwd) : ROOT_DIR;
    const timeout = Number(options.timeout) || 45000;
    const startTime = Date.now();

    // ── SECURITY GATE: BLOCK DEADLY & GUARD HIGH-RISK COMMANDS ──
    if (this.isDeadlyCommand(trimmed)) {
      console.warn(`[OpenClaw Security] 🛑 BLOCKED DEADLY COMMAND: "${trimmed}"`);
      const blockedResult = {
        success: false,
        blocked: true,
        command: trimmed,
        cwd,
        stdout: '',
        stderr:
          'SECURITY INTERCEPTION: Execution permanently blocked. Command contains lethal or destructive system operations.',
        exitCode: 403,
        durationMs: 0,
        timestamp: new Date().toISOString(),
      };
      this._recordHistory('BLOCKED_DEADLY_COMMAND', blockedResult);
      brain.broadcast('openclaw-security-interception', blockedResult);
      return blockedResult;
    }

    if (this.isHighRiskCommand(trimmed) && !options.authorized) {
      console.warn(
        `[OpenClaw Security] ⚠️ HIGH-RISK COMMAND REQUIRES USER PERMISSION: "${trimmed}"`,
      );
      try {
        const { default: checkpointManager } = await import('./checkpointManager.js');
        const chk = checkpointManager.createCheckpoint({
          title: `Privileged Command Authorization: "${trimmed.slice(0, 40)}"`,
          description: `Supergence proposes executing a high-risk system command that requires your explicit permission.`,
          riskLevel: 'HIGH',
          metadata: { command: trimmed, cwd },
        });
        const pendingResult = {
          success: false,
          checkpointRequired: true,
          checkpointId: chk.id,
          command: trimmed,
          cwd,
          stdout: '',
          stderr: `PERMISSION REQUIRED: Command halted at checkpoint ${chk.id}. Awaiting user authorization.`,
          exitCode: 401,
          durationMs: 0,
          timestamp: new Date().toISOString(),
        };
        this._recordHistory('PERMISSION_CHECKPOINT_REQUIRED', pendingResult);
        return pendingResult;
      } catch (_) {}
    }

    // Broadcast terminal command start event
    brain.broadcast('openclaw-terminal-executing', {
      command: trimmed,
      cwd,
      timestamp: new Date().toISOString(),
    });

    try {
      // Use powershell on Windows, /bin/sh on POSIX
      const isWin = process.platform === 'win32';
      const executionOptions = {
        cwd,
        timeout,
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true,
        env: childEnvironment(),
      };
      // Pass the script as one process argument. Wrapping/escaping it through
      // cmd.exe first changes nested quotes and can turn commands into strings.
      const { stdout, stderr } = isWin
        ? await execFileAsync(
            'powershell.exe',
            ['-NoProfile', '-NonInteractive', '-Command', trimmed],
            executionOptions,
          )
        : await execAsync(trimmed, executionOptions);

      const durationMs = Date.now() - startTime;
      const result = {
        success: true,
        command: trimmed,
        cwd,
        stdout: stdout || '',
        stderr: stderr || '',
        exitCode: 0,
        durationMs,
        timestamp: new Date().toISOString(),
      };

      this._recordHistory('EXECUTE_SHELL', result);
      brain.broadcast('openclaw-terminal-completed', result);
      return result;
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errorResult = {
        success: false,
        command: trimmed,
        cwd,
        stdout: err.stdout || '',
        stderr: err.stderr || err.message,
        exitCode: err.code || 1,
        durationMs,
        timestamp: new Date().toISOString(),
      };

      this._recordHistory('EXECUTE_SHELL', errorResult);
      brain.broadcast('openclaw-terminal-failed', errorResult);
      return errorResult;
    }
  }

  // ─── 2. Real System Telemetry & Diagnostics ───
  async getSystemTelemetry() {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = Math.round((usedMem / totalMem) * 1000) / 10;

    const now = Date.now();
    if (!this._cachedDrives) {
      this._cachedDrives = [];
      this._lastDrivesScan = 0;
    }
    if (process.platform === 'win32' && now - (this._lastDrivesScan || 0) > 300000) {
      this._lastDrivesScan = now;
      execAsync(
        'powershell -NoProfile -Command "Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID, FreeSpace, Size, VolumeName | ConvertTo-Json"',
      )
        .then(({ stdout }) => {
          try {
            const parsed = JSON.parse(stdout);
            const list = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
            this._cachedDrives = list.map((d) => ({
              device: d.DeviceID,
              name: d.VolumeName || 'Local Disk',
              totalGB: d.Size ? Math.round((d.Size / (1024 * 1024 * 1024)) * 10) / 10 : 0,
              freeGB: d.FreeSpace ? Math.round((d.FreeSpace / (1024 * 1024 * 1024)) * 10) / 10 : 0,
              usedGB:
                d.Size && d.FreeSpace
                  ? Math.round(((d.Size - d.FreeSpace) / (1024 * 1024 * 1024)) * 10) / 10
                  : 0,
            }));
          } catch (_) {}
        })
        .catch(() => {});
    }
    const drives = this._cachedDrives;

    return {
      success: true,
      platform: os.platform(),
      type: os.type(),
      release: os.release(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptimeSeconds: Math.floor(os.uptime()),
      cpu: {
        model: cpus[0]?.model || 'Generic Processor',
        cores: cpus.length,
        speedMHz: cpus[0]?.speed || 0,
      },
      memory: {
        totalBytes: totalMem,
        freeBytes: freeMem,
        usedBytes: usedMem,
        totalGB: Math.round((totalMem / (1024 * 1024 * 1024)) * 10) / 10,
        freeGB: Math.round((freeMem / (1024 * 1024 * 1024)) * 10) / 10,
        usedGB: Math.round((usedMem / (1024 * 1024 * 1024)) * 10) / 10,
        usagePercentage: memUsagePercent,
      },
      drives,
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsageMB: Math.round((process.memoryUsage().rss / (1024 * 1024)) * 10) / 10,
      },
      networkInterfaces: Object.keys(os.networkInterfaces()).filter(
        (k) => !k.startsWith('vEthernet'),
      ),
      timestamp: new Date().toISOString(),
    };
  }

  // ─── 3. Real Process Inspection & Management ───
  async listProcesses(filter = '', limit = 40) {
    if (process.platform === 'win32') {
      try {
        const filterCmd = filter ? `| Where-Object { $_.ProcessName -like "*${filter}*" }` : '';
        const psCmd = `Get-Process ${filterCmd} | Sort-Object -Descending WorkingSet64 | Select-Object -First ${limit} Id, ProcessName, WorkingSet64, CPU, Responding | ConvertTo-Json`;
        const { stdout } = await execAsync(`powershell -NoProfile -Command "${psCmd}"`);
        const parsed = JSON.parse(stdout);
        const list = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
        const formatted = list.map((p) => ({
          pid: p.Id,
          name: p.ProcessName,
          memoryMB: Math.round((p.WorkingSet64 / (1024 * 1024)) * 10) / 10,
          cpuSeconds: typeof p.CPU === 'number' ? Math.round(p.CPU * 10) / 10 : 0,
          responding: p.Responding !== false,
        }));
        return { success: true, count: formatted.length, processes: formatted };
      } catch (err) {
        return { success: false, error: err.message, processes: [] };
      }
    } else {
      try {
        const { stdout } = await execAsync(`ps aux --sort=-%mem | head -n ${limit}`);
        return { success: true, raw: stdout };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  }

  async killProcess(pid, processName = '') {
    const targetPid = Number(pid);
    if (!targetPid || isNaN(targetPid)) {
      throw new Error('Valid numeric PID is required');
    }

    // Safety guardrails: Do not terminate current Node server or core OS processes
    if (targetPid === process.pid) {
      throw new Error('Refused to kill current Supergence server process.');
    }
    if (targetPid <= 4) {
      throw new Error('Refused to kill system root processes (PID <= 4).');
    }

    try {
      if (process.platform === 'win32') {
        await execAsync(`taskkill /F /PID ${targetPid}`);
      } else {
        await execAsync(`kill -9 ${targetPid}`);
      }

      const entry = {
        action: 'KILL_PROCESS',
        pid: targetPid,
        name: processName,
        success: true,
        timestamp: new Date().toISOString(),
      };
      this._recordHistory('PROCESS_TERMINATED', entry);
      brain.broadcast('openclaw-process-killed', entry);
      return entry;
    } catch (err) {
      throw new Error(`Failed to kill process PID ${targetPid}: ${err.message}`, { cause: err });
    }
  }

  // ─── 4. Application Launcher ───
  async launchApplication(appName, args = '') {
    if (!appName || typeof appName !== 'string') {
      throw new Error('Application name or executable path is required');
    }

    try {
      const cleanApp = appName.trim();
      const argv = Array.isArray(args) ? args : args ? [args] : [];
      if (!argv.every((argument) => typeof argument === 'string'))
        throw new Error('Application arguments must be strings.');
      await new Promise((resolve, reject) => {
        const child = spawn(cleanApp, argv, {
          shell: false,
          detached: true,
          windowsHide: true,
          stdio: 'ignore',
          env: childEnvironment(),
        });
        child.once('error', reject);
        child.once('spawn', () => {
          child.unref();
          resolve();
        });
      });
      const res = {
        success: true,
        app: cleanApp,
        args,
        message: `Application launched successfully: ${cleanApp}`,
        timestamp: new Date().toISOString(),
      };
      this._recordHistory('APP_LAUNCHED', res);
      brain.broadcast('openclaw-app-launched', res);
      return res;
    } catch (err) {
      throw new Error(`Failed to launch application '${appName}': ${err.message}`, { cause: err });
    }
  }

  _isProtectedSystemPath(targetPath) {
    if (!targetPath) return true;
    const resolved = path.resolve(targetPath);
    const norm = resolved.toLowerCase().replace(/[/\\]+$/, '');

    // 1. Root drives (e.g. C:, C:\, D:, /, etc.)
    const parsedRoot = path.parse(resolved).root.toLowerCase().replace(/[/\\]+$/, '');
    if (/^[a-zA-Z]:$/i.test(norm) || norm === '' || norm === parsedRoot) {
      return true;
    }

    // 2. Windows and core system directories
    const sysDirs = [
      process.env.WINDIR,
      process.env.SYSTEMROOT,
      process.env.PROGRAMFILES,
      process.env['PROGRAMFILES(X86)'],
      process.env.PROGRAMDATA,
      'C:\\Windows',
      'C:\\Windows\\System32',
      'C:\\Program Files',
      'C:\\Program Files (x86)',
      '/etc', '/usr', '/bin', '/sbin', '/boot', '/dev', '/sys', '/proc'
    ].filter(Boolean).map((d) => path.resolve(d).toLowerCase().replace(/[/\\]+$/, ''));

    if (sysDirs.some((sd) => norm === sd || norm.startsWith(sd + path.sep))) {
      return true;
    }

    // 3. User profile root itself
    const homeNorm = path.resolve(os.homedir()).toLowerCase().replace(/[/\\]+$/, '');
    if (norm === homeNorm) {
      return true;
    }

    // 4. Project root and workspace root directories themselves
    const rootNorm = path.resolve(ROOT_DIR).toLowerCase().replace(/[/\\]+$/, '');
    const wsNorm = path.resolve(WORKSPACE_DIR).toLowerCase().replace(/[/\\]+$/, '');
    if (norm === rootNorm || norm === wsNorm) {
      return true;
    }

    return false;
  }

  // ─── 5. File System Operations ───
  async exploreFileSystem(dirPath = '') {
    const resolved = dirPath ? resolveWithinRoot(ROOT_DIR, dirPath) : ROOT_DIR;
    if (!fs.existsSync(resolved)) {
      throw new Error(`Directory does not exist: ${resolved}`);
    }

    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      throw new Error(`Path is a file, not a directory: ${resolved}`);
    }

    const entries = fs.readdirSync(resolved, { withFileTypes: true });
    const items = entries.map((e) => {
      const full = path.join(resolved, e.name);
      let sizeBytes = 0;
      let modified = null;
      try {
        const s = fs.statSync(full);
        sizeBytes = s.size;
        modified = s.mtime.toISOString();
      } catch (_) {}

      return {
        name: e.name,
        path: path.relative(ROOT_DIR, full).replace(/\\/g, '/'),
        isDirectory: e.isDirectory(),
        sizeBytes,
        sizeKB: Math.round((sizeBytes / 1024) * 10) / 10,
        modified,
      };
    });

    return {
      success: true,
      currentPath: path.relative(ROOT_DIR, resolved).replace(/\\/g, '/') || '.',
      absolutePath: resolved,
      totalEntries: items.length,
      items: items.sort(
        (a, b) => (b.isDirectory ? 1 : 0) - (a.isDirectory ? 1 : 0) || a.name.localeCompare(b.name),
      ),
    };
  }

  async readFile(filePath) {
    if (!filePath) throw new Error('File path required');
    const resolved = resolveWithinRoot(ROOT_DIR, filePath);
    if (!fs.existsSync(resolved)) throw new Error(`File not found: ${filePath}`);

    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) throw new Error(`Path is a directory: ${filePath}`);
    if (stat.size > 2 * 1024 * 1024) throw new Error(`File exceeds 2MB limit for viewing`);

    const content = fs.readFileSync(resolved, 'utf8');
    return {
      success: true,
      filePath: path.relative(ROOT_DIR, resolved).replace(/\\/g, '/'),
      sizeBytes: stat.size,
      lines: content.split('\n').length,
      content,
    };
  }

  async writeFile(filePath, content = '') {
    if (!filePath) throw new Error('File path required');
    const resolved = resolveWithinRoot(ROOT_DIR, filePath);
    const parent = path.dirname(resolved);
    if (!fs.existsSync(parent)) {
      fs.mkdirSync(parent, { recursive: true });
    }

    fs.writeFileSync(resolved, content, 'utf8');
    const res = {
      success: true,
      filePath: path.relative(ROOT_DIR, resolved).replace(/\\/g, '/'),
      bytesWritten: Buffer.byteLength(content, 'utf8'),
      timestamp: new Date().toISOString(),
    };
    this._recordHistory('FILE_WRITTEN', res);
    brain.broadcast('openclaw-file-saved', res);
    return res;
  }

  async deleteFile(filePath) {
    if (!filePath) throw new Error('File path required');
    const resolved = resolveWithinRoot(ROOT_DIR, filePath);
    if (!fs.existsSync(resolved)) throw new Error(`File does not exist: ${filePath}`);
    if (this._isProtectedSystemPath(resolved)) {
      throw new Error(`Security Violation: Cannot delete protected path or root directory: ${filePath}`);
    }

    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      fs.rmSync(resolved, { recursive: true, force: true });
    } else {
      fs.unlinkSync(resolved);
    }

    const res = {
      success: true,
      filePath: path.relative(ROOT_DIR, resolved).replace(/\\/g, '/'),
      timestamp: new Date().toISOString(),
    };
    this._recordHistory('FILE_DELETED', res);
    brain.broadcast('openclaw-file-deleted', res);
    return res;
  }

  // ─── 6. Screen Capture Automation ───
  async captureScreen() {
    const screenshotsDir = path.join(WORKSPACE_DIR, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const filename = `screen-${Date.now()}.png`;
    const fullPath = path.join(screenshotsDir, filename);

    if (process.platform === 'win32') {
      try {
        const psScript = `
Add-Type -AssemblyName System.Windows.Forms;
Add-Type -AssemblyName System.Drawing;
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds;
$bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height;
$gfx = [System.Drawing.Graphics]::FromImage($bmp);
$gfx.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size);
$bmp.Save('${fullPath.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png);
$gfx.Dispose();
$bmp.Dispose();
`;
        await execAsync(
          `powershell -NoProfile -Command "${psScript.replace(/\r?\n/g, ' ').replace(/"/g, '\\"')}"`,
        );
        if (fs.existsSync(fullPath)) {
          const buf = fs.readFileSync(fullPath);
          return {
            success: true,
            filePath: path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/'),
            filename,
            sizeBytes: buf.length,
            dataUrl: `data:image/png;base64,${buf.toString('base64')}`,
            timestamp: new Date().toISOString(),
          };
        }
      } catch (err) {
        // Fallback for non-interactive / virtual desktop sessions
        return {
          success: false,
          error: `Screen capture unavailable in headless/service session: ${err.message}`,
          hint: 'Desktop GUI window handle was not bound to the session.',
        };
      }
    }

    return { success: false, error: 'Screen capture supported on Windows platforms' };
  }

  // ─── 7. History & Status ───
  _recordHistory(type, data) {
    this.history.unshift({
      id: 'claw-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 4),
      type,
      data,
      timestamp: new Date().toISOString(),
    });
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }
  }

  getStatus() {
    return {
      system: this.name,
      version: this.version,
      status: this.status,
      isProtected: this.isProtected,
      historyCount: this.history.length,
      capabilities: [
        'Direct Shell Execution (PowerShell, CMD, Bash)',
        'Full System Telemetry & Disk Diagnostics',
        'Real-time Process Inspection & Termination',
        'File & Folder Reading, Writing & Deletion',
        'Desktop Application Launching',
        'Screen Capture Robotics',
        'Live WebSocket Terminal Broadcasting',
      ],
    };
  }

  getHistory() {
    return this.history;
  }
}

const openclawController = new OpenClawController();
export default openclawController;
