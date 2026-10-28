import * as THREE from 'three';
import { mergeGeometries } from '/vendor/three/examples/jsm/utils/BufferGeometryUtils.js';

/** Batch only static, opaque meshes within a chosen assembly. Keep animated,
 * interactive, collision and inspection targets outside it or explicitly exclude
 * them. Groups, lights and non-mesh objects remain attached. Returns real counts.
 */
export function batchStaticMeshes(root, { exclude = [] } = {}) {
  if (!root?.isObject3D || root.isMesh || !Array.isArray(exclude))
    throw new Error('Supply an Object3D assembly and an array of excluded objects.');
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert();
  const excluded = new Set(exclude);
  const buckets = new Map();
  root.traverse((mesh) => {
    if (
      !mesh.isMesh ||
      mesh.isInstancedMesh ||
      mesh.isSkinnedMesh ||
      Array.isArray(mesh.material) ||
      !mesh.geometry?.isBufferGeometry ||
      mesh.material.transparent ||
      mesh.material.opacity < 1 ||
      Object.keys(mesh.geometry.morphAttributes).length
    )
      return;
    for (let parent = mesh; parent; parent = parent.parent) {
      if (excluded.has(parent) || !parent.visible) return;
      if (parent === root) break;
    }
    const layout = Object.entries(mesh.geometry.attributes)
      .map(([name, a]) => `${name}:${a.itemSize}:${a.normalized}:${a.array.constructor.name}`)
      .sort()
      .join(',');
    const key = [
      mesh.material.uuid,
      layout,
      !!mesh.geometry.index,
      mesh.castShadow,
      mesh.receiveShadow,
      mesh.renderOrder,
      mesh.layers.mask,
    ].join('|');
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(mesh);
  });
  let sourceMeshes = 0,
    batchedMeshes = 0;
  const batches = [];
  for (const meshes of buckets.values()) {
    if (meshes.length < 2) continue;
    const geometries = meshes.map((mesh) => {
      const geometry = mesh.geometry.clone();
      geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld));
      return geometry;
    });
    const merged = mergeGeometries(geometries, false);
    geometries.forEach((g) => g.dispose());
    if (!merged) continue;
    merged.computeBoundingBox();
    merged.computeBoundingSphere();
    const first = meshes[0];
    const batch = new THREE.Mesh(merged, first.material);
    batch.name = 'static-detail-batch';
    batch.castShadow = first.castShadow;
    batch.receiveShadow = first.receiveShadow;
    batch.renderOrder = first.renderOrder;
    batch.layers.mask = first.layers.mask;
    batch.userData.sourceNames = meshes.map((m) => m.name).filter(Boolean);
    batch.userData.sourceMeshCount = meshes.length;
    // Source geometries may be shared by objects outside this assembly. Do not
    // dispose those resources here; callers own their original assets.
    meshes.forEach((mesh) => mesh.removeFromParent());
    root.add(batch);
    batches.push(batch);
    sourceMeshes += meshes.length;
    batchedMeshes++;
  }
  return { sourceMeshes, batchedMeshes, reducedDrawObjects: sourceMeshes - batchedMeshes, batches };
}
