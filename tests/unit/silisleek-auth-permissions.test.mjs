import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSleekId, globalInputValidator } from '../../server/security/input-validator.js';

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
