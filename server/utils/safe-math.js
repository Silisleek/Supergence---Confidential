/**
 * Safe Mathematical Expression Evaluator
 * Evaluates arithmetic and standard mathematical expressions via a strict
 * tokenizer and recursive-descent parser. Completely avoids `eval` and `new Function`.
 */

const CONSTANTS = {
  pi: Math.PI,
  e: Math.E,
};

const FUNCTIONS = {
  sqrt: (args) => {
    if (args.length !== 1) throw new Error('sqrt() expects 1 argument');
    return Math.sqrt(args[0]);
  },
  cbrt: (args) => {
    if (args.length !== 1) throw new Error('cbrt() expects 1 argument');
    return Math.cbrt(args[0]);
  },
  abs: (args) => {
    if (args.length !== 1) throw new Error('abs() expects 1 argument');
    return Math.abs(args[0]);
  },
  round: (args) => {
    if (args.length !== 1) throw new Error('round() expects 1 argument');
    return Math.round(args[0]);
  },
  floor: (args) => {
    if (args.length !== 1) throw new Error('floor() expects 1 argument');
    return Math.floor(args[0]);
  },
  ceil: (args) => {
    if (args.length !== 1) throw new Error('ceil() expects 1 argument');
    return Math.ceil(args[0]);
  },
  sin: (args) => {
    if (args.length !== 1) throw new Error('sin() expects 1 argument');
    return Math.sin(args[0]);
  },
  cos: (args) => {
    if (args.length !== 1) throw new Error('cos() expects 1 argument');
    return Math.cos(args[0]);
  },
  tan: (args) => {
    if (args.length !== 1) throw new Error('tan() expects 1 argument');
    return Math.tan(args[0]);
  },
  asin: (args) => {
    if (args.length !== 1) throw new Error('asin() expects 1 argument');
    return Math.asin(args[0]);
  },
  acos: (args) => {
    if (args.length !== 1) throw new Error('acos() expects 1 argument');
    return Math.acos(args[0]);
  },
  atan: (args) => {
    if (args.length !== 1) throw new Error('atan() expects 1 argument');
    return Math.atan(args[0]);
  },
  sinh: (args) => {
    if (args.length !== 1) throw new Error('sinh() expects 1 argument');
    return Math.sinh(args[0]);
  },
  cosh: (args) => {
    if (args.length !== 1) throw new Error('cosh() expects 1 argument');
    return Math.cosh(args[0]);
  },
  tanh: (args) => {
    if (args.length !== 1) throw new Error('tanh() expects 1 argument');
    return Math.tanh(args[0]);
  },
  log: (args) => {
    if (args.length !== 1) throw new Error('log() expects 1 argument');
    return Math.log10(args[0]);
  },
  log10: (args) => {
    if (args.length !== 1) throw new Error('log10() expects 1 argument');
    return Math.log10(args[0]);
  },
  ln: (args) => {
    if (args.length !== 1) throw new Error('ln() expects 1 argument');
    return Math.log(args[0]);
  },
  log2: (args) => {
    if (args.length !== 1) throw new Error('log2() expects 1 argument');
    return Math.log2(args[0]);
  },
  exp: (args) => {
    if (args.length !== 1) throw new Error('exp() expects 1 argument');
    return Math.exp(args[0]);
  },
  min: (args) => {
    if (args.length === 0) throw new Error('min() expects at least 1 argument');
    return Math.min(...args);
  },
  max: (args) => {
    if (args.length === 0) throw new Error('max() expects at least 1 argument');
    return Math.max(...args);
  },
  pow: (args) => {
    if (args.length !== 2) throw new Error('pow() expects 2 arguments');
    return Math.pow(args[0], args[1]);
  },
};

class Tokenizer {
  constructor(input) {
    this.input = String(input || '').replace(/\bMath\./g, '');
    this.pos = 0;
  }

  tokenize() {
    const tokens = [];
    while (this.pos < this.input.length) {
      const ch = this.input[this.pos];

      // Whitespace
      if (/\s/.test(ch)) {
        this.pos++;
        continue;
      }

      // Numbers (with optional decimal and scientific notation)
      if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(this.input[this.pos + 1] || ''))) {
        const start = this.pos;
        while (this.pos < this.input.length && /[0-9]/.test(this.input[this.pos])) {
          this.pos++;
        }
        if (this.input[this.pos] === '.') {
          this.pos++;
          while (this.pos < this.input.length && /[0-9]/.test(this.input[this.pos])) {
            this.pos++;
          }
        }
        if (
          (this.input[this.pos] === 'e' || this.input[this.pos] === 'E') &&
          /[0-9+-]/.test(this.input[this.pos + 1] || '')
        ) {
          this.pos++;
          if (this.input[this.pos] === '+' || this.input[this.pos] === '-') {
            this.pos++;
          }
          while (this.pos < this.input.length && /[0-9]/.test(this.input[this.pos])) {
            this.pos++;
          }
        }
        const numStr = this.input.slice(start, this.pos);
        const val = Number(numStr);
        if (Number.isNaN(val)) throw new Error(`Invalid number: ${numStr}`);
        tokens.push({ type: 'num', value: val });
        continue;
      }

      // Operators
      if (ch === '*' && this.input[this.pos + 1] === '*') {
        tokens.push({ type: 'op', value: '**' });
        this.pos += 2;
        continue;
      }
      if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '%' || ch === '^') {
        tokens.push({ type: 'op', value: ch });
        this.pos++;
        continue;
      }

      // Parentheses & commas
      if (ch === '(') {
        tokens.push({ type: 'lparen' });
        this.pos++;
        continue;
      }
      if (ch === ')') {
        tokens.push({ type: 'rparen' });
        this.pos++;
        continue;
      }
      if (ch === ',') {
        tokens.push({ type: 'comma' });
        this.pos++;
        continue;
      }

      // Identifiers (function names and constants)
      if (/[a-zA-Z_]/.test(ch)) {
        const start = this.pos;
        while (this.pos < this.input.length && /[a-zA-Z0-9_]/.test(this.input[this.pos])) {
          this.pos++;
        }
        const ident = this.input.slice(start, this.pos).toLowerCase();
        tokens.push({ type: 'ident', value: ident });
        continue;
      }

      throw new Error(`Unexpected character in mathematical expression: '${ch}'`);
    }

    tokens.push({ type: 'eof' });
    return tokens;
  }
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek() {
    return this.tokens[this.pos] || { type: 'eof' };
  }

  next() {
    const tok = this.peek();
    this.pos++;
    return tok;
  }

  parse() {
    const res = this.parseExpression();
    if (this.peek().type !== 'eof') {
      throw new Error(`Unexpected token '${this.peek().value || this.peek().type}' after expression`);
    }
    return res;
  }

  // Precedence 1: Addition & Subtraction
  parseExpression() {
    let left = this.parseTerm();
    while (this.peek().type === 'op' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.next().value;
      const right = this.parseTerm();
      if (op === '+') left = left + right;
      else left = left - right;
    }
    return left;
  }

  // Precedence 2: Multiplication, Division, Modulo
  parseTerm() {
    let left = this.parseFactor();
    while (
      this.peek().type === 'op' &&
      (this.peek().value === '*' || this.peek().value === '/' || this.peek().value === '%')
    ) {
      const op = this.next().value;
      const right = this.parseFactor();
      if (op === '*') left = left * right;
      else if (op === '/') {
        if (right === 0) throw new Error('Division by zero');
        left = left / right;
      } else if (op === '%') {
        if (right === 0) throw new Error('Modulo by zero');
        left = left % right;
      }
    }
    return left;
  }

  // Precedence 3: Exponentiation (^ or **) - right-associative
  parseFactor() {
    const left = this.parseUnary();
    if (this.peek().type === 'op' && (this.peek().value === '^' || this.peek().value === '**')) {
      this.next();
      const right = this.parseFactor(); // Right-associative recursion
      return Math.pow(left, right);
    }
    return left;
  }

  // Precedence 4: Unary operators (+, -)
  parseUnary() {
    if (this.peek().type === 'op' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.next().value;
      const operand = this.parseUnary();
      return op === '-' ? -operand : operand;
    }
    return this.parsePrimary();
  }

  // Precedence 5: Numbers, Parentheses, Functions, Constants
  parsePrimary() {
    const tok = this.peek();

    if (tok.type === 'num') {
      this.next();
      return tok.value;
    }

    if (tok.type === 'lparen') {
      this.next(); // consume '('
      const val = this.parseExpression();
      if (this.peek().type !== 'rparen') {
        throw new Error("Missing closing parenthesis ')'");
      }
      this.next(); // consume ')'
      return val;
    }

    if (tok.type === 'ident') {
      const name = this.next().value;

      // Function call
      if (this.peek().type === 'lparen') {
        this.next(); // consume '('
        const args = [];
        if (this.peek().type !== 'rparen') {
          args.push(this.parseExpression());
          while (this.peek().type === 'comma') {
            this.next(); // consume ','
            args.push(this.parseExpression());
          }
        }
        if (this.peek().type !== 'rparen') {
          throw new Error(`Missing closing parenthesis in call to ${name}()`);
        }
        this.next(); // consume ')'

        const fn = FUNCTIONS[name];
        if (!fn) throw new Error(`Unknown mathematical function: ${name}`);
        return fn(args);
      }

      // Constant
      if (Object.prototype.hasOwnProperty.call(CONSTANTS, name)) {
        return CONSTANTS[name];
      }

      throw new Error(`Unknown mathematical identifier: ${name}`);
    }

    throw new Error(`Unexpected token: ${tok.type === 'eof' ? 'end of expression' : tok.value || tok.type}`);
  }
}

/**
 * Safely evaluates a mathematical expression without `eval` or `new Function`.
 *
 * @param {string} expr - Mathematical string expression
 * @returns {number} Evaluated finite numeric result
 */
export function safeEvaluateMath(expr) {
  if (!expr || typeof expr !== 'string') {
    throw new Error('Mathematical expression must be a non-empty string');
  }

  const tokens = new Tokenizer(expr).tokenize();
  const parser = new Parser(tokens);
  const result = parser.parse();

  if (typeof result !== 'number' || Number.isNaN(result) || !Number.isFinite(result)) {
    throw new Error('Result of expression is not a finite number');
  }

  return result;
}

export default safeEvaluateMath;
