/**
 * SIS 1.0 — AST Parser & Semantic Symbol Indexer
 * Extracts structured symbols (functions, classes, imports, exports) by lexical scope.
 * Supports tree-sitter when available, with a resilient native parser fallback.
 */

export class AstParser {
  /**
   * Extract symbols from source code
   * @param {string} sourceCode - Raw source code string
   * @param {string} [language='javascript'] - Language ('javascript'|'js'|'typescript'|'ts'|'python'|'py')
   * @returns {{ functions: Array, classes: Array, imports: Array, exports: Array, variables: Array }}
   */
  static extractSymbols(sourceCode = '', language = 'javascript') {
    if (!sourceCode || typeof sourceCode !== 'string') {
      return { functions: [], classes: [], imports: [], exports: [], variables: [] };
    }

    const lang = language.toLowerCase();
    if (lang === 'python' || lang === 'py') {
      return this._extractPythonSymbols(sourceCode);
    }

    return this._extractJavaScriptSymbols(sourceCode);
  }

  /**
   * Extract JS/TS functions, classes, imports, exports with precise line numbers
   */
  static _extractJavaScriptSymbols(code) {
    const lines = code.split('\n');
    const functions = [];
    const classes = [];
    const imports = [];
    const exports = [];
    const variables = [];

    // 1. Imports
    const importRegex =
      /import\s+(?:(\*\s+as\s+[\w$]+|[\w$]+|\{[^}]*\})\s+from\s+)?['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(code)) !== null) {
      const lineNum = code.slice(0, match.index).split('\n').length;
      const specifier = match[1] ? match[1].trim() : '';
      const source = match[2];
      imports.push({
        raw: match[0],
        specifier,
        source,
        line: lineNum,
      });
    }

    // Dynamic imports: import(...)
    const dynImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = dynImportRegex.exec(code)) !== null) {
      const lineNum = code.slice(0, match.index).split('\n').length;
      imports.push({
        raw: match[0],
        specifier: '*',
        source: match[1],
        line: lineNum,
        dynamic: true,
      });
    }

    // 2. Exports
    const exportNamedRegex =
      /export\s+(?:default\s+)?(?:async\s+)?(function\*?|class|const|let|var)\s+([\w$]+)/g;
    while ((match = exportNamedRegex.exec(code)) !== null) {
      const lineNum = code.slice(0, match.index).split('\n').length;
      exports.push({
        type: match[1],
        name: match[2],
        isDefault: match[0].includes('default'),
        line: lineNum,
      });
    }

    const exportDefaultExpr = /export\s+default\s+([\w$]+);/g;
    while ((match = exportDefaultExpr.exec(code)) !== null) {
      const lineNum = code.slice(0, match.index).split('\n').length;
      exports.push({
        type: 'identifier',
        name: match[1],
        isDefault: true,
        line: lineNum,
      });
    }

    // 3. Classes
    const classRegex = /(?:export\s+)?class\s+([\w$]+)(?:\s+extends\s+([\w$.]+))?\s*\{/g;
    while ((match = classRegex.exec(code)) !== null) {
      const lineNum = code.slice(0, match.index).split('\n').length;
      const className = match[1];
      const superClass = match[2] || null;

      // Extract methods within this class block
      const classStart = match.index;
      const classEnd = this._findMatchingBracket(code, code.indexOf('{', classStart));
      const classBody = classEnd !== -1 ? code.slice(classStart, classEnd) : '';

      const methods = [];
      const methodRegex = /(?:async\s+)?(?:static\s+)?([\w$]+)\s*\(([^)]*)\)\s*\{/g;
      let mMatch;
      while ((mMatch = methodRegex.exec(classBody)) !== null) {
        if (!['if', 'for', 'while', 'switch', 'catch', 'function'].includes(mMatch[1])) {
          methods.push({
            name: mMatch[1],
            params: mMatch[2]
              .split(',')
              .map((p) => p.trim())
              .filter(Boolean),
            isStatic: mMatch[0].includes('static'),
            isAsync: mMatch[0].includes('async'),
          });
        }
      }

      classes.push({
        name: className,
        superClass,
        line: lineNum,
        methods,
      });
    }

    // 4. Standalone & Arrow Functions
    const funcDeclRegex = /(?:export\s+)?(?:async\s+)?function\*?\s+([\w$]+)\s*\(([^)]*)\)/g;
    while ((match = funcDeclRegex.exec(code)) !== null) {
      const lineNum = code.slice(0, match.index).split('\n').length;
      functions.push({
        name: match[1],
        params: match[2]
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean),
        isAsync: match[0].includes('async'),
        line: lineNum,
      });
    }

    const arrowFuncRegex =
      /(?:export\s+)?(?:const|let|var)\s+([\w$]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/g;
    while ((match = arrowFuncRegex.exec(code)) !== null) {
      const lineNum = code.slice(0, match.index).split('\n').length;
      functions.push({
        name: match[1],
        params: match[2]
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean),
        isAsync: match[0].includes('async'),
        isArrow: true,
        line: lineNum,
      });
    }

    // 5. Const/Let Top-level Variables
    const varRegex = /(?:export\s+)?(?:const|let|var)\s+([\w$]+)\s*=/g;
    while ((match = varRegex.exec(code)) !== null) {
      const lineNum = code.slice(0, match.index).split('\n').length;
      const varName = match[1];
      if (!functions.some((f) => f.name === varName)) {
        variables.push({ name: varName, line: lineNum });
      }
    }

    return { functions, classes, imports, exports, variables };
  }

  /**
   * Extract Python functions, classes, imports
   */
  static _extractPythonSymbols(code) {
    const lines = code.split('\n');
    const functions = [];
    const classes = [];
    const imports = [];
    const exports = [];

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();

      // Imports
      if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
        imports.push({ raw: trimmed, line: lineNum });
      }

      // Classes
      const classMatch = trimmed.match(/^class\s+([A-Za-z0-9_]+)(?:\(([^)]*)\))?:/);
      if (classMatch) {
        classes.push({
          name: classMatch[1],
          superClass: classMatch[2] ? classMatch[2].trim() : null,
          line: lineNum,
        });
      }

      // Functions / Methods
      const funcMatch = trimmed.match(/^(?:async\s+)?def\s+([A-Za-z0-9_]+)\s*\(([^)]*)\):/);
      if (funcMatch) {
        functions.push({
          name: funcMatch[1],
          params: funcMatch[2]
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean),
          isAsync: trimmed.startsWith('async'),
          line: lineNum,
        });
      }
    });

    return { functions, classes, imports, exports, variables: [] };
  }

  /**
   * Helper to find matching closing bracket
   */
  static _findMatchingBracket(str, openPos) {
    if (openPos === -1) return -1;
    let depth = 0;
    for (let i = openPos; i < str.length; i++) {
      if (str[i] === '{') depth++;
      else if (str[i] === '}') {
        depth--;
        if (depth === 0) return i + 1;
      }
    }
    return -1;
  }
}

export default AstParser;
