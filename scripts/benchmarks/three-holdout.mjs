import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { holdoutThree } from '../../server/quality/holdout-three.js';
import { generateBrowserApp } from '../../server/services/browserArtifactBuilder.js';
import { generateBrowserProject } from '../../server/services/browserProjectBuilder.js';
import { verifyCreationTask } from '../../server/services/creationTaskVerifier.js';
const hash = (value) => createHash('sha256').update(value).digest('hex');
const option = (key, fallback) =>
  process.argv.includes(key) ? process.argv[process.argv.indexOf(key) + 1] : fallback;
const mode = option('--mode', 'verify');
const reassess = process.argv.includes('--reassess');
const baseURL = option('--base-url', process.env.SIS_BASE_URL);
const run = option('--run', 'holdout-20261024');
if (!/^[-\w]+$/.test(run)) throw new Error('Invalid run name.');
const root = `workspace/supergence/benchmarks/${run}`;
await fs.mkdir(root, { recursive: true });
let resultDirectory;
try {
  if (mode === 'freeze') {
    const dependencies = {};
    for (const file of [
      'server/services/browserProjectBuilder.js',
      'server/services/browserArtifactBuilder.js',
      'server/3d/creation-contract.js',
      'server/quality/holdout-three.js',
      'server/services/creationTaskVerifier.js',
      'client/scripts/three-creation-kit.js',
      'client/scripts/three-detail-kit.js',
    ])
      dependencies[file] = hash(await fs.readFile(file));
    await fs.writeFile(
      `${root}/manifest.json`,
      JSON.stringify(
        {
          frozenAt: new Date().toISOString(),
          tasks: holdoutThree.map(({ id, brief, visualReview }) => ({
            id,
            brief,
            briefSha256: hash(brief),
            visualReview,
          })),
          dependencies,
          methodology:
            'New development holdouts with task-family overlap. Briefs, oracle and generator frozen before any execution. All first outcomes retained. Strict=one model call; modular=one build request with 4 generation stages and at most 2 runtime preflight repairs. No task-oracle feedback is used to repair these evaluated outputs. Not independent certification or a universal reliability estimate.',
        },
        null,
        2,
      ),
      { flag: 'wx' },
    );
    console.log('Manifest frozen: ' + path.resolve(root, 'manifest.json'));
    process.exit(0);
  }
  if (!baseURL) throw new Error('Supply actual server banner URL.');
  process.env.ACTIVE_SERVER_PORT = new URL(baseURL).port;
  const manifest = JSON.parse(await fs.readFile(`${root}/manifest.json`, 'utf8'));
  const task = holdoutThree.find((t) => t.id === option('--task', holdoutThree[0].id));
  if (!task) throw new Error('Unknown task.');
  if (hash(task.brief) !== manifest.tasks.find((t) => t.id === task.id)?.briefSha256)
    throw new Error('Frozen brief changed.');
  for (const file of mode === 'generate'
    ? [
        'server/services/browserProjectBuilder.js',
        'server/services/browserArtifactBuilder.js',
        'server/3d/creation-contract.js',
        'server/quality/holdout-three.js',
      ]
    : reassess
      ? []
      : ['server/quality/holdout-three.js'])
    if (hash(await fs.readFile(file)) !== manifest.dependencies[file])
      throw new Error('Frozen generator/oracle changed: ' + file);
  const strategy = option('--strategy', 'strict');
  if (!['strict', 'modular'].includes(strategy)) throw new Error('Unknown strategy.');
  const directory = `supergence/benchmarks/${run}/${task.id}/${strategy}`;
  const target = 'workspace/' + directory,
    filename = directory + '/index.html';
  resultDirectory = target;
  if (mode === 'generate') {
    if (strategy === 'strict') {
      try {
        await fs.access(target + '/index.generation-1.json');
        throw new Error('Preserve the original strict attempt; use a new frozen run.');
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    const result =
      strategy === 'strict'
        ? await generateBrowserApp({ brief: task.brief, filename, oneShot: true })
        : await generateBrowserProject({ brief: task.brief, directory });
    await fs.writeFile(`${target}/generation-result.json`, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
  } else {
    const source = await fs.readFile(`${target}/index.html`),
      before = hash(source);
    const result = await verifyCreationTask({ filename, task: task.id });
    if (before !== hash(await fs.readFile(`${target}/index.html`)))
      throw new Error('Evaluated source changed.');
    const hashes = {};
    for (const name of await fs.readdir(target))
      if (/\.(html|js)$/.test(name)) hashes[name] = hash(await fs.readFile(`${target}/${name}`));
    await fs.writeFile(
      `${target}/${reassess ? 'verification-reassessed.json' : 'verification.json'}`,
      JSON.stringify(
        {
          ...result,
          strategy,
          hashes,
          briefSha256: hash(task.brief),
          oracleFeedbackRepairs: 0,
          ...(reassess
            ? {
                oracleCorrection:
                  'Original HTML unchanged; corrected default-camera no-op assumption, accepted attached step arrays, and report deprecation/driver warnings separately from rendering failures. Original frozen oracle and report retained.',
                oracleSha256: hash(await fs.readFile('server/quality/holdout-three.js')),
              }
            : {}),
        },
        null,
        2,
      ),
    );
    console.log(
      JSON.stringify({
        task: task.id,
        strategy,
        passed: result.passed,
        count: result.passedChecks,
        total: result.totalChecks,
        failures: result.checks.filter((c) => !c.passed),
        screenshots: result.screenshots,
      }),
    );
  }
} catch (error) {
  if (resultDirectory) {
    await fs.mkdir(resultDirectory, { recursive: true });
    await fs.writeFile(
      resultDirectory + '/last-error.json',
      JSON.stringify({ mode, error: error.message, checkedAt: new Date().toISOString() }, null, 2),
    );
  }
  console.error(error.message);
  process.exit(1);
}
process.exit(0);
