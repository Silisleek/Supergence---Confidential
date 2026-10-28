import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hasPassingOracle,
  memoryVerificationMetadata,
} from '../../server/trajectory/learning-grade.js';

const successfulRun = () => ({
  grade: 'OBSERVED',
  status: 'VERIFIED_SUCCESS',
  oracle: 'EXPECTED_OUTPUT',
  sandboxExitCode: 0,
  testsPassed: 3,
  testsTotal: 3,
  reward: 1,
  executedAt: 123,
});

test('an observed failure remains evidence, never an acquired skill', () => {
  const failure = { ...successfulRun(), status: 'EXECUTION_FAILED', sandboxExitCode: 1, reward: 0 };
  assert.equal(hasPassingOracle(failure), false);
  assert.equal(
    hasPassingOracle({ verificationGrade: 'OBSERVED', verifiedScore: 0, verification: failure }),
    false,
  );
  assert.equal(failure.grade, 'OBSERVED');
});

test('only a completed passing expected-output oracle permits acquisition', () => {
  assert.equal(hasPassingOracle(successfulRun()), true);
  assert.equal(hasPassingOracle({ verification: successfulRun() }), true);
  const invalid = [
    { testsPassed: 2 },
    { testsTotal: 0, testsPassed: 0 },
    { oracle: 'DIFFERENTIAL' },
    { oracle: 'STRUCTURAL' },
    { grade: 'INFERRED' },
    { status: 'SYNTAX_ONLY' },
    { sandboxExitCode: null },
    { sandboxExitCode: 1 },
    { reward: NaN },
    { reward: 0 },
    { testsTotal: 1.5, testsPassed: 1.5 },
  ];
  for (const changes of invalid)
    assert.equal(
      hasPassingOracle({ ...successfulRun(), ...changes }),
      false,
      JSON.stringify(changes),
    );
});

test('legacy scores and verified flags have no verification authority', () => {
  assert.equal(hasPassingOracle({ verificationGrade: 'OBSERVED', verifiedScore: 0.99 }), false);
  const exposed = memoryVerificationMetadata({
    verified: true,
    verifiedAt: 456,
    title: 'Retained claim',
  });
  assert.equal(exposed.verified, false);
  assert.equal(exposed.verificationStatus, 'UNVERIFIED');
  assert.equal(exposed.verifiedAt, null);
  assert.equal(exposed.title, 'Retained claim');
});

test('retained model review stays separate from verification and supporting evidence survives storage', () => {
  assert.equal(
    memoryVerificationMetadata({
      verified: true,
      verificationStatus: 'MODEL_REVIEWED',
      reviewConfidence: 0.99,
    }).verified,
    false,
  );
  const metadata = memoryVerificationMetadata({ title: 'Passing recipe' }, successfulRun());
  assert.equal(metadata.verified, true);
  assert.equal(metadata.verifiedAt, 123);
  assert.equal(memoryVerificationMetadata(metadata).verified, true);
  assert.equal(hasPassingOracle(null), false);
});
