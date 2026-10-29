import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repository = fileURLToPath(new URL('../../', import.meta.url));

export function workspaceEnvironment(workspaceRoot) {
  const packages = {};
  for (const name of ['three', 'esbuild', 'playwright-core']) {
    try {
      let directory = path.dirname(require.resolve(name));
      while (directory !== path.dirname(directory)) {
        const manifest = path.join(directory, 'package.json');
        if (fs.existsSync(manifest)) {
          const info = JSON.parse(fs.readFileSync(manifest, 'utf8'));
          if (info.name === name) {
            packages[name] = { version: info.version, directory };
            break;
          }
        }
        directory = path.dirname(directory);
      }
    } catch {
      packages[name] = { available: false };
    }
  }
  return {
    repository,
    workspace: workspaceRoot,
    platform: process.platform,
    shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
    node: { version: process.version, executable: process.execPath },
    packages,
    note: 'Observed installed packages. Node resolves parent node_modules directories; projects need not duplicate them. Commands execute in the supplied cwd, or the workspace root. Prefer explicit cwd to cd chains. Browser operation still requires an actual Chrome check.',
  };
}
