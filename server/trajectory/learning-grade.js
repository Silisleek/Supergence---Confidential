/** A recorded observation may describe failure. Acquisition requires a passing oracle. */
export function hasPassingOracle(record = {}) {
  if (!record || typeof record !== 'object') return false;
  const evidence = record.verification || record;
  const grade = evidence.grade || record.verificationGrade;
  const status = evidence.status || record.verificationStatus;
  const reward = evidence.reward ?? record.verifiedScore;
  return (
    grade === 'OBSERVED' &&
    status === 'VERIFIED_SUCCESS' &&
    evidence.oracle === 'EXPECTED_OUTPUT' &&
    evidence.sandboxExitCode === 0 &&
    Number.isInteger(evidence.testsTotal) &&
    evidence.testsTotal > 0 &&
    evidence.testsPassed === evidence.testsTotal &&
    typeof reward === 'number' &&
    Number.isFinite(reward) &&
    reward > 0 &&
    reward <= 1
  );
}

/** Retention and model review never upgrade a claim into verified knowledge. */
export function memoryVerificationMetadata(metadata = {}, verification = null) {
  const supportingRecord = verification || metadata.verification;
  const verified = supportingRecord ? hasPassingOracle(supportingRecord) : false;
  return {
    ...metadata,
    ...(supportingRecord ? { verification: supportingRecord } : {}),
    verified,
    verificationStatus: verified
      ? 'VERIFIED_SUCCESS'
      : metadata.verificationStatus === 'MODEL_REVIEWED'
        ? 'MODEL_REVIEWED'
        : 'UNVERIFIED',
    verifiedAt: verified
      ? supportingRecord.verifiedAt || supportingRecord.executedAt || null
      : null,
  };
}
