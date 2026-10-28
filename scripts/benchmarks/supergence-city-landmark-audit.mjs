// Read-only actual factory/geometry checks; no authored city implementation.
import * as T from 'three';
import fs from 'node:fs/promises';
import { generateCity } from '../../workspace/supergence/projects/meridian-harbor-20261024-845b8f71/src/data/generateCity.js';
import { buildBuildings } from '../../workspace/supergence/projects/meridian-harbor-20261024-845b8f71/src/scene/buildings.js';
import { buildLandmarks } from '../../workspace/supergence/projects/meridian-harbor-20261024-845b8f71/src/scene/landmarks.js';
const city = generateCity();
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
  ].map((name) => [name, new T.MeshStandardMaterial({ name })]),
);
const buildings = buildBuildings(city, materials);
buildings.updateMatrixWorld(true);
const boxes = buildings.children.map((o) => ({
  id: o.name,
  box: new T.Box3().setFromObject(o, true),
}));
const result = {
  scope:
    'Read-only actual landmark geometry bounds versus actual building envelopes. AABB overlap is a conservative envelope check.',
  landmarks: [],
};
for (const L of city.landmarks) {
  const root = buildLandmarks({ ...city, landmarks: [L], courtyard: null }, materials);
  root.updateMatrixWorld(true);
  const box = new T.Box3().setFromObject(root, true);
  let meshes = 0;
  root.traverse((o) => {
    if (o.isMesh) meshes++;
  });
  const collisions = boxes
    .filter(
      (b) =>
        b.box.max.x > box.min.x &&
        b.box.min.x < box.max.x &&
        b.box.max.z > box.min.z &&
        b.box.min.z < box.max.z,
    )
    .map((b) => b.id);
  result.landmarks.push({
    id: L.id,
    kind: L.kind,
    meshCount: meshes,
    box: { min: box.min.toArray(), max: box.max.toArray() },
    buildingEnvelopeOverlaps: collisions,
  });
}
await fs.writeFile(process.argv[2], JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
