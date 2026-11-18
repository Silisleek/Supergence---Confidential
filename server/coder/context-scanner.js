// SIS 1.0 — Codebase Retrieval Funnel (Stage 0 to Stage 5)
// Implements the 5-Stage Retrieval Funnel from the Elite Coding Blueprint (§2.2).
// Combines Capped Repository Constitution + Hybrid Search (BM25 + TF-IDF + RRF k=60)
// + Symbol Extraction + Enclosing Scope Emission.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HybridSearchEngine } from '../memory/hybrid-search.js';
import { resolveWithinRoot } from '../utils/path-confinement.js';
import { AstParser } from '../lsp/ast-parser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const WORKSPACE_DIR = path.resolve(
  process.env.SIS_WORKSPACE_DIR || path.join(PROJECT_ROOT, 'workspace'),
);

export class ContextScanner {
  constructor(workspaceDir = WORKSPACE_DIR, projectRoot = PROJECT_ROOT) {
    this.workspaceDir = workspaceDir;
    this.projectRoot = projectRoot;
    this.searchEngine = new HybridSearchEngine({ k1: 1.5, b: 0.75, rrfK: 60 });
    this.lastIndexedTime = 0;
    this.indexedFiles = new Map();
    this.indexedRoot = null;
  }

  /**
   * Stage 0: Capped Repository Constitution
   * Emits directory tree (depth 3), entry points, dependencies, and test commands.
   * Cap at ~400-600 tokens to ground the model without burning context.
   */
  buildRepoConstitution(targetDir = this.workspaceDir) {
    const constitution = [];
    const root = fs.existsSync(targetDir) ? targetDir : this.projectRoot;

    // 1. Directory Tree (capped depth 3)
    const tree = this._renderTree(root, 3);
    constitution.push(`### Repository Constitution (Depth 3)\n\`\`\`text\n${tree}\n\`\`\``);

    // 2. Manifest & Commands
    const pkgPath = path.join(root, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const info = {
          name: pkg.name || 'sis-project',
          type: pkg.type || 'commonjs',
          scripts: pkg.scripts || {},
          main: pkg.main || pkg.module,
          keyDependencies: Object.keys(pkg.dependencies || {}).slice(0, 15),
        };
        constitution.push(
          `### Project Manifest & Commands\n\`\`\`json\n${JSON.stringify(info, null, 2)}\n\`\`\``,
        );
      } catch (_) {}
    }

    return constitution.join('\n\n');
  }

  /**
   * Run the 5-stage Retrieval Funnel for a query
   * Stage 0: Constitution
   * Stage 1 & 2: BM25 + TF-IDF RRF (HybridSearchEngine)
   * Stage 3 & 4: Symbol extraction & caller/callee context
   * Stage 5: Enclosing scope emission
   *
   * @param {string} userMessage - Search query / bug description
   * @param {Object} [options]
   * @returns {Promise<string>} Formatted context packet
   */
  async buildContext(userMessage = '', options = {}) {
    const targetDir = path.resolve(options.targetDir || this.workspaceDir);
    const constitution = this.buildRepoConstitution(targetDir);

    // Ensure hybrid search index is populated & up-to-date
    this._ensureIndex(targetDir);

    // Stage 1 & 2: Lexical + Dense RRF Search
    const searchResults = this.searchEngine.search(userMessage, { top_k: 12 });

    const queryTokens = new Set(userMessage.toLowerCase().match(/[\w$]+/g) || []);
    const snippets = [];
    const visitedFiles = new Set();

    // Priority insertion for targetFile and testFile if specified
    const priorityFiles = [options.targetFile, options.testFile].filter(Boolean);
    for (const pf of priorityFiles) {
      let fullPf;
      try {
        fullPf = resolveWithinRoot(targetDir, pf);
      } catch {
        continue;
      }
      if (fs.statSync(fullPf, { throwIfNoEntry: false })?.isFile() && !visitedFiles.has(fullPf)) {
        visitedFiles.add(fullPf);
        const content = fs.readFileSync(fullPf, 'utf8');
        const relPath = path.relative(this.projectRoot, fullPf).replace(/\\/g, '/');
        snippets.push(
          `#### Target Priority File: ${relPath}\n\`\`\`javascript\n${content.slice(0, 4000)}\n\`\`\``,
        );
      }
    }

    for (const res of searchResults) {
      const filePath = res.payload?.filePath || res.id;
      if (!filePath || visitedFiles.has(filePath)) continue;
      visitedFiles.add(filePath);

      if (!fs.existsSync(filePath)) continue;
      const content = fs.readFileSync(filePath, 'utf8');
      const relPath = path.relative(this.projectRoot, filePath).replace(/\\/g, '/');

      const symbols = AstParser.extractSymbols(content, path.extname(filePath).slice(1));

      const symbolLines = [];
      if (symbols.exports?.length > 0) {
        symbolLines.push(
          ...symbols.exports.map((e) => `  export ${e.type} ${e.name} (line ${e.line})`),
        );
      }
      if (symbols.classes?.length > 0) {
        symbolLines.push(
          ...symbols.classes.map(
            (c) =>
              `  class ${c.name}${c.superClass ? ' extends ' + c.superClass : ''} { ${c.methods.map((m) => m.name).join(', ')} }`,
          ),
        );
      }
      if (symbols.functions?.length > 0) {
        symbolLines.push(
          ...symbols.functions.map(
            (f) => `  ${f.isAsync ? 'async ' : ''}function ${f.name}(${f.params.join(', ')})`,
          ),
        );
      }

      const lines = content.split('\n');
      const matchingSymbols = [
        ...symbols.functions,
        ...symbols.classes,
        ...symbols.classes.flatMap((symbol) => symbol.methods),
        ...symbols.variables,
        ...symbols.exports,
      ].filter(
        ({ name }) =>
          name &&
          (queryTokens.has(name.toLowerCase()) ||
            name
              .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
              .toLowerCase()
              .split(/[_\s]+/)
              .some((part) => part.length >= 3 && queryTokens.has(part))),
      );
      const relevantScopes = [];
      const seenLines = new Set();
      for (const symbol of matchingSymbols.sort(
        (a, b) => a.endLine - a.line - (b.endLine - b.line),
      )) {
        if (seenLines.has(symbol.line)) continue;
        const start = symbol.line - 1;
        const end = Math.min(symbol.endLine, start + 16);
        relevantScopes.push(
          `  // ${symbol.name} (lines ${start + 1}-${end})\n` + lines.slice(start, end).join('\n'),
        );
        seenLines.add(symbol.line);
        if (relevantScopes.length >= 2) break;
      }

      const snippetBlock = [
        `#### File: ${relPath} (RRF Score: ${res.score.toFixed(4)})`,
        symbolLines.length > 0
          ? `// Exported API Signatures:\n${symbolLines.slice(0, 10).join('\n')}`
          : null,
        relevantScopes.length > 0
          ? `// Relevant Enclosing Scopes:\n${relevantScopes.join('\n\n')}`
          : content.length < 800
            ? content
            : null,
      ]
        .filter(Boolean)
        .join('\n');

      snippets.push(snippetBlock);
      if (snippets.length >= 5) break;
    }

    const sections = [constitution];
    if (snippets.length > 0) {
      sections.push(
        `### Relevant Code Locations & Enclosing Scopes (Retrieval Funnel)\n${snippets.join('\n\n')}`,
      );
    }

    return sections.join('\n\n');
  }

  _ensureIndex(dir) {
    if (dir !== this.indexedRoot) {
      for (const filePath of this.indexedFiles.keys()) this.searchEngine.removeDocument(filePath);
      this.indexedFiles.clear();
      this.indexedRoot = dir;
    }
    const now = Date.now();
    // Reindex if > 30s elapsed or files modified
    if (now - this.lastIndexedTime < 30000 && this.indexedFiles.size > 0) return;

    const files = this._listAllFiles(dir);
    const currentFiles = new Set(files.map(({ fullPath }) => fullPath));
    for (const filePath of this.indexedFiles.keys()) {
      if (currentFiles.has(filePath)) continue;
      this.searchEngine.removeDocument(filePath);
      this.indexedFiles.delete(filePath);
    }
    for (const f of files) {
      const prevMtime = this.indexedFiles.get(f.fullPath);
      if (prevMtime && prevMtime === f.mtime) continue;

      try {
        const content = fs.readFileSync(f.fullPath, 'utf8');
        const symbols = AstParser.extractSymbols(content, f.ext.slice(1));
        const names = [
          ...symbols.functions,
          ...symbols.classes,
          ...symbols.variables,
          ...symbols.exports,
          ...symbols.classes.flatMap((symbol) => symbol.methods),
        ]
          .map((symbol) => symbol.name)
          .filter(Boolean);
        this.searchEngine.indexDocument(
          f.fullPath,
          `${f.relativePath}\n${[...new Set(names)].join(' ')}\n${content.slice(0, 10000)}`,
          {
            filePath: f.fullPath,
            relativePath: f.relativePath,
            size: f.size,
          },
        );
        this.indexedFiles.set(f.fullPath, f.mtime);
      } catch (_) {}
    }

    this.lastIndexedTime = now;
  }

  _renderTree(dir, maxDepth = 3, currentDepth = 0, prefix = '') {
    if (!fs.existsSync(dir) || currentDepth >= maxDepth) return '';
    const entries = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter(
        (e) =>
          !e.name.startsWith('.') &&
          e.name !== 'node_modules' &&
          e.name !== 'dist' &&
          e.name !== 'coverage',
      );

    const lines = [];
    for (let i = 0; i < Math.min(entries.length, 25); i++) {
      const entry = entries[i];
      const isLast = i === Math.min(entries.length, 25) - 1;
      const pointer = isLast ? '└── ' : '├── ';
      lines.push(`${prefix}${pointer}${entry.name}`);

      if (entry.isDirectory() && currentDepth + 1 < maxDepth) {
        const subPrefix = prefix + (isLast ? '    ' : '│   ');
        const subTree = this._renderTree(
          path.join(dir, entry.name),
          maxDepth,
          currentDepth + 1,
          subPrefix,
        );
        if (subTree) lines.push(subTree);
      }
    }
    return lines.join('\n');
  }

  _listAllFiles(dir, baseDir = dir, maxFiles = 300) {
    const results = [];
    if (!fs.existsSync(dir)) return results;

    const ALLOWED_EXTS = new Set([
      '.js',
      '.mjs',
      '.cjs',
      '.ts',
      '.tsx',
      '.mts',
      '.cts',
      '.jsx',
      '.py',
      '.json',
      '.md',
    ]);
    const IGNORED_NAMES = new Set([
      '.sandbox',
      'node_modules',
      'dist',
      'coverage',
      '.git',
      'screenshots',
      'tmp',
      'temp',
    ]);

    const walk = (currentDir) => {
      if (results.length >= maxFiles) return;
      try {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
          if (results.length >= maxFiles) break;
          if (entry.name.startsWith('.') || IGNORED_NAMES.has(entry.name)) continue;

          // In workspace or root, skip generated HTML demos/games and non-code assets
          if (
            entry.name.endsWith('.html') ||
            entry.name.endsWith('.png') ||
            entry.name.endsWith('.jpg') ||
            entry.name.endsWith('.pdb')
          )
            continue;

          const fullPath = path.join(currentDir, entry.name);
          const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

          if (entry.isDirectory()) {
            walk(fullPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (!ALLOWED_EXTS.has(ext)) continue;

            const stat = fs.statSync(fullPath);
            if (stat.size > 200 * 1024) continue; // Skip huge files > 200KB

            results.push({
              fullPath,
              relativePath,
              size: stat.size,
              mtime: stat.mtimeMs,
              ext,
            });
          }
        }
      } catch (_) {}
    };

    walk(dir);
    return results;
  }
}

export const contextScanner = new ContextScanner();
export default contextScanner;
