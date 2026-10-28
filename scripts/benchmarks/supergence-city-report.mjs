// Independent evaluation report only. This never writes Supergence's city project.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const folder = 'workspace/supergence/city-evaluation-20261024';
const project = 'workspace/supergence/projects/meridian-harbor-20261024-845b8f71';
const read = async (name) => JSON.parse(await fs.readFile(path.join(folder, name), 'utf8'));
const [browser, model, data, buildings, landmarks, bridge1, bridge2, archive, app, platform] =
  await Promise.all([
    read('browser-delivery-final/browser-audit.json'),
    read('native-model-delivery/glb-audit.json'),
    read('data-audit-repaired-final.json'),
    read('building-audit-current.json'),
    read('landmark-audit-repaired.json'),
    read('bridge-audit-final.json'),
    read('bridge-2-audit-final.json'),
    read('archive-audit.json'),
    read('app-project-preview.json'),
    read('platform-repair.json'),
  ]);
const files = [];
async function inventory(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) await inventory(f);
    else if (!e.name.includes('.repair-')) {
      const b = await fs.readFile(f);
      files.push({
        file: path.relative(project, f).replaceAll('\\', '/'),
        bytes: b.length,
        sha256: createHash('sha256').update(b).digest('hex'),
      });
    }
  }
}
await inventory(project);
const summary = {
  checkedAt: new Date().toISOString(),
  project: path.resolve(project),
  preview: 'http://localhost:3009/' + project + '/index.html',
  authorship: {
    city: 'Supergence native Qwen qwen/qwen3.8-27b source generation and repair calls; native workspace and run_command terminal tools.',
    supervision:
      'Codex wrote the brief, staged instructions, dispatchers, independent read-only audits and this report; supplied exact observed errors and interface feedback. Some terminal commands and repair-compiler calls were dispatched directly through Supergence native tool API.',
    platform:
      'Codex repaired context/source-marker plumbing and focused tool schemas, then added the generic app creation-studio project-preview link. These are platform changes outside the city project.',
    assessment:
      'Heavily supervised iterative result. This trial does not establish autonomous or one-shot city generation, photorealism, frontier-model parity or architectural compliance.',
  },
  result: {
    counts: data.actualCounts,
    landmarks: landmarks.landmarks.length,
    modelBytes: model.bytes,
    modelSha256: model.sha256,
    archiveBytes: archive.bytes,
    archiveSha256: archive.sourceArchiveSha256,
    embeddedImages: model.gltf.images,
    meshes: model.loaded.meshes,
    vertices: model.loaded.vertices,
    drawCalls: model.loaded.calls,
    renderedTriangles: model.loaded.triangles,
  },
  checks: {
    nativeModelLoaded: model.passed,
    archiveModelMatches: archive.modelMatches,
    allBuildingsPresent: buildings.missing.length === 0 && buildings.actualBuildingRoots === 420,
    buildingFootprints:
      buildings.oversizedFootprints === 0 && buildings.orientationMismatches === 0,
    streetNetworkConnected: data.streetNetwork.connectedComponents === 1,
    noMeasuredDataConflicts: Object.values(data.conflicts).every((v) => v === 0),
    allLandmarksRendered: landmarks.landmarks.every((l) => l.meshCount > 0),
    landmarkEnvelopesClear: landmarks.landmarks.every(
      (l) => l.buildingEnvelopeOverlaps.length === 0,
    ),
    noBrowserErrors: browser.errors.length === 0 && !browser.failure,
    realGeometry: browser.checks.substantialGeometry,
    finiteLights: browser.checks.finiteLights,
    trafficPause: browser.checks.trafficPause,
    trafficResume: browser.checks.trafficResume,
    dayNight: browser.checks.nightChangesScene,
    walking: browser.checks.walkMovesCamera,
    bothBridgesWalkable: bridge1.walkedAcross && bridge2.walkedAcross,
    districtFocus: browser.checks.allDistrictsFocus,
    reset: browser.checks.resetMode === 'orbit',
    appProjectPreview: app.status === 200,
  },
  frameCadence: browser.frameCadence,
  limits: [
    'Visual result is a procedural prototype. Repeated facades, simplified vehicles and large open parcels remain below a photorealistic city target.',
    'Traffic is route animation; intersection rules, vehicle collisions and city simulation are not established.',
    'Native GLB preserves the exported static city and initial vehicle pose. Live navigation, traffic and day/night controls run in the source preview.',
    'The site is 1 km square; the exported surrounding ground/context plane spans 2.4 km. Native viewer uses independent lighting and frames the measured built geometry.',
    'Geometry and control checks do not establish building-code compliance or complete interior circulation.',
    'This is one brief developed repeatedly; it is not a held-out task benchmark or a comparison to frontier models.',
    'Physical-phone testing was deferred by the user; no sustained-device performance claim.',
    'Frame cadence samples 60 real Chrome intervals on this machine; it is not a general FPS guarantee.',
  ],
  evidence: {
    browser: 'browser-delivery-final/browser-audit.json',
    nativeModel: 'native-model-delivery/glb-audit.json',
    data: 'data-audit-repaired-final.json',
    buildings: 'building-audit-current.json',
    landmarks: 'landmark-audit-repaired.json',
    bridge1: 'bridge-audit-final.json',
    bridge2: 'bridge-2-audit-final.json',
    archive: 'archive-audit.json',
    app: 'app-project-preview.json',
    platform: 'platform-repair.json',
    nativeGenerate: 'native-npm-generate.receipt.json',
    nativeExport: 'native-npm-export-final.receipt.json',
    nativeBuild: 'native-build-delivery.receipt.json',
    nativePackaging: 'native-package.receipt.json',
  },
  platformRegression: platform.fullRegression,
  files,
};
await fs.writeFile(path.join(folder, 'RESULTS.json'), JSON.stringify(summary, null, 2));
const checks = Object.entries(summary.checks);
const md = `# Supergence-only city trial: Meridian Harbor\n\nSupergence produced a working 1 km procedural city with 420 buildings, 5 districts, 2 bridges, 5 rendered landmarks, 140 trees and 284 lamps. The terminal export is a real ${(model.bytes / 1e6).toFixed(1)} MB GLB with ${model.gltf.images} embedded images. The ${(archive.bytes / 1e6).toFixed(1)} MB ZIP includes source and the same verified model.\n\n[Open city](${summary.preview}) · [GLB](../projects/meridian-harbor-20261024-845b8f71/exports/meridian-harbor.glb) · [Source and model ZIP](meridian-harbor-source.zip)\n\n## Authorship and supervision\n\n${summary.authorship.city}\n\n${summary.authorship.supervision}\n\n${summary.authorship.platform}\n\n${summary.authorship.assessment}\n\n## Observed checks\n\n${checks.map(([k, v]) => '- ' + k + ': ' + (v ? 'PASS' : 'FAIL')).join('\n')}\n\nActual native model: ${model.loaded.meshes} meshes, ${model.loaded.vertices.toLocaleString()} vertices, ${model.gltf.images} embedded images, ${model.loaded.calls} observed draw calls. Both bridges were crossed with actual keyboard input. All 5 district controls focused their real centers.\n\nChrome frame sample: median ${browser.frameCadence.medianMs.toFixed(1)}ms, 95th percentile${browser.frameCadence.p95Ms.toFixed(1)}ms across 60 real frames on this machine.\n\n## Reproduce locally\n\nIn the delivered project, with installed dependencies available: npm run generate, npm run build, npm run export. Preview through the linked SIS workspace. Chrome is required by the terminal exporter. The package does not advertise an unimplemented npm test command; independent audit scripts live in the repository scripts/benchmarks folder.\n\n## Limits\n\n${summary.limits.map((x) => '- ' + x).join('\n')}\n\n## Preserved failures\n\nThe original attempts, provider quota failures, invalid marker-source snapshots, empty-render result, broken exports, roof/batching/lighting failures and later fixes remain in the evaluation folder and native repair receipts. Initial unused city source and provisional plan are archived under reports/initial-attempts inside the project. Passing the final checks does not retroactively make those attempts successful.\n\n## Evidence\n\n${Object.entries(
  summary.evidence,
)
  .map(([k, v]) => '- [' + k + '](' + v + ')')
  .join(
    '\n',
  )}\n\nModel SHA256: ${model.sha256}\n\nArchive SHA256: ${archive.sourceArchiveSha256}\n`;
await fs.writeFile(path.join(folder, 'RESULTS.md'), md);
const esc = (x) =>
  String(x).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Meridian Harbor — Supergence city trial</title><style>body{margin:0;background:#101920;color:#e2e9ed;font:16px/1.6 system-ui}main{max-width:1160px;margin:auto;padding:32px 22px}a{color:#8adbc8}h1{font-size:40px;line-height:1.15}p{max-width:950px}nav{display:flex;gap:16px;flex-wrap:wrap;margin:24px 0}nav a{padding:10px 16px;border:1px solid #41626a;border-radius:8px}img{max-width:100%;border-radius:12px}figure{margin:28px 0}figcaption{color:#a8bcc6}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px}.check{padding:8px;background:#182830;border-radius:6px}details{margin:24px 0}code{overflow-wrap:anywhere}li{margin:8px 0}</style><main><p>SUPERVISED LOCAL BUILD · QWEN · INDEPENDENT EVALUATION</p><h1>Meridian Harbor</h1><p>420 buildings ·5 districts ·2 walkable bridges ·5 rendered landmarks ·${(model.bytes / 1e6).toFixed(1)} MB native GLB ·${model.gltf.images} embedded images.</p><nav><a href="${summary.preview}">Explore the city</a><a href="../projects/meridian-harbor-20261024-845b8f71/exports/meridian-harbor.glb" download>Download GLB</a><a href="meridian-harbor-source.zip" download>Source + model ZIP (${(archive.bytes / 1e6).toFixed(1)} MB)</a><a href="RESULTS.md">Full report</a><a href="RESULTS.json">Raw results</a></nav><p>${esc(summary.authorship.assessment)} Visual realism remains below the requested photorealistic target.</p><figure><img src="browser-delivery-final/overview.png" alt="Actual city overview in Chrome"><figcaption>Actual Supergence preview; no retouching.</figcaption></figure><div class="grid">${checks.map(([k, v]) => '<div class="check">' + (v ? '✓ ' : '✗ ') + esc(k) + '</div>').join('')}</div><p>Measured 60-frame sample: median ${browser.frameCadence.medianMs.toFixed(1)}ms; 95th percentile${browser.frameCadence.p95Ms.toFixed(1)}ms on this machine.</p><figure><img src="browser-delivery-final/street.png" alt="Actual close city view"><figcaption>Street/bridge view in the source preview.</figcaption></figure><figure><img src="browser-delivery-final/night.png" alt="Actual settled night mode"><figcaption>Actual settled night transition.</figcaption></figure><figure><img src="native-model-delivery/native-glb.png" alt="Independent native GLB viewer"><figcaption>Independent loader rendering the actual native GLB under separate lighting. ${model.loaded.meshes} meshes;${model.loaded.vertices.toLocaleString()} vertices.</figcaption></figure><details open><summary>Authorship and method</summary><p>${esc(summary.authorship.city)}</p><p>${esc(summary.authorship.supervision)}</p><p>${esc(summary.authorship.platform)}</p></details><details open><summary>Practical limits</summary><ul>${summary.limits.map((l) => '<li>' + esc(l) + '</li>').join('')}</ul></details><details><summary>Evidence and preserved attempts</summary><ul>${Object.entries(
  summary.evidence,
)
  .map(([k, v]) => '<li><a href="' + v + '">' + esc(k) + '</a></li>')
  .join(
    '',
  )}</ul><p>Earlier failures and raw model/tool receipts remain preserved. Model SHA256: <code>${model.sha256}</code></p></details></main>`;
await fs.writeFile(path.join(folder, 'index.html'), html);
console.log(
  JSON.stringify({
    checks: summary.checks,
    model: summary.result,
    report: path.resolve(folder, 'index.html'),
  }),
);
if (checks.some(([, v]) => v !== true)) process.exitCode = 1;
