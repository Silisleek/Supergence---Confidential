import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ReverseEngineeringService } from '../../server/services/reverseEngineeringService.js';

async function fixture(t, options = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-rea-'));
  t.after(() => fs.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }));
  const artifact = path.join(root, 'workspace', 'example');
  await fs.mkdir(artifact, { recursive: true });
  await fs.writeFile(
    path.join(artifact, 'package.json'),
    JSON.stringify({
      name: 'artifact-fixture',
      version: '1.0.0',
      type: 'module',
      main: 'bundle.js',
    }),
  );
  await fs.writeFile(
    path.join(artifact, 'bundle.js'),
    `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(path.join(root, 'TARGET_EXECUTED'))}, 'bad'); export function normalize(value) { return Number.isFinite(value) ? Math.max(0, value) : null; }`,
  );
  const service = new ReverseEngineeringService({ workspaceRoot: root, ...options });
  return { root, artifact, service };
}

test('REA accepts only specific workspace artifacts and supported kinds', async (t) => {
  const { root, service } = await fixture(t);
  await assert.rejects(service.analyze({ path: root }), { code: 'OUTSIDE_WORKSPACE' });
  await assert.rejects(service.analyze({ path: 'workspace' }), { code: 'OUTSIDE_WORKSPACE' });
  await assert.rejects(service.analyze({ path: 'workspace/example', kind: 'shell' }), {
    code: 'UNSUPPORTED_KIND',
  });
  await assert.rejects(service.analyze({ path: 'workspace/example/bundle.js', kind: 'asar' }), {
    code: 'INVALID_ARTIFACT',
  });
  assert.equal(service.active, false);
});

test('REA inventories stable source digests and rejects oversized inputs', async (t) => {
  const { artifact, service } = await fixture(t, { maxFiles: 2 });
  const first = await service.inventory('workspace/example', 'javascript-tree');
  const second = await service.inventory('workspace/example', 'javascript-tree');
  assert.equal(first.sha256, second.sha256);
  await fs.appendFile(path.join(artifact, 'bundle.js'), '\nexport const revision = 2;');
  const changed = await service.inventory('workspace/example', 'javascript-tree');
  assert.notEqual(changed.sha256, first.sha256);
  await fs.writeFile(path.join(artifact, 'extra.js'), 'export const extra = true;');
  await assert.rejects(service.inventory('workspace/example', 'javascript-tree'), {
    code: 'INPUT_LIMIT',
  });
});

test('REA rejects symlinks even when the target lies within the allowed workspace', async (t) => {
  const { artifact, service } = await fixture(t);
  try {
    await fs.symlink(path.join(artifact, 'bundle.js'), path.join(artifact, 'linked.js'));
  } catch (error) {
    if (error.code === 'EPERM') return t.skip('Windows account cannot create file symlinks.');
    throw error;
  }
  await assert.rejects(service.inventory('workspace/example', 'javascript-tree'), {
    code: 'SYMLINK',
  });
});

test('REA process transport rejects malformed JSON, excess output and timeouts', async (t) => {
  const { root, artifact, service } = await fixture(t, { maxOutputBytes: 128, timeoutMs: 1500 });
  const malformed = path.join(root, 'malformed.mjs');
  await fs.writeFile(malformed, "process.stdout.write('not json');");
  await assert.rejects(service.run(malformed, artifact, 'javascript-tree'), {
    code: 'INVALID_EVIDENCE',
  });
  const noisy = path.join(root, 'noisy.mjs');
  await fs.writeFile(noisy, "process.stdout.write('x'.repeat(1000));");
  await assert.rejects(service.run(noisy, artifact, 'javascript-tree'), { code: 'OUTPUT_LIMIT' });
  const slow = path.join(root, 'slow.mjs');
  await fs.writeFile(slow, 'setInterval(() => {}, 10000);');
  await assert.rejects(service.run(slow, artifact, 'javascript-tree'), { code: 'TIMEOUT' });
});

test(
  'installed pinned REA analyzes an inert artifact and reuses exact evidence',
  { timeout: 90000 },
  async (t) => {
    const { root, service } = await fixture(t);
    const status = await service.status();
    if (!status.available) return t.skip('rea-agents@6.5.0 is not installed locally.');
    assert.equal(status.version, '6.5.0');
    const result = await service.analyze({ path: 'workspace/example', kind: 'javascript-tree' });
    assert.match(result.evidenceId, /^ev_[a-f0-9]{64}$/);
    assert.equal(result.targetExecuted, false);
    assert.equal(result.modelWeightsUpdated, false);
    assert.equal(result.reused, false);
    assert.equal(result.statistics.parsed_javascript_files, 1);
    assert.ok(
      result.observations.some(
        (observation) => observation.properties?.exported_name === 'normalize',
      ),
    );
    assert.ok(
      result.limitations.some((limitation) => /never executed|inert text/.test(limitation)),
    );
    await assert.rejects(fs.access(path.join(root, 'TARGET_EXECUTED')), { code: 'ENOENT' });
    const cached = await service.analyze({ path: 'workspace/example' });
    assert.equal(cached.reused, true);
    assert.equal(cached.evidenceId, result.evidenceId);
    assert.equal(cached.source.sha256, result.source.sha256);
    assert.equal(service.active, false);
  },
);
