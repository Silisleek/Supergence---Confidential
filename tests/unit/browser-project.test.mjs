import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import workspace from '../../server/workspace/manager.js';
import {
  validateProjectModule,
  validateProjectPlan,
  generateBrowserProject,
} from '../../server/services/browserProjectBuilder.js';
test('module contracts reject full applications and wrong exports before browser initialization', async () => {
  await assert.rejects(
    validateProjectModule('const scene={};requestAnimationFrame(()=>{});', 'materials.js'),
    /must export createMaterials/,
  );
  await assert.rejects(
    validateProjectModule('export function createAssets(){}', 'materials.js'),
    /must export createMaterials/,
  );
  await assert.rejects(validateProjectModule('export function createMaterials( {', 'materials.js'));
  assert.equal(
    await validateProjectModule(
      'export function createMaterials(THREE){return {wood:new THREE.MeshStandardMaterial()};}',
      'materials.js',
    ),
    true,
  );
});
test('project plans reject ambiguous APIs and generation preserves existing directories without calling a provider', async () => {
  const plan = {
    title: 'Test',
    materials: [{ name: 'wood' }, { name: 'glass' }, { name: 'stone' }],
    factories: [{ name: 'makeDesk' }, { name: 'makeWall' }],
  };
  assert.equal(validateProjectPlan(plan), plan);
  assert.throws(
    () => validateProjectPlan({ ...plan, factories: [{ name: 'makeWall' }, { name: 'makeWall' }] }),
    /unique safe/,
  );
  assert.throws(
    () =>
      validateProjectPlan({ ...plan, factories: [{ name: 'constructor' }, { name: 'makeWall' }] }),
    /unique safe/,
  );
  const original = workspace.root,
    temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-project-'));
  workspace.setWorkspaceDir(temporary);
  try {
    await fs.mkdir(path.join(temporary, 'owned'));
    await fs.writeFile(path.join(temporary, 'owned', 'index.html'), 'User content');
    await assert.rejects(
      generateBrowserProject({ brief: 'Create a 3D room', directory: 'owned' }),
      /existing files are preserved/,
    );
    assert.equal(
      await fs.readFile(path.join(temporary, 'owned', 'index.html'), 'utf8'),
      'User content',
    );
    await assert.rejects(
      generateBrowserProject({ brief: 'Create a 3D room', directory: '../outside' }),
      /workspace-relative/,
    );
  } finally {
    workspace.setWorkspaceDir(original);
    await fs.rm(temporary, { recursive: true, force: true });
  }
});
