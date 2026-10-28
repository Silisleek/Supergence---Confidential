import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export class WorktreeManager {
  constructor(repoDir = process.cwd(), snapshotBase = null) {
    this.repoDir = repoDir;
    this.snapshotDir = snapshotBase || path.join(os.tmpdir(), 'sis_snapshots');
    if (!fs.existsSync(this.snapshotDir)) {
      try {
        fs.mkdirSync(this.snapshotDir, { recursive: true });
      } catch {}
    }
  }

  /**
   * Check if current directory is inside a valid git repository
   */
  async isGitRepo() {
    try {
      const { stdout } = await execAsync('git rev-parse --is-inside-work-tree', {
        cwd: this.repoDir,
      });
      return stdout.trim() === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Create an isolated worktree on a new branch for testing speculative edits
   */
  async createWorktree(branchName, targetDir) {
    const isGit = await this.isGitRepo();
    if (isGit) {
      try {
        await execAsync(`git worktree add -b "${branchName}" "${targetDir}"`, {
          cwd: this.repoDir,
        });
        return { success: true, mode: 'git-worktree', branch: branchName, path: targetDir };
      } catch (err) {
        // Fall back to snapshot if worktree failed
        console.warn(`[WorktreeManager] Git worktree creation fallback: ${err.message}`);
      }
    }

    // Fallback: File-system directory snapshot sandbox
    return this.createSnapshot(this.repoDir, branchName, targetDir);
  }

  /**
   * Remove a worktree and clean up the branch
   */
  async removeWorktree(targetDir, branchName) {
    const isGit = await this.isGitRepo();
    if (isGit) {
      try {
        await execAsync(`git worktree remove --force "${targetDir}"`, { cwd: this.repoDir });
        if (branchName) {
          try {
            await execAsync(`git branch -D "${branchName}"`, { cwd: this.repoDir });
          } catch {}
        }
        return { success: true, removed: targetDir };
      } catch (err) {
        console.warn(`[WorktreeManager] Git worktree remove error: ${err.message}`);
      }
    }

    // Fallback cleanup
    if (fs.existsSync(targetDir)) {
      try {
        fs.rmSync(targetDir, { recursive: true, force: true });
        return { success: true, removed: targetDir, mode: 'snapshot' };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
    return { success: true, removed: targetDir };
  }

  /**
   * List existing git worktrees
   */
  async listWorktrees() {
    const isGit = await this.isGitRepo();
    if (!isGit) return [];
    try {
      const { stdout } = await execAsync('git worktree list --porcelain', { cwd: this.repoDir });
      const worktrees = [];
      let current = {};
      for (const line of stdout.split('\n')) {
        if (line.startsWith('worktree ')) {
          if (current.worktree) worktrees.push(current);
          current = { worktree: line.replace('worktree ', '').trim() };
        } else if (line.startsWith('branch ')) {
          current.branch = line.replace('branch ', '').trim();
        } else if (line.startsWith('HEAD ')) {
          current.head = line.replace('HEAD ', '').trim();
        }
      }
      if (current.worktree) worktrees.push(current);
      return worktrees;
    } catch {
      return [];
    }
  }

  /**
   * File-system snapshot fallback for non-git environments
   */
  createSnapshot(sourceDir, snapshotId, targetDir) {
    const dest = targetDir || path.join(this.snapshotDir, snapshotId);
    try {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      const resolvedDest = path.resolve(dest);
      fs.cpSync(sourceDir, dest, {
        recursive: true,
        filter: (src) => {
          const resolvedSrc = path.resolve(src);
          if (resolvedSrc === resolvedDest || resolvedSrc.startsWith(resolvedDest + path.sep)) {
            return false;
          }
          const base = path.basename(src);
          return !['node_modules', '.git', '.snapshots', 'dist', '.sandbox'].includes(base);
        },
      });
      return { success: true, mode: 'snapshot', path: dest, snapshotId };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

export default WorktreeManager;
