import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSafeExternalUrl, isSafeExternalUrl } from '../../server/security/ssrf-guard.js';
import { safeEvaluateMath } from '../../server/utils/safe-math.js';
import enterpriseGovernance from '../../server/security/governance.js';
import { childEnvironment } from '../../server/security/child-environment.js';
import { resolveWithinRoot } from '../../server/utils/path-confinement.js';
import { assessAction } from '../../server/security/action-monitor.js';

test('SSRF Guard blocks private, loopback, and cloud metadata targets', () => {
  assert.equal(isSafeExternalUrl('http://127.0.0.1:3000'), false);
  assert.equal(isSafeExternalUrl('http://localhost:8080/admin'), false);
  assert.equal(isSafeExternalUrl('http://169.254.169.254/latest/meta-data/'), false);
  assert.equal(isSafeExternalUrl('http://10.0.0.1/internal'), false);
  assert.equal(isSafeExternalUrl('http://172.16.0.1/internal'), false);
  assert.equal(isSafeExternalUrl('http://192.168.1.1/router'), false);
  assert.equal(isSafeExternalUrl('http://metadata.google.internal/computeMetadata/v1/'), false);
  assert.equal(isSafeExternalUrl('file:///etc/passwd'), false);
  assert.equal(isSafeExternalUrl('javascript:alert(1)'), false);
  assert.equal(isSafeExternalUrl('http://0177.0.0.1/'), false);
  assert.equal(isSafeExternalUrl('http://2130706433/'), false);

  assert.equal(isSafeExternalUrl('https://api.github.com/repos'), true);
  assert.equal(isSafeExternalUrl('https://html.duckduckgo.com/html/'), true);

  assert.throws(() => assertSafeExternalUrl('http://127.0.0.1:80'), /SSRF Guard/);
  assert.doesNotThrow(() => assertSafeExternalUrl('https://api.github.com/'));
});

test('Safe Math Evaluator computes mathematical expressions without eval/new Function', () => {
  assert.equal(safeEvaluateMath('2 * (3 + 7) ^ 2'), 200);
  assert.equal(safeEvaluateMath('2 * (3 + 7) ** 2'), 200);
  assert.equal(safeEvaluateMath('sqrt(16) + 4'), 8);
  assert.equal(safeEvaluateMath('Math.sqrt(25)'), 5);
  assert.equal(safeEvaluateMath('max(1, 10, 5)'), 10);
  assert.equal(safeEvaluateMath('min(1, 10, 5)'), 1);
  assert.equal(safeEvaluateMath('abs(-42)'), 42);
  assert.equal(Math.round(safeEvaluateMath('cos(0)')), 1);

  // Security checks: must reject arbitrary code execution
  assert.throws(() => safeEvaluateMath('console.log(1)'));
  assert.throws(() => safeEvaluateMath('process.exit(1)'));
  assert.throws(() => safeEvaluateMath('Function("return 1")()'));
  assert.throws(() => safeEvaluateMath('globalThis'));
  assert.throws(() => safeEvaluateMath('1/0'), /Division by zero/);
});

test('Enterprise Governance sanitizes secrets without leaking values as keys', () => {
  const sanitized = enterpriseGovernance.sanitizeText('password="SuperSecretPassword123"');
  assert.equal(sanitized.includes('SuperSecretPassword123'), false);
  assert.equal(sanitized, 'password="[REDACTED]"');

  const apiKeySanitized = enterpriseGovernance.sanitizeText('apikey: "secret_api_key_value"');
  assert.equal(apiKeySanitized.includes('secret_api_key_value'), false);
  assert.equal(apiKeySanitized, 'apikey: "[REDACTED]"');
});

test('Child environment filters all provider credentials and secret keys', () => {
  const env = childEnvironment({
    OPENAI_API_KEY: 'sk-proj-test12345',
    ANTHROPIC_API_KEY: 'sk-ant-test12345',
    GEMINI_API_KEY: 'test-gemini-key',
    CUSTOM_SECRET_KEY: 'secret-val',
    DATABASE_PASSWORD: 'superpassword',
    AUTH_TOKEN: 'bearer-xyz',
    OPENCODE_ORG_ID: 'org-12345',
    NORMAL_CONFIG_VAR: 'normal-value',
  });

  assert.equal(env.OPENAI_API_KEY, undefined);
  assert.equal(env.ANTHROPIC_API_KEY, undefined);
  assert.equal(env.GEMINI_API_KEY, undefined);
  assert.equal(env.CUSTOM_SECRET_KEY, undefined);
  assert.equal(env.DATABASE_PASSWORD, undefined);
  assert.equal(env.AUTH_TOKEN, undefined);
  assert.equal(env.OPENCODE_ORG_ID, undefined);
  assert.equal(env.NORMAL_CONFIG_VAR, 'normal-value');
});

test('Path confinement strictly denies escaping target directory roots', () => {
  assert.throws(
    () => resolveWithinRoot('C:\\test-root', '../../Windows/System32'),
    /Security Violation: Path escapes root/,
  );
  assert.throws(
    () => resolveWithinRoot('C:\\test-root', '..\\..\\secret.env'),
    /Security Violation: Path escapes root/,
  );
});

test('Action monitor flags sensitive credentials and keys', () => {
  const checkInstallationKey = assessAction('run_command', {
    command: 'type installation.key',
  });
  assert.equal(checkInstallationKey.risk, 'high');
  assert.ok(checkInstallationKey.findings.some((f) => f.includes('Credential or sensitive-file access')));

  const checkKeyring = assessAction('run_command', {
    command: 'cat keyring.json',
  });
  assert.equal(checkKeyring.risk, 'high');

  const checkSshKey = assessAction('run_command', {
    command: 'type id_ed25519',
  });
  assert.equal(checkSshKey.risk, 'high');
});
