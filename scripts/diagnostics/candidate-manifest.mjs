import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function inventory(directory, prefix = '') {
  const files = {};
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Unexpected linked release input: ${relative}`);
    if (entry.isDirectory()) Object.assign(files, await inventory(absolute, relative));
    else files[relative] = hash(await fs.readFile(absolute));
  }
  return files;
}
const [command, destination, packagedDirectory] = process.argv.slice(2);
if (!destination) throw new Error('Provide a manifest path inside release-candidate.');
const target = path.resolve(root, destination);
const candidateRoot = path.join(root, 'release-candidate');
if (!target.startsWith(`${candidateRoot}${path.sep}`))
  throw new Error('Manifest must stay in release-candidate.');
if (command === 'freeze') {
  const files = {};
  for (const directory of ['client', 'server', 'electron', 'resources', 'dist', 'demos'])
    Object.assign(files, await inventory(path.join(root, directory), directory));
  for (const file of [
    'package.json',
    'package-lock.json',
    'build/installer.nsh',
    'scripts/anti-slop.js',
    'scripts/build.mjs',
    'vite.config.js',
  ])
    files[file] = hash(await fs.readFile(path.join(root, file)));
  const sorted = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));
  await fs.mkdir(path.dirname(target), { recursive: true });
  const manifest = {
    createdAt: new Date().toISOString(),
    sourceTreeSHA256: hash(JSON.stringify(sorted)),
    files: sorted,
  };
  await fs.writeFile(target, JSON.stringify(manifest, null, 2), { flag: 'wx' });
  console.log(`Frozen ${Object.keys(files).length} release inputs: ${manifest.sourceTreeSHA256}`);
} else if (command === 'verify') {
  const manifest = JSON.parse(await fs.readFile(target, 'utf8'));
  for (const [file, expected] of Object.entries(manifest.files)) {
    if (hash(await fs.readFile(path.join(root, file))) !== expected)
      throw new Error(`Release input changed: ${file}`);
    if (
      packagedDirectory &&
      file !== 'package.json' &&
      ![
        'package-lock.json',
        'build/installer.nsh',
        'scripts/build.mjs',
        'vite.config.js',
        'dist/vendor/dompurify/purify.cjs.d.ts',
      ].includes(file)
    )
      if (
        hash(await fs.readFile(path.join(root, packagedDirectory, 'resources/app', file))) !==
        expected
      )
        throw new Error(`Packaged source mismatch: ${file}`);
  }
  console.log(`Verified frozen release inputs${packagedDirectory ? ' and packaged copies' : ''}.`);
} else if (command === 'tree') {
  if (!packagedDirectory) throw new Error('Provide the packaged directory.');
  const files = await inventory(path.resolve(root, packagedDirectory));
  await fs.writeFile(target, JSON.stringify(files, null, 2), { flag: 'wx' });
  console.log(`Recorded ${Object.keys(files).length} packaged file hashes.`);
} else if (command === 'check-tree') {
  const expected = JSON.parse(await fs.readFile(target, 'utf8'));
  const actual = await inventory(path.resolve(root, packagedDirectory));
  for (const file of new Set([...Object.keys(expected), ...Object.keys(actual)]))
    if (expected[file] !== actual[file])
      throw new Error(`Packaged tree changed during acceptance: ${file}`);
  console.log('Packaged tree stayed byte-for-byte unchanged during acceptance.');
} else throw new Error('Use freeze, verify, tree or check-tree.');
