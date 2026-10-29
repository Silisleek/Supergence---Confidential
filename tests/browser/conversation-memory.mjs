// A scripted OpenAI-compatible transport exercises the real app, persistence,
// fallback, tools and UI. Fixture output is not a test of model intelligence.
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright-core';

const baseURL = process.env.SIS_BASE_URL;
if (!baseURL) throw new Error('Set SIS_BASE_URL to the actual app URL.');
const marker = randomUUID();
const root = `projects/memory-qa-${marker}`;
const task = `Build a full multi-file browser keyboard-counter project in ${root}. Use separate modules and a regression test, not only a single HTML file. Keep the project marker ${marker}.`;
const note = `Remember that the keyboard control for my ${marker} project is ArrowUp.`;
const offer =
  'I can create the requested project with separate modules and tests. Shall I create it?';
const files = [
  { filepath: `${root}/logic.mjs`, content: 'export const advance = value => value + 1;' },
  {
    filepath: `${root}/logic.test.mjs`,
    content:
      "import test from 'node:test';import assert from 'node:assert/strict';import {advance} from './logic.mjs';test('advance supports zero and negative values',()=>{assert.equal(advance(0),1);assert.equal(advance(-2),-1)});",
  },
  {
    filepath: `${root}/index.html`,
    content:
      '<!doctype html><title>Keyboard counter</title><h1>Keyboard counter</h1><output id="counter">0</output><script type="module">import {advance} from "./logic.mjs";addEventListener("keydown",e=>{if(e.key==="ArrowUp")document.querySelector("#counter").textContent=advance(Number(document.querySelector("#counter").textContent));});</script>',
  },
];
const fixtureFailures = [];
let fixtureRequests = 0,
  contextualFallbacks = 0,
  userMemoryObserved = false;
const fixture = http.createServer(async (req, res) => {
  try {
    if (req.url === '/v1/models') {
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ data: [{ id: 'memory-fixture' }] }));
    }
    let body = '';
    for await (const chunk of req) body += chunk;
    const input = JSON.parse(body || '{}');
    fixtureRequests++;
    const messages = input.messages || [],
      latestUser = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
    let message = { role: 'assistant', content: 'Fixture request received.' };
    if (messages.some((m) => m.role === 'system' && m.content.includes('completion reviewer'))) {
      message = {
        role: 'assistant',
        content: JSON.stringify({
          status: 'complete',
          remaining: [],
          reason: 'All requested files and regression tests verified.',
        }),
      };
    } else if (latestUser === task)
      message.content = offer; // Initial missing-action failure must persist.
    else if (latestUser === 'Yes') {
      assert.ok(
        messages.some((m) => m.role === 'user' && m.content === task),
        'Yes must carry the real original task.',
      );
      assert.ok(
        messages.some((m) => m.role === 'assistant' && m.content.includes(offer)),
        'The failed proposal must remain in memory.',
      );
      const results = messages.filter((m) => m.role === 'tool');
      if (!results.length && input.stream) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(
          JSON.stringify({
            error: { message: 'Intentional fixture SSE failure', type: 'fixture' },
          }),
        );
      }
      if (!results.length) contextualFallbacks++;
      const written = results.filter((m) => m.name === 'write_file').length;
      const commandResult = results.find((m) => m.name === 'run_command');
      if (written < files.length)
        message = {
          role: 'assistant',
          content: `I am writing project file ${written + 1}.`,
          tool_calls: [
            {
              id: `call_${written}`,
              type: 'function',
              function: { name: 'write_file', arguments: JSON.stringify(files[written]) },
            },
          ],
        };
      else if (!commandResult)
        message = {
          role: 'assistant',
          content: 'I am running the project regression test.',
          tool_calls: [
            {
              id: 'call_test',
              type: 'function',
              function: {
                name: 'run_command',
                arguments: JSON.stringify({ command: `node --test ${root}/logic.test.mjs` }),
              },
            },
          ],
        };
      else {
        const observed = JSON.parse(commandResult.content);
        assert.equal(observed.exitCode, 0, 'The real project test must pass.');
        message.content = `The three project files were saved and the regression test passed. Open [Keyboard counter](/workspace/${root}/index.html).`;
      }
    } else if (latestUser === note)
      message.content = 'Your requested note is retained in Learning Library.';
    else if (
      latestUser.includes('Which keyboard control did I ask you to remember') &&
      messages.some((m) => m.role === 'system' && m.content.includes('<live_runtime_contract>'))
    ) {
      userMemoryObserved = messages.some((m) => m.role === 'system' && m.content.includes(note));
      assert.ok(userMemoryObserved, 'A new conversation must receive the persisted user note.');
      message.content = 'You asked to use ArrowUp for that project.';
    }
    if (input.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      const delta = {
        content: message.content,
        ...(message.tool_calls
          ? { tool_calls: message.tool_calls.map((call, index) => ({ ...call, index })) }
          : {}),
      };
      res.end(
        `data: ${JSON.stringify({ choices: [{ delta, finish_reason: null }] })}\n\ndata: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: message.tool_calls ? 'tool_calls' : 'stop' }] })}\n\ndata: [DONE]\n\n`,
      );
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          choices: [{ message, finish_reason: message.tool_calls ? 'tool_calls' : 'stop' }],
        }),
      );
    }
  } catch (error) {
    fixtureFailures.push(error.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: error.message } }));
  }
});
await new Promise((resolve) => fixture.listen(0, '127.0.0.1', resolve));
const output = path.resolve('test-results/conversation-memory');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
let token, original, originalAccess, currentConversation, noteSource;
const conversations = [];
async function config(patch) {
  const result = await page.request.patch(`${baseURL}/api/evolution/settings`, {
    data: patch,
    headers: { 'x-evolution-token': token },
  });
  assert.equal(result.ok(), true, await result.text());
}
async function submit(query) {
  await page.locator('#workspaceInp').fill(query);
  const done = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/sis/unified-turn-stream') &&
      response.request().method() === 'POST',
    { timeout: 180000 },
  );
  await page.locator('#workspaceSendBtn').click();
  await (await done).finished();
  await page.waitForFunction(() => document.body.dataset.agentWorking !== 'true', null, {
    timeout: 180000,
  });
}
try {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__sisWorkspaceReady);
  const state = await (await page.request.get(`${baseURL}/api/evolution`)).json();
  token = state.uiToken;
  original = state.settings.provider;
  assert.equal(
    original.hasKey,
    false,
    'Do not replace an existing saved provider secret. Use an isolated test backend instead.',
  );
  originalAccess = (await (await page.request.get(`${baseURL}/api/access`)).json()).settings;
  await page.request.patch(`${baseURL}/api/access`, { data: { mode: 'full-access' } });
  await config({
    provider: {
      enabled: true,
      baseURL: `http://127.0.0.1:${fixture.address().port}/v1`,
      model: 'memory-fixture',
      apiKey: 'local-protocol-fixture',
    },
  });
  await page.locator('#shellNewConversation').click();
  currentConversation = await page.evaluate(() => window.__activeWorkspaceConvId);
  conversations.push(currentConversation);
  await submit(task);
  await page.locator('.chat-stream-notice').filter({ hasText: 'valid tool action' }).waitFor();
  const failed = await (
    await page.request.get(`${baseURL}/api/conversations/${currentConversation}`)
  ).json();
  assert.equal(failed.messages[0].content, task);
  assert.equal(failed.messages[1].status, 'error');
  assert.match(failed.messages[1].content, /Shall I create it/);
  await page.reload();
  await page.waitForFunction(() => window.__sisWorkspaceReady);
  await page.locator('.chat-stream-notice').filter({ hasText: 'valid tool action' }).waitFor();
  await submit('Yes');
  await page
    .locator('.chat-turn-item')
    .last()
    .getByText('The three project files were saved and the regression test passed.')
    .waitFor();
  const saved = await (
    await page.request.get(`${baseURL}/api/conversations/${currentConversation}`)
  ).json();
  assert.equal(saved.messages.filter((m) => m.role === 'user').length, 2);
  assert.equal(saved.messages.at(-1).status, 'completed');
  assert.equal(saved.messages.at(-1).toolCalls.filter((t) => t.tool === 'write_file').length, 3);
  assert.equal(
    saved.messages.at(-1).toolCalls.find((t) => t.tool === 'run_command').output.exitCode,
    0,
  );
  for (const file of files)
    assert.equal(await fs.readFile(path.resolve('workspace', file.filepath), 'utf8'), file.content);
  assert.ok(contextualFallbacks > 0);
  const htmlArtifact = saved.messages
    .at(-1)
    .artifacts.find((artifact) => artifact.url?.endsWith('/index.html'));
  assert.equal(htmlArtifact.url, `/workspace/${root}/index.html`);
  const embedded = page
    .locator(`iframe.chat-artifact-preview[src$="/workspace/${root}/index.html"]`)
    .first()
    .contentFrame();
  await embedded.locator('#counter').waitFor();
  const project = await browser.newPage();
  await project.goto(`${baseURL}/workspace/${root}/index.html`);
  await project.keyboard.press('ArrowUp');
  await project.waitForFunction(() => document.querySelector('#counter').textContent === '1');
  await project.close();
  await page.screenshot({ path: path.join(output, 'failed-request-then-yes.png'), fullPage: true });
  await submit(note);
  const sources = await (await page.request.get(`${baseURL}/api/learning/library`)).json();
  noteSource = sources.sources.find(
    (s) => s.sourceType === 'user-memory' && s.title.includes(marker),
  )?.id;
  assert.ok(noteSource);
  await page.locator('#shellNewConversation').click();
  conversations.push(await page.evaluate(() => window.__activeWorkspaceConvId));
  await submit(`Which keyboard control did I ask you to remember for ${marker}?`);
  assert.ok(userMemoryObserved);
  await page
    .locator('.chat-turn-item')
    .last()
    .getByText('You asked to use ArrowUp for that project.')
    .waitFor();
  await page.locator('#railLearning').click();
  await page.getByRole('button', { name: 'Conversation memory', exact: true }).click();
  await page
    .locator('[data-learning-view="conversation"]')
    .getByText('Persistent notes', { exact: true })
    .waitFor();
  await page.screenshot({ path: path.join(output, 'inspectable-memory.png'), fullPage: true });
  assert.deepEqual(errors, []);
  assert.deepEqual(fixtureFailures, []);
  await fs.writeFile(
    path.join(output, 'results.json'),
    JSON.stringify(
      {
        fixture:
          'Scripted model transport; real app, tools, disk, project test and Chrome interaction',
        checks: [
          'failed action persists before completion',
          'reload preserves failed request and proposal',
          'Yes executes three actual file writes using retained task context',
          'stream transport fallback retains identical context and tools',
          'real Node regression test passes',
          'built project responds to keyboard input in Chrome',
          'explicit note recalled in a different conversation',
          'saved context inspectable in Learning Library',
        ],
        fixtureRequests,
        errors,
      },
      null,
      2,
    ),
  );
  console.log('Passed 8 conversation memory and action recovery browser checks.');
} finally {
  if (originalAccess) await page.request.patch(`${baseURL}/api/access`, { data: originalAccess }).catch(() => {});
  if (original && token && !original.hasKey)
    await config({
      provider: {
        enabled: original.enabled,
        baseURL: original.baseURL,
        model: original.model,
        apiKey: '',
      },
    });
  if (noteSource) await page.request.delete(`${baseURL}/api/learning/sources/${noteSource}`);
  for (const id of conversations) await page.request.delete(`${baseURL}/api/conversations/${id}`);
  const projectDirectory = path.resolve('workspace', root);
  assert.ok(projectDirectory.startsWith(path.resolve('workspace/projects') + path.sep));
  await fs.rm(projectDirectory, { recursive: true, force: true });
  await browser.close();
  await new Promise((resolve) => fixture.close(resolve));
}
