import fs from 'node:fs';
import path from 'node:path';
import { resolveWithinRoot } from '../utils/path-confinement.js';
import workspace from '../workspace/manager.js';

export class SuperboxEngine {
  constructor(
    rootDir = path.join(workspace.baseRoot, '.superbox'),
    workspaceDir = workspace.baseRoot,
  ) {
    this.rootDir = path.resolve(rootDir);
    this.workspaceDir = path.resolve(workspaceDir);
    this.commandHistory = [];
    this.activeCommands = 0;
  }

  _root() {
    const root = resolveWithinRoot(this.workspaceDir, this.rootDir);
    if (root === this.workspaceDir) throw new Error('Superbox must be a workspace subfolder.');
    return root;
  }

  _entry(relPath) {
    if (typeof relPath !== 'string' || !relPath.trim() || path.isAbsolute(relPath))
      throw new Error('Relative path inside Superbox is required.');
    const root = this._root();
    const entry = resolveWithinRoot(root, relPath);
    if (entry === root) throw new Error('A file or subfolder inside Superbox is required.');
    return entry;
  }

  _fileInfo(file) {
    const stat = fs.lstatSync(file, { throwIfNoEntry: false });
    if (stat && (!stat.isFile() || stat.nlink > 1))
      throw new Error('Superbox requires a regular file with no other filesystem links.');
    return stat;
  }

  getStatus() {
    const files = this.listFiles();
    const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
    return {
      active: true,
      isolation: 'HOST_WORKSPACE_DIRECTORY',
      root: path.relative(this.workspaceDir, this.rootDir).replaceAll('\\', '/') || '.superbox',
      totalFiles: files.length,
      totalBytes,
      historyCount: this.commandHistory.length,
      lastActivity: this.commandHistory.at(-1)?.timestamp || null,
    };
  }

  listFiles(subDir = '') {
    const root = this._root();
    const targetDir = subDir ? this._entry(subDir) : root;
    if (!fs.existsSync(targetDir)) return [];

    const results = [];
    const walk = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        const rel = path.relative(this.rootDir, full).replaceAll('\\', '/');
        if (entry.isDirectory()) {
          results.push({ path: rel, isDirectory: true, size: 0 });
          walk(full);
        } else if (entry.isFile()) {
          const stat = fs.lstatSync(full, { throwIfNoEntry: false });
          if (!stat?.isFile() || stat.nlink > 1) continue;
          results.push({
            path: rel,
            isDirectory: false,
            size: stat.size,
            updatedAt: stat.mtimeMs,
          });
        }
      }
    };
    walk(targetDir);
    return results;
  }

  createFile(relPath, content = '') {
    const target = this._entry(relPath);
    this._fileInfo(target);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, String(content), 'utf8');
    const stat = fs.statSync(target);
    return {
      success: true,
      path: path.relative(this.rootDir, target).replaceAll('\\', '/'),
      bytes: stat.size,
      updatedAt: stat.mtimeMs,
      message: `File created inside Superbox: ${relPath}`,
    };
  }

  readFile(relPath) {
    const target = this._entry(relPath);
    const stat = this._fileInfo(target);
    if (!stat) {
      throw new Error(`File not found in Superbox: ${relPath}`);
    }
    const content = fs.readFileSync(target, 'utf8');
    return {
      success: true,
      path: path.relative(this.rootDir, target).replaceAll('\\', '/'),
      size: stat.size,
      content,
    };
  }

  deleteFile(relPath) {
    const target = this._entry(relPath);
    if (!fs.existsSync(target)) {
      return { success: false, message: `File does not exist: ${relPath}` };
    }
    fs.rmSync(target, { recursive: true, force: true });
    return {
      success: true,
      message: `Removed from Superbox: ${relPath}`,
    };
  }

  async runCommand(command, { timeoutMs = 20000 } = {}) {
    if (!command || typeof command !== 'string' || !command.trim()) {
      throw new Error('Command is required.');
    }
    const root = this._root();
    fs.mkdirSync(root, { recursive: true });
    const cmd = command.trim();
    this.activeCommands++;
    try {
      const execution = await workspace.runCommand(cmd, root, timeoutMs);
      const result = {
        ...execution,
        success: execution.exitCode === 0 && !execution.error,
        command: cmd,
        timestamp: Date.now(),
      };
      this.commandHistory.push(result);
      if (this.commandHistory.length > 50) this.commandHistory.shift();
      return result;
    } finally {
      this.activeCommands--;
    }
  }

  reset() {
    if (this.activeCommands)
      throw new Error('Wait for the running command before clearing Superbox.');
    const root = this._root();
    fs.rmSync(root, { recursive: true, force: true });
    fs.mkdirSync(root, { recursive: true });
    this.commandHistory = [];
    return { success: true, message: 'Superbox staging folder cleared.' };
  }

  applyToWorkspace(filePaths = null, targetDir = '') {
    if (this.activeCommands) throw new Error('Wait for the running command before applying files.');
    if (filePaths !== null && !Array.isArray(filePaths))
      throw new Error('Provide an array of staged file paths.');
    const files = this.listFiles().filter((f) => !f.isDirectory);
    const byPath = new Map(files.map((file) => [file.path, file]));
    const selected = filePaths
      ? [...new Set(filePaths)].map((filePath) => {
          const file = byPath.get(filePath);
          if (!file) throw new Error(`Staged file is missing: ${String(filePath)}`);
          return file;
        })
      : files;
    const target = resolveWithinRoot(this.workspaceDir, targetDir);

    const plan = selected.map((f) => {
      const src = this._entry(f.path);
      if (!this._fileInfo(src)) throw new Error(`Staged file is missing: ${f.path}`);
      const dest = resolveWithinRoot(this.workspaceDir, path.join(target, f.path));
      const fromStaging = path.relative(this.rootDir, dest);
      if (
        !fromStaging ||
        (!fromStaging.startsWith(`..${path.sep}`) &&
          fromStaging !== '..' &&
          !path.isAbsolute(fromStaging))
      )
        throw new Error('Choose a destination outside the staging folder.');
      if (fs.existsSync(dest))
        throw new Error(`Workspace file already exists: ${path.relative(this.workspaceDir, dest)}`);
      return { f, src, dest };
    });
    const copied = [];
    for (const { f, src, dest } of plan) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest, fs.constants.COPYFILE_EXCL);
      copied.push({
        source: f.path,
        destination: path.relative(this.workspaceDir, dest).replaceAll('\\', '/'),
        size: f.size,
      });
    }

    return {
      success: true,
      copiedCount: copied.length,
      files: copied,
      message: `Applied ${copied.length} files from Superbox to workspace.`,
    };
  }
}

export const superbox = new SuperboxEngine();
export default superbox;
