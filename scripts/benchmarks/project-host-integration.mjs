import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { projectRuntimeHTML } from '../../server/services/browserProjectBuilder.js';
import { verifyCreationTask } from '../../server/services/creationTaskVerifier.js';
const hash = (b) => createHash('sha256').update(b).digest('hex');
const baseURL = process.env.SIS_BASE_URL;
if (!baseURL) throw new Error('Set actual SIS_BASE_URL.');
process.env.ACTIVE_SERVER_PORT = new URL(baseURL).port;
try {
  for (const [run, task] of [
    ['modular-development-v2', 'northlight-workshop'],
    ['modular-development-v3', 'canal-rescue'],
  ]) {
    const parent = `supergence/benchmarks/${run}/${task}/modular`,
      directory = `supergence/benchmarks/project-host-integration/${task}`;
    await fs.mkdir('workspace/' + directory, { recursive: true });
    const moduleHashes = {};
    for (const name of [
      'materials.js',
      'models.js',
      'experience.js',
      'project-generation.json',
      'plan.json',
    ]) {
      const source = await fs.readFile(`workspace/${parent}/${name}`);
      await fs.writeFile(`workspace/${directory}/${name}`, source, { flag: 'wx' });
      moduleHashes[name] = hash(source);
    }
    await fs.writeFile(`workspace/${directory}/index.html`, projectRuntimeHTML, { flag: 'wx' });
    const record = {
      createdAt: new Date().toISOString(),
      parent,
      change:
        'Shared host binds data-testid to actual DOM ids. Model-written modules are unchanged; this is an infrastructure integration repair, not a fresh one-shot output.',
      moduleHashes,
      hostSha256: hash(projectRuntimeHTML),
    };
    await fs.writeFile(`workspace/${directory}/integration.json`, JSON.stringify(record, null, 2));
    const result = await verifyCreationTask({ filename: directory + '/index.html', task });
    await fs.writeFile(
      `workspace/${directory}/verification.json`,
      JSON.stringify({ ...result, integration: record }, null, 2),
    );
    console.log(
      JSON.stringify({
        task,
        passed: result.passed,
        count: result.passedChecks,
        total: result.totalChecks,
        failures: result.checks.filter((c) => !c.passed),
      }),
    );
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
process.exit(0);
