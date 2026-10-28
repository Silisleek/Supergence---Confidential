// Read-only: evaluates Supergence's actual factory with neutral test materials.
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as T from 'three';
import { generateCity } from '../../workspace/supergence/projects/meridian-harbor-20261024-845b8f71/src/data/generateCity.js';
import { buildBuildings } from '../../workspace/supergence/projects/meridian-harbor-20261024-845b8f71/src/scene/buildings.js';
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
const root = buildBuildings(city, materials);
root.updateMatrixWorld(true);
const oversized = [],
  orientationMismatch = [],
  missing = [],
  usage = Object.fromEntries(Object.keys(materials).map((k) => [k, 0]));
let meshNodes = 0,
  instancedCopies = 0;
root.traverse((o) => {
  if (o.isMesh) {
    meshNodes++;
    for (const [name, m] of Object.entries(materials)) if (o.material === m) usage[name]++;
  }
  if (o.isInstancedMesh) instancedCopies += o.count;
});
for (const record of city.buildings) {
  const object = root.getObjectByName(record.id);
  if (!object) {
    missing.push(record.id);
    continue;
  }
  const bounds = new T.Box3().setFromObject(object, true),
    size = bounds.getSize(new T.Vector3());
  const c = Math.abs(Math.cos(record.rot)),
    s = Math.abs(Math.sin(record.rot));
  const planned = [record.w * c + record.d * s, record.w * s + record.d * c];
  if (size.x > planned[0] + 3 || size.z > planned[1] + 3)
    oversized.push({ id: record.id, family: record.family, planned, actual: [size.x, size.z] });
  const actual = object.localToWorld(new T.Vector3(record.w / 2, 0, 0));
  const expected = new T.Vector3(
    record.x + (record.w / 2) * Math.cos(record.rot),
    0,
    record.z + (record.w / 2) * Math.sin(record.rot),
  );
  if (actual.distanceTo(expected) > 1e-5) orientationMismatch.push(record.id);
}
const file =
  'workspace/supergence/projects/meridian-harbor-20261024-845b8f71/src/scene/buildings.js';
const report = {
  checkedAt: new Date().toISOString(),
  scope:
    'Independent in-memory inspection of actual building geometry. Neutral test materials track palette identity; no project files or assets are generated/edited.',
  sourceSha256: createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex'),
  buildings: city.buildings.length,
  actualBuildingRoots: root.children.length,
  missing,
  meshNodes,
  instancedCopies,
  oversizedFootprints: oversized.length,
  orientationMismatches: orientationMismatch.length,
  oversized: oversized.slice(0, 20),
  paletteUsage: usage,
};
await fs.writeFile(
  'workspace/supergence/city-evaluation-20261024/building-audit-current.json',
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report));
