// Independent evaluator: execute Supergence's existing geometry generators in
// memory. Does not write city source, a city build, models, or city assets.
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(process.argv[2]);
const output = path.resolve('test-results/project-workflow/geometry-oracle.json');
const load = (file) => import(pathToFileURL(path.join(root, file)));
const report = {
  scope:
    'Independent in-memory geometry checks of native Supergence source; no visual or full-project completion claim.',
  checkedAt: new Date().toISOString(),
  passed: false,
};
let batch, merged;
try {
  const core = await load('src/core/engine.js');
  const terrain = await load('src/city/terrain.js');
  const bridges = await load('src/city/bridges.js');
  const blocks = await load('src/city/blocks.js');
  const landmarks = await load('src/city/landmarks.js');
  const buildings = await load('src/city/buildings.js');
  const controls = await load('src/app/controls.js');
  const THREE = await import('three');
  batch = new core.Batcher();
  const colliders = new core.Colliders();
  batch.colliders = colliders;
  const context = { colliders };
  terrain.buildGround(batch);
  terrain.buildCanal(batch);
  bridges.buildBridges(batch);
  landmarks.buildLandmarks(batch, context);
  blocks.buildBlocks(batch, context, landmarks.landmarkReserves());
  let primitives = 0,
    vertices = 0,
    triangles = 0,
    invalidCoordinates = 0,
    invalidUVs = 0,
    invalidNormals = 0;
  const allBuckets = [...batch.buckets.values(), ...batch.tiles.values()];
  for (const geometries of allBuckets) {
    for (const geometry of geometries) {
      primitives++;
      const positions = geometry.attributes.position;
      vertices += positions.count;
      triangles += (geometry.index?.count ?? positions.count) / 3;
      for (const value of positions.array) if (!Number.isFinite(value)) invalidCoordinates++;
      for (const value of geometry.attributes.uv?.array || [])
        if (!Number.isFinite(value)) invalidUVs++;
      for (const value of geometry.attributes.normal?.array || [])
        if (!Number.isFinite(value)) invalidNormals++;
    }
  }
  const footprints = colliders.list.filter((c) => c.tag === 'building');
  const centers = new Set(
    footprints.map(
      (c) => `${((c.minX + c.maxX) / 2).toFixed(2)},${((c.minZ + c.maxZ) / 2).toFixed(2)}`,
    ),
  );
  const overlaps = (a, b) =>
    Math.min(a.maxX, b.x1) - Math.max(a.minX, b.x0) > 0.1 &&
    Math.min(a.maxZ, b.z1) - Math.max(a.minZ, b.z0) > 0.1;
  const waterIntersections = footprints.filter((c) =>
    [core.CANAL, core.BRANCH].some((w) => overlaps(c, w)),
  );
  report.geometry = {
    primitives,
    vertices,
    triangles,
    materialBuckets: batch.buckets.size + batch.tiles.size,
    invalidCoordinates,
    invalidUVs,
    invalidNormals,
  };
  report.nativeReportedBuildings = buildings.BUILDING_STATS;
  report.distinctBuildingColliderCenters = centers.size;
  report.buildingWaterIntersections = waterIntersections;
  report.bridgeProfiles = core.BRIDGES.map((bridge) => ({
    id: bridge.id,
    samples: Array.from({ length: 11 }, (_, i) => {
      const z = bridge.z0 + ((bridge.z3 - bridge.z0) * i) / 10;
      return {
        z,
        height: core.heightAt(bridge.cx, z),
        blocked: Boolean(colliders.blocked(bridge.cx, z, 0.35, core.heightAt(bridge.cx, z))),
      };
    }),
  }));
  // Temporary plain materials support ray testing only; every tested triangle
  // is produced by the native city's generators. No model/assets are saved.
  const materialKeys = new Set([
    ...batch.buckets.keys(),
    ...[...batch.tiles.keys()].map((key) => key.split('|')[1]),
  ]);
  const materials = Object.fromEntries(
    [...materialKeys].map((key) => [key, new THREE.MeshBasicMaterial()]),
  );
  merged = batch.build(materials);
  merged.updateMatrixWorld(true);
  const surfaces = merged.children.filter((mesh) =>
    /^batch-(?:\d+,\d+-)?(?:asphalt|concrete|stone\w*|paving|white)(?:-(?:struct|detail|far|near))?$/.test(
      mesh.name,
    ),
  );
  const ray = new THREE.Raycaster();
  report.bridgeContactGeometry = core.BRIDGES.map((bridge) => ({
    id: bridge.id,
    samples: [0.2, 0.4, 0.6, 0.8].map((fraction) => {
      const z = bridge.z0 + (bridge.z3 - bridge.z0) * fraction;
      ray.set(new THREE.Vector3(bridge.cx, 100, z), new THREE.Vector3(0, -1, 0));
      const hit = ray.intersectObjects(surfaces, false)[0];
      const foot = controls.Walker.prototype.groundAt(bridge.cx, z);
      return {
        z,
        controllerFoot: foot,
        actualSurface: hit?.point.y,
        gap: hit ? hit.point.y - foot : null,
      };
    }),
  }));
  report.passed =
    invalidCoordinates === 0 &&
    invalidUVs === 0 &&
    invalidNormals === 0 &&
    buildings.BUILDING_STATS.count >= 400 &&
    centers.size >= 400 &&
    !waterIntersections.length &&
    report.bridgeProfiles.every((b) =>
      b.samples.every((s) => Number.isFinite(s.height) && !s.blocked),
    ) &&
    report.bridgeContactGeometry.every((b) =>
      b.samples.every((s) => s.gap !== null && Math.abs(s.gap) < 0.18),
    );
} catch (error) {
  report.error = error.stack;
} finally {
  if (batch)
    for (const geometries of [...batch.buckets.values(), ...batch.tiles.values()])
      for (const geometry of geometries) geometry.dispose();
  if (merged)
    merged.traverse((object) => {
      object.geometry?.dispose();
      object.material?.dispose();
    });
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report));
if (!report.passed) process.exitCode = 1;
