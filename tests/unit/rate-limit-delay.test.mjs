import test from 'node:test';
import assert from 'node:assert/strict';
import { rateLimitDelay } from '../../server/api/rate-limit-delay.js';
test('provider retry headers and mixed minute/second quota messages retain actual delays', () => {
  assert.equal(rateLimitDelay({ headers: { 'retry-after': '12.5' } }), 12500);
  assert.equal(
    rateLimitDelay({ message: 'tokens per day (TPD): Please try again in 5m2.832s.' }),
    302832,
  );
  assert.equal(rateLimitDelay({ message: 'Please try again in 1h2m3s' }), 3723000);
  assert.equal(rateLimitDelay({ message: 'unknown quota error' }), 60000);
});
