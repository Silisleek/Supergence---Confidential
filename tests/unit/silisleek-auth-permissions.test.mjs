import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSleekId, globalInputValidator } from '../../server/security/input-validator.js';
import { sleekAuth, SLEEK_ROLES } from '../../server/security/sleek-auth.js';

test('validateSleekId enforces strict format bounds', () => {
  // Valid IDs
  assert.equal(validateSleekId('slk-creator-01'), true);
  assert.equal(validateSleekId('slk-operator-beta'), true);
  assert.equal(validateSleekId('sleek_user_99'), true);
  assert.equal(validateSleekId('slk.architect.prime'), true);
  assert.equal(validateSleekId('user123'), true);

  // Invalid IDs
  assert.equal(validateSleekId(''), false);
  assert.equal(validateSleekId('ab'), false); // Too short (< 4)
  assert.equal(validateSleekId('slk user with spaces'), false);
  assert.equal(validateSleekId('<script>alert(1)</script>'), false);
  assert.equal(validateSleekId('../../../evil'), false);
  assert.equal(validateSleekId('slk$dollar'), false);
  assert.equal(validateSleekId(null), false);
  assert.equal(validateSleekId(undefined), false);
});

test('SleekAuthManager authenticates and grants role-based permissions', () => {
  // Authenticate seed user
  const authRes = sleekAuth.authenticate('slk-creator-01', 'sleek-pass-2026', 'creator');
  assert.ok(authRes.sessionToken);
  assert.equal(authRes.user.sleekId, 'slk-creator-01');
  assert.equal(authRes.user.role, 'creator');
  assert.ok(authRes.user.permissions.includes('workspace.write'));
  assert.ok(authRes.user.permissions.includes('tools.generate_ui'));

  // Verify wrong password rejects
  assert.throws(
    () => sleekAuth.authenticate('slk-creator-01', 'wrong-password-123'),
    /Authentication failed/,
  );

  // Verify custom provisioned user with operator role
  const opRes = sleekAuth.authenticate('slk-test-operator', 'supersecret2026', 'operator');
  assert.equal(opRes.user.role, 'operator');
  assert.ok(opRes.user.permissions.includes('computer.control'));
  assert.ok(opRes.user.permissions.includes('terminal.exec'));

  // Verify architect permissions
  assert.ok(SLEEK_ROLES.architect.permissions.includes('system.admin'));
  assert.ok(SLEEK_ROLES.architect.permissions.includes('vault.manage'));

  // Verify invalid ID rejects
  assert.throws(
    () => sleekAuth.authenticate('bad ID with spaces', 'password123'),
    /Invalid Sleek ID format/,
  );
  assert.throws(
    () => sleekAuth.authenticate('slk-user', '123'), // Too short password (< 6)
    /Passcode must be at least 6 characters/,
  );
});

test('globalInputValidator rejects prototype pollution, traversal, and script injection', () => {
  // Prototype pollution in query
  let status = 200;
  let jsonResult = null;
  const mockRes = {
    status(code) {
      status = code;
      return {
        json(data) {
          jsonResult = data;
        },
      };
    },
  };

  const maliciousProtoReq = {
    path: '/api/test',
    query: JSON.parse('{"__proto__": {"admin": true}}'),
    params: {},
    body: {},
  };
  globalInputValidator(maliciousProtoReq, mockRes, () => {});
  assert.equal(status, 400);
  assert.match(jsonResult.message, /Prototype pollution/);

  // Traversal in query
  status = 200;
  const maliciousTraversalReq = {
    path: '/api/data',
    query: { target: '../../secret.env' },
    params: {},
    body: {},
  };
  globalInputValidator(maliciousTraversalReq, mockRes, () => {});
  assert.equal(status, 400);
  assert.match(jsonResult.message, /Path traversal sequence detected/);

  // XSS injection in generic query
  status = 200;
  const maliciousXssReq = {
    path: '/api/search',
    query: { q: '<script>alert(document.cookie)</script>' },
    params: {},
    body: {},
  };
  globalInputValidator(maliciousXssReq, mockRes, () => {});
  assert.equal(status, 400);
  assert.match(jsonResult.message, /Potentially malicious script/);

  // Clean request passes
  status = 200;
  let nextCalled = false;
  const cleanReq = {
    path: '/api/search',
    query: { q: 'quantum neural architectures' },
    params: { id: 'item-123' },
    body: { name: 'Supergence Project' },
  };
  globalInputValidator(cleanReq, mockRes, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
  assert.equal(status, 200);
});
