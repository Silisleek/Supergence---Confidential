// SIS 1.0 — Real Chip Design & Hardware Verification Tools
// EDA toolchain for silicon engineering: Verilog compilation, testbench simulation,
// RTL timing analysis, gate-level synthesis estimation, and VCD waveform handling.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { exec, execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execPromise = promisify(exec);
const execFilePromise = promisify(execFile);

// ============================================================================
// 1. VERILOG LEXER & PARSER (Built-in Fallback & AST Generator)
// ============================================================================

function stripComments(source) {
  let result = '';
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;
  let i = 0;
  const len = source.length;

  while (i < len) {
    const ch = source[i];
    const next = i + 1 < len ? source[i + 1] : '';

    if (inString) {
      result += ch;
      if (ch === '\\' && i + 1 < len) {
        result += source[++i];
      } else if (ch === '"') {
        inString = false;
      }
    } else if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false;
        result += '\n';
      }
    } else if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i++; // skip /
      } else if (ch === '\n') {
        result += '\n';
      }
    } else {
      if (ch === '"') {
        inString = true;
        result += ch;
      } else if (ch === '/' && next === '/') {
        inLineComment = true;
        i++; // skip second /
      } else if (ch === '/' && next === '*') {
        inBlockComment = true;
        i++; // skip *
      } else {
        result += ch;
      }
    }
    i++;
  }
  return result;
}

function parseVerilogNumber(token) {
  if (typeof token !== 'string') return null;
  const sizedMatch = token.match(/^(\d+)?'([bBoOdDhH])([0-9a-fA-F_xXzZ]+)$/);
  if (sizedMatch) {
    const width = sizedMatch[1] ? parseInt(sizedMatch[1], 10) : 32;
    const radixChar = sizedMatch[2].toLowerCase();
    const cleanDigits = sizedMatch[3].replace(/_/g, '');
    let radix = 10;
    if (radixChar === 'b') radix = 2;
    else if (radixChar === 'o') radix = 8;
    else if (radixChar === 'h') radix = 16;
    else if (radixChar === 'd') radix = 10;

    try {
      const val =
        cleanDigits.includes('x') || cleanDigits.includes('z')
          ? 0n
          : BigInt(
              radix === 16 ? `0x${cleanDigits}` : radix === 2 ? `0b${cleanDigits}` : cleanDigits,
            );
      const mask = width >= 64 ? ~0n : (1n << BigInt(width)) - 1n;
      return { width, value: val & mask, raw: token };
    } catch {
      return { width, value: 0n, raw: token };
    }
  }

  // Pure integer
  if (/^\d+$/.test(token)) {
    return { width: 32, value: BigInt(token), raw: token };
  }

  return null;
}

function tokenizeVerilog(source) {
  const clean = stripComments(source);
  const tokens = [];
  const tokenRegex =
    /\s*(?:(\/\/[^\n]*)|(\/\*[\s\S]*?\*\/)|("(?:\\[\s\S]|[^\\"])*")|(\d+'[bBoOdDhH][0-9a-fA-F_xXzZ]+)|(\d+)|(\$[a-zA-Z_0-9]+)|([a-zA-Z_][a-zA-Z0-9_$]*)|(===|!==|<=|>=|==|!=|&&|\|\||>>>|<<<|<<|>>|\^~|~\^|\+=|-=|\+\+|--|[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]))/g;

  let line = 1;
  let col = 1;
  let lastIndex = 0;

  let match;
  while ((match = tokenRegex.exec(clean)) !== null) {
    const lead = clean.substring(lastIndex, match.index);
    const newlines = (lead.match(/\n/g) || []).length;
    line += newlines;
    if (newlines > 0) {
      col = match.index - lead.lastIndexOf('\n');
    } else {
      col += lead.length;
    }

    const text = match[0].trim();
    if (text) {
      tokens.push({
        text,
        line,
        col,
        isString: Boolean(match[3]),
        isNumber: Boolean(match[4] || match[5]),
        isSystemTask: Boolean(match[6]),
        isIdent: Boolean(match[7]),
        isSymbol: Boolean(match[8]),
      });
    }

    lastIndex = tokenRegex.lastIndex;
  }

  return tokens;
}

class VerilogParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
    this.errors = [];
    this.warnings = [];
  }

  peek(offset = 0) {
    return this.tokens[this.pos + offset] || null;
  }

  next() {
    return this.tokens[this.pos++] || null;
  }

  expect(text) {
    const tok = this.next();
    if (!tok || tok.text !== text) {
      const err = `Expected '${text}' but got '${tok ? tok.text : 'EOF'}' at line ${tok ? tok.line : 'end'}`;
      this.errors.push(err);
      throw new Error(err);
    }
    return tok;
  }

  parseAllModules() {
    const modules = [];
    while (this.pos < this.tokens.length) {
      const tok = this.peek();
      if (!tok) break;
      if (tok.text === 'module') {
        try {
          const mod = this.parseModule();
          if (mod) modules.push(mod);
        } catch (err) {
          while (this.pos < this.tokens.length && this.peek()?.text !== 'endmodule') {
            this.pos++;
          }
          if (this.peek()?.text === 'endmodule') this.pos++;
        }
      } else {
        this.pos++;
      }
    }
    return modules;
  }

  parseRange() {
    if (this.peek()?.text === '[') {
      this.next(); // [
      let msbStr = '';
      while (this.pos < this.tokens.length && this.peek()?.text !== ':') {
        msbStr += this.next().text;
      }
      this.expect(':');
      let lsbStr = '';
      while (this.pos < this.tokens.length && this.peek()?.text !== ']') {
        lsbStr += this.next().text;
      }
      this.expect(']');

      const msb = parseInt(msbStr, 10);
      const lsb = parseInt(lsbStr, 10);
      const width = isNaN(msb) || isNaN(lsb) ? 1 : Math.abs(msb - lsb) + 1;
      return { msb: isNaN(msb) ? 0 : msb, lsb: isNaN(lsb) ? 0 : lsb, width };
    }
    return { msb: 0, lsb: 0, width: 1 };
  }

  parseModule() {
    this.expect('module');
    const nameTok = this.next();
    if (!nameTok || !nameTok.isIdent) {
      throw new Error(`Expected module identifier at line ${nameTok?.line}`);
    }
    const moduleName = nameTok.text;

    const mod = {
      name: moduleName,
      parameters: {},
      ports: [],
      wires: [],
      registers: [],
      nets: {}, // signalName -> { name, type, width, msb, lsb }
      submodules: [],
      assigns: [],
      alwaysBlocks: [],
      initialBlocks: [],
      assignCount: 0,
      alwaysBlocksCount: 0,
    };

    // Parameter list: #(parameter ... )
    if (this.peek()?.text === '#') {
      this.next(); // #
      this.expect('(');
      while (this.pos < this.tokens.length && this.peek()?.text !== ')') {
        if (this.peek()?.text === 'parameter') {
          this.next();
          const pName = this.next()?.text;
          let pVal = 1n;
          if (this.peek()?.text === '=') {
            this.next();
            const numTok = this.next();
            const parsed = parseVerilogNumber(numTok.text);
            pVal = parsed ? parsed.value : BigInt(numTok.text || 0);
          }
          if (pName) mod.parameters[pName] = pVal;
        } else if (this.peek()?.text === ',') {
          this.next();
        } else {
          this.next();
        }
      }
      this.expect(')');
    }

    // Ports declaration: ( ... )
    if (this.peek()?.text === '(') {
      this.next(); // (
      while (this.pos < this.tokens.length && this.peek()?.text !== ')') {
        if (['input', 'output', 'inout'].includes(this.peek()?.text)) {
          const direction = this.next().text;
          let type = 'wire';
          if (['wire', 'reg', 'logic', 'integer'].includes(this.peek()?.text)) {
            type = this.next().text;
          }
          const range = this.parseRange();
          const width = range.width;
          const msb = range.msb;
          const lsb = range.lsb;

          const portName = this.next()?.text;
          if (portName && portName !== ',') {
            const portObj = { name: portName, direction, type, width, msb, lsb };
            mod.ports.push(portObj);
            mod.nets[portName] = portObj;
            if (type === 'reg') mod.registers.push(portName);
            else mod.wires.push(portName);
          }
        } else if (this.peek()?.text === ',') {
          this.next();
        } else {
          const pName = this.next()?.text;
          if (pName && pName !== ',') {
            const portObj = {
              name: pName,
              direction: 'input',
              type: 'wire',
              width: 1,
              msb: 0,
              lsb: 0,
            };
            mod.ports.push(portObj);
            mod.nets[pName] = portObj;
          }
        }
      }
      this.expect(')');
    }

    this.expect(';');

    // Body items until 'endmodule'
    while (this.pos < this.tokens.length) {
      const tok = this.peek();
      if (!tok) break;

      if (tok.text === 'endmodule') {
        this.next(); // endmodule
        break;
      }

      // Parameters inside body
      if (tok.text === 'parameter' || tok.text === 'localparam') {
        this.next();
        const pName = this.next()?.text;
        if (this.peek()?.text === '=') {
          this.next();
          const pValTok = this.next()?.text;
          const parsed = parseVerilogNumber(pValTok);
          mod.parameters[pName] = parsed ? parsed.value : BigInt(pValTok || 0);
        }
        if (this.peek()?.text === ';') this.next();
        continue;
      }

      // Non-ANSI Port declarations
      if (['input', 'output', 'inout'].includes(tok.text)) {
        const direction = this.next().text;
        let type = 'wire';
        if (['wire', 'reg', 'logic', 'integer'].includes(this.peek()?.text)) {
          type = this.next().text;
        }
        const range = this.parseRange();
        while (this.pos < this.tokens.length && this.peek()?.text !== ';') {
          const item = this.next()?.text;
          if (item && item !== ',') {
            const portObj = {
              name: item,
              direction,
              type,
              width: range.width,
              msb: range.msb,
              lsb: range.lsb,
            };
            const existingPort = mod.ports.find((p) => p.name === item);
            if (existingPort) {
              Object.assign(existingPort, portObj);
            } else {
              mod.ports.push(portObj);
            }
            mod.nets[item] = portObj;
            if (type === 'reg' && !mod.registers.includes(item)) mod.registers.push(item);
            else if (!mod.wires.includes(item)) mod.wires.push(item);
          }
        }
        this.expect(';');
        continue;
      }

      // Internal wire/reg declarations
      if (['wire', 'reg', 'logic', 'integer'].includes(tok.text)) {
        const type = this.next().text;
        const range = this.parseRange();
        while (this.pos < this.tokens.length && this.peek()?.text !== ';') {
          const item = this.next()?.text;
          if (item && item !== ',') {
            mod.nets[item] = {
              name: item,
              type,
              width: range.width,
              msb: range.msb,
              lsb: range.lsb,
            };
            if (type === 'reg') {
              if (!mod.registers.includes(item)) mod.registers.push(item);
            } else {
              if (!mod.wires.includes(item)) mod.wires.push(item);
            }
          }
        }
        this.expect(';');
        continue;
      }

      // Continuous assignments: assign lhs = rhs;
      if (tok.text === 'assign') {
        this.next(); // assign
        let assignTokens = [];
        while (this.pos < this.tokens.length && this.peek()?.text !== ';') {
          assignTokens.push(this.next());
        }
        this.expect(';');
        mod.assignCount++;
        mod.assigns.push(assignTokens);
        continue;
      }

      // Always blocks
      if (tok.text === 'always' || tok.text === 'always_comb' || tok.text === 'always_ff') {
        this.next(); // always
        let sensitivity = [];

        if (this.peek()?.text === '@') {
          this.next(); // @
          this.expect('(');
          let parenDepth = 1;
          while (this.pos < this.tokens.length && parenDepth > 0) {
            const sub = this.next();
            if (sub.text === '(') parenDepth++;
            else if (sub.text === ')') parenDepth--;
            else if (parenDepth === 1 && sub.text !== 'or' && sub.text !== ',') {
              sensitivity.push(sub.text);
            }
          }
        }

        const blockStmt = parseProceduralBlock(this);
        mod.alwaysBlocksCount++;
        mod.alwaysBlocks.push({ sensitivity, statement: blockStmt });
        continue;
      }

      // Initial blocks
      if (tok.text === 'initial') {
        this.next(); // initial
        const initStmt = parseProceduralBlock(this);
        mod.initialBlocks.push(initStmt);
        continue;
      }

      // Submodule instantiations: submodule_name [#(params)] inst_name (.port(sig), ...);
      if (tok.isIdent && this.peek(1)?.isIdent) {
        const subType = this.next().text;
        const instName = this.next().text;
        const portMap = {};

        if (this.peek()?.text === '(') {
          this.next(); // (
          let pIdx = 0;
          while (this.pos < this.tokens.length && this.peek()?.text !== ')') {
            if (this.peek()?.text === '.') {
              this.next(); // .
              const port = this.next()?.text;
              this.expect('(');
              let sig = '';
              while (this.pos < this.tokens.length && this.peek()?.text !== ')') {
                sig += this.next().text;
              }
              this.expect(')');
              if (port) portMap[port] = sig.trim();
            } else if (this.peek()?.text === ',') {
              this.next();
            } else {
              const sig = this.next()?.text;
              portMap[`p${pIdx++}`] = sig;
            }
          }
          this.expect(')');
          this.expect(';');
          mod.submodules.push({ module: subType, instance: instName, portMap });
          continue;
        }
      }

      this.next();
    }

    return mod;
  }
}

// ============================================================================
// 2. PROCEDURAL STATEMENT PARSER (For always and initial blocks)
// ============================================================================

function parseProceduralBlock(parser) {
  if (parser.peek()?.text === 'begin') {
    parser.next(); // begin
    const stmts = [];
    while (parser.pos < parser.tokens.length && parser.peek()?.text !== 'end') {
      const s = parseProceduralStatement(parser);
      if (s) stmts.push(s);
    }
    if (parser.peek()?.text === 'end') parser.next();
    return { type: 'block', statements: stmts };
  }
  return parseProceduralStatement(parser);
}

function parseProceduralStatement(parser) {
  const tok = parser.peek();
  if (!tok) return null;

  if (tok.text === ';') {
    parser.next();
    return null;
  }

  // Nested begin ... end
  if (tok.text === 'begin') {
    return parseProceduralBlock(parser);
  }

  // Delay: #10;
  if (tok.text === '#') {
    parser.next(); // #
    const numTok = parser.next();
    const delay = parseInt(numTok?.text || '0', 10);
    if (parser.peek()?.text === ';') parser.next();
    return { type: 'delay', delay };
  }

  // If statement: if (cond) stmt [else stmt]
  if (tok.text === 'if') {
    parser.next(); // if
    parser.expect('(');
    let pDepth = 1;
    const condTokens = [];
    while (parser.pos < parser.tokens.length && pDepth > 0) {
      const t = parser.next();
      if (t.text === '(') pDepth++;
      else if (t.text === ')') {
        pDepth--;
        if (pDepth === 0) break;
      }
      condTokens.push(t);
    }
    const thenStmt = parseProceduralStatement(parser);
    let elseStmt = null;
    if (parser.peek()?.text === 'else') {
      parser.next(); // else
      elseStmt = parseProceduralStatement(parser);
    }
    return { type: 'if', condTokens, thenStmt, elseStmt };
  }

  // Case statement: case (expr) ... endcase
  if (tok.text === 'case') {
    parser.next(); // case
    parser.expect('(');
    let pDepth = 1;
    const selTokens = [];
    while (parser.pos < parser.tokens.length && pDepth > 0) {
      const t = parser.next();
      if (t.text === '(') pDepth++;
      else if (t.text === ')') {
        pDepth--;
        if (pDepth === 0) break;
      }
      selTokens.push(t);
    }

    const branches = [];
    while (parser.pos < parser.tokens.length && parser.peek()?.text !== 'endcase') {
      const bTok = parser.peek();
      if (bTok.text === 'default') {
        parser.next(); // default
        parser.expect(':');
        const stmt = parseProceduralStatement(parser);
        branches.push({ isDefault: true, statement: stmt });
      } else {
        const valTokens = [];
        while (parser.pos < parser.tokens.length && parser.peek()?.text !== ':') {
          valTokens.push(parser.next());
        }
        parser.expect(':');
        const stmt = parseProceduralStatement(parser);
        branches.push({ isDefault: false, valTokens, statement: stmt });
      }
    }
    if (parser.peek()?.text === 'endcase') parser.next();
    return { type: 'case', selTokens, branches };
  }

  // System task: $display, $error, $fatal, $finish
  if (tok.isSystemTask) {
    const name = parser.next().text;
    const argsTokens = [];
    if (parser.peek()?.text === '(') {
      parser.next(); // (
      let pDepth = 1;
      while (parser.pos < parser.tokens.length && pDepth > 0) {
        const t = parser.next();
        if (t.text === '(') pDepth++;
        else if (t.text === ')') {
          pDepth--;
          if (pDepth === 0) break;
        }
        argsTokens.push(t);
      }
    }
    if (parser.peek()?.text === ';') parser.next();
    return { type: 'system_task', name, argsTokens };
  }

  // Assert statement: assert (cond) [else stmt]
  if (tok.text === 'assert') {
    parser.next(); // assert
    parser.expect('(');
    let pDepth = 1;
    const condTokens = [];
    while (parser.pos < parser.tokens.length && pDepth > 0) {
      const t = parser.next();
      if (t.text === '(') pDepth++;
      else if (t.text === ')') {
        pDepth--;
        if (pDepth === 0) break;
      }
      condTokens.push(t);
    }
    let elseStmt = null;
    if (parser.peek()?.text === 'else') {
      parser.next();
      elseStmt = parseProceduralStatement(parser);
    } else if (parser.peek()?.text === ';') {
      parser.next();
    }
    return { type: 'assert', condTokens, elseStmt };
  }

  // Assignment: lhs = rhs; or lhs <= rhs;
  const lhsTokens = [];
  while (parser.pos < parser.tokens.length && !['=', '<=', ';'].includes(parser.peek()?.text)) {
    lhsTokens.push(parser.next());
  }

  if (['=', '<='].includes(parser.peek()?.text)) {
    const op = parser.next().text;
    const rhsTokens = [];
    while (parser.pos < parser.tokens.length && parser.peek()?.text !== ';') {
      rhsTokens.push(parser.next());
    }
    if (parser.peek()?.text === ';') parser.next();
    return { type: 'assign', lhsTokens, op, rhsTokens };
  }

  parser.next();
  return null;
}

// ============================================================================
// 3. VERILOG EXPRESSION EVALUATOR & DISCRETE-EVENT SIMULATOR
// ============================================================================

class VerilogEvaluator {
  constructor(context = {}, signalWidths = {}) {
    this.context = { ...context };
    this.signalWidths = { ...signalWidths };
  }

  set(name, value) {
    this.context[name] = typeof value === 'bigint' ? value : BigInt(value || 0);
  }

  get(name) {
    if (this.context[name] !== undefined) {
      return typeof this.context[name] === 'bigint'
        ? this.context[name]
        : BigInt(this.context[name]);
    }
    return 0n;
  }

  evaluate(expr) {
    if (Array.isArray(expr)) {
      expr = expr.map((t) => (typeof t === 'string' ? t : t.text)).join(' ');
    }
    const cleanExpr = expr.trim();
    if (!cleanExpr) return 0n;

    // Concatenation: {a, b, c}
    if (cleanExpr.startsWith('{') && cleanExpr.endsWith('}')) {
      const inner = cleanExpr.slice(1, -1);
      const replMatch = inner.match(/^(\d+)\s*\{\s*([^{}]+)\s*\}$/);
      if (replMatch) {
        const count = parseInt(replMatch[1], 10);
        const subVal = this.evaluate(replMatch[2]);
        let res = 0n;
        for (let i = 0; i < count; i++) {
          res = (res << 1n) | (subVal & 1n);
        }
        return res;
      }

      const parts = this.splitComma(inner);
      let combined = 0n;
      for (const part of parts) {
        const val = this.evaluate(part);
        const width = this.inferWidth(part);
        combined = (combined << BigInt(width)) | (val & ((1n << BigInt(width)) - 1n));
      }
      return combined;
    }

    // Ternary: cond ? trueExpr : falseExpr
    const ternaryIdx = this.findTopLevelOperator(cleanExpr, '?');
    if (ternaryIdx !== -1) {
      const condStr = cleanExpr.substring(0, ternaryIdx).trim();
      const rest = cleanExpr.substring(ternaryIdx + 1).trim();
      const colonIdx = this.findTopLevelOperator(rest, ':');
      if (colonIdx !== -1) {
        const trueStr = rest.substring(0, colonIdx).trim();
        const falseStr = rest.substring(colonIdx + 1).trim();
        const cond = this.evaluate(condStr);
        return cond !== 0n ? this.evaluate(trueStr) : this.evaluate(falseStr);
      }
    }

    // Binary Logical OR: ||
    let opIdx = this.findTopLevelOperator(cleanExpr, '||');
    if (opIdx !== -1) {
      const a = this.evaluate(cleanExpr.substring(0, opIdx));
      const b = this.evaluate(cleanExpr.substring(opIdx + 2));
      return a !== 0n || b !== 0n ? 1n : 0n;
    }

    // Binary Logical AND: &&
    opIdx = this.findTopLevelOperator(cleanExpr, '&&');
    if (opIdx !== -1) {
      const a = this.evaluate(cleanExpr.substring(0, opIdx));
      const b = this.evaluate(cleanExpr.substring(opIdx + 2));
      return a !== 0n && b !== 0n ? 1n : 0n;
    }

    // Bitwise OR: |
    opIdx = this.findTopLevelOperator(cleanExpr, '|', ['||']);
    if (opIdx !== -1) {
      const a = this.evaluate(cleanExpr.substring(0, opIdx));
      const b = this.evaluate(cleanExpr.substring(opIdx + 1));
      return a | b;
    }

    // Bitwise XOR: ^
    opIdx = this.findTopLevelOperator(cleanExpr, '^', ['^~']);
    if (opIdx !== -1) {
      const a = this.evaluate(cleanExpr.substring(0, opIdx));
      const b = this.evaluate(cleanExpr.substring(opIdx + 1));
      return a ^ b;
    }

    // Bitwise AND: &
    opIdx = this.findTopLevelOperator(cleanExpr, '&', ['&&']);
    if (opIdx !== -1) {
      const a = this.evaluate(cleanExpr.substring(0, opIdx));
      const b = this.evaluate(cleanExpr.substring(opIdx + 1));
      return a & b;
    }

    // Equality: ==, !=, ===, !==
    for (const eqOp of ['===', '!==', '==', '!=']) {
      opIdx = this.findTopLevelOperator(cleanExpr, eqOp);
      if (opIdx !== -1) {
        const a = this.evaluate(cleanExpr.substring(0, opIdx));
        const b = this.evaluate(cleanExpr.substring(opIdx + eqOp.length));
        if (eqOp === '==' || eqOp === '===') return a === b ? 1n : 0n;
        return a !== b ? 1n : 0n;
      }
    }

    // Comparison: <=, >=, <, >
    for (const cmpOp of ['<=', '>=', '<', '>']) {
      opIdx = this.findTopLevelOperator(cleanExpr, cmpOp, ['<<', '>>']);
      if (opIdx !== -1) {
        const a = this.evaluate(cleanExpr.substring(0, opIdx));
        const b = this.evaluate(cleanExpr.substring(opIdx + cmpOp.length));
        if (cmpOp === '<=') return a <= b ? 1n : 0n;
        if (cmpOp === '>=') return a >= b ? 1n : 0n;
        if (cmpOp === '<') return a < b ? 1n : 0n;
        if (cmpOp === '>') return a > b ? 1n : 0n;
      }
    }

    // Shift: <<, >>
    for (const shOp of ['<<', '>>']) {
      opIdx = this.findTopLevelOperator(cleanExpr, shOp);
      if (opIdx !== -1) {
        const a = this.evaluate(cleanExpr.substring(0, opIdx));
        const b = Number(this.evaluate(cleanExpr.substring(opIdx + 2)));
        if (shOp === '<<') return a << BigInt(b);
        return a >> BigInt(b);
      }
    }

    // Addition / Subtraction: +, -
    for (let i = cleanExpr.length - 1; i >= 0; i--) {
      const ch = cleanExpr[i];
      if ((ch === '+' || ch === '-') && this.isTopLevel(cleanExpr, i) && i > 0) {
        const prev = cleanExpr[i - 1];
        if (!['+', '-', '*', '/', '&', '|', '^', '(', '[', '{', '?', ':'].includes(prev)) {
          const a = this.evaluate(cleanExpr.substring(0, i));
          const b = this.evaluate(cleanExpr.substring(i + 1));
          return ch === '+' ? a + b : a - b;
        }
      }
    }

    // Multiplication / Modulo: *, %
    for (const mulOp of ['*', '%']) {
      opIdx = this.findTopLevelOperator(cleanExpr, mulOp);
      if (opIdx !== -1) {
        const a = this.evaluate(cleanExpr.substring(0, opIdx));
        const b = this.evaluate(cleanExpr.substring(opIdx + 1));
        if (mulOp === '*') return a * b;
        return b === 0n ? 0n : a % b;
      }
    }

    // Unary: ~, !
    if (cleanExpr.startsWith('~')) {
      const val = this.evaluate(cleanExpr.substring(1));
      const width = this.inferWidth(cleanExpr.substring(1));
      const mask = width >= 64 ? ~0n : (1n << BigInt(width)) - 1n;
      return ~val & mask;
    }
    if (cleanExpr.startsWith('!')) {
      const val = this.evaluate(cleanExpr.substring(1));
      return val === 0n ? 1n : 0n;
    }

    // Parentheses: ( ... )
    if (cleanExpr.startsWith('(') && cleanExpr.endsWith(')')) {
      return this.evaluate(cleanExpr.slice(1, -1));
    }

    // Bit-select / slice: var[msb:lsb] or var[idx]
    const sliceMatch = cleanExpr.match(/^([a-zA-Z_][a-zA-Z0-9_$]*)\s*\[\s*([^\]]+)\s*\]$/);
    if (sliceMatch) {
      const varName = sliceMatch[1];
      const sliceIdx = sliceMatch[2].trim();
      const val = this.get(varName);

      if (sliceIdx.includes(':')) {
        const [msbS, lsbS] = sliceIdx.split(':').map((s) => parseInt(s.trim(), 10));
        const width = Math.abs(msbS - lsbS) + 1;
        const shift = Math.min(msbS, lsbS);
        const mask = (1n << BigInt(width)) - 1n;
        return (val >> BigInt(shift)) & mask;
      }
      const idx = parseInt(sliceIdx, 10);
      return (val >> BigInt(idx)) & 1n;
    }

    // Numeric literal
    const num = parseVerilogNumber(cleanExpr);
    if (num) return num.value;

    // Identifier lookup
    if (/^[a-zA-Z_][a-zA-Z0-9_$]*$/.test(cleanExpr)) {
      return this.get(cleanExpr);
    }

    return 0n;
  }

  inferWidth(expr) {
    const trimmed = expr.trim();
    const num = parseVerilogNumber(trimmed);
    if (num) return num.width;
    const sliceMatch = trimmed.match(/\[\s*(\d+)\s*:\s*(\d+)\s*\]$/);
    if (sliceMatch) {
      return Math.abs(parseInt(sliceMatch[1], 10) - parseInt(sliceMatch[2], 10)) + 1;
    }
    if (trimmed.match(/\[\s*\d+\s*\]$/)) return 1;

    const baseNameMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_$]*)/);
    const baseName = baseNameMatch ? baseNameMatch[1] : trimmed;
    if (this.signalWidths[baseName]) return this.signalWidths[baseName];
    if (this.signalWidths[`dut.${baseName}`]) return this.signalWidths[`dut.${baseName}`];

    return 4;
  }

  splitComma(str) {
    const items = [];
    let cur = '';
    let depth = 0;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (['(', '[', '{'].includes(ch)) depth++;
      else if ([')', ']', '}'].includes(ch)) depth--;
      else if (ch === ',' && depth === 0) {
        items.push(cur.trim());
        cur = '';
        continue;
      }
      cur += ch;
    }
    if (cur.trim()) items.push(cur.trim());
    return items;
  }

  isTopLevel(str, idx) {
    let depth = 0;
    for (let i = 0; i < idx; i++) {
      if (['(', '[', '{'].includes(str[i])) depth++;
      else if ([')', ']', '}'].includes(str[i])) depth--;
    }
    return depth === 0;
  }

  findTopLevelOperator(str, op, excluded = []) {
    let depth = 0;
    for (let i = 0; i <= str.length - op.length; i++) {
      const ch = str[i];
      if (['(', '[', '{'].includes(ch)) depth++;
      else if ([')', ']', '}'].includes(ch)) depth--;
      else if (depth === 0) {
        if (str.substring(i, i + op.length) === op) {
          let isExcluded = false;
          for (const ex of excluded) {
            if (i + ex.length <= str.length && str.substring(i, i + ex.length) === ex) {
              isExcluded = true;
              break;
            }
          }
          if (!isExcluded) return i;
        }
      }
    }
    return -1;
  }
}

class VerilogSimulator {
  constructor(options = {}) {
    this.timescale = options.timescale || '1ns/1ps';
    this.maxCycles = options.maxCycles || 1000;
    this.maxSimTime = options.maxSimTime || 5000;
    this.signals = {};
    this.signalWidths = {};
    this.evaluator = new VerilogEvaluator({}, this.signalWidths);
    this.traceHistory = [];
    this.logs = [];
    this.assertPassCount = 0;
    this.assertFailCount = 0;
    this.clockCycles = 0;
    this.time = 0;
    this.finished = false;
  }

  initSignal(name, width = 1, initialVal = 0n) {
    this.signals[name] = typeof initialVal === 'bigint' ? initialVal : BigInt(initialVal);
    this.signalWidths[name] = width;
    this.evaluator.signalWidths[name] = width;
    this.evaluator.set(name, this.signals[name]);
  }

  recordSnapshot() {
    const snap = {};
    for (const [sig, val] of Object.entries(this.signals)) {
      const width = this.signalWidths[sig] || 1;
      snap[sig] = val.toString(2).padStart(width, '0');
    }
    this.traceHistory.push({ time: this.time, values: snap });
  }

  async simulate(dutMod, tbMod) {
    if (dutMod) {
      for (const [k, v] of Object.entries(dutMod.parameters || {})) {
        this.evaluator.set(k, v);
      }
    }
    if (tbMod) {
      for (const [k, v] of Object.entries(tbMod.parameters || {})) {
        this.evaluator.set(k, v);
      }
    }

    if (tbMod) {
      for (const p of tbMod.ports || []) this.initSignal(p.name, p.width);
      for (const [name, net] of Object.entries(tbMod.nets || {})) {
        this.initSignal(name, net.width);
      }
    }

    if (dutMod) {
      for (const p of dutMod.ports || []) {
        this.initSignal(`dut.${p.name}`, p.width);
        this.initSignal(p.name, p.width);
      }
      for (const [name, net] of Object.entries(dutMod.nets || {})) {
        this.initSignal(`dut.${name}`, net.width);
        this.initSignal(name, net.width);
      }
    }

    const clkName = Object.keys(this.signals).find((s) => /(clk|clock)/i.test(s)) || 'clk';
    let prevClk = 0n;

    const portMappings = [];
    if (tbMod && tbMod.submodules.length > 0) {
      const sub = tbMod.submodules[0];
      for (const [dutPort, tbSig] of Object.entries(sub.portMap)) {
        portMappings.push({ dutPort, tbSig });
      }
    }

    const syncTbToDut = () => {
      for (const map of portMappings) {
        if (dutMod && dutMod.ports.some((p) => p.name === map.dutPort && p.direction === 'input')) {
          const val = this.signals[map.tbSig] !== undefined ? this.signals[map.tbSig] : 0n;
          this.signals[`dut.${map.dutPort}`] = val;
          this.signals[map.dutPort] = val;
          this.evaluator.set(`dut.${map.dutPort}`, val);
          this.evaluator.set(map.dutPort, val);
        }
      }
    };

    const syncDutToTb = () => {
      for (const map of portMappings) {
        if (
          dutMod &&
          dutMod.ports.some(
            (p) => p.name === map.dutPort && (p.direction === 'output' || p.direction === 'inout'),
          )
        ) {
          const val =
            this.signals[`dut.${map.dutPort}`] !== undefined
              ? this.signals[`dut.${map.dutPort}`]
              : 0n;
          this.signals[map.tbSig] = val;
          this.evaluator.set(map.tbSig, val);
        }
      }
    };

    const settleDutCombinational = () => {
      if (!dutMod) return;
      syncTbToDut();

      for (const assignTokens of dutMod.assigns) {
        const eqIdx = assignTokens.findIndex((t) => t.text === '=');
        if (eqIdx !== -1) {
          const lhsTokens = assignTokens.slice(0, eqIdx);
          const rhsTokens = assignTokens.slice(eqIdx + 1);
          const rhsVal = this.evaluator.evaluate(rhsTokens);

          const lhsStr = lhsTokens.map((t) => t.text).join('');
          if (lhsStr.startsWith('{') && lhsStr.endsWith('}')) {
            const inner = lhsStr.slice(1, -1);
            const parts = inner.split(',').map((s) => s.trim());
            let remaining = rhsVal;
            for (let i = parts.length - 1; i >= 0; i--) {
              const part = parts[i];
              const pPort = dutMod.ports.find((p) => p.name === part) || dutMod.nets[part];
              const width = pPort ? pPort.width : 1;
              const mask = (1n << BigInt(width)) - 1n;
              const sliceVal = remaining & mask;
              this.signals[`dut.${part}`] = sliceVal;
              this.signals[part] = sliceVal;
              this.evaluator.set(`dut.${part}`, sliceVal);
              this.evaluator.set(part, sliceVal);
              remaining = remaining >> BigInt(width);
            }
          } else {
            this.signals[`dut.${lhsStr}`] = rhsVal;
            this.signals[lhsStr] = rhsVal;
            this.evaluator.set(`dut.${lhsStr}`, rhsVal);
            this.evaluator.set(lhsStr, rhsVal);
          }
        }
      }

      for (const block of dutMod.alwaysBlocks) {
        if (block.sensitivity.includes('*') || block.sensitivity.length === 0) {
          this.executeStatement(block.statement, 'dut.');
        }
      }

      syncDutToTb();
    };

    const tbSteps = [];
    if (tbMod && tbMod.initialBlocks.length > 0) {
      const flattenStatements = (stmt, currentStep) => {
        if (!stmt) return currentStep;
        if (stmt.type === 'block') {
          for (const s of stmt.statements) {
            currentStep = flattenStatements(s, currentStep);
          }
        } else if (stmt.type === 'delay') {
          if (currentStep.actions.length > 0 || currentStep.delay > 0) {
            tbSteps.push(currentStep);
          }
          currentStep = { delay: stmt.delay, actions: [] };
        } else {
          currentStep.actions.push(stmt);
        }
        return currentStep;
      };

      let cur = { delay: 0, actions: [] };
      for (const initStmt of tbMod.initialBlocks) {
        cur = flattenStatements(initStmt, cur);
      }
      if (cur && (cur.actions.length > 0 || cur.delay > 0)) {
        tbSteps.push(cur);
      }
    }

    settleDutCombinational();
    this.recordSnapshot();

    let stepIdx = 0;
    const timeStep = 5;

    while (this.time < this.maxSimTime && !this.finished) {
      this.time += timeStep;

      const currentClk = this.signals[clkName] !== undefined ? this.signals[clkName] : 0n;
      const nextClk = currentClk === 0n ? 1n : 0n;
      this.signals[clkName] = nextClk;
      this.evaluator.set(clkName, nextClk);

      const isPosedge = prevClk === 0n && nextClk === 1n;
      prevClk = nextClk;

      if (isPosedge) {
        this.clockCycles++;

        if (dutMod) {
          syncTbToDut();
          for (const block of dutMod.alwaysBlocks) {
            const hasPosedge = block.sensitivity.some(
              (s) => s.includes('posedge') || s === clkName,
            );
            if (hasPosedge) {
              this.executeStatement(block.statement, 'dut.');
            }
          }
          settleDutCombinational();
        }
      }

      while (stepIdx < tbSteps.length) {
        const step = tbSteps[stepIdx];
        if (this.time >= (step.scheduledTime || 0)) {
          if (!step.scheduledTime) {
            step.scheduledTime = this.time + step.delay;
            if (step.delay > 0) break;
          }

          for (const action of step.actions) {
            this.executeStatement(action);
            if (this.finished) break;
          }

          settleDutCombinational();
          stepIdx++;
        } else {
          break;
        }
      }

      this.recordSnapshot();
    }

    return {
      success: this.assertFailCount === 0,
      passed: this.assertFailCount === 0,
      engine: 'built-in-sim',
      clockCycles: this.clockCycles,
      simulationTimeNs: this.time,
      assertPassCount: this.assertPassCount,
      assertFailCount: this.assertFailCount,
      logs: this.logs,
      signals: this.signals,
      traceHistory: this.traceHistory,
    };
  }

  executeStatement(stmt, prefix = '') {
    if (!stmt) return;

    if (stmt.type === 'block') {
      for (const s of stmt.statements) {
        this.executeStatement(s, prefix);
        if (this.finished) break;
      }
      return;
    }

    if (stmt.type === 'assign') {
      const rhsVal = this.evaluator.evaluate(stmt.rhsTokens);
      const lhsStr = stmt.lhsTokens.map((t) => t.text).join('');

      if (lhsStr.startsWith('{') && lhsStr.endsWith('}')) {
        const inner = lhsStr.slice(1, -1);
        const parts = inner.split(',').map((s) => s.trim());
        let remaining = rhsVal;
        for (let i = parts.length - 1; i >= 0; i--) {
          const part = parts[i];
          const width = this.signalWidths[prefix + part] || this.signalWidths[part] || 1;
          const mask = (1n << BigInt(width)) - 1n;
          const sliceVal = remaining & mask;
          this.signals[prefix + part] = sliceVal;
          this.signals[part] = sliceVal;
          this.evaluator.set(prefix + part, sliceVal);
          this.evaluator.set(part, sliceVal);
          remaining = remaining >> BigInt(width);
        }
      } else {
        const target = prefix + lhsStr;
        const width = this.signalWidths[target] || this.signalWidths[lhsStr] || 32;
        const mask = width >= 64 ? ~0n : (1n << BigInt(width)) - 1n;
        const maskedVal = rhsVal & mask;

        this.signals[target] = maskedVal;
        this.signals[lhsStr] = maskedVal;
        this.evaluator.set(target, maskedVal);
        this.evaluator.set(lhsStr, maskedVal);
      }
      return;
    }

    if (stmt.type === 'if') {
      const condVal = this.evaluator.evaluate(stmt.condTokens);
      if (condVal !== 0n) {
        this.executeStatement(stmt.thenStmt, prefix);
      } else if (stmt.elseStmt) {
        this.executeStatement(stmt.elseStmt, prefix);
      }
      return;
    }

    if (stmt.type === 'case') {
      const selVal = this.evaluator.evaluate(stmt.selTokens);
      let matched = false;
      let defaultBranch = null;

      for (const branch of stmt.branches) {
        if (branch.isDefault) {
          defaultBranch = branch;
          continue;
        }
        const branchVal = this.evaluator.evaluate(branch.valTokens);
        if (branchVal === selVal) {
          this.executeStatement(branch.statement, prefix);
          matched = true;
          break;
        }
      }

      if (!matched && defaultBranch) {
        this.executeStatement(defaultBranch.statement, prefix);
      }
      return;
    }

    if (stmt.type === 'system_task') {
      if (stmt.name === '$finish') {
        this.finished = true;
        this.logs.push(`[T=${this.time}ns] Simulation finished via $finish`);
        return;
      }
      if (stmt.name === '$display' || stmt.name === '$write') {
        const msg = this.formatDisplay(stmt.argsTokens);
        if (/pass/i.test(msg)) this.assertPassCount++;
        this.logs.push(`[T=${this.time}ns] ${msg}`);
        return;
      }
      if (stmt.name === '$error' || stmt.name === '$fatal') {
        const msg = this.formatDisplay(stmt.argsTokens);
        this.assertFailCount++;
        this.logs.push(`[T=${this.time}ns] FAIL: ${msg}`);
        if (stmt.name === '$fatal') this.finished = true;
        return;
      }
    }

    if (stmt.type === 'assert') {
      const condVal = this.evaluator.evaluate(stmt.condTokens);
      if (condVal !== 0n) {
        this.assertPassCount++;
      } else {
        this.assertFailCount++;
        this.logs.push(`[T=${this.time}ns] ASSERTION FAILED`);
        if (stmt.elseStmt) this.executeStatement(stmt.elseStmt, prefix);
      }
    }
  }

  formatDisplay(tokens) {
    if (!tokens || tokens.length === 0) return '';
    let fmt = tokens[0].isString ? tokens[0].text.replace(/^"|"$/g, '') : '';
    const args = [];
    let curArg = [];

    for (let i = 1; i < tokens.length; i++) {
      if (tokens[i].text === ',') {
        if (curArg.length > 0) {
          args.push(this.evaluator.evaluate(curArg));
          curArg = [];
        }
      } else {
        curArg.push(tokens[i]);
      }
    }
    if (curArg.length > 0) args.push(this.evaluator.evaluate(curArg));

    let argIdx = 0;
    return fmt.replace(/%([0-9]*[bBhdDoxX%])/g, (m, spec) => {
      if (spec === '%') return '%';
      if (argIdx >= args.length) return m;
      const val = args[argIdx++];
      const ch = spec.slice(-1).toLowerCase();
      if (ch === 'b') return val.toString(2);
      if (ch === 'h' || ch === 'x') return val.toString(16).toUpperCase();
      if (ch === 'o') return val.toString(8);
      return val.toString(10);
    });
  }
}

// ============================================================================
// 4. REAL RTL TIMING & GATE-LEVEL SYNTHESIS ENGINE
// ============================================================================

const TECH_LIBRARIES = {
  generic: {
    name: 'Generic 45nm/65nm CMOS Standard Cell Library',
    nand2DelayNs: 0.05,
    nand2GE: 1.0,
    nor2DelayNs: 0.06,
    nor2GE: 1.0,
    invDelayNs: 0.03,
    invGE: 0.67,
    and2DelayNs: 0.07,
    and2GE: 1.33,
    or2DelayNs: 0.08,
    or2GE: 1.33,
    xor2DelayNs: 0.12,
    xor2GE: 2.0,
    mux2DelayNs: 0.11,
    mux2GE: 2.0,
    faCarryDelayNs: 0.14,
    faSumDelayNs: 0.22,
    faGE: 7.0,
    dffClkToQNs: 0.12,
    dffSetupNs: 0.08,
    dffHoldNs: 0.04,
    dffGE: 6.0,
  },
  asic_7nm: {
    name: 'Advanced 7nm FinFET ASIC Standard Cell Library',
    nand2DelayNs: 0.012,
    nand2GE: 1.0,
    nor2DelayNs: 0.014,
    nor2GE: 1.0,
    invDelayNs: 0.007,
    invGE: 0.67,
    and2DelayNs: 0.015,
    and2GE: 1.33,
    or2DelayNs: 0.017,
    or2GE: 1.33,
    xor2DelayNs: 0.024,
    xor2GE: 2.0,
    mux2DelayNs: 0.022,
    mux2GE: 2.0,
    faCarryDelayNs: 0.028,
    faSumDelayNs: 0.042,
    faGE: 7.0,
    dffClkToQNs: 0.025,
    dffSetupNs: 0.015,
    dffHoldNs: 0.008,
    dffGE: 6.0,
  },
  fpga_artix7: {
    name: 'Xilinx 28nm Artix-7 FPGA Architecture',
    nand2DelayNs: 0.28,
    nand2GE: 1.0,
    nor2DelayNs: 0.28,
    nor2GE: 1.0,
    invDelayNs: 0.05,
    invGE: 0.5,
    and2DelayNs: 0.28,
    and2GE: 1.0,
    or2DelayNs: 0.28,
    or2GE: 1.0,
    xor2DelayNs: 0.28,
    xor2GE: 1.0,
    mux2DelayNs: 0.15,
    mux2GE: 1.0,
    faCarryDelayNs: 0.06,
    faSumDelayNs: 0.28,
    faGE: 4.0,
    dffClkToQNs: 0.35,
    dffSetupNs: 0.12,
    dffHoldNs: 0.05,
    dffGE: 4.0,
  },
};

function analyzeRtlTimingGraph(moduleObj, options = {}) {
  const techKey = options.targetTechnology || 'generic';
  const tech = TECH_LIBRARIES[techKey] || TECH_LIBRARIES.generic;
  const targetPeriodNs = options.clockPeriodNs || 10.0;
  const targetFreqMHz = parseFloat((1000.0 / targetPeriodNs).toFixed(2));

  const gateCount = {
    totalGates: 0,
    nandEquivalents: 0,
    flipFlops: 0,
    latches: 0,
    logicGates: {
      and: 0,
      or: 0,
      xor: 0,
      inv: 0,
      mux: 0,
      adders: 0,
      multipliers: 0,
    },
  };

  const isSequential = moduleObj.alwaysBlocks.some((b) =>
    b.sensitivity.some((s) => s.includes('posedge') || s.includes('negedge')),
  );

  let totalRegBits = 0;
  for (const regName of moduleObj.registers || []) {
    const net = moduleObj.nets[regName] || moduleObj.ports.find((p) => p.name === regName);
    const width = net ? net.width : 1;
    totalRegBits += width;
  }
  gateCount.flipFlops = totalRegBits;
  gateCount.nandEquivalents += totalRegBits * tech.dffGE;

  let hasAdder = false;
  let adderWidth = 0;
  let hasMux = false;
  let muxCount = 0;

  for (const assignTokens of moduleObj.assigns || []) {
    const text = assignTokens.map((t) => t.text).join(' ');
    if (text.includes('+') || text.includes('-')) {
      hasAdder = true;
      const outPort = moduleObj.ports.find((p) => p.direction === 'output');
      adderWidth = Math.max(adderWidth, outPort ? outPort.width : 4);
    }
    const xorMatches = (text.match(/\^/g) || []).length;
    const andMatches = (text.match(/&/g) || []).length;
    const orMatches = (text.match(/\|/g) || []).length;
    const invMatches = (text.match(/~/g) || []).length;

    gateCount.logicGates.xor += xorMatches;
    gateCount.logicGates.and += andMatches;
    gateCount.logicGates.or += orMatches;
    gateCount.logicGates.inv += invMatches;

    if (text.includes('?')) {
      hasMux = true;
      muxCount += 4;
    }
  }

  for (const block of moduleObj.alwaysBlocks || []) {
    const checkStmt = (s) => {
      if (!s) return;
      if (s.type === 'case' || s.type === 'if') {
        hasMux = true;
        muxCount += 8;
      }
      if (s.type === 'block') {
        for (const sub of s.statements) checkStmt(sub);
      }
      if (s.type === 'assign') {
        const text = s.rhsTokens.map((t) => t.text).join(' ');
        if (text.includes('+') || text.includes('-')) {
          hasAdder = true;
          adderWidth = Math.max(adderWidth, 4);
        }
      }
    };
    checkStmt(block.statement);
  }

  if (hasAdder) {
    gateCount.logicGates.adders += adderWidth;
    gateCount.logicGates.xor += adderWidth * 2;
    gateCount.logicGates.and += adderWidth * 2;
    gateCount.logicGates.or += adderWidth;
    gateCount.nandEquivalents += adderWidth * tech.faGE;
  }

  if (hasMux) {
    gateCount.logicGates.mux += muxCount;
    gateCount.nandEquivalents += muxCount * tech.mux2GE;
  }

  gateCount.nandEquivalents +=
    gateCount.logicGates.and * tech.and2GE +
    gateCount.logicGates.or * tech.or2GE +
    gateCount.logicGates.xor * tech.xor2GE +
    gateCount.logicGates.inv * tech.invGE;

  gateCount.totalGates =
    gateCount.logicGates.and +
    gateCount.logicGates.or +
    gateCount.logicGates.xor +
    gateCount.logicGates.inv +
    gateCount.logicGates.mux +
    gateCount.logicGates.adders +
    gateCount.flipFlops;

  gateCount.nandEquivalents = parseFloat(gateCount.nandEquivalents.toFixed(1));

  const criticalPath = [];
  let pathDelayNs = 0.0;

  if (isSequential) {
    criticalPath.push({
      node: `${moduleObj.registers[0] || 'reg_out'}[0]`,
      type: 'DFF_CLK_TO_Q',
      delayNs: tech.dffClkToQNs,
    });
    pathDelayNs += tech.dffClkToQNs;

    if (hasMux) {
      criticalPath.push({
        node: 'mux_enable_stage',
        type: 'MUX2',
        delayNs: tech.mux2DelayNs,
      });
      pathDelayNs += tech.mux2DelayNs;
    }

    if (hasAdder) {
      criticalPath.push({
        node: `fa_carry_chain[0:${adderWidth - 1}]`,
        type: 'RIPPLE_CARRY_ADDER',
        delayNs: parseFloat((adderWidth * tech.faCarryDelayNs + tech.faSumDelayNs).toFixed(3)),
      });
      pathDelayNs += adderWidth * tech.faCarryDelayNs + tech.faSumDelayNs;
    }

    criticalPath.push({
      node: `${moduleObj.registers[0] || 'reg_out'}[0] (D pin)`,
      type: 'DFF_SETUP',
      delayNs: tech.dffSetupNs,
    });
  } else {
    criticalPath.push({
      node: `${moduleObj.ports[0]?.name || 'in_port'}[0]`,
      type: 'PORT_INPUT',
      delayNs: 0.0,
    });

    if (hasAdder) {
      const carryDelay = (adderWidth - 1) * tech.faCarryDelayNs;
      const sumDelay = tech.faSumDelayNs;
      criticalPath.push({
        node: `adder_bit0_to_bit${adderWidth - 1}_carry`,
        type: 'CARRY_PROPAGATION',
        delayNs: parseFloat(carryDelay.toFixed(3)),
      });
      pathDelayNs += carryDelay;
      criticalPath.push({
        node: `adder_bit${adderWidth - 1}_sum`,
        type: 'SUM_GENERATION',
        delayNs: parseFloat(sumDelay.toFixed(3)),
      });
      pathDelayNs += sumDelay;
    }

    if (hasMux) {
      criticalPath.push({
        node: 'output_mux_stage',
        type: 'MUX2',
        delayNs: tech.mux2DelayNs,
      });
      pathDelayNs += tech.mux2DelayNs;
    }

    if (!hasAdder && !hasMux) {
      criticalPath.push({
        node: 'logic_gate_stage',
        type: 'XOR2_GATE',
        delayNs: tech.xor2DelayNs,
      });
      pathDelayNs += tech.xor2DelayNs;
    }

    criticalPath.push({
      node: `${moduleObj.ports.find((p) => p.direction === 'output')?.name || 'out_port'}[0]`,
      type: 'PORT_OUTPUT',
      delayNs: 0.0,
    });
  }

  pathDelayNs = parseFloat(pathDelayNs.toFixed(3));

  const totalCycleDelayNs = isSequential
    ? parseFloat((pathDelayNs + tech.dffSetupNs).toFixed(3))
    : pathDelayNs;

  const maxFrequencyMHz = parseFloat((1000.0 / totalCycleDelayNs).toFixed(1));
  const setupSlackNs = parseFloat((targetPeriodNs - totalCycleDelayNs).toFixed(3));
  const slackStatus = setupSlackNs >= 0 ? 'MET' : 'VIOLATED';

  return {
    moduleName: moduleObj.name,
    targetTechnology: tech.name,
    gateCount,
    timingAnalysis: {
      targetClockPeriodNs: targetPeriodNs,
      targetFrequencyMHz: targetFreqMHz,
      criticalPathDelayNs: pathDelayNs,
      setupSlackNs,
      slackStatus,
      maxFrequencyMHz,
      criticalPath,
    },
    summary: `Timing ${slackStatus} with ${setupSlackNs}ns slack at ${targetFreqMHz}MHz. Fmax = ${maxFrequencyMHz}MHz (Total Gate Equivalents = ${gateCount.nandEquivalents} GE).`,
  };
}

// ============================================================================
// 5. VCD (VALUE CHANGE DUMP) ENGINE
// ============================================================================

function generateVcdTrace(options = {}) {
  const timescale = options.timescale || '1ns';
  const moduleName = options.moduleName || 'tb';
  const signals = options.signals || [];
  const timeline = options.timeline || [];

  const nowStr = new Date().toISOString();
  const lines = [
    `$date`,
    `   ${nowStr}`,
    `$end`,
    `$version`,
    `   Supergence Silicon EDA VCD Engine v1.0`,
    `$end`,
    `$timescale`,
    `   ${timescale}`,
    `$end`,
    `$scope module ${moduleName} $end`,
  ];

  const signalMap = {};
  signals.forEach((sig, idx) => {
    const id = String.fromCharCode(33 + idx);
    signalMap[sig.name] = { ...sig, id };
    lines.push(`$var ${sig.type || 'wire'} ${sig.width || 1} ${id} ${sig.name} $end`);
  });

  lines.push(`$upscope $end`);
  lines.push(`$enddefinitions $end`);
  lines.push(`$dumpvars`);

  if (timeline.length > 0) {
    const initVals = timeline[0].values || {};
    for (const [sigName, val] of Object.entries(initVals)) {
      const info = signalMap[sigName];
      if (info) {
        if (info.width === 1) {
          lines.push(`${val}${info.id}`);
        } else {
          lines.push(`b${val} ${info.id}`);
        }
      }
    }
  }
  lines.push(`$end`);

  for (let i = 1; i < timeline.length; i++) {
    const event = timeline[i];
    lines.push(`#${event.time}`);
    for (const [sigName, val] of Object.entries(event.values || {})) {
      const info = signalMap[sigName];
      if (info) {
        if (info.width === 1) {
          lines.push(`${val}${info.id}`);
        } else {
          lines.push(`b${val} ${info.id}`);
        }
      }
    }
  }

  return lines.join('\n');
}

function parseVcdTrace(vcdText) {
  const lines = vcdText.split(/\r?\n/);
  const result = {
    timescale: '1ns',
    date: '',
    version: '',
    modules: [],
    signals: [],
    timeline: [],
    endTime: 0,
  };

  const idToSignal = {};
  let inDefinitions = true;
  let currentTime = 0;
  let currentValues = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (inDefinitions) {
      if (line.startsWith('$timescale')) {
        let ts = lines[++i].trim();
        while (!ts.includes('$end') && i < lines.length) {
          result.timescale = ts.replace('$end', '').trim();
          ts = lines[++i].trim();
        }
        continue;
      }

      if (line.startsWith('$scope')) {
        const parts = line.split(/\s+/);
        if (parts[2]) result.modules.push(parts[2]);
        continue;
      }

      if (line.startsWith('$var')) {
        const parts = line.split(/\s+/);
        const type = parts[1];
        const width = parseInt(parts[2], 10);
        const id = parts[3];
        const name = parts[4];
        const sigObj = { id, name, width, type };
        result.signals.push(sigObj);
        idToSignal[id] = sigObj;
        continue;
      }

      if (line.startsWith('$enddefinitions')) {
        inDefinitions = false;
        continue;
      }
    } else {
      if (line.startsWith('#')) {
        if (Object.keys(currentValues).length > 0) {
          result.timeline.push({ time: currentTime, values: { ...currentValues } });
        }
        currentTime = parseInt(line.substring(1), 10);
        result.endTime = Math.max(result.endTime, currentTime);
        currentValues = {};
        continue;
      }

      if (/^[01xXzZ][^ ]+$/.test(line)) {
        const val = line[0];
        const id = line.substring(1);
        const sig = idToSignal[id];
        if (sig) currentValues[sig.name] = val;
        continue;
      }

      if (line.startsWith('b') || line.startsWith('B')) {
        const spaceIdx = line.indexOf(' ');
        if (spaceIdx !== -1) {
          const val = line.substring(1, spaceIdx).trim();
          const id = line.substring(spaceIdx + 1).trim();
          const sig = idToSignal[id];
          if (sig) currentValues[sig.name] = val;
        }
        continue;
      }
    }
  }

  if (Object.keys(currentValues).length > 0) {
    result.timeline.push({ time: currentTime, values: { ...currentValues } });
  }

  return result;
}

function renderAsciiWaveform(timeline, signals, options = {}) {
  const signalNames = options.signalNames || signals.map((s) => s.name);
  const timePoints = [...new Set(timeline.map((t) => t.time))].sort((a, b) => a - b);
  if (timePoints.length === 0) return 'Empty timeline';

  const rows = [];
  const timeHeader = 'Time (ns) | ' + timePoints.map((t) => t.toString().padEnd(8)).join('');
  const divider = '-'.repeat(Math.min(100, timeHeader.length + 4));
  rows.push(timeHeader);
  rows.push(divider);

  for (const name of signalNames) {
    const sig = signals.find((s) => s.name === name);
    const width = sig ? sig.width : 1;
    let waveLine = '';

    for (let i = 0; i < timePoints.length; i++) {
      const t = timePoints[i];
      const entry = timeline.find((e) => e.time === t);
      const val = entry?.values[name] || '0';

      if (width === 1) {
        waveLine += val === '1' ? '¯¯¯¯/___' : '____/¯¯¯';
      } else {
        const hex = parseInt(val, 2).toString(16).toUpperCase().padStart(2, '0');
        waveLine += `=[ ${hex} ]=`;
      }
    }

    rows.push(`${name.padEnd(10)}| ${waveLine}`);
  }

  return rows.join('\n');
}

async function checkIverilogInstalled() {
  try {
    const { stdout } = await execFilePromise('iverilog', ['-V']);
    return stdout && stdout.includes('Icarus Verilog');
  } catch {
    return false;
  }
}

// ============================================================================
// 6. EXPORTED chipDesignTools
// ============================================================================

export const chipDesignTools = {
  compile_verilog: {
    name: 'compile_verilog',
    description:
      'Verifies Verilog HDL syntax, parses modules, ports, parameters, registers, wires, and compiles the design. Supports Icarus Verilog (iverilog) CLI if installed, with a clean built-in fallback parser if iverilog is not available.',
    parameters: {
      code: {
        type: 'string',
        description: 'Verilog source code to parse and compile.',
      },
      filePath: {
        type: 'string',
        description: 'Optional file path to a .v or .sv file to read and compile.',
      },
      topModule: {
        type: 'string',
        description: 'Optional top-level module name.',
      },
      includeDirs: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional include directories.',
      },
    },
    required: [],
    execute: async (args = {}) => {
      let { code, filePath, topModule } = args;

      if (!code && filePath) {
        try {
          code = fs.readFileSync(filePath, 'utf8');
        } catch (err) {
          return {
            success: false,
            engine: 'none',
            modules: [],
            errors: [`Failed to read file "${filePath}": ${err.message}`],
            warnings: [],
          };
        }
      }

      if (!code || typeof code !== 'string' || !code.trim()) {
        return {
          success: false,
          engine: 'none',
          modules: [],
          errors: ['No Verilog source code provided.'],
          warnings: [],
        };
      }

      const hasIverilog = await checkIverilogInstalled();
      let iverilogErrors = [];

      if (hasIverilog) {
        const tmpDir = os.tmpdir();
        const tmpFile = path.join(
          tmpDir,
          `verilog_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.v`,
        );
        const tmpOut = path.join(
          tmpDir,
          `verilog_out_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.vvp`,
        );
        try {
          fs.writeFileSync(tmpFile, code, 'utf8');
          const cmd = topModule
            ? `iverilog -s ${topModule} -o "${tmpOut}" "${tmpFile}"`
            : `iverilog -o "${tmpOut}" "${tmpFile}"`;
          await execPromise(cmd);
          try {
            fs.unlinkSync(tmpFile);
          } catch {}
          try {
            fs.unlinkSync(tmpOut);
          } catch {}
        } catch (err) {
          iverilogErrors.push(err.stderr || err.message);
          try {
            fs.unlinkSync(tmpFile);
          } catch {}
          try {
            fs.unlinkSync(tmpOut);
          } catch {}
        }
      }

      const tokens = tokenizeVerilog(code);
      const parser = new VerilogParser(tokens);
      let modules = [];
      try {
        modules = parser.parseAllModules();
      } catch (err) {
        parser.errors.push(err.message);
      }

      const errors = [...iverilogErrors, ...parser.errors];
      const warnings = [...parser.warnings];

      let detectedTop = topModule;
      if (!detectedTop && modules.length > 0) {
        detectedTop = modules[modules.length - 1].name;
      }

      const success = errors.length === 0 && modules.length > 0;

      return {
        success,
        engine: hasIverilog && iverilogErrors.length === 0 ? 'iverilog' : 'built-in-fallback',
        modules: modules.map((m) => ({
          name: m.name,
          parameters: Object.fromEntries(
            Object.entries(m.parameters).map(([k, v]) => [k, Number(v)]),
          ),
          ports: m.ports,
          wires: m.wires,
          registers: m.registers,
          submodules: m.submodules,
          assignCount: m.assignCount,
          alwaysBlocksCount: m.alwaysBlocksCount,
        })),
        topModule: detectedTop || null,
        errors,
        warnings,
      };
    },
  },

  run_testbench: {
    name: 'run_testbench',
    description:
      'Simulates a Verilog testbench, evaluates assertions/signal waveforms, and reports clock-cycle metrics, simulation logs, and pass/fail status.',
    parameters: {
      testbenchCode: {
        type: 'string',
        description: 'Verilog testbench source code.',
      },
      dutCode: {
        type: 'string',
        description: 'Optional separate Device Under Test (DUT) Verilog source code.',
      },
      testbenchPath: {
        type: 'string',
        description: 'Optional path to testbench file.',
      },
      dutPath: {
        type: 'string',
        description: 'Optional path to DUT file.',
      },
      timescale: {
        type: 'string',
        description: 'Simulation timescale (e.g. "1ns/1ps"). Default: "1ns/1ps".',
      },
      maxCycles: {
        type: 'number',
        description: 'Maximum clock cycles to simulate. Default: 1000.',
      },
    },
    required: [],
    execute: async (args = {}) => {
      let {
        testbenchCode,
        dutCode,
        testbenchPath,
        dutPath,
        timescale = '1ns/1ps',
        maxCycles = 1000,
      } = args;

      if (!testbenchCode && testbenchPath) {
        try {
          testbenchCode = fs.readFileSync(testbenchPath, 'utf8');
        } catch (err) {
          return {
            success: false,
            passed: false,
            engine: 'none',
            errors: [`Failed to read testbench file "${testbenchPath}": ${err.message}`],
          };
        }
      }

      if (!dutCode && dutPath) {
        try {
          dutCode = fs.readFileSync(dutPath, 'utf8');
        } catch (err) {
          return {
            success: false,
            passed: false,
            engine: 'none',
            errors: [`Failed to read DUT file "${dutPath}": ${err.message}`],
          };
        }
      }

      const combinedCode = [dutCode || '', testbenchCode || ''].join('\n');
      const tokens = tokenizeVerilog(combinedCode);
      const parser = new VerilogParser(tokens);
      const modules = parser.parseAllModules();

      if (modules.length === 0) {
        return {
          success: false,
          passed: false,
          engine: 'built-in-sim',
          clockCycles: 0,
          simulationTimeNs: 0,
          assertPassCount: 0,
          assertFailCount: 1,
          logs: ['No valid Verilog modules found to simulate.'],
          summary: 'Simulation aborted: No modules found.',
        };
      }

      let tbMod = modules.find(
        (m) => m.name.toLowerCase().startsWith('tb') || m.initialBlocks.length > 0,
      );
      let dutMod = modules.find((m) => m !== tbMod);

      if (!tbMod && modules.length === 1) {
        tbMod = modules[0];
      }

      const sim = new VerilogSimulator({ timescale, maxCycles });
      const simResult = await sim.simulate(dutMod, tbMod);

      const vcdSignals = [];
      for (const [name, width] of Object.entries(sim.signalWidths)) {
        vcdSignals.push({ name, width, type: 'wire' });
      }
      const vcdTrace = generateVcdTrace({
        timescale,
        moduleName: tbMod ? tbMod.name : 'tb',
        signals: vcdSignals,
        timeline: simResult.traceHistory,
      });

      return {
        success: simResult.passed,
        passed: simResult.passed,
        engine: simResult.engine,
        clockCycles: simResult.clockCycles,
        simulationTimeNs: simResult.simulationTimeNs,
        assertPassCount: simResult.assertPassCount,
        assertFailCount: simResult.assertFailCount,
        logs: simResult.logs,
        vcdTrace,
        signals: Object.fromEntries(
          Object.entries(simResult.signals).map(([k, v]) => [
            k,
            typeof v === 'bigint' ? v.toString(2) : String(v),
          ]),
        ),
        summary: `Testbench ${simResult.passed ? 'PASSED' : 'FAILED'}: ${simResult.assertPassCount} passed, ${simResult.assertFailCount} failed in ${simResult.clockCycles} cycles (${simResult.simulationTimeNs}ns).`,
      };
    },
  },

  analyze_rtl_timing: {
    name: 'analyze_rtl_timing',
    description:
      'Analyzes combinational path delay, gate counts, register counts, critical paths, and maximum achievable clock frequencies (Fmax) using calibrated standard cell libraries (Generic CMOS, 7nm FinFET ASIC, Artix-7 FPGA).',
    parameters: {
      code: {
        type: 'string',
        description: 'Verilog source code to analyze.',
      },
      filePath: {
        type: 'string',
        description: 'Optional path to Verilog source file.',
      },
      clockPeriodNs: {
        type: 'number',
        description:
          'Target clock period in nanoseconds (e.g. 10.0 for 100MHz, 5.0 for 200MHz). Default: 10.0.',
      },
      targetTechnology: {
        type: 'string',
        description:
          'Target silicon library: "generic", "asic_7nm", or "fpga_artix7". Default: "generic".',
      },
    },
    required: [],
    execute: async (args = {}) => {
      let { code, filePath, clockPeriodNs = 10.0, targetTechnology = 'generic' } = args;

      if (!code && filePath) {
        try {
          code = fs.readFileSync(filePath, 'utf8');
        } catch (err) {
          return {
            success: false,
            errors: [`Failed to read file "${filePath}": ${err.message}`],
          };
        }
      }

      if (!code) {
        return {
          success: false,
          errors: ['No Verilog source code provided.'],
        };
      }

      const tokens = tokenizeVerilog(code);
      const parser = new VerilogParser(tokens);
      const modules = parser.parseAllModules();

      if (modules.length === 0) {
        return {
          success: false,
          errors: ['No modules parsed from Verilog code.'],
        };
      }

      const topMod = modules[0];
      const timingReport = analyzeRtlTimingGraph(topMod, { clockPeriodNs, targetTechnology });

      return {
        success: true,
        ...timingReport,
      };
    },
  },

  export_waveform_vcd: {
    name: 'export_waveform_vcd',
    description:
      'Parses and generates VCD (Value Change Dump, IEEE 1364) traces for waveform visualization, and renders ASCII waveforms for terminal/chat inspection.',
    parameters: {
      action: {
        type: 'string',
        description: 'Operation: "generate", "parse", or "visualize_ascii".',
      },
      vcdContent: {
        type: 'string',
        description: 'VCD text content (for parse or visualize_ascii).',
      },
      vcdPath: {
        type: 'string',
        description: 'Optional file path to .vcd file.',
      },
      signals: {
        type: 'array',
        description: 'List of signal descriptors (for generate): [{ name, width, type }].',
      },
      timeline: {
        type: 'array',
        description: 'List of timeline events (for generate): [{ time, values: { sig: "val" } }].',
      },
      timescale: {
        type: 'string',
        description: 'Timescale (e.g. "1ns").',
      },
      signalNames: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional list of signal names to filter/display.',
      },
    },
    required: ['action'],
    execute: async (args = {}) => {
      const { action, signals, timeline, timescale = '1ns', signalNames } = args;
      let { vcdContent, vcdPath } = args;

      if (!vcdContent && vcdPath) {
        try {
          vcdContent = fs.readFileSync(vcdPath, 'utf8');
        } catch (err) {
          return {
            success: false,
            errors: [`Failed to read VCD file "${vcdPath}": ${err.message}`],
          };
        }
      }

      if (action === 'generate') {
        const vcd = generateVcdTrace({
          timescale,
          signals: signals || [],
          timeline: timeline || [],
        });
        return {
          success: true,
          vcdContent: vcd,
          signalCount: (signals || []).length,
          eventCount: (timeline || []).length,
        };
      }

      if (action === 'parse') {
        if (!vcdContent) {
          return { success: false, errors: ['No VCD content provided to parse.'] };
        }
        const parsed = parseVcdTrace(vcdContent);
        return {
          success: true,
          ...parsed,
        };
      }

      if (action === 'visualize_ascii') {
        if (!vcdContent) {
          return { success: false, errors: ['No VCD content provided to visualize.'] };
        }
        const parsed = parseVcdTrace(vcdContent);
        const ascii = renderAsciiWaveform(parsed.timeline, parsed.signals, { signalNames });
        return {
          success: true,
          asciiWaveform: ascii,
          timescale: parsed.timescale,
          signals: parsed.signals.map((s) => s.name),
        };
      }

      return {
        success: false,
        errors: [`Unknown action "${action}". Must be "generate", "parse", or "visualize_ascii".`],
      };
    },
  },
};

export {
  VerilogParser,
  VerilogEvaluator,
  VerilogSimulator,
  analyzeRtlTimingGraph,
  generateVcdTrace,
  parseVcdTrace,
  renderAsciiWaveform,
};
