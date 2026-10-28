import * as THREE from 'three';
import { mergeGeometries } from '/vendor/three/examples/jsm/utils/BufferGeometryUtils.js';

const positive = (value, name) => {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be positive.`);
  return value;
};
function meshBox(w, h, d, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** A wall in local XY, centred in X/Z, with its base at Y=0.
 * Opening x is its centre; y is its sill height. Missing cells are actual voids.
 */
export function createWallWithOpenings({
  width,
  height,
  thickness = 0.25,
  openings = [],
  material,
}) {
  positive(width, 'width');
  positive(height, 'height');
  positive(thickness, 'thickness');
  if (!Array.isArray(openings) || openings.length > 20)
    throw new Error('Use at most twenty openings per wall.');
  const cuts = openings.map(({ x = 0, y = 0, width: w, height: h }) => {
    positive(w, 'opening width');
    positive(h, 'opening height');
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      x - w / 2 < -width / 2 - 1e-6 ||
      x + w / 2 > width / 2 + 1e-6 ||
      y < 0 ||
      y + h > height + 1e-6
    )
      throw new Error('Opening lies outside the wall.');
    return { left: x - w / 2, right: x + w / 2, bottom: y, top: y + h };
  });
  const xs = [...new Set([-width / 2, width / 2, ...cuts.flatMap((c) => [c.left, c.right])])].sort(
    (a, b) => a - b,
  );
  const ys = [...new Set([0, height, ...cuts.flatMap((c) => [c.bottom, c.top])])].sort(
    (a, b) => a - b,
  );
  const group = new THREE.Group(),
    cells = [];
  for (let i = 1; i < xs.length; i++)
    for (let j = 1; j < ys.length; j++) {
      const x = (xs[i - 1] + xs[i]) / 2,
        y = (ys[j - 1] + ys[j]) / 2;
      if (
        cuts.some(
          (c) => x > c.left - 1e-8 && x < c.right + 1e-8 && y > c.bottom - 1e-8 && y < c.top + 1e-8,
        )
      )
        continue;
      if (xs[i] - xs[i - 1] > 1e-6 && ys[j] - ys[j - 1] > 1e-6)
        cells.push(
          new THREE.BoxGeometry(xs[i] - xs[i - 1], ys[j] - ys[j - 1], thickness).translate(x, y, 0),
        );
    }
  if (cells.length) {
    const geometry = mergeGeometries(cells, false),
      mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    cells.forEach((cell) => cell.dispose());
  }
  return group;
}

/** Reusable structural wing, not a scene: correctly based storeys, floor slabs,
 * fenestration and optional court-facing doors. Caller supplies all materials
 * and positions its returned structure/roof groups within the chosen design.
 */
export function createGalleryWing({
  width = 6,
  depth = 20,
  floors = 2,
  floorHeight = 3.2,
  entrySide = 'east',
  upperDoorZ = [-8, 0],
  wallMaterial,
  slabMaterial,
  glassMaterial,
  screenMaterial,
}) {
  if (
    width < 3 ||
    depth < 4 ||
    floorHeight < 2.4 ||
    ![width, depth, floorHeight].every(Number.isFinite)
  )
    throw new Error('Gallery dimensions are too small or invalid.');
  if (!Number.isInteger(floors) || floors < 1 || floors > 8)
    throw new Error('Gallery floors must be between one and eight.');
  if (!['east', 'west'].includes(entrySide))
    throw new Error('Gallery entrySide must be east or west.');
  const structure = new THREE.Group(),
    roof = new THREE.Group();
  const bays = Math.max(1, Math.round(depth / 4)),
    spacing = depth / bays;
  const centers = Array.from({ length: bays }, (_, i) => -depth / 2 + (i + 0.5) * spacing);
  const addGlazing = (wall, opening, index, level) => {
    if (opening.y === 0) return;
    wall.add(
      meshBox(
        opening.width,
        opening.height,
        0.035,
        glassMaterial,
        opening.x,
        opening.y + opening.height / 2,
        0,
      ),
    );
    if (screenMaterial && level > 0 && index % 2 === 0)
      for (let i = 0; i < 6; i++)
        wall.add(
          meshBox(
            0.065,
            opening.height + 0.12,
            0.16,
            screenMaterial,
            opening.x - opening.width / 2 + ((i + 0.5) * opening.width) / 6,
            opening.y + opening.height / 2,
            0.2,
          ),
        );
  };
  for (let level = 0; level < floors; level++) {
    const base = level * floorHeight,
      h = floorHeight - 0.22;
    structure.add(meshBox(width + 0.12, 0.24, depth + 0.12, slabMaterial, 0, base - 0.12, 0));
    for (const side of [-1, 1]) {
      const entry = side === (entrySide === 'east' ? 1 : -1);
      const openings = centers.map((z) => {
        const door =
          entry &&
          (level === 0
            ? Math.abs(z) < spacing * 0.6
            : upperDoorZ.some((d) => Math.abs(d - z) < spacing * 0.4));
        return {
          x: -z,
          y: door ? 0 : 0.55,
          width: door ? 1.4 : Math.min(2.7, spacing - 0.6),
          height: door ? Math.min(2.4, h) : Math.min(2.1, h - 0.7),
        };
      });
      const wall = createWallWithOpenings({
        width: depth,
        height: h,
        thickness: 0.28,
        openings,
        material: wallMaterial,
      });
      openings.forEach((o, i) => addGlazing(wall, o, i, level));
      wall.rotation.y = Math.PI / 2;
      wall.position.set((side * width) / 2, base, 0);
      structure.add(wall);
    }
    for (const side of [-1, 1]) {
      const opening =
        level === 0 && side === 1
          ? { x: 0, y: 0, width: 1.6, height: 2.4 }
          : { x: 0, y: 0.6, width: width - 1.6, height: Math.min(2, h - 0.75) };
      const wall = createWallWithOpenings({
        width,
        height: h,
        thickness: 0.28,
        openings: [opening],
        material: wallMaterial,
      });
      addGlazing(wall, opening, 1, level);
      wall.position.set(0, base, (side * depth) / 2);
      structure.add(wall);
    }
    // Exposed slab edge offers depth and a continuous architectural datum.
    structure.add(
      meshBox(width + 0.3, 0.12, depth + 0.3, slabMaterial, 0, base + floorHeight - 0.16, 0),
    );
  }
  roof.add(
    meshBox(width + 1.1, 0.26, depth + 1.1, slabMaterial, 0, floors * floorHeight + 0.13, 0),
  );
  if (screenMaterial)
    for (const side of [-1, 1])
      roof.add(
        meshBox(
          0.12,
          0.18,
          depth + 0.9,
          screenMaterial,
          side * (width / 2 + 0.4),
          floors * floorHeight - 0.03,
          0,
        ),
      );
  return { structure, roof };
}

/** U-return stair: lower flight advances +Z, upper flight returns -Z.
 * Y=0 ground, Y=rise upper floor. Caller positions the whole group.
 */
export function createReturnStair({
  rise = 3.2,
  width = 1.4,
  tread = 0.28,
  steps = 18,
  landing = 1.4,
  gap = 0.2,
  material,
  railMaterial = material,
}) {
  [rise, width, tread, landing].forEach((v, i) =>
    positive(v, ['rise', 'width', 'tread', 'landing'][i]),
  );
  if (!Number.isInteger(steps) || steps < 12 || steps > 48 || steps % 2)
    throw new Error('Use an even step count between 12 and 48.');
  if (!Number.isFinite(gap) || gap < 0) throw new Error('Stair gap must be nonnegative.');
  const group = new THREE.Group(),
    n = steps / 2,
    h = rise / steps,
    run = n * tread,
    offset = (width + gap) / 2;
  const stepObjects = [],
    landings = [];
  for (let flight = 0; flight < 2; flight++) {
    const x = flight ? offset : -offset;
    for (let i = 0; i < n; i++) {
      const y = (flight * n + i + 1) * h,
        z = flight ? run - (i + 0.5) * tread : (i + 0.5) * tread;
      const step = meshBox(width, 0.16, tread, material, x, y - 0.08, z);
      group.add(step);
      stepObjects.push(step);
      if (i % 3 === 0 || i === n - 1)
        for (const side of [-1, 1])
          group.add(
            meshBox(0.045, 0.95, 0.045, railMaterial, x + side * (width / 2 - 0.025), y + 0.475, z),
          );
    }
    const angle = (flight ? 1 : -1) * Math.atan2(rise / 2, run);
    for (const side of [-1, 1]) {
      const stringer = meshBox(
        0.1,
        0.18,
        Math.hypot(run, rise / 2),
        material,
        x + side * (width / 2 - 0.1),
        ((flight + 0.5) * rise) / 2 - 0.13,
        run / 2,
      );
      stringer.rotation.x = angle;
      group.add(stringer);
      const rail = meshBox(
        0.045,
        0.045,
        Math.hypot(run, rise / 2),
        railMaterial,
        x + side * (width / 2 - 0.025),
        ((flight + 0.5) * rise) / 2 + 0.95,
        run / 2,
      );
      rail.rotation.x = angle;
      group.add(rail);
    }
  }
  const mid = meshBox(
    width * 2 + gap,
    0.2,
    landing,
    material,
    0,
    rise / 2 - 0.1,
    run + landing / 2,
  );
  const upper = meshBox(width, 0.2, landing, material, offset, rise - 0.1, -landing / 2);
  group.add(mid, upper);
  landings.push(mid, upper);
  for (const side of [-1, 1]) {
    group.add(
      meshBox(
        0.045,
        0.045,
        landing,
        railMaterial,
        side * (width + gap / 2 - 0.025),
        rise / 2 + 0.95,
        run + landing / 2,
      ),
    );
    for (const z of [run, run + landing])
      group.add(
        meshBox(
          0.045,
          0.95,
          0.045,
          railMaterial,
          side * (width + gap / 2 - 0.025),
          rise / 2 + 0.475,
          z,
        ),
      );
  }
  group.add(
    meshBox(width * 2 + gap, 0.045, 0.045, railMaterial, 0, rise / 2 + 0.95, run + landing - 0.025),
  );
  // Real geometry references, useful for inspection and scene editing.
  group.userData.steps = stepObjects;
  group.userData.landings = landings;
  return group;
}

/** Fit the actual subject bounds; exclude enormous site/sky meshes by passing
 * the building/subject group rather than the entire scene.
 */
export function frameObject(
  camera,
  controls,
  object,
  { direction = [1, 0.65, 1], padding = 1.2 } = {},
) {
  if (!camera?.isPerspectiveCamera || !object?.isObject3D)
    throw new Error('Supply an actual perspective camera and subject Object3D.');
  positive(padding, 'padding');
  object.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(object);
  if (bounds.isEmpty()) throw new Error('Cannot frame empty geometry.');
  const center = bounds.getCenter(new THREE.Vector3()),
    radius = bounds.getSize(new THREE.Vector3()).length() / 2;
  const vertical = THREE.MathUtils.degToRad(camera.fov),
    horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);
  const distance = (radius / Math.sin(Math.min(vertical, horizontal) / 2)) * padding;
  const heading = new THREE.Vector3(...direction);
  if (!heading.lengthSq()) throw new Error('Camera direction cannot be zero.');
  camera.position.copy(center).addScaledVector(heading.normalize(), distance);
  camera.near = Math.max(0.03, distance / 1000);
  camera.far = Math.max(100, distance + radius * 8);
  camera.updateProjectionMatrix();
  camera.lookAt(center);
  if (controls) {
    controls.target.copy(center);
    controls.update();
  }
  return {
    center: center.toArray(),
    distance,
    bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
  };
}
