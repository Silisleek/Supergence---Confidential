function sanitizeJSONString(raw) {
  if (!raw) return raw;
  // Step 1: Escape invalid backslashes (LaTeX formulas, etc.)
  let s = raw.replace(/\\(?!["\\/bfnrtu]|u[0-9a-fA-F]{4})/g, '\\\\');

  // Step 2: Fix unescaped control characters (newlines, tabs, etc.) inside JSON strings
  let insideString = false;
  let escaped = false;
  let result = '';

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      result += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      insideString = !insideString;
      result += ch;
      continue;
    }
    if (insideString) {
      if (ch === '\n') {
        result += '\\n';
      } else if (ch === '\r') {
        result += '\\r';
      } else if (ch === '\t') {
        result += '\\t';
      } else if (ch.charCodeAt(0) < 32) {
        // Other control characters
        result += ' ';
      } else {
        result += ch;
      }
    } else {
      result += ch;
    }
  }

  // Step 3: If JSON was truncated (unclosed string or unclosed braces)
  if (insideString) {
    result += '"';
  }

  // Close any unclosed braces/brackets
  const stack = [];
  let inStr = false;
  let esc = false;
  for (let i = 0; i < result.length; i++) {
    const c = result[i];
    if (esc) {
      esc = false;
      continue;
    }
    if (c === '\\') {
      esc = true;
      continue;
    }
    if (c === '"') {
      inStr = !inStr;
      continue;
    }
    if (!inStr) {
      if (c === '{') stack.push('}');
      else if (c === '[') stack.push(']');
      else if (c === '}' || c === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === c) stack.pop();
      }
    }
  }
  while (stack.length > 0) {
    result += stack.pop();
  }

  return result;
}

// Test with:
// 1. Literal newlines in string
// 2. LaTeX backslashes
// 3. Truncated closing brace
const testJSON = `{\n  "title": "Quantum Metric",\n  "math": "\\mathcal{H} = \\frac{1}{2}\\sum x_i",\n  "code": "function run() {\n    return 42;\n  }"`;

console.log('Original test JSON:');
console.log(testJSON);

const sanitized = sanitizeJSONString(testJSON);
console.log('\nSanitized:');
console.log(sanitized);

try {
  const parsed = JSON.parse(sanitized);
  console.log('\nSUCCESS! Parsed object:', parsed);
} catch (e) {
  console.log('\nFAILED TO PARSE:', e.message);
}
