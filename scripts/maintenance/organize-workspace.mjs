/**
 * Move legacy workspace material without deleting it. Preview by default;
 * pass --apply to save a source snapshot and a reversible move manifest.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const apply = process.argv.includes('--apply');
const moves = [];
const exists = async (name) =>
  fs.access(path.join(root, name)).then(
    () => true,
    () => false,
  );

function insideRoot(name) {
  const resolved = path.resolve(root, name);
  if (!resolved.startsWith(root) || resolved === root) {
    throw new Error(`Path must stay inside the workspace: ${name}`);
  }
  return resolved;
}

async function plan(from, to) {
  if (!(await exists(from))) return;
  if (await exists(to)) throw new Error(`Destination already exists: ${to}`);
  moves.push({ from, to });
}

for (const file of await fs.readdir(root, { withFileTypes: true })) {
  if (!file.isFile()) continue;
  const name = file.name;
  if (
    /^(?:test[_-]|verify[_-]|debug[_-]|run_playwright_verification)/.test(name) &&
    /\.(?:m?js|cjs)$/.test(name)
  ) {
    await plan(name, `tests/legacy/${name}`);
  } else if (name === '.tmp_probe.cjs') {
    await plan(name, 'tests/legacy/workspace-probe.cjs');
  } else if (name.endsWith('.html')) {
    await plan(name, `demos/legacy/${name}`);
  } else if (
    name.endsWith('.png') ||
    name.endsWith('.log') ||
    name === 'task_evaluation_results.json'
  ) {
    await plan(name, `test-results/legacy/root/${name}`);
  } else if (
    name.endsWith('.md') &&
    !['README.md', 'AGENTS.md', 'CONTRIBUTING.md'].includes(name)
  ) {
    await plan(name, `docs/architecture/${name}`);
  }
}

for (const name of [
  'Open UI REFERENCES',
  'Open-source-AI-Agents',
  'Tools and apps',
  'skills-main',
  'system_prompts_leaks-main',
  'extracted',
]) {
  await plan(name, `references/${name}`);
}
await plan('UI', 'demos/supergence-ui');
await plan('archive', 'archives/legacy');
await plan('temp-extract', 'archives/packaged-snapshot');

for (const directory of ['scripts', 'tests']) {
  for (const file of await fs.readdir(path.join(root, directory), { withFileTypes: true })) {
    if (file.isFile() && /\.(?:png|log)$/.test(file.name)) {
      await plan(`${directory}/${file.name}`, `test-results/legacy/${directory}/${file.name}`);
    }
  }
}

// Give active developer entry points a small, predictable surface. Historical
// live/model tests are kept out of the automatic unit and browser suites.
for (const file of await fs.readdir(path.join(root, 'scripts'), { withFileTypes: true })) {
  if (!file.isFile()) continue;
  if (/^(?:test[_-]|verify[_-]|run_autonomous)/.test(file.name)) {
    await plan(`scripts/${file.name}`, `tests/manual/tools/${file.name}`);
  } else if (
    /^(?:check[_-]|debug[_-]|diagnose[_-]|inspect[_-]|list_|fix_|cols\.)/.test(file.name)
  ) {
    await plan(`scripts/${file.name}`, `scripts/diagnostics/${file.name}`);
  } else if (/^capture[_-]/.test(file.name)) {
    await plan(`scripts/${file.name}`, `scripts/capture/${file.name}`);
  } else if (/^prototype_/.test(file.name)) {
    await plan(`scripts/${file.name}`, `demos/generators/${file.name}`);
  }
}
for (const file of await fs.readdir(path.join(root, 'tests'), { withFileTypes: true })) {
  if (!file.isFile() || !/\.(?:m?js|cjs)$/.test(file.name)) continue;
  if (file.name === 'verify-claude-sis-integration.mjs' || file.name.endsWith('.test.js')) continue;
  await plan(`tests/${file.name}`, `tests/manual/${file.name}`);
}

console.log(`${apply ? 'Applying' : 'Previewing'} ${moves.length} moves.`);
if (!apply) {
  console.log(JSON.stringify(moves, null, 2));
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const snapshot = path.join(root, 'archives', `workspace-cleanup-${stamp}`);
await fs.mkdir(snapshot, { recursive: true });
for (const directory of ['client', 'server', 'electron', 'scripts', 'tests', 'docs', 'demos']) {
  await fs.cp(path.join(root, directory), path.join(snapshot, directory), { recursive: true });
}
for (const file of await fs.readdir(root, { withFileTypes: true })) {
  if (file.isFile() && !file.name.startsWith('.env')) {
    await fs.copyFile(path.join(root, file.name), path.join(snapshot, file.name));
  }
}

for (const move of moves) {
  const from = insideRoot(move.from);
  const to = insideRoot(move.to);
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.rename(from, to);

  // Preserve relative imports and paths anchored to the original script folder.
  if (/\.(?:m?js|cjs)$/.test(move.to)) {
    let source = await fs.readFile(to, 'utf8');
    source = source.replace(
      /((?:from\s+|import\s*\(|require\s*\(|import\s*)['"])(\.[^'"]+)(['"])/g,
      (match, prefix, specifier, quote) => {
        const target = path.resolve(path.dirname(from), specifier);
        let relative = path.relative(path.dirname(to), target).replaceAll('\\', '/');
        if (!relative.startsWith('.')) relative = `./${relative}`;
        return `${prefix}${relative}${quote}`;
      },
    );
    source = source.replace(
      /((?:path\.)?(?:join|resolve)\(\s*__dirname\s*,\s*)(['"])([^'"]+)\2/g,
      (_match, prefix, quote, specifier) => {
        const target = path.resolve(path.dirname(from), specifier);
        const relative = path.relative(path.dirname(to), target).replaceAll('\\', '/') || '.';
        return `${prefix}${quote}${relative}${quote}`;
      },
    );
    await fs.writeFile(to, source);
  }
}

const previousManifestPath = path.join(root, 'docs/maintenance/workspace-moves.json');
const previousManifest = await fs
  .readFile(previousManifestPath, 'utf8')
  .then(JSON.parse, () => null);
const manifest = {
  createdAt: new Date().toISOString(),
  snapshot: path.relative(root, snapshot).replaceAll('\\', '/'),
  moves,
  previousSnapshots: previousManifest
    ? [...(previousManifest.previousSnapshots || []), previousManifest.snapshot]
    : [],
};
if (previousManifest) manifest.moves = [...previousManifest.moves, ...moves];
await fs.writeFile(
  path.join(snapshot, 'move-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
await fs.mkdir(path.join(root, 'docs/maintenance'), { recursive: true });
await fs.writeFile(
  path.join(root, 'docs/maintenance/workspace-moves.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(`Preserved original source in ${manifest.snapshot}`);
console.log(`Moved ${moves.length} entries. See docs/maintenance/workspace-moves.json.`);
