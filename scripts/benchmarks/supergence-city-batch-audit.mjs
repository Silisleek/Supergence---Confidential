// Read-only in-memory geometry audit. All factories are Supergence's saved source.
import * as THREE from 'three';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [project, output] = process.argv.slice(2);
const load = (file) => import(pathToFileURL(path.resolve(project, file)));
const { generateCity } = await load('src/data/generateCity.js');
const { batchStaticWorld } = await load('src/scene/batch.js');
const materials = Object.fromEntries(
  [
    'asphalt',
    'brick',
    'stone',
    'concrete',
    'metal',
    'glass',
    'water',
    'wood',
    'foliage',
    'ground',
    'marking',
    'roof',
    'windowLight',
    'lampLight',
  ].map((name) => [name, new THREE.MeshStandardMaterial({ name })]),
);
const root = new THREE.Group();
const city = generateCity();
for (const [file, fn] of [
  ['buildings', 'buildBuildings'],
  ['roads', 'buildRoads'],
  ['water', 'buildWater'],
  ['bridges', 'buildBridges'],
  ['props', 'buildProps'],
  ['landmarks', 'buildLandmarks'],
])
  root.add((await load('src/scene/' + file + '.js'))[fn](city, materials));
root.updateMatrixWorld(true);
const snapshot = () => {
  const box = new THREE.Box3().setFromObject(root, true);
  let meshes = 0,
    vertices = 0,
    instances = 0;
  const invalid = [];
  root.traverse((o) => {
    if (o.isMesh) {
      meshes++;
      vertices += (o.geometry.attributes.position?.count || 0) * (o.isInstancedMesh ? o.count : 1);
      if (o.isInstancedMesh) instances += o.count;
      const a = o.geometry.attributes.position?.array;
      if (a) {
        let nonfinite = 0,
          maxAbs = 0;
        for (const n of a) {
          if (!Number.isFinite(n)) nonfinite++;
          else maxAbs = Math.max(maxAbs, Math.abs(n));
        }
        if (nonfinite || maxAbs > 10000)
          invalid.push({ name: o.name, material: o.material?.name, nonfinite, maxAbs });
      }
    }
  });
  return {
    box: { min: box.min.toArray(), max: box.max.toArray() },
    meshes,
    vertices,
    instances,
    invalid,
  };
};
const before = snapshot();
const stats = batchStaticWorld(root);
root.updateMatrixWorld(true);
const after = snapshot();
const result = {
  scope:
    'Read-only in-memory evaluator with neutral materials; no visual quality claim or project writes.',
  before,
  after,
  stats,
};
await fs.writeFile(output, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
