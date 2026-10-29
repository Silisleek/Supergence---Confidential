import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

test('vault uses installation-specific keys and preserves legacy encrypted records', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-vault-key-'));
  const singletonDir = path.join(root, 'singleton');
  const firstDir = path.join(root, 'first');
  const secondDir = path.join(root, 'second');
  const legacyDir = path.join(root, 'legacy');
  const previousSecret = process.env.SIS_MASTER_SECRET;
  const previousDir = process.env.SIS_VAULT_DIR;
  delete process.env.SIS_MASTER_SECRET;
  process.env.SIS_VAULT_DIR = singletonDir;
  t.after(async () => {
    if (previousSecret === undefined) delete process.env.SIS_MASTER_SECRET;
    else process.env.SIS_MASTER_SECRET = previousSecret;
    if (previousDir === undefined) delete process.env.SIS_VAULT_DIR;
    else process.env.SIS_VAULT_DIR = previousDir;
    for (const dir of [singletonDir, firstDir, secondDir, legacyDir]) {
      for (const name of await fs.readdir(dir).catch(() => []))
        await fs.unlink(path.join(dir, name));
      await fs.rmdir(dir).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
    await fs.rmdir(root);
  });
  const { EnterpriseVault } = await import('../../server/security/vault.js');
  const first = new EnterpriseVault({ directory: firstDir });
  const second = new EnterpriseVault({ directory: secondDir });
  const envelope = first.encrypt('private value', { persist: false });
  assert.equal(first.getStatus().fipsCompliant, false);
  assert.equal(first.getStatus().memoryZeroizationActive, false);
  assert.equal(first.getStatus().storageDirectory, firstDir);
  assert.equal(new EnterpriseVault({ directory: firstDir }).decrypt(envelope), 'private value');
  assert.notEqual(
    await fs.readFile(path.join(firstDir, 'installation.key'), 'utf8'),
    await fs.readFile(path.join(secondDir, 'installation.key'), 'utf8'),
  );
  assert.throws(() => second.decrypt(envelope), /integrity/);

  await fs.mkdir(legacyDir);
  const salt = crypto.randomBytes(32);
  const key = crypto.pbkdf2Sync(
    `SIS_ENTERPRISE_SECRET_KEY_999_${process.platform}_${process.arch}`,
    salt,
    100000,
    32,
    'sha512',
  );
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from('SIS_ENTERPRISE_ROOT'));
  const ciphertext = Buffer.concat([cipher.update('legacy value'), cipher.final()]);
  const legacy = {
    ciphertext: ciphertext.toString('hex'),
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex'),
    keyVersion: 1,
  };
  await fs.writeFile(
    path.join(legacyDir, 'keyring.json'),
    JSON.stringify({
      activeVersion: 1,
      keys: { 1: { salt: salt.toString('hex'), iterations: 100000 } },
    }),
  );
  const migrated = new EnterpriseVault({ directory: legacyDir });
  assert.equal(migrated.decrypt(legacy), 'legacy value');
  assert.equal(migrated.keyring.activeVersion, 2);
  assert.equal(migrated.getStatus().legacyKeyVersions, 1);
  assert.equal(migrated.encrypt('new value', { persist: false }).keyVersion, 2);
  assert.equal(new EnterpriseVault({ directory: legacyDir }).decrypt(legacy), 'legacy value');
  await fs.unlink(path.join(legacyDir, 'installation.key'));
  assert.throws(() => migrated.rotateKey(), /installation key is missing/);
  assert.equal(migrated.keyring.activeVersion, 2);
  assert.throws(() => new EnterpriseVault({ directory: legacyDir }), /installation key is missing/);
});
