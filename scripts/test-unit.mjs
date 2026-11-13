import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

// Ensure fast local temporary storage on Windows
if (process.platform === 'win32') {
  const current = process.env.TEMP || process.env.TMP || '';
  if (current.startsWith('E:') || current.startsWith('\\\\')) {
    const local = process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'Temp')
      : 'C:\\Users\\Akshan sharma\\AppData\\Local\\Temp';
    process.env.TEMP = local;
    process.env.TMP = local;
  }
}

const unitDir = path.join(root, 'tests', 'unit');
const testFiles = fs
  .readdirSync(unitDir)
  .filter((f) => f.endsWith('.test.mjs'))
  .map((f) => path.join('tests', 'unit', f));

const result = spawnSync(process.execPath, ['--test', ...testFiles], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 0);
