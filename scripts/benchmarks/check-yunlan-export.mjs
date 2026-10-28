// Independent read-only validation of a GLB produced by Supergence. This script
// builds only an evaluator bundle; it never creates or changes city assets.
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';

const file = path.resolve(process.argv[2]);
const output = path.resolve('test-results/project-workflow/export-browser');
await fs.mkdir(output, { recursive: true });
const report = { file, checkedAt: new Date().toISOString(), passed: false, pageErrors: [] };
let server, browser;
try {
  const handle = await fs.open(file, 'r');
  let json;
  try {
    const header = Buffer.alloc(20);
    await handle.read(header, 0, 20, 0);
    const size = (await handle.stat()).size;
    if (
      header.toString('ascii', 0, 4) !== 'glTF' ||
      header.readUInt32LE(4) !== 2 ||
      header.readUInt32LE(8) !== size ||
      header.readUInt32LE(16) !== 0x4e4f534a
    )
      throw new Error('Invalid GLB v2 header/chunk.');
    const jsonBytes = Buffer.alloc(header.readUInt32LE(12));
    await handle.read(jsonBytes, 0, jsonBytes.length, 20);
    json = JSON.parse(jsonBytes.toString('utf8'));
    report.structure = {
      bytes: size,
      meshes: json.meshes?.length || 0,
      nodes: json.nodes?.length || 0,
      materials: json.materials?.length || 0,
      images: json.images?.length || 0,
      embeddedImages: json.images?.filter((i) => Number.isInteger(i.bufferView)).length || 0,
      externalUris: [...(json.buffers || []), ...(json.images || [])]
        .map((i) => i.uri)
        .filter(Boolean),
      triangles: (json.meshes || []).reduce(
        (sum, m) =>
          sum +
          m.primitives.reduce(
            (n, p) =>
              n +
              (p.indices === undefined
                ? json.accessors[p.attributes.POSITION].count
                : json.accessors[p.indices].count) /
                3,
            0,
          ),
        0,
      ),
    };
  } finally {
    await handle.close();
  }
  const bundle = await build({
    stdin: {
      resolveDir: process.cwd(),
      contents: `
    import * as T from 'three';
    import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
    window.audit = { ready:false };
    try {
      const gltf = await new GLTFLoader().loadAsync('/city.glb');
      let meshes=0, vertices=0, maps=0, invalid=0, invalidUVs=0, invalidNormals=0;
      const textures=new Set();
      gltf.scene.traverse((o)=>{
        if(!o.isMesh) return;
        meshes++;
        const p=o.geometry.attributes.position;
        vertices+=p.count;
        for(const v of p.array) if(!Number.isFinite(v)) invalid++;
        for(const v of o.geometry.attributes.uv?.array||[]) if(!Number.isFinite(v)) invalidUVs++;
        for(const v of o.geometry.attributes.normal?.array||[]) if(!Number.isFinite(v)) invalidNormals++;
        for(const m of (Array.isArray(o.material)?o.material:[o.material])) {
          if(m.map){maps++;textures.add(m.map);}
          if(m.normalMap) textures.add(m.normalMap);
        }
      });
      const bounds=new T.Box3().setFromObject(gltf.scene), size=bounds.getSize(new T.Vector3()), center=bounds.getCenter(new T.Vector3());
      const renderer=new T.WebGLRenderer({antialias:true}); renderer.setSize(1280,800);
      renderer.toneMapping=T.ACESFilmicToneMapping; renderer.toneMappingExposure=1.05;
      document.body.style.margin='0';document.body.append(renderer.domElement);
      const scene=new T.Scene();scene.background=new T.Color('#a8c4d8');scene.add(gltf.scene);
      scene.add(new T.HemisphereLight(0xe7f1ff,0x736454,2));
      const sun=new T.DirectionalLight(0xffedcf,3);sun.position.set(-300,500,200);scene.add(sun);
      const cam=new T.PerspectiveCamera(48,1280/800,1,6000);
      cam.position.copy(center).add(new T.Vector3(size.x*.7,size.x*.62,size.z*.72));cam.lookAt(center);
      renderer.render(scene,cam);
      const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
      window.audit={ready:true,meshes,vertices,mappedMeshes:maps,textures:textures.size,invalidCoordinates:invalid,invalidUVs,invalidNormals,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},size:size.toArray(),drawCalls:renderer.info.render.calls,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};
    } catch(e){window.audit={ready:true,error:e.stack||e.message};}
  `,
    },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
  });
  server = http.createServer((req, res) => {
    if (req.url === '/city.glb') {
      res.writeHead(200, { 'content-type': 'model/gltf-binary' });
      createReadStream(file).pipe(res);
    } else if (req.url === '/audit.js') {
      res.writeHead(200, { 'content-type': 'text/javascript' });
      res.end(bundle.outputFiles[0].contents);
    } else {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(
        '<!doctype html><title>Independent GLB audit</title><script type="module" src="/audit.js"></script>',
      );
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-gl=angle', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', (e) => report.pageErrors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.audit?.ready, null, { timeout: 240000, polling: 250 });
  report.loaded = await page.evaluate(() => window.audit);
  report.screenshot = path.join(output, 'independent-glb.png');
  await page.screenshot({ path: report.screenshot, timeout: 60000 });
  report.passed = Boolean(
    !report.loaded.error &&
    !report.pageErrors.length &&
    report.structure.meshes > 0 &&
    report.structure.triangles > 100000 &&
    report.structure.images > 0 &&
    report.structure.images === report.structure.embeddedImages &&
    !report.structure.externalUris.length &&
    report.loaded.meshes > 0 &&
    report.loaded.invalidCoordinates === 0 &&
    report.loaded.invalidUVs === 0 &&
    report.loaded.invalidNormals === 0 &&
    report.loaded.textures > 0 &&
    report.loaded.size[0] > 900 &&
    report.loaded.size[2] > 900,
  );
} catch (error) {
  report.error = error.stack || error.message;
} finally {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report));
if (!report.passed) process.exitCode = 1;
