import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import workspace from '../../server/workspace/manager.js';
import {
  ConversationWorkspaces,
  containedPath,
} from '../../server/services/conversationWorkspaces.js';

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'supergence-chat-workspaces-'));
  const previous = workspace.baseRoot;
  workspace.setWorkspaceDir(path.join(directory, 'workspace'));
  const service = new ConversationWorkspaces({ directory: path.join(directory, 'data') });
  t.after(() => {
    service.close();
    workspace.setWorkspaceDir(previous);
    fs.rmSync(directory, { recursive: true, force: true });
  });
  return { directory, service, baseRoot: workspace.baseRoot };
}
test('concurrent chats use separate real directories for relative files and commands', async (t) => {
  const { service, baseRoot } = fixture(t);
  await Promise.all(
    ['chat-a', 'chat-b'].map((conversationId) =>
      service.run({ baseRoot, conversationId, requestId: 'r' }, async () => {
        workspace.createFile('same.txt', conversationId);
        const result = await workspace.runCommand(
          `"${process.execPath}" -e "require('fs').writeFileSync('command.txt',process.cwd());console.log('done')"`,
        );
        assert.equal(result.exitCode, 0);
        assert.equal(workspace.readFile('same.txt').content, conversationId);
        assert.equal(
          fs.readFileSync(path.join(workspace.root, 'command.txt'), 'utf8'),
          workspace.root,
        );
        assert.match(
          workspace.urlFor('same.txt'),
          new RegExp(`/workspace/chats/${conversationId}/same.txt$`),
        );
      }),
    ),
  );
  assert.equal(workspace.root, baseRoot);
  assert.notEqual(
    fs.readFileSync(path.join(baseRoot, 'chats/chat-a/command.txt'), 'utf8'),
    fs.readFileSync(path.join(baseRoot, 'chats/chat-b/command.txt'), 'utf8'),
  );
  assert.ok(!fs.existsSync(path.join(baseRoot, 'same.txt')));
});
test('stdout and command-created files are observable before the command exits', async (t) => {
  const { service, baseRoot } = fixture(t);
  const record = service.ensure(baseRoot, 'live');
  let complete = false,
    outputResolve,
    fileResolve;
  const output = new Promise((resolve) => {
      outputResolve = resolve;
    }),
    file = new Promise((resolve) => {
      fileResolve = resolve;
    });
  record.listeners.add((event) => {
    if (event.kind === 'command-output' && event.text.includes('FIRST')) outputResolve(event);
    if (event.kind === 'file-change' && event.path === 'out/result.txt') fileResolve(event);
  });
  const pending = service.run(
    { baseRoot, conversationId: 'live', requestId: 'live-r' },
    async () => {
      const result = await workspace.runCommand(
        `"${process.execPath}" -e "const fs=require('fs');fs.mkdirSync('out',{recursive:true});fs.writeFileSync('out/result.txt','actual file');console.log('FIRST');setTimeout(()=>console.log('SECOND'),1500)"`,
      );
      complete = true;
      return result;
    },
  );
  const first = await output;
  assert.equal(complete, false);
  assert.equal(first.conversationId, 'live');
  const changed = await Promise.race([
    file,
    new Promise((_, reject) => {
      const timer = setTimeout(() => reject(new Error('No real filesystem event')), 5000);
      timer.unref();
    }),
  ]);
  assert.equal(changed.exists, true);
  assert.equal(complete, false);
  const result = await pending;
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /FIRST[\s\S]*SECOND/);
  assert.deepEqual(
    record.events.filter((e) => e.kind === 'command-end').map((e) => e.exitCode),
    [0],
  );
});
test('workspace history survives restart and viewer paths reject traversal and directory links', async (t) => {
  const { service, baseRoot, directory } = fixture(t);
  await service.run({ baseRoot, conversationId: 'persisted', requestId: 'r' }, async () => {
    workspace.createFile('a file.txt', 'literal /workspace/a%20file.txt');
    const qualified = workspace.qualifyUrls({
      url: '/workspace/a%20file.txt',
      content: 'literal /workspace/a%20file.txt',
      response: '[file](/workspace/a%20file.txt)',
    });
    assert.equal(qualified.url, '/workspace/chats/persisted/a%20file.txt');
    assert.equal(qualified.content, 'literal /workspace/a%20file.txt');
    assert.match(qualified.response, /chats\/persisted/);
    service.publish({ kind: 'command-end', commandId: 'saved', exitCode: 0, durationMs: 3 });
  });
  service.close();
  const reopened = new ConversationWorkspaces({ directory: path.join(directory, 'data') });
  t.after(() => reopened.close());
  const record = reopened.ensure(baseRoot, 'persisted');
  assert.ok(record.events.some((e) => e.commandId === 'saved'));
  assert.throws(() => containedPath(record.root, '../other-chat'), /outside/);
  fs.symlinkSync(directory, path.join(record.root, 'outside'), 'junction');
  assert.throws(() => containedPath(record.root, 'outside/anything'), /Linked/);
  assert.equal(reopened.list(record).entries.find((e) => e.name === 'outside').type, 'link');
  assert.throws(() => reopened.ensure(baseRoot, '../invalid'), /Invalid/);
});
