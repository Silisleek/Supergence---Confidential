import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parse } from 'acorn';
import { load } from 'cheerio';
import { sourceInterface } from './sourceInterface.js';

// Observe saved interfaces without executing user code or generating a project.
// Real-path confinement also rejects links to files outside the workspace.
export function projectFileObservation(root, filepath, { includeSource = false } = {}) {
  if (!/\.(?:[cm]?js|html?)$/i.test(filepath)) return null;
  try {
    const realRoot = fs.realpathSync(root);
    const file = fs.realpathSync(path.resolve(realRoot, filepath));
    const relative = path.relative(realRoot, file);
    if (relative.startsWith('..') || path.isAbsolute(relative))
      throw new Error('Saved source path is outside the active workspace.');
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > 262144) return { unavailable: 'Not a bounded source file.' };
    const source = fs.readFileSync(file, 'utf8');
    const observation = {
      sha256: createHash('sha256').update(source).digest('hex'),
      bytes: stat.size,
      scope: 'Current saved file; interface and syntax only, no runtime verification.',
    };
    if (includeSource && source.length <= 32000) observation.source = source;
    if (/\.html?$/i.test(file)) {
      const $ = load(source);
      observation.interface = {
        kind: 'html',
        ids: $('[id]')
          .map((_index, element) => $(element).attr('id'))
          .get(),
        scripts: $('script[src]')
          .map((_index, element) => $(element).attr('src'))
          .get(),
      };
    } else {
      try {
        parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
        observation.syntax = { status: 'passed' };
        observation.interface = sourceInterface(source);
      } catch (error) {
        observation.syntax = {
          status: 'failed',
          message: error.message,
          line: error.loc?.line,
          column: error.loc?.column,
        };
      }
    }
    return observation;
  } catch (error) {
    return { unavailable: error.code || error.message };
  }
}
