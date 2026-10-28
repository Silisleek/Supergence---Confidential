import fs from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('workspace');
const out = path.join(root, 'supergence/quality');
await fs.mkdir(out, { recursive: true });
const read = async (p) => {
  try {
    return JSON.parse(await fs.readFile(path.join(root, p), 'utf8'));
  } catch {
    return null;
  }
};
const escape = (text) =>
  String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('"', '&quot;');
const url = (p) => '/workspace/' + p;
const comparisonPath =
  'supergence/benchmarks/public-lunar-scream/observations/qwen-app-v7/comparison.json';
const comparison = await read(comparisonPath);
const depthPath = 'supergence/benchmarks/qwen-app-lunar-v7/depth/report.json';
const depth = await read(depthPath);
const fixtures = [
  {
    id: 'invoice',
    title: 'Invoice editor',
    folder: 'supergence/benchmarks/qwen-invoice-tool-v1',
    description:
      'Decimal quantity/rate math, tax rounding, CSV export, persistence, invalid input, removal and phone layout.',
  },
  {
    id: 'articulated-lamp',
    title: 'Articulated brass lamp',
    folder: 'supergence/benchmarks/qwen-lamp-system-v1',
    description:
      'Actual WebGL geometry, procedural walnut, joint/light/camera controls, reset and phone layout.',
  },
];
for (const fixture of fixtures) {
  const verification =
    (await read(fixture.folder + '/verification-final.json')) ||
    (await read(fixture.folder + '/verification.json'));
  fixture.verification = verification?.result || verification;
  const turn =
    (await read(fixture.folder + '/repair-turn-final.json')) ||
    (await read(fixture.folder + '/repair-turn.json'));
  fixture.repair = { finished: !!turn && !turn.error, error: turn?.error || null };
  fixture.receipts = (await fs.readdir(path.join(root, fixture.folder))).filter((name) =>
    /\.repair-\d+\.json$/.test(name),
  );
}
const report = {
  createdAt: new Date().toISOString(),
  model: 'qwen/qwen3.8-27b',
  comparisonPath,
  comparison,
  depthPath,
  depth,
  fixtures,
  limits: [
    'Public model attributions are creator-reported, without authenticated API transcripts or matched inference settings.',
    'Public outputs and Qwen use different generation workflows. System development involved repeated failed trials; this is not a controlled one-shot ranking.',
    'Keyboard smoke checks use a controlled animation clock and unchanged game physics. Qwen depth tests use normal controls and read-only observation of its implementation.',
    'Synthetic microphone integration is tested; real microphone hardware and human speech are unverified.',
    'Behavior checks do not measure subjective artistic quality or establish parity with frontier models.',
  ],
};
await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
const checks = (list) =>
  `<ul class="checks">${(list || []).map((c) => `<li class="${c.passed ? 'pass' : 'fail'}">${c.passed ? '✓' : '✕'} ${escape(c.name)}${c.error ? `<details><summary>Observed failure</summary><pre>${escape(c.error)}</pre></details>` : ''}</li>`).join('')}</ul>`;
const gameCards = (comparison?.results || [])
  .map((r) => {
    const original = r.id.startsWith('public-');
    const play = original
      ? `supergence/benchmarks/public-lunar-scream/${r.adapter === 'opus' ? 'opus-5.5' : 'gpt6-astra'}/index.html`
      : 'supergence/benchmarks/qwen-app-lunar-v7/index.html';
    const o = r.observations || {};
    return `<article><div class="eyebrow">${original ? 'Public creator output' : 'Supergence • generated with Qwen'}</div><h3>${escape(r.id)}</h3><a href="${url(play)}"><img src="${url(path.posix.dirname(comparisonPath) + '/' + r.screenshots.started)}" alt="Actual started gameplay screenshot"></a><p>Keyboard thrust: ${o.thrust?.upwardVelocityEffect ? 'passed' : 'unverified'} · steering: ${o.steering?.changed ? 'passed' : 'unverified'} · pause: ${o.pause?.positionHeld ? 'passed' : 'unverified'} · restart: ${o.restart?.returnedNearInitialPosition ? 'passed' : 'unverified'}</p><a class="button" href="${url(play)}">Play implementation ↗</a></article>`;
  })
  .join('');
const fixtureCards = fixtures
  .map(
    (f) =>
      `<article><div class="eyebrow">Qwen creation + observed repair</div><h3>${f.title}</h3><p>${f.description}</p><p><strong>${f.verification?.passedChecks ?? 0}/${f.verification?.totalChecks ?? 0} executed checks passed</strong></p>${f.verification?.screenshots?.desktop ? `<a href="${url(f.folder + '/index.html')}"><img src="${escape(f.verification.screenshots.desktop)}" alt="Actual tested ${f.title}"></a>` : ''}${checks(f.verification?.checks)}<a class="button" href="${url(f.folder + '/index.html')}">Open creation ↗</a> <a href="${url(f.folder + '/verification-final.json')}">Browser report</a><details><summary>Actual Qwen repair receipts</summary>${f.receipts.map((name) => `<p><a href="${url(f.folder + '/' + name)}">${escape(name)}</a></p>`).join('')}</details></article>`,
  )
  .join('');
await fs.writeFile(
  path.join(out, 'index.html'),
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Supergence • creation evidence</title><style>
:root{color-scheme:light;--ink:#172f32;--muted:#536c6e;--line:#ccd7d2;--paper:#f3f5ed;--accent:#146555}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.6 system-ui,sans-serif}main{max-width:1500px;margin:auto;padding:clamp(22px,5vw,70px)}header{max-width:1000px}h1{font:clamp(40px,5vw,72px)/1.08 Georgia,serif;letter-spacing:-.035em;margin:20px 0}h2{font:34px Georgia,serif;margin-top:65px}h3{font:24px Georgia,serif;margin:10px 0 18px}.eyebrow{text-transform:uppercase;font-size:11px;letter-spacing:.16em;color:var(--muted)}.lede{font-size:20px;max-width:850px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:22px}article{padding:24px;border:1px solid var(--line);border-radius:16px;background:#fffef8;min-width:0}img{display:block;width:100%;height:280px;object-fit:contain;background:#10161c;border-radius:8px}a{color:var(--accent);text-underline-offset:4px}.button{display:inline-block;padding:10px 17px;border:1px solid var(--accent);border-radius:7px;text-decoration:none;margin:8px 8px 8px 0}.checks{list-style:none;padding:0}.checks li{margin:8px 0;border-bottom:1px solid #e4e9e0;padding-bottom:8px}.pass{color:#145b41}.fail{color:#9a3729}.notice{padding:20px 26px;background:#e7eddf;border-left:4px solid var(--accent);margin:28px 0}.limits{color:var(--muted);max-width:1000px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}footer{margin-top:60px;border-top:1px solid var(--line);padding-top:20px;font-size:13px;color:var(--muted)}</style><main>
<header><div class="eyebrow">Supergence / local quality lab / Qwen 3.8–27B</div><h1>Working creations.<br>Inspectable evidence.</h1><p class="lede">Real generated files, real Chrome checks, and preserved public examples. Open the builds, inspect their screenshots, and read what passed or failed.</p></header>
<div class="notice">This is a development evidence report, not a claim that Supergence matches or beats Opus or Astra. Failed trials remain saved alongside the final builds. <a href="3d/index.html">Explore the 3D architecture and games lab →</a></div>
<h2>Same public game brief, three implementations</h2><p>“Build a scream-powered lunar lander as a playable browser game. Make it absurd and fun.” Public builds from <a href="https://ultra.dev/projects/lunar-scream">Ultra's Lunar Scream experiment</a>, preserved from <a href="https://github.com/ultradotdev/lunar-scream/tree/8905fc36575a2960b5edbe380e3a920b3831b761">the pinned source repository</a>. Attribution is creator-reported. <a href="${url(comparisonPath)}">Raw comparison</a> · <a href="${url('supergence/benchmarks/public-lunar-scream/provenance.json')}">Source hashes and provenance</a>.</p><div class="grid">${gameCards}</div>
<h2>Game behavior beyond a smoke test</h2><p>Qwen's implementation also went through a full landing using a keyboard feedback controller, crash/retry, saved score, phone controls, and synthetic microphone integration.</p>${checks(depth?.checks)}<a href="${url(depthPath)}">Full depth-test report</a>
<h2>Real-world task depth</h2><div class="grid">${fixtureCards}</div>
<h2>What this evidence can establish</h2><ul class="limits">${report.limits.map((x) => `<li>${escape(x)}</li>`).join('')}</ul><footer>Generated ${escape(report.createdAt)} from saved execution receipts. <a href="report.json">Machine-readable evidence</a>. Run <code>node scripts/benchmarks/creation-evidence.mjs</code> after new tests to refresh.</footer></main></html>`,
);
console.log(path.join(out, 'index.html'));
