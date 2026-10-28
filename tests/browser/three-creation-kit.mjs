import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright-core';
const baseURL = process.env.SIS_BASE_URL;
if (!baseURL) throw new Error('Set SIS_BASE_URL to the actual startup banner URL.');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/three-kit-browser-fixture.html', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<!DOCTYPE html><html><head><script type="importmap">{"imports":{"three":"/vendor/three/build/three.module.js"}}</script></head><body><script type="module">
import * as THREE from 'three';
import {createWallWithOpenings,createReturnStair,createGalleryWing,frameObject} from '/scripts/three-creation-kit.js';
const renderer=new THREE.WebGLRenderer();renderer.setSize(1000,700);document.body.append(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1440/960,.1,100);
const material=new THREE.MeshNormalMaterial();
const wall=createWallWithOpenings({width:6,height:3,thickness:.3,openings:[{x:0,y:0,width:1.2,height:2.2}],material});
scene.add(wall);wall.updateWorldMatrix(true,true);
const ray=new THREE.Raycaster();ray.set(new THREE.Vector3(0,1,3),new THREE.Vector3(0,0,-1));
const doorHits=ray.intersectObject(wall,true).length;
ray.set(new THREE.Vector3(2,1,3),new THREE.Vector3(0,0,-1));const solidHits=ray.intersectObject(wall,true).length;
const stair=createReturnStair({rise:3.2,width:1.4,steps:18,material});stair.position.x=6;scene.add(stair);stair.updateWorldMatrix(true,true);
const positions=stair.userData.steps.map(o=>o.getWorldPosition(new THREE.Vector3()).toArray());
const gallery=createGalleryWing({width:6,depth:20,floors:2,wallMaterial:material,slabMaterial:material,glassMaterial:material});
gallery.structure.position.x=15;gallery.roof.position.x=15;scene.add(gallery.structure,gallery.roof);scene.updateMatrixWorld(true);
const galleryDoorClear=[1,4.2].every(y=>{ray.set(new THREE.Vector3(22,y,0),new THREE.Vector3(-1,0,0));const hits=ray.intersectObject(gallery.structure,true);return hits.length>0&&hits[0].distance>7;});
ray.set(new THREE.Vector3(22,.2,4),new THREE.Vector3(-1,0,0));const lowWallHits=ray.intersectObject(gallery.structure,true);const galleryWallBasedAtFloor=lowWallHits.length>0&&lowWallHits[0].distance<5;
const checks=[];
for(const aspect of [1440/960,390/844]){
 camera.aspect=aspect;frameObject(camera,null,stair);
 camera.updateMatrixWorld();const bounds=new THREE.Box3().setFromObject(stair);
 const projected=[];for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])projected.push(new THREE.Vector3(x,y,z).project(camera).toArray());
 checks.push({aspect,allCornersVisible:projected.every(p=>Math.abs(p[0])<1&&Math.abs(p[1])<1&&p[2]>-1&&p[2]<1)});
}
renderer.render(scene,camera);
let invalidRejected=false;try{createWallWithOpenings({width:4,height:3,openings:[{x:5,y:0,width:2,height:2}],material});}catch{invalidRejected=true;}
window.__kitResult={doorHits,solidHits,positions,checks,invalidRejected,galleryDoorClear,galleryWallBasedAtFloor,renderCalls:renderer.info.render.calls};
</script></body></html>`,
    }),
  );
  await page.goto(baseURL + '/three-kit-browser-fixture.html');
  await page.waitForFunction(() => window.__kitResult);
  const result = await page.evaluate(() => __kitResult);
  assert.equal(result.doorHits, 0, 'A ray must pass through the actual door void.');
  assert.ok(result.solidHits > 0, 'A ray outside the doorway must hit actual wall geometry.');
  assert.equal(result.positions.length, 18);
  assert.ok(result.positions[8][2] > result.positions[0][2]);
  assert.ok(result.positions[17][2] < result.positions[9][2]);
  assert.ok(Math.abs(result.positions[17][1] + 0.08 - 3.2) < 1e-6);
  assert.ok(result.checks.every((c) => c.allCornersVisible));
  assert.ok(result.invalidRejected);
  assert.ok(result.renderCalls > 0);
  assert.deepEqual(errors, []);
  assert.ok(result.galleryDoorClear);
  assert.ok(result.galleryWallBasedAtFloor);
  await fs.mkdir('test-results/three-creation-kit', { recursive: true });
  await fs.writeFile(
    'test-results/three-creation-kit/report.json',
    JSON.stringify({ passed: true, ...result, errors }, null, 2),
  );
  console.log(
    JSON.stringify({
      passed: true,
      realDoorVoid: true,
      returnStairSteps: result.positions.length,
      desktopAndPhoneFraming: true,
      actualWebGL: true,
    }),
  );
} finally {
  await browser.close();
}
