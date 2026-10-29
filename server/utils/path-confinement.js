import path from 'node:path';
import fs from 'node:fs';

/**
 * Resolve `candidate` against `root` and prove it stayed inside.
 * Rejects paths outside the root and existing symbolic links or junctions.
 * This check is not an OS sandbox and does not eliminate filesystem races.
 *
 * @param {string} root - The only directory that may be accessed/written
 * @param {string} candidate - The untrusted relative or absolute path
 * @returns {string} An absolute path checked against the root
 */
export function resolveWithinRoot(root, candidate) {
  if (!root) throw new Error('Root path is required for path confinement.');
  const realRoot = path.resolve(root);
  const raw = String(candidate || '').trim();

  // If candidate is already absolute, check if it starts with realRoot
  const resolved = path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(realRoot, raw);

  const rel = path.relative(realRoot, resolved);
  // If path traversal goes above root
  if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    throw new Error(`Security Violation: Path escapes root: ${candidate}`);
  }

  // Check path segments for traversal tricks
  const segments = rel.split(path.sep).filter(Boolean);
  if (segments.includes('..')) {
    throw new Error(`Security Violation: Path escapes root: ${candidate}`);
  }

  let cursor = realRoot;
  for (const segment of ['', ...segments]) {
    if (segment) cursor = path.join(cursor, segment);
    try {
      if (fs.lstatSync(cursor).isSymbolicLink())
        throw new Error(`Security Violation: Linked paths are not allowed: ${candidate}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return resolved;
}

export default resolveWithinRoot;
