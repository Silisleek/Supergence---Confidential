// Independent native-asset validation and viewing; never generates/changes city assets.
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
const [modelPath, output] = process.argv.slice(2);
const buffer = await fs.readFile(modelPath);
if (
  buffer.toString('ascii', 0, 4) !== 'glTF' ||
  buffer.readUInt32LE(4) !== 2 ||
  buffer.readUInt32LE(8) !== buffer.length
)
  throw new Error('Invalid actual GLB header');
const jsonLength = buffer.readUInt32LE(12);
if (buffer.readUInt32LE(16) !== 0x4e4f534a) throw new Error('Missing GLB JSON chunk');
const doc = JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength));
await fs.mkdir(output, { recursive: true });
const result = {
  scope:
    'Independent GLB bytes, loader and rendered Chrome verification; source and asset remain Supergence-authored.',
  bytes: buffer.length,
  sha256: createHash('sha256').update(buffer).digest('hex'),
  gltf: {
    meshes: doc.meshes?.length,
    nodes: doc.nodes?.length,
    materials: doc.materials?.length,
    images: doc.images?.length,
    extensions: doc.extensionsUsed,
  },
};
const helper = await build({
  stdin: {
    contents: `import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1440,1000);renderer.setClearColor(0xb5cbdc);document.body.style.margin='0';document.body.appendChild(renderer.domElement);
const scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0x777766,2));const sun=new T.DirectionalLight(0xffffff,3);sun.position.set(300,600,200);scene.add(sun);
const gltf=await new GLTFLoader().loadAsync('/model.glb');scene.add(gltf.scene);const box=new T.Box3().setFromObject(gltf.scene,true);const core=new T.Box3();gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(o=>{if(o.isMesh){const b=new T.Box3().setFromObject(o,true);if(b.max.y>1 && b.max.y-b.min.y>.5)core.union(b);}});const size=core.getSize(new T.Vector3());const center=core.getCenter(new T.Vector3());
const camera=new T.PerspectiveCamera(50,1.44,.1,10000);camera.position.copy(center).add(new T.Vector3(size.x*.62,Math.max(size.x,size.z)*.72,size.z*.62));camera.lookAt(center);
let meshes=0,vertices=0;gltf.scene.traverse(o=>{if(o.isMesh){meshes++;vertices+=(o.geometry.attributes.position?.count||0)*(o.isInstancedMesh?o.count:1);}});renderer.render(scene,camera);window.__modelAudit={box:{min:box.min.toArray(),max:box.max.toArray()},framedCore:{min:core.min.toArray(),max:core.max.toArray()},meshes,vertices,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: 'esm',
  write: false,
  platform: 'browser',
});
const server = http.createServer((req, res) => {
  if (req.url === '/model.glb') {
    res.writeHead(200, { 'Content-Type': 'model/gltf-binary' });
    res.end(buffer);
  } else if (req.url === '/viewer.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    res.end(helper.outputFiles[0].text);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<!doctype html><script type="module" src="/viewer.js"></script>');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:' + server.address().port, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__modelAudit?.calls > 0, null, { timeout: 120000 });
  result.loaded = await page.evaluate(() => window.__modelAudit);
  result.errors = errors;
  await page.screenshot({ path: path.join(output, 'native-glb.png') });
  result.passed =
    errors.length === 0 &&
    result.loaded.meshes > 20 &&
    result.loaded.vertices > 100000 &&
    result.loaded.box.max.every(Number.isFinite) &&
    result.loaded.box.max[1] > 50;
} catch (e) {
  result.failure = e.message;
  result.passed = false;
} finally {
  if (browser) await browser.close();
  await new Promise((r) => server.close(r));
  await fs.writeFile(path.join(output, 'glb-audit.json'), JSON.stringify(result, null, 2));
}
console.log(JSON.stringify(result));
if (!result.passed) process.exitCode = 1;
