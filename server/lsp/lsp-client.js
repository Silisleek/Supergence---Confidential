import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { AstParser } from './ast-parser.js';

export class LspClient {
  constructor({ language = 'javascript', serverCommand = null, rootPath = process.cwd() } = {}) {
    this.language = language;
    this.serverCommand = serverCommand;
    this.rootPath = rootPath;
    this.process = null;
    this.isReady = false;
    this.requestId = 0;
    this.pendingRequests = new Map();
  }

  /**
   * Initializes language server connection if serverCommand is configured,
   * otherwise operates in high-performance AST fallback mode.
   */
  async start() {
    if (!this.serverCommand) {
      this.isReady = true;
      return { mode: 'ast-fallback', ready: true };
    }

    try {
      const parts = this.serverCommand.split(' ');
      this.process = spawn(parts[0], parts.slice(1), {
        cwd: this.rootPath,
        shell: process.platform === 'win32',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.process.on('error', (err) => {
        console.warn(
          `[LspClient] Server process error: ${err.message}. Falling back to AST parser.`,
        );
        this.process = null;
      });

      this.isReady = true;
      return { mode: 'lsp-server', ready: true, command: this.serverCommand };
    } catch (err) {
      console.warn(`[LspClient] Failed to start LSP server: ${err.message}. Using AST parser.`);
      this.isReady = true;
      return { mode: 'ast-fallback', ready: true };
    }
  }

  /**
   * Returns symbols within a file
   */
  async getDocumentSymbols(filePath) {
    const resolvedPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(this.rootPath, filePath);
    if (!fs.existsSync(resolvedPath)) {
      return { functions: [], classes: [], imports: [], exports: [], variables: [] };
    }

    const content = fs.readFileSync(resolvedPath, 'utf8');
    const ext = path.extname(resolvedPath).slice(1);
    const lang = ext === 'py' ? 'python' : ext === 'ts' ? 'typescript' : 'javascript';
    return AstParser.extractSymbols(content, lang);
  }

  /**
   * Check diagnostics / lint errors for a file
   */
  async getDiagnostics(filePath) {
    const resolvedPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(this.rootPath, filePath);
    if (!fs.existsSync(resolvedPath)) {
      return { errors: [`File not found: ${resolvedPath}`], warnings: [] };
    }

    const content = fs.readFileSync(resolvedPath, 'utf8');
    const errors = [];
    const warnings = [];

    // Basic syntax and structural heuristics
    const ext = path.extname(resolvedPath).toLowerCase();
    if (ext === '.js' || ext === '.mjs') {
      // Check for unclosed braces or quotes
      const openBraces = (content.match(/\{/g) || []).length;
      const closeBraces = (content.match(/\}/g) || []).length;
      if (openBraces !== closeBraces) {
        errors.push(`Mismatched braces: ${openBraces} opening vs ${closeBraces} closing`);
      }
      const openParens = (content.match(/\(/g) || []).length;
      const closeParens = (content.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        errors.push(`Mismatched parentheses: ${openParens} opening vs ${closeParens} closing`);
      }
    }

    return { filePath: resolvedPath, errors, warnings, valid: errors.length === 0 };
  }

  /**
   * Stop LSP server process
   */
  shutdown() {
    if (this.process) {
      try {
        this.process.kill();
      } catch {}
      this.process = null;
    }
    this.isReady = false;
  }
}

export default LspClient;
