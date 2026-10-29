// SIS 1.0 — Workspace Manager
// Full industrial-grade file system & folder management workspace for SIS

import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { resolveWithinRoot } from '../utils/path-confinement.js';
import { unzipSync } from 'fflate';
import { randomUUID } from 'node:crypto';
import { currentWorkspace, conversationWorkspaces } from '../services/conversationWorkspaces.js';
import { childEnvironment } from '../security/child-environment.js';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const WORKSPACE_DIR = process.env.SIS_WORKSPACE_DIR ? path.resolve(process.env.SIS_WORKSPACE_DIR) : path.resolve(PROJECT_ROOT, 'workspace');
const WORKSPACE_ROOT = WORKSPACE_DIR;

if (!fs.existsSync(WORKSPACE_ROOT)) {
  fs.mkdirSync(WORKSPACE_ROOT, { recursive: true });
}

class WorkspaceManager {
  constructor() {
    this.baseRoot = WORKSPACE_ROOT;
    this.projectRoot = PROJECT_ROOT;
    this.activeProcesses = new Map();
    this.broadcastFn = null;
  }
  get root() { return currentWorkspace()?.root || this.baseRoot; }
  set root(value) { this.baseRoot = value; }
  publicPath(value) {
    const absolute = path.isAbsolute(value) ? value : this._resolve(value);
    const relative = path.relative(this.baseRoot, absolute);
    return (!relative.startsWith('..') && !path.isAbsolute(relative) ? relative : this._toRelative(absolute)).replaceAll('\\','/');
  }
  urlFor(value) { return '/workspace/' + this.publicPath(value).split('/').map(encodeURIComponent).join('/'); }
  qualifyUrls(value, depth = 0, key = null) {
    if (!currentWorkspace() || depth > 12) return value;
    if (typeof value === 'string' && (key === 'response' || /^(?:url|src|href|previewUrl|artifactUrl)$/i.test(key || ''))) return value.replace(/\/workspace\/([^\s)"'`<>]+)/g, (url, relative) => {
      try {
        const clean = decodeURIComponent(relative.split(/[?#]/)[0]);
        const target = path.resolve(this.root, clean);
        const inside = path.relative(this.root, target);
        if (!inside.startsWith('..') && !path.isAbsolute(inside) && fs.existsSync(target)) return this.urlFor(target) + (relative.match(/[?#].*$/)?.[0] || '');
      } catch {}
      return url;
    });
    if (Array.isArray(value)) return value.map(item => this.qualifyUrls(item, depth + 1, key));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([childKey,item]) => [childKey,this.qualifyUrls(item,depth+1,childKey)]));
    return value;
  }

  setBroadcast(fn) {
    this.broadcastFn = fn;
  }

  _notifyFileSaved(relPath, fullPath, stat, linesCount = 0, linesAdded = 0, linesDeleted = 0) {
    try {
      const fn = path.basename(relPath);
      const url = this.urlFor(fullPath);
      const scope = currentWorkspace();
      const publicPath = this.publicPath(fullPath);
      conversationWorkspaces.publish({ kind: 'file-change', path: path.relative(this.root, fullPath).replaceAll('\\','/'), exists: true, type:'file', bytes:stat?.size || 0 });
      if (!this.broadcastFn) return;
      const isHtml = fn.toLowerCase().endsWith('.html');
      this.broadcastFn('workspace-file-saved', {
        filename: fn,
        filepath: publicPath,
        conversationId: scope?.conversationId,
        requestId: scope?.requestId,
        url,
        path: fullPath,
        size: stat?.size || 0,
        formattedSize: this._formatBytes(stat?.size || 0),
        linesCount,
        linesAdded,
        linesDeleted,
        isInteractiveHtml: isHtml,
        autoPreview: isHtml,
        action: 'file-saved'
      });
      this.broadcastFn('workspace-update', { action: 'file-saved', path: publicPath, filename: publicPath, conversationId: scope?.conversationId });
      if (isHtml) {
        this.broadcastFn('artifact', {
          id: 'art-' + Date.now(),
          title: fn.replace(/\.html$/, '').replace(/[_-]/g, ' ').toUpperCase(),
          filename: publicPath,
          path: publicPath,
          conversationId: scope?.conversationId,
          src: url,
          url,
          type: 'html-artifact'
        });
      }
    } catch (_) {}
  }

  /**
   * Dynamically switch workspace directory for isolated SIS systems
   */
  setWorkspaceDir(newDir) {
    this.root = path.resolve(newDir);
    if (!fs.existsSync(this.root)) {
      fs.mkdirSync(this.root, { recursive: true });
    }
  }

  getWorkspaceDir() {
    return this.root;
  }

  /**
   * Check if a path is a critical system root or OS path that must never be deleted
   */
  _isProtectedSystemPath(targetPath) {
    if (!targetPath) return true;
    const resolved = path.resolve(targetPath);
    const norm = resolved.toLowerCase().replace(/[\/\\]+$/, '');

    // 1. Root drives (e.g. C:, C:\, D:, /, etc.)
    const parsedRoot = path.parse(resolved).root.toLowerCase().replace(/[\/\\]+$/, '');
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
    ].filter(Boolean).map(d => path.resolve(d).toLowerCase().replace(/[\/\\]+$/, ''));

    if (sysDirs.some(sd => norm === sd || norm.startsWith(sd + path.sep))) {
      return true;
    }

    // 3. User profile root itself (e.g. C:\Users\Akshan sharma)
    const homeNorm = path.resolve(os.homedir()).toLowerCase().replace(/[\/\\]+$/, '');
    if (norm === homeNorm) {
      return true;
    }

    // 4. Project root directory and workspace root itself (cannot delete entire repository or workspace root)
    const rootNorm = path.resolve(this.root).toLowerCase().replace(/[\/\\]+$/, '');
    const projNorm = path.resolve(this.projectRoot).toLowerCase().replace(/[\/\\]+$/, '');
    if (norm === rootNorm || norm === projNorm || norm === path.resolve(this.baseRoot).toLowerCase().replace(/[\/\\]+$/, '')) {
      return true;
    }

    return false;
  }

  /**
   * Check if a command is a catastrophic destructive shell command
   */
  _isDangerousCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return false;
    const clean = cmd.trim().toLowerCase();

    // Block disk formatting: e.g. format c:, format d:
    if (/^format\s+[a-zA-Z]:/i.test(clean)) return true;

    // Block recursive deletion of Windows, Unix system roots, or core OS paths
    if (/(?:rmdir|rd|del|erase|rm\s+-(?:r|f|rf|fr))\s+.*(?:windows|system32|program\s*files|\/etc|\/usr|\/bin|\/boot|\/sbin|\/var|\/dev)/i.test(clean)) return true;

    // Block drive wipe or root wipe: del c:\*.* /s /q or rmdir /s /q c:\ or rm -rf /
    if (/(?:rmdir|rd|rm\s+-(?:r|f|rf|fr))\s+.*(?:[a-zA-Z]:[\\/]*$|(?:\s|^)[\\/]$)/i.test(clean)) return true;
    if (/del\s+.*[a-zA-Z]:[\\/]+\*\.\*/i.test(clean)) return true;

    // Block fork bombs
    if (clean.includes(':(){ :|:& };:')) return true;

    // Block raw device overwrite (dd)
    if (/dd\s+if=.*of=\/dev\/(?:sd[a-z]|nvme|hd[a-z])/i.test(clean)) return true;

    return false;
  }

  /**
   * Resolve a path inside workspace or anywhere on disk
   * Supports relative workspace paths and absolute project/system paths
   */
  _resolve(relativePath = '') {
    const raw = String(relativePath || '').trim();
    if (!raw) return this.root;

    if (path.isAbsolute(raw)) {
      try {
        return resolveWithinRoot(this.baseRoot, raw);
      } catch { /* Explicit repository paths remain supported below. */ }
      return resolveWithinRoot(this.projectRoot, raw);
    }

    let clean = raw.replace(/^[\\\/]+/, '');
    if (currentWorkspace()) {
      clean = clean.replace(/^workspace[\\\/]+/, '');
      if (/^(?:chats|projects|supergence)[\\\/]/.test(clean)) return resolveWithinRoot(this.baseRoot, clean);
      const inChatWs = resolveWithinRoot(this.root, clean);
      if (fs.existsSync(inChatWs)) return inChatWs;
      const inBaseWs = resolveWithinRoot(this.baseRoot, clean);
      if (fs.existsSync(inBaseWs)) return inBaseWs;
      return inChatWs;
    }

    // If caller explicitly passed "workspace/..." strip prefix so it targets this.root (which is WORKSPACE_DIR)
    if (clean.startsWith('workspace/') || clean.startsWith('workspace\\')) {
      const stripped = clean.replace(/^workspace[\\\/]+/, '');
      return resolveWithinRoot(this.root, stripped);
    }

    // First check if it exists in this.root (workspace)
    const inWorkspace = resolveWithinRoot(this.root, clean);
    if (fs.existsSync(inWorkspace)) return inWorkspace;

    // Next check if it exists in projectRoot (e.g. server/..., client/..., package.json)
    const inProject = resolveWithinRoot(this.projectRoot, clean);
    if (fs.existsSync(inProject)) return inProject;

    // Default to workspace root with containment guarantee
    return resolveWithinRoot(this.root, clean);
  }

  /**
   * Convert absolute path back to workspace relative path with forward slashes
   */
  _toRelative(fullPath) {
    if (!fullPath) return '';
    try {
      const relWs = path.relative(this.root, fullPath);
      if (!relWs.startsWith('..') && !path.isAbsolute(relWs)) {
        return relWs.replace(/\\/g, '/');
      }

      const relProj = path.relative(this.projectRoot, fullPath);
      if (!relProj.startsWith('..') && !path.isAbsolute(relProj)) {
        return relProj.replace(/\\/g, '/');
      }
    } catch {}
    return String(fullPath).replace(/\\/g, '/');
  }

  /**
   * Detect if a buffer contains binary data
   */
  _isBinary(buffer) {
    if (!buffer || buffer.length === 0) return false;
    const checkLen = Math.min(buffer.length, 8000);
    for (let i = 0; i < checkLen; i++) {
      if (buffer[i] === 0) return true;
    }
    return false;
  }

  /**
   * Format bytes to human-readable size
   */
  _formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ─── FILE OPERATIONS ───

  /**
   * Create or overwrite a file, automatically creating parent directories
   */
  createFile(filepath, content = '') {
    if (/\.(?:[cm]?js|jsx|tsx?|py|html?|css|json)$/i.test(filepath) && /^\s*\[Completed write: source retained/i.test(String(content)))
      throw new Error('Context metadata is not executable source. No file was changed. Supply the complete real source in content; never copy a completed-write marker.');
    const fullPath = this._resolve(filepath);
    if (this._isProtectedSystemPath(fullPath)) {
      throw new Error(`Safety Protection: Cannot overwrite protected system path "${filepath}"`);
    }
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    if (Buffer.isBuffer(content)) {
      fs.writeFileSync(fullPath, content);
    } else {
      fs.writeFileSync(fullPath, String(content), 'utf8');
    }

    const relPath = this._toRelative(fullPath);
    const stat = fs.statSync(fullPath);
    const lineCount = typeof content === 'string' ? content.split(/\r?\n/).length : 1;
    this._notifyFileSaved(relPath, fullPath, stat, lineCount, lineCount, 0);
    return {
      success: true,
      path: relPath,
      filename: path.basename(relPath),
      url: this.urlFor(fullPath),
      size: stat.size,
      formattedSize: this._formatBytes(stat.size),
      linesCount: lineCount,
      linesAdded: lineCount,
      linesDeleted: 0,
      mtime: stat.mtime
    };
  }

  /**
   * Read file content with line range, offset, and line numbering options
   */
  readFile(filepath, options = {}) {
    let fullPath;
    try {
      fullPath = this._resolve(filepath);
    } catch {
      fullPath = null;
    }

    if (!fullPath) return null;
    if (!fs.existsSync(fullPath)) {
      if (String(filepath).replace(/^workspace[\\/]/i, "").includes("/") || String(filepath).includes("\\")) return null;
      const baseName = path.basename(filepath);
      const wsTheory = resolveWithinRoot(this.root, path.join('theories', baseName));
      const dataRoot = process.env.SIS_DATA_DIR
        ? path.resolve(process.env.SIS_DATA_DIR)
        : path.resolve(__dirname, '../../data');
      const dataTheory = resolveWithinRoot(dataRoot, path.join('theories', baseName));
      if (fs.existsSync(wsTheory)) {
        fullPath = wsTheory;
      } else if (fs.existsSync(dataTheory)) {
        fullPath = dataTheory;
      } else {
        return null; // A missing file must not silently read an unrelated project file.
      }
    }

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      return {
        error: 'Target path is a directory, not a file',
        isDirectory: true,
        path: this._toRelative(fullPath)
      };
    }

    const buffer = fs.readFileSync(fullPath);
    const isBinary = this._isBinary(buffer);
    const relPath = this._toRelative(fullPath);

    if (isBinary) {
      return {
        path: relPath,
        filename: path.basename(relPath),
        isBinary: true,
        size: stat.size,
        formattedSize: this._formatBytes(stat.size),
        extension: path.extname(relPath),
        content: `// [Binary File: ${path.basename(relPath)} (${this._formatBytes(stat.size)})]`
      };
    }

    let text = buffer.toString('utf8');
    const lines = text.split(/\r?\n/);
    const totalLines = lines.length;

    let startLine = options.startLine ? Math.max(1, parseInt(options.startLine, 10)) : 1;
    let endLine = options.endLine ? Math.min(totalLines, parseInt(options.endLine, 10)) : totalLines;

    let selectedLines = lines.slice(startLine - 1, endLine);
    let outputContent;

    if (options.lineNumbers) {
      const padLen = String(endLine).length;
      outputContent = selectedLines
        .map((line, idx) => `${String(startLine + idx).padStart(padLen, ' ')} | ${line}`)
        .join('\n');
    } else {
      outputContent = selectedLines.join('\n');
    }

    return {
      path: relPath,
      filename: path.basename(relPath),
      content: outputContent,
      size: stat.size,
      formattedSize: this._formatBytes(stat.size),
      totalLines,
      startLine,
      endLine,
      isBinary: false,
      mtime: stat.mtime
    };
  }

  /**
   * Overwrite file
   */
  writeFile(filepath, content = '') {
    return this.createFile(filepath, content);
  }

  /**
   * Edit / Patch a file: targeted search-and-replace or line range modifications
   */
  editFile(filepath, { targetContent, replacementContent = '', startLine, endLine, allowMultiple = false, isRegex = false }) {
    const fullPath = this._resolve(filepath);
    if (this._isProtectedSystemPath(fullPath)) {
      throw new Error(`Safety Protection: Cannot edit protected system path "${filepath}"`);
    }
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: "${filepath}"`);
    }

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      throw new Error(`Cannot edit directory: "${filepath}"`);
    }

    let text = fs.readFileSync(fullPath, 'utf8');
    const oldLines = text.split(/\r?\n/).length;

    if (targetContent === undefined || targetContent === null) {
      throw new Error('targetContent is required for editFile');
    }

    // Line-constrained editing if startLine / endLine provided
    if (startLine || endLine) {
      const lines = text.split(/\r?\n/);
      const s = startLine ? Math.max(1, parseInt(startLine, 10)) : 1;
      const e = endLine ? Math.min(lines.length, parseInt(endLine, 10)) : lines.length;

      const preLines = lines.slice(0, s - 1);
      const targetBlock = lines.slice(s - 1, e).join('\n');
      const postLines = lines.slice(e);

      let newBlock;
      if (isRegex) {
        const regex = new RegExp(targetContent, allowMultiple ? 'g' : '');
        if (!regex.test(targetBlock)) {
          throw new Error(`Regex pattern "${targetContent}" not found between lines ${s} and ${e}`);
        }
        newBlock = targetBlock.replace(regex, replacementContent);
      } else {
        if (!targetBlock.includes(targetContent)) {
          throw new Error(`Target content not found between lines ${s} and ${e}`);
        }
        if (!allowMultiple) {
          const firstIdx = targetBlock.indexOf(targetContent);
          const secondIdx = targetBlock.indexOf(targetContent, firstIdx + 1);
          if (secondIdx !== -1) {
            throw new Error(`Multiple occurrences of targetContent found in lines ${s}-${e}. Provide more unique context or set allowMultiple: true.`);
          }
          newBlock = targetBlock.replace(targetContent, replacementContent);
        } else {
          newBlock = targetBlock.split(targetContent).join(replacementContent);
        }
      }

      text = (preLines.length > 0 ? preLines.join('\n') + '\n' : '') +
             newBlock +
             (postLines.length > 0 ? '\n' + postLines.join('\n') : '');
    } else {
      // Entire file search & replace
      if (isRegex) {
        const regex = new RegExp(targetContent, allowMultiple ? 'g' : '');
        if (!regex.test(text)) {
          throw new Error(`Regex pattern "${targetContent}" not found in ${filepath}`);
        }
        text = text.replace(regex, replacementContent);
      } else {
        if (!text.includes(targetContent)) {
          throw new Error(`Target content not found in "${filepath}"`);
        }
        if (!allowMultiple) {
          const firstIdx = text.indexOf(targetContent);
          const secondIdx = text.indexOf(targetContent, firstIdx + 1);
          if (secondIdx !== -1) {
            throw new Error(`Multiple occurrences of targetContent found in "${filepath}". Provide more unique context or set allowMultiple: true.`);
          }
          text = text.replace(targetContent, replacementContent);
        } else {
          text = text.split(targetContent).join(replacementContent);
        }
      }
    }

    fs.writeFileSync(fullPath, text, 'utf8');
    const newStat = fs.statSync(fullPath);
    const newLines = text.split(/\r?\n/).length;
    const targetLines = typeof targetContent === 'string' ? targetContent.split(/\r?\n/).length : 1;
    const replacementLines = typeof replacementContent === 'string' ? replacementContent.split(/\r?\n/).length : 0;
    const linesDiff = newLines - oldLines;
    const linesAdded = linesDiff > 0 ? linesDiff : Math.max(1, replacementLines);
    const linesDeleted = linesDiff < 0 ? Math.abs(linesDiff) : Math.max(0, targetLines - replacementLines);

    const relPath = this._toRelative(fullPath);
    this._notifyFileSaved(relPath, fullPath, newStat, newLines, linesAdded, linesDeleted);
    return {
      success: true,
      path: relPath,
      filename: path.basename(fullPath),
      size: newStat.size,
      formattedSize: this._formatBytes(newStat.size),
      linesCount: newLines,
      linesAdded,
      linesDeleted,
      mtime: newStat.mtime
    };
  }

  /**
   * Append or Prepend content to an existing file
   */
  appendFile(filepath, content = '', prepend = false) {
    const fullPath = this._resolve(filepath);
    if (this._isProtectedSystemPath(fullPath)) {
      throw new Error(`Safety Protection: Cannot append to protected system path "${filepath}"`);
    }
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let newText;
    if (fs.existsSync(fullPath)) {
      const existing = fs.readFileSync(fullPath, 'utf8');
      if (prepend) {
        newText = String(content) + (existing.startsWith('\n') ? '' : '\n') + existing;
      } else {
        newText = existing + (existing.endsWith('\n') ? '' : '\n') + String(content);
      }
    } else {
      newText = String(content);
    }

    fs.writeFileSync(fullPath, newText, 'utf8');
    const stat = fs.statSync(fullPath);
    const relPath = this._toRelative(fullPath);
    const added = String(content).split(/\r?\n/).length;
    this._notifyFileSaved(relPath, fullPath, stat, newText.split(/\r?\n/).length, added, 0);
    return {
      success: true,
      path: relPath,
      filename: path.basename(fullPath),
      size: stat.size,
      formattedSize: this._formatBytes(stat.size),
      linesCount: newText.split(/\r?\n/).length
    };
  }

  /**
   * Delete a file
   */
  deleteFile(filepath) {
    const fullPath = this._resolve(filepath);
    if (this._isProtectedSystemPath(fullPath)) {
      throw new Error(`Safety Protection: Cannot delete protected system path "${filepath}"`);
    }
    if (!fs.existsSync(fullPath)) {
      return { success: false, error: 'File does not exist' };
    }
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      return this.deleteFolder(filepath, true);
    }
    fs.unlinkSync(fullPath);
    const rel = path.relative(this.root, fullPath).replaceAll('\\', '/');
    conversationWorkspaces.publish({ kind: 'file-change', path: rel, exists: false, type: 'file' });
    if (this.broadcastFn) {
      this.broadcastFn('workspace-update', { action: 'file-deleted', path: this.publicPath(fullPath), conversationId: currentWorkspace()?.conversationId });
    }
    return { success: true, path: this._toRelative(fullPath) };
  }

  /**
   * Copy a file from src to dest
   */
  copyFile(src, dest) {
    const srcFull = this._resolve(src);
    const destFull = this._resolve(dest);

    if (this._isProtectedSystemPath(destFull)) {
      throw new Error(`Safety Protection: Cannot copy into protected system path "${dest}"`);
    }
    if (!fs.existsSync(srcFull)) throw new Error(`Source file not found: "${src}"`);
    const stat = fs.statSync(srcFull);
    if (stat.isDirectory()) throw new Error(`Source is a directory; use copyFolder instead: "${src}"`);

    const destDir = path.dirname(destFull);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

    fs.copyFileSync(srcFull, destFull);
    const destStat = fs.statSync(destFull);
    return {
      success: true,
      src: this._toRelative(srcFull),
      dest: this._toRelative(destFull),
      size: destStat.size,
      formattedSize: this._formatBytes(destStat.size)
    };
  }

  /**
   * Move or rename a file
   */
  moveFile(src, dest) {
    const srcFull = this._resolve(src);
    const destFull = this._resolve(dest);

    if (this._isProtectedSystemPath(srcFull)) {
      throw new Error(`Safety Protection: Cannot move protected system path "${src}"`);
    }
    if (this._isProtectedSystemPath(destFull)) {
      throw new Error(`Safety Protection: Cannot target protected system path "${dest}"`);
    }
    if (!fs.existsSync(srcFull)) throw new Error(`Source path not found: "${src}"`);
    const destDir = path.dirname(destFull);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

    fs.renameSync(srcFull, destFull);
    return {
      success: true,
      src: this._toRelative(srcFull),
      dest: this._toRelative(destFull)
    };
  }

  // ─── DIRECTORY / FOLDER OPERATIONS ───

  /**
   * Create a folder recursively
   */
  createFolder(dirpath) {
    const fullPath = this._resolve(dirpath);
    if (this._isProtectedSystemPath(fullPath)) {
      throw new Error(`Safety Protection: Cannot create directory at protected system path "${dirpath}"`);
    }
    fs.mkdirSync(fullPath, { recursive: true });
    const rel = path.relative(this.root, fullPath).replaceAll('\\', '/');
    conversationWorkspaces.publish({ kind: 'file-change', path: rel || '.', exists: true, type: 'directory' });
    if (this.broadcastFn) {
      this.broadcastFn('workspace-update', { action: 'folder-created', path: this.publicPath(fullPath), conversationId: currentWorkspace()?.conversationId });
    }
    return {
      success: true,
      path: this._toRelative(fullPath)
    };
  }

  /**
   * Delete a folder recursively (safeguards system and root directories)
   */
  deleteFolder(dirpath, recursive = true) {
    const fullPath = this._resolve(dirpath);
    if (this._isProtectedSystemPath(fullPath)) {
      throw new Error(`Safety Protection: Cannot delete protected system directory "${dirpath}"`);
    }
    if (!fs.existsSync(fullPath)) {
      return { success: false, error: 'Folder does not exist' };
    }
    fs.rmSync(fullPath, { recursive: Boolean(recursive), force: true });
    const rel = path.relative(this.root, fullPath).replaceAll('\\', '/');
    conversationWorkspaces.publish({ kind: 'file-change', path: rel || '.', exists: false, type: 'directory' });
    if (this.broadcastFn) {
      this.broadcastFn('workspace-update', { action: 'folder-deleted', path: this.publicPath(fullPath), conversationId: currentWorkspace()?.conversationId });
    }
    return {
      success: true,
      path: this._toRelative(fullPath)
    };
  }

  /**
   * Copy a folder recursively
   */
  copyFolder(src, dest) {
    const srcFull = this._resolve(src);
    const destFull = this._resolve(dest);

    if (this._isProtectedSystemPath(destFull)) {
      throw new Error(`Safety Protection: Cannot copy into protected system path "${dest}"`);
    }
    if (!fs.existsSync(srcFull)) throw new Error(`Source folder not found: "${src}"`);
    const stat = fs.statSync(srcFull);
    if (!stat.isDirectory()) throw new Error(`Source is not a directory: "${src}"`);

    if (!fs.existsSync(destFull)) fs.mkdirSync(destFull, { recursive: true });
    fs.cpSync(srcFull, destFull, { recursive: true });

    return {
      success: true,
      src: this._toRelative(srcFull),
      dest: this._toRelative(destFull)
    };
  }

  /**
   * Move or rename a folder
   */
  moveFolder(src, dest) {
    return this.moveFile(src, dest);
  }

  /**
   * List directory contents with metadata
   */
  listDir(dirpath = '', recursive = false) {
    const fullPath = this._resolve(dirpath);
    if (!fs.existsSync(fullPath)) return [];

    if (!recursive) {
      return fs.readdirSync(fullPath, { withFileTypes: true })
        .filter(d => !d.name.startsWith('.') && !d.isSymbolicLink())
        .map(d => {
          const itemFull = path.join(fullPath, d.name);
          const stat = fs.existsSync(itemFull) ? fs.statSync(itemFull) : null;
          const isDir = d.isDirectory();
          return {
            name: d.name,
            type: isDir ? 'directory' : 'file',
            path: this._toRelative(itemFull),
            size: !isDir && stat ? stat.size : undefined,
            formattedSize: !isDir && stat ? this._formatBytes(stat.size) : undefined,
            extension: !isDir ? path.extname(d.name) : undefined,
            mtime: stat ? stat.mtime : null
          };
        });
    }

    // Flat recursive listing
    const results = [];
    const walk = (currentDir) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
        const entryFull = path.join(currentDir, entry.name);
        const stat = fs.existsSync(entryFull) ? fs.statSync(entryFull) : null;
        const isDir = entry.isDirectory();
        results.push({
          name: entry.name,
          type: isDir ? 'directory' : 'file',
          path: this._toRelative(entryFull),
          size: !isDir && stat ? stat.size : undefined,
          formattedSize: !isDir && stat ? this._formatBytes(stat.size) : undefined,
          extension: !isDir ? path.extname(entry.name) : undefined,
          mtime: stat ? stat.mtime : null
        });
        if (isDir) walk(entryFull);
      }
    };
    walk(fullPath);
    return results;
  }

  /**
   * Hierarchical tree structure for UI file explorer
   */
  getTree(dirpath = '', depth = 6) {
    if (depth <= 0) return [];
    const fullPath = this._resolve(dirpath);
    if (!fs.existsSync(fullPath)) return [];

    return fs.readdirSync(fullPath, { withFileTypes: true })
      .filter(d => !d.name.startsWith('.') && !d.isSymbolicLink())
      .sort((a, b) => {
        // Directories first, then files alphabetically
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      })
      .map(d => {
        const itemFull = path.join(fullPath, d.name);
        const relPath = this._toRelative(itemFull);
        const stat = fs.existsSync(itemFull) ? fs.statSync(itemFull) : null;
        const item = {
          name: d.name,
          path: relPath,
          type: d.isDirectory() ? 'directory' : 'file',
          extension: !d.isDirectory() ? path.extname(d.name) : undefined,
          mtime: stat ? stat.mtime : null
        };

        if (d.isDirectory()) {
          item.children = this.getTree(relPath, depth - 1);
          item.childCount = item.children.length;
        } else if (stat) {
          item.size = stat.size;
          item.formattedSize = this._formatBytes(stat.size);
        }
        return item;
      });
  }

  /**
   * Search workspace files by name, glob-like pattern, or extension
   */
  searchFiles(query = '', options = {}) {
    const dirpath = options.dirpath || '';
    const fullStart = this._resolve(dirpath);
    if (!fs.existsSync(fullStart)) return [];

    const extension = options.extension ? (options.extension.startsWith('.') ? options.extension : '.' + options.extension).toLowerCase() : null;
    const caseInsensitive = options.caseInsensitive !== false;
    const maxResults = options.maxResults || 100;
    const isRegex = options.isRegex || false;

    let regex = null;
    if (query) {
      if (isRegex) {
        regex = new RegExp(query, caseInsensitive ? 'i' : '');
      } else {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regex = new RegExp(escaped, caseInsensitive ? 'i' : '');
      }
    }

    const matches = [];

    const walk = (curDir) => {
      if (matches.length >= maxResults) return;
      const entries = fs.readdirSync(curDir, { withFileTypes: true });

      for (const entry of entries) {
        if (matches.length >= maxResults) return;
        if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;

        const entryFull = path.join(curDir, entry.name);
        const relPath = this._toRelative(entryFull);
        const isDir = entry.isDirectory();

        let match = true;
        if (extension && !isDir) {
          if (path.extname(entry.name).toLowerCase() !== extension) match = false;
        }
        if (match && regex) {
          if (!regex.test(entry.name) && !regex.test(relPath)) match = false;
        }

        if (match) {
          const stat = fs.existsSync(entryFull) ? fs.statSync(entryFull) : null;
          matches.push({
            name: entry.name,
            path: relPath,
            type: isDir ? 'directory' : 'file',
            size: !isDir && stat ? stat.size : undefined,
            formattedSize: !isDir && stat ? this._formatBytes(stat.size) : undefined,
            extension: !isDir ? path.extname(entry.name) : undefined,
            mtime: stat ? stat.mtime : null
          });
        }

        if (isDir) walk(entryFull);
      }
    };

    walk(fullStart);
    return matches;
  }

  /**
   * Grep / search contents across text files in workspace
   */
  grepContent(query, options = {}) {
    if (!query) return [];
    const dirpath = options.dirpath || '';
    const fullStart = this._resolve(dirpath);
    if (!fs.existsSync(fullStart)) return [];

    const isRegex = options.isRegex || false;
    const caseInsensitive = options.caseInsensitive !== false;
    const maxMatches = options.maxMatches || 100;
    const maxFiles = options.maxFiles || 500;

    let regex;
    try {
      regex = isRegex
        ? new RegExp(query, caseInsensitive ? 'i' : '')
        : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseInsensitive ? 'i' : '');
    } catch (e) {
      throw new Error(`Invalid search pattern: ${e.message}`, { cause: e });
    }

    const matches = [];
    let filesScanned = 0;

    const walk = (curDir) => {
      if (matches.length >= maxMatches || filesScanned >= maxFiles) return;
      const entries = fs.readdirSync(curDir, { withFileTypes: true });

      for (const entry of entries) {
        if (matches.length >= maxMatches || filesScanned >= maxFiles) return;
        if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;

        const entryFull = path.join(curDir, entry.name);
        if (entry.isDirectory()) {
          walk(entryFull);
        } else if (entry.isFile()) {
          filesScanned++;
          try {
            const buf = fs.readFileSync(entryFull);
            if (this._isBinary(buf)) continue; // Skip binary files

            const content = buf.toString('utf8');
            const lines = content.split(/\r?\n/);
            const relPath = this._toRelative(entryFull);

            for (let i = 0; i < lines.length; i++) {
              if (matches.length >= maxMatches) break;
              if (regex.test(lines[i])) {
                matches.push({
                  file: relPath,
                  filename: entry.name,
                  lineNumber: i + 1,
                  lineContent: lines[i].trim().slice(0, 300)
                });
              }
            }
          } catch {}
        }
      }
    };

    walk(fullStart);
    return {
      query,
      filesScanned,
      matchesCount: matches.length,
      matches
    };
  }

  /**
   * Get detailed metadata for a file or folder
   */
  getFileInfo(filepath) {
    const fullPath = this._resolve(filepath);
    if (!fs.existsSync(fullPath)) return null;

    const stat = fs.statSync(fullPath);
    const relPath = this._toRelative(fullPath);
    const isDir = stat.isDirectory();

    let linesCount = null;
    let isBinary = false;

    if (!isDir) {
      try {
        const buf = fs.readFileSync(fullPath);
        isBinary = this._isBinary(buf);
        if (!isBinary) {
          linesCount = buf.toString('utf8').split(/\r?\n/).length;
        }
      } catch {}
    }

    return {
      path: relPath,
      name: path.basename(relPath),
      extension: !isDir ? path.extname(relPath) : undefined,
      size: stat.size,
      formattedSize: this._formatBytes(stat.size),
      created: stat.birthtime,
      modified: stat.mtime,
      isDirectory: isDir,
      isFile: stat.isFile(),
      isBinary,
      linesCount
    };
  }

  /**
   * Check if file or folder exists
   */
  fileExists(filepath) {
    try {
      return fs.existsSync(this._resolve(filepath));
    } catch {
      return false;
    }
  }

  // ─── ARCHIVE & COMPRESSION OPERATIONS ───

  /**
   * Create a .zip archive of a file or folder
   */
  async zipFolder(sourcePath, outputZipName = '') {
    const srcFull = this._resolve(sourcePath);
    if (!fs.existsSync(srcFull)) throw new Error(`Source path not found: "${sourcePath}"`);

    let zipName = outputZipName || `${path.basename(sourcePath)}.zip`;
    if (!zipName.endsWith('.zip')) zipName += '.zip';
    const destFull = this._resolve(zipName);

    // Use PowerShell Compress-Archive on Windows
    await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      '$ErrorActionPreference = "Stop"; Compress-Archive -LiteralPath $env:SIS_ARCHIVE_SOURCE -DestinationPath $env:SIS_ARCHIVE_DEST -Force'], {
      cwd: this.root, timeout: 60000,
      env: { ...process.env, SIS_ARCHIVE_SOURCE: srcFull, SIS_ARCHIVE_DEST: destFull },
    });

    if (!fs.existsSync(destFull)) throw new Error('Zip archive generation failed');
    const stat = fs.statSync(destFull);

    return {
      success: true,
      zipPath: this._toRelative(destFull),
      size: stat.size,
      formattedSize: this._formatBytes(stat.size)
    };
  }

  /**
   * Extract a .zip archive into workspace
   */
  async extractZip(zipFilepath, destFolder = '') {
    const zipFull = this._resolve(zipFilepath);
    if (!fs.existsSync(zipFull)) throw new Error(`Zip archive not found: "${zipFilepath}"`);

    const destFull = this._resolve(destFolder);
    if (!fs.existsSync(destFull)) fs.mkdirSync(destFull, { recursive: true });

    const zipBuffer = fs.readFileSync(zipFull);
    const unzipped = unzipSync(new Uint8Array(zipBuffer));

    const entries = Object.entries(unzipped);
    const plan = [];
    for (const [entryName, content] of entries) {
      const normalized = entryName.replace(/^[\\/]+/, '');
      const targetPath = resolveWithinRoot(destFull, normalized);
      const isDir = entryName.endsWith('/') || entryName.endsWith('\\');
      plan.push({ content, targetPath, isDir });
    }

    for (const item of plan) {
      if (item.isDir) {
        fs.mkdirSync(item.targetPath, { recursive: true });
      } else {
        fs.mkdirSync(path.dirname(item.targetPath), { recursive: true });
        fs.writeFileSync(item.targetPath, Buffer.from(item.content));
      }
    }

    const extractedItems = this.listDir(destFolder, false);
    return {
      success: true,
      destFolder: this._toRelative(destFull),
      itemsCount: extractedItems.length,
      items: extractedItems
    };
  }

  // ─── COMMAND EXECUTION ───

  /**
   * Run a shell command in workspace or a subfolder
   */
  async runCommand(command, cwd = '', timeout = 60000) {
    if (this._isDangerousCommand(command)) {
      const msg = `Safety Protection: Potentially catastrophic or destructive command rejected: "${command}"`;
      return {
        blocked: true,
        error: msg,
        stdout: '',
        stderr: msg,
        exitCode: 1,
        cwd: this._toRelative(cwd ? this._resolve(cwd) : this.root),
        durationMs: 0
      };
    }
    let workDir = this._resolve(cwd);
    if (!cwd && /\bprojects[\\\/]/i.test(command)) {
      workDir = this.baseRoot;
    } else if (!fs.existsSync(workDir) || !fs.statSync(workDir).isDirectory()) {
      workDir = this.root;
    }
    let effectiveCommand = command;
    if (process.platform === 'win32') {
      // Normalize common Unix pipe patterns on Windows cmd.exe
      if (/\|\s*head\s+(?:-n\s*)?(\d+)/i.test(effectiveCommand)) {
        const lines = effectiveCommand.match(/\|\s*head\s+(?:-n\s*)?(\d+)/i)[1];
        effectiveCommand = effectiveCommand.replace(
          /\|\s*head\s+(?:-n\s*)?(\d+)/gi,
          `| node -e "const rl=require('readline').createInterface({input:process.stdin});let n=0;rl.on('line',l=>{if(n++<${lines})console.log(l);else process.exit(0);});"`,
        );
      }
    }
    const start = Date.now();
    const commandId = randomUUID();
    const scope = currentWorkspace();
    const publish = event => conversationWorkspaces.publish({ commandId, ...event });
    publish({ kind: 'command-start', command, cwd: workDir });
    return await new Promise(resolve => {
      const child = exec(effectiveCommand, {
        cwd: workDir, timeout: Math.min(Math.max(Number(timeout) || 60000, 1), 15 * 60000),
        maxBuffer: 1024 * 1024 * 10, windowsHide: true,
        env: childEnvironment({ PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' }),
      }, (error, stdout, stderr) => {
        const result = { stdout: stdout || '', stderr: stderr || error?.message || '',
          exitCode: error ? error.code || 1 : 0, cwd: this._toRelative(workDir),
          absoluteCwd: workDir, commandId, durationMs: Date.now() - start };
        publish({ kind:'command-end', exitCode:result.exitCode, durationMs:result.durationMs, error:error?.message });
        this.activeProcesses.delete(commandId);
        resolve(result);
      });
      this.activeProcesses.set(commandId, { child, command, cwd:workDir, conversationId:scope?.conversationId });
      for (const [stream, name] of [[child.stdout,'stdout'],[child.stderr,'stderr']]) {
        stream?.on('data', data => {
          const text=String(data);
          publish({ kind:'command-output', stream:name, text:text.slice(0,8192), truncated:text.length>8192 });
        });
      }
    });
  }

  /**
   * Execute a batch of file operations in sequence
   */
  async batchOperations(operations = []) {
    const results = [];
    for (const op of operations) {
      try {
        let res;
        switch (op.action) {
          case 'create_file':
            res = this.createFile(op.path, op.content);
            break;
          case 'read_file':
            res = this.readFile(op.path, op.options);
            break;
          case 'edit_file':
            res = this.editFile(op.path, op);
            break;
          case 'append_file':
            res = this.appendFile(op.path, op.content, op.prepend);
            break;
          case 'delete_file':
            res = this.deleteFile(op.path);
            break;
          case 'copy_file':
            res = this.copyFile(op.src, op.dest);
            break;
          case 'move_file':
            res = this.moveFile(op.src, op.dest);
            break;
          case 'create_folder':
            res = this.createFolder(op.path);
            break;
          case 'delete_folder':
            res = this.deleteFolder(op.path, op.recursive);
            break;
          case 'run_command':
            res = await this.runCommand(op.command, op.cwd, op.timeout);
            break;
          default:
            res = { error: `Unknown batch action: "${op.action}"` };
        }
        results.push({ action: op.action, path: op.path || op.src, ...res });
      } catch (err) {
        results.push({ action: op.action, error: err.message });
      }
    }
    return { count: results.length, results };
  }

  /**
   * List all synthesized theories across data/theories and workspace/theories
   */
  listTheories() {
    const theoriesDir = path.join(this.projectRoot, 'data', 'theories');
    const wsTheoriesDir = path.join(this.root, 'theories');
    const results = [];
    const seen = new Set();

    const scan = (dir, relPrefix) => {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        if (seen.has(file)) continue;
        seen.add(file);
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        let title = file;
        try {
          const content = fs.readFileSync(full, 'utf8');
          const titleMatch = content.match(/^#\s+(?:Unified Theory & Concept Report:\s*)?([^\r\n]+)/m);
          if (titleMatch) title = titleMatch[1].trim();
        } catch {}
        results.push({
          filename: file,
          path: `${relPrefix}/${file}`,
          title,
          size: stat.size,
          mtime: stat.mtimeMs
        });
      }
    };

    scan(wsTheoriesDir, 'workspace/theories');
    scan(theoriesDir, 'data/theories');

    return results.sort((a, b) => b.mtime - a.mtime);
  }

  /**
   * Fetch full theory document and code prototype by name/slug
   */
  getTheory(name) {
    const cleanName = path.basename(name);
    const wsPath = path.join(this.root, 'theories', cleanName);
    const dataPath = path.join(this.projectRoot, 'data', 'theories', cleanName);

    let target = null;
    if (fs.existsSync(wsPath)) target = wsPath;
    else if (fs.existsSync(dataPath)) target = dataPath;

    if (!target) return null;

    const content = fs.readFileSync(target, 'utf8');
    const codeName = cleanName.replace(/\.md$/, '').replace(/^theory_/, 'theory_') + '_prototype.js';
    const codePath = path.join(this.root, codeName);
    const codeContent = fs.existsSync(codePath) ? fs.readFileSync(codePath, 'utf8') : null;

    return {
      filename: cleanName,
      path: this._toRelative(target),
      markdown: content,
      codePrototype: codeContent
    };
  }
}

const workspace = new WorkspaceManager();
export default workspace;
