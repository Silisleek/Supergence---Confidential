// AES-256-GCM vault and JSON envelope encryption.

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SECURITY_DIR = path.resolve(__dirname, '../../data/security');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits authentication tag
const SALT_LENGTH = 32; // 256 bits salt
const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 32; // 256 bits key

export class EnterpriseVault {
  constructor({
    directory = process.env.SIS_VAULT_DIR ||
      (process.env.SIS_DATA_DIR ? path.join(path.resolve(process.env.SIS_DATA_DIR), 'security') : SECURITY_DIR),
  } = {}) {
    this.directory = path.resolve(directory);
    this.vaultFile = path.join(this.directory, 'vault.enc');
    this.keyringFile = path.join(this.directory, 'keyring.json');
    this.installationSecretFile = path.join(this.directory, 'installation.key');
    this.keyring = {
      activeVersion: 1,
      createdAt: Date.now(),
      rotatedAt: null,
      keys: {}, // version -> { salt, iterations, createdAt }
    };
    this.masterKeys = new Map(); // version -> Buffer held in process memory
    this.records = new Map(); // id -> { ciphertext, iv, authTag, keyVersion, metadata, updatedAt }
    this.stats = {
      totalEncryptedRecords: 0,
      totalDecryptionOps: 0,
      totalEncryptionOps: 0,
      keyRotations: 0,
      integrityFailures: 0,
      vaultLocked: false,
    };

    this._initializeDirectory();
    this._loadOrGenerateKeyring();
    this._loadVaultRecords();
  }

  _initializeDirectory() {
    if (!fs.existsSync(this.directory)) {
      fs.mkdirSync(this.directory, { recursive: true });
      try {
        fs.chmodSync(this.directory, 0o700);
      } catch (_) {}
    }
  }

  _loadOrGenerateKeyring() {
    try {
      const existing = fs.existsSync(this.keyringFile);
      if (existing) {
        const raw = fs.readFileSync(this.keyringFile, 'utf8');
        this.keyring = JSON.parse(raw);
      } else {
        // Generate initial Version 1 Keyring
        const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
        this.keyring.keys['1'] = {
          salt,
          iterations: PBKDF2_ITERATIONS,
          createdAt: Date.now(),
          keySource: process.env.SIS_MASTER_SECRET ? 'legacy' : 'installation',
        };
        this.keyring.activeVersion = 1;
      }

      const hasInstallationKeys = Object.values(this.keyring.keys).some(
        (meta) => meta.keySource === 'installation',
      );
      if (hasInstallationKeys && existing && !fs.existsSync(this.installationSecretFile))
        throw new Error('Vault installation key is missing; encrypted data was not modified.');
      this.allowSecretCreation = !hasInstallationKeys || !existing;
      if (!process.env.SIS_MASTER_SECRET && existing && !hasInstallationKeys) {
        const nextVersion = this.keyring.activeVersion + 1;
        this.keyring.keys[String(nextVersion)] = {
          salt: crypto.randomBytes(SALT_LENGTH).toString('hex'),
          iterations: PBKDF2_ITERATIONS,
          createdAt: Date.now(),
          keySource: 'installation',
        };
        this.keyring.activeVersion = nextVersion;
      }
      for (const [ver, meta] of Object.entries(this.keyring.keys)) {
        const saltBuf = Buffer.from(meta.salt, 'hex');
        const derivedKey = crypto.pbkdf2Sync(
          this._secretFor(meta),
          saltBuf,
          meta.iterations || PBKDF2_ITERATIONS,
          KEY_LENGTH,
          'sha512',
        );
        this.masterKeys.set(Number(ver), derivedKey);
      }
      if (!existing || (!process.env.SIS_MASTER_SECRET && !hasInstallationKeys))
        this._saveKeyring();
      this.allowSecretCreation = false;
    } catch (err) {
      throw new Error(`Vault keyring initialization failed: ${err.message}`, { cause: err });
    }
  }

  _secretFor(meta) {
    if (meta.keySource !== 'installation')
      return `${process.env.SIS_MASTER_SECRET || 'SIS_ENTERPRISE_SECRET_KEY_999'}_${process.platform}_${process.arch}`;
    let secret;
    try {
      secret = fs.readFileSync(this.installationSecretFile, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      if (!this.allowSecretCreation)
        throw new Error('Vault installation key is missing; encrypted data was not modified.', {
          cause: error,
        });
      try {
        fs.writeFileSync(this.installationSecretFile, crypto.randomBytes(32).toString('hex'), {
          flag: 'wx',
          mode: 0o600,
        });
      } catch (createError) {
        if (createError.code !== 'EEXIST') throw createError;
      }
      secret = fs.readFileSync(this.installationSecretFile, 'utf8');
    }
    if (!/^[0-9a-f]{64}$/.test(secret))
      throw new Error('Vault installation key is invalid; encrypted data was not modified.');
    return secret;
  }

  _saveKeyring() {
    const temporary = `${this.keyringFile}.${crypto.randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temporary, JSON.stringify(this.keyring, null, 2), {
        flag: 'wx',
        mode: 0o600,
      });
      fs.renameSync(temporary, this.keyringFile);
    } finally {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
  }

  _loadVaultRecords() {
    try {
      if (fs.existsSync(this.vaultFile)) {
        const raw = fs.readFileSync(this.vaultFile, 'utf8');
        const data = JSON.parse(raw);
        if (data.records && typeof data.records === 'object') {
          for (const [id, rec] of Object.entries(data.records)) {
            this.records.set(id, rec);
          }
          this.stats.totalEncryptedRecords = this.records.size;
        }
      }
    } catch (err) {
      console.warn('[EnterpriseVault] Vault load note:', err.message);
    }
  }

  _saveVaultRecords() {
    try {
      const recordsObj = {};
      for (const [id, rec] of this.records.entries()) {
        recordsObj[id] = rec;
      }
      const payload = {
        version: '1.0-AES256GCM',
        updatedAt: Date.now(),
        count: this.records.size,
        records: recordsObj,
      };
      fs.writeFileSync(this.vaultFile, JSON.stringify(payload, null, 2), { mode: 0o600 });
    } catch (err) {
      console.error('[EnterpriseVault] Vault persist error:', err.message);
    }
  }

  /**
   * Encrypt arbitrary string or JSON data using AES-256-GCM with authenticated tag
   */
  encrypt(plaintext, options = {}) {
    if (plaintext === null || plaintext === undefined) {
      throw new Error('Plaintext cannot be null or undefined');
    }

    const id = options.id || `sec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const stringData = typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext);
    const version = options.keyVersion || this.keyring.activeVersion;
    const masterKey = this.masterKeys.get(version);

    if (!masterKey) {
      throw new Error(`Master Key version ${version} not available`);
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv, { authTagLength: TAG_LENGTH });

    // Bind Additional Authenticated Data (AAD) for tenant/context isolation
    const aad = Buffer.from(options.context || 'SIS_ENTERPRISE_ROOT', 'utf8');
    cipher.setAAD(aad);

    let ciphertext = cipher.update(stringData, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    const record = {
      id,
      ciphertext,
      iv: iv.toString('hex'),
      authTag,
      keyVersion: version,
      context: options.context || 'SIS_ENTERPRISE_ROOT',
      metadata: options.metadata || {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (options.persist !== false) {
      this.records.set(id, record);
      this.stats.totalEncryptedRecords = this.records.size;
      this._saveVaultRecords();
    }

    this.stats.totalEncryptionOps++;
    return {
      id,
      ciphertext,
      iv: record.iv,
      authTag,
      keyVersion: version,
      context: record.context,
      metadata: record.metadata,
      algorithm: ALGORITHM,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  /**
   * Decrypt data by record ID or by providing ciphertext, iv, and authTag
   */
  decrypt(input, options = {}) {
    let record;
    if (typeof input === 'string') {
      record = this.records.get(input);
      if (!record) {
        throw new Error(`Encrypted record [${input}] not found in vault`);
      }
    } else if (typeof input === 'object' && input !== null) {
      record = input;
    } else {
      throw new Error('Invalid decrypt target: must be record ID or encrypted object');
    }

    const version = record.keyVersion || this.keyring.activeVersion;
    const masterKey = this.masterKeys.get(version);

    if (!masterKey) {
      throw new Error(`Master key version ${version} not available for decryption`);
    }

    const iv = Buffer.from(record.iv, 'hex');
    const authTag = Buffer.from(record.authTag, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv, {
      authTagLength: TAG_LENGTH,
    });

    const aad = Buffer.from(record.context || options.context || 'SIS_ENTERPRISE_ROOT', 'utf8');
    decipher.setAAD(aad);
    decipher.setAuthTag(authTag);

    try {
      let decrypted = decipher.update(record.ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      this.stats.totalDecryptionOps++;

      if (options.parseJSON) {
        try {
          return JSON.parse(decrypted);
        } catch {
          return decrypted;
        }
      }
      return decrypted;
    } catch (err) {
      this.stats.integrityFailures++;
      throw new Error(
        `Cryptographic integrity verification failed: ${err.message} (tampering or bad key detected)`,
        { cause: err },
      );
    }
  }

  /**
   * Rotates Master Key to a new generation and re-encrypts all vault records
   */
  rotateKey() {
    const nextVersion = this.keyring.activeVersion + 1;
    const newSalt = crypto.randomBytes(SALT_LENGTH).toString('hex');

    const nextMeta = {
      salt: newSalt,
      iterations: PBKDF2_ITERATIONS,
      createdAt: Date.now(),
      keySource: process.env.SIS_MASTER_SECRET ? 'legacy' : 'installation',
    };

    // Derive and load new key
    const saltBuf = Buffer.from(newSalt, 'hex');
    const newKey = crypto.pbkdf2Sync(
      this._secretFor(nextMeta),
      saltBuf,
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      'sha512',
    );
    this.keyring.keys[String(nextVersion)] = nextMeta;
    this.keyring.activeVersion = nextVersion;
    this.keyring.rotatedAt = Date.now();
    this.masterKeys.set(nextVersion, newKey);

    // Re-encrypt existing records
    let reEncryptedCount = 0;
    for (const [id, rec] of this.records.entries()) {
      try {
        const plain = this.decrypt(rec);
        const fresh = this.encrypt(plain, {
          id,
          keyVersion: nextVersion,
          context: rec.context,
          metadata: rec.metadata,
          persist: false,
        });
        this.records.set(id, fresh);
        reEncryptedCount++;
      } catch (err) {
        console.warn(
          `[EnterpriseVault] Failed to re-encrypt record ${id} during rotation:`,
          err.message,
        );
      }
    }

    this._saveKeyring();
    this._saveVaultRecords();
    this.stats.keyRotations++;

    return {
      success: true,
      newVersion: nextVersion,
      reEncryptedRecords: reEncryptedCount,
      rotatedAt: this.keyring.rotatedAt,
    };
  }

  /**
   * Enterprise JSON file reader with automatic AES-256-GCM envelope decryption
   */
  secureReadJson(filePath) {
    try {
      if (!fs.existsSync(filePath)) return null;
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.encrypted === true && parsed.ciphertext && parsed.iv && parsed.authTag) {
        const decryptedStr = this.decrypt(parsed);
        return JSON.parse(decryptedStr);
      }
      return parsed;
    } catch (err) {
      console.warn(
        `[EnterpriseVault] Notice reading secure JSON from ${path.basename(filePath)}:`,
        err.message,
      );
      return null;
    }
  }

  /**
   * Enterprise JSON file writer with optional or automatic AES-256-GCM envelope encryption
   */
  secureWriteJson(filePath, data, options = {}) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const shouldEncrypt = options.encrypt !== false;
      if (shouldEncrypt) {
        const context =
          options.context ||
          `FILE_${path
            .basename(filePath)
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '_')}`;
        const enc = this.encrypt(data, {
          context,
          persist: false,
          metadata: {
            filePath: path.basename(filePath),
            classification: options.classification || 'ENTERPRISE_CONFIDENTIAL',
          },
        });

        const envelope = {
          encrypted: true,
          standard: 'AES-256-GCM / NIST SP 800-38D',
          classification: options.classification || 'CONFIDENTIAL // TIER-1 ENTERPRISE PII',
          filename: path.basename(filePath),
          updatedAt: Date.now(),
          keyVersion: enc.keyVersion,
          context: enc.context,
          iv: enc.iv,
          authTag: enc.authTag,
          ciphertext: enc.ciphertext,
        };

        fs.writeFileSync(filePath, JSON.stringify(envelope, null, 2), {
          mode: 0o600,
          encoding: 'utf8',
        });
        return true;
      } else {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), {
          mode: 0o644,
          encoding: 'utf8',
        });
        return true;
      }
    } catch (err) {
      console.error(`[EnterpriseVault] Failed writing secure JSON to ${filePath}:`, err.message);
      return false;
    }
  }

  getStatus() {
    return {
      status: 'active',
      algorithm: ALGORITHM.toUpperCase(),
      fipsCompliant: false,
      fipsModeEnabled: crypto.getFips() === 1,
      keyringVersion: this.keyring.activeVersion,
      keyRotations: this.stats.keyRotations,
      totalEncryptedRecords: this.records.size,
      totalDecryptionOps: this.stats.totalDecryptionOps,
      totalEncryptionOps: this.stats.totalEncryptionOps,
      integrityFailures: this.stats.integrityFailures,
      storageDirectory: this.directory,
      vaultEncrypted: true,
      encryptionScope: 'Vault records and explicitly encrypted envelopes only; other application data may be plaintext.',
      memoryZeroizationActive: false,
      keyStorage: 'Installation key file protected by operating-system file permissions; not an OS keychain.',
      legacyKeyVersions: Object.values(this.keyring.keys).filter(
        (meta) => meta.keySource !== 'installation',
      ).length,
      lastRotatedAt: this.keyring.rotatedAt,
    };
  }
}

const enterpriseVault = new EnterpriseVault();
export default enterpriseVault;
