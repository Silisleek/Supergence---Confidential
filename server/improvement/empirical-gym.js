// SIS 1.0 — Autonomous Empirical Execution Gym
// Empirically compiles, benchmarks, stress-tests, and verifies candidate solutions in a sandbox.
// Measures real execution latency (μs/ms) and edge-case test passes.
//
// EVIDENCE DISCIPLINE (see server/trajectory/evidence-verifier.js):
//  - A reward is issued only when a deterministic expected-output oracle ran.
//  - Differential agreement between candidates is INFERRED, never scored.
//  - Structural smoke checks ("it returns something") are not an oracle at all.
//  - Latency is reported only when measured. Missing measurement is null, not a default.
//  - The sandbox's true exit code is what the verifier sees.

import sandbox from '../coder/sandbox.js';
import { quickAI, DEFAULT_MODEL } from '../api/openrouter.js';
import { TrajectoryLogger } from '../trajectory/trajectory-logger.js';
import { RewardVerifier } from '../trajectory/reward-verifier.js';
import { SkillVerifier, ORACLE, GRADE } from '../trajectory/evidence-verifier.js';
import { synthesizeOracle } from '../trajectory/oracle-synth.js';

export class EmpiricalGym {
  constructor() {
    this.stats = {
      totalBenchmarksRun: 0,
      expectedOutputVerified: 0,
      differentialOnly: 0,
      executionFailures: 0,
      noExecutableCode: 0,
    };
    this.logger = new TrajectoryLogger('empirical_gym_benchmarks');
  }

  /**
   * Check if a challenge domain or text represents an executable computational problem
   */
  isExecutable(domain = '', text = '') {
    const d = (domain || '').toLowerCase();
    const t = (text || '').toLowerCase();
    if (
      [
        'coding',
        'algorithms',
        'architecture',
        'distributed',
        'security',
        'data-structures',
      ].includes(d)
    ) {
      return true;
    }
    return /algorithm|function|implementation|code|benchmark|latency|throughput|parser|buffer|concurrency|lock-free|hash|tree|cache/i.test(
      t,
    );
  }

  /**
   * Extract executable JavaScript code from a solution string
   */
  extractCode(text = '') {
    if (!text) return '';
    const jsMatch = text.match(/```(?:javascript|js)\r?\n([\s\S]*?)```/i);
    if (jsMatch && jsMatch[1].trim().length > 20) {
      return jsMatch[1].trim();
    }
    const genericMatch = text.match(/```[a-zA-Z0-9_\-]*\r?\n([\s\S]*?)```/);
    if (genericMatch && genericMatch[1].trim().length > 20) {
      return genericMatch[1].trim();
    }
    return '';
  }

  /**
   * Ask the model to compile a benchmark suite with concrete expected outputs.
   *
   * The contract is explicit: the emitted script must assert against expected
   * values derived from the challenge statement. If the model cannot state an
   * expected value for a case, it must omit the case — an omitted case lowers
   * coverage, which is visible, whereas a fabricated expectation is not.
   */
  async synthesizeBenchmarkSuite(question, codeCandidate1, codeCandidate2, masterCode = '') {
    const prompt = `You are the Empirical Benchmark Compiler for Supergence.

Challenge: "${question}"

Write a single self-contained Node.js script (CommonJS) that VERIFIES correctness, not just execution.

Requirements:
1. Embed each implementation as a top-level \`const\` — \`implCandidate1\`, \`implCandidate2\`, and \`implMaster\` if master code is provided. Wrap each in try/catch; if it fails to load, set it to null.
2. Define an array \`CASES\` of at least 4 test cases. Each case MUST have an \`input\` and an \`expected\` value that is unambiguously correct for this challenge. Derive expected values from the challenge statement itself. Do NOT use the candidate's own output as its expected value.
3. For each implementation, run every case and count a pass ONLY when the result deep-equals \`expected\`. Use a stable deep-equal helper inlined in the script.
4. Compute latency with \`process.hrtime.bigint()\` over warm-up plus measured iterations, once per implementation. If an implementation is null, set its latencyNs to null.
5. Emit exactly one line at the end: JSON with this shape and nothing after it:
{"oracle":"EXPECTED_OUTPUT","casesTotal":4,"c1":{"passed":0,"total":0,"latencyNs":null},"c2":{"passed":0,"total":0,"latencyNs":null},"master":{"passed":0,"total":0,"latencyNs":null},"notes":"..."}
6. Use only Node built-ins. No network. No file reads.

Return ONLY the executable code inside \`\`\`javascript ... \`\`\`.`;

    const userMessage = `Candidate 1 Code:\n${codeCandidate1.slice(0, 1500)}\n\nCandidate 2 Code:\n${codeCandidate2.slice(0, 1500)}\n\nMaster Code:\n${masterCode.slice(0, 1500)}`;

    try {
      const response = await quickAI(prompt, userMessage, DEFAULT_MODEL, 3500);
      const code = this.extractCode(response);
      if (!code) return null;
      // Reject a suite that cannot assert anything — the previous version's
      // `fn(c) !== undefined` check is exactly what this guard exists to stop.
      if (!/expected/i.test(code) || /!==\s*undefined/.test(code)) return null;
      return code;
    } catch (err) {
      console.warn('[EmpiricalGym] AI benchmark synthesis notice:', err.message);
      return null;
    }
  }

  /**
   * Lift expected values the master artifact states about itself.
   *
   * Returns null when the artifact asserts nothing. This is NOT an
   * EXPECTED_OUTPUT oracle: the artifact supplied its own expectations, so a
   * pass proves the code is self-consistent, not that the expectations are
   * right. That is why the gym reports the count but keeps the grade INFERRED.
   */
  _liftMasterContract(codeMaster = '') {
    if (!codeMaster || !String(codeMaster).trim()) return null;
    const lifted = synthesizeOracle({ code: codeMaster, recipe: '' });
    if (!lifted || !lifted.caseSource) return null;
    return { code: codeMaster, cases: lifted.detail.length, caseSource: lifted.caseSource };
  }

  /**
   * Fallback: a differential benchmark. Runs the candidates on a deterministic
   * input set and reports where they agree. This establishes consistency only —
   * the result is graded INFERRED and never rewarded.
   */
  _buildDifferentialBenchmark(question, code1 = '', code2 = '', codeMaster = '', contract = null) {
    return `
// Supergence Differential Benchmark (agreement only) for: ${JSON.stringify(question)}
const loadImpl = (src) => {
  if (!src || !src.trim()) return null;
  try {
    const fn = new Function(src + '\\n;return typeof solve === "function" ? solve : (typeof solution === "function" ? solution : null);')();
    return typeof fn === 'function' ? fn : null;
  } catch (e) {
    return null;
  }
};

const fn1 = loadImpl(${JSON.stringify(code1)});
const fn2 = loadImpl(${JSON.stringify(code2)});
const fnM = loadImpl(${JSON.stringify(codeMaster)});

// A contract block lifts expected values the artifact itself states, so the
// fallback can report a real case result instead of "no implementation".
const CONTRACT = ${JSON.stringify(contract || null)};
const contractScore = () => {
  if (!CONTRACT || !Array.isArray(CONTRACT.cases) || !CONTRACT.cases.length) return null;
  try {
    const factory = new Function(CONTRACT.code + "\\n;return [" + CONTRACT.caseSource + "\\n];");
    const cases = factory();
    let passed = 0;
    for (const c of cases) { try { if (deepEq(c.run(), c.expected)) passed++; } catch {} }
    return { passed, total: cases.length };
  } catch (e) {
    return { passed: 0, total: CONTRACT.cases.length, error: e && e.message };
  }
};
const deepEq = (a, b) => {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (typeof a !== 'object') return Number.isNaN(a) && Number.isNaN(b);
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every(k => deepEq(a[k], b[k]));
};

const norm = (v) => {
  try {
    if (typeof v === 'number' && Number.isNaN(v)) return 'NaN';
    if (v instanceof Set) return 'Set:' + JSON.stringify([...v].sort());
    if (v instanceof Map) return 'Map:' + JSON.stringify([...v.entries()].sort());
    return JSON.stringify(v, (k, val) => typeof val === 'bigint' ? val.toString() + 'n' : val);
  } catch { return String(v); }
};

const CASES = [0, 1, 2, -1, [1, 2, 3], [], 'test', '', 1000, -1000, 3.5];

const run = (fn) => {
  if (!fn) return { results: null, passed: 0, total: 0 };
  const results = [];
  for (const c of CASES) {
    try { results.push(norm(fn(c))); } catch (e) { results.push('THROW:' + (e && e.name)); }
  }
  return { results, passed: 0, total: CASES.length };
};

const r1 = run(fn1);
const r2 = run(fn2);
const rM = run(fnM);

const consensus = (i) => {
  const votes = [r1.results && r1.results[i], r2.results && r2.results[i]].filter(v => v !== null && v !== undefined);
  if (votes.length === 0) return null;
  const counts = {};
  for (const v of votes) counts[v] = (counts[v] || 0) + 1;
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
};

const score = (r) => {
  if (!r.results) return { passed: 0, total: 0 };
  let passed = 0;
  for (let i = 0; i < CASES.length; i++) {
    const c = consensus(i);
    if (c !== null && r.results[i] === c) passed++;
  }
  return { passed, total: CASES.length };
};

const s1 = score(r1), s2 = score(r2), sM = score(rM);
// If the artifact states its own contract, the master's real case result is
// reported alongside the differential agreement. It is NOT upgraded to an
// EXPECTED_OUTPUT oracle here: the gym cannot prove the contract was authored
// independently of the implementation, so the grade stays INFERRED and the
// case result is advisory. Only the mastery verifier, which runs the contract
// against the stored artifact as a separate act, issues a reward.
const cM = contractScore();

const measure = (fn) => {
  if (typeof fn !== 'function') return null;
  for (let i = 0; i < 200; i++) { try { fn(i); } catch {} }
  const start = process.hrtime.bigint();
  for (let i = 0; i < 5000; i++) { try { fn(i); } catch {} }
  const end = process.hrtime.bigint();
  const ns = Number(end - start);
  return ns > 0 ? ns : null;
};

const output = {
  oracle: ${JSON.stringify(ORACLE.DIFFERENTIAL)},
  casesTotal: CASES.length,
  contractCases: cM ? cM.total : 0,
  c1: { passed: s1.passed, total: s1.total, latencyNs: measure(fn1) },
  c2: { passed: s2.passed, total: s2.total, latencyNs: measure(fn2) },
  master: { passed: sM.passed, total: sM.total, latencyNs: measure(fnM) },
  contract: cM,
  notes: cM
    ? "Differential agreement plus the artifact's own stated cases; the grade is INFERRED because the contract's independence is unproven"
    : "Differential agreement only; no expected outputs were asserted"
};

console.log(JSON.stringify(output));
`;
  }

  /**
   * Run the empirical benchmark in the isolated sandbox and parse results.
   *
   * @returns {Promise<Object>} {
   *   executed, sandboxExitCode, parsed, verification, speedupMultiplier|null,
   *   latencyGainPercent|null, isEmpiricallySuperior
   * }
   */
  async runEmpiricalTournament(question, solution1, solution2, masterSolution = '') {
    this.stats.totalBenchmarksRun++;
    const runId = `gym_${Date.now()}`;

    const code1 = this.extractCode(solution1);
    const code2 = this.extractCode(solution2);
    const codeMaster = this.extractCode(masterSolution);
    const anyCode = Boolean(code1 || code2 || codeMaster);

    if (!anyCode) {
      this.stats.noExecutableCode++;
      const evidence = SkillVerifier.adjudicate({
        question,
        codePresent: false,
        runId,
      });
      return {
        executed: false,
        sandboxExitCode: null,
        parsed: null,
        verification: evidence,
        speedupMultiplier: null,
        latencyGainPercent: null,
        isEmpiricallySuperior: false,
      };
    }

    let benchScript = null;
    if (code1 && code2) {
      benchScript = await this.synthesizeBenchmarkSuite(question, code1, code2, codeMaster);
    }
    if (!benchScript) {
      // No model-written suite. The fallback still reports whatever expected
      // values the MASTER artifact states for itself, so the trajectory records
      // a real case count rather than a bare "agreement" with no assertions.
      const contract = this._liftMasterContract(codeMaster);
      benchScript = this._buildDifferentialBenchmark(question, code1, code2, codeMaster, contract);
    }

    const draft = {
      targetFile: 'benchmark_suite.js',
      language: 'javascript',
      code: benchScript,
      runCommand: 'node benchmark_suite.js',
    };

    let sandboxResult;
    try {
      sandboxResult = await sandbox.execute(draft, runId);
    } catch (e) {
      console.warn('[EmpiricalGym] Sandbox execution caught error:', e.message);
      sandboxResult = { success: false, stdout: '', stderr: e.message, exitCode: 1 };
    }

    const parsed = SkillVerifier.parseTestOutput(sandboxResult.stdout);
    const malformed = parsed?._malformedDiscriminator || null;
    // A suite whose discriminator is not the literal EXPECTED_OUTPUT did not
    // establish an expected-output oracle, whatever its counts say. It stays
    // DIFFERENTIAL and never scores.
    const oracle =
      !malformed && parsed?.oracle === ORACLE.EXPECTED_OUTPUT
        ? ORACLE.EXPECTED_OUTPUT
        : parsed
          ? ORACLE.DIFFERENTIAL
          : ORACLE.NONE;
    if (malformed) this.stats.malformedSuites = (this.stats.malformedSuites || 0) + 1;

    const verification = SkillVerifier.adjudicate({
      question,
      codePresent: true,
      sandboxExitCode: sandboxResult.exitCode,
      sandboxStderr: sandboxResult.stderr,
      parsed,
      oracle,
      runId,
    });
    if (malformed) {
      verification.limitations = [
        ...(verification.limitations || []),
        `The benchmark suite emitted a non-literal oracle discriminator (${JSON.stringify(malformed.slice(0, 80))}); its case counts were not treated as an expected-output result.`,
      ];
    }

    // Real, measured latencies only. Missing -> null. No defaults, no *0.88.
    const lat = (m) =>
      m && typeof m.latencyNs === 'number' && m.latencyNs > 0 ? m.latencyNs : null;
    const c1Lat = lat(parsed?.c1);
    const c2Lat = lat(parsed?.c2);
    const mLat = lat(parsed?.master);

    let speedupMultiplier = null;
    let latencyGainPercent = null;
    let isEmpiricallySuperior = false;

    const baselineLat = [c1Lat, c2Lat].filter((n) => typeof n === 'number');
    if (baselineLat.length > 0 && typeof mLat === 'number') {
      const fastestBaseline = Math.min(...baselineLat);
      speedupMultiplier = Number((fastestBaseline / mLat).toFixed(2));
      latencyGainPercent = Number((((fastestBaseline - mLat) / fastestBaseline) * 100).toFixed(2));
      // Superiority is only claimed when the candidate was actually verified
      // by an expected-output oracle. A fast wrong answer is not superior.
      isEmpiricallySuperior =
        verification.grade === GRADE.OBSERVED &&
        verification.reward !== null &&
        latencyGainPercent >= 9.8;
      if (verification.grade === GRADE.OBSERVED) this.stats.expectedOutputVerified++;
      else this.stats.differentialOnly++;
    } else if (verification.status === 'EXECUTION_FAILED') {
      this.stats.executionFailures++;
    }

    // Trajectory logging: one entry per candidate, reward recorded honestly.
    try {
      const makeStep = (label, code, latNs, metrics, evidence, evalResult) =>
        this.logger.logStep({
          state: { prompt: String(question || '').slice(0, 400), candidate: label },
          action: { type: 'code_execution', code: code ? code.slice(0, 1000) : '' },
          observation: {
            exitCode: sandboxResult.exitCode ?? null,
            latencyNs: latNs,
            metrics: metrics || null,
            verifierStatus: evidence.status,
            grade: evidence.grade,
          },
          reward: evalResult ? evalResult.reward : null,
          metadata: {
            oracle,
            limitations: evidence.limitations || [],
            scoreBreakdown: evalResult?.scoreBreakdown || null,
          },
        });

      const evalFor = (m) => {
        if (
          verification.grade !== GRADE.OBSERVED ||
          !m ||
          typeof m.total !== 'number' ||
          m.total === 0
        )
          return null;
        return RewardVerifier.evaluate({
          exitCode: sandboxResult.exitCode,
          parsedTests: {
            total: m.total,
            passed: Number(m.passed) || 0,
            failed: Math.max(0, m.total - (Number(m.passed) || 0)),
            failToPassTotal: m.total,
            failToPassPassed: Number(m.passed) || 0,
            passToPassTotal: 1,
            passToPassPassed: Number(m.passed) === m.total ? 1 : 0,
          },
        });
      };

      const c1Eval = evalFor(parsed?.c1);
      const c2Eval = evalFor(parsed?.c2);
      const mEval = evalFor(parsed?.master);

      const c1Step = makeStep('c1', code1, c1Lat, parsed?.c1, verification, c1Eval);
      const c2Step = makeStep('c2', code2, c2Lat, parsed?.c2, verification, c2Eval);
      const mStep = makeStep('master', codeMaster, mLat, parsed?.master, verification, mEval);

      // Export a preference pair only when two candidates were scored by a real
      // oracle and their rewards differ. Pairs built from differential
      // agreement would train on nothing.
      if (c1Eval && c2Eval && c1Eval.reward !== c2Eval.reward) {
        const [winner, loser] = c1Eval.reward > c2Eval.reward ? [c1Step, c2Step] : [c2Step, c1Step];
        this.logger.exportPreferencePair([winner], [loser]);
      } else if (c1Eval && mEval && c1Eval.reward !== mEval.reward) {
        const [winner, loser] = c1Eval.reward > mEval.reward ? [c1Step, mStep] : [mStep, c1Step];
        this.logger.exportPreferencePair([winner], [loser]);
      }
    } catch (logErr) {
      console.warn('[EmpiricalGym] Trajectory logging notice:', logErr.message);
    }

    return {
      executed: true,
      sandboxExitCode: sandboxResult.exitCode ?? null,
      parsed,
      verification,
      baselineLatencyNs: baselineLat.length ? Math.min(...baselineLat) : null,
      masterLatencyNs: mLat,
      speedupMultiplier,
      latencyGainPercent,
      testsPassed: parsed?.master?.passed ?? null,
      testsTotal: parsed?.master?.total ?? null,
      isEmpiricallySuperior,
    };
  }
}

const empiricalGym = new EmpiricalGym();
export default empiricalGym;
