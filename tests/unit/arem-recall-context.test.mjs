import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AremAgentMemory } from '../../server/arem/arem-agent-memory.js';
import { buildWorkspacePrompt } from '../../server/services/workspacePrompt.js';

test('stored AREM notes are retrieved by relevance and scoped before prompt inclusion', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'arem-recall-'));
  const memory = new AremAgentMemory(path.join(dir, 'nodes.sqlite'));
  try {
    const own = memory.save({ chat: 'alpha', title: 'Compiler optimization', note: 'Enable the vectorizer for matrix kernels', evidence: 'build-1' });
    memory.save({ chat: 'beta', title: 'Compiler optimization', note: 'Other chat secret optimizer', evidence: 'build-2' });
    const found = memory.search({ chat: 'alpha', query: 'compiler vectorizer matrix', limit: 4 });
    assert.deepEqual(found.map(({ id }) => id), [own.id]);
    const aremContext = JSON.stringify({ agentNotes: found.map(({ id, scope, title, note, evidence }) => ({ id, scope, title, note, evidence })) }).replaceAll('<', '\\u003c');
    const prompt = buildWorkspacePrompt({ persona: '', access: '', conversation: '', creation: '', aremContext });
    assert.match(prompt, /Enable the vectorizer for matrix kernels/);
    assert.doesNotMatch(prompt, /Other chat secret optimizer/);
  } finally {
    memory.db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
