import * as T from 'three';
import { generateCity } from '../../workspace/supergence/projects/meridian-harbor-20261024-845b8f71/src/data/generateCity.js';
import { buildRoads } from '../../workspace/supergence/projects/meridian-harbor-20261024-845b8f71/src/scene/roads.js';
import fs from 'node:fs/promises';
const m = Object.fromEntries(
  ['asphalt', 'marking', 'concrete'].map((name) => [name, new T.MeshStandardMaterial({ name })]),
);
const root = buildRoads(generateCity(), m),
  road = root.getObjectByName('road-surface');
const n = road.geometry.attributes.normal;
let up = 0,
  down = 0;
for (let i = 0; i < n.count; i++) {
  if (n.getY(i) > 0.5) up++;
  if (n.getY(i) < -0.5) down++;
}
const result = {
  scope: 'Read-only actual road factory geometry/material probe',
  roadVertices: n.count,
  up,
  down,
  uvCount: road.geometry.attributes.uv?.count,
  material: road.material.name,
};
await fs.writeFile(
  'workspace/supergence/city-evaluation-20261024/road-normal-audit.json',
  JSON.stringify(result, null, 2),
);
console.log(result);
