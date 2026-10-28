import vm from 'vm';

const sample = `
Here is the code you requested:
We need a chassis, sloped canopy, left track, right track, and lights.
function buildSceneObjects(scene, THREE) {
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 4), new THREE.MeshStandardMaterial({ color: 0x00f0ff }));
  scene.add(chassis);
  return [chassis];
}
I hope this helps! Feel free to ask for more.
`;

function extractFn(clean, fnName) {
  const fnIdx = clean.indexOf('function ' + fnName);
  if (fnIdx !== -1) {
    clean = clean.slice(fnIdx);
    let depth = 0,
      started = false,
      endIdx = -1;
    for (let i = 0; i < clean.length; i++) {
      if (clean[i] === '{') {
        depth++;
        started = true;
      } else if (clean[i] === '}') {
        depth--;
        if (started && depth === 0) {
          endIdx = i + 1;
          break;
        }
      }
    }
    if (endIdx !== -1) clean = clean.slice(0, endIdx);
  }
  return clean;
}

const res = extractFn(sample, 'buildSceneObjects');
console.log('Result:\n', res);
new vm.Script(res);
console.log('VALID SYNTAX? TRUE!');
