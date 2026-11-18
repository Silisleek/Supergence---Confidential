import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AremAgentMemory } from '../../server/arem/arem-agent-memory.js';

test('AREM links are scoped, durable, retrievable, and removed on archive', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'arem-links-'));
  const filename = path.join(dir, 'nodes.sqlite');
  let memory = new AremAgentMemory(filename);
  try {
    const create = (chat, scope, title, note) => memory.save({ chat, scope, title, note, evidence: 'test source' });
    const a = create('a', 'chat', 'Compiler', 'Build the compiler with clang');
    const b = create('a', 'chat', 'Benchmarks', 'The throughput results were recorded');
    const shared = create('', 'permanent', 'Shared method', 'Use reproducible benchmarks');
    const foreign = create('b', 'chat', 'Private', 'Other chat');
    const link = (source, target, relation = 'related') => memory.link({ source, target, relation, evidence: 'test observation', chat: 'a' });
    link(a.id, b.id);
    link(b.id, a.id);
    link(a.id, shared.id, 'supports');
    assert.equal(memory.connections({ id: a.id, chat: 'a' }).length, 2);
    assert.throws(() => link(a.id, foreign.id), /available/);
    assert.throws(() => link(a.id, a.id), /itself/);
    assert.throws(() => memory.link({ source: a.id, target: b.id, chat: 'a', evidence: 'password: secret' }), /credentials/);
    assert.equal(memory.graph({ chat: 'b' }).links.length, 0);
    assert.equal(memory.graph({ chat: '' }).links.length, 0);
    const matches = memory.search({ chat: 'a', query: 'compiler clang', limit: 1 });
    const linked = memory.linkedContext({ nodes: matches, chat: 'a', limit: 4 });
    assert.deepEqual(new Set(linked.map(({ node }) => node.id)), new Set([b.id, shared.id]));
    assert.equal(linked[0].link.evidence, 'test observation');
    memory.db.close();
    memory = new AremAgentMemory(filename);
    assert.equal(memory.graph({ chat: 'a' }).links.length, 2);
    assert.equal(memory.unlink({ source: b.id, target: a.id, relation: 'related', chat: 'a' }).removed, true);
    assert.equal(memory.connections({ id: a.id, chat: 'a' }).length, 1);
    memory.archive(shared.id, 'a');
    assert.equal(memory.graph({ chat: 'a' }).links.length, 0);
  } finally {
    memory.db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
