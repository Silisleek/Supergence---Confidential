import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TRAJECTORY_DIR = path.resolve(__dirname, '../../data/trajectories');

if (!fs.existsSync(TRAJECTORY_DIR)) {
  fs.mkdirSync(TRAJECTORY_DIR, { recursive: true });
}

export class TrajectoryLogger {
  constructor(sessionId) {
    this.sessionId = sessionId || `session_${Date.now()}`;
    this.filePath = path.join(TRAJECTORY_DIR, `${this.sessionId}.jsonl`);
    this.stepIndex = 0;
  }

  logStep({ state, action, observation, reward, metadata = {} }) {
    const entry = {
      sessionId: this.sessionId,
      step: this.stepIndex++,
      timestamp: new Date().toISOString(),
      state, // e.g., prompt, target file context, error messages
      action, // e.g., tool call, generated patch, query
      observation, // e.g., compiler stdout, test failure, linter output
      reward, // deterministic float: 1.0 (pass), 0.0 (fail), or scalar
      metadata,
    };
    fs.appendFileSync(this.filePath, JSON.stringify(entry) + '\n', 'utf8');
    return entry;
  }

  exportPreferencePair(winningTrajectory, losingTrajectory) {
    const dpoFile = path.join(TRAJECTORY_DIR, 'dpo_pairs.jsonl');
    const winningList = Array.isArray(winningTrajectory) ? winningTrajectory : [winningTrajectory];
    const losingList = Array.isArray(losingTrajectory) ? losingTrajectory : [losingTrajectory];
    const pair = {
      prompt:
        winningList[0]?.state?.prompt || losingList[0]?.state?.prompt || 'Autonomous coding task',
      chosen: winningList.map((t) => ({ action: t.action, observation: t.observation })),
      rejected: losingList.map((t) => ({ action: t.action, observation: t.observation })),
      timestamp: new Date().toISOString(),
    };
    fs.appendFileSync(dpoFile, JSON.stringify(pair) + '\n', 'utf8');
    return pair;
  }

  getTrajectory() {
    if (!fs.existsSync(this.filePath)) return [];
    const lines = fs.readFileSync(this.filePath, 'utf8').trim().split('\n');
    return lines
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }
}
