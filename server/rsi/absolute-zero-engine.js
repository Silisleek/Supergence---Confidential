// SIS 1.0 — Absolute Zero Reasoner (AZR) Self-Play Engine
// Grounded in arXiv 2505.03335: Removes human-curated data from the loop entirely.
// A single model plays both roles in an ungameable self-play loop:
// 1. Proposer: Invents reasoning and algorithmic tasks (deduction, abduction, induction, code)
// 2. Learnability Filter: Validates task well-formedness (neither trivial nor impossible)
// 3. Solver: Attempts the task under strict constraints
// 4. Sandbox Verifier: Executes code against objective test assertions for verifiable rewards

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { quickAI, DEFAULT_MODEL, PREMIUM_MODEL } from '../api/openrouter.js';
import {
  extractCleanJSON,
  extractCleanCode,
  safeLearningAI,
} from '../improvement/learning-resilience.js';
import sandbox from '../coder/sandbox.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RSI_DATA_DIR = process.env.SIS_DATA_DIR
  ? path.join(path.resolve(process.env.SIS_DATA_DIR), 'rsi')
  : path.join(__dirname, '../../data/rsi');
const AZR_STATE_FILE = path.join(RSI_DATA_DIR, 'azr-curriculum.json');

export class AbsoluteZeroEngine {
  constructor(options = {}) {
    this.filePath = options.filePath || AZR_STATE_FILE;
    this.state = {
      totalTasksProposed: 0,
      tasksAcceptedByLearnability: 0,
      tasksSolvedVerifiably: 0,
      overallPassRate: 0.0,
      curriculumArchive: [], // verified self-play challenge bank
      verifiedTheorems: [],
      lastSelfPlayAt: null,
    };

    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const data = JSON.parse(raw);
        this.state = { ...this.state, ...data };
      }
    } catch (err) {
      console.warn('[AbsoluteZeroEngine] Load notice:', err.message);
    }
  }

  _save() {
    try {
      if (!fs.existsSync(path.dirname(this.filePath))) {
        fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (err) {
      console.error('[AbsoluteZeroEngine] Save error:', err.message);
    }
  }

  /**
   * Run one full self-play training iteration:
   * Propose -> Learnability Filter -> Solve -> Sandbox Execute & Verify
   */
  async runSelfPlayCycle(domainHint = 'coding') {
    this.state.totalTasksProposed++;
    const taskId = `azr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // ─────────────────────────────────────────────────────────────
    // STEP 1: Proposer invents a novel verifiable task
    // ─────────────────────────────────────────────────────────────
    const proposerPrompt = `Invent an original algorithmic or mathematical reasoning challenge for domain "${domainHint}".
Requirements:
1. Must specify exact problem rules and constraints in "specification".
2. Must provide at least 4 non-trivial test cases with exact expected outputs.
3. The solution must be callable as function solve(...args).

Output ONLY valid JSON:
{
  "title": "Clear concise challenge name",
  "category": "optimization",
  "domain": "${domainHint}",
  "specification": "Detailed problem statement with input/output rules and constraints",
  "entrypoint": "solve",
  "testCases": [
    { "input": [1, 2, 3], "expected": 6 },
    { "input": [4, 5], "expected": 9 }
  ],
  "difficulty": "hard"
}`;

    let proposedTask = null;
    try {
      const pRes = await safeLearningAI(
        'You are a JSON API. You MUST output ONLY valid JSON starting with { and ending with }.',
        proposerPrompt,
        { model: DEFAULT_MODEL, maxTokens: 12000, temperature: 0.1 },
      );
      proposedTask = extractCleanJSON(pRes);
    } catch (err) {
      console.warn('[AbsoluteZeroEngine] Proposer notice:', err.message);
    }

    if (!proposedTask || !proposedTask.specification) {
      proposedTask = this._getDeterministicTask(domainHint);
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 2: Learnability Filter
    // ─────────────────────────────────────────────────────────────
    const isLearnable = this._evaluateLearnability(proposedTask);
    if (!isLearnable) {
      console.log(
        `[AbsoluteZeroEngine] Task "${proposedTask.title}" rejected by learnability filter (trivial or malformed).`,
      );
      this._save();
      return { status: 'rejected_learnability', taskId };
    }

    this.state.tasksAcceptedByLearnability++;

    // ─────────────────────────────────────────────────────────────
    // STEP 3: Solver attempts the validated task
    // ─────────────────────────────────────────────────────────────
    const solverPrompt = `You are the AZR Solver.
Solve the following autonomously generated task with production-grade, zero-stub, optimal code:

Title: ${proposedTask.title}
Specification:
${proposedTask.specification}

Requirements:
1. Provide the complete implementation wrapped in \`\`\`javascript ... \`\`\`. Designate the primary callable function as \`function solve(...)\` matching the specification and test inputs.
2. State the time complexity O(...) and space complexity O(...).
3. Ensure all edge cases and boundary conditions are handled cleanly.`;

    let solverSolution = '';
    try {
      const sRes = await safeLearningAI(
        'You are the AZR Solver. Return complete implementation in javascript.',
        solverPrompt,
        { model: PREMIUM_MODEL, maxTokens: 12000, temperature: 0.2 },
      );
      solverSolution = sRes || '';
    } catch (err) {
      console.warn('[AbsoluteZeroEngine] Solver notice:', err.message);
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 4: Objective Sandbox Execution & Verification
    // ─────────────────────────────────────────────────────────────
    // Only the solver's own code is run. Falling back to the test suite would mean
    // grading the test suite against itself.
    const extractedCode = this._extractCode(solverSolution);
    const benchScript = this._assembleExecutionScript(proposedTask, extractedCode);

    const draft = {
      targetFile: `azr_bench_${taskId}.js`,
      language: 'javascript',
      code: benchScript,
      runCommand: `node azr_bench_${taskId}.js`,
    };

    let sandboxResult;
    try {
      sandboxResult = await sandbox.execute(draft, taskId);
    } catch (e) {
      sandboxResult = { success: false, stdout: '', stderr: e.message };
    }

    let isVerified = false;
    let testsPassed = 0;
    let totalTests = 0;
    let verifiable = false;
    let failures = [];

    // Verification is read only from the harness result. An exit code of 0 means
    // the script ran, not that the solution was correct — it is never treated as
    // evidence of verification.
    if (sandboxResult && sandboxResult.stdout) {
      const match = sandboxResult.stdout.match(/\{[\s\S]*"verified"[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          isVerified = parsed.verified === true;
          testsPassed = Number(parsed.passed) || 0;
          totalTests = Number(parsed.total) || 0;
          verifiable = parsed.verifiable === true;
          failures = Array.isArray(parsed.failures) ? parsed.failures : [];
        } catch {}
      }
    }

    // If sandbox successfully verified, record into curriculum
    if (isVerified) {
      this.state.tasksSolvedVerifiably++;
      const theoremRecord = {
        taskId,
        title: proposedTask.title,
        domain: proposedTask.domain,
        category: proposedTask.category,
        testsPassed,
        totalTests,
        solutionSnippet: solverSolution.slice(0, 400),
        discoveredAt: Date.now(),
      };

      this.state.verifiedTheorems.unshift(theoremRecord);
      if (this.state.verifiedTheorems.length > 500) {
        this.state.verifiedTheorems = this.state.verifiedTheorems.slice(0, 500);
      }

      this.state.curriculumArchive.unshift({
        taskId,
        task: proposedTask,
        verified: true,
        testsPassed,
        timestamp: Date.now(),
      });
      if (this.state.curriculumArchive.length > 500) {
        this.state.curriculumArchive = this.state.curriculumArchive.slice(0, 500);
      }
    }

    // The pass rate is solved / verifiable attempts. Counting non-verifiable
    // attempts in the denominator would understate real performance; counting them
    // as passes would overstate it. Only attempts that could be checked count.
    this.state.verifiableAttempts = (this.state.verifiableAttempts || 0) + (verifiable ? 1 : 0);
    this.state.overallPassRate =
      this.state.verifiableAttempts > 0
        ? Number(
            ((this.state.tasksSolvedVerifiably / this.state.verifiableAttempts) * 100).toFixed(1),
          )
        : null;
    this.state.lastSelfPlayAt = Date.now();
    this._save();

    const outcome = isVerified
      ? 'VERIFIED ✓'
      : verifiable
        ? 'FAILED ✗'
        : 'NOT VERIFIABLE (no usable test cases)';
    console.log(
      `[AbsoluteZeroEngine] Self-play cycle: "${proposedTask.title}" -> ${outcome} (${testsPassed}/${totalTests} tests)`,
    );
    return {
      taskId,
      title: proposedTask.title,
      isVerified,
      verifiable,
      testsPassed,
      totalTests,
      failures,
      category: proposedTask.category,
    };
  }

  _evaluateLearnability(task) {
    if (!task || !task.title || !task.specification) return false;
    const spec = task.specification.toLowerCase();
    // Reject trivial one-liners
    if (spec.length < 50) return false;
    if (/return 0|return true|return x|identity/i.test(spec)) return false;
    return true;
  }

  _extractCode(text = '') {
    // No default solution: if nothing usable was produced, that is the result.
    return extractCleanCode(text, '');
  }

  /**
   * Build the verification harness for a self-proposed task.
   *
   * The proposer supplies test cases carrying real expected outputs. Verification
   * runs the solver's code against THOSE cases and requires the answers to match.
   * A solution that merely avoids throwing does not pass: the identity function
   * returns a value for every input and is still wrong for every non-identity task.
   *
   * When the proposer supplies no usable cases, the harness reports that it could
   * not verify — it does not fall back to a weaker check that would pass anything.
   */
  _assembleExecutionScript(task, solverCode) {
    // Cases may be supplied as structured vectors, or as a runTests() function.
    const cases = Array.isArray(task?.testCases) ? task.testCases : [];
    const hasRunTests =
      typeof task?.testSuiteCode === 'string' && /function\s+runTests/.test(task.testSuiteCode);

    return `
// AZR Objective Execution Harness
let passed = 0;
let total = 0;
let verifiable = false;
const failures = [];

${solverCode}

// Resolve the solver's entrypoint. No identity fallback: if the solution exposes
// no callable entrypoint, there is nothing to verify and that is the result.
function __resolveEntrypoint() {
  if (typeof solve === 'function') return solve;
  if (typeof solution === 'function') return solution;
  if (typeof processData === 'function') return processData;
  if (typeof run === 'function') return run;
  if (typeof compute === 'function') return compute;
  if (typeof calculate === 'function') return calculate;

  // Search dynamically declared function names from the solver's code
  const codeStr = ${JSON.stringify(solverCode)};
  const discovered = [...codeStr.matchAll(/(?:function\s+([a-zA-Z0-9_$]+)|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:function|\([^)]*\)\s*=>|[a-zA-Z0-9_$]+\s*=>))/g)]
    .map(m => m[1] || m[2])
    .filter(n => n && !['__resolveEntrypoint', 'runTests'].includes(n));

  for (const name of discovered) {
    try {
      if (eval("typeof " + name) === 'function') {
        return eval(name);
      }
    } catch (_) {}
  }

  const knownClassNames = ['SlidingWindowAccumulator','RateAccumulator','CircularBuffer','RateLimiter','Accumulator','Solution','System','Engine'];
  for (const name of knownClassNames) {
    try {
      if (eval("typeof " + name) === 'function') {
        const Cls = eval(name);
        const inst = new Cls(100);
        const m = ['solve','process','add','push','run','compute'].find(k => typeof inst[k] === 'function');
        if (m) return inst[m].bind(inst);
      }
    } catch (e) {}
  }
  return null;
}

const candidateFn = __resolveEntrypoint();

try {
  const hasCases = ${cases.length} > 0;
  const hasSuite = ${hasRunTests};

  if (candidateFn && hasCases) {
    verifiable = true;
    const cases = ${JSON.stringify(cases)};
    for (const tc of cases) {
      total++;
      let actual;
      try {
        const input = Array.isArray(tc.input) ? tc.input : [tc.input];
        try {
          actual = candidateFn(...input);
        } catch (innerErr) {
          if (Array.isArray(tc.input)) {
            actual = candidateFn(tc.input);
          } else {
            throw innerErr;
          }
        }
      } catch (e) {
        failures.push({ case: total, error: e.message });
        continue;
      }
      const expected = tc.expected;
      const matches = JSON.stringify(actual) === JSON.stringify(expected);
      if (matches) passed++;
      else failures.push({ case: total, expected, actual });
    }
  } else if (candidateFn && hasSuite) {
    // The proposer supplied an executable assertion suite; run it and require
    // it to return true rather than merely not throw.
    verifiable = true;
    total = 1;
    try {
      ${task.testSuiteCode}
      const ok = runTests(candidateFn);
      if (ok === true) passed = 1;
      else failures.push({ case: 'suite', error: 'runTests returned ' + String(ok) });
    } catch (e) {
      failures.push({ case: 'suite', error: e.message });
    }
  } else {
    verifiable = false;
    if (!candidateFn) failures.push({ error: 'solution exposes no callable entrypoint' });
    else failures.push({ error: 'task supplies no test cases or assertion suite' });
  }
} catch (e) {
  failures.push({ error: 'harness error: ' + e.message });
}

// Verification requires real cases AND all of them passing.
const verified = verifiable && total > 0 && passed === total;
console.log(JSON.stringify({ verified, passed, total, verifiable, failures: failures.slice(0, 3) }));
`;
  }

  _getDeterministicTask(domain = 'coding') {
    return {
      title: 'Lock-Free Concurrent Sliding Window Rate Accumulator',
      category: 'invariants',
      domain,
      specification:
        'Implement a zero-allocation circular buffer accumulator tracking sum across continuous timestamp intervals without mutex locks.',
      testSuiteCode: 'function solve(arr) { return arr.length; }',
      difficulty: 'hard',
    };
  }

  getState() {
    return {
      ...this.state,
      recentTheoremsCount: this.state.verifiedTheorems.length,
      curriculumCount: this.state.curriculumArchive.length,
    };
  }
}

const absoluteZeroEngine = new AbsoluteZeroEngine();
export default absoluteZeroEngine;
