// Evidence-only delivery report. Never writes into the native city project.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const root = path.resolve('workspace/supergence/projects/yunlan-canal-city-f9cb7644');
const out = path.resolve('workspace/supergence/city-evaluation-20261026');
const read = async (p) => JSON.parse((await fs.readFile(p, 'utf8')).replace(/^\uFEFF/, ''));
const browser = await read('test-results/project-workflow/city-browser/first-render.json');
const smoke = await read(path.join(root, 'reports/smoke.json'));
const glb = await read('test-results/project-workflow/export-browser/report.json');
const textures = await read('test-results/project-workflow/texture-audit.json');
const portable = await read('test-results/project-workflow/portable-audit.json');
const placement = await read('test-results/project-workflow/placement-oracle.json');
const geometry = await read('test-results/project-workflow/geometry-oracle.json');
const streets = await read('test-results/project-workflow/street-review/report.json');
if (
  !browser.passed ||
  !smoke.ok ||
  !glb.passed ||
  !textures.passed ||
  !portable.passed ||
  !placement.passed ||
  !geometry.passed ||
  streets.failure ||
  streets.errors.length
)
  throw Error('Required evidence has not passed.');
await fs.mkdir(out, { recursive: true });
const artifacts = [];
for (const name of ['yunlan-city.glb', 'yunlan-source.zip']) {
  const file = path.join(root, 'exports', name);
  const data = await fs.readFile(file);
  artifacts.push({
    name,
    bytes: data.length,
    sha256: createHash('sha256').update(data).digest('hex'),
  });
}
const captures = [
  ['Overview', path.join(root, 'renders/smoke-overview.png'), 'overview.png'],
  [
    'Shopping street',
    browser.deep.captures.find((c) => c.name === 'shopping').file,
    'shopping.png',
  ],
  ['Canal quarter', browser.deep.captures.find((c) => c.name === 'historic').file, 'historic.png'],
  ['Night', browser.deep.captures.find((c) => c.name === 'night-historic').file, 'night.png'],
  [
    'Public tea house interior',
    streets.captures.find((c) => c.name === 'teahouse-interior').file,
    'interior.png',
  ],
  ['Independent GLB viewer', glb.screenshot, 'independent-glb.png'],
];
for (const [, file, name] of captures) await fs.copyFile(file, path.join(out, name));
const limitations = [
  'Visual target remains partly unmet: this is a procedural, stylized city with repeated facades and simplified vehicles, below a photorealistic or AAA city target.',
  'Only the tea house and transit hall have tested public interiors. Most buildings are exterior models; shallow glazed panels are not cut interior openings.',
  'Traffic follows routes. Intersection right-of-way, vehicle collision avoidance and pedestrian intelligence are not established.',
  'The native GLB contains the static city. Interactive controls, animated traffic, water and day/night behavior run in the source application.',
  'This is iterative, supervised native-model work on one brief, not a one-shot success, held-out benchmark or evidence of frontier-model parity.',
  'Geometry and controller tests do not establish building-code compliance or complete city circulation.',
  'Physical phone testing was deferred by the user. Performance samples apply only to this machine and test conditions.',
  'Pointer-lock cleanup used the standard browser API after synthesized Escape did not release it; actual human Escape is not established by that automation.',
];
const report = {
  checkedAt: new Date().toISOString(),
  project: 'Yunlan (云澜)',
  authorship:
    'Supergence native model and workspace/terminal tools authored and repaired city implementation and support scripts. Codex authored platform fixes, briefs, failure feedback and independent evaluation/report code only.',
  model: {
    configuredAlias: 'opus-4.6',
    observedResponseModel: 'deepseek-v4.1-flash',
    attribution: 'User router alias; not proof of Anthropic Opus or an ensemble.',
  },
  stats: browser.state.stats,
  acceptance: {
    nativeSmoke: smoke.summary,
    independentBrowserChecks: {
      total: browser.deep.checks.length,
      passed: browser.deep.checks.filter((x) => x.passed).length,
    },
    independentGLB: glb,
    textures,
    portable,
    placement,
    geometry,
  },
  performance: streets.captures.map(({ name, fps, wallMs, frames, drawCalls, triangles }) => ({
    name,
    fps,
    wallMs,
    frames,
    drawCalls,
    triangles,
  })),
  renderer: browser.state.renderer,
  artifacts,
  limitations,
  preservedEvidence: {
    nativeToolRuns: 'test-results/project-workflow/native-tool-runs',
    nativeConversationRuns: 'test-results/project-workflow/native-runs',
    browser: path.relative(process.cwd(), browser.screenshot).replace(/\.png$/, '.json'),
  },
};
await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
await fs.writeFile(path.join(out, 'native-smoke.json'), JSON.stringify(smoke, null, 2));
await fs.copyFile(
  'test-results/project-workflow/city-browser/first-render.json',
  path.join(out, 'browser-checks.json'),
);
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const url = '../projects/yunlan-canal-city-f9cb7644/';
const minFps = Math.min(...report.performance.map((p) => p.fps));
const maxFps = Math.max(...report.performance.map((p) => p.fps));
await fs.writeFile(
  path.join(out, 'index.html'),
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Yunlan — verified delivery</title><style>
*{box-sizing:border-box}body{margin:0;background:#10191d;color:#e7edec;font:16px/1.6 system-ui,sans-serif}main{max-width:1160px;margin:auto;padding:48px 24px}h1{font-size:clamp(32px,5vw,60px);line-height:1.1;margin:12px 0}h2{margin-top:40px}p{max-width:900px;color:#c6d2d2}a{color:#90dccd}nav{display:flex;flex-wrap:wrap;gap:12px;margin:24px 0}nav a{padding:10px 17px;border:1px solid #49645f;border-radius:8px;text-decoration:none}.lead{font-size:21px}.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px}.fact{padding:18px;background:#1c2a2e;border:1px solid #324549;border-radius:10px}.fact b{display:block;font-size:27px;color:#c8e7d8}.tag{letter-spacing:.14em;color:#8ccdbc;font-size:13px}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:20px}figure{margin:0}img{width:100%;border-radius:9px;display:block;border:1px solid #3b5155}figcaption{padding:8px 0;color:#b6c7c8;font-size:14px}table{width:100%;border-collapse:collapse}td,th{padding:12px;text-align:left;border-bottom:1px solid #33474c;vertical-align:top}code{overflow-wrap:anywhere;font-size:12px}li{margin:12px 0}footer{margin-top:36px;border-top:1px solid #33474c;padding-top:16px;color:#94a9ac}pre{overflow:auto;padding:18px;background:#1c2a2e;border-radius:8px}</style><main>
<div class="tag">SUPERGENCE · NATIVE WORKSPACE RESULT · 26 OCTOBER 2026</div><h1>云澜 / Yunlan</h1><p class="lead">An explorable Jiangnan-inspired city, with source, textures and a full-detail native 3D export.</p><p>The functional and portable-delivery checks pass. The visual result is still a procedural prototype; the original photorealistic target remains partly unmet.</p>
<nav><a href="${url}dist/index.html">Explore city</a><a href="${url}exports/yunlan-city.glb" download>Download GLB · ${(artifacts[0].bytes / 1e6).toFixed(1)} MB</a><a href="${url}exports/yunlan-source.zip" download>Source + assets · ${(artifacts[1].bytes / 1e6).toFixed(2)} MB</a><a href="${url}README.md">Standalone guide</a><a href="report.json">Evidence JSON</a></nav>
<div class="facts"><div class="fact"><b>${report.stats.buildings.toLocaleString('en-US')}</b>buildings · five districts</div><div class="fact"><b>${(glb.structure.triangles / 1e6).toFixed(2)} million</b>exported triangles</div><div class="fact"><b>${textures.count}</b>embedded / extracted PNGs</div><div class="fact"><b>${smoke.summary.passed}/${smoke.summary.total}</b>native Chrome smoke checks</div></div>
<h2>Actual captured results</h2><div class="gallery">${captures.map(([label, , name]) => `<figure><a href="${name}"><img src="${name}" loading="lazy" alt="${esc(label)} in the actual city build"></a><figcaption>${esc(label)} · real Chrome capture</figcaption></figure>`).join('')}</div>
<h2>What was verified</h2><table><tr><th>Check</th><th>Observed result</th></tr><tr><td>City behavior</td><td>${browser.deep.checks.length}/${browser.deep.checks.length} independent checks: district views, traffic pause/resume, real keyboard movement, both main bridge crossings, both public entries, navigable spawn and night mode.</td></tr><tr><td>Native project test</td><td>${smoke.summary.passed}/${smoke.summary.total}; no page errors, app errors or failed resources. Controlled physics-loop checks are distinct from real keyboard input.</td></tr><tr><td>Independent GLB loader</td><td>${glb.structure.meshes} meshes; ${glb.structure.materials} materials; all ${glb.structure.images} images embedded; no external image/buffer URIs; zero nonfinite positions, normals or UVs.</td></tr><tr><td>Clean portability test</td><td>ZIP extracted outside the SIS repository; fresh npm install; build resolves Three.js and esbuild from that temporary project's own node_modules; native test ${portable.smoke.summary.passed}/${portable.smoke.summary.total}.</td></tr><tr><td>Geometry regressions</td><td>All six rigid-placement cases pass; zero invalid source coordinates, UVs or normals. Sampled bridge foot/surface discrepancy under 8.5 cm.</td></tr><tr><td>Performance sample</td><td>${minFps.toFixed(1)}–${maxFps.toFixed(1)} FPS in five controlled street/interior fixtures, each measured over at least 2.5 seconds of wall time. ${esc(report.renderer)}. No general device guarantee.</td></tr></table>
<h2>Run the source independently</h2><pre>npm install
npm run build
npm run serve
npm test
npm run export
node tools/extract-textures.mjs
npm run package</pre><p>Read the server's printed URL. Node.js ≥22.13 is recommended; Google Chrome is required for the browser test and export. The source ZIP and GLB are separate downloads. The ZIP includes build source, tooling, textures, bundled preview, documentation and reports.</p>
<h2>Authorship and scope</h2><p>${esc(report.authorship)}</p><p>The configured alias is <code>opus-4.6</code>; the observed upstream response model is <code>deepseek-v4.1-flash</code>. This does not establish Anthropic Opus execution or ensemble behavior. No model-parity claim is made.</p><h2>Remaining limits</h2><ul>${limitations.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
<h2>Artifact integrity</h2>${artifacts.map((a) => `<p><strong>${a.name}</strong> · ${a.bytes.toLocaleString('en-US')} bytes<br><code>SHA256 ${a.sha256}</code></p>`).join('')}<p><a href="native-smoke.json">Native smoke evidence</a> · <a href="browser-checks.json">Independent browser evidence</a> · <a href="report.json">Full report, measurements and hashes</a></p><footer>Earlier failed generation, repair and export attempts remain preserved in the workspace. No failed attempt was relabelled as a one-shot success. Report generated ${esc(report.checkedAt)}.</footer></main>`,
);
console.log(
  JSON.stringify({
    report: path.join(out, 'index.html'),
    artifacts,
    nativeSmoke: smoke.summary,
    independentChecks: browser.deep.checks.length,
    portable: portable.passed,
  }),
);
