export function responseDiagnostics({ response, query, audit, refine, evaluate, review, detect }) {
  const failures = [];
  const attempt = (name, work) => {
    try {
      return work();
    } catch {
      failures.push(`${name} unavailable`);
      return null;
    }
  };
  attempt('Draft audit', () => audit(response, query));
  attempt('Formatting review', () => refine(response));
  const quality = attempt('Quality heuristic', () => evaluate(response, query));
  attempt('Inner review', () => review(response, query));
  const mistakes = attempt('Issue detection', () => detect(response));
  const score = quality?.compositeScore;
  const validScore =
    typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 1;
  return {
    id: 'step-verification-audit',
    subsystem: 'Response diagnostics',
    icon: '🔬',
    title: 'Response formatting and heuristic review',
    status: failures.length || !validScore ? 'UNAVAILABLE' : 'COMPLETED',
    details: [
      'Original model response retained. These diagnostics do not establish correctness.',
      validScore
        ? `Formatting heuristic: ${(score * 100).toFixed(0)}% (not task success or accuracy)`
        : 'Formatting heuristic: Unavailable',
      Array.isArray(mistakes?.mistakes)
        ? `Heuristic issues flagged: ${mistakes.mistakes.length}; correctness requires task-specific checks`
        : 'Heuristic issue detection: Unavailable',
      ...failures,
    ],
  };
}

export function generatedArtifactEvidence() {
  return { verified: false, badge: 'Generated 3D artifact · review pending' };
}
