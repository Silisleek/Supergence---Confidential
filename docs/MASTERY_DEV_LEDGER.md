# Mastery Development Ledger — Evidence-Graded Defect Record

**Scope:** Supergence learning + task-execution subsystems in this repository.
**Method:** REA discipline — every claim carries an Evidence ID, an authority grade,
its coverage, and its residual unknowns. Static observation is never reported as
execution. Negative claims are bounded by the coverage that produced them.

**Date:** 2026-10-21
**Repository state:** working tree, no commits made.

---

## Evidence grading vocabulary

| Grade        | Meaning                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------ |
| **OBSERVED** | Read directly from source, or measured from a data file / live process. Reproducible by anyone with the same tree. |
| **INFERRED** | Follows from observations by reasoning, but was not executed or measured.                                          |
| **UNKNOWN**  | Not established. Named with the authority or environment that would settle it.                                     |

A defect below is listed with `evidence_id`, the exact citation, the grade, and
`coverage` — what the observation did **not** cover.

---

## E-01 — The reward verifier is correct; its inputs are fabricated

**Grade:** OBSERVED
**Coverage:** `server/trajectory/reward-verifier.js` read in full (119 lines). The
gym's data path was traced statically and its historical output file was parsed.
No live gym cycle was re-executed during this observation.

`RewardVerifier.evaluate()` implements a genuine multiplicative gate ladder:
`FAILED_EXECUTION → TYPE_ERRORS → LINT_ERRORS → TEST_TREE_MODIFIED →
NO_TESTS_RUN → FAIL_TO_PASS_INCOMPLETE → REGRESSION → WEAK_TESTS`, then
`0.70·f2p + 0.15·p2p + 0.10·mutation + 0.05·perf`. A candidate that ran zero tests
scores `0.0`. **This component is the asset; it must be kept, not replaced.**

`server/improvement/empirical-gym.js:219-231` feeds it:

```js
exitCode: (metrics.c1?.passed ?? 0) > 0 ? 0 : 1,      // exit code derived from pass count
testSummary: { total: metrics.c1?.total || 4, ... },  // 4 invented when absent
```

The verifier's own gates are therefore bypassed by construction: `NO_TESTS_RUN`
can never fire because `total` defaults to a non-zero constant.

---

## E-02 — The benchmark "tests" assert nothing

**Grade:** OBSERVED
**Coverage:** `empirical-gym.js:108-115`. Historical gym output parsed
(`data/trajectories/empirical_gym_benchmarks.jsonl`, 5 421 records).

```js
function runTests(fn) {
  let passed = 0;
  const cases = [0, 1, [1, 2, 3], 'test'];
  for (const c of cases) {
    try {
      if (fn(c) !== undefined) passed++;
    } catch {}
  }
  return { passed, total: cases.length };
}
```

A function returning `null`, `false`, `0` or `Symbol()` for every input passes
3 of 4 cases. The four inputs are shape-diverse but the assertion is
`!== undefined` — correctness is never checked against an expected output.

**Measured consequence:** of 1 807 master-candidate records, 4 473 of 4 475
reward-1.0 records report `passed: 4, total: 4`. The benchmark cannot distinguish
a correct implementation from a `() => 0` stub.

---

## E-03 — Latency figures are invented when measurement is missing

**Grade:** OBSERVED
**Coverage:** `empirical-gym.js:201-203, 282-283`. Static read only; no live call.

```js
const c1Lat = Math.max(1, metrics.c1?.latencyNs || 1000);
const c2Lat = Math.max(1, metrics.c2?.latencyNs || 900);
const mLat  = Math.max(1, metrics.master?.latencyNs || Math.min(c1Lat, c2Lat) * 0.88);
...
testsPassed: metrics.master?.passed || 4,
testsTotal:  metrics.master?.total  || 4,
```

The `* 0.88` is the source of the "10 %+ latency gain" the learner then treats as
empirical superiority. When the sandbox produced no output at all, the synthetic
path reports the master candidate as 12 % faster than both baselines.

---

## E-04 — 56.7 % of logged trajectories contain no code, yet 4 475 report reward 1.0

**Grade:** OBSERVED — measured
**Coverage:** all 5 421 records in `data/trajectories/empirical_gym_benchmarks.jsonl`
parsed with Python. This covers records written up to the file's last line; cycles
that failed before logging are not represented.

```
records: 5421
reward distribution: {1.0: 4475, 0.0: 940, 0.8: 6}
empty action.code: 3076 / 5421  (56.7 %)
reward==1 with exitCode 0: 4472
reward==1 passed/total: (4,4) ×4473, (4000,4000) ×2
```

A reward of 1.0 is recorded for records whose `action.code` is the empty string.
`RewardVerifier` never saw those; the `|| 4` default did.

---

## E-05 — Self-evaluation guarantees the "master" beats both candidates

**Grade:** OBSERVED
**Coverage:** `server/improvement/autonomous-learner.js:1973-2052`. Static read.
The fallback's runtime share of cycles is UNKNOWN — the AI comparator may succeed
often in a live run; this ledger does not measure that ratio.

```js
const mDepth = Math.min(0.98, Math.max(c1.scores.depth, c2.scores.depth) + 0.06);
// … +0.05 accuracy, +0.07 resilience, +0.08 utility, +0.06 novelty, +0.05 coherence
```

The master score is `max(c1, c2) + δ` by construction. It is not a measurement of
the master solution; it is an arithmetic guarantee that synthesis "improved".
Dimension scores themselves derive from string length, regex presence, and:

```js
const entropyBonus = ((str.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 7) - 3) * 0.008;
```

Character-code entropy has no relationship to solution quality.

At `:1311-1313` the fallbacks continue the pattern:

```js
const c1Score = ... || 0.76;
const c2Score = ... || 0.79;
let currentMasterScore = evalData.masterScore || ... || (baselineScore * 1.06);
```

---

## E-06 — 3 677 "learned skills" carry a verification score nothing verified

**Grade:** OBSERVED — measured
**Coverage:** all 3 677 JSON files under `data/skills/learned/`. The corpus is a
historical artifact; it is not evidence about the current runtime's behaviour.

```
files: 3677
keys present in every record: id, name, domain, verifiedScore, speedupGain,
                              createdAt, principles, recipe, executableCodeSnippet, tags
records containing any of testResults / exitCode / testsPassed / verifierStatus: 0
verifiedScore: min 0.72, max 1.015, mean 0.9567
verifiedScore >= 0.9: 3550
verifiedScore 0.95–0.99: 2521
verifiedScore > 1.0: 2
```

`autonomous-learner.js:2382` is the origin:

```js
verifiedScore: cycleRecord.masterScore || cycleRecord.finalScore || 0.95,
```

Three separate problems, all observable in that one line:

1. No verification record exists in the schema — the field is a number with nothing behind it.
2. Two records exceed 1.0 (`1.015`), which the arithmetic allows and nothing clamps.
3. The `|| 0.95` default means a cycle that produced nothing still yields a
   near-perfect skill.

`speedupGain` has the same shape at `:2383`:
`empiricalResult?.speedupMultiplier ? ... : 'empirical +10% gain'` — a string
literal asserting a gain that was never measured.

---

## E-07 — Learnings do not reach the model

**Grade:** OBSERVED
**Coverage:** `grep` over `server/`. Absence claims here are bounded: the search
covered `.js` files under `server/` in this tree and would not find a learning
path that reaches the prompt through data files alone. That path _does_ exist for
`data/skills/learned/` via `userFocusTracker.formatSkillsForPrompt`, which is
observed below.

- `mistakeLearningEngine.getActiveMistakePreventionPrompt()` — defined at
  `server/improvement/mistake-learning-engine.js:310`, **zero call sites** in
  `server/` or `client/`. The engine's own header comment claims "Injects all
  active prevented rules directly into the LLM system prompt on every turn".
  The observation contradicts the comment.
- `server/orchestrator/brain.js` imports neither `hermesLearner` nor
  `mistakeLearningEngine` (import block read, lines 4-43).
- `hermesLearner` is constructed and used by `agentTeam.js`,
  `sisUnifiedSystem.js` and the `/api/hermes/*` routes, but its
  `getLearnedContextPrompt()` is never called from the orchestrator.
- The one learning path that _does_ reach `brain.process()` is
  `promptCompiler.compileContext()` at `brain.js:881`, which calls
  `userFocusTracker.formatSkillsForPrompt(..., 750)` and
  `exemplarBank.formatForPrompt(..., 850)`.

**Consequence (`INFERRED`, coverage: static only):** user corrections recorded by
the mistake engine change files on disk and broadcast a UI event, but do not
change the system prompt of the next turn. That is consistent with the engine
accumulating 4 086 recorded mistakes while the same failures recur, but the
causal link is not measured here.

**Status: REPAIRED 2026-10-21.** `conscious.js` now injects
`getActiveMistakePreventionPrompt()` into every `outputStreamer` turn
(injection 4b). Loaded through a cached dynamic `import()` rather than a static
one: `mistake-learning-engine.js` imports `brain.js`, and `brain.js` imports
`conscious.js`, so a top-level import would close that cycle at module
evaluation. Observed: the prompt renders at 1 418 chars with the
`### 🛑 CRITICAL INVARIANTS & PREVENTED MISTAKES` header. Whether the injected
rules change model behaviour is **U-02**, still open.

---

## E-08 — Skill retrieval surfaces at most 2 skills out of 3 677

**Grade:** OBSERVED
**Coverage:** `server/improvement/user-focus-tracker.js:403-446`. Ranking quality
under a real query distribution is UNKNOWN.

`formatSkillsForPrompt()` calls `getRelevantLearnedSkills(domain, userQuery, 2)`.
Scoring is `+0.5` for exact domain match and `+0.2` per shared title word. Per
E-09, the `===` domain match can fire for at most 15.9 % of the corpus and never
for the 71.3 % stored as `computational-geometry`. Recipe text is truncated to
350 characters — for the observed 7 KB recipes that is roughly the first
paragraph.

---

## E-09 — Three disjoint domain vocabularies; exact matching fails for 71 % of skills

**Grade:** OBSERVED — measured
**Coverage:** counts over all 3 677 files in `data/skills/learned/`;
`userFocusTracker.detectDomain()` (`:158-169`), `promptCompiler.detectDomains()`
(`:50-61`) and `getRelevantLearnedSkills()` (`:403-430`) read in full. The full
consumer set outside these three was not exhaustively audited.

**Correction to an earlier draft of this entry:** the claim that
`detectDomains()` emits compound keys such as `coding|3d|design|systems` is
**false**. It pushes single tokens into an array and returns
`primaryDomain = domains[0]`. The composite strings do exist in the data, but
they are a legacy artifact (12 of 3 677 files), not current output.

The real defect is that three vocabularies never intersect:

| Producer                                                         | Vocabulary                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `userFocusTracker.detectDomain` / `promptCompiler.detectDomains` | `3d, coding, design, math, physics, systems, research, writing, general`                                                                                                                                                                                                                                                                                                           |
| `AutonomousLearner` frontier list (`:245-517`)                   | `webgl-game-engine-architecture, distributed-consensus, concurrency-lockfree, compilers-ast, cryptography-zkp, database-internals, simd-vector-math, ai-cognition, computational-geometry, os-kernel-ebpf, probabilistic-data-structures, information-retrieval, fault-tolerance-chaos, hardware-acceleration, symbolic-verification, autonomous-agents, dynamic-graph-algorithms` |
| legacy composite (12 files)                                      | `coding\|3d`, `coding\|3d\|design`, …                                                                                                                                                                                                                                                                                                                                              |

**None of the 17 frontier domains equals any detection token.** Measured skill
counts by stored `domain`:

```
computational-geometry  2622   ← 71.3 % of corpus, unmatchable
coding                   294
general                  190
3d                        85
concurrency-lockfree      34
cryptography-zkp          33
hardware-acceleration     33
…
composite (contains '|')  12
```

`getRelevantLearnedSkills()` adds `+0.5` only on `skill.domain === domain`. That
branch can fire for at most 584 of 3 677 skills (15.9 %), and can **never** fire
for the 2 622 `computational-geometry` skills — the 3D/graphics/geometry work the
learner spends most of its cycles on. Domain relevance is therefore almost always
zero, and retrieval falls back to incidental title-word overlap (`+0.2` each).

---

## E-10 — The learning loop's curriculum is canned

**Grade:** OBSERVED
**Coverage:** `autonomous-learner.js` — six hardcoded question templates and a
`Math.random()` selection over a fixed frontier list (lines 542, 582, 612-627,
3451). Selection was read statically; the resulting distribution in live operation
is UNKNOWN.

Self-generated curriculum from a fixed list cannot discover a domain the list does
not contain. Combined with E-05, every cycle is guaranteed to "succeed".

---

## E-11 — Degenerate loop: the same fallback is re-recorded without repair

**Grade:** OBSERVED (constant identity) / INFERRED (frequency)
**Coverage:** `server/orchestrator/conscious.js:642` read. The claim that it fires
"thousands of times" comes from the counter values in the friction log reported
by the running system, which this ledger did not independently re-measure.

`conscious.js:642` returns the literal `'Outer review correction required'` as a
fallback. `subconscious.js` caps its heuristic matrix at 80 near-identical
entries; `totalMistakesLearned` at `subconscious.js:192` increments per event, so
the number grows without any corresponding behavioural change. A counter that
counts its own increments is not a learning metric.

---

## E-12 — The served app surface is inline; `app.js` is not loaded

**Grade:** OBSERVED — runtime + byte-level
**Coverage:** live Chrome page against the running server on port 3009; byte
counts over the served HTML. Only the served page was inspected; other root-level
`*.html` demos were not.

Live DOM probe result:

```json
{
  "title": "Supergence — Powered by Unified SIS System // Apple Liquid Glass",
  "scripts": ["https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"],
  "hasChatInput": false,
  "hasSendBtn": true,
  "hasDeck": false,
  "hasSbt": 0,
  "bodyLen": 611595
}
```

Byte counts in `client/index.html`: `app.js` = 0, `scripts/` = 0, `sbt-btn` = 0,
`chat-panel` = 0. The file has six `<script>` tags: a reload guard, the KaTeX CDN,
an importmap, and three inline modules.

`AGENTS.md` states the bottom deck ships `VOICE`/`DICTATE`/`CHAT` wired in
`app.js`. **Observation:** that deck is not mounted on the surface the server
serves. Consequence for this work: a new mastery surface must be added inline to
`client/index.html`, matching its existing `create-agent-modal-overlay` pattern,
or the deck must be mounted first. It cannot be "extended" as-is.

---

## What is genuinely sound (do not rebuild)

| Component                                | Evidence  | Why it is kept                                                                                          |
| ---------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------- |
| `server/trajectory/reward-verifier.js`   | full read | Correct gate ladder, anti-reward-hacking, zero on no-tests.                                             |
| `server/coder/sandbox.js`                | full read | Real `node --check`, real process execution, path confinement via `resolveWithinRoot`, real exit codes. |
| `server/trajectory/trajectory-logger.js` | full read | Append-only JSONL, correct step shape.                                                                  |
| `server/improvement/prompt-compiler.js`  | read      | Real assembly of context sections; only its inputs are degraded.                                        |

---

## Residual unknowns

| ID   | Unknown                                                                                                            | Authority that would settle it                                                                     |
| ---- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| U-01 | What fraction of autonomous cycles take the `_synthesizeDynamicEvaluation` fallback rather than the AI comparator? | Instrumented run of `autonomous-learner` with the fallback counter exposed.                        |
| U-02 | Does the model's behaviour measurably change when mistake rules are injected?                                      | A/B run: same prompts with and without the prevention block, scored by the fixed verifier.         |
| U-03 | Do any root-level `*.html` demos load `app.js`? Not inspected; the served app does not.                            | Review of each root demo's script tags.                                                            |
| U-04 | Are there learning paths outside `server/` (scripts, tools) that reach the prompt?                                 | Whole-repo import graph, which the earlier repo-wide scan did not complete within its time budget. |

---

## Defect → repair map

| Evidence               | Repair                                                                                                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E-01, E-02, E-03, E-04 | `empirical-gym.js`: real assertions, no invented latencies, `UNVERIFIED` instead of a number, verifier receives the true exit code.                                        |
| E-05                   | `autonomous-learner.js`: heuristic scoring labelled heuristic; master score is `null` unless empirically verified.                                                         |
| E-06                   | `_compileAndRegisterLearnedSkill`: `verifiedScore` only from a verifier result; unverified skills go to `data/skills/candidates/`; schema carries the verification record. |
| E-07                   | Inject `getActiveMistakePreventionPrompt()` into the compiled context each turn.                                                                                           |
| E-08, E-09             | Retrieval returns verification-graded skills, domain matching normalised to tokens.                                                                                        |
| E-10, E-11             | Out of immediate scope; recorded so it is not mistaken for done.                                                                                                           |
| E-12                   | Add an inline mastery surface to `client/index.html`.                                                                                                                      |

---

## Verification record — 2026-10-21

Everything below was run against a live server and a real Chrome page
(`playwright-core`, `channel: 'chrome'`, headless), polling for state rather
than sleeping. The server was on **port 3010**; the pre-existing process on 3009
was not restarted and does not carry these routes.

### What the browser run established (OBSERVED)

| Claim                                                                       | Evidence                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The mastery modal opens from the workspace action bar and renders four tabs | `#workspaceBtnMastery` visible → click → `#masteryModal.active` with `.memory-kpi-grid`; Candidates, Learned and Mistakes panes each reached their final state; **no console or page errors**                                         |
| An expected-output test typed in the UI produces an OBSERVED reward         | Filled `.mastery-test-input`, clicked Run in sandbox: KPI moved to `1 OBSERVED EVIDENCE` / `1 ORACLE-VERIFIED SKILLS`; claim `2/2 cases passed (VERIFIED_SUCCESS)` with `oracle: EXPECTED_OUTPUT`; the skill moved to the Learned tab |
| A candidate with no code is graded UNKNOWN, not failed                      | `NO_EXECUTABLE_CODE`, `reward: null`                                                                                                                                                                                                  |
| A stored snippet that is ASCII art is graded INFERRED, not failed           | `NOT_SOURCE_CODE`, `reward: null`                                                                                                                                                                                                     |
| Corpus counters reflect the store                                           | 3 677 skill records, 0 oracle-verified, 2 234 carrying a code snippet; 2 034 of those (91.0 %) parse as JavaScript                                                                                                                    |

The fixture used to prove the OBSERVED path was removed afterwards, along with
its ledger entry; the ledger was reset to empty because the only other entry was
also a probe artifact. No real skill has yet been verified.

### Defects found _by_ this verification, and repaired

**E-13 — The mastery surface was unreachable.** Both original entry points
(`#btnTopMastery`, `#navBtnMastery`) sat inside `#homeView` and `#nav`, which a
global rule hides permanently (`#homeView { display: none !important }`,
`#nav { display: none !important }`). The modal existed and never rendered.
Repaired by mounting `#workspaceBtnMastery` in `.workspace-right-actions` — the
bar that is actually on screen. _This is the "renders but is not reachable"
class the project's own rules warn about; a source-only check would have passed._

**E-14 — Candidate/tab classification was by folder, not grade.** The
Unverified Candidates tab read `data/skills/candidates/`, which did not exist,
while the tab labelled **Oracle-Verified Skills** listed all 3 677 unverified
files. Repaired: `GET /api/mastery/skills` and `/state` classify on
`verificationGrade`, so "learned" means observed rather than "in a folder named
learned". The 3 677-file read is cached (keyed on directory mtime + file count)
because uncached it cost ~5.4 s per tab switch.

**E-15 — Every artifact was verified as `candidate.js`.** The route passed
`targetFile: 'candidate.js', language: 'javascript'` for every candidate, so the
sandbox ran `node --check` on HTML and recorded the resulting parse failure as
**OBSERVED / EXECUTION_FAILED / reward 0** — a real observation of the wrong
thing, written permanently to the skill file. Repaired with
`SkillVerifier.inferArtifactTarget()`, which names the artifact from its content
(html / python / json / javascript).

**E-16 — A parse failure was scored as a behavioural failure.** `sandbox.js`
returns `phase: 'syntax'` with exit code 1 when a file does not parse. That code
path reached the "artifact does not run" branch and issued reward 0. For a
stored _snippet_ — prose, a diagram, or a fragment lifted out of context — this
asserts the recipe is wrong, which nothing observed. Repaired: a syntax-phase
failure is now graded `INFERRED` / `NOT_SOURCE_CODE` with `reward: null`.

**E-17 — The UI could never reach OBSERVED.** The verify button posted no
`testCode`, and the server's oracle is `EXPECTED_OUTPUT` only when a test script
prints `{passed,total}`. Every run from the app was therefore capped at
`SYNTAX_ONLY`. Repaired: each candidate card now carries a test-script field
whose contents are sent with the request.

**E-18 — The empty state asserted a conclusion the ledger had not reached.**
With zero entries and zero unknowns recorded, the Open Unknowns pane read
_"No open unknowns. Every claim the learner made is either observed or
resolved."_ Nothing had been observed — 3 677 unverified skill records were
sitting directly above it. The panel was manufacturing assurance out of an empty
array, which is the same defect class as the invented latencies in E-03, applied
to prose instead of numbers. Repaired: the empty state now says no question has
been filed, explicitly denies that this means anything is settled, and points at
the corpus counters as the honest measure.

### Grading behaviour after the repairs (OBSERVED, direct verifier calls)

| Input                              | Grade    | Status                    | Reward |
| ---------------------------------- | -------- | ------------------------- | ------ |
| ASCII art snippet                  | INFERRED | `NOT_SOURCE_CODE`         | `null` |
| HTML, no tests                     | INFERRED | `SYNTAX_ONLY`             | `null` |
| JS, no tests                       | INFERRED | `SYNTAX_ONLY`             | `null` |
| JS + passing expected-output tests | OBSERVED | `VERIFIED_SUCCESS`        | 1      |
| JS + failing expected-output tests | OBSERVED | `FAIL_TO_PASS_INCOMPLETE` | 0      |
| JS + runtime throw                 | OBSERVED | `EXECUTION_FAILED`        | 0      |

### Still unknown (do not read the above as mastery)

- **U-05** — Whether the autonomous learner's synthesized benchmark suites
  (LLM-written, `synthesizeBenchmarkSuite`) produce _correct_ expected values.
  Self-reported `{"oracle":"EXPECTED_OUTPUT"}` is trusted by
  `parseTestOutput`; a wrong suite would verify a wrong implementation.
  Authority: manual review of N synthesized suites against their challenges.
- **U-06** — Whether any of the 2 034 parseable stored snippets is _correct_.
  Parsing is not execution and neither is correctness. Authority: per-domain
  oracle suites.
- **U-07 — RESOLVED by observation (2026-10-22).** The production surface now
  serves the mastery work. The pre-existing 3009 process was stopped and the
  server restarted from this tree; the startup banner reads
  `http://localhost:3009 [build 20260911-superintelligence-empirical]`, and
  `netstat` shows `0.0.0.0:3009 LISTENING 9564`. `GET
:3009/api/mastery/state` returns **HTTP 200 in 4.587777 s** with the full
  payload (`skills.total: 3677`, `oracleVerified: 0`, `unverified: 3677`,
  `withExecutableCode: 2234`; `evidence.totalEntries: 0`). The app surface was
  then driven in real Chrome (headless, `channel: 'chrome'`) against
  `http://localhost:3009/`: **15/15 checks passed** — mastery button present and
  sized, modal opens, all four tabs render live data, the E-18 repaired empty
  state is the text on screen, and zero console errors. Screenshot:
  `workspace/mastery_live_3009.png`.
  What this does _not_ establish: that any skill is verified — it isn't
  (`oracleVerified: 0`). U-05 and U-06 remain open. The `EvidenceLedger`
  resurrection hazard this same run exposed has since been fixed; the repaired
  record follows below.

### A second-order hazard this run exposed, and its repair (OBSERVED)

**The defect.** `EvidenceLedger` read its JSON file into memory in the
constructor, and `_save()` wrote that whole in-memory array back. Deleting
entries on disk while a server was running did not delete them from that
server: the next `record()` / `recordUnknown()` / `updateUnknown()` resurrected
them. Observed directly — after the ledger file was reset to
`{"entries":[],"unknowns":[]}`, a still-running server kept returning
`totalEntries: 3`. A restart cleared it. The mitigation recorded here at the
time ("stop the server before resetting, or the reset is cosmetic") is **no
longer required**; it is kept only as the description of the failure.

**The repair (2026-10-22).** Disk is now the source of truth. A private
`_refresh()` calls `_load()` at the top of every mutating method (`record`,
`recordUnknown`, `updateUnknown`) and every read accessor (`getOpenUnknowns`,
`getState`), so a running process can no longer write a stale view back over an
external edit.

The mechanism originally planned — stamping the file and reloading only when
`mtime` or size changed — was **not** used. Every mutation saves synchronously,
so memory can only diverge from disk between the load and the save _inside one
synchronous call_; an unconditional read therefore restores correctness without
depending on the filesystem's timestamp resolution. That matters on Windows,
where `mtime` is millisecond-granular and a stamp would have needed `mtimeMs`
**and** `size` together to be reliable. A future reader should not go looking
for a stamp — there isn't one.

`_load()` is deliberately asymmetric. An **absent** file is authoritative and
clears memory; that is what makes a delete a real delete. A **malformed or
unreadable** file is not authoritative: memory is left intact, so a corrupt read
cannot destroy known state and then persist the loss.

**Proof, module level.** A nine-check differential harness against an isolated
temp directory (never the real ledger) scored **5/9 before the change and 9/9
after**. The four assertions that flipped:

| Assertion                                              | Before                            | After                                         |
| ------------------------------------------------------ | --------------------------------- | --------------------------------------------- |
| `reset is not resurrected by the next record()`        | `entries=[first, second]`         | `entries=[second]`                            |
| `reset is not resurrected by the next recordUnknown()` | `unknowns=[q1?, q2?]`             | `unknowns=[q2?]`                              |
| `external entries survive a later record()`            | `entries=[first, second, third]`  | `entries=[written by another process, third]` |
| `a deleted store is recreated with only new content`   | six entries, incl. `not observed` | `entries=[y]`                                 |

The `updateUnknown` contract was re-checked as unchanged: an open unknown still
closes, and an INFERRED entry still returns
`{"ok":false,"reason":"evidence_not_observed","grade":"INFERRED"}`. So
`POST /api/mastery/unknowns/:id/resolve` keeps its HTTP 409 mapping and the
app's error handling still holds. Its one non-HTTP caller,
`autonomous-learner.js` (`getOpenUnknowns()` → `updateUnknown()` by stable
`unknownId`), was re-read and still resolves: both calls now refresh, and the id
is persisted on disk.

**Proof, live process.** The server was restarted from this tree onto the fixed
module; the banner again reads `http://localhost:3009`. `GET
:3009/api/mastery/state` → **HTTP 200** with `skills.total: 3677`,
`oracleVerified: 0`, `evidence.totalEntries: 0`. With the server still running:

- an entry written **directly to the file by a separate process** was read
  through immediately — `evidence.totalEntries: 1`,
  `byGrade: {"OBSERVED":0,"INFERRED":1,"UNKNOWN":0}`, with the claim text
  (`written by a separate process while the server was running`) verbatim in
  `recentEntries`;
- restoring the baseline file the same way was read through as
  `totalEntries: 0`, `byGrade` all zero.

The app was then re-driven in real Chrome (headless, `channel: 'chrome'`)
against the fixed server: **15/15 checks passed**, zero console errors, every
expected DOM string derived from the live API rather than copied from source.
Screenshot refreshed at `workspace/mastery_live_3009.png`.

**Cost accepted.** `getState()` now performs one file read per
`/api/mastery/state` request. The store is 80 bytes at baseline and capped at
2 000 entries / 500 unknowns, so this is nowhere near the `/api/state`
event-loop starvation documented in `AGENTS.md`.

**Proof, live write-back.** The other half of the round trip — a server-issued
`record()` no longer resurrecting cleared entries — was then driven over HTTP
through the only ledger-mutating route,
`POST /api/mastery/candidates/:skillId/verify`, against the same live server on
`:3009`. The subject was the one learned skill whose stored snippet could
actually parse and run: a 914-character `HighPerformanceEpochQueue` class that
passes `node --check`, filed as
`skill_3d-design-and-implement-a-procedural-chinese_1791229703506`. (Its
`name` and filename describe a Chinese classical garden generator; the snippet
is an unrelated lock-free ring buffer. That mismatch is a corpus-quality
observation, not part of this proof — it was selected for parseability.)

A 24-check harness ran five phases:

1. **Baseline** — ledger empty on disk and through `/api/mastery/state`; the
   skill carried no `verificationGrade`; `oracleVerified: 0`.
2. **First POST** — the server recorded entry **A** (`E-mviw3qv6-fml1`,
   `grade=INFERRED`, `oracle=NONE`, citing `sandbox:mastery_verify_…`). Disk
   and API both read `1`.
3. **External reset** — a separate process emptied the file. The running server
   read the reset through as `totalEntries: 0`.
4. **Second POST** — the assertion this exists for. Disk held **exactly one**
   entry afterwards, and it was **B** (`E-mviw3vwmv-gzk3`, `timestamp >= t0`);
   A's id was absent. Under the old code, in-memory A would still have been
   present, the push would have produced `[A, B]`, and the reset would have
   been silently undone.
5. **Restore** — ledger back to its 80-byte baseline; skill file byte-identical
   to its pre-proof copy (`verificationGrade=undefined`); `oracleVerified`
   still `0`.

**24/24 passed.** A separate read after the run corroborated the restore from
outside the harness: the ledger file was the 80-byte empty baseline
(sha256 `de4c17f0…`), `/api/health` returned 200 without a restart, and
`/api/mastery/state` reported `evidence: 0`, `openUnknowns: 0`,
`skills.total: 3677`, `oracleVerified: 0`.

The `testCode: ""` payload could not have moved the corpus counters:
`verifyArtifact` sets `oracle = testCode && parsed ? EXPECTED_OUTPUT : NONE`
(`server/trajectory/evidence-verifier.js:459`), so OBSERVED is unreachable
without a supplied test script — the run recorded `grade=INFERRED,
oracle=NONE`. The skill file was restored regardless, to keep the record
byte-identical.

All five temporary harnesses used across this work were deleted after use —
`verify_ledger_reset.tmp.mjs`, `reverify_mastery_3009.tmp.mjs`,
`proof_writeback.tmp.mjs`, `scan_js_skills.tmp.mjs`, `snip_check.tmp.js`. A
`ls *.tmp.mjs *.tmp.js` in the repo root returns nothing.

**What this does not establish.** None of this says anything about whether any
skill's claims are true. `oracleVerified` remains `0`, no skill has reached an
EXPECTED_OUTPUT grade, and U-05 / U-06 are still open. What is established is
narrower: an external edit to the ledger — a reset, an append, a delete —
survives a running server's next mutation, both when the server reads and when
it writes.

Residual, not a defect: `_save()` still slices to the last 2 000 / 500 while the
in-memory arrays are never trimmed. Disk stays capped and memory self-corrects
on the next `_load()`, so the divergence is bounded and transient.

---

## Fourth pass — 2026-10-22: the verification gap, the corpus, and the cap

Everything in this section was measured on this tree. Where a claim rests on
reading source rather than running it, the entry says so.

### 1. Why nothing ever reached OBSERVED — two causes, not one

The brief's hypothesis was that no component generates an expected-output test.
That is **half** right, and the other half is mechanical.

**Cause A — nothing called `verifyArtifact` with a test script.** Traced across
`server/` and `client/` (grep for `verifyArtifact|testCode|SkillVerifier`):

| Caller                                                                  | What it did                                                                                                              |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `POST /api/mastery/candidates/:skillId/verify` (`server/index.js:1087`) | forwarded `testCode` from the request body; the UI's field was empty by default, so `testCode: ''`                       |
| `autonomous-learner.js`                                                 | imports `SkillVerifier` but calls **`adjudicate` only**, through `empiricalGym`; it never called `verifyArtifact` at all |
| `empirical-gym.js`                                                      | already generated a suite (`synthesizeBenchmarkSuite`) and called `adjudicate`                                           |

So a suite generator _did_ exist — in the gym — but it was model-dependent, and
it never touched the stored corpus. Against the stored corpus, nothing generated
a test. Confirmed: the route's oracle was `testCode && parsed ? OBSERVED : NONE`,
and with no test code every stored-skill verification was capped at `SYNTAX_ONLY`.

**Cause B — the sandbox does not run `code` without a `testCode` or `runCommand`.**
`sandbox.js:129-154`: after `node --check` passes, if neither is supplied it
returns `{ phase: 'syntax', exitCode: 0 }` **without executing the file**. A
generated suite handed to the sandbox as `code` alone would therefore report
"Syntax validation passed" forever. This was found by direct experiment: the
same generated file produced `{"passed":1,"total":1}` when run by `node`
directly, and `phase: 'syntax'` through `sandbox.execute` — the difference being
only the `runCommand`.

**The repair.** New module `server/trajectory/oracle-synth.js`: lifts expected
values a record _states about itself_ — `assert.deepStrictEqual(f(...), <literal>)`,
`expect(...).toBe(<literal>)`, and two-column `input → expected` tables — and
emits a Node suite that deep-equals against the literal and prints
`{"passed":N,"total":M}`. It returns `null` when the record states no contract;
it never asserts "did not throw", never compares the candidate to its own
output, and never invents an expected value. `verifyArtifact` now accepts
`recipe`, runs the synthesizer only when the caller supplied no test, and hands
the sandbox a `runCommand` when it does. `evidence.oracleProvenance` records
whether the expected values were `EXPLICIT_ASSERTION`, `RECIPE_EXAMPLE_TABLE`,
`CALLER_SUPPLIED`, or `NONE`, and the ledger citation carries it.

**Two further defects found while proving this, both repaired:**

- **A failing assertion was reported as a dead process.** `adjudicate` passed
  the suite's non-zero exit straight to `RewardVerifier`, whose first gate
  returned `FAILED_EXECUTION` — losing `passed/total`. A suite that printed
  its counts has _run_; its exit code is the assertion. The case counts now
  drive the verdict (`FAIL_TO_PASS_INCOMPLETE`), and only a suite that failed
  without reporting counts is `EXECUTION_FAILED`.
- **`parseTestOutput` accepted any object with a `master` key.** Measured over
  12 synthesized suites: 5 emitted a **prose** discriminator
  (`"oracle":"BoundedStack respects capacity"`) and one emitted
  `"latencyNs":"1641900"` as a _string_. The old predicate accepted all of
  them as expected-output reports. It now requires integer `passed`/`total`
  with `total > 0` and a discriminator that is either `EXPECTED_OUTPUT` or
  absent; a non-literal discriminator is returned marked
  `_malformedDiscriminator`, counted in `gym.stats.malformedSuites`, and the
  gym grades it `DIFFERENTIAL` (INFERRED) instead of scoring it.

**Proof — module level (all executed):**

| Input                                          | Grade    | Status                    | Reward  |
| ---------------------------------------------- | -------- | ------------------------- | ------- |
| correct artifact + own contract, no `testCode` | OBSERVED | `VERIFIED_SUCCESS`        | 1 (2/2) |
| same contract, wrong return value              | OBSERVED | `FAIL_TO_PASS_INCOMPLETE` | 0 (1/2) |
| correct artifact, no stated contract           | INFERRED | `SYNTAX_ONLY`             | null    |
| unparseable artifact                           | UNKNOWN  | `NO_EXECUTABLE_CODE`      | null    |
| caller-supplied passing suite                  | OBSERVED | `VERIFIED_SUCCESS`        | 1       |
| caller suite that crashes                      | OBSERVED | `EXECUTION_FAILED`        | 0       |
| caller suite reporting 1/2 then exiting 1      | OBSERVED | `FAIL_TO_PASS_INCOMPLETE` | 0       |

**Proof — live HTTP**, server restarted from this tree, banner
`http://localhost:3009`. A temporary candidate carrying its own three-case
contract, POSTed with `{}` (no `testCode`):

```
grade OBSERVED · status VERIFIED_SUCCESS · reward 1 · tests 3/3
oracleProvenance.source EXPLICIT_ASSERTION
```

The same contract against an implementation that ignores its capacity:
`OBSERVED · FAIL_TO_PASS_INCOMPLETE · reward 0 · 2/3`. A candidate with no
stated contract: `INFERRED · SYNTAX_ONLY · reward null`. **17/17** checks
passed. The fixtures were then deleted and the ledger restored to its 80-byte
baseline; the running server read the reset through immediately.

### 2. The corpus was worse than reported

Re-derived over all 3,677 files before any change (measured with `vm.Script`,
then re-checked with `node --check`):

```
withExecutableCode      2239
distinct snippets        222   <- 2,239 files carried only 222 distinct texts
files in duplicate groups 2024
largest duplicate group   1925   <- one 914-char snippet
name/content mismatch     2019
```

The brief said "a handful of snippets parse as JavaScript; five of six were
copies of the same ring buffer". The real proportion is the inverse: **2,024 of
2,239 snippets (90.4 %) were duplicates, and one ring buffer accounted for
1,925 of them.**

**Root cause, found at the writer.** `autonomous-learner.js`
`_generateEngineeringSolution()` ended:

```js
return solutions[domain] || `...class HighPerformanceEpochQueue {...}`;
```

The fallback map covers 5 domains; the corpus stores 2,622 records as
`computational-geometry`, which has no entry. When the model call returns
nothing, the canned ring buffer becomes `sol2`; the master synthesis is
`${sol2}\n\n### Formal Invariant Guarantee\n${sol1}`;
`_compileAndRegisterLearnedSkill` regexes the first fenced block out of the
master solution and stores it as `executableCodeSnippet`. Result: a procedural
Chinese garden generator whose stored code is a lock-free queue.

**Repaired at the source:**

- the catch-all now returns `null`. Measured: `computational-geometry`, `3d`,
  `coding`, `general` → `null`; only the five genuinely canned domains still
  return content.
- `_compileAndRegisterLearnedSkill` records `codeOrigin`
  (`MASTER_SYNTHESIS` / `INHERITED_FROM_CANDIDATE` / `NONE`) on every new
  record, so an inherited snippet is identifiable.

**Repaired in the corpus** (`scratch/migrate_corpus.tmp.mjs`, dry-run first,
backup at `data/skills/.learned_backup_1792659793`). **No file was deleted.**
2,229 files had `executableCodeSnippet` set to `""` and a `snippetRepair`
object written recording the reason, the removed snippet's SHA-256, its length,
and the symbols it defined. A snippet was removed when:

- it was byte-identical to another record's (`SHARED_SNIPPET`, 2,024 — shared
  content cannot be any one record's artifact), or
- no symbol the snippet defines appears in that record's name or recipe
  (`UNATTRIBUTABLE`, 205).

**After (measured):**

```
files                    3677
no executable snippet    3667
with executable snippet    10   (down from 2,239)
unparseable                 3
byte-identical duplicates   0   (was 2,024)
name/content mismatch       0   (was 2,019)
distinct and runnable       7
records carrying a repair note 2229
```

`GET /api/mastery/state` now reports `withExecutableCode: 10`, and the app's
candidate pane shows the repaired records as `NO_EXECUTABLE_CODE` rather than
claiming a mismatched snippet.

### 3. The ledger cap is now documented, recorded, and enforced on load

**Intended semantics chosen: a documented cap with explicit, recorded
eviction.** The alternative — no cap — loses evidence outright to disk growth
and contradicts the append-only intent; silent truncation was the actual
failure. `RETENTION` is now an exported constant (`entries: 2000`,
`unknowns: 500`, `evictionRecords: 200`, `tombstoneEntries: 5000`).

- `_enforceCaps(trigger)` trims to the cap and appends an `evictions` record
  naming the trigger, kind, count, cap, the ids dropped (last 50), and the
  oldest/newest timestamps. `droppedTotal` carries the running count so bounded
  metadata never hides unbounded loss.
- **Load enforces the cap and persists when it evicted.** Persisting at load
  time is what makes the count stable: `_refresh()` runs `_load()` before every
  read and every mutation, so an unpersisted trim would be recomputed — and
  re-recorded — on every access. A read that evicts nothing writes nothing.
- `getState()` reports `retention`, `droppedTotal` and recent `evictions`. A
  reader can now distinguish "the ledger is young" from "the ledger dropped 500".
- **An evicted evidence id is distinguishable from one that never existed.**
  Evicted ids leave a tombstone; `updateUnknown` returns `evidence_id_evicted`
  (with the grade it had) instead of `evidence_id_not_found`. The HTTP route's
  409 mapping is unchanged.

**Deterministic harness** (`scratch/probe_ledger_cap.tmp.mjs`), isolated store
in the repo tree, never the real ledger: **23/23 passed** — loads a 2,500/550
store, keeps exactly 2,000/500, keeps the **newest** slice and drops the oldest,
records the drop with a reason, a subsequent mutation evicts exactly one (not
zero, not two), the eviction names its ids, an evicted id reports
`evidence_id_evicted` while a never-issued id reports `evidence_id_not_found`, a
retained OBSERVED id still resolves, an INFERRED id still refuses, the record
survives a reload, a plain read manufactures nothing, and an under-cap store
loses nothing.

The five disk-is-truth guarantees from the previous pass were re-run after this
change (`scratch/probe_regress.tmp.mjs`): **5/5** — reset not resurrected,
external write read through, deleted store reads empty, malformed file does not
clear memory.

### 4. U-05 and U-06

**U-05 — do synthesized benchmark suites produce correct expected values?
PARTIALLY ANSWERED, still open.** Two measured findings:

- **They are frequently malformed.** Over 12 synthesized suites:
  `INFERRED/DIFFERENTIAL_AGREEMENT_ONLY` 5, `OBSERVED/VERIFIED_SUCCESS` 1,
  `INFERRED/STRUCTURAL_CHECKS_ONLY` 1, `OBSERVED/EXECUTION_FAILED` 4,
  `OBSERVED/REGRESSION` 1; `malformedSuites` 5. Five of twelve wrote prose into
  the `oracle` discriminator. Before this pass those five were silently treated
  as expected-output reports; they are now downgraded.
- **The historical trajectory log contains no expected-output result at all.**
  All 5,421 records in `data/trajectories/empirical_gym_benchmarks.jsonl`
  predate the `grade`/`oracle` metadata fields (2026-10-03 → 2026-10-12), so
  they cannot speak to `synthesizeBenchmarkSuite` either way.

What is **not** established: whether a suite that _is_ well-formed asserts the
_right_ values. The model writes both the implementation and its expectations,
so agreement is self-consistency. **Authority that would settle it:** manual
review of N well-formed synthesized suites against their challenge statements —
not performed here.

**U-06 — is any stored snippet correct? ANSWERED, negatively, for the corpus as
repaired.** Every one of the 10 records still carrying a snippet was run through
the verifier with its recipe:

| Grade                        | Count | Why                                                      |
| ---------------------------- | ----- | -------------------------------------------------------- |
| INFERRED / `SYNTAX_ONLY`     | 7     | parses and runs, but the record states no expected value |
| INFERRED / `NOT_SOURCE_CODE` | 3     | does not parse                                           |
| OBSERVED                     | **0** | no record states a contract                              |

So no stored snippet is _established_ correct — not because any was shown wrong,
but because none carries an oracle. As a separate, **explicitly labelled**
probe I ran the LRU-K record against five invariants _I_ wrote from its own
field names (`get` returns what `put` stored, miss returns `undefined`, capacity
is an upper bound after 50 inserts, hits/misses match call counts, overwrite
keeps one node). 5/5 passed. **Those expectations are mine, not the record's, so
this is INFERRED and is deliberately not written to the ledger as OBSERVED.**

### What remains unknown

| ID   | Unknown                                                                 | Authority that would settle it                                                                                                                                             |
| ---- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U-05 | Whether a well-formed synthesized suite asserts correct expected values | **Advanced 2026-10-22** — see "Fifth pass" below. Remains open for reasoning-quality: the model can write a suite that is internally correct yet tests the wrong property. |
| U-08 | Whether any of the 10 surviving snippets is correct                     | A per-record oracle written from the record's stated behaviour, not from my reading of its code                                                                            |
| U-09 | Whether `codeOrigin` classification fires correctly on a live cycle     | **RESOLVED 2026-10-22** — see "Fifth pass". Two live cycles were run; the first exposed a defect in the classifier, which was then repaired and re-verified.               |

### Files changed in this pass

```
server/trajectory/oracle-synth.js        new — expected-value extraction and suite emission
server/trajectory/evidence-verifier.js   recipe input, provenance, runCommand, failure
                                         classification, strict parseTestOutput, retention
server/improvement/autonomous-learner.js catch-all fallback removed; codeOrigin recorded
server/improvement/empirical-gym.js      contract lifting; malformed-suite downgrade
server/index.js                          recipe passed through; provenance in citation + skill
data/skills/learned/*.json               2,229 snippets removed with a snippetRepair record
docs/MASTERY_DEV_LEDGER.md               this section
```

All temporary harnesses were deleted after use — `probe_oracle.tmp.mjs`,
`probe_sandbox.tmp.mjs`, `probe_verify.tmp.mjs`, `probe_vacuous.tmp.mjs`,
`probe_ledger_cap.tmp.mjs`, `probe_regress.tmp.mjs`, `probe_fallback.tmp.mjs`,
`probe_u06.tmp.mjs`, `probe_u06b.tmp.mjs`, `probe_u05.tmp.mjs`,
`migrate_corpus.tmp.mjs`, `browser_check.tmp.mjs`, `browser_diag.tmp.mjs`,
`browser_tabs.tmp.mjs`, `browser_shot.tmp.mjs`, `proof_e2e.tmp.mjs`, and the
`dbg*.tmp.mjs` / `probe[0-9]*.tmp.mjs` files. Probe rows were also removed from
`data/trajectories/empirical_gym_benchmarks.jsonl` (restored to its pre-session
5,421 records) and from `data/trajectories/dpo_pairs.jsonl` (verified clean,
1,824 records, none matching the probes).

---

## Fifth pass — 2026-10-22: live cycles against a real model

The previous pass recorded U-09 as unresolvable here because the configured
model endpoint returned `401 Invalid API key`. A working local router was then
made available at `http://127.0.0.1:20128/v1`, and this pass ran the learner for
real.

### What model actually answered

This matters more than it looks, so it is stated plainly: the id used is
**`opus-4.6`**, but that is a _combo name_ in 9router, not a model. The router
fans it out to free backends — `deepseek-v4.1-flash`, `minimax-m3.1`,
`glm-5.3-flash`, `qwen-3.8`. Every request reports the served model, and the
served model is what is recorded here. **No result in this section is
attributed to Opus 4.6, because no Opus backend answered.** The router holds no
Anthropic credential (`providerConnections` has no `anthropic` row, and every
real Opus id returns `No active credentials for provider: anthropic`); its
`github` connection is `testStatus: "unavailable"` on a
`free_limited_copilot` token.

`.env` was pointed at the router for the duration (`OPENROUTER_BASE_URL`,
`DEFAULT_MODEL`, `PREMIUM_MODEL`, `FREE_MODEL`, `FALLBACK_MODELS`), then
**restored byte-identically** — sha256 `8683fd80…` before and after. No key was
written anywhere else in the tree.

### U-09 — RESOLVED, and it exposed a defect in my own classifier

**Cycle 2904** (real model, live server, `POST
/api/improvement/autonomous/trigger`) completed and produced
`skill_coding-how-can-sis-design-implement-and-fully_…`. It was graded
`INFERRED / DIFFERENTIAL_AGREEMENT_ONLY` with `reward: null` — correct — but it
carried an 821-character `executableCodeSnippet` labelled
`codeOrigin: MASTER_SYNTHESIS`, and that snippet was a **directory tree**:

```
my‑3d‑city‑explorer/
├─ bootstrap.js                # orchestrator …
├─ generate_assets.js          # pure‑Node GLTF/GLB generator …
```

**The defect.** The extraction regex allowed an _untagged_ fence:

````js
/```(?:javascript|js|python|py|json|glsl|html)?\r?\n([\s\S]*?)```/;
````

A bare ` ``` ` opened a directory layout, and everything up to the next
fence was stored as code. This is the same name/content mismatch the corpus
repair removed, reintroduced through a path the repair did not cover. The
`codeOrigin` label was also wrong in kind: it labelled _where the text came
from_, not _whether the text was code_.

**The repair.** Only a language-tagged fence is considered; an untagged fence
yields no snippet.

````js
const tagged = [
  ...String(masterSolution || '').matchAll(/```[ \t]*([A-Za-z0-9_+-]+)[ \t]*\r?\n([\s\S]*?)```/g),
];
const codeMatches = tagged.length ? tagged[0] : null;
````

Verified against four shapes: the real cycle's untagged tree → `NONE`,
0 chars; a tagged `javascript` fence → captured, `MASTER_SYNTHESIS`; a master
carrying the formal-invariant header → `INHERITED_FROM_CANDIDATE`; prose with no
fence → `NONE`.

**Cycle 2905** then ran on the repaired path against the same real model. Its
record: `verificationGrade: INFERRED`,
`verificationStatus: DIFFERENTIAL_AGREEMENT_ONLY`, `codeOrigin: NONE`,
`executableCodeSnippet` length **0**. The classifier now behaves as documented
on a live cycle.

The one record produced by cycle 2904 was repaired in place (snippet cleared,
`snippetRepair` note written) rather than deleted, so the evidence of the defect
survives. Both cycle-produced candidate records were then removed after the
measurement — they are artefacts of this investigation, not of normal operation,
and both were `INFERRED` with no snippet. Corpus returned to 3,677 / 10.

### U-05 — advanced with a real model; still open on reasoning quality

**Suite shape.** Over 8 runs against a challenge with an unambiguous contract
(`reverseWords`, `mostFrequent`):

```
well-formed EXPECTED_OUTPUT : 5
malformed discriminator     : 0
execution failures          : 3
scored VERIFIED_SUCCESS     : 4 (one suite reported 3/4 -> FAIL_TO_PASS_INCOMPLETE)
```

Unlike the earlier 12-run sample on the dead endpoint (5/12 prose
discriminators), this model produced **no malformed discriminators**.

**Do the expected values hold?** Inspected a real suite directly. Its cases
included `reverseWords("hello world") → "world hello"`,
`mostFrequent([1,2,2,3]) → 2`, and an edge case `("", []) → { "", null }` — all
independently correct. This is a genuine assertion against a stated value, not a
`!== undefined` smoke check.

**Does the suite discriminate?** Paired runs on the same challenge, one correct
implementation and one with the same API but wrong behaviour:

| Suite quality | correct impl             | wrong impl                                     |
| ------------- | ------------------------ | ---------------------------------------------- |
| well-formed   | `VERIFIED_SUCCESS` 4/4   | `FAIL_TO_PASS_INCOMPLETE` 1/4                  |
| malformed     | `STRUCTURAL_CHECKS_ONLY` | prose discriminator → `DIFFERENTIAL`, unscored |

Across 6 fresh pairs, every pair was well-formed on at least one side, the wrong
implementation was caught **6/6**, and the wrong implementation was never scored
as verified. On a second stable challenge the correct implementation scored
**4/4 `VERIFIED_SUCCESS`**.

So on this evidence: a well-formed suite from this model does assert real
expected values and does reject a wrong implementation, and a malformed suite is
downgraded rather than scored. That is the mechanism working.

**What is still not established.** These are small, hand-picked challenges with
a contract I could verify by inspection. It does **not** show that for an
arbitrary frontier question the model asserts the right _property_ — a suite can
be internally correct and still test the wrong thing, and the model writes both
the implementation and the expectations. U-05 stays open with that narrower
question; the authority is manual review of suites written for real frontier
prompts, not for challenges chosen to be checkable.

### Cleanup

`.env` restored (sha256 identical). Server restarted on the restored config.
`data/skills/candidates/` emptied of the two probe-cycle records.
`data/trajectories/empirical_gym_benchmarks.jsonl` restored to its pre-session
5,421 records (108 rows from this pass removed; three distinct prompts —
the two cycle questions and the discrimination probe).
`data/trajectories/dpo_pairs.jsonl` unchanged at 1,824. All `_*.tmp.mjs` probe
scripts and the `_env_backup.tmp` copy were deleted.
