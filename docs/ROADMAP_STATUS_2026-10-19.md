# SIS 1.0 — Superintelligence Roadmap: Real Progress Audit

**Date:** 2026-10-19
**Scope:** The 5-phase roadmap in `SIS_SUPERINTELLIGENCE_BLUEPRINT.md` §4
**Method:** Full source audit of `server/` (141 files, ~75k LOC) + state-file forensics + independent adversarial re-verification of the load-bearing claims.

---

## Headline

**The roadmap is not 5 partially-complete phases. It is 5 architecturally sound but unwired designs, sitting next to one system that is actually running and producing nothing.**

| Phase                       | Honest % done | The blocker                                                                                         |
| --------------------------- | ------------- | --------------------------------------------------------------------------------------------------- |
| 1. Container sandbox        | **~8%**       | `useDocker` is hardcoded `false` at every call site. Docker has never executed.                     |
| 2. LSP / Tree-sitter        | **~10%**      | `tree-sitter` is not a dependency. `ast-parser.js` is 6 regexes. `LspClient` is never instantiated. |
| 3. TDD + trajectory harvest | **~12%**      | Primitives are correct. The TDD loop is never called. 3.5% of DPO data is usable.                   |
| 4. Monolith decomposition   | **~5%**       | Zero `worker_threads`. Zero BullMQ/Redis. 31 timers on the main thread.                             |
| 5. Beam search / MCTS       | **~12%**      | `beam-search.js` is a real algorithm with zero production importers. MCTS does not exist.           |

Every one of these files exists, imports cleanly, and reads plausibly. That is exactly the failure mode your own blueprint warns about in §1.1 — the naming creates an illusion of infrastructure. `server/lsp/ast-parser.js` is not an AST parser. `server/search/beam-search.js` does not search. `server/trajectory/` logs 2% of the pipeline.

**The thing that is actually running is the RSI self-improvement loop, and its output is zero.**

---

## The cross-cutting finding (this is the real story)

Your `data/rsi/` state tells the story:

| Engine        | Cycles run                    | Verified output                          |
| ------------- | ----------------------------- | ---------------------------------------- |
| AlphaEvolve   | 3,004                         | **0** programs archived, peak speedup 0  |
| Absolute Zero | 3,514 proposed                | **0** solved, passRate `null`            |
| Red Queen     | 4,203 evaluations, 350 epochs | `discriminationScore: null`              |
| CLADE archive | 4,209 nodes                   | `highestRawScore: 14.25` on a 0–1 rubric |

**~11,700 LLM-driven cycles producing zero verified artifacts.** Meanwhile `logs/server.log` contains 13,048 AI Gateway events, of which 10,383 are "unavailable / falling back", 7,300 are 429 rate-limit, 3,161 are 410 "model deprecated" (all `mimo-v2.5-free`, which your `.env` still lists), and only **64** `Evolution complete` lines exist — 14 of them `PARTIAL`.

You were burning roughly 1,500 strand-cycles/day (~3,000–6,000 LLM calls/day, order 10⁷ output tokens/day) to move counters and store zeroes.

### But you already caught this — and the fix was good

On 2026-10-17 you ran a **verification fix**. The backups are still on disk:

- `data/rsi/alpha-evolve-programs.json.pre-verification-fix` — 1,408 programs, peak speedup 138.47x
- `data/rsi/azr-curriculum.json.pre-verification-fix` — `tasksSolvedVerifiably: 2958`
- `data/rsi/red-queen-evaluator.json.pre-verification-fix` — `discriminationScore: 0.99`

The pre-fix code (`temp-extract/server/rsi/alpha-evolve-engine.js`) is damning and worth reading as a lesson:

```js
let baselineNs = 600000;            // hardcoded default
let optimizedNs = 450000;
baselineNs = Math.max(1000, parsed.baselineNs || 600000);   // fabricated fallback
verified  = Boolean(parsed.verified ?? true);                // defaults to TRUE
} else if (sandboxRes.exitCode === 0) { verified = true; }   // exit 0 == "verified"
if (verified && speedup >= 1.05) { /* archive */ }            // no `equivalent` requirement
```

Forensics on the 1,408 archived programs confirms it: **only 92 unique code blobs across 1,408 entries**, 1,311 sharing the engine's own hardcoded algorithm, 157 carrying the exact `600000/450000` pair. 157 records with identical baselines cannot be independent measurements. The `red-queen` pre-fix score inflation was worse — `currentMasterScore * 1.07` on judge _failure_ (`autonomous-learner.js:1384-1389`), meaning the score rose when the judge broke.

**The reset was correct and you should keep it.** You deleted 1,408 fake programs, 2,958 fake solutions, and a fabricated 0.99 discrimination score. That was the single highest-value piece of engineering in this repo's recent history. Credit where due.

**But the fix is incomplete, and it introduced a new failure mode:**

1. **The measurement is still LLM-reported.** The engine prefers the LLM's "Depth Verifier" script over the deterministic harness (`alpha-evolve-engine.js:186-195`), then parses the JSON _that script printed_ and trusts it verbatim (`:221-241`). The engine never times anything itself — the only `hrtime` calls in `server/rsi/` are inside the generated template. An LLM-authored script that prints `{"baselineNs":138000,"optimizedNs":1000,"verified":true,"equivalent":true}` passes the gate and yields a 138x speedup. The gate is now _reachable but untrustworthy_ — before it was unreachable and fake.

2. **The deterministic fallback can never validate a novel algorithm.** `_buildMicroBenchmarkScript` (`:305-354`) requires the candidate to expose `optimizedWork|optimized|transform|process|solve` **and** produce a checksum byte-identical to a hardcoded bit-arithmetic reference. A BVH, a lock-free ring buffer, or a SIMD quaternion kernel _cannot_ match that checksum. So your deterministic path only ever validates re-implementations of the reference, and your novel-algorithm path only ever validates LLM-printed numbers. There is no path that measures a new algorithm honestly.

3. **AZR ground truth is LLM-defined.** The proposer LLM authors `testCases` with expected outputs (`absolute-zero-engine.js:84-95`); the harness compares solver output against those embedded expectations. The verification _computation_ is deterministic (`:362`), but the _ground truth_ is model-authored — still a violation of blueprint §1.2. The solver never sees the tests, which is good, but the tests are not independent either.

4. **The self-improvement system is currently dormant — and you may not know it.** `ENABLE_BACKGROUND_LLM_LOOPS` is **not in your `.env`**, and `rsiOrchestrator.start()` sits inside that gate (`brain.js:284-292`). So the RSI strands have not run since 2026-10-12. The tell: `data/rsi/alpha-evolve-programs.json` was rewritten today at 16:09 with `totalEvolutionsRun: 3004` and `lastEvolvedAt` still pointing at Oct 12 — that is the module-level `new AlphaEvolveEngine()` (`:385`) running `_load()` on import and re-saving. The server restarted today; the engines were constructed and never started. This is currently the right behaviour. Keep it off.

5. **Residual fake data.** `azr-curriculum.json` now holds `legacyUnverifiedTheorems: 500` — correctly quarantined — but `curriculumArchive` still contains 500 entries with `verified: true` and `testsPassed: 4` (the hardcoded value). The quarantine is incomplete.

---

## Phase-by-phase, with evidence

### Phase 1 — Sandbox: ~8%

**The Docker path has never run.** `useDocker` defaults to `false` (`container-runner.js:6`) and every construction site hardcodes it: `coder/sandbox.js:25`, `coder/sandbox.js:288`, `coding-expert-engine.js:22`, `tools/capabilities.js:173`. There is no env var, no config flag, no CLI flag that can flip it on. No `docker pull`, no pool, no `Dockerfile` in the repo.

**Even if enabled, it is broken.** When `useDocker` is true and the command contains spaces, `container-runner.js:30-34` splits into `execArgs` but `:46` re-appends the original string as a single argument → argv is `["run","--rm",…,"node:20-slim","node foo.js","foo.js"]`. `node` would try to open a file named `node foo.js`.

**The limits are not the ones in the blueprint.** `timeoutMs` defaults to **15000** (`container-runner.js:23`), and `coder/sandbox.js:234` explicitly passes 15000. The 512MB/1CPU/`network:none` flags exist only in the dead branch (`container-runner.js:40-42`). The timeout kill is `child.kill('SIGKILL')` — on Windows that maps to `TerminateProcess`, killing only the direct child, leaving orphans. No `taskkill /T /F`, no `detached: true`, no `maxBuffer` (unbounded stdout accumulation in host memory).

**The worktree rollback is inert.** `WorktreeManager` is imported by exactly one file: `tests/verify-claude-sis-integration.mjs:11`. No production module imports it. No `rollback|revert|git checkout|git reset` call sites exist in `server/`. The failure path in `coder/coder-part.js:128-190` re-prompts the LLM and retries; it restores nothing. Worse: **this directory is not a git repository** (`git rev-parse` → `fatal: not a git repository`), so `worktree-manager.js:36` falls through to a `fs.cpSync` of the whole tree (`:119-129`) — multi-GB, multi-minute, per run.

**The real security posture is unchanged from `child_process.exec`:** `spawn()` with `shell: true` on the host (`container-runner.js:55-69`), full `process.env` inheritance (so `OPENROUTER_API_KEY` is readable by LLM-generated code), no memory cap, no CPU cap, no network isolation.

### Phase 2 — LSP / Tree-sitter: ~10%

**`tree-sitter` is not in `package.json`, not in `package-lock.json`, and not in `node_modules/`.** No `typescript` either. `server/lsp/ast-parser.js` is 6 hand-written regexes (`:39`–`:148`) plus a per-line Python matcher (`:170-199`). Its own docstring at `:4` claims "Supports tree-sitter when available" — there is no tree-sitter code path. Proven misbehaviour: a file with `import` inside a comment/string/template yields 4 phantom imports; a class containing `const s = "{"` yields **zero** methods, because `_findMatchingBracket` (`:207-218`) counts braces without string awareness.

**`lsp-client.js` is a protocol-shaped mock.** Grep for `jsonrpc|Content-Length|textDocument/|publishDiagnostics|initialize` across `server/` returns **zero hits**. No framing, no `initialize`, no `didOpen`, no diagnostics handling. `serverCommand` defaults to `null` (`:7`), so `start()` always returns `{mode:'ast-fallback'}` (`:22-25`). `getDiagnostics` (`:67-94`) counts `{` vs `}` and `(` vs `)` — it flagged `const s = "}";` as "Mismatched braces: 1 opening vs 2 closing" and missed real syntax errors. **`LspClient` is never instantiated in production** — only in its own file and the test harness.

**Live path:** `AstParser` _is_ used (`context-scanner.js:7,108` → `coder-part.js:101` → `parts/registry.js:59,199`) — but only as a _formatter behind a regex gate_. The actual selection is `query.match(/\b\w{3,}\b/g)` + `lower.includes(term)` (`context-scanner.js:91,104`). `AstParser` never decides what to include.

**Edits are still whole-file overwrites:** `coder-part.js:222`, `perfectionist-coder-engine.js:481,551,573`, `auto-healer.js:208` all `fs.writeFileSync` a fully regenerated file. `DiffPatcher` is dead — assigned at `coder-part.js:35`, never called; `applyExactReplace`/`applyMultiReplace` have zero callers. `previewPatch` returns a "−N lines, +N lines" string, not a unified diff (`diff-patcher.js:52`). The one real surgical editor (`workspace/manager.js:358-458`, exact match + uniqueness check) is pre-existing and the coder engines ignore it.

**Performance landmine:** `ast-parser.js:42,58,70,80,92,126,150` computes line numbers via `code.slice(0,match.index).split('\n')` — O(n) per match, O(n²) overall. 12k imports in a 365KB file = **2,113ms**. `context-scanner.js:107` parses `.ts` as `javascript`.

### Phase 3 — TDD + trajectories: ~12%

**The Red gate is real and correct** — `tdd-harness.js:38-40` throws `TDD Red Phase Failed: Reproduction test passed before patch was applied.` That is the right semantics. **But `executeLoop` is never called in production.** `coder-part.js:36` constructs `new TddHarness({ sandboxRunner: sandbox })` and leaves it there. The live path is `coder-part.js:121 sandbox.execute(draft)` → self-correct retry loop. Green is enforced (`:74-81`); regression is conditional on a `regressionCommand` that no caller ever passes and that does not exist in the repo.

**The reward function is genuinely deterministic** — `reward-verifier.js:12-38` is pure arithmetic on exit code / test summary / lint errors, no LLM. The blueprint's "never let an LLM be the sole judge" rule **holds on the reward path**. The violation is upstream: the _tests themselves_ are LLM-authored (`empirical-gym.js:54-78`), and the fallback at `:83-143` counts `if (fn(c) !== undefined) passed++` — any function that doesn't throw passes all four "tests". The grader is deterministic and semantically vacuous.

**The DPO corpus is 3.5% usable.** I measured it directly:

```
total rows: 1824
both sides have code: 171
  ... and differ: 86
  ... and rejected failed: 63      <-- 3.46% usable
rows carrying task_id or id: 0
```

- 1,791 of 1,803 tournaments had **reward ties**, won by a latency tiebreak (`empirical-gym.js:263`) — so ~99% of preferences encode "faster", not "more correct".
- 305 of 1,824 pairs carry a hardcoded fallback latency (`1000 * 0.88` etc., `empirical-gym.js:201-203`) — fabricated, not measured.
- 710 pairs have empty code on both sides; 85 of the 154 with code on both sides are byte-identical chosen/rejected.
- 35 rows are literal test fixtures (`"Fix binary search index"`, `"Multiply integer by 2"`) copied from the test harness.
- 18 of the 20 files in `data/trajectories/` are `test_session_*.jsonl` (600 B each) from the unit test.

**Pairing is unkeyed.** The schema is `{prompt, chosen[], rejected[], timestamp}` with **no `task_id`** — the DPO loss is defined over `(τ_w, τ_l) ~ D`, and you cannot reconstruct the pairing without one. Pairing is currently implicit via matching prompt + `chosen.latencyNs < rejected.latencyNs`, and 24 pairs have inverted ordering.

**The (s,a,r) schema itself is correct** — `empirical_gym_benchmarks.jsonl` (5,421 lines) carries `sessionId, step, timestamp, state{prompt,candidate}, action{type,code}, observation{exitCode,latencyNs,metrics}, reward, metadata{scoreBreakdown}`. That is a genuine trajectory, not a chat log. It is also **irreproducible**: 0 of 5,421 entries record model name, prompt hash, seed, code hash, or env; `action.code` is truncated to 1,000 chars so it cannot be replayed; the proposer runs at temperature 0.2 with no seed.

**Logger coverage is ~2%.** `TrajectoryLogger` is constructed in exactly two places: `coder-part.js:37` and `empirical-gym.js:18`. `brain.js` — the main turn loop — logs nothing. 19 of 25 `server/*/` subsystems log nothing. No trajectory has been written since 2026-10-12.

No secrets leaked: 0 hits for `sk-or-v1-`, `sk-ant-`, or absolute user paths across all three data files.

### Phase 4 — Decomposition: ~5%

**`worker_threads` is used nowhere.** The only two matches in the entire `server/` tree are string literals in a capability allowlist (`tools/capabilities.js:42-43`). No `import`, no `new Worker()`. **No BullMQ, no Bull, no ioredis, no redis** in `package.json` or `package-lock.json`. The blueprint's Step 4 is unimplemented on both branches.

**The monolith is real but not where you think.** `server/index.js` is 3,724 lines with 267 routes, 62 WebSocket handlers, and exactly **one** `setInterval` (an SSE heartbeat at `:2525`). The loops live in `brain.js:258-374` — **31 `setInterval` calls across `server/`**, of which ~11 are always-on (`neuromodulators` 1s, `neural-oscillations` 1.5s, `brain-lifecycle` 3s, `homeostasis` 30s, `sleep-engine` 30s, `glymphatic` 45s, `dmn-daemon` 5m, `verifier` 60s, `short-term` 5m, `continuous-engine` 1s self-rescheduling, `supergence-engine` 35s). The heavier LLM loops are correctly gated off by `ENABLE_BACKGROUND_LLM_LOOPS`.

**The blocking risks cited in the blueprint are the wrong ones.** `server/tools/registry.js` is 158KB of _JavaScript source_ (a `const TOOLS = {...}` literal), not a JSON file — it's a one-time parse cost at boot, not a recurring stall. The 5.8MB / 2.3MB JSONL trajectories are **write-only** (`appendFileSync`; `getTrajectory()` is never called) — not a read-blocking risk. The actual stalls, in severity order:

1. **`user-focus-tracker.js` — 9.7MB profile.** `_load()` does `fs.readFileSync` + `JSON.parse` (`:69-70`) at import; `_saveImmediate()` (`:101`) does `fs.writeFileSync` + `JSON.stringify` of the same 9.7MB, triggered by `_scheduleSave()` on **every `recordInteraction()`** — which fires per user turn from `brain.js:2096`. That is a 9.7MB synchronous stringify + write per turn, on the event loop, scaling without bound.
2. **`supergence-engine.js:288,293` — `execSync` for git.** A synchronous child-process spawn that hard-blocks the event loop (and therefore the WebSocket server) on every power-on cycle.
3. **`continuous-engine.js:21,74-77` → `goal-engine.js:53,70`** — 1s tick with `readFileSync`/`writeFileSync` between awaits.
4. **`long-term.json` is 24MB**, `JSON.parse`'d synchronously at `long-term.js:35`.
5. **31 timers, no yield points** — no `setImmediate` handoff, no worker.

**No durability, no supervisor.** No `SIGINT`/`SIGTERM` handler anywhere in `server/`. `index.js:89-94` installs `uncaughtException`/`unhandledRejection` handlers that **swallow and continue**, masking crashes. `electron/main.cjs:194-197` logs the backend exit and sets `backendProcess = null` — no respawn, no backoff, no crash-loop cap. `CheckpointManager` is a human-approval gate that explicitly **discards** pending work on restart (`checkpointManager.js:40`: `PENDING` → `EXPIRED`). A crash mid-task loses the task entirely.

**Constraint on any Phase 4 design:** `brain` is a module singleton stashed on `global.__brain` (`index.js:13-14`) and imported by 79 modules. `brainLifecycle` holds global sleep/wake state consulted by four other subsystems. `shortTermMemory`/`longTermMemory`/`knowledgeGraph` are in-memory singletons. Worker threads get separate module registries and separate heaps — moving any of these into a worker **forks them into per-worker copies and breaks them outright**. Only pure functions (file scans, AST extraction, benchmark execution) can move, returning results over `postMessage`.

### Phase 5 — Beam Search / MCTS: ~12%

**`beam-search.js` is a genuinely correct, generic beam search** — `beamWidth=3, maxDepth=3` (`:10-14`), expansion loop (`:38`), `Promise.all` scoring (`:65`), sort-by-reward + `slice(0, beamWidth)` (`:112-113`), early exit at reward ≥ 0.9, terminal best-path selection (`:123`), with `generateCandidates`/`evaluateCandidate` injected as callbacks so it works on any node type. It has **no dedup** (no visited-set) and no depth control beyond 3.

**It has zero production importers.** Grep across `server/` for `from '.*search/'` returns no matches. The only importer is `tests/verify-claude-sis-integration.mjs:15`, and the test drives it with a hand-written 2-candidate stub. It is not in the shipped `app.asar`.

**"Compiler feedback" is not wired.** `RewardVerifier.evaluate` is a real deterministic scorer, but the `LINT_ERRORS` branch is unreachable — no code ever produces a nonzero `linterErrors`. A real `node --check` syntax gate exists (`sandbox.js:94-102`, returns early on parse failure) and a real `getDiagnostics` exists — **neither is connected to the beam scorer**.

**MCTS does not exist.** `method_mcts_planner` (`advanced-methods-engine.js:64-84`) _fabricates_ `visits`, `qValue` and `ucbScore` from `idx` arithmetic — e.g. `qValue: +(0.88 - idx*0.05)` — with zero rollouts, zero tree, zero backpropagation. `method_tree_of_thoughts` (`:30-63`) hardcodes `heuristicScore: +(0.75 + b*0.08 - d*0.02)` and labels branches `'PRUNED'` by index. The MCTS mentions in `supergenceKnowledgeCore.js:290` and `sisUnifiedSystem.js:145` are marketing prose inside strings. **This is the bio-mimetic naming illusion your own blueprint describes in §1.1, written in your own codebase.**

**`meta-prompt-optimizer.js` is not MIPROv2/DSPy.** The header claims inspiration from both (`:2-4`), but there is no Bayesian surrogate, no bandit allocation, no Pareto frontier over prompt parameters, no trial budget, no A/B harness, no holdout set. The actual algorithm: take `rulesLearned[0]` from an LLM simulation, set `fitness = cycleRecord.finalScore` (an LLM-opinion composite, `:229`), dedup by string prefix, keep top-12 by that fitness. `evolveFromCorrection` (`:254-317`) calls one LLM and **hardcodes `fitness: 0.99`** (`:290`) — every user-correction directive is born maximally fit and can never be out-ranked. **No pass/fail benchmark is consumed and no improved prompt is ever measured.**

**The score literally cannot go down.** `autonomous-learner.js:1384-1389`: on judge _failure_, `currentMasterScore = min(0.985, currentMasterScore * 1.07)`. The score rises when the judge breaks. Hence `clade-archive.json` reports `highestRawScore: 14.25` on a 0–1 rubric — proof the invariant is broken. `rawScore` is never clamped (`clade-archive.js:125`).

**`dual-path-swarm.js` is hardcoded fakery.** `_runNovaDrafter` returns a fixed `SystemController` string (`:121-158`); `_runAegisVerifier` returns `passed: true, astScore: 98.4` with `'AST Syntax Validity': 'PASSED'` literally hardcoded (`:210-217`) — it parses nothing.

Note: `server/search/` contains only `beam-search.js`. The other engines live in `server/rsi/`.

---

## The problem that is not on your roadmap

**`server/index.js:3711` binds to `0.0.0.0`. `cors()` is unconfigured (`:186`). There is no auth middleware anywhere in `server/`.** The `grep` for `app.use(...auth|bearer|apiKey...)` returns zero hits.

This exposes, to anything on your LAN:

- `POST /api/workspace/command` (`:1334`) — `workspace.runCommand(command, cwd, timeout)`, arbitrary shell.
- `POST /api/workspace/execute` (`:1345`) — arbitrary file execution.
- `POST /api/workspace/file` (`:1154`) — arbitrary file write.
- `GET /api/workspace/file` (`:1138`) — arbitrary file read.

`_isDangerousCommand` (`workspace/manager.js:129-150`) blocks `rm -rf /`, `format c:`, fork bombs, etc. It is applied at `:975` — but it is a **blocklist of about six catastrophic patterns on a machine that also runs an LLM agent with a full tool registry**. It does not stop `curl`, `certutil`, `reg add`, `powershell -enc`, credential access, or exfiltration.

**Path traversal, confirmed by execution:** `coder/sandbox.js:60` does `path.join(sandboxDir, targetFile)` with no sanitization, and `targetFile` comes from the model via `coder-part.js:451-460` (`_normalizeDraft` applies no `path.basename`). I ran it:

```
path.join('/base/sandbox/run1', '../../../../Windows/System32/evil.js')
  => '/Windows/System32/evil.js'      escapes sandbox? true
```

The file is then written with `fs.writeFileSync` (`:68`). Separately, `tools/registry.js:3605-3607` does `path.resolve(WORKSPACE_DIR, args.targetFile)` with no containment check before `fs.writeFileSync` — reachable from the LLM via the skill-application tool.

**Command execution by the model:** `draft.runCommand` is passed through verbatim from `coder-part.js:459` → `sandbox.js:118-119` → `container-runner.js:59` with `shell: true`. The model chooses the shell command.

**Note on `write_file` (`registry.js:1083`):** that one routes through `workspace.createFile(fp, body)`, which does apply the workspace resolver. The unguarded write is the _skill apply_ path at `:3605`, not `write_file`. Worth correcting if you saw it reported the other way.

**Also: `container-runner.js:62-68` spreads `process.env` into every sandboxed child**, so `OPENROUTER_API_KEY` and `OPENCODE_API_KEY` are readable by LLM-generated code.

None of this is on the 5-phase roadmap. It is a bigger risk than any single phase, and it is cheaper to fix than Phase 1's Docker work.

---

## Recommendation: what to do first

### Day 0–1: Close the exposure (not on the roadmap, highest risk)

1. Bind to `127.0.0.1` instead of `0.0.0.0` (`index.js:3711`). If you need LAN access, put auth in front of `/api/workspace/*` — a bearer token checked in middleware, compared with `timingSafeEqual`.
2. Constrain `cors()` to an explicit origin allowlist instead of `app.use(cors())`.
3. Path containment: in `coder/sandbox.js:60`, resolve then assert `path.resolve(filePath).startsWith(path.resolve(sandboxDir) + path.sep)`; same for `registry.js:3605`. Use `path.basename` on the LLM-supplied name.
4. Replace `draft.runCommand` as a shell string with an argv whitelist — `['node', file]`, `['python', file]` — and reject anything else. Never hand a model-authored string to `shell: true`.
5. Stop propagating `process.env` wholesale into the child (`container-runner.js:62-68`); pass an explicit allowlist (`PATH`, `HOME`, `NODE_ENV`).
6. Add `maxBuffer` to the spawn and truncate stdout/stderr. On Windows, kill the tree with `taskkill /PID <pid> /T /F`; on POSIX use `detached: true` + `process.kill(-pid, 'SIGKILL')`.

### Day 1–3: Real sandboxing without Docker

**Do not start with Docker.** You are on Windows, Docker Desktop is not running, `useDocker` has never been true, and the argv builder is broken. Every dependency you need is already in Node 22, which I verified on your machine:

```
--experimental-permission   SUPPORTED
--allow-fs-read=...   --allow-fs-write=...   --allow-child-process
```

Run generated code as:

```
node --experimental-permission \
     --allow-fs-read=<sandboxDir> \
     --allow-fs-write=<sandboxDir> \
     --allow-child-process \
     target.js
```

This gives you real filesystem isolation, kills the path-traversal class of bug at the OS boundary, and needs no daemon. Ship that as the Phase 1 `host` mode today, and keep the Docker branch for a Linux deployment target once you fix the argv bug at `container-runner.js:30-46`.

Then: `git init` this repo. The entire worktree-rollback feature in Phase 1 is inert without a repository, and `git` is already a dependency of your `supergence-engine` `execSync` calls. Set `timeoutMs: 10000` to match the blueprint, and wire `WorktreeManager` into `coder-part.js`'s failure path (`createWorktree` before the edit, `removeWorktree` on test failure).

### Days 3–6: Phase 3 — and this is the answer to "which phase first"

**Phase 3 is the only phase whose completion makes the other four measurable.** Beam Search needs a trustworthy node evaluator. MCTS needs a reward signal. DPO needs paired trajectories. TDD needs an executor. All four are waiting on Phase 3, and Phase 3's primitives are already correct — it is _wiring_, not building. Concretely:

1. **Wire `TddHarness.executeLoop` into `coder-part.js:121`.** Replace the raw `sandbox.execute(draft)` with: generate a reproducing test → `executeLoop({testFilePath, patchFn, regressionCommand:'npm test'})` → treat a thrown Red-phase error as task failure, not a swallowed retry. Add `npm test` to `package.json` (it is currently missing) and a regression test asserting the Red phase _aborts_ — the existing test only asserts the happy path.
2. **Extend the trajectory schema.** Add `{taskId, runId, model, promptHash, codeHash, seed, nodeVersion}` to `logStep` (`trajectory-logger.js:19-32`) and to `exportPreferencePair` (`:38-43`). **Then delete and re-harvest `dpo_pairs.jsonl`** — a 3.46% usable rate is not salvageable by filtering. Do not try to repair the existing file; the 305 fabricated latencies make it unusable as a corpus.
3. **Fix the reward so it discriminates correctness, not speed.** Replace `empirical-gym.js:108-115`'s `fn(c) !== undefined` with real assertions; remove the `|| 1000` / `* 0.88` fabrications at `:201-203` and log `null` instead of a fake number; require a **reward delta** to build a DPO pair, and reject a tournament outright when rewards tie (currently 1,791 of 1,803 tie and fall to a latency tiebreak). Every latency-tiebreak "preference" is teaching your model that faster is better regardless of correct.
4. **Log from `brain.js`.** Two call sites out of 141 files is not a dataset. Wire `TrajectoryLogger` into the main turn loop so every observation, tool call, compiler error and final output is captured — that is the raw material for everything downstream.
5. **Make the AZR ground truth independent.** Move test-case authoring from the proposer LLM to a deterministic generator, or have a second independent model author tests for a task the solver never saw _and_ that the proposer did not write. Until then, `tasksSolvedVerifiably` means "the solver satisfied a spec the proposer wrote", which is not verification.

### Then, in order

- **Phase 2** — but note that installing `tree-sitter` alone does nothing. The 2,113ms O(n²) line-number computation and the regex selection gate in `context-scanner.js:104` are the real problem. Fix the line numbers (precompute a line-offset table) and gate selection on AST symbol names. Only then add the LSP transport. If you want one hard truth: **an LSP server on a 6,600-file workspace with no `tsconfig.json` discipline will be slower and less useful than a correct Tree-sitter symbol index.** Build the index first.
- **Phase 5** — wire `BeamSearch` into the live coder path by making `evaluateCandidate` call `sandbox.execute()`, which already does `node --check` → real exit code → real test summary → `RewardVerifier`. That is ~40 lines and delivers most of the Phase 5 intent today. Then **delete `method_mcts_planner` and `method_tree_of_thoughts`** until they run real search — advertising them is the exact failure your blueprint §1.1 indicts. And remove the `currentMasterScore * 1.07` inflation and the `fitness: 0.99` hardcode: **a score that cannot go down cannot measure improvement.**
- **Phase 4** — on a single-user Windows desktop app, `worker_threads` will beat BullMQ/Redis on operational cost, and you already have the load-shedding primitive (`ENABLE_BACKGROUND_LLM_LOOPS`). Do the cheap wins first: move `user-focus-tracker` off the main thread (9.7MB per turn is your actual stall, and it was never identified because nobody profiled), replace `execSync` with `execFile`, and add `monitorEventLoopDelay` to `/api/status` so lag is measured instead of guessed. Only consider a queue if measurement says you need one.

### Keep the RSI strands off until there is something to optimise

`ENABLE_BACKGROUND_LLM_LOOPS` is currently unset, which means the 3,004/3,514/4,203 cycle counters are historical. **Keep it unset** until you have a held-out benchmark with real pass/fail signal — then the optimiser has something to optimise against. Right now it would be optimising a metric that cannot go down.

---

## The question for the next session

**Which of the 5 phases are you actually implementing first?** The audit says it should be Phase 3, and that Phase 1's Day 0–1 security work and the Node 22 permission-model sandbox should precede it. If you disagree with that ordering, the two most likely alternatives are:

- **Phase 1 first**, because you want the agent to be able to run arbitrary code safely before anything else — in which case skip Docker and go straight to `--experimental-permission`; it lands in a day and needs no daemon.
- **Phase 5 first**, because the beam search is already written and you want to see it work — in which case the only thing standing between you and a working demo is wiring `evaluateCandidate` to `sandbox.execute()`, and you should be warned that the reward signal feeding it is currently a latency tiebreak, so the demo will look like it works while measuring the wrong thing.

Tell me which, and I will implement it.

---

### Method note

Findings were produced by five parallel source audits, then independently re-verified by a sixth adversarial agent tasked with _refuting_ the two load-bearing claims. That verification **corrected two of my initial readings**, both of which are reflected above:

1. The deterministic `_buildMicroBenchmarkScript` is a **fallback**, not the operative path — the LLM-authored script is preferred. So the archive gate is not "unreachable", it is "reachable and untrustworthy". The real fix is the same either way: the engine must time the code itself.
2. AZR's `verified` verdict **is** computed by deterministic harness code (`:362`), not read from an LLM self-report — the violation is that the _ground truth_ (test cases + expected outputs) is model-authored, which is a narrower but real breach of blueprint §1.2.

Every number quoted in this document was reproduced directly against the repository. State-file claims were checked against their `.pre-verification-fix` backups, and the backup comparison is what surfaced the Oct 17 reset and the fabricated-measurement pattern.
