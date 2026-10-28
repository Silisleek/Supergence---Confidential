// SIS Enterprise 1.0 — Zero-Trust Data-at-Rest Encryption Migration
// Encrypts user PII and confidential storage with AES-256-GCM envelopes.

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import enterpriseVault from './vault.js';
import enterpriseAuditTrail from './audit-trail.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');

const SENSITIVE_FILES = [
  'user-identity.json',
  'user-past.json',
  'user-behaviour.json',
  'user-projects.json',
  'user-interests.json',
];

async function runMigration() {
  console.log('[ENTERPRISE_MIGRATION] Starting Zero-Trust Encryption at Rest Migration...');
  let migratedCount = 0;
  let alreadyEncryptedCount = 0;

  for (const filename of SENSITIVE_FILES) {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`[ENTERPRISE_MIGRATION] Skipping missing file: ${filename}`);
      continue;
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.warn(`[ENTERPRISE_MIGRATION] Could not parse ${filename}:`, e.message);
      continue;
    }

    if (parsed && parsed.encrypted === true && parsed.ciphertext && parsed.iv && parsed.authTag) {
      console.log(
        `[ENTERPRISE_MIGRATION] ✓ ${filename} is ALREADY encrypted with ${parsed.standard || 'AES-256-GCM'}`,
      );
      alreadyEncryptedCount++;
      continue;
    }

    console.log(`[ENTERPRISE_MIGRATION] Encrypting plaintext PII: ${filename}...`);
    const context = `SIS_PROFILE_${filename.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
    const ok = enterpriseVault.secureWriteJson(filePath, parsed, {
      encrypt: true,
      context,
      classification: 'CONFIDENTIAL // TIER-1 ENTERPRISE PII',
    });

    if (ok) {
      migratedCount++;
      // Verify immediately
      const verified = enterpriseVault.secureReadJson(filePath);
      if (!verified) {
        throw new Error(`CRITICAL: Roundtrip decryption failed for ${filename}`);
      }
      enterpriseAuditTrail.recordEvent({
        eventType: 'MIGRATION_ENCRYPT_AT_REST',
        actor: 'SIS_ENTERPRISE_MIGRATOR',
        action: 'ENCRYPT_PII_AT_REST',
        details: { filename, algorithm: 'AES-256-GCM', status: 'VERIFIED' },
      });
      console.log(`[ENTERPRISE_MIGRATION] ✓ ${filename} successfully encrypted and verified!`);
    } else {
      console.error(`[ENTERPRISE_MIGRATION] ✗ Failed to encrypt ${filename}`);
    }
  }

  console.log(
    `[ENTERPRISE_MIGRATION] Migration complete. Migrated: ${migratedCount}, Already encrypted: ${alreadyEncryptedCount}.`,
  );
  const status = enterpriseVault.getStatus();
  console.log('[ENTERPRISE_MIGRATION] Vault Posture:', JSON.stringify(status, null, 2));
}

runMigration().catch((err) => {
  console.error('[ENTERPRISE_MIGRATION] Fatal error:', err);
  process.exit(1);
});
