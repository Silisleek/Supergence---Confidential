// Independent rigid-transform invariants for native house geometry/attributes.
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = path.resolve(process.argv[2]);
const core = await import(pathToFileURL(path.join(root, 'src/core/engine.js')));
const factories = await import(pathToFileURL(path.join(root, 'src/city/buildings.js')));
const cx = 123.25,
  cz = -187.5;
const emit = (factory, ry) => {
  const batch = new core.Batcher(),
    records = [];
  const capture = (mat, g) =>
    records.push({
      mat,
      position: g.attributes.position.array.slice(),
      normal: g.attributes.normal?.array.slice(),
      uv: g.attributes.uv?.array.slice(),
    });
  batch._push = capture;
  factory(batch, { colliders: new core.Colliders() }, cx, cz, 11, 16, 4242, { ry });
  return { records, restored: batch._push === capture };
};
const report = {
  scope:
    'Native building geometry must undergo one rigid transform; no city source/assets authored by this checker.',
  checks: [],
  passed: false,
};
for (const name of ['canalHouse', 'shophouse']) {
  const base = emit(factories[name], 0);
  for (const angle of [Math.PI / 2, -Math.PI / 2, Math.PI]) {
    const actual = emit(factories[name], angle),
      c = Math.cos(angle),
      s = Math.sin(angle);
    let positionError = 0,
      normalError = 0,
      uvError = 0;
    const shapeMatches =
      actual.records.length === base.records.length &&
      actual.records.every(
        (r, i) =>
          r.mat === base.records[i].mat && r.position.length === base.records[i].position.length,
      );
    if (shapeMatches)
      for (let j = 0; j < base.records.length; j++) {
        const a = base.records[j],
          b = actual.records[j];
        for (let i = 0; i < a.position.length; i += 3) {
          const dx = a.position[i] - cx,
            dz = a.position[i + 2] - cz;
          positionError = Math.max(
            positionError,
            Math.abs(b.position[i] - (cx + dx * c + dz * s)),
            Math.abs(b.position[i + 1] - a.position[i + 1]),
            Math.abs(b.position[i + 2] - (cz - dx * s + dz * c)),
          );
        }
        if (a.normal && b.normal)
          for (let i = 0; i < a.normal.length; i += 3)
            normalError = Math.max(
              normalError,
              Math.abs(b.normal[i] - (a.normal[i] * c + a.normal[i + 2] * s)),
              Math.abs(b.normal[i + 1] - a.normal[i + 1]),
              Math.abs(b.normal[i + 2] - (-a.normal[i] * s + a.normal[i + 2] * c)),
            );
        if (a.uv && b.uv)
          for (let i = 0; i < a.uv.length; i++)
            uvError = Math.max(uvError, Math.abs(a.uv[i] - b.uv[i]));
      }
    report.checks.push({
      factory: name,
      angle,
      primitives: actual.records.length,
      shapeMatches,
      positionError,
      normalError,
      uvError,
      hookRestored: actual.restored,
      passed:
        shapeMatches &&
        actual.restored &&
        positionError < 0.001 &&
        normalError < 0.001 &&
        uvError < 0.000001,
    });
  }
}
report.passed = report.checks.every((c) => c.passed);
await fs.writeFile(
  'test-results/project-workflow/placement-oracle.json',
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report));
if (!report.passed) process.exitCode = 1;
