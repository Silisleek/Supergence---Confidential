/**
 * Global Input Validation & Deep Sanitization Middleware
 * Enforces strict input validation on all routes, queries, and bodies
 * to prevent prototype pollution, path traversal, XSS, and injection attacks.
 */

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const TRAVERSAL_PATTERN = /(?:\.\.[/\\]|%2e%2e)/i;
const SCRIPT_INJECTION_PATTERN = /<(?:script|iframe|object|embed|svg\b[^>]*\bonload)\b|javascript\s*:|data\s*:\s*text\/html|on(?:load|error|click|mouseover)\s*=/i;
const SLEEK_ID_PATTERN = /^[a-zA-Z0-9_\-.]{4,48}$/;

/**
 * Validates a Sleek ID format.
 * Must be 4-48 characters: alphanumeric, dashes, underscores, and dots.
 */
export function validateSleekId(id) {
  if (!id || typeof id !== 'string') return false;
  const clean = id.trim();
  return SLEEK_ID_PATTERN.test(clean);
}

/**
 * Recursively scans an object for prototype pollution, null bytes, and traversal.
 */
function scanAndValidate(data, depth = 0, isCodeEndpoint = false) {
  if (depth > 15) {
    throw new Error('Input validation: Object nesting depth exceeded limit.');
  }

  if (data === null || data === undefined) return;

  if (typeof data === 'string') {
    if (data.includes('\0')) {
      throw new Error('Input validation: Null byte detected in request data.');
    }
    // Check for traversal in query parameters or general inputs
    if (TRAVERSAL_PATTERN.test(data) && !isCodeEndpoint) {
      // Allow relative paths only if strictly alphanumeric/nested, but block directory escapes
      if (data.includes('../') || data.includes('..\\') || data.includes('%2e%2e')) {
        throw new Error('Input validation: Path traversal sequence detected.');
      }
    }
    // Check for script injection in generic parameters
    if (!isCodeEndpoint && SCRIPT_INJECTION_PATTERN.test(data)) {
      throw new Error('Input validation: Potentially malicious script/event handler detected.');
    }
    return;
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      scanAndValidate(item, depth + 1, isCodeEndpoint);
    }
    return;
  }

  if (typeof data === 'object') {
    // Check if object prototype was tampered with or has dangerous own properties
    for (const dangerous of DANGEROUS_KEYS) {
      if (Object.prototype.hasOwnProperty.call(data, dangerous)) {
        throw new Error(`Input validation: Prototype pollution attempt detected via '${dangerous}'.`);
      }
    }

    const propNames = Object.getOwnPropertyNames(data);
    for (const prop of propNames) {
      if (DANGEROUS_KEYS.has(prop)) {
        throw new Error(`Input validation: Prototype pollution attempt detected via '${prop}'.`);
      }
    }

    if (!Array.isArray(data)) {
      const proto = Object.getPrototypeOf(data);
      if (proto !== Object.prototype && proto !== null) {
        throw new Error('Input validation: Prototype pollution attempt detected via modified prototype.');
      }
    }

    for (const [key, val] of Object.entries(data)) {
      if (DANGEROUS_KEYS.has(key)) {
        throw new Error(`Input validation: Prototype pollution attempt detected via '${key}'.`);
      }
      if (TRAVERSAL_PATTERN.test(key)) {
        throw new Error('Input validation: Invalid characters in property key.');
      }
      scanAndValidate(val, depth + 1, isCodeEndpoint);
    }
  }
}

/**
 * Global Express input validation middleware.
 */
export function globalInputValidator(req, res, next) {
  try {
    const isCodeEndpoint =
      req.path.startsWith('/api/workspace') ||
      req.path.startsWith('/api/coder') ||
      req.path.startsWith('/api/execution');

    // Validate query parameters
    if (req.query && typeof req.query === 'object') {
      scanAndValidate(req.query, 0, false);
    }

    // Validate URL route params
    if (req.params && typeof req.params === 'object') {
      scanAndValidate(req.params, 0, false);
    }

    // Validate request body
    if (req.body && typeof req.body === 'object') {
      scanAndValidate(req.body, 0, isCodeEndpoint);
    }

    next();
  } catch (err) {
    res.status(400).json({
      error: 'Security Validation Error',
      message: err.message,
    });
  }
}

export default {
  validateSleekId,
  globalInputValidator,
};
