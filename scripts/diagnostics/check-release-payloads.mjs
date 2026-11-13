import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const candidate = path.resolve(process.argv[2] || 'release-candidate/2026-11-05-final');
const unpacked = path.resolve(process.argv[3] || 'release-candidate/2026-11-05-rc2/win-unpacked');
const inspector = process.env.SIS_7ZIP || 'C:/Program Files/7-Zip/7z.exe';
const sha = async (file) =>
  createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex');
const output = path.join(candidate, 'payload-verification');
await fs.mkdir(output, { recursive: true });
const directPortable = process.argv.includes('--direct-portable');
const payloads = [];
for (const [kind, name] of [
  ['installer', 'Supergence Setup 1.0.0.exe'],
  ['portable', 'Supergence-Portable-1.0.0.exe'],
]) {
  const folder = path.join(output, kind);
  await fs.mkdir(folder, { recursive: true });
  const exe = path.join(candidate, name);
  const payload = path.join(folder, 'application');
  const args =
    kind === 'portable' && directPortable
      ? ['x', exe, `-o${payload}`, '-x!$PLUGINSDIR', '-x![NSIS].nsi', '-y']
      : ['e', exe, `-o${folder}`, '*app-64.7z', '-r', '-y'];
  const result = await run(inspector, args, { windowsHide: true });
  await fs.writeFile(path.join(folder, 'extraction.log'), result.stdout);
  let archiveSHA256 = null;
  if (args[0] === 'e') {
    const archive = path.join(folder, 'app-64.7z');
    archiveSHA256 = await sha(archive);
    const extracted = await run(inspector, ['x', archive, `-o${payload}`, '-y'], {
      windowsHide: true,
    });
    await fs.writeFile(path.join(folder, 'application-extraction.log'), extracted.stdout);
  }
  payloads.push({ kind, payload, archiveSHA256 });
}
async function inventory(directory, prefix = '') {
  const files = {};
  for (const item of await fs.readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${item.name}` : item.name;
    const full = path.join(directory, item.name);
    if (item.isDirectory()) Object.assign(files, await inventory(full, relative));
    else files[relative] = await sha(full);
  }
  return files;
}
const expected = await inventory(unpacked);
for (const { kind, payload } of payloads) {
  const actual = await inventory(payload);
  const differences = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].filter(
    (name) => expected[name] !== actual[name],
  );
  if (differences.length)
    throw new Error(`${kind} payload differs from tested tree: ${differences.join(', ')}`);
  for (const name of Object.keys(actual)) {
    if (/^resources\/app\/(?:data|workspace)\//i.test(name) || /(?:^|\/)\.env(?:$|\.)/i.test(name))
      throw new Error(`Private runtime path in release: ${name}`);
  }
}
const result = {
  checkedAt: new Date().toISOString(),
  passed: true,
  filesPerPayload: Object.keys(expected).length,
  archives: Object.fromEntries(payloads.map(({ kind, archiveSHA256 }) => [kind, archiveSHA256])),
  checks: [
    'every extracted file matches the tested application tree',
    'runtime data/environment paths excluded',
  ],
  limitation: 'Payload integrity does not replace installation, upgrade and uninstall testing.',
};
await fs.writeFile(
  path.join(candidate, 'payload-verification.json'),
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result, null, 2));
