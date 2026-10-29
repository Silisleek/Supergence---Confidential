import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

test('configured data and workspace paths are used by core memory and systems', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-storage-paths-'));
  const data = path.join(root, 'data');
  const workspace = path.join(root, 'workspace');
  const imports = [
    '../../server/memory/short-term.js',
    '../../server/improvement/user-focus-tracker.js',
    '../../server/systems/manager.js',
    '../../server/github/manager.js',
    '../../server/rsi/clade-archive.js',
    '../../server/improvement/bootstrapper.js',
    '../../server/improvement/meta-prompt-optimizer.js',
    '../../server/improvement/exemplar-bank.js',
    '../../server/orchestrator/subconscious.js',
    '../../server/improvement/autonomous-learner.js',
    '../../server/improvement/mistake-learning-engine.js',
  ].map((p) => new URL(p, import.meta.url).href);
  try {
    const program = `const [memory, focus, systems, github, clade, bootstrap, directives, exemplars, subconscious, learner] = await Promise.all(${JSON.stringify(imports)}.map(p => import(p))); console.log('RESULT '+JSON.stringify({memory:memory.default.storagePath,profile:focus.default.profilePath,conversations:focus.default.conversationsDir,skills:focus.default.learnedSkillsDir,system:systems.default.getActiveSystem().paths,github:github.default.workspaceDir,clade:clade.default.filePath,bootstrap:bootstrap.default.filePath,directives:directives.default.filePath,exemplars:exemplars.default.filePath,subconscious:subconscious.default.filePath,learner:learner.default.stateFilePath})); process.exit(0);`;
    const { stdout } = await promisify(execFile)(
      process.execPath,
      ['--input-type=module', '-e', program],
      {
        env: { ...process.env, SIS_DATA_DIR: data, SIS_WORKSPACE_DIR: workspace },
        timeout: 60000,
      },
    );
    const value = JSON.parse(stdout.match(/^RESULT (.+)$/m)[1]);
    assert.equal(value.memory, path.join(data, 'memory', 'short-term.json'));
    assert.equal(value.profile, path.join(data, 'improvement', 'user-focus-profile.json'));
    assert.equal(value.conversations, path.join(data, 'conversations'));
    assert.equal(value.skills, path.join(data, 'skills', 'learned'));
    assert.equal(value.system.workspaceDir, workspace);
    assert.equal(value.system.convDir, path.join(data, 'conversations'));
    assert.equal(value.github, workspace);
    assert.equal(value.clade, path.join(data, 'rsi', 'clade-archive.json'));
    assert.equal(value.bootstrap, path.join(data, 'improvement', 'bootstrapper-state.json'));
    assert.equal(value.directives, path.join(data, 'improvement', 'evolved-directives.json'));
    assert.equal(value.exemplars, path.join(data, 'improvement', 'exemplar-bank.json'));
    assert.equal(value.subconscious, path.join(data, 'improvement', 'subconscious-latent-matrix.json'));
    assert.equal(value.learner, path.join(data, 'improvement', 'autonomous-learning.json'));
    assert.equal((await fs.stat(path.join(data, 'memory', 'mistakes-ledger.json'))).isFile(), true);
    assert.equal((await fs.stat(path.join(workspace, 'theories'))).isDirectory(), true);
  } finally {
    const relative = path.relative(os.tmpdir(), root);
    assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
    await fs.rm(root, { recursive: true, force: true });
  }
});
