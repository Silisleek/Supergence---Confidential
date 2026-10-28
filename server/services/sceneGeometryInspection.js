// Self-contained so the same inspection can run inside the real browser.
// Inspect actual exposed Three scenes; never infer geometry from source text.
export function inspectSceneGeometry(root = globalThis) {
  const scenes = new Set();
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(root))) {
    const value = descriptor.value;
    if (!value || typeof value !== 'object') continue;
    try {
      if (value.isScene === true && typeof value.traverse === 'function') scenes.add(value);
      const scene = Object.getOwnPropertyDescriptor(value, 'scene')?.value;
      if (scene?.isScene === true && typeof scene.traverse === 'function') scenes.add(scene);
    } catch {
      /* Unrelated host objects are not project inspection interfaces. */
    }
  }
  const result = {
    available: scenes.size > 0,
    scenes: scenes.size,
    meshes: 0,
    vertices: 0,
    invalidValues: 0,
    missingUVs: 0,
    unavailableAttributes: 0,
    violations: [],
    passed: null,
  };
  if (!result.available) return result;
  const visited = new Set();
  for (const scene of scenes)
    scene.traverse((mesh) => {
      if (!mesh.isMesh || !mesh.geometry || visited.has(mesh)) return;
      visited.add(mesh);
      result.meshes++;
      const attributes = mesh.geometry.attributes || {};
      result.vertices += attributes.position?.count || 0;
      for (const name of ['position', 'normal', 'uv', 'uv1', 'uv2', 'uv3']) {
        const attribute = attributes[name];
        if (!attribute) continue;
        if (typeof attribute.getComponent !== 'function' && !attribute.array) {
          result.unavailableAttributes++;
          continue;
        }
        let invalid = 0;
        for (let i = 0; i < attribute.count; i++) {
          for (let component = 0; component < attribute.itemSize; component++) {
            const value =
              typeof attribute.getComponent === 'function'
                ? attribute.getComponent(i, component)
                : attribute.array?.[i * attribute.itemSize + component];
            if (!Number.isFinite(value)) invalid++;
          }
        }
        result.invalidValues += invalid;
        if (invalid && result.violations.length < 20)
          result.violations.push({
            mesh: mesh.name || mesh.type,
            attribute: name,
            invalidValues: invalid,
          });
      }
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        if (!material || material.isShaderMaterial) continue;
        const map = material.map;
        if (!map?.isTexture) continue;
        const channel = map.channel || 0;
        const name = channel ? 'uv' + channel : 'uv';
        if (!attributes[name]) {
          result.missingUVs++;
          if (result.violations.length < 20)
            result.violations.push({
              mesh: mesh.name || mesh.type,
              attribute: name,
              error: 'Textured material has no matching UV attribute',
            });
        }
      }
    });
  result.passed =
    result.invalidValues || result.missingUVs ? false : result.unavailableAttributes ? null : true;
  return result;
}
