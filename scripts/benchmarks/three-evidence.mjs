import fs from 'node:fs/promises';
import path from 'node:path';
const out = 'workspace/supergence/quality/3d';
const read = async (p) => JSON.parse(await fs.readFile(p, 'utf8'));
const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const link = (url, label) => `<a href="${esc(url)}">${esc(label)}</a>`;
const runs = [];
for (const [title, folder, description, image] of [
  [
    'Cedar Court museum',
    '3d-depth-20261023/courtyard-museum/detailed',
    'Two furnished gallery floors, original art, spot fixtures, actual openings and connected return stairs.',
    'museum-gallery-detail.png',
  ],
  [
    'Skyline Courier',
    '3d-depth-20261023/skyline-courier/detailed',
    'An articulated courier, moving rooftop fans, layered city detail and a complete delivery/restart loop.',
    'game-robot-detail.png',
  ],
  [
    'Northlight Workshop',
    'artist-refined/northlight-workshop',
    'A furnished maker hall with three repaired sawtooth pitches, a clear stair entry and a 3m mezzanine.',
    'workshop-refined-interior.png',
  ],
  [
    'Canal Rescue',
    'project-host-integration/canal-rescue',
    'A detailed rescue boat with acceleration, inertia, braking, bank collisions, rescue/delivery and restart.',
    'canal-rescue-detail.png',
  ],
]) {
  const directory = `workspace/supergence/benchmarks/${folder}`;
  runs.push({
    title,
    folder,
    description,
    image,
    verification: await read(`${directory}/verification.json`),
    receipts: (await fs.readdir(directory)).filter(
      (n) => /generation|repair-/.test(n) && n.endsWith('.json'),
    ),
  });
}
const strict = [];
for (const [run, task, phase, file] of [
  ['3d-depth-20261023', 'courtyard-museum', 'first-attempt', 'verification.json'],
  ['3d-depth-20261023', 'skyline-courier', 'first-attempt', 'verification.json'],
  ['3d-kit-oneshot-20261023', 'courtyard-museum', 'first-attempt', 'verification.json'],
  ['holdout-20261024', 'northlight-workshop', 'strict', 'verification-reassessed.json'],
  ['holdout-20261024', 'canal-rescue', 'strict', 'verification.json'],
]) {
  const folder = `${run}/${task}/${phase}`;
  strict.push({
    run,
    task,
    phase,
    folder,
    file,
    verification: await read(`workspace/supergence/benchmarks/${folder}/${file}`),
  });
}
const interactions = await read(`${out}/interactions.json`),
  geometry = await read(`${out}/extended-geometry.json`),
  soak = await read(`${out}/extended-soak.json`);
const scope = await read(`${out}/scope-decisions.json`);
const loadObservation = await read(`${out}/load-observation.json`);
const report = {
  createdAt: new Date().toISOString(),
  model: 'qwen/qwen3.8-27b',
  runs,
  strict,
  interactions,
  geometry,
  soak,
  scope,
  loadObservation,
  methodology:
    'Current development builds are tested separately from preserved first attempts. The modular generator uses four generation stages and bounded runtime repair, plus shared host infrastructure; it is not a single model call. Model outputs, runtime repairs and human-authored infrastructure are identified in receipts. New frozen briefs have task-family overlap. Acceptance counts are task-specific, not an intelligence or visual-quality score.',
  remainingLimits: [
    `First-load latency remains variable under memory pressure. A 30s navigation timeout was observed; the later museum run reached document readiness in ${(loadObservation.currentAttempt.documentReadyMs / 1000).toFixed(1)}s and then passed 16/16 behavioral checks. See load-observation.json and the machine-readable report for the retained observation.`,
    'Consistent first-call success is not established: one of the two new strict attempts passes behavioral acceptance; the other fails. The three earlier strict failures are preserved.',
    'Visual polish is still uneven. These are stylized development builds, not demonstrated photorealism or AAA production quality. The workshop exterior and material transitions remain simpler than the public references.',
    'Measured doorway, floor, roof and stair checks cover specified paths, not every possible route or architectural/code compliance.',
    'Public Opus/Astra deployments use different briefs, assets and iterative workflows. No matched authenticated comparison establishes frontier-model parity.',
    'Desktop soak and emulated touch do not establish universal reliability, long-session leak freedom or physical phone performance. Physical phone tests are deferred by user choice.',
  ],
};
await fs.writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
const checks = (list) =>
  `<ul class="checks">${list.map((c) => `<li class="${c.passed ? 'pass' : 'fail'}">${c.passed ? '✓' : '✕'} ${esc(c.name)}${c.error ? `<pre>${esc(c.error)}</pre>` : ''}</li>`).join('')}</ul>`;
const root = (folder) => `/workspace/supergence/benchmarks/${folder}`;
const score = (v) => `${v.passedChecks}/${v.totalChecks}`;
const cards = runs
  .map(
    (r) =>
      `<article><p class="eyebrow">Tested development build</p><h2>${esc(r.title)}</h2><a href="${root(r.folder)}/index.html"><img src="${r.image}" alt="Actual Chrome capture of ${esc(r.title)}"></a><p>${esc(r.description)}</p><p class="result">${score(r.verification)} behavioral checks passed</p>${link(`${root(r.folder)}/index.html`, 'Open interactive build ↗')} · ${link(`${root(r.folder)}/verification.json`, 'Evidence')}<details><summary>Executed checks and source receipts</summary>${checks(r.verification.checks)}${r.receipts.map((n) => `<p>${link(`${root(r.folder)}/${n}`, n)}</p>`).join('')}</details></article>`,
  )
  .join('');
const strictRows = strict
  .map(
    (r) =>
      `<tr><td>${esc(r.task)}<small>${esc(r.run)}</small></td><td class="${r.verification.passed ? 'pass' : 'fail'}">${score(r.verification)}</td><td>${link(`${root(r.folder)}/index.html`, 'Preserved source')} · ${link(`${root(r.folder)}/${r.file}`, 'Original evidence / reassessment')}</td></tr>`,
  )
  .join('');
const p = soak.performance;
const thumbs = [
  ['museum-open-roof.png', 'Museum cutaway'],
  ['museum-night.png', 'Museum at night'],
  ['game-wide-detail.png', 'Rooftop city'],
  ['game-phone-victory.png', 'Emulated touch victory'],
  ['workshop-refined-hero.png', 'Closed sawtooth roof'],
  ['workshop-refined-mezzanine.png', 'Mezzanine and stair entry'],
]
  .map(
    ([image, title]) =>
      `<figure><a href="${image}"><img src="${image}" alt="Actual Chrome capture: ${esc(title)}"></a><figcaption>${esc(title)}</figcaption></figure>`,
  )
  .join('');
await fs.writeFile(
  `${out}/index.html`,
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Supergence · tested 3D studio</title><style>
*{box-sizing:border-box}body{margin:0;background:#101b20;color:#e7eae2;font:16px/1.65 system-ui,sans-serif}main{max-width:1500px;margin:auto;padding:clamp(18px,4vw,64px)}h1{font:clamp(40px,6vw,80px)/1.07 Georgia,serif;max-width:1050px;margin:.35em 0}h2{font:30px/1.2 Georgia,serif}h3{font-size:18px}p{max-width:950px}a{color:#bce0ca;text-underline-offset:4px}small{display:block;color:#a9bbb9;font-size:12px;overflow-wrap:anywhere}.eyebrow{color:#a6cdbb;letter-spacing:.14em;text-transform:uppercase;font-size:12px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr));gap:24px}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:20px}article{background:#1a2b30;border:1px solid #3d5456;padding:24px;border-radius:14px;min-width:0}img{width:100%;display:block;object-fit:contain;background:#0b1419;border-radius:8px;aspect-ratio:3/2}.hero{aspect-ratio:3/2;max-height:660px;object-fit:cover;object-position:center}figure{margin:0;min-width:0}figcaption{font-size:13px;color:#b5c8c3;padding:10px 0}.notice{border-left:4px solid #d7b781;background:#293335;padding:18px 24px;margin:28px 0}.result,.pass{color:#b6dfc1}.fail{color:#f0b0a2}.checks{padding-left:20px}li{padding:4px 0}section{margin-top:52px}details{margin-top:18px}summary{cursor:pointer}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}table{width:100%;border-collapse:collapse;font-size:14px}td,th{padding:14px 10px;text-align:left;vertical-align:top;border-bottom:1px solid #3d5456;overflow-wrap:anywhere}footer{margin-top:45px;font-size:13px;color:#a4b8b3}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;margin:25px 0}.stat{background:#1a2b30;padding:18px;border-radius:10px}.stat strong{font-size:27px;display:block}.stat span{font-size:12px;color:#b5c8c3}code{overflow-wrap:anywhere}@media(max-width:600px){article{padding:17px}td,th{padding:10px 5px;font-size:12px}.hero{object-fit:contain}h2{font-size:26px}}
</style><main>${link('../index.html', '← Creation evidence')}<p class="eyebrow">Supergence / Qwen 3.8–27B / local 3D studio</p><h1>More detail.<br>Evidence beyond a screenshot.</h1><p>Four playable or explorable builds, tested in real Chrome. New tools split substantial projects into materials, model factories and experience modules, then run rendering preflight. Exact source repair and visual inspection address defects that a successful load cannot detect.</p><a href="${root(runs[0].folder)}/index.html"><img class="hero" src="museum-gallery-detail.png" alt="Cedar Court gallery interior with original framed artworks, sculpture, benches and spot fixtures"></a><div class="stats"><div class="stat"><strong>${runs.reduce((n, r) => n + r.verification.passedChecks, 0)}/${runs.reduce((n, r) => n + r.verification.totalChecks, 0)}</strong><span>Current task-specific behavioral checks</span></div><div class="stat"><strong>${geometry.checks.filter((c) => c.passed).length}/${geometry.checks.length}</strong><span>Additional actual geometry/detail checks</span></div><div class="stat"><strong>${interactions.checks.filter((c) => c.passed).length}/${interactions.checks.length}</strong><span>Emulated phone touch checks</span></div><div class="stat"><strong>${soak.completedCycles} cycles</strong><span>Delivery / restart during a real 120s soak</span></div></div><div class="notice">Passing behavior does not certify visual excellence. These are development results with retained failures and repairs. Strict single-call results appear separately below.</div><div class="grid">${cards}</div>
<section><p class="eyebrow">Addressing the earlier gaps</p><h2>What changed, and what the evidence supports</h2><table><thead><tr><th>Earlier gap</th><th>Measured progress</th><th>Status / scope</th></tr></thead><tbody>
<tr><td>All strict attempts failed</td><td>One new unchanged workshop output passes ${score(strict[3].verification)} after documented evaluator corrections; canal strict remains ${score(strict[4].verification)}.</td><td>Improved; consistent one-call reliability remains open.</td></tr>
<tr><td>Only repeated briefs</td><td>Two new briefs, generator versions and oracle were frozen before execution. All failures were preserved.</td><td>New development holdouts with task-family overlap; too small for a general reliability estimate. ${link('/workspace/supergence/benchmarks/holdout-20261024/manifest.json', 'Frozen manifest')}</td></tr>
<tr><td>Controls alone did not establish geometry</td><td>Real doorway rays, gallery/bridge floor heights, 18 stair treads, roof endpoints, clear mezzanine entry and aligned rail/stringer endpoints.</td><td>Specified paths checked. Architecture/code compliance and every possible route are outside these checks. ${link('extended-geometry.json', 'Measurements')}</td></tr>
<tr><td>Human geometry kit versus model authorship</td><td>Human code supplies rendering host, validators and optional primitives. Qwen writes project materials, models and experience modules; every compiler/repair call is retained.</td><td>Provenance disclosed. The new strict workshop writes its scene geometry without the custom geometry kit. Infrastructure is not counted as model-generated work.</td></tr>
<tr><td>Physical phone testing</td><td>Real Chrome emulates touch movement, jump, full route completion and viewport checks.</td><td>Physical hardware deferred by user choice. ${link('scope-decisions.json', 'Scope record')}</td></tr>
</tbody></table></section>
<section><h2>Geometry and close views</h2><div class="gallery">${thumbs}</div><details><summary>All extra geometry/detail checks</summary>${checks(geometry.checks)}</details>${link('extended-geometry.json', 'Actual measurements')} · ${link('interactions.json', 'Touch interaction report')}</section>
<section><h2>Measured desktop performance</h2><p>Skyline Courier ran for ${(p.elapsedMs / 1000).toFixed(1)} real seconds across ${soak.completedCycles} completed delivery/restart cycles: ${p.observedFrames.toLocaleString('en-US')} observed animation intervals, median ${p.medianFrameMs.toFixed(1)}ms and p95 ${p.p95FrameMs.toFixed(1)}ms. No page errors were observed in that run.</p><p><small>${esc(soak.hardware.cpu)} · ${esc(soak.hardware.gpu.renderer)} · Chrome ${esc(soak.browser)}. These are browser frame intervals on this machine, not GPU-only timing or physical-phone results. Resource counts rose from ${p.initialMemory.geometries} to ${p.finalMemory.geometries} geometries and ${p.initialMemory.textures} to ${p.finalMemory.textures} textures during warm-up; this short test does not prove leak freedom.</small></p>${link('extended-soak.json', 'Raw frame and resource samples')}</section>
<section><h2>Single-call attempts, kept intact</h2><p>Each row used one generation call. The workshop reassessment corrected a default-view no-op assumption, accepted actual attached stair arrays and separated driver/deprecation warnings from rendering errors. Its original source and original failing report are retained. Later repairs do not count as first-call success.</p><table><thead><tr><th>Task / run</th><th>Passed</th><th>Evidence</th></tr></thead><tbody>${strictRows}</tbody></table><p>${link('/workspace/supergence/benchmarks/holdout-20261024/northlight-workshop/strict/verification.json', 'Original workshop evaluator result')} · ${link('/workspace/supergence/benchmarks/holdout-20261024/oracle-v1.js', 'Frozen original oracle')}</p><details><summary>Modular build failures and integration provenance</summary><p>The early workshop modular compiler requested tools in a source-only stage; the early canal plan truncated. Later canal materials compilation returned the wrong API and hit provider capacity. These attempts remain saved.</p><p>${link('/workspace/supergence/benchmarks/holdout-20261024/northlight-workshop/modular/project-generation.json', 'First workshop modular receipt')} · ${link('/workspace/supergence/benchmarks/holdout-20261024/canal-rescue/modular/project-generation.json', 'First canal modular receipt')} · ${link('/workspace/supergence/benchmarks/modular-development-v2/canal-rescue/modular/project-generation.json', 'Later failed compiler receipt')}</p><p>The working workshop/canal modules originally needed a shared host correction to bind real existing control IDs to test selectors. This was an infrastructure repair, not fresh generation. ${link('/workspace/supergence/benchmarks/project-host-integration/northlight-workshop/integration.json', 'Workshop provenance')} · ${link('/workspace/supergence/benchmarks/project-host-integration/canal-rescue/integration.json', 'Canal provenance')}</p></details></section>
<section><h2>Public frontier-model references</h2><p>Creator-reported Opus 5.5 and GPT-6 Astra projects provide useful visual targets. Their public workflows differ from these briefs and from a strict single model call. The Opus repository describes autonomous coding/build/test cycles; Paper Route’s devlog describes a substantial iterative project with Blender assets. These sources do not support a matched parity score.</p><div class="grid"><article><h3>Opus: Pelican deployment</h3><img src="opus-pelican.png" alt="Observed public Pelican browser deployment"><p>${link('https://games.xdullboy.com/pelican/', 'Public build')} · ${link('https://github.com/xiiyioozzz/opus55-3d-games/blob/main/README.md', 'Creator workflow')}</p></article><article><h3>Astra: Paper Route</h3><p>${link('https://www.paperroute.lol/play/', 'Public build')} · ${link('https://www.paperroute.lol/devlog/', 'Creator development log')}</p><p>The public play page remained on “Loading your neighbourhood” during the bounded browser observation. Its gameplay was not verified in that capture. No loading screen is presented as a successful gameplay comparison.</p>${link('astra-paperroute-ready.png', 'Observed loading capture')}</article></div><p>${link('extended-public.json', 'Public capture provenance')}</p></section>
<section><h2>Remaining limits</h2><ul>${report.remainingLimits.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></section><footer>Generated ${esc(report.createdAt)} from saved browser reports. ${link('report.json', 'Machine-readable evidence')} · ${link('app-check.json', 'Actual app integration')} · ${link('engineering-checks.json', 'Engineering checks')}</footer></main></html>`,
);
console.log(path.resolve(out, 'index.html'));
