// Independent, read-only inspection. This never writes Supergence's project.
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const project = path.resolve(
  process.argv[2] || 'workspace/supergence/projects/meridian-harbor-20261024-845b8f71',
);
const source = path.join(project, 'src/data/generateCity.js');
const { generateCity } = await import(pathToFileURL(source));
const city = generateCity();
const rect = (x, z, w, d, angle = 0) =>
  [
    [-w / 2, -d / 2],
    [w / 2, -d / 2],
    [w / 2, d / 2],
    [-w / 2, d / 2],
  ].map(([a, b]) => [
    x + a * Math.cos(angle) - b * Math.sin(angle),
    z + a * Math.sin(angle) + b * Math.cos(angle),
  ]);
const overlaps = (a, b) => {
  for (const p of [a, b])
    for (let i = 0; i < p.length; i++) {
      const q = p[(i + 1) % p.length],
        axis = [-(q[1] - p[i][1]), q[0] - p[i][0]];
      const aa = a.map((v) => v[0] * axis[0] + v[1] * axis[1]),
        bb = b.map((v) => v[0] * axis[0] + v[1] * axis[1]);
      if (Math.max(...aa) <= Math.min(...bb) + 1e-7 || Math.max(...bb) <= Math.min(...aa) + 1e-7)
        return false;
    }
  return true;
};
const segments = city.streets.flatMap((s) =>
  s.pts.slice(1).map((b, i) => {
    const a = s.pts[i],
      dx = b[0] - a[0],
      dz = b[1] - a[1];
    return {
      name: s.name,
      width: s.width,
      a,
      b,
      polygon: rect(
        (a[0] + b[0]) / 2,
        (a[1] + b[1]) / 2,
        Math.hypot(dx, dz),
        s.width,
        Math.atan2(dz, dx),
      ),
    };
  }),
);
const distance = (p, s) => {
  const dx = s.b[0] - s.a[0],
    dz = s.b[1] - s.a[1],
    t = Math.max(
      0,
      Math.min(1, ((p[0] - s.a[0]) * dx + (p[1] - s.a[1]) * dz) / (dx * dx + dz * dz)),
    );
  return Math.hypot(p[0] - s.a[0] - t * dx, p[1] - s.a[1] - t * dz);
};
// Every polyline segment is a graph edge; intersections and collinear contacts
// join their components. This checks the generated street network, not traffic AI.
const component = segments.map((_, i) => i);
const rootOf = (i) => (component[i] === i ? i : (component[i] = rootOf(component[i])));
const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
for (let i = 0; i < segments.length; i++)
  for (let j = 0; j < i; j++) {
    const a = segments[i],
      b = segments[j];
    const near =
      Math.min(distance(a.a, b), distance(a.b, b), distance(b.a, a), distance(b.b, a)) < 0.05;
    const crosses =
      cross(a.a, a.b, b.a) * cross(a.a, a.b, b.b) < 0 &&
      cross(b.a, b.b, a.a) * cross(b.a, b.b, a.b) < 0;
    if (near || crosses) component[rootOf(i)] = rootOf(j);
  }
const streetComponents = new Set(segments.map((_, i) => rootOf(i))).size;
const inWater = ([x, z]) => {
  const r = city.river,
    h = city.harbor;
  return (
    (z >= r.z0 && z <= r.z1 && Math.abs(x - r.cx(z)) <= r.width / 2) ||
    (x > h.x0 && x < h.x1 && z > h.z0 && z < h.z1)
  );
};
const footprints = city.buildings.map((b) => ({ b, polygon: rect(b.x, b.z, b.w, b.d, b.rot) }));
const unsupportedRoadWater = [];
const unsupportedRoadEdges = [];
for (const segment of segments) {
  const length = Math.hypot(segment.b[0] - segment.a[0], segment.b[1] - segment.a[1]);
  let bad = 0;
  let badEdges = 0;
  for (let t = 0; t <= length; t += 2) {
    const p = [
      segment.a[0] + ((segment.b[0] - segment.a[0]) * t) / length,
      segment.a[1] + ((segment.b[1] - segment.a[1]) * t) / length,
    ];
    const supported = city.bridges.some(
      (b) => p[0] >= b.x0 && p[0] <= b.x1 && Math.abs(p[1] - b.z) <= b.width / 2,
    );
    if (inWater(p) && !supported) bad++;
    for (const side of [-1, 1]) {
      const q = [
        p[0] - ((((segment.b[1] - segment.a[1]) / length) * segment.width) / 2) * side,
        p[1] + ((((segment.b[0] - segment.a[0]) / length) * segment.width) / 2) * side,
      ];
      const deck = city.bridges.some(
        (b) =>
          q[0] >= b.x0 - 0.05 && q[0] <= b.x1 + 0.05 && Math.abs(q[1] - b.z) <= b.width / 2 + 0.05,
      );
      if (inWater(q) && !deck) badEdges++;
    }
  }
  if (bad) unsupportedRoadWater.push({ street: segment.name, sampleCount: bad });
  if (badEdges) unsupportedRoadEdges.push({ street: segment.name, sampleCount: badEdges });
}
const roadConflicts = footprints.flatMap(({ b, polygon }) =>
  segments
    .filter((s) => overlaps(polygon, s.polygon))
    .map((s) => ({ building: b.id, road: s.name })),
);
const waterConflicts = footprints.filter(({ polygon }) => polygon.some(inWater)).map((x) => x.b.id);
const buildingConflicts = [];
for (let i = 0; i < footprints.length; i++)
  for (let j = i + 1; j < footprints.length; j++)
    if (overlaps(footprints[i].polygon, footprints[j].polygon))
      buildingConflicts.push([footprints[i].b.id, footprints[j].b.id]);
const treesInsideBuildings = city.trees.filter((t) =>
  footprints.some(({ b }) => {
    const dx = t.x - b.x,
      dz = t.z - b.z,
      c = Math.cos(-b.rot),
      s = Math.sin(-b.rot);
    return Math.abs(dx * c - dz * s) < b.w / 2 && Math.abs(dx * s + dz * c) < b.d / 2;
  }),
);
const bridgeApproaches = city.bridges.map((b) => ({
  name: b.name,
  endpointDistancesToRoadCentreline: [b.x0, b.x1].map((x) =>
    Math.min(...segments.map((s) => distance([x, b.z], s))),
  ),
}));
const courtyardConflicts = city.buildings
  .filter((b) => Math.hypot(b.x - city.courtyard.x, b.z - city.courtyard.z) < city.courtyard.r)
  .map((b) => b.id);
const report = {
  checkedAt: new Date().toISOString(),
  scope:
    'Independent geometric inspection of Supergence-generated data in memory; no city files/assets generated or edited by this evaluator.',
  sourceSha256: createHash('sha256')
    .update(await fs.readFile(source))
    .digest('hex'),
  actualCounts: {
    buildings: city.buildings.length,
    districts: city.districts.length,
    trees: city.trees.length,
    streets: city.streets.length,
    bridges: city.bridges.length,
  },
  dimensions: city.dimensions,
  streetNetwork: {
    segments: segments.length,
    connectedComponents: streetComponents,
    method: 'Actual centerline intersections and collinear endpoint contacts, tolerance0.05m.',
  },
  conflicts: {
    buildingRoadPairs: roadConflicts.length,
    buildingWater: waterConflicts.length,
    buildingPairs: buildingConflicts.length,
    treesInsideBuildings: treesInsideBuildings.length,
    courtyardBuildingCenters: courtyardConflicts.length,
    roadSegmentsInWaterWithoutBridge: unsupportedRoadWater.length,
    roadEdgesInWaterWithoutBridge: unsupportedRoadEdges.length,
  },
  samples: {
    roadConflicts: roadConflicts.slice(0, 20),
    waterConflicts: waterConflicts.slice(0, 20),
    buildingConflicts: buildingConflicts.slice(0, 20),
    courtyardConflicts: courtyardConflicts.slice(0, 20),
    unsupportedRoadWater,
    unsupportedRoadEdges,
  },
  bridgeApproaches,
  districts: city.districts.map((d) => ({
    id: d.id,
    name: d.name,
    buildings: city.buildings.filter((b) => b.district === d.id).length,
  })),
};
const output = process.argv[3] || 'workspace/supergence/city-evaluation-20261024/data-audit.json';
await fs.writeFile(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
