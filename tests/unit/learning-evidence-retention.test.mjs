import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { LearningLibrary } from '../../server/services/learningLibrary.js';
import { retainAnalysisEvidence } from '../../server/routes/learning.js';

test('a cached analysis reuses both its evidence and retained source identity', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sis-evidence-retention-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const store = new LearningLibrary({ directory });
  const evidence = {
    evidenceId: 'ev_example',
    source: { sha256: 'stable-source' },
    targetExecuted: false,
    observations: [],
    reused: false,
  };
  const first = retainAnalysisEvidence(evidence, { path: 'workspace/example' }, store);
  const cached = retainAnalysisEvidence(
    { ...evidence, reused: true },
    { path: 'workspace/example' },
    store,
  );
  assert.equal(cached.source.id, first.source.id);
  assert.equal(cached.reused, true);
  assert.equal(store.list().length, 1);
  assert.equal(store.get(first.source.id).state, 'retained');
});
