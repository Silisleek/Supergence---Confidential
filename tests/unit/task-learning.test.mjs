import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TaskLearning } from '../../server/services/taskLearning.js';
import { LearningLibrary } from '../../server/services/learningLibrary.js';
import { publicAddresses } from '../../server/services/publicSource.js';

function fixture(t, overrides = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sis-task-learning-'));
  t.after(() => {
    assert.equal(path.dirname(directory), os.tmpdir());
    assert.ok(path.basename(directory).startsWith('sis-task-learning-'));
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const store = new LearningLibrary({ directory: path.join(directory, 'sources') });
  const calls = [];
  const options = {
    directory,
    store,
    access: { settings: { files: true, browser: true } },
    infer: async (_system, raw) => {
      const { topic } = JSON.parse(raw);
      return JSON.stringify({
        taskFamily: topic,
        questions: [`How does ${topic} work?`],
        searchQueries: [topic],
        practiceTasks: [{ task: `Apply ${topic}`, successCriteria: 'Inspect the actual outcome' }],
        relatedTopics: [`Compare ${topic} with an adjacent technique`],
      });
    },
    investigate: async (topic) => {
      calls.push(topic);
      return {
        sources: [
          {
            id: 'S1',
            title: 'Source fixture',
            url: 'https://example.com/reference',
            fetchStatus: 200,
            excerpt: `Observed reference about ${topic}`,
          },
        ],
        synthesis: `Source-backed fixture notes for ${topic}`,
        gaps: [],
      };
    },
    ...overrides,
  };
  return { learner: new TaskLearning(options), options, calls, store };
}

test('unrelated fields receive distinct plans, retained references and transferable practice', async (t) => {
  const { learner, options, calls, store } = fixture(t);
  for (const topic of ['Weaving twill cloth', 'Renaissance counterpoint', 'Wetland restoration'])
    learner.enqueue({ topic });
  await learner.drain();
  assert.equal(calls.length, 3);
  const snapshot = new TaskLearning(options).snapshot();
  assert.equal(snapshot.families.length, 3);
  assert.ok(
    snapshot.studies.every(
      (study) =>
        study.status === 'studied' &&
        study.plan.relatedTopics.length &&
        study.plan.practiceTasks.length,
    ),
  );
  assert.ok(store.search('weaving twill').matches.length);
  assert.ok(snapshot.studies.every((study) => study.experiences.length === 0));
});

test('task observations do not launch research and practical failures remain reported experience', async (t) => {
  const { learner, calls, store } = fixture(t);
  learner.observeTask('Learn to repair a violin bridge', 'conversation-fixture');
  assert.equal(calls.length, 0);
  assert.equal(learner.snapshot().observations[0].status, 'local-observation');
  const study = learner.enqueue({ topic: 'Violin bridge setup' });
  await learner.drain();
  const experience = learner.recordExperience(study.id, {
    task: 'Bridge inspection',
    observation: 'The string clearance was still uneven.',
    outcome: 'needs-work',
  });
  assert.equal(experience.independentlyVerified, false);
  assert.equal(experience.provenance, 'user-reported');
  assert.match(store.get(experience.sourceId).content, /string clearance/);
});

test('search snippets without readable pages never count as a completed study', async (t) => {
  const { learner } = fixture(t, {
    investigate: async () => ({
      sources: [{ id: 'S1', snippet: 'Search-only claim', fetchStatus: 503 }],
      gaps: ['Source unavailable'],
    }),
  });
  learner.enqueue({ topic: 'Archival bookbinding' });
  await learner.drain();
  assert.equal(learner.snapshot().studies[0].status, 'needs-attention');
  assert.match(learner.snapshot().studies[0].error, /No source pages/);
});

test('explicit exploration branches into related tasks once and stays bounded', async (t) => {
  const { learner, calls } = fixture(t, {
    infer: async (_system, raw) => {
      const { topic } = JSON.parse(raw);
      return JSON.stringify({
        taskFamily: topic,
        questions: [`Explain ${topic}`],
        searchQueries: [topic],
        practiceTasks: [],
        relatedTopics: [`${topic} application`, `${topic} limitations`],
      });
    },
  });
  const parent = learner.enqueue({ topic: 'Textile dyeing', exploreRelated: true });
  await learner.drain();
  assert.equal(calls.length, 3);
  assert.equal(learner.state.studies.filter((study) => study.parentId === parent.id).length, 2);
  assert.ok(
    learner.state.studies
      .filter((study) => study.parentId)
      .every((study) => study.exploreRelated === false),
  );
});

test('source learning obeys revoked access and refuses private or mixed DNS answers', async (t) => {
  const { learner, options } = fixture(t);
  options.access.settings.browser = false;
  assert.throws(() => learner.enqueue({ topic: 'New subject' }), /access/);
  await assert.rejects(
    publicAddresses('source.example', async () => [{ address: '127.0.0.1', family: 4 }]),
    /private/,
  );
  await assert.rejects(
    publicAddresses('source.example', async () => [
      { address: '93.184.216.34', family: 4 },
      { address: '10.1.2.3', family: 4 },
    ]),
    /private/,
  );
  assert.equal(
    (await publicAddresses('source.example', async () => [{ address: '93.184.216.34', family: 4 }]))
      .length,
    1,
  );
  await assert.rejects(
    publicAddresses('source.example', async () => [{ address: '0:0:0:0:0:0:0:1', family: 6 }]),
    /private/,
  );
});
