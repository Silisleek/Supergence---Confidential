// SIS 1.0 — UI Self-Modification & Adaptation Engine
// Enables the autonomous agent to modify, adapt, restyle, and dynamically evolve
// its own user interface for itself or at the user's direction.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveWithinRoot } from '../utils/path-confinement.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const CLIENT_DIR = path.resolve(ROOT_DIR, 'client');
const DATA_DIR = process.env.SIS_DATA_DIR
  ? path.resolve(process.env.SIS_DATA_DIR)
  : path.resolve(ROOT_DIR, 'data');
const STORE_FILE = path.join(DATA_DIR, 'ui-customizations.json');

const SUPPORTED_THEMES = ['default', 'cyber', 'midnight', 'warm', 'matrix', 'minimal', 'obsidian'];

const SUPPORTED_TARGETS = [
  '#sisFloatingLayer',
  '#sisColSpace',
  '#sisCardTabHome',
  '#sisTopControlBar',
  '#sideAgentPanel',
  '#workspaceMain',
  '#deckVoiceControls',
  '#agentBrowserContainer',
  '#chatMessages',
  'body',
];

export class UISelfModificationEngine {
  constructor() {
    this.clientDir = CLIENT_DIR;
    this.storeFile = STORE_FILE;
    this.theme = 'default';
    this.customCssVars = {};
    this.customCss = '';
    this.widgets = new Map();
    this.history = [];
    this._loadStore();
  }

  _loadStore() {
    try {
      if (fs.existsSync(this.storeFile)) {
        const raw = fs.readFileSync(this.storeFile, 'utf8');
        const data = JSON.parse(raw);
        if (data && typeof data === 'object') {
          this.theme = data.theme || 'default';
          this.customCssVars = data.customCssVars || {};
          this.customCss = data.customCss || '';
          if (Array.isArray(data.widgets)) {
            for (const w of data.widgets) {
              if (w && w.id) this.widgets.set(w.id, w);
            }
          } else if (data.widgets && typeof data.widgets === 'object') {
            for (const [id, w] of Object.entries(data.widgets)) {
              if (w && id) this.widgets.set(id, { ...w, id });
            }
          }
          this.history = Array.isArray(data.history) ? data.history.slice(-100) : [];
        }
      }
    } catch (err) {
      console.warn('[UISelfModification] Warning loading UI customizations:', err.message);
    }
  }

  _saveStore() {
    try {
      const dir = path.dirname(this.storeFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const payload = {
        version: '1.0',
        updatedAt: new Date().toISOString(),
        theme: this.theme,
        customCssVars: this.customCssVars,
        customCss: this.customCss,
        widgets: Array.from(this.widgets.values()),
        history: this.history.slice(-100),
      };
      fs.writeFileSync(this.storeFile, JSON.stringify(payload, null, 2), 'utf8');
    } catch (err) {
      console.error('[UISelfModification] Error saving UI customizations:', err.message);
    }
  }

  _broadcast(type, data = {}) {
    try {
      if (
        globalThis.__supergence_brain &&
        typeof globalThis.__supergence_brain.broadcast === 'function'
      ) {
        globalThis.__supergence_brain.broadcast(type, data);
      }
    } catch (err) {
      console.warn('[UISelfModification] Broadcast error:', err.message);
    }
  }

  getUIState() {
    return {
      theme: this.theme,
      customCssVars: { ...this.customCssVars },
      customCss: this.customCss,
      widgets: Array.from(this.widgets.values()),
      history: this.history.slice(-20),
      supportedThemes: SUPPORTED_THEMES,
      supportedTargets: SUPPORTED_TARGETS,
    };
  }

  modifyUITheme({ theme, customCssVars = {}, customCss = '', author = 'agent' } = {}) {
    if (theme && typeof theme === 'string') {
      const cleanTheme = theme.toLowerCase().trim();
      this.theme = cleanTheme;
    }
    if (customCssVars && typeof customCssVars === 'object') {
      this.customCssVars = { ...this.customCssVars, ...customCssVars };
    }
    if (typeof customCss === 'string') {
      this.customCss = customCss;
    }

    const record = {
      action: 'MODIFY_THEME',
      theme: this.theme,
      customCssVars: this.customCssVars,
      customCss: this.customCss,
      author,
      timestamp: Date.now(),
    };
    this.history.push(record);
    this._saveStore();

    this._broadcast('ui:theme-update', {
      theme: this.theme,
      customCssVars: this.customCssVars,
      customCss: this.customCss,
      timestamp: Date.now(),
    });

    return {
      success: true,
      theme: this.theme,
      customCssVars: this.customCssVars,
      customCss: this.customCss,
    };
  }

  injectUIWidget({
    id,
    title,
    target = '#sisFloatingLayer',
    html,
    css = '',
    js = '',
    position = 'append',
    author = 'agent',
  } = {}) {
    if (!id || typeof id !== 'string') {
      throw new Error('Widget ID is required and must be a string.');
    }
    const cleanId = id.trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
    if (!html || typeof html !== 'string') {
      throw new Error('Widget HTML content is required.');
    }

    const widget = {
      id: cleanId,
      title: title || cleanId,
      target: target || '#sisFloatingLayer',
      html,
      css: css || '',
      js: js || '',
      position: position === 'prepend' ? 'prepend' : 'append',
      author,
      updatedAt: Date.now(),
      createdAt: this.widgets.get(cleanId)?.createdAt || Date.now(),
    };

    this.widgets.set(cleanId, widget);
    this.history.push({
      action: 'INJECT_WIDGET',
      widgetId: cleanId,
      target: widget.target,
      author,
      timestamp: Date.now(),
    });
    this._saveStore();

    this._broadcast('ui:widget-injected', {
      widget,
      timestamp: Date.now(),
    });

    return {
      success: true,
      widget,
    };
  }

  removeUIWidget({ id, author = 'agent' } = {}) {
    if (!id || typeof id !== 'string') {
      throw new Error('Widget ID is required.');
    }
    const cleanId = id.trim();
    const existing = this.widgets.get(cleanId);
    if (!existing) {
      return { success: false, error: `Widget "${cleanId}" not found.` };
    }

    this.widgets.delete(cleanId);
    this.history.push({
      action: 'REMOVE_WIDGET',
      widgetId: cleanId,
      author,
      timestamp: Date.now(),
    });
    this._saveStore();

    this._broadcast('ui:widget-removed', {
      id: cleanId,
      timestamp: Date.now(),
    });

    return {
      success: true,
      id: cleanId,
    };
  }

  modifyUISource({
    file,
    targetContent = null,
    replacementContent = null,
    fullContent = null,
    author = 'agent',
  } = {}) {
    if (!file || typeof file !== 'string') {
      throw new Error('File path relative to client/ is required.');
    }

    // Path confinement: enforce that target strictly stays within client/
    const resolvedPath = resolveWithinRoot(this.clientDir, file);
    const ext = path.extname(resolvedPath).toLowerCase();
    if (!['.html', '.css', '.js'].includes(ext)) {
      throw new Error(
        `Modification prohibited: unsupported file extension "${ext}". Only .html, .css, and .js files in client/ are allowed.`,
      );
    }

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`File not found within client: ${file}`);
    }

    const originalContent = fs.readFileSync(resolvedPath, 'utf8');
    let newContent;

    if (fullContent !== null && typeof fullContent === 'string') {
      newContent = fullContent;
    } else if (targetContent !== null && replacementContent !== null) {
      if (!originalContent.includes(targetContent)) {
        throw new Error(`Target content not found in ${file}. Modification aborted.`);
      }
      newContent = originalContent.replace(targetContent, replacementContent);
    } else {
      throw new Error(
        'Either fullContent or both targetContent and replacementContent must be provided.',
      );
    }

    // Syntax validation before writing
    this._validateSource(newContent, ext, file);

    // Create atomic timestamped backup
    const backupDir = path.join(DATA_DIR, 'ui-backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const relFileSafe = file.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const backupPath = path.join(backupDir, `${relFileSafe}.${Date.now()}.bak`);
    fs.writeFileSync(backupPath, originalContent, 'utf8');

    try {
      fs.writeFileSync(resolvedPath, newContent, 'utf8');
    } catch (writeErr) {
      // Revert if write failed
      fs.writeFileSync(resolvedPath, originalContent, 'utf8');
      throw writeErr;
    }

    const relFile = path.relative(this.clientDir, resolvedPath);
    this.history.push({
      action: 'MODIFY_SOURCE',
      file: relFile,
      backupPath,
      author,
      timestamp: Date.now(),
    });
    this._saveStore();

    this._broadcast('ui:source-updated', {
      file: relFile,
      extension: ext,
      timestamp: Date.now(),
    });

    return {
      success: true,
      file: relFile,
      backupPath,
      bytesWritten: Buffer.byteLength(newContent, 'utf8'),
    };
  }

  rollbackUISource({ file, backupPath } = {}) {
    if (!file || !backupPath) {
      throw new Error('Both file and backupPath are required for rollback.');
    }
    const resolvedPath = resolveWithinRoot(this.clientDir, file);
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }
    const backupContent = fs.readFileSync(backupPath, 'utf8');
    fs.writeFileSync(resolvedPath, backupContent, 'utf8');

    const relFile = path.relative(this.clientDir, resolvedPath);
    this._broadcast('ui:source-updated', {
      file: relFile,
      rollback: true,
      timestamp: Date.now(),
    });

    return {
      success: true,
      file: relFile,
      restoredFrom: backupPath,
    };
  }

  _validateSource(content, ext, file) {
    if (ext === '.js') {
      try {
        // Quick syntax parse validation
        new Function(content);
      } catch (err) {
        // If it's an ES module (has import/export), Function() constructor might fail with 'Cannot use import statement'
        // That is acceptable for ES module syntax; only reject true syntax errors like unbalanced tokens
        if (
          !err.message.includes('Cannot use import statement') &&
          !err.message.includes("Unexpected token 'export'")
        ) {
          throw new Error(`JS Syntax Error in ${file}: ${err.message}`, { cause: err });
        }
      }
    } else if (ext === '.css') {
      let openBraces = 0;
      for (const char of content) {
        if (char === '{') openBraces++;
        if (char === '}') openBraces--;
      }
      if (openBraces !== 0) {
        throw new Error(`CSS Syntax Error in ${file}: Unbalanced braces (${openBraces} unclosed).`);
      }
    }
  }
}

const uiSelfModification = new UISelfModificationEngine();
export default uiSelfModification;
