// SIS 1.0 — Deterministic Reward Verifier
// Implements the 4-tier Verifier Ladder specification from the Elite Coding Blueprint (§2.5).
// GATES are multiplicative and non-negotiable (failing gate returns 0).
// REWARDS are additive, bounded, and weighted toward what is hard to fake.

export class RewardVerifier {
  /**
   * Evaluate code execution deterministically using exit codes, parsed tests, linters, types, and latency.
   *
   * @param {Object} params
   * @param {number} [params.exitCode=0] - Process exit code (0 is success)
   * @param {Object} [params.testSummary] - Simple test summary { total, passed, failed }
   * @param {Object} [params.parsedTests] - Comprehensive test report { total, passed, failed, failToPassTotal, failToPassPassed, passToPassTotal, passToPassPassed }
   * @param {number} [params.typeErrors=0] - Number of type errors (tsc --noEmit)
   * @param {number} [params.lintErrors=0] - Number of lint errors
   * @param {number} [params.linterErrors=0] - Alias for lintErrors
   * @param {number} [params.mutationScore=1.0] - Ratio of mutants killed (0.0 to 1.0)
   * @param {number} [params.durationMs=0] - Execution wall clock duration in milliseconds
   * @param {number} [params.baselineMs=0] - Baseline execution duration for performance regression checking
   * @param {number} [params.diffLines=0] - Lines changed in patch
   * @param {boolean} [params.touchedTestFiles=false] - True if source patch modified test files
   * @param {number} [params.memoryBytes=0] - Peak memory delta in bytes
   * @returns {{ reward: number, status: string, scoreBreakdown: Object }}
   */
  static evaluate({
    exitCode = 0,
    testSummary = null,
    parsedTests = null,
    typeErrors = 0,
    lintErrors = 0,
    linterErrors = 0,
    mutationScore = 1.0,
    durationMs = 0,
    baselineMs = 0,
    diffLines = 0,
    touchedTestFiles = false,
    memoryBytes = 0,
  } = {}) {
    // Tier 1 Gate: Execution & Syntax Failure
    if (exitCode !== 0) {
      return { reward: 0.0, status: 'FAILED_EXECUTION', scoreBreakdown: { exitCode, durationMs } };
    }

    // Tier 2 Gate: Type Errors
    if (typeErrors > 0) {
      return { reward: 0.0, status: 'TYPE_ERRORS', scoreBreakdown: { typeErrors, durationMs } };
    }

    // Tier 3 Gate: Linter Errors
    const totalLint = lintErrors || linterErrors || 0;
    if (totalLint > 0) {
      return {
        reward: 0.0,
        status: 'LINT_ERRORS',
        scoreBreakdown: { lintErrors: totalLint, durationMs },
      };
    }

    // Anti-Reward-Hacking Gate: Modifying test tree in source change
    if (touchedTestFiles) {
      return { reward: 0.0, status: 'TEST_TREE_MODIFIED', scoreBreakdown: { touchedTestFiles } };
    }

    // Adapt parsedTests or testSummary
    const pt =
      parsedTests ||
      (testSummary
        ? {
            total: testSummary.total || 0,
            passed: testSummary.passed || 0,
            failed: testSummary.failed || 0,
            failToPassTotal: testSummary.total || 0,
            failToPassPassed: testSummary.passed || 0,
            passToPassTotal: 1,
            passToPassPassed: testSummary.failed === 0 && testSummary.passed > 0 ? 1 : 0,
          }
        : null);

    // Hard Gate: A candidate that ran 0 tests scores ZERO, never unverified success
    if (!pt || pt.total === 0) {
      return { reward: 0.0, status: 'NO_TESTS_RUN', scoreBreakdown: { total: 0 } };
    }

    const f2p = pt.failToPassTotal > 0 ? pt.failToPassPassed / pt.failToPassTotal : 1.0;
    const p2p = pt.passToPassTotal > 0 ? pt.passToPassPassed / pt.passToPassTotal : 1.0;

    // Hard Gate: Incomplete bug resolution
    if (f2p < 1.0) {
      return {
        reward: 0.0,
        status: 'FAIL_TO_PASS_INCOMPLETE',
        scoreBreakdown: { f2p, passed: pt.passed, total: pt.total },
      };
    }

    // Hard Gate: Regression in existing tests
    if (p2p < 1.0) {
      return {
        reward: 0.0,
        status: 'REGRESSION',
        scoreBreakdown: { p2p, passed: pt.passed, total: pt.total },
      };
    }

    // Tier 4 Gate: Test strength & anti-vacuity layer
    if (mutationScore < 0.6) {
      return { reward: 0.0, status: 'WEAK_TESTS', scoreBreakdown: { mutationScore } };
    }

    // Performance is a regression reward with a 5% deadband
    const ratio = baselineMs && baselineMs > 0 ? durationMs / baselineMs : 1.0;
    const perf = ratio <= 1.05 ? 1.0 : Math.max(0, 1.0 - (ratio - 1.0));

    // Weighted Deterministic Reward Formula
    const calculatedReward = 0.7 * f2p + 0.15 * p2p + 0.1 * mutationScore + 0.05 * perf;
    const finalReward = Number(Math.min(1.0, calculatedReward).toFixed(4));

    return {
      reward: finalReward,
      status: 'VERIFIED_SUCCESS',
      scoreBreakdown: {
        f2p,
        p2p,
        mutationScore,
        perf,
        durationMs,
        baselineMs,
        memoryBytes,
      },
    };
  }
}

export default RewardVerifier;
