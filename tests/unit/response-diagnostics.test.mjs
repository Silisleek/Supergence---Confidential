import test from 'node:test';
import assert from 'node:assert/strict';
import {
  responseDiagnostics,
  generatedArtifactEvidence,
} from '../../server/services/responseDiagnostics.js';

test('failed diagnostics cannot become successful defaults or suppress other checks', () => {
  const calls = [];
  const step = responseDiagnostics({
    response: 'Draft',
    query: 'Task',
    audit: () => {
      throw new Error('offline');
    },
    refine: () => calls.push('refine'),
    evaluate: () => {
      throw new Error('unavailable');
    },
    review: () => calls.push('review'),
    detect: () => ({ mistakes: [] }),
  });
  assert.equal(step.status, 'UNAVAILABLE');
  assert.deepEqual(calls, ['refine', 'review']);
  assert.ok(step.details.includes('Formatting heuristic: Unavailable'));
  assert.ok(!step.details.join('').includes('98%'));
  assert.deepEqual(generatedArtifactEvidence(), {
    verified: false,
    badge: 'Generated 3D artifact · review pending',
  });
});

test('measured heuristic zero remains zero and is explicitly distinct from task accuracy', () => {
  const step = responseDiagnostics({
    response: 'Draft',
    query: 'Task',
    audit() {},
    refine() {},
    review() {},
    evaluate: () => ({ compositeScore: 0 }),
    detect: () => ({ mistakes: ['Issue'] }),
  });
  assert.equal(step.status, 'COMPLETED');
  assert.match(step.details[1], /0% \(not task success or accuracy\)/);
  assert.match(step.details[2], /issues flagged: 1/);
});
