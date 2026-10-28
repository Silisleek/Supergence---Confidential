import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { inspectSceneGeometry } from '../../server/services/sceneGeometryInspection.js';

test('real mesh attribute inspection catches invalid UVs/normals and missing mapped channels', () => {
  const scene = new THREE.Scene();
  const geometry = new THREE.BoxGeometry(2, 3, 4);
  const material = new THREE.MeshStandardMaterial({ map: new THREE.Texture() });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'actual-fixture';
  scene.add(mesh);
  const root = { first: { scene }, duplicate: { scene } };
  const good = inspectSceneGeometry(root);
  assert.equal(good.passed, true);
  assert.equal(good.scenes, 1);
  assert.equal(good.meshes, 1);
  geometry.attributes.uv.array[0] = NaN;
  geometry.attributes.normal.array[0] = Infinity;
  const bad = inspectSceneGeometry(root);
  assert.equal(bad.passed, false);
  assert.equal(bad.invalidValues, 2);
  assert.deepEqual(bad.violations.map((v) => v.attribute).sort(), ['normal', 'uv']);
  geometry.deleteAttribute('uv');
  assert.equal(inspectSceneGeometry(root).missingUVs, 1);
  geometry.dispose();
  material.map.dispose();
  material.dispose();
});
test('an unexposed scene stays unavailable and never becomes invented verification', () => {
  const root = {};
  Object.defineProperty(root, 'hidden', {
    get() {
      throw new Error('Host getter must not run');
    },
  });
  const report = inspectSceneGeometry(root);
  assert.equal(report.available, false);
  assert.equal(report.passed, null);
  assert.equal(report.meshes, 0);
});

test('GPU-only attributes remain unverified rather than becoming false failures or invented passes', () => {
  const scene = new THREE.Scene(),
    geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.GLBufferAttribute({}, 5126, 3, 4, 3));
  const material = new THREE.MeshBasicMaterial();
  scene.add(new THREE.Mesh(geometry, material));
  const report = inspectSceneGeometry({ project: { scene } });
  assert.equal(report.available, true);
  assert.equal(report.passed, null);
  assert.equal(report.unavailableAttributes, 1);
  assert.equal(report.invalidValues, 0);
  geometry.dispose();
  material.dispose();
});
