# Creation quality: implementation and evidence

Supergence uses the configured `qwen/qwen3.8-27b` provider for these runs. The local workspace is `workspace/supergence`; the real app exposes it through Local creation studio and the workspace browser. The studio links to the generated quality evidence page when that page exists.

## Changes

- Replaced the stock-template “split game generation” path with actual brief-specific model generation, syntax checks, bounded repair and Chrome execution. Removed unsupported automatic 60 FPS and visual-quality claims.
- Added complete-document generation and exact source repair tools. Generation saves actual returned model, finish reason, usage and raw output receipts. Repairs require unique exact matches, validate the resulting document before saving, and reject concurrent source changes. Browser tests remain a separate requirement.
- Focused the orchestration prompt and tool schemas on the current task. Completed source writes use digest references in active context. Older source observations are paged out with explicit notices; original user requirements, failed check diagnostics and full turn records remain available. Source reads default to a bounded line range.
- Preserved the full user brief across provider retries and generation handoffs. Removed hidden GPT-OSS/model substitutions and silent requirement clipping. Provider capacity failures are surfaced honestly.
- Fixed preview import-map injection: new local Three.js projects now resolve core and addons to the same installed version. Explicit project mappings and scopes survive preview. The former unconditional CDN rewrite mixed older core objects with installed addons and broke reflection rendering.
- Added real invoice and articulated-lamp browser acceptance suites, screenshot critique, controlled gameplay actions, and public-source comparison scripts. No subjective visual score or frontier-model parity is inferred from passing checks.

## Saved evidence

The current evidence viewer is `workspace/supergence/quality/index.html`, with machine-readable `report.json`. Regenerate it from receipts using:

```powershell
node scripts/benchmarks/creation-evidence.mjs
```

The Qwen lunar game in `qwen-app-lunar-v7` passes keyboard thrust/steering/pause/restart checks. Its implementation-specific depth harness completes a landing through normal keyboard input, exercises crash/retry and score persistence, and verifies that a synthetic Web Audio microphone stream affects the actual analyser and flight physics. Real microphone hardware and human speech remain unverified.

The invoice in `qwen-invoice-tool-v1` passed all 12 published checks after observed repairs, including its final repair through the normal Supergence chat/tool loop. The lamp in `qwen-lamp-system-v1` passed all 9 scene/control checks after observed repairs. Read the exact verification receipts and screenshots in those directories; passing behavior does not establish artistic quality.

Earlier failed trials remain under `workspace/supergence/benchmarks`, including incomplete documents and provider context errors. These were repeated development trials, not an authenticated, matched one-shot model ranking. The successful final repair does not prove every future creation will succeed.

## Reproduce

Start `npm run server` and use its actual startup URL; the examples below use the currently observed port 3009.

```powershell
node scripts/benchmarks/creative-quality.mjs --base-url http://localhost:3009 --systems supergence --tasks invoice,articulated-lamp --run your-new-run
node scripts/benchmarks/lunar-depth.mjs workspace/supergence/benchmarks/qwen-app-lunar-v7
node scripts/benchmarks/public-lunar-scream.mjs --qwen-file workspace/supergence/benchmarks/qwen-app-lunar-v7/index.html --qwen-adapter qwen-v7 --output workspace/supergence/benchmarks/your-comparison
$env:SIS_BASE_URL='http://localhost:3009'
node tests/browser/creation-studio.mjs
```

The public Opus 5.5 and GPT-6 Astra builds come from [Ultra's Lunar Scream experiment](https://ultra.dev/projects/lunar-scream) and its [pinned MIT source repository](https://github.com/ultradotdev/lunar-scream/tree/8905fc36575a2960b5edbe380e3a920b3831b761). Original tracked source hashes are checked before comparison. Model labels are creator-reported; authenticated API transcripts/settings are unavailable. Public originals and the repaired Supergence system have different workflows. The comparison reports observed controls and screenshots, not a universal quality ranking.

## 3D architecture and games

The app studio also links to `workspace/supergence/quality/3d/index.html`. The current detailed museum passes 16 acceptance checks and the rooftop game passes 13, including normal keyboard completion and post-victory restart. The repaired workshop passes 13 and the integrated canal game passes 11. Nine additional checks measure actual floor connections, door voids, sawtooth roof endpoints, stair entry clearance, aligned handrails/stringers and retained detail after batching. Five Chrome touch checks cover movement, jumping and completing the delivery route. Physical phone testing is deferred at the user's request.

`generate_browser_app` accepts `oneShot: true` to suppress the automatic syntax retry and returns its generation-call count. Preserve the original file and raw generation receipt before repairing a copy. Three original strict development attempts failed. Two new briefs, oracle and generator were frozen before execution in `holdout-20261024`: the unchanged workshop passes 13/13 after documented evaluator corrections; the canal strict attempt fails 2/11. The original evaluator result and oracle are preserved. These are small development holdouts with task-family overlap, not independent certification or a general reliability estimate.

`generate_browser_project` builds a new empty directory through four model stages: API/design plan, materials module, model factories and experience module. Named-export/API validation, bounded compiler retries and real Chrome preflight protect integration. The shared renderer host binds actual existing control IDs to matching test selectors; no substitute controls or success state are generated by that binding. Every prompt, raw model response, usage record and repair remains in `project-generation.json` or exact-patch receipts. This multi-call autonomous build is distinct from strict single-call output. Original failed module/plan attempts remain available in the evidence viewer.

The exact repair tool supports HTML and JavaScript modules, rejects ambiguous searches and concurrent source changes, and validates syntax before saving. Large directory listings are paginated, binary assets are rejected by the text reader, and input-capacity recovery can page source/listing observations to explicit digest references while retaining requirements and failed-check evidence. It retries inference once; it never repeats a completed action.

The detailed rooftop game completed six delivery/restart cycles during a real 120-second desktop soak. Median browser frame interval was 16.7ms and p95 was 32.4ms on the measured Intel UHD/i3-1315U machine. Read `extended-soak.json` for raw samples and resource growth during warm-up. This is not a GPU-only timing, physical-phone measurement or leak-freedom proof.

`client/scripts/three-creation-kit.js` supplies reusable geometry rather than a finished scene: walls with actual openings, two-flight return stairs with landings/rails, gallery wings and camera framing from object bounds. Gallery structure and roof groups need the same placement. Stair `rise` is total floor height; `landing` is a positive numeric length; steps must be even and between 12 and 48. Actual browser ray tests verify doorway voids, solid walls, stair rise/direction and desktop/phone camera framing.

The new `courtyard-museum` and `skyline-courier` suites are available through the normal app verifier. These named suites require their published brief and inspection hooks; arbitrary architecture/game tasks need appropriate tests of their own. They inspect actual scene/simulation references. Rendering, geometry and controls checks do not certify architectural design, photorealism or AAA game quality. Visual inspection found roof placement, a capped pool and an incorrectly scaled tree even while the museum's controls passed, and guided additional model repairs.

```powershell
$env:SIS_BASE_URL='http://localhost:3009' # use the actual startup banner
node tests/browser/three-creation-kit.mjs
node tests/browser/three-detail-kit.mjs
node scripts/benchmarks/three-depth.mjs --task courtyard-museum --phase detailed --base-url $env:SIS_BASE_URL
node scripts/benchmarks/three-depth.mjs --task skyline-courier --phase detailed --base-url $env:SIS_BASE_URL
$env:SIS_CREATION_PHASE='detailed'
node scripts/benchmarks/three-interactions.mjs
node scripts/benchmarks/three-extended.mjs
node scripts/benchmarks/three-evidence.mjs
node scripts/benchmarks/three-app-check.mjs
```

The last command runs an actual configured-model app chat that verifies the existing museum without modifying it and requires a completed conversation with passing tool evidence. For fresh trials freeze a unique manifest before generation with `three-holdout.mjs --mode freeze --run UNIQUE_NEW_RUN`; the runner refuses to overwrite generation receipts. Source hashes and dependency snapshots accompany verification reports. Public Opus Pelican and Astra Paper Route creator deployments are references from different briefs and iterative workflows. Paper Route remained on its loading screen during the bounded browser observation, so its gameplay is explicitly unverified. No direct frontier-model parity claim is made.
