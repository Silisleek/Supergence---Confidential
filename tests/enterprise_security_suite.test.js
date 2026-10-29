// SIS Enterprise 1.0 — Cryptographic & Invariant Test Suite
// Verifies AES-256-GCM Envelope Encryption, AAD Context Binding, Key Rotation, and Merkle Tamper Detection

import assert from 'assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sis-enterprise-test-'));
process.env.SIS_VAULT_DIR = path.join(fixtureRoot, 'vault');
process.env.SIS_AUDIT_DIR = path.join(fixtureRoot, 'audit');
const { default: enterpriseVault } = await import('../server/security/vault.js');
const { default: enterpriseAuditTrail, EnterpriseAuditTrail } =
  await import('../server/security/audit-trail.js');
const { default: governanceScanner } = await import('../server/security/governance.js');

async function runTestSuite() {
  console.log('================================================================');
  console.log('SIS ENTERPRISE SECURITY & CRYPTOGRAPHIC INVARIANT TEST SUITE');
  console.log('Cryptographic checks do not establish compliance or certification.');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}: ${err.message}`);
    }
  }

  // 1. AES-256-GCM Authenticated Roundtrip
  await test('1. AES-256-GCM round-trip encrypt and decrypt', async () => {
    const secret = JSON.stringify({
      mission: 'AUTONOMOUS_SUPERINTELLIGENCE',
      budget: '$1,000,000,000',
    });
    const enc = enterpriseVault.encrypt(secret, { context: 'CORP_EXECUTIVE' });
    assert.ok(enc.ciphertext && enc.iv && enc.authTag, 'Missing cipher artifacts');
    assert.strictEqual(enc.iv.length, 24, 'IV must be 96-bit (24 hex chars)');
    assert.strictEqual(enc.authTag.length, 32, 'Tag must be 128-bit (32 hex chars)');

    const dec = enterpriseVault.decrypt(enc);
    assert.strictEqual(dec, secret, 'Decrypted payload mismatch');
  });

  // 2. Tamper Resistance Verification (GCM Authentication Tag)
  await test('2. Tamper Resistance: 1-bit ciphertext alteration is rejected', async () => {
    const secret = 'TOP_SECRET_ORCHESTRATION_DATA';
    const enc = enterpriseVault.encrypt(secret, { context: 'MISSION_CRITICAL' });

    // Flip 1 character in ciphertext
    const tamperedCipher = (enc.ciphertext[0] === 'a' ? 'b' : 'a') + enc.ciphertext.slice(1);
    const tamperedPayload = { ...enc, ciphertext: tamperedCipher };

    let rejected = false;
    try {
      enterpriseVault.decrypt(tamperedPayload);
    } catch (err) {
      rejected = true;
    }
    assert.ok(rejected, 'Tampered ciphertext was NOT rejected by GCM tag verification!');
  });

  // 3. AAD Context Binding Isolation
  await test('3. AAD Context Isolation: Decryption with wrong context fails', async () => {
    const secret = 'FINANCIAL_ALLOCATIONS_2026';
    const enc = enterpriseVault.encrypt(secret, { context: 'CFO_SUITE_ONLY' });

    let rejected = false;
    try {
      // Attempt decrypt under different context
      enterpriseVault.decrypt({ ...enc, context: 'PUBLIC_GUEST_SUITE' });
    } catch (err) {
      rejected = true;
    }
    assert.ok(rejected, 'Context spoofing was NOT rejected by AAD verification!');
  });

  // 4. Secure File Envelope Serialization & Deserialization
  await test('4. Secure File Envelope Serialization & Deserialization', async () => {
    const testFile = path.join(fixtureRoot, '_test_envelope.json');
    const testData = { project: 'SEAL_AUTONOMOUS', epoch: 999, timestamp: Date.now() };

    const writeOk = enterpriseVault.secureWriteJson(testFile, testData, {
      encrypt: true,
      context: 'TEST_ENVELOPE_SUITE',
    });
    assert.ok(writeOk, 'secureWriteJson failed');

    const readBack = enterpriseVault.secureReadJson(testFile);
    assert.deepStrictEqual(readBack, testData, 'Decrypted test envelope mismatch');
  });

  // 5. Merkle Audit Chain Integrity
  await test('5. Merkle Audit Chain: Full history verification', async () => {
    const verification = enterpriseAuditTrail.verifyChainIntegrity();
    assert.ok(verification.isValid, 'Audit chain integrity check failed');
    assert.strictEqual(verification.violationsCount, 0, 'Audit violations detected');
    assert.ok(
      verification.merkleRoot && verification.merkleRoot.length === 64,
      'Invalid Merkle root',
    );
  });

  // 6. Tamper Detection on Historical Ledger
  await test('6. Tamper Detection: Modifying historical ledger record breaks chain', async () => {
    const testAudit = new EnterpriseAuditTrail({ directory: path.join(fixtureRoot, 'tamper') });
    testAudit.chain = [];
    testAudit.genesisHash = '0000000000000000000000000000000000000000000000000000000000000000';
    testAudit._recordGenesis();
    testAudit.logEvent('OP_1', 'ACTOR_A', 'EXEC', { a: 1 });
    testAudit.logEvent('OP_2', 'ACTOR_B', 'EXEC', { b: 2 });

    const initialCheck = testAudit.verifyChainIntegrity();
    assert.ok(initialCheck.isValid, 'Initial chain must be valid');

    // Tamper with record #1
    testAudit.chain[1].details = { a: 999999 }; // unauthorized modification
    const tamperedCheck = testAudit.verifyChainIntegrity();
    assert.strictEqual(tamperedCheck.isValid, false, 'Tampered block was NOT caught!');
    assert.ok(tamperedCheck.violationsCount > 0, 'Tamper violations count must be > 0');
  });

  // 7. No certification claims without an assessment
  await test('7. Governance reports unassessed compliance as unavailable', async () => {
    const report = await governanceScanner.runComplianceAudit();
    assert.strictEqual(report.complianceScore, null);
    assert.ok(
      Object.values(report.frameworks).every((framework) => framework.status === 'unavailable'),
    );
  });

  console.log(`\n================================================================`);
  console.log(`TEST SUITE RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log(`================================================================\n`);

  if (passed !== total) process.exitCode = 1;
}

try {
  await runTestSuite();
} finally {
  const relative = path.relative(os.tmpdir(), fixtureRoot);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative))
    throw new Error('Refusing to clean up a fixture outside the temporary directory.');
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}
