import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentProfiles } from '../../server/services/agentProfiles.js';

test('agent names and supplied mascots persist while preserving roster identity', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sis-profiles-'));
  try {
    const roster = [
      { id: 'agent-cs', name: 'Computer Science', role: 'Engineer', tasksCompleted: 0 },
    ];
    const store = new AgentProfiles({ directory });
    assert.equal(store.list(roster)[0].name, 'Superake');
    const changed = store.update('agent-cs', { name: 'Atlas', mascot: 'superbit' }, roster);
    assert.equal(changed.id, roster[0].id);
    assert.equal(changed.role, 'Engineer');
    assert.equal(changed.tasksCompleted, 0);
    assert.equal(roster[0].name, 'Computer Science');
    const restored = new AgentProfiles({ directory }).list(roster)[0];
    assert.equal(restored.name, 'Atlas');
    assert.equal(restored.mascotSrc, '/images/mascots/superbit.png');
    assert.equal(restored.specialtyName, 'Computer Science');
    assert.equal(store.list([]).length, 0);
    assert.throws(() => store.update('invented-agent', { name: 'Ghost' }, roster), /not found/);
    assert.throws(() => store.update('agent-cs', { name: '<script>' }, roster), /markup/);
    assert.throws(() => store.update('agent-cs', { mascot: '../secret' }, roster), /available/);
    assert.throws(() => store.update('agent-cs', { name: ' ' }, roster), /name/);
    assert.throws(() => store.update('agent-cs', { name: 'Bad\nname' }, roster), /control/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
