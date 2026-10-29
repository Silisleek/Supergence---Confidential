// SHA-256 and HMAC linked audit ledger. This is not a compliance certification.

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DIR = path.resolve(__dirname, '../../data/security');

export class EnterpriseAuditTrail {
  constructor({
    directory = process.env.SIS_AUDIT_DIR ||
      (process.env.SIS_DATA_DIR
        ? path.join(path.resolve(process.env.SIS_DATA_DIR), 'security')
        : DEFAULT_DIR),
  } = {}) {
    this.chain = [];
    this.genesisHash = '0000000000000000000000000000000000000000000000000000000000000000';
    this.filePath = path.join(directory, 'audit-ledger.json');
    this.signingKeyFile = path.join(directory, 'audit.key');
    this.signingKey = this._loadOrGenerateSigningKey();
    this._load();
    this.writable = this.verifyChainIntegrity().isValid;
  }

  _loadOrGenerateSigningKey() {
    try {
      if (process.env.SIS_AUDIT_SIGNING_KEY) {
        return process.env.SIS_AUDIT_SIGNING_KEY;
      }
      if (fs.existsSync(this.signingKeyFile)) {
        const key = fs.readFileSync(this.signingKeyFile, 'utf8').trim();
        if (!key) throw new Error('Audit signing key is empty.');
        return key;
      }
      if (fs.existsSync(this.filePath)) throw new Error('Audit signing key is missing.');
      const dir = path.dirname(this.signingKeyFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const newKey = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(this.signingKeyFile, newKey, { flag: 'wx', mode: 0o600 });
      return newKey;
    } catch (error) {
      throw new Error(`Audit signing key unavailable: ${error.message}`, { cause: error });
    }
  }

  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.chain) && data.chain.length > 0) {
          this.chain = data.chain;
          return;
        }
        throw new Error('Audit ledger has no valid chain.');
      }
    } catch (err) {
      throw new Error(`Audit ledger could not be loaded: ${err.message}`, { cause: err });
    }

    // Initialize Genesis Block if fresh
    this._recordGenesis();
  }

  _save() {
    const temporary = `${this.filePath}.${crypto.randomUUID()}.tmp`;
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const payload = {
        standard: 'SHA-256 and HMAC linked ledger',
        totalEvents: this.chain.length,
        merkleRoot: this.getMerkleRoot(),
        chain: this.chain,
      };
      fs.writeFileSync(temporary, JSON.stringify(payload, null, 2), { flag: 'wx', mode: 0o600 });
      fs.renameSync(temporary, this.filePath);
    } catch (err) {
      throw new Error(`Audit ledger could not be saved: ${err.message}`, { cause: err });
    } finally {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
  }

  _recordGenesis() {
    const genesisEvent = {
      index: 0,
      timestamp: Date.now(),
      eventType: 'SYSTEM_GENESIS',
      actor: 'SIS_ENTERPRISE_KERNEL',
      action: 'INITIALIZE_IMMUTABLE_AUDIT_LEDGER',
      details: {
        architecture: 'SHA-256 Merkle-Linked Chain',
        complianceStatus: 'unverified',
      },
      prevHash: this.genesisHash,
    };
    genesisEvent.hash = this._computeHash(genesisEvent);
    genesisEvent.signature = this._signHash(genesisEvent.hash);
    this.chain.push(genesisEvent);
    this._save();
  }

  _computeHash(entry) {
    const content = `${entry.index}|${entry.timestamp}|${entry.eventType}|${entry.actor}|${entry.action}|${JSON.stringify(entry.details)}|${entry.prevHash}`;
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  _signHash(hash) {
    return crypto.createHmac('sha256', this.signingKey).update(hash).digest('hex');
  }

  /**
   * Append a new tamper-evident audit record to the cryptographic ledger
   */
  logEvent(eventType, actor, action, details = {}) {
    if (!this.writable)
      throw new Error('Audit ledger integrity is invalid; no new event was written.');
    const prevEntry = this.chain[this.chain.length - 1];
    const prevHash = prevEntry ? prevEntry.hash : this.genesisHash;
    const index = this.chain.length;

    const entry = {
      index,
      timestamp: Date.now(),
      eventType,
      actor: actor || 'SYSTEM',
      action,
      details,
      prevHash,
    };

    entry.hash = this._computeHash(entry);
    entry.signature = this._signHash(entry.hash);

    this.chain.push(entry);
    try {
      this._save();
    } catch (error) {
      this.chain.pop();
      throw error;
    }

    return entry;
  }

  recordEvent(payload = {}) {
    if (typeof payload === 'string') {
      return this.logEvent(payload, 'SYSTEM', 'EXECUTE', {});
    }
    const {
      eventType = 'OPERATIONAL_EVENT',
      actor = 'SYSTEM',
      action = 'RECORD',
      details = {},
    } = payload;
    return this.logEvent(eventType, actor, action, details);
  }

  /**
   * Cryptographically audit and verify the entire hash chain from Genesis to tip.
   * Detects any altered data, deleted records, or forged links.
   */
  verifyChainIntegrity() {
    const startTime = Date.now();
    let isValid = true;
    const violations = [];

    if (
      !this.chain.length ||
      this.chain[0].index !== 0 ||
      this.chain[0].prevHash !== this.genesisHash
    ) {
      isValid = false;
      violations.push({ index: 0, error: 'Genesis record is missing or invalid' });
    }

    for (let i = 0; i < this.chain.length; i++) {
      const current = this.chain[i];
      if (current.index !== i) {
        isValid = false;
        violations.push({ index: i, error: 'Record index is missing or out of sequence' });
      }
      const recomputedHash = this._computeHash(current);

      // 1. Verify Entry Hash
      if (recomputedHash !== current.hash) {
        isValid = false;
        violations.push({
          index: i,
          error: 'Content hash mismatch (tampered record data)',
          expected: current.hash,
          computed: recomputedHash,
        });
      }

      // 2. Verify HMAC Signature
      const recomputedSig = this._signHash(current.hash);
      if (recomputedSig !== current.signature) {
        isValid = false;
        violations.push({
          index: i,
          error: 'Cryptographic signature mismatch (unauthorized modification)',
          expected: current.signature,
          computed: recomputedSig,
        });
      }

      // 3. Verify Link to Previous Hash
      if (i > 0) {
        const prev = this.chain[i - 1];
        if (current.prevHash !== prev.hash) {
          isValid = false;
          violations.push({
            index: i,
            error: 'Broken Merkle link to previous record',
            expectedPrev: prev.hash,
            actualPrev: current.prevHash,
          });
        }
      }
    }

    const durationMs = Date.now() - startTime;
    return {
      isValid,
      totalRecordsVerified: this.chain.length,
      merkleRoot: this.getMerkleRoot(),
      violationsCount: violations.length,
      violations,
      durationMs,
      verifiedAt: Date.now(),
    };
  }

  /**
   * Calculate current top-level Merkle Root
   */
  getMerkleRoot() {
    if (this.chain.length === 0) return this.genesisHash;
    let hashes = this.chain.map((c) => c.hash);

    while (hashes.length > 1) {
      const nextLevel = [];
      for (let i = 0; i < hashes.length; i += 2) {
        if (i + 1 < hashes.length) {
          const combined = hashes[i] + hashes[i + 1];
          nextLevel.push(crypto.createHash('sha256').update(combined).digest('hex'));
        } else {
          nextLevel.push(hashes[i]);
        }
      }
      hashes = nextLevel;
    }
    return hashes[0];
  }

  getRecentEvents(limit = 20) {
    return this.chain.slice(-limit).reverse();
  }

  getStats() {
    return {
      totalEvents: this.chain.length,
      merkleRoot: this.getMerkleRoot(),
      genesisHash: this.genesisHash,
      latestHash: this.chain[this.chain.length - 1]?.hash || null,
      lastEventAt: this.chain[this.chain.length - 1]?.timestamp || null,
      tamperProofActive: false,
      writable: this.writable,
    };
  }
}

const enterpriseAuditTrail = new EnterpriseAuditTrail();
export default enterpriseAuditTrail;
