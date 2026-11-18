import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

test('native AREM create generates a retrievable ID without accepting invented IDs', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'arem-native-'));
  const script = `
    import assert from 'node:assert/strict';
    import registry from './server/tools/registry.js';
    import {runtimeAccess} from './server/services/runtimeAccess.js';
    import {aremAgentMemory} from './server/arem/arem-agent-memory.js';
    const schema = registry.getToolDefinitions().find(x => x.function.name === 'create_arem_memory').function.parameters;
    assert.equal(schema.properties.id, undefined);
    const result = await runtimeAccess.run({conversationId:'first-chat'}, () => registry.get('create_arem_memory').execute({id:'invented', scope:'chat', title:'Palette', note:'Use deep dark panels', evidence:'user instruction'}));
    assert.notEqual(result.node.id, 'invented');
    assert.equal(aremAgentMemory.search({chat:'first-chat',query:'deep dark panels'})[0].id, result.node.id);
    assert.equal(aremAgentMemory.read(result.node.id, 'other-chat'), null);
    const shared = await runtimeAccess.run({conversationId:'first-chat'}, () => registry.get('create_arem_memory').execute({scope:'permanent', title:'Shared note', note:'A'.repeat(2500), evidence:'user instruction'}));
    const read = await runtimeAccess.run({conversationId:'first-chat'}, () => registry.get('read_arem_memory').execute({id:shared.node.id}));
    assert.equal(read.node.note.length, 2500);
    const search = await runtimeAccess.run({conversationId:'first-chat'}, () => registry.get('search_arem_memory').execute({query:'Shared note'}));
    const preview = search.nodes.find(n => n.id === shared.node.id);
    assert.equal(preview.previewTruncated, true);
    assert.equal(preview.noteLength, 2500);
    assert.equal(preview.notePreview.length, 500);
    const edited = await runtimeAccess.run({conversationId:'first-chat'}, () => registry.get('store_arem_memory').execute({id:shared.node.id, title:'Shared note', note:'A'.repeat(2500) + ' finished', evidence:'user instruction'}));
    assert.equal(edited.node.note.length, 2509);
    const linked = await runtimeAccess.run({conversationId:'first-chat'}, () => registry.get('link_arem_memory').execute({source:result.node.id, target:shared.node.id, relation:'related', evidence:'user instruction'}));
    assert.ok(linked.link.source);
    const connections = await runtimeAccess.run({conversationId:'first-chat'}, () => registry.get('read_arem_connections').execute({id:shared.node.id}));
    assert.equal(connections.links.length, 1);
    const other = await runtimeAccess.run({conversationId:'other-chat'}, () => registry.get('read_arem_connections').execute({id:shared.node.id}));
    assert.equal(other.links.length, 0);
    aremAgentMemory.db.close();
    process.exit(0);
  `;
  try {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: process.cwd(), timeout: 90000, encoding: 'utf8', windowsHide: true,
      env: { ...process.env, SIS_DATA_DIR: directory, SIS_WORKSPACE_DIR: path.join(directory, 'workspace') },
    });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
