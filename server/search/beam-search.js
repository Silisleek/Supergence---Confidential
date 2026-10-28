import { RewardVerifier } from '../trajectory/reward-verifier.js';

export class BeamSearch {
  /**
   * @param {Object} options
   * @param {number} [options.beamWidth=3] - Number of candidate paths to retain at each step
   * @param {number} [options.maxDepth=3] - Maximum search depth / refinement iterations
   * @param {Object} [options.logger=null] - Optional TrajectoryLogger instance
   */
  constructor({ beamWidth = 3, maxDepth = 3, logger = null } = {}) {
    this.beamWidth = beamWidth;
    this.maxDepth = maxDepth;
    this.logger = logger;
  }

  /**
   * Execute Beam Search over candidate execution trajectories
   *
   * @param {Object} params
   * @param {string} params.prompt - Computational problem or bug description
   * @param {Function} params.generateCandidates - async (currentState, depth) => Array<Candidate>
   * @param {Function} params.evaluateCandidate - async (candidate, currentState) => { exitCode, testSummary, linterErrors, durationMs, output }
   * @returns {Promise<{ success: boolean, bestCandidate: Object, score: number, winningTrajectory: Array, rejectedTrajectories: Array, stats: Object }>}
   */
  async search({ prompt, generateCandidates, evaluateCandidate }) {
    const startTime = Date.now();
    let currentBeam = [
      {
        state: { prompt, history: [] },
        candidate: null,
        reward: 0,
        status: 'INITIAL',
        trajectory: [],
      },
    ];

    let winningNode = null;
    const allEvaluated = [];

    for (let depth = 0; depth < this.maxDepth; depth++) {
      const candidatesToScore = [];

      for (const node of currentBeam) {
        // Stop expanding if this node already achieved verified success
        if (node.reward >= 0.9) {
          winningNode = node;
          break;
        }

        const generated = await generateCandidates(node.state, depth);
        const candidates = Array.isArray(generated) ? generated : [generated];

        for (const cand of candidates) {
          if (!cand) continue;
          candidatesToScore.push({
            parent: node,
            candidate: cand,
            depth,
          });
        }
      }

      if (winningNode) break;
      if (candidatesToScore.length === 0) break;

      // Evaluate candidates in parallel or sequence
      const scoredNodes = await Promise.all(
        candidatesToScore.map(async ({ parent, candidate, depth }) => {
          let evalResult;
          try {
            evalResult = await evaluateCandidate(candidate, parent.state);
          } catch (err) {
            evalResult = {
              exitCode: 1,
              error: err.message,
              testSummary: { total: 1, failed: 1, passed: 0 },
            };
          }

          const { reward, status, scoreBreakdown } = RewardVerifier.evaluate(evalResult);

          const stepEntry = {
            depth,
            state: { prompt, depth, lastStatus: parent.status },
            action: {
              type: 'candidate_execution',
              candidateId: candidate.id || null,
              patch: candidate.code || candidate.patch,
            },
            observation: {
              exitCode: evalResult.exitCode,
              stdout: (evalResult.stdout || '').slice(0, 1000),
              stderr: (evalResult.stderr || '').slice(0, 1000),
              status,
            },
            reward,
            metadata: { scoreBreakdown, durationMs: evalResult.durationMs },
          };

          if (this.logger) {
            this.logger.logStep(stepEntry);
          }

          const newNode = {
            state: {
              prompt,
              history: [...parent.state.history, candidate],
            },
            candidate,
            reward,
            status,
            scoreBreakdown,
            trajectory: [...parent.trajectory, stepEntry],
          };

          allEvaluated.push(newNode);
          return newNode;
        }),
      );

      // Sort by reward descending, take top K
      scoredNodes.sort((a, b) => b.reward - a.reward);
      currentBeam = scoredNodes.slice(0, this.beamWidth);

      // Check if top candidate passed verification
      if (currentBeam[0] && currentBeam[0].reward >= 0.9) {
        winningNode = currentBeam[0];
        break;
      }
    }

    // Determine winning candidate
    const bestNode = winningNode || currentBeam[0] || null;
    const losingNodes = allEvaluated.filter((n) => n !== bestNode);

    // Export DPO preference pair if logger is attached and we have both winning and losing nodes
    if (this.logger && bestNode && losingNodes.length > 0) {
      const losingNode = losingNodes[losingNodes.length - 1]; // worst performer
      if (bestNode.trajectory.length > 0 && losingNode.trajectory.length > 0) {
        try {
          this.logger.exportPreferencePair(bestNode.trajectory, losingNode.trajectory);
        } catch {}
      }
    }

    return {
      success: (bestNode?.reward || 0) >= 0.8,
      bestCandidate: bestNode?.candidate || null,
      score: bestNode?.reward || 0,
      winningTrajectory: bestNode?.trajectory || [],
      rejectedTrajectories: losingNodes.map((n) => n.trajectory),
      stats: {
        totalEvaluated: allEvaluated.length,
        durationMs: Date.now() - startTime,
        verified: (bestNode?.reward || 0) >= 0.9,
      },
    };
  }
}

export default BeamSearch;
