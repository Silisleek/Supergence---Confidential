import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { bindCreationControls } from '../../server/services/browserArtifactBuilder.js';
import { inspectGeneratedGame } from '../../server/3d/split-game-generator.js';
import { verifyCreationTask } from '../../server/services/creationTaskVerifier.js';
const base = process.env.SIS_BASE_URL;
if (!base) throw new Error('Set actual SIS_BASE_URL.');
process.env.ACTIVE_SERVER_PORT = new URL(base).port;
const hash = (b) => createHash('sha256').update(b).digest('hex');
try {
  for (const [parent, task] of [
    ['3d-depth-20261023/courtyard-museum/first-attempt', 'courtyard-museum'],
    ['holdout-20261024/canal-rescue/strict', 'canal-rescue'],
  ]) {
    const receipt = JSON.parse(
      await fs.readFile(
        `workspace/supergence/benchmarks/${parent}/index.generation-1.json`,
        'utf8',
      ),
    );
    const checked = inspectGeneratedGame(receipt.content);
    if (!checked.valid) throw new Error(checked.error);
    const result = bindCreationControls(checked.html),
      folder = `supergence/benchmarks/compiler-replay/${task}`;
    await fs.mkdir('workspace/' + folder, { recursive: true });
    await fs.writeFile(`workspace/${folder}/index.html`, result.html, { flag: 'wx' });
    const provenance = {
      parent,
      sourceReceiptSha256: hash(JSON.stringify(receipt)),
      generatedSourceSha256: hash(receipt.content),
      compiledHtmlSha256: hash(result.html),
      additionalModelCalls: 0,
      bindings: result.bindings,
      scope:
        'Replay of preserved one-call model output through the new generic DOM-control binder. No model-source logic repairs. This is a post-development compiler replay, not a fresh held-out generation.',
    };
    await fs.writeFile(`workspace/${folder}/provenance.json`, JSON.stringify(provenance, null, 2));
    const report = await verifyCreationTask({ filename: folder + '/index.html', task });
    await fs.writeFile(
      `workspace/${folder}/verification.json`,
      JSON.stringify({ ...report, provenance }, null, 2),
    );
    console.log(
      JSON.stringify({
        task,
        passed: report.passed,
        count: report.passedChecks,
        total: report.totalChecks,
        failures: report.checks.filter((c) => !c.passed),
      }),
    );
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
process.exit(0);
