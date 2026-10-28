import vm from 'vm';

const dirtyOutput = `
We need answer only valid code. Need decide left and right.
In prompt:
\`\`\`
function buildSceneObjects(scene, THREE)
\`\`\`
Now we generate the code:
\`\`\`javascript
function buildSceneObjects(scene, THREE) {
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(4, 1.5, 6),
    new THREE.MeshStandardMaterial({ color: 0x2C3E50, metalness: 0.8, roughness: 0.2 })
  );
  hull.name = "chassis";
  hull.position.set(0, 1, 0);
  hull.castShadow = true;
  scene.add(hull);

  const turret = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.4, 0.8, 16),
    new THREE.MeshStandardMaterial({ color: 0x14161A, metalness: 0.9, roughness: 0.2 })
  );
  turret.name = "turret";
  turret.position.set(0, 1.8, 0);
  turret.castShadow = true;
  scene.add(turret);

  return [hull, turret];
}
\`\`\`
Hope this helps! Make sure to test in browser.
`;

function extractFunctionByName(code, fnName) {
  const fnMarker = `function ${fnName}`;
  const lastFnIdx = code.lastIndexOf(fnMarker);
  if (lastFnIdx === -1) return null;

  let clean = code.slice(lastFnIdx);
  let depth = 0;
  let started = false;
  let endIdx = -1;
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
  if (endIdx !== -1) {
    clean = clean.slice(0, endIdx);
  }
  return clean;
}

const extracted = extractFunctionByName(dirtyOutput, 'buildSceneObjects');
console.log('EXTRACTED CODE:\n', extracted);
new vm.Script(extracted);
console.log('\nSYNTAX VALIDATION: 100% CLEAN!');
