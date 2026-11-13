import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicDirectory = path.join(root, '.cache', 'vite-public');
if (path.relative(root, publicDirectory) !== path.join('.cache', 'vite-public'))
  throw new Error('Unexpected build staging directory.');
// Stage generated copies in Vite's public directory. Classic controllers keep
// their native globals and loading order; maintained sources stay in client/.
await fs.rm(publicDirectory, { recursive: true, force: true });
await fs.mkdir(path.join(publicDirectory, 'scripts'), { recursive: true });
await fs.copyFile(path.join(root, 'client', 'Styles.md'), path.join(publicDirectory, 'Styles.md'));
const clientScriptsDir = path.join(root, 'client', 'scripts');
const clientScripts = await fs.readdir(clientScriptsDir);
for (const script of clientScripts) {
  if (script.endsWith('.js')) {
    await fs.copyFile(
      path.join(clientScriptsDir, script),
      path.join(publicDirectory, 'scripts', script),
    );
  }
}
for (const directory of ['fonts', 'images', 'vendor']) {
  await fs.cp(path.join(root, 'client', directory), path.join(publicDirectory, directory), {
    recursive: true,
  });
}
await fs.cp(
  path.join(root, 'node_modules/dompurify/dist'),
  path.join(publicDirectory, 'vendor/dompurify'),
  { recursive: true },
);
for (const directory of ['build', 'examples/jsm']) {
  await fs.cp(
    path.join(root, 'node_modules', 'three', directory),
    path.join(publicDirectory, 'vendor', 'three', directory),
    { recursive: true },
  );
}

const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
  cwd: root,
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
if (process.exitCode === 0) {
  for (const page of ['index', 'guide', 'silisleek', 'installer']) {
    const html = await fs.readFile(path.join(root, 'dist', `${page}.html`), 'utf8');
    for (const match of html.matchAll(/<script\b[^>]*\bsrc="(\/scripts\/[^"?#]+)[^"]*"/g)) {
      const asset = path.join(root, 'dist', match[1].slice(1));
      try {
        await fs.access(asset);
      } catch {
        throw new Error(`${page}.html references a missing production script: ${match[1]}`);
      }
    }
  }
}
