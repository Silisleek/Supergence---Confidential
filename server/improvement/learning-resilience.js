// SIS 1.0 — Learning Resilience & 24/7 Continuous Self-Improvement Engine
// Provides bulletproof multi-tier JSON parsing, AST syntax repair, and fault-tolerant AI execution
// across all SIS continuous learning loops (AutonomousLearner, AZR, AlphaEvolve, RedQueen, InventiveEngine).

import vm from 'vm';
import { quickAI, DEFAULT_MODEL, PREMIUM_MODEL } from '../api/openrouter.js';

/**
 * Sanitize raw JSON string by escaping invalid characters, unescaped newlines/tabs inside quotes,
 * unescaped LaTeX backslashes, and balancing truncated braces.
 */
export function sanitizeJSONString(raw) {
  if (!raw || typeof raw !== 'string') return raw;

  // Step 1: Escape backslashes that are NOT part of valid JSON escape sequences (\", \\, \/, \b, \f, \n, \r, \t, \uXXXX)
  let s = raw.replace(/\\(?!["\\/bfnrtu]|u[0-9a-fA-F]{4})/g, '\\\\');

  // Step 2: Escape raw control characters inside string literals
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
        result += ' ';
      } else {
        result += ch;
      }
    } else {
      result += ch;
    }
  }

  // Step 3: If stream truncated inside a string literal, close the quote
  if (insideString) {
    result += '"';
  }

  // Step 4: Balance unclosed braces and brackets
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

/**
 * Robust JSON parse attempt with multiple repair strategies
 */
export function tryParseJSON(str) {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();

  // Tier 1: Direct native parse
  try {
    return JSON.parse(trimmed);
  } catch {}

  // Tier 2: Slice from structured JSON opening to closing
  let startIdx = -1;
  let isObject = true;

  const structuredObjMatch = trimmed.match(/\{[\s\r\n]*"[a-zA-Z0-9_$]+"\s*:/);
  const structuredArrMatch = trimmed.match(/\[[\s\r\n]*(?:\{|"[^"]*"|\d+)/);

  if (structuredObjMatch && structuredArrMatch) {
    if (structuredObjMatch.index <= structuredArrMatch.index) {
      startIdx = structuredObjMatch.index;
      isObject = true;
    } else {
      startIdx = structuredArrMatch.index;
      isObject = false;
    }
  } else if (structuredObjMatch) {
    startIdx = structuredObjMatch.index;
    isObject = true;
  } else if (structuredArrMatch) {
    startIdx = structuredArrMatch.index;
    isObject = false;
  } else {
    const firstBrace = trimmed.indexOf('{');
    const firstBracket = trimmed.indexOf('[');
    if (firstBrace !== -1 && firstBracket !== -1) {
      if (firstBrace < firstBracket) {
        startIdx = firstBrace;
        isObject = true;
      } else {
        startIdx = firstBracket;
        isObject = false;
      }
    } else if (firstBrace !== -1) {
      startIdx = firstBrace;
      isObject = true;
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
      isObject = false;
    }
  }

  if (startIdx === -1) return null;

  const endChar = isObject ? '}' : ']';
  const lastIdx = trimmed.lastIndexOf(endChar);
  let candidate =
    lastIdx > startIdx ? trimmed.slice(startIdx, lastIdx + 1) : trimmed.slice(startIdx);

  try {
    return JSON.parse(candidate);
  } catch {}

  // Tier 3: Sanitize control characters and unclosed structures
  try {
    const repaired = sanitizeJSONString(candidate);
    return JSON.parse(repaired);
  } catch {}

  // Tier 4: Relaxed syntax (strip trailing commas, wrap unquoted keys, clean dangling properties)
  try {
    let relaxed = candidate
      .replace(/,\s*([\}\]])/g, '$1')
      .replace(/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":')
      .replace(/,\s*"[a-zA-Z0-9_$]*"\s*:\s*$/, '')
      .replace(/,\s*"[a-zA-Z0-9_$]*"$/, '');
    return JSON.parse(sanitizeJSONString(relaxed));
  } catch {}

  return null;
}

/**
 * Key-value regex fallback extractor for structured objects when JSON.parse fails
 */
export function extractKeyValueFallback(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const obj = {};

  // Extract string values
  const stringFieldMatches = raw.matchAll(
    /"([a-zA-Z0-9_$]+)"\s*:\s*"([\s\S]*?)(?="\s*,\s*"[a-zA-Z0-9_$]+"|"\s*\}|$)/g,
  );
  for (const m of stringFieldMatches) {
    const key = m[1];
    let val = m[2].trim();
    val = val.replace(/\\"/g, '"').replace(/\\n/g, '\n');
    obj[key] = val;
  }

  // Extract array values
  const arrayFieldMatches = raw.matchAll(/"([a-zA-Z0-9_$]+)"\s*:\s*\[([\s\S]*?)\]/g);
  for (const m of arrayFieldMatches) {
    const key = m[1];
    const itemsRaw = m[2];
    const items = [...itemsRaw.matchAll(/"([^"]*)"/g)].map((x) => x[1]);
    if (items.length > 0) {
      obj[key] = items;
    }
  }

  // Extract numeric and boolean values
  const primitiveMatches = raw.matchAll(
    /"([a-zA-Z0-9_$]+)"\s*:\s*(true|false|null|-?\d+(?:\.\d+)?)/g,
  );
  for (const m of primitiveMatches) {
    const key = m[1];
    if (obj[key] === undefined) {
      try {
        obj[key] = JSON.parse(m[2]);
      } catch {}
    }
  }

  return Object.keys(obj).length >= 2 ? obj : null;
}

/**
 * Universal resilient JSON extraction that handles reasoning models, markdown fences,
 * relaxed JSON, unescaped LaTeX, unescaped newlines/quotes in strings, and truncated streams.
 */
export function extractCleanJSON(text, fallback = null) {
  if (!text || typeof text !== 'string') return fallback;
  const clean = text.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();

  // Tier 1: Try inside markdown code fences
  const fenceMatches = [...clean.matchAll(/```(?:json)?\s*\r?\n([\s\S]*?)```/gi)];
  for (const m of fenceMatches) {
    const parsed = tryParseJSON(m[1].trim());
    if (parsed && typeof parsed === 'object') return parsed;
  }

  // Tier 2: Open code fence (streaming cut-off)
  const openFence = clean.match(/```(?:json)?\s*\r?\n([\s\S]*)/i);
  if (openFence && openFence[1]) {
    const parsed = tryParseJSON(openFence[1].trim());
    if (parsed && typeof parsed === 'object') return parsed;
  }

  // Tier 3: Scan raw text from first bracket
  const direct = tryParseJSON(clean);
  if (direct && typeof direct === 'object') return direct;

  // Tier 4: Key-value regex extraction
  const fallbackObj = extractKeyValueFallback(clean);
  if (fallbackObj && typeof fallbackObj === 'object') return fallbackObj;

  return fallback;
}

/**
 * Extracts and AST-heals JavaScript code from an AI response.
 * Uses Node.js vm.Script to auto-heal syntax errors and strip stray prose.
 */
export function extractCleanCode(text, defaultFn = '') {
  if (!text || typeof text !== 'string') return defaultFn;
  let code = '';

  // Extract from markdown code fences: find ALL fences and pick the target execution script
  const fences = [...text.matchAll(/```(?:javascript|js)?\s*\r?\n([\s\S]*?)```/gi)].map((m) =>
    m[1].trim(),
  );
  if (fences.length > 0) {
    const executableScriptFence =
      fences.find(
        (f) => (f.includes('baselineNs') || f.includes('ITER')) && f.includes('console.log'),
      ) ||
      fences.find((f) => f.includes('baselineNs') || f.includes('verified')) ||
      fences.reduce((max, cur) => (cur.length > max.length ? cur : max), fences[0]);
    code = executableScriptFence;
  } else if (text.length > 30 && !text.includes('```')) {
    code = text.trim();
  }

  // Strip pseudo-fences
  code = code
    .replace(/^\\+(?:javascript|js)\s*/i, '')
    .replace(/\\+$/g, '')
    .trim();
  code = code.replace(/\/\/\s*\.\.\.[^\n]*/g, '// [continued]');
  code = code.replace(/\.\.\./g, '/* [continued] */');

  if (!code) return defaultFn;

  // Step 1: Pre-balance braces, brackets, and quotes
  code = balanceBraces(code);

  // Verify clean compilation
  try {
    new vm.Script(code);
    return code;
  } catch (_) {
    code = balanceBraces(code);
    try {
      new vm.Script(code);
      return code;
    } catch (err2) {
      // Return code as-is; let caller or sandbox execute without destructively commenting out lines
      return code;
    }
  }
}

/**
 * Balance unclosed quotes, brackets, and braces in JavaScript code
 */
export function balanceBraces(code) {
  if (!code || typeof code !== 'string') return code;
  let inStr = false,
    quoteChar = '',
    esc = false,
    openBraces = 0,
    openParens = 0,
    openBrackets = 0;
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if (esc) {
      esc = false;
      continue;
    }
    if (c === '\\') {
      esc = true;
      continue;
    }
    if (inStr) {
      if (c === quoteChar) inStr = false;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = true;
      quoteChar = c;
      continue;
    }
    if (c === '{') openBraces++;
    else if (c === '}') {
      if (openBraces > 0) openBraces--;
    } else if (c === '(') openParens++;
    else if (c === ')') {
      if (openParens > 0) openParens--;
    } else if (c === '[') openBrackets++;
    else if (c === ']') {
      if (openBrackets > 0) openBrackets--;
    }
  }

  let healed = code;
  if (inStr) healed += quoteChar;
  while (openBrackets > 0) {
    healed += '\n]';
    openBrackets--;
  }
  while (openParens > 0) {
    healed += '\n)';
    openParens--;
  }
  while (openBraces > 0) {
    healed += '\n}';
    openBraces--;
  }
  return healed;
}

/**
 * Fault-tolerant AI call for 24/7 continuous self-improvement
 */
export async function safeLearningAI(
  systemPrompt,
  userPrompt,
  optsOrModel = {},
  positionalMaxTokens,
  positionalTimeout,
  positionalTemp,
) {
  let model, maxTokens, timeoutMs, temperature;

  if (typeof optsOrModel === 'string') {
    model = optsOrModel || DEFAULT_MODEL;
    maxTokens = positionalMaxTokens || 6144;
    timeoutMs = positionalTimeout || 180000;
    temperature = positionalTemp !== undefined ? positionalTemp : 0.2;
  } else {
    const opts = optsOrModel || {};
    model = opts.model || DEFAULT_MODEL;
    maxTokens = opts.maxTokens || 6144;
    timeoutMs = opts.timeoutMs || 180000;
    temperature = opts.temperature !== undefined ? opts.temperature : 0.2;
  }

  try {
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
    });
    const aiPromise = quickAI(systemPrompt, userPrompt, model, maxTokens, temperature);
    const result = await Promise.race([aiPromise, timeoutPromise]);
    clearTimeout(timer);
    const text = result ? String(result.text || result.content || result).trim() : '';
    if (text.length > 0) {
      return text;
    }
  } catch (err) {
    console.warn(
      `[LearningResilience] AI notice (${err.message}) on model ${model}, attempting fallback...`,
    );
  }

  const fallbacks = (
    process.env.FALLBACK_MODEL ||
    process.env.FALLBACK_MODELS ||
    'space-bunny-free'
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const fb of fallbacks) {
    if (fb === model) continue;
    try {
      const fbRes = await quickAI(systemPrompt, userPrompt, fb, maxTokens, temperature);
      const fbText = fbRes ? String(fbRes.text || fbRes.content || fbRes).trim() : '';
      if (fbText.length > 0) {
        return fbText;
      }
    } catch {}
  }

  return null;
}

export default {
  sanitizeJSONString,
  tryParseJSON,
  extractKeyValueFallback,
  extractCleanJSON,
  extractCleanCode,
  safeLearningAI,
};
