import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright-core';
const baseURL = process.env.SIS_BASE_URL;
if (!baseURL) throw new Error('Set SIS_BASE_URL to the actual startup banner.');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/detail-kit-fixture.html', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><script type="importmap">{"imports":{"three":"/vendor/three/build/three.module.js"}}</script><script type="module">
 import * as THREE from 'three';import {batchStaticMeshes} from '/scripts/three-detail-kit.js';
 const renderer=new THREE.WebGLRenderer();renderer.setSize(800,600);document.body.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(50,4/3,.1,100);
 camera.position.set(0,4,14);camera.lookAt(0,0,0);
 const assembly=new THREE.Group();assembly.position.set(1,0,-2);assembly.rotation.y=.25;scene.add(assembly);
 const material=new THREE.MeshNormalMaterial(),geo=new THREE.BoxGeometry(1,1,1);
 const children=[];for(let i=0;i<6;i++){const mesh=new THREE.Mesh(geo,material);mesh.position.set(i-2.5,0,0);assembly.add(mesh);children.push(mesh);}
 const animated=children[2];const transparent=new THREE.Mesh(geo,new THREE.MeshNormalMaterial({transparent:true,opacity:.4}));transparent.position.y=2;assembly.add(transparent);
 const light=new THREE.PointLight(0xffffff,2);assembly.add(light);
 scene.updateMatrixWorld(true);
 const ray=new THREE.Raycaster();const sample=()=>children.map(c=>{const target=new THREE.Vector3(c.position.x,0,0).applyMatrix4(assembly.matrixWorld);ray.set(target.clone().add(new THREE.Vector3(0,5,0)),new THREE.Vector3(0,-1,0));return ray.intersectObject(assembly,true)[0]?.distance;});
 const before=sample();renderer.render(scene,camera);const callsBefore=renderer.info.render.calls;
 const result=batchStaticMeshes(assembly,{exclude:[animated]});scene.updateMatrixWorld(true);const after=sample();renderer.render(scene,camera);
 animated.rotation.z=.5;renderer.render(scene,camera);
 window.__result={before,after,callsBefore,callsAfter:renderer.info.render.calls,sourceMeshes:result.sourceMeshes,batchedMeshes:result.batchedMeshes,excludedRetained:animated.parent===assembly&&animated.rotation.z===.5,transparentRetained:transparent.parent===assembly,lightRetained:light.parent===assembly,mergedVertices:result.batches[0].geometry.attributes.position.count};
 </script>`,
    }),
  );
  await page.goto(baseURL + '/detail-kit-fixture.html');
  await page.waitForFunction(() => window.__result);
  const result = await page.evaluate(() => __result);
  assert.deepEqual(errors, []);
  assert.equal(result.sourceMeshes, 5);
  assert.equal(result.batchedMeshes, 1);
  assert.ok(result.callsAfter < result.callsBefore);
  assert.ok(result.mergedVertices > 0);
  assert.ok(result.excludedRetained && result.transparentRetained && result.lightRetained);
  result.before.forEach((distance, i) =>
    assert.ok(
      Math.abs(distance - result.after[i]) < 1e-5,
      'World geometry ray hits must survive batching.',
    ),
  );
  await fs.mkdir('test-results/three-detail-kit', { recursive: true });
  await fs.writeFile(
    'test-results/three-detail-kit/report.json',
    JSON.stringify({ passed: true, ...result }, null, 2),
  );
  console.log(JSON.stringify({ passed: true, ...result }));
} finally {
  await browser.close();
}
