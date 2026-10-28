import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  ProactiveSuggestions,
  scanSuggestionFolders,
} from '../../server/services/proactiveSuggestions.js';

test('metadata review excludes secrets, hidden paths and linked folders without reading contents', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'supergence-scan-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.writeFile(path.join(directory, 'report.md'), 'private content must not be collected');
  await fs.writeFile(path.join(directory, '.env'), 'secret');
  await fs.mkdir(path.join(directory, 'node_modules'));
  await fs.writeFile(path.join(directory, 'node_modules', 'package.js'), 'hidden');
  await fs.symlink(os.tmpdir(), path.join(directory, 'outside'), 'junction');
  const result = await scanSuggestionFolders({ workspace: directory }, ['workspace']);
  assert.deepEqual(
    result.records.map((r) => r.path),
    ['report.md'],
  );
  assert.ok(!JSON.stringify(result).includes('private content'));
  assert.equal(result.scope[0].scannedFiles, 1);
});
test('90-minute scheduling uses actual evidence, prevents overlap, deduplicates and persists notifications', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'supergence-proactive-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  let now = 100000,
    scans = 0,
    deliveries = 0,
    completions = 0;
  const dependencies = {
    directory,
    workspace: directory,
    clock: () => now,
    folders: async () => ({ workspace: directory }),
    scan: async () => {
      scans++;
      return {
        scope: [],
        records: [
          { id: 'file-0', folder: 'workspace', path: 'proposal.md', modifiedAt: '2026-10-26' },
        ],
      };
    },
    activity: async () => ({ available: true, application: 'Code', title: 'proposal.md' }),
    notify: async () => {
      deliveries++;
      return { submitted: true, channel: 'test-adapter' };
    },
    complete: async () => {
      completions++;
      return {
        choices: [
          {
            message: {
              content: JSON.stringify({
                suggestions: [
                  {
                    title: 'Review proposal',
                    why: 'A proposal file was observed.',
                    prompt: 'Review proposal.md',
                    evidenceIds: ['file-0'],
                  },
                  {
                    title: 'Invented item',
                    why: 'No observed evidence',
                    prompt: 'Do it',
                    evidenceIds: ['fake-id'],
                  },
                ],
              }),
            },
          },
        ],
      };
    },
  };
  const service = await new ProactiveSuggestions(dependencies).init({ schedule: false });
  assert.equal(service.snapshot().nextCheckAt, now + 90 * 60000);
  await service.tick();
  assert.equal(scans, 0);
  now += 90 * 60000;
  await Promise.all([service.tick(), service.tick()]);
  assert.equal(scans, 1);
  assert.equal(completions, 1);
  assert.equal(deliveries, 1);
  assert.equal(service.snapshot().inbox.length, 1);
  await service.check();
  assert.equal(deliveries, 1);
  assert.equal(service.snapshot().inbox.length, 1);
  const restarted = await new ProactiveSuggestions(dependencies).init({ schedule: false });
  assert.equal(restarted.snapshot().inbox[0].title, 'Review proposal');
  await service.update({ enabled: false });
  now += 120 * 60000;
  await service.tick();
  assert.equal(scans, 2);
  assert.throws(() => service.validate({ intervalMinutes: 5 }), /60 to 120/);
});
test('revoking activity and folders during a check discards the old result before provider access', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'supergence-revoke-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  let release,
    called = 0,
    activity = 0;
  const service = await new ProactiveSuggestions({
    directory,
    workspace: directory,
    folders: async () => ({ workspace: directory }),
    scan: () =>
      new Promise((resolve) => {
        release = () => resolve({ scope: [], records: [] });
      }),
    activity: async () => {
      activity++;
      return {};
    },
    complete: async () => {
      called++;
    },
  }).init({ schedule: false });
  const pending = service.check();
  await service.update({ enabled: false, activity: false });
  release();
  await pending;
  assert.equal(called, 0);
  assert.equal(activity, 0);
  assert.equal(service.snapshot().inbox.length, 0);
});
test('provider failure creates no invented suggestion or notification', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'supergence-failure-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  let deliveries = 0;
  const service = await new ProactiveSuggestions({
    directory,
    workspace: directory,
    folders: async () => ({ workspace: directory }),
    scan: async () => ({ scope: [], records: [] }),
    activity: async () => ({ available: false }),
    complete: async () => {
      throw new Error('Provider unavailable');
    },
    notify: async () => {
      deliveries++;
    },
  }).init({ schedule: false });
  await service.check();
  assert.equal(deliveries, 0);
  assert.equal(service.snapshot().inbox.length, 0);
  assert.match(service.snapshot().lastError, /Provider unavailable/);
});
