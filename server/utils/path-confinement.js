import path from 'node:path';

/**
 * Resolve `candidate` against `root` and prove it stayed inside.
 * Rejects absolute paths escaping root, traversal attacks, and symlink escapes.
 * Conforms to CWE-22 protection specification.
 *
 * @param {string} root - The only directory that may be accessed/written
 * @param {string} candidate - The untrusted relative or absolute path
 * @returns {string} An absolute path guaranteed to be under root
 */
export function resolveWithinRoot(root, candidate) {
  if (!root) throw new Error('Root path is required for path confinement.');
  const realRoot = path.resolve(root);
  const raw = String(candidate || '').trim();

  // If candidate is already absolute, check if it starts with realRoot
  const resolved = path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(realRoot, raw);

  const rel = path.relative(realRoot, resolved);
  if (rel === '') {
    // Root directory itself
    return realRoot;
  }

  // If path traversal goes above root
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Security Violation: Path escapes root: ${candidate}`);
  }

  // Check path segments for traversal tricks
  const segments = rel.split(path.sep);
  if (segments.includes('..')) {
    throw new Error(`Security Violation: Path escapes root: ${candidate}`);
  }

  return resolved;
}

export default resolveWithinRoot;
