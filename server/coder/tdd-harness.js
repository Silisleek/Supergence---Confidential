export class TddHarness {
  constructor({ sandboxRunner, logger } = {}) {
    this.sandbox = sandboxRunner;
    this.logger = logger;
  }

  /**
   * Runs the full TDD loop:
   * 1. Run repro test -> MUST FAIL (assert Red)
   * 2. Apply patch
   * 3. Run repro test -> MUST PASS (assert Green)
   * 4. Run full regression test suite (optional)
   *
   * @param {Object} params
   * @param {string} params.testFilePath - Path to unit test verifying the bug or feature
   * @param {Function} params.patchFn - Async function that applies the patch
   * @param {string} [params.regressionCommand] - Optional command to run regression suite
   * @param {string} [params.prompt] - Optional prompt description for trajectory logging
   * @returns {Promise<{ success: boolean, phase: string, error?: string, runs?: Object }>}
   */
  async executeLoop({ testFilePath, patchFn, regressionCommand, prompt = '' }) {
    if (!this.sandbox) {
      throw new Error('TddHarness: sandboxRunner is required');
    }

    // Step 1: Verify reproduction test fails first (assert Red)
    const initialRun = await this.sandbox.executeTest(testFilePath);
    if (this.logger) {
      this.logger.logStep({
        state: { prompt, testFilePath, phase: 'RED_VERIFICATION' },
        action: { type: 'run_reproduction_test', command: `executeTest(${testFilePath})` },
        observation: {
          exitCode: initialRun.exitCode,
          stdout: initialRun.stdout,
          stderr: initialRun.stderr,
        },
        reward: initialRun.exitCode !== 0 ? 1.0 : 0.0,
        metadata: { phase: 'RED_PHASE', expectedFailure: true },
      });
    }

    if (initialRun.exitCode === 0) {
      throw new Error('TDD Red Phase Failed: Reproduction test passed before patch was applied.');
    }

    // Step 2: Apply patch
    try {
      await patchFn();
    } catch (patchErr) {
      if (this.logger) {
        this.logger.logStep({
          state: { prompt, testFilePath, phase: 'PATCH_APPLICATION' },
          action: { type: 'apply_patch' },
          observation: { error: patchErr.message },
          reward: 0.0,
          metadata: { phase: 'PATCH_FAILED' },
        });
      }
      return {
        success: false,
        phase: 'PATCH_APPLICATION_FAILED',
        error: patchErr.message,
      };
    }

    // Step 3: Verify reproduction test passes (assert Green)
    const postPatchRun = await this.sandbox.executeTest(testFilePath);
    if (this.logger) {
      this.logger.logStep({
        state: { prompt, testFilePath, phase: 'GREEN_VERIFICATION' },
        action: { type: 'run_reproduction_test_post_patch' },
        observation: {
          exitCode: postPatchRun.exitCode,
          stdout: postPatchRun.stdout,
          stderr: postPatchRun.stderr,
        },
        reward: postPatchRun.exitCode === 0 ? 1.0 : 0.0,
        metadata: { phase: 'GREEN_PHASE' },
      });
    }

    if (postPatchRun.exitCode !== 0) {
      return {
        success: false,
        phase: 'GREEN_PHASE_FAILED',
        error: postPatchRun.stderr || postPatchRun.stdout,
        runs: { initialRun, postPatchRun },
      };
    }

    // Step 4: Run regression suite if provided
    let regressionRun = null;
    if (regressionCommand) {
      regressionRun =
        typeof this.sandbox.exec === 'function'
          ? await this.sandbox.exec(regressionCommand)
          : await this.sandbox._runCommand(regressionCommand, process.cwd());

      if (this.logger) {
        this.logger.logStep({
          state: { prompt, regressionCommand, phase: 'REGRESSION_VERIFICATION' },
          action: { type: 'run_regression', command: regressionCommand },
          observation: {
            exitCode: regressionRun.exitCode,
            stdout: regressionRun.stdout,
            stderr: regressionRun.stderr,
          },
          reward: regressionRun.exitCode === 0 ? 1.0 : 0.0,
          metadata: { phase: 'REGRESSION_PHASE' },
        });
      }

      if (regressionRun.exitCode !== 0) {
        return {
          success: false,
          phase: 'REGRESSION_FAILED',
          error: regressionRun.stderr || regressionRun.stdout,
          runs: { initialRun, postPatchRun, regressionRun },
        };
      }
    }

    return {
      success: true,
      phase: 'VERIFIED_GREEN',
      runs: { initialRun, postPatchRun, regressionRun },
    };
  }
}

export default TddHarness;
