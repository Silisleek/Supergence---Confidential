import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { threeBenchmarks } from '../../server/quality/three-benchmarks.js';
import { generateBrowserApp } from '../../server/services/browserArtifactBuilder.js';
import { verifyCreationTask } from '../../server/services/creationTaskVerifier.js';
const option = (name, fallback) =>
  process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback;
const task = threeBenchmarks.find((t) => t.id === option('--task', 'courtyard-museum'));
if (!task) throw new Error('Unknown 3D task.');
const phase = option('--phase', 'first-attempt');
if (!['first-attempt', 'refined', 'detailed'].includes(phase))
  throw new Error('Phase must be first-attempt, refined or detailed.');
const run = option('--run', '3d-depth-20261023');
if (!/^[a-z0-9_-]+$/i.test(run)) throw new Error('Invalid run name.');
const directory = `supergence/benchmarks/${run}/${task.id}/${phase}`;
const target = path.resolve('workspace', directory);
await fs.mkdir(target, { recursive: true });
const filename = directory + '/index.html';
const mode = option('--mode', 'verify');
try {
  if (mode === 'generate') {
    try {
      await fs.access(path.join(target, 'index.generation-1.json'));
      throw new Error('A generation receipt already exists. Preserve the first attempt.');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const result = await generateBrowserApp({ brief: task.brief, filename, oneShot: true });
    await fs.writeFile(
      path.join(target, 'generation-result.json'),
      JSON.stringify(result, null, 2),
    );
    console.log(JSON.stringify(result));
  } else {
    const baseURL = option('--base-url', process.env.SIS_BASE_URL);
    if (!baseURL) throw new Error('Pass the actual backend banner URL with --base-url.');
    process.env.ACTIVE_SERVER_PORT = new URL(baseURL).port;
    const source = await fs.readFile(path.join(target, 'index.html'));
    const hash = createHash('sha256').update(source).digest('hex');
    const kit = await fs.readFile('client/scripts/three-creation-kit.js');
    const detailKit = await fs.readFile('client/scripts/three-detail-kit.js');
    const three = JSON.parse(await fs.readFile('node_modules/three/package.json', 'utf8')).version;
    await fs.writeFile(path.join(target, 'three-creation-kit.snapshot.js'), kit);
    await fs.writeFile(path.join(target, 'three-detail-kit.snapshot.js'), detailKit);
    const provenance = {
      task: task.id,
      phase,
      sourceSha256: hash,
      briefSha256: createHash('sha256').update(task.brief).digest('hex'),
      dependencySnapshot: {
        threeVersion: three,
        kitSha256: createHash('sha256').update(kit).digest('hex'),
        detailKitSha256: createHash('sha256').update(detailKit).digest('hex'),
        note: 'Dependency state at verification time; original HTML is unchanged.',
      },
      generationScope:
        phase === 'first-attempt'
          ? 'One generation call, no model repair; source retained unchanged.'
          : 'Observed repairs after the preserved first attempt; not one-shot.',
    };
    await fs.writeFile(path.join(target, 'provenance.json'), JSON.stringify(provenance, null, 2));
    const result = await verifyCreationTask({ filename, task: task.id });
    if (
      createHash('sha256')
        .update(await fs.readFile(path.join(target, 'index.html')))
        .digest('hex') !== hash
    )
      throw new Error('Source changed during verification.');
    await fs.writeFile(
      path.join(target, 'verification.json'),
      JSON.stringify({ ...provenance, ...result }, null, 2),
    );
    console.log(
      JSON.stringify({
        phase,
        task: task.id,
        passed: result.passed,
        count: result.passedChecks,
        total: result.totalChecks,
        failures: result.checks.filter((c) => !c.passed),
        screenshots: result.screenshots,
      }),
    );
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
process.exit(0);
