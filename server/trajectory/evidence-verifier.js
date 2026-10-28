// SIS 1.0 — Evidence Verifier & Mastery Ledger
//
// Encodes the REA (reverse-engineer-anything) evidence discipline as runtime
// behaviour, so the learner cannot report an inference as a measurement:
//
//   OBSERVED  — produced by a deterministic oracle that ran. Reproducible.
//   INFERRED  — follows from observed facts by reasoning; never a score.
//   UNKNOWN   — not established. Recorded with the authority that would settle it.
//
// The rule this file exists to enforce: a reward may only be issued from an
// OBSERVED oracle. Differential agreement, structural smoke tests, model
// self-assessment and any synthesized number are candidate signals, not
// evidence, and are recorded as such instead of being converted into a score.
//
// RewardVerifier remains the single scoring authority. This module never
// re-implements its ladder — it decides whether RewardVerifier is allowed to
// see real inputs, and records why.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sandbox from '../coder/sandbox.js';
import { RewardVerifier } from './reward-verifier.js';
import { synthesizeOracle, ORACLE_SOURCE } from './oracle-synth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = path.join(__dirname, '../../data/mastery');
const LEDGER_FILE = path.join(EVIDENCE_DIR, 'evidence-ledger.json');

export const GRADE = Object.freeze({
  OBSERVED: 'OBSERVED',
  INFERRED: 'INFERRED',
  UNKNOWN: 'UNKNOWN',
});

/**
 * Oracle tiers, strongest first. Only EXPECTED_OUTPUT can yield a reward.
 *  - EXPECTED_OUTPUT: the benchmark asserts concrete expected values.
 *  - DIFFERENTIAL:    independent candidates agree on randomly generated inputs.
 *                     Agreement between two implementations is evidence of
 *                     consistency, not of correctness — INFERRED.
 *  - STRUCTURAL:      smoke checks (is a function, does not throw). Never scored.
 *  - NONE:            nothing executable was produced.
 */
export const ORACLE = Object.freeze({
  EXPECTED_OUTPUT: 'EXPECTED_OUTPUT',
  DIFFERENTIAL: 'DIFFERENTIAL',
  STRUCTURAL: 'STRUCTURAL',
  NONE: 'NONE',
});

/**
 * Append-only evidence ledger. Mirrors REA's record_unknown / update_unknown:
 * an unresolved question is stored with the authority that would settle it,
 * and can only be closed by naming observed evidence.
 */
/**
 * Retention is a documented cap, not an accident of `slice()` in `_save()`.
 *
 * Until 2026-10-22 the writer kept `entries.slice(-2000)` and
 * `unknowns.slice(-500)` while nothing ever trimmed the in-memory arrays and
 * `_load()` accepted any length. A file holding 2,500 entries — restored from a
 * backup, migrated, or written by another process — loaded in full, `getState()`
 * counted all of it, and the next mutation dropped the oldest 500 with no
 * record anywhere. Silent loss of evidence is the one failure this ledger
 * exists to prevent, so the cap is now enforced on load and every eviction is
 * written into `evictions` with the ids that were dropped.
 *
 * `evictions` is itself bounded: the newest RETENTION.evictionRecords events are
 * kept, and `droppedTotal` carries the running count of everything evicted, so
 * bounded metadata never hides unbounded loss.
 */
export const RETENTION = Object.freeze({
  entries: 2000,
  unknowns: 500,
  evictionRecords: 200,
  // Summaries of evicted evidence ids, so a resolved unknown citing one stays
  // resolvable instead of becoming indistinguishable from an id never issued.
  tombstoneEntries: 5000,
});

export class EvidenceLedger {
  constructor(file = LEDGER_FILE) {
    this.file = file;
    this.entries = [];
    this.unknowns = [];
    this.evictions = [];
    this.droppedTotal = { entries: 0, unknowns: 0 };
    this.tombstones = new Map(); // evidenceId -> { grade, claim, timestamp }
    this.unknownTombstones = new Map();
    this._ensure();
    this._load();
  }

  _ensure() {
    try {
      if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    } catch (e) {
      console.warn('[EvidenceLedger] Ensure store notice:', e.message);
    }
  }

  /**
   * Read the store from disk, replacing memory.
   *
   * A missing file is authoritative and means empty. An unreadable or malformed
   * file is not: memory is left alone, so a corrupt read does not destroy what
   * this process already knows and then write the loss back out.
   */
  _load() {
    try {
      if (!fs.existsSync(this.file)) {
        this.entries = [];
        this.unknowns = [];
        return;
      }
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      this.entries = Array.isArray(raw.entries) ? raw.entries : [];
      this.unknowns = Array.isArray(raw.unknowns) ? raw.unknowns : [];
      this.evictions = Array.isArray(raw.evictions) ? raw.evictions.slice() : [];
      // Evictions recorded in memory by a load that has not yet been saved.
      // Written before the previous save's file content, so they are carried
      // here rather than lost when the file is replaced.
      if (raw._capCache) this._pendingEvictions = raw._capCache;
      this.droppedTotal = {
        entries: Number(raw.droppedTotal?.entries) || 0,
        unknowns: Number(raw.droppedTotal?.unknowns) || 0,
      };
      for (const t of Array.isArray(raw.tombstoneEntries) ? raw.tombstoneEntries : []) {
        if (t && t.evidenceId) this.tombstones.set(t.evidenceId, t);
      }
      for (const t of Array.isArray(raw.tombstoneUnknowns) ? raw.tombstoneUnknowns : []) {
        if (t && t.unknownId) this.unknownTombstones.set(t.unknownId, t);
      }
      // Enforce the cap HERE, where it is still visible, rather than letting
      // _save() do it invisibly on the next write.
      //
      // An over-cap file is trimmed, the drop is recorded, AND the trimmed
      // store is written back immediately. Persisting at load time is what
      // makes the count stable: `_refresh()` runs `_load()` before every read
      // and every mutation, so an unpersisted trim would be recomputed — and
      // re-recorded — on every access. Writing only when something was
      // actually evicted keeps the common read path read-only.
      const evictedAtLoad = this._enforceCaps('load');
      if (evictedAtLoad > 0) this._write();
    } catch (e) {
      console.warn('[EvidenceLedger] Load notice:', e.message);
    }
  }

  /**
   * Trim to the documented caps and record exactly what was dropped.
   *
   * Runs on load and again before every save. Idempotent: when nothing is over
   * the cap it records nothing.
   */
  _enforceCaps(trigger = 'save') {
    let totalEvicted = 0;
    const drop = (arr, cap, kind, tombstoneMap, idKey) => {
      const over = arr.length - cap;
      if (over <= 0) return arr;
      totalEvicted += over;
      const evicted = arr.slice(0, over);
      for (const item of evicted) {
        const id = item?.[idKey];
        if (!id) continue;
        // Newest wins if the id somehow recurs; the map is bounded below.
        tombstoneMap.set(
          id,
          kind === 'entries'
            ? {
                evidenceId: id,
                grade: item.grade ?? null,
                claim: String(item.claim || '').slice(0, 200),
                timestamp: item.timestamp ?? null,
              }
            : {
                unknownId: id,
                question: String(item.question || '').slice(0, 200),
                status: item.status ?? null,
              },
        );
      }
      this.droppedTotal[kind] += evicted.length;
      this.evictions.push({
        at: Date.now(),
        trigger,
        kind,
        count: evicted.length,
        cap,
        ids: evicted
          .map((i) => i?.[idKey])
          .filter(Boolean)
          .slice(-50),
        oldest: evicted[0]?.timestamp ?? evicted[0]?.createdAt ?? null,
        newest:
          evicted[evicted.length - 1]?.timestamp ?? evicted[evicted.length - 1]?.createdAt ?? null,
      });
      return arr.slice(over);
    };

    this.entries = drop(this.entries, RETENTION.entries, 'entries', this.tombstones, 'evidenceId');
    this.unknowns = drop(
      this.unknowns,
      RETENTION.unknowns,
      'unknowns',
      this.unknownTombstones,
      'unknownId',
    );

    if (this.evictions.length > RETENTION.evictionRecords) {
      this.evictions = this.evictions.slice(-RETENTION.evictionRecords);
    }
    // Bound the tombstones too. The map keeps insertion order, so the oldest
    // summaries fall off first — same policy as the arrays they stand in for.
    const trimMap = (m, cap, idKey) => {
      if (m.size <= cap) return;
      for (const k of [...m.keys()].slice(0, m.size - cap)) m.delete(k);
    };
    trimMap(this.tombstones, RETENTION.tombstoneEntries, 'evidenceId');
    trimMap(this.unknownTombstones, RETENTION.tombstoneEntries, 'unknownId');
    return totalEvicted;
  }

  /**
   * Re-read the store before touching it.
   *
   * The ledger is a file other things can edit — a reset, a migration, another
   * process. Holding a copy in memory and writing the whole array back means
   * any of those edits is silently overwritten by this process's stale view;
   * observed on 2026-10-21, when a running server kept returning three entries
   * after the file had been emptied. Disk is the source of truth: sync first,
   * then mutate. Every mutation saves immediately, so memory is never ahead of
   * disk by more than the synchronous call that is in progress.
   */
  _refresh() {
    this._load();
    return this;
  }

  /** Atomic write of the current in-memory store. Caller has already capped. */
  _write() {
    try {
      const tmp = `${this.file}.tmp_${Date.now()}`;
      fs.writeFileSync(
        tmp,
        JSON.stringify(
          {
            updatedAt: new Date().toISOString(),
            retention: { ...RETENTION },
            droppedTotal: { ...this.droppedTotal },
            entries: this.entries,
            unknowns: this.unknowns,
            evictions: this.evictions,
            tombstoneEntries: [...this.tombstones.values()],
            tombstoneUnknowns: [...this.unknownTombstones.values()],
          },
          null,
          2,
        ),
        'utf8',
      );
      fs.renameSync(tmp, this.file);
    } catch (e) {
      console.warn('[EvidenceLedger] Write notice:', e.message);
    }
  }

  _save() {
    // Enforce before writing, so the file and memory agree and the eviction
    // record describes the same drop the next reader will see. A push that
    // tips the array one over the cap evicts exactly one.
    this._enforceCaps('save');
    this._write();
  }

  /** Record a graded claim with its citation, coverage and limitations. */
  record({ id, claim, grade, citation = '', coverage = '', limitations = [], subject = null }) {
    this._refresh();
    const entry = {
      evidenceId: id || `E-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      claim: String(claim || '').slice(0, 600),
      grade: grade === GRADE.OBSERVED || grade === GRADE.INFERRED ? grade : GRADE.UNKNOWN,
      citation,
      coverage,
      limitations: Array.isArray(limitations) ? limitations : [limitations].filter(Boolean),
      subject,
      timestamp: Date.now(),
    };
    this.entries.push(entry);
    this._save();
    return entry;
  }

  /**
   * Record an unresolved question. Equivalent to REA's record_unknown:
   * name the authority or environment that would settle it.
   */
  recordUnknown({
    question,
    neededAuthority = '',
    supporting = [],
    contradicting = [],
    subject = null,
  }) {
    this._refresh();
    const existing = this.unknowns.find((u) => u.question === question && u.status === 'open');
    if (existing) {
      existing.supporting = Array.from(new Set([...(existing.supporting || []), ...supporting]));
      existing.contradicting = Array.from(
        new Set([...(existing.contradicting || []), ...contradicting]),
      );
      existing.updatedAt = Date.now();
      this._save();
      return existing;
    }
    const unknown = {
      unknownId: `U-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      question: String(question || '').slice(0, 400),
      neededAuthority,
      supporting,
      contradicting,
      subject,
      status: 'open',
      resolution: null,
      createdAt: Date.now(),
    };
    this.unknowns.push(unknown);
    this._save();
    return unknown;
  }

  /**
   * Close an unknown. Only an OBSERVED evidence id may verify a resolution —
   * an inference closes nothing.
   */
  updateUnknown(unknownId, { resolution, evidenceId = null }) {
    this._refresh();
    const unknown = this.unknowns.find((u) => u.unknownId === unknownId);
    if (!unknown) return { ok: false, reason: 'unknown_id_not_found' };
    if (unknown.status !== 'open') return { ok: false, reason: 'already_resolved', unknown };

    if (evidenceId) {
      const ev = this.entries.find((e) => e.evidenceId === evidenceId);
      if (!ev) {
        // Distinguish "evicted under the documented cap" from "never existed".
        // The two used to be indistinguishable, which made a legitimate
        // resolution look like a fabrication after retention rolled over.
        const tomb = this.tombstones.get(evidenceId);
        if (tomb) {
          return {
            ok: false,
            reason: 'evidence_id_evicted',
            detail: `Evidence ${evidenceId} was retained when written (grade ${tomb.grade}) but has since been evicted by the documented ${RETENTION.entries}-entry cap. Re-observe it to cite it.`,
            grade: tomb.grade,
          };
        }
        return { ok: false, reason: 'evidence_id_not_found' };
      }
      if (ev.grade !== GRADE.OBSERVED)
        return { ok: false, reason: 'evidence_not_observed', grade: ev.grade };
    }

    unknown.status = 'resolved';
    unknown.resolution = String(resolution || '').slice(0, 600);
    unknown.verifiedBy = evidenceId;
    unknown.resolvedAt = Date.now();
    this._save();
    return { ok: true, unknown };
  }

  getOpenUnknowns() {
    this._refresh();
    return this.unknowns.filter((u) => u.status === 'open');
  }

  getState() {
    this._refresh();
    const byGrade = { OBSERVED: 0, INFERRED: 0, UNKNOWN: 0 };
    for (const e of this.entries) byGrade[e.grade] = (byGrade[e.grade] || 0) + 1;
    return {
      totalEntries: this.entries.length,
      byGrade,
      openUnknowns: this.unknowns.filter((u) => u.status === 'open').length,
      resolvedUnknowns: this.unknowns.filter((u) => u.status === 'resolved').length,
      recentEntries: this.entries.slice(-20).reverse(),
      unknowns: this.unknowns.slice(-50).reverse(),
      // Retention is reported, not inferred from a gap in timestamps. A reader
      // can now tell "the ledger is young" from "the ledger dropped 500
      // entries", which was previously impossible.
      retention: { ...RETENTION },
      droppedTotal: { ...this.droppedTotal },
      evictions: this.evictions.slice(-20).reverse(),
    };
  }
}

export class SkillVerifier {
  /**
   * Name the artifact after what it actually is.
   *
   * The sandbox picks its syntax checker from the file extension, so handing it
   * every candidate as `candidate.js` runs `node --check` on HTML. That fails,
   * and the failure is recorded as OBSERVED — a real observation of the wrong
   * thing, written permanently against the skill. Infer from the content.
   */
  static inferArtifactTarget(code = '') {
    const text = String(code || '').trim();
    const head = text.slice(0, 4000).toLowerCase();

    if (head.startsWith('<!doctype html') || head.startsWith('<html') || /<html[\s>]/.test(head)) {
      return { targetFile: 'candidate.html', language: 'html' };
    }
    if (head.startsWith('<?php')) {
      return { targetFile: 'candidate.php', language: 'php' };
    }
    if (/^(\s*)(def |class |import |from .* import )/m.test(text) && /:\s*$/m.test(text)) {
      return { targetFile: 'candidate.py', language: 'python' };
    }
    if (head.startsWith('{') || head.startsWith('[')) {
      try {
        JSON.parse(text);
        return { targetFile: 'candidate.json', language: 'json' };
      } catch {
        /* not JSON */
      }
    }
    return { targetFile: 'candidate.js', language: 'javascript' };
  }

  /**
   * Adjudicate a candidate skill from an executed artifact.
   *
   * Returns an Evidence record. `reward` is non-null ONLY when a deterministic
   * expected-output oracle actually ran; every other path returns reward: null
   * and a grade explaining what is and is not established.
   *
   * @param {Object} p
   * @param {string} p.question
   * @param {boolean} p.codePresent
   * @param {number|null} p.sandboxExitCode
   * @param {string} [p.sandboxStderr]
   * @param {Object|null} p.parsed  Parsed benchmark output {c1,c2,master,oracle,casesTotal}
   * @param {string} [p.oracle]     ORACLE.*
   * @param {string} [p.runId]
   */
  static adjudicate({
    question = '',
    codePresent = false,
    sandboxExitCode = null,
    sandboxStderr = '',
    parsed = null,
    oracle = ORACLE.NONE,
    runId = null,
    executed = true,
    syntaxFailed = false,
    language = 'the target language',
  } = {}) {
    const base = {
      question: String(question || '').slice(0, 300),
      runId,
      oracle,
      sandboxExitCode,
      codePresent,
      executedAt: Date.now(),
    };

    if (!codePresent) {
      return {
        ...base,
        grade: GRADE.UNKNOWN,
        status: 'NO_EXECUTABLE_CODE',
        reward: null,
        claim: 'No candidate contained executable code, so nothing could be verified.',
        limitations: ['The solution was prose, pseudocode, or an empty code block.'],
        residualUnknown:
          'Whether the described design is correct cannot be settled without an implementation.',
      };
    }

    if (sandboxExitCode === null || sandboxExitCode === undefined) {
      return {
        ...base,
        grade: GRADE.UNKNOWN,
        status: 'NOT_EXECUTED',
        reward: null,
        claim: 'The sandbox did not report an exit code; execution is unobserved.',
        limitations: [sandboxStderr || 'No exit status was returned.'],
        residualUnknown: 'Whether the artifact runs at all.',
      };
    }

    if (sandboxExitCode !== 0 && syntaxFailed) {
      // A parse failure means the sandbox never reached the behaviour under
      // test. For a stored *snippet* this usually means it was never source
      // code — it is prose, a diagram, or a fragment lifted out of context.
      // Recording reward 0 here would assert "this recipe fails", which nothing
      // observed; it only establishes "this is not a valid program".
      return {
        ...base,
        grade: GRADE.INFERRED,
        status: 'NOT_SOURCE_CODE',
        reward: null,
        claim: `The stored snippet does not parse as ${language}, so it could not be executed.`,
        limitations: [
          'A syntax error establishes that the snippet is not runnable source, not that the recipe is wrong.',
          'Stored snippets are often excerpts or prose; absent the surrounding program, behaviour is unobservable.',
        ],
        residualUnknown:
          'Whether the described technique works cannot be settled from this artifact alone.',
      };
    }

    // A test suite that RAN and reported its own case counts is not an
    // execution failure just because it exited non-zero: the non-zero exit is
    // the failing assertion. Sending it down the EXECUTION_FAILED branch would
    // report "the candidate does not run" and throw away passed/total, which is
    // the one thing the run established. RewardVerifier's FAIL_TO_PASS gate is
    // the correct home for this, so fall through to it.
    const reportedCases =
      oracle === ORACLE.EXPECTED_OUTPUT &&
      parsed &&
      typeof parsed.master?.total === 'number' &&
      parsed.master.total > 0;

    if (sandboxExitCode !== 0 && !reportedCases) {
      // Observing a failure is itself a real observation.
      return {
        ...base,
        grade: GRADE.OBSERVED,
        status: 'EXECUTION_FAILED',
        reward: 0.0,
        claim: `Artifact exited with code ${sandboxExitCode}; the candidate does not run.`,
        limitations: [],
        residualUnknown:
          'Which specific assertion or statement failed is in stderr, not summarised here.',
      };
    }

    if (!executed) {
      // The sandbox's syntax-only path returns exitCode 0 without running the
      // artifact. Reporting that as "ran cleanly" would be the exact
      // inspection-as-execution conflation this file exists to prevent.
      return {
        ...base,
        grade: GRADE.INFERRED,
        status: 'SYNTAX_ONLY',
        reward: null,
        claim: 'The artifact parses. It was not executed, so no behaviour was observed.',
        limitations: [
          'A syntax check establishes that the file is well-formed, nothing more.',
          'Supply expected-output tests (or a run command) to execute it and reach OBSERVED.',
        ],
        residualUnknown: 'Whether the artifact does what it claims.',
      };
    }

    if (oracle !== ORACLE.EXPECTED_OUTPUT) {
      const m = parsed?.master || {};
      const observed =
        typeof m.passed === 'number' && typeof m.total === 'number'
          ? `${m.passed}/${m.total} differential checks agreed`
          : 'no case results were parsed';
      return {
        ...base,
        grade: GRADE.INFERRED,
        status:
          oracle === ORACLE.DIFFERENTIAL ? 'DIFFERENTIAL_AGREEMENT_ONLY' : 'STRUCTURAL_CHECKS_ONLY',
        reward: null,
        claim: `Artifact ran cleanly, but the available oracle was ${oracle} (${observed}). Correctness is not established.`,
        limitations: [
          'Agreement between independent implementations is consistency, not correctness.',
          'No expected output was asserted, so a uniformly wrong implementation would also pass.',
        ],
        residualUnknown:
          'Whether the implementation is correct for inputs outside the sampled cases.',
      };
    }

    // Deterministic expected-output oracle ran: RewardVerifier is now allowed
    // to score, and it receives the true exit code and real test counts.
    const m = parsed?.master || {};
    const total = Number(m.total) || 0;
    const passed = Number(m.passed) || 0;
    const verdict = RewardVerifier.evaluate({
      // When the suite printed its own counts, a non-zero exit IS the failing
      // assertion — not a process that failed to run. Passing it through as
      // exitCode would trip RewardVerifier's first gate and report
      // FAILED_EXECUTION, losing the distinction between "1 of 2 cases wrong"
      // and "the candidate is dead". The case counts carry that verdict; the
      // process failure case was already handled above.
      exitCode: 0,
      parsedTests: {
        total,
        passed,
        failed: Math.max(0, total - passed),
        failToPassTotal: total,
        failToPassPassed: passed,
        passToPassTotal: 1,
        passToPassPassed: passed === total && total > 0 ? 1 : 0,
      },
      durationMs: Number(parsed?.master?.latencyNs) ? Math.round(parsed.master.latencyNs / 1e6) : 0,
    });

    return {
      ...base,
      grade: GRADE.OBSERVED,
      status: verdict.status,
      reward: verdict.reward,
      scoreBreakdown: verdict.scoreBreakdown,
      testsPassed: passed,
      testsTotal: total,
      claim: `Deterministic assertion against expected outputs: ${passed}/${total} cases passed (${verdict.status}).`,
      limitations: ['Covers only the declared input cases.'],
      residualUnknown: null,
    };
  }

  /**
   * Execute a candidate artifact in the sandbox and adjudicate it.
   * Returns { sandboxResult, evidence }.
   */
  static async verifyArtifact({
    question = '',
    code = '',
    testCode = '',
    recipe = '',
    runCommand = '',
    targetFile = null,
    language = null,
    runId = `verify_${Date.now()}`,
  } = {}) {
    const codePresent = typeof code === 'string' && code.trim().length > 20;
    if (!codePresent) {
      return {
        sandboxResult: null,
        evidence: SkillVerifier.adjudicate({ question, codePresent: false, runId }),
      };
    }

    // No caller-supplied suite: try to lift one from expected values the record
    // itself states. This is the difference between "nothing ever asks the
    // verifier to verify" and a verification — but only when a real contract
    // exists. `synthesized` is null when the record states none, and the run
    // then stays on whatever oracle the caller supplied.
    let synthesized = null;
    let effectiveTestCode = testCode || '';
    if (!effectiveTestCode) {
      synthesized = synthesizeOracle({ code, recipe, name: question });
      if (synthesized) effectiveTestCode = synthesized.testCode;
    }

    // Callers that know the artifact type may pass it; otherwise infer it from
    // the content rather than assuming every recipe is JavaScript.
    const inferred = SkillVerifier.inferArtifactTarget(code);
    const target = {
      targetFile: targetFile || inferred.targetFile,
      language: language || inferred.language,
    };

    let sandboxResult;
    try {
      // A synthesized suite embeds the artifact, so it must not also be written
      // as a target file the runner would try to execute on its own. Hand the
      // sandbox the suite as the whole program — and give it a runCommand.
      //
      // Without `testCode` or `runCommand`, sandbox.execute() writes the file,
      // runs `node --check`, and returns exit 0 without ever executing it. A
      // suite passed as `code` alone would therefore be graded SYNTAX_ONLY
      // forever. That silent no-execute default is the mechanical reason
      // nothing in this repo ever reached OBSERVED.
      const runDraft = synthesized
        ? {
            targetFile: 'oracle_suite.js',
            language: 'javascript',
            code: effectiveTestCode,
            runCommand: 'node oracle_suite.js',
          }
        : {
            targetFile: target.targetFile,
            language: target.language,
            code,
            testCode: effectiveTestCode || undefined,
            runCommand: runCommand || undefined,
          };

      sandboxResult = await sandbox.execute(runDraft, runId);
    } catch (e) {
      return {
        sandboxResult: null,
        evidence: SkillVerifier.adjudicate({
          question,
          codePresent,
          sandboxExitCode: null,
          sandboxStderr: e.message,
          runId,
        }),
      };
    }

    // A test script that prints its own counts is the only path to an
    // EXPECTED_OUTPUT grade here; without one the oracle is structural.
    const parsed = SkillVerifier.parseTestOutput(sandboxResult.stdout);
    const oracle = effectiveTestCode && parsed ? ORACLE.EXPECTED_OUTPUT : ORACLE.NONE;

    // `phase === 'syntax'` is the sandbox's syntax-only return: it never ran
    // the artifact. Do not let a parse check reach the OBSERVED branch.
    const executed =
      sandboxResult.phase !== 'syntax' || Boolean(effectiveTestCode) || Boolean(runCommand);

    // A non-zero exit from the syntax phase is a parse failure, not a
    // behavioural one — the artifact's claims were never exercised.
    const syntaxFailed = sandboxResult.phase === 'syntax' && sandboxResult.exitCode !== 0;

    const evidence = SkillVerifier.adjudicate({
      question,
      codePresent,
      sandboxExitCode: sandboxResult.exitCode,
      sandboxStderr: sandboxResult.stderr,
      parsed: parsed ? { master: parsed } : null,
      oracle,
      runId,
      executed,
      syntaxFailed,
      language: target.language,
    });

    // State where the expected values came from. A suite the caller typed and a
    // suite lifted from the record's own stated contract are different evidence,
    // and the ledger entry must not blur them.
    evidence.oracleProvenance = synthesized
      ? { source: synthesized.source, cases: synthesized.cases, detail: synthesized.detail }
      : effectiveTestCode
        ? { source: 'CALLER_SUPPLIED', cases: parsed?.total ?? null, detail: [] }
        : { source: ORACLE_SOURCE.NONE, cases: 0, detail: [] };

    return { sandboxResult, evidence };
  }

  /**
   * Parse a `{"c1":…,"c2":…,"master":…}` line, or a `{passed,total}` line,
   * from stdout. Returns null rather than inventing counts.
   */
  static parseTestOutput(stdout = '') {
    if (!stdout || typeof stdout !== 'string') return null;
    const lines = stdout.trim().split('\n').reverse();
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) continue;
      try {
        const obj = JSON.parse(trimmed);
        if (!obj || typeof obj !== 'object') continue;

        // A shape was previously accepted whenever `master` was any object.
        // Observed on 2026-10-22: model-written suites emit
        // {"oracle":"<prose>","master":{"passed":4,"total":4,"latencyNs":"1641900"}}
        // — prose in the discriminator, and a STRING latency. Accepting that as
        // an expected-output report is the same vacuity E-02 removed from the
        // gym, one layer down. Require a numeric passed/total and a discriminator
        // that is either the literal EXPECTED_OUTPUT or absent.
        const hasCounts =
          obj.master &&
          typeof obj.master === 'object' &&
          Number.isInteger(obj.master.passed) &&
          Number.isInteger(obj.master.total) &&
          obj.master.total > 0;
        if (hasCounts) {
          const disc = obj.oracle;
          if (disc === undefined || disc === null || disc === ORACLE.EXPECTED_OUTPUT) return obj;
          // A non-literal discriminator (prose, a class name) is not evidence
          // of an expected-output oracle. Report it so the caller can record a
          // malformed suite instead of silently scoring it.
          return { ...obj, _malformedDiscriminator: String(disc).slice(0, 200) };
        }

        if (Number.isInteger(obj.passed) && Number.isInteger(obj.total) && obj.total > 0)
          return obj;
      } catch {
        /* not the summary line */
      }
    }
    return null;
  }
}

export const evidenceLedger = new EvidenceLedger();
export default evidenceLedger;
