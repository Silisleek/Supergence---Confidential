import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { verifyCreationTask } from '../../server/services/creationTaskVerifier.js';
const [task, directory] = process.argv.slice(2);
const baseURL = process.env.SIS_BASE_URL;
if (
  !baseURL ||
  !task ||
  !directory?.startsWith('supergence/benchmarks/') ||
  directory.includes('..')
)
  throw new Error('Set SIS_BASE_URL and supply task + confined project directory.');
process.env.ACTIVE_SERVER_PORT = new URL(baseURL).port;
const hash = (value) => createHash('sha256').update(value).digest('hex');
const sourceHashes = {};
for (const name of await fs.readdir(`workspace/${directory}`))
  if (/\.(html|js)$/.test(name))
    sourceHashes[name] = hash(await fs.readFile(`workspace/${directory}/${name}`));
const result = await verifyCreationTask({ task, filename: `${directory}/index.html` });
for (const [name, before] of Object.entries(sourceHashes))
  if (hash(await fs.readFile(`workspace/${directory}/${name}`)) !== before)
    throw new Error('Source changed during verification.');
await fs.writeFile(
  `workspace/${directory}/verification.json`,
  JSON.stringify(
    {
      ...result,
      sourceHashes,
      workflow: 'Development build with preserved generation/repair receipts; not strict one-call.',
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    task,
    passed: result.passed,
    count: result.passedChecks,
    total: result.totalChecks,
    failures: result.checks.filter((c) => !c.passed),
    screenshots: result.screenshots,
  }),
);
if (!result.passed) process.exitCode = 1;
// Imported provider infrastructure has live timers.
process.exit(process.exitCode || 0);
