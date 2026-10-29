// SIS 1.0 — Supergence Secure Forms & Human Checkpoint Manager
// Powers:
// 1. Grok Bot & ChatGPT Dots style interactive Secure Forms for sensitive gates
// 2. High-risk OS, terminal, file, or credential operations require explicit human authorization
// 3. Real-time WebSocket modal trigger and non-blocking promise resolution

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import brain from '../orchestrator/brain.js';
import enterpriseVault from '../security/vault.js';
import enterpriseAuditTrail from '../security/audit-trail.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../');
const DATA_DIR = process.env.SIS_DATA_DIR
  ? path.resolve(process.env.SIS_DATA_DIR)
  : path.join(ROOT_DIR, 'data');
const CHECKPOINTS_FILE = path.join(DATA_DIR, 'supergence-checkpoints.json');

export class CheckpointManager {
  constructor() {
    this.checkpoints = new Map();
    this.resolvers = new Map();
    this._ensureDataDir();
    this._loadCheckpoints();
  }

  _ensureDataDir() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (e) {
      console.warn('[CheckpointManager] Data dir notice:', e.message);
    }
  }

  _loadCheckpoints() {
    try {
      if (fs.existsSync(CHECKPOINTS_FILE)) {
        const list = enterpriseVault.secureReadJson(CHECKPOINTS_FILE);
        if (Array.isArray(list)) {
          for (const chk of list) {
            // If server restarted, mark old pending checkpoints as EXPIRED
            if (chk.status === 'PENDING') chk.status = 'EXPIRED';
            this.checkpoints.set(chk.id, chk);
          }
        }
      }
    } catch (e) {
      console.warn('[CheckpointManager] Notice loading checkpoints:', e.message);
    }
  }

  _saveCheckpoints() {
    try {
      const list = Array.from(this.checkpoints.values()).slice(-50);
      enterpriseVault.secureWriteJson(CHECKPOINTS_FILE, list, {
        encrypt: false,
        context: 'SIS_CHECKPOINTS_LEDGER',
        classification: 'INTERNAL // HUMAN AUTHORIZATION GATES',
      });
    } catch (e) {
      console.warn('[CheckpointManager] Notice saving checkpoints:', e.message);
    }
  }

  getAllCheckpoints() {
    return Array.from(this.checkpoints.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  getPendingCheckpoints() {
    return Array.from(this.checkpoints.values()).filter((c) => c.status === 'PENDING');
  }

  getCheckpoint(id) {
    return this.checkpoints.get(id) || null;
  }

  // ─── Create a Secure Form / Human Checkpoint ───
  createCheckpoint({
    title,
    description,
    riskLevel = 'HIGH', // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    agentId = 'agent-supergence',
    agentName = 'Chief of Staff',
    requiredFields = [], // [{ name: 'token', label: 'Auth Token', type: 'password', required: true }]
    actions = ['APPROVE', 'REJECT'],
    timeoutSeconds = 120,
  }) {
    const id = 'chk-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);

    const checkpoint = {
      id,
      title: title || 'Human Authorization Checkpoint Required',
      description:
        description || 'Supergence requires your verification before executing this action.',
      riskLevel,
      agentId,
      agentName,
      requiredFields,
      actions,
      timeoutSeconds,
      status: 'PENDING',
      createdAt: Date.now(),
      expiresAt: Date.now() + timeoutSeconds * 1000,
    };

    this.checkpoints.set(id, checkpoint);
    this._saveCheckpoints();

    try {
      enterpriseAuditTrail.recordEvent({
        eventType: 'SECURITY_CHECKPOINT_CREATED',
        actor: agentName || 'SupergenceAgent',
        action: 'HUMAN_GATE_TRIGGERED',
        details: { id, title: checkpoint.title, riskLevel },
      });
    } catch (_) {}

    console.log(
      `[CheckpointManager] 🛡️ Secure Form Triggered: "${checkpoint.title}" [${id}] - Risk: ${riskLevel}`,
    );

    brain.broadcast('supergence-checkpoint-created', {
      checkpoint,
      timestamp: new Date().toISOString(),
    });

    return checkpoint;
  }

  // ─── Promise-based Checkpoint Waiter ───
  waitForCheckpoint(checkpointData) {
    const checkpoint = this.createCheckpoint(checkpointData);
    return new Promise((resolve) => {
      this.resolvers.set(checkpoint.id, resolve);
      // Auto-expire after timeout
      setTimeout(() => {
        if (this.checkpoints.get(checkpoint.id)?.status === 'PENDING') {
          this.respondCheckpoint(checkpoint.id, { decision: 'EXPIRED', inputs: {} });
        }
      }, checkpoint.timeoutSeconds * 1000);
    });
  }

  // ─── User Responds to Secure Form ───
  respondCheckpoint(id, { decision = 'APPROVE', inputs = {} } = {}) {
    const checkpoint = this.checkpoints.get(id);
    if (!checkpoint) throw new Error(`Checkpoint not found: ${id}`);
    if (checkpoint.status !== 'PENDING') {
      return {
        success: false,
        message: `Checkpoint already resolved as ${checkpoint.status}`,
        checkpoint,
      };
    }

    const isApproved = decision === 'APPROVE';
    checkpoint.status = isApproved ? 'APPROVED' : decision === 'EXPIRED' ? 'EXPIRED' : 'REJECTED';
    checkpoint.resolvedAt = Date.now();
    checkpoint.userInputs = inputs;
    this._saveCheckpoints();

    try {
      enterpriseAuditTrail.recordEvent({
        eventType: 'SECURITY_CHECKPOINT_RESOLVED',
        actor: 'HUMAN_OPERATOR',
        action: isApproved ? 'HUMAN_GATE_APPROVED' : `HUMAN_GATE_${decision}`,
        details: { id, decision, status: checkpoint.status, riskLevel: checkpoint.riskLevel },
      });
    } catch (_) {}

    console.log(`[CheckpointManager] ✓ Checkpoint [${id}] resolved as: ${checkpoint.status}`);

    brain.broadcast('supergence-checkpoint-resolved', {
      id,
      status: checkpoint.status,
      decision,
      timestamp: new Date().toISOString(),
    });

    const resolver = this.resolvers.get(id);
    if (resolver) {
      resolver({ success: isApproved, decision: checkpoint.status, inputs });
      this.resolvers.delete(id);
    }

    return { success: true, checkpoint };
  }
}

const checkpointManager = new CheckpointManager();
export default checkpointManager;
