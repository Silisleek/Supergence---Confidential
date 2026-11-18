import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AremAgentMemory } from '../../server/arem/arem-agent-memory.js';

test('AREM graph returns only visible saved nodes and their real parents', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'arem-map-'));
  const memory = new AremAgentMemory(path.join(dir, 'nodes.sqlite'));
  try {
    const parent = memory.save({ chat: 'one', title: 'Project', note: 'Project context', evidence: 'turn-1' });
    const child = memory.save({ chat: 'one', parent: parent.id, title: 'Preferences', note: 'Useful preferences', evidence: 'turn-2' });
    const shared = memory.save({ scope: 'permanent', title: 'Shared', note: 'Shared memory', evidence: 'source' });
    memory.save({ chat: 'two', title: 'Private', note: 'Other chat only', evidence: 'turn-3' });
    memory.checkpoint({ chat: 'one', requestId: 'turn-1', sourceCount: 1, toolCount: 1 });
    const result = memory.graph({ chat: 'one' });
    assert.deepEqual(new Set(result.nodes.map((node) => node.id)), new Set([parent.id, child.id, shared.id]));
    assert.equal(result.nodes.find((node) => node.id === child.id).parent, parent.id);
    assert.equal(result.total, 3);
    assert.equal(memory.graph({ chat: 'one', limit: 1 }).truncated, true);
    assert.deepEqual(memory.graph({ chat: '' }).nodes.map((node) => node.id), [shared.id]);
    memory.archive(parent.id, 'one');
    assert.equal(memory.graph({ chat: 'one' }).nodes.find((node) => node.id === child.id).parent, null);
  } finally {
    memory.db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
