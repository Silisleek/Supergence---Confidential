import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('audit ledger does not repair or overwrite untrusted history', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-audit-test-'));
  const singleton = path.join(root, 'singleton');
  const vault = path.join(root, 'vault');
  const fixture = path.join(root, 'fixture');
  const oldAudit = process.env.SIS_AUDIT_DIR;
  const oldVault = process.env.SIS_VAULT_DIR;
  const oldSigning = process.env.SIS_AUDIT_SIGNING_KEY;
  process.env.SIS_AUDIT_DIR = singleton;
  process.env.SIS_VAULT_DIR = vault;
  delete process.env.SIS_AUDIT_SIGNING_KEY;
  t.after(async () => {
    if (oldAudit === undefined) delete process.env.SIS_AUDIT_DIR;
    else process.env.SIS_AUDIT_DIR = oldAudit;
    if (oldVault === undefined) delete process.env.SIS_VAULT_DIR;
    else process.env.SIS_VAULT_DIR = oldVault;
    if (oldSigning === undefined) delete process.env.SIS_AUDIT_SIGNING_KEY;
    else process.env.SIS_AUDIT_SIGNING_KEY = oldSigning;
    for (const dir of [singleton, vault, fixture]) {
      for (const name of await fs.readdir(dir).catch(() => []))
        await fs.unlink(path.join(dir, name));
      await fs.rmdir(dir).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
    await fs.rmdir(root);
  });
  const { EnterpriseAuditTrail } = await import('../../server/security/audit-trail.js');
  const ledger = new EnterpriseAuditTrail({ directory: fixture });
  ledger.logEvent('TEST', 'user', 'OBSERVE');
  const filename = path.join(fixture, 'audit-ledger.json');
  const payload = JSON.parse(await fs.readFile(filename, 'utf8'));
  payload.chain[0].signature = 'invalid';
  const tampered = JSON.stringify(payload);
  await fs.writeFile(filename, tampered);
  const reopened = new EnterpriseAuditTrail({ directory: fixture });
  assert.equal(reopened.verifyChainIntegrity().isValid, false);
  assert.equal(reopened.getStats().writable, false);
  assert.throws(() => reopened.logEvent('TEST', 'user', 'WRITE'), /integrity is invalid/);
  assert.equal(await fs.readFile(filename, 'utf8'), tampered);
  payload.chain = [payload.chain[1]];
  await fs.writeFile(filename, JSON.stringify(payload));
  const truncated = new EnterpriseAuditTrail({ directory: fixture });
  assert.equal(truncated.verifyChainIntegrity().isValid, false);
  assert.match(
    JSON.stringify(truncated.verifyChainIntegrity().violations),
    /Genesis record is missing/,
  );
  await fs.unlink(path.join(fixture, 'audit.key'));
  assert.throws(() => new EnterpriseAuditTrail({ directory: fixture }), /signing key is missing/);

  const { default: governance } = await import('../../server/security/governance.js');
  const report = await governance.runComplianceAudit();
  assert.equal(report.complianceScore, null);
  assert.ok(
    Object.values(report.frameworks).every((framework) => framework.status === 'unavailable'),
  );
});
