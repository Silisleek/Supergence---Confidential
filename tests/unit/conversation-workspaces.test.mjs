import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import workspace from '../../server/workspace/manager.js';
import { runtimeAccess } from '../../server/services/runtimeAccess.js';
import {
  ConversationWorkspaces,
  containedPath,
  selectWorkspaceProject,
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

test('new agent work is grouped by project and follow-up turns reopen it', async (t) => {
  const { directory, service, baseRoot } = fixture(t);
  const turn = (requestId, query, work, storage = service) =>
    storage.run({ baseRoot, conversationId: 'project-chat', requestId }, async () => {
      selectWorkspaceProject(query);
      return work();
    });
  const { root } = service.ensure(baseRoot, 'project-chat');
  fs.writeFileSync(path.join(root, 'legacy.txt'), 'prior artifact');
  await turn('hello', 'Hello', () => assert.equal(fs.existsSync(workspace.root), false));
  assert.equal(fs.existsSync(path.join(root, 'projects')), false);

  let first;
  await turn('first', 'Build a notebook app', async () => {
    const file = workspace.createFile('index.html', '<main>Notebook</main>');
    first = workspace.root;
    assert.match(file.path, /^projects\/notebook-app-[0-9a-f]+\/index\.html$/);
    assert.match(file.url, /\/workspace\/chats\/project-chat\/projects\/.+\/index\.html$/);
    workspace.createFolder('assets');
    const result = await workspace.runCommand(
      `"${process.execPath}" -e "require('fs').writeFileSync('assets/result.txt','ready')"`,
    );
    assert.equal(result.exitCode, 0);
    assert.equal(workspace.readFile('assets/result.txt').content, 'ready');
    assert.equal(workspace.readFile('legacy.txt').content, 'prior artifact');
  });
  service.close();
  const reopened = new ConversationWorkspaces({ directory: path.join(directory, 'data') });
  t.after(() => reopened.close());
  await turn(
    'follow-up',
    'Add an export button',
    () => {
      assert.equal(workspace.root, first);
      assert.equal(workspace.readFile('index.html').content, '<main>Notebook</main>');
      workspace.createFile('projects/side-demo/index.html', '<main>Side project</main>');
    },
    reopened,
  );
  await turn(
    'second',
    'Create another app for recipes',
    () => {
      assert.notEqual(workspace.root, first);
      workspace.createFile('index.html', '<main>Recipes</main>');
      assert.equal(
        workspace.readFile('projects/side-demo/index.html').content,
        '<main>Side project</main>',
      );
    },
    reopened,
  );
  assert.equal(fs.readFileSync(path.join(first, 'index.html'), 'utf8'), '<main>Notebook</main>');
  assert.equal(fs.existsSync(path.join(root, 'index.html')), false);
  assert.equal(fs.existsSync(path.join(baseRoot, 'projects', 'side-demo')), false);
});

test('revocation stops a running workspace process before it can write a delayed result', async (t) => {
  const { service, baseRoot } = fixture(t);
  const controller = new AbortController();
  await service.run({ baseRoot, conversationId: 'cancel-process', requestId: 'r' }, async () => {
    const record = service.ensure(baseRoot, 'cancel-process');
    const command = `"${process.execPath}" -e "console.log('READY');setTimeout(()=>require('fs').writeFileSync('must-not-exist.txt','late'),10000)"`;
    const ready = new Promise((resolve) => {
      const listener = (event) => {
        if (event.kind === 'command-output' && event.text.includes('READY')) {
          record.listeners.delete(listener);
          resolve();
        }
      };
      record.listeners.add(listener);
    });
    const pending = runtimeAccess.run({ signal: controller.signal }, () =>
      workspace.runCommand(command),
    );
    await Promise.race([
      ready,
      new Promise((_, reject) => {
        const timer = setTimeout(() => reject(new Error('Command never became ready.')), 5000);
        timer.unref();
      }),
    ]);
    controller.abort(new Error('Signed out.'));
    const result = await pending;
    assert.equal(result.cancelled, true);
    assert.match(result.error, /Signed out/);
    assert.equal(fs.existsSync(path.join(record.root, 'must-not-exist.txt')), false);
  });
});
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

test('a delegated agent shares the initiating project workspace without changing project', async (t) => {
  const { service, baseRoot } = fixture(t);
  let projectDirectory;
  let projectRoot;
  await service.run({ baseRoot, conversationId: 'shared-project', requestId: 'main-turn' }, async () => {
    selectWorkspaceProject('Build a notebook app');
    workspace.createFile('index.html', 'original');
    projectRoot = workspace.root;
    projectDirectory = path.relative(service.ensure(baseRoot, 'shared-project').root, projectRoot).replaceAll('\\', '/');
    await service.run({ baseRoot, conversationId: 'shared-project', requestId: 'delegated-turn', lockedProjectDirectory: projectDirectory }, async () => {
      selectWorkspaceProject('Create another project for testing');
      assert.equal(workspace.root, projectRoot);
      workspace.createFile('review.txt', 'agent work');
    });
    assert.equal(workspace.readFile('review.txt').content, 'agent work');
  });
  assert.equal(fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8'), 'original');
  assert.equal(service.ensure(baseRoot, 'shared-project').activeProject, projectDirectory);
});
