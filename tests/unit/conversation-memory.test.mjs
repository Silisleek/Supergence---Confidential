import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import conversations from '../../server/conversations.js';
import { ConversationTurns } from '../../server/services/conversationTurns.js';
import {
  mergeConversationHistory,
  resolveConversationIntent,
  conversationMessages,
} from '../../server/services/conversationContext.js';
import { contextualInference } from '../../server/services/contextualInference.js';
import { extractToolCall, nativeToolChoice } from '../../server/services/assistantStream.js';
import { LearningLibrary } from '../../server/services/learningLibrary.js';

test('project resumes use actual action outcomes rather than replaying unfinished planning', () => {
  const history = [
    {
      role: 'user',
      content: 'Build the city with both walkable bridges and an embedded-texture GLB.',
    },
    {
      role: 'assistant',
      status: 'error',
      content: 'I will inspect the packages again. '.repeat(1000),
      error: 'Step budget reached',
      toolCalls: [
        {
          tool: 'write_file',
          status: 'RESOLVED',
          args: { filepath: 'city/engine.js' },
          output: { success: true },
        },
        {
          tool: 'run_command',
          status: 'RESOLVED',
          output: { exitCode: 1, error: 'Missing main.js' },
        },
      ],
    },
  ];
  const messages = conversationMessages(history, 'continue', { projectExecution: true });
  const text = JSON.stringify(messages);
  assert.match(text, /both walkable bridges/);
  assert.match(text, /city\/engine.js/);
  assert.match(text, /Missing main.js/);
  assert.doesNotMatch(text, /inspect the packages again/);
  assert.match(history[1].content, /inspect the packages again/);
  history.push({
    role: 'assistant',
    status: 'error',
    content: 'Rejected proposal: run_command dir /b /s src tools',
    error: 'Wrong requested function',
    toolCalls: [],
  });
  const resumed = JSON.stringify(
    conversationMessages(history, 'continue', { projectExecution: true }),
  );
  assert.doesNotMatch(resumed, /dir \/b \/s/);
  assert.match(resumed, /Wrong requested function/);
  assert.match(history[2].content, /dir \/b \/s/);
});

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sis-chat-memory-'));
  conversations.setStorageDir(path.join(directory, 'conversations'));
  t.after(() => {
    assert.ok(path.resolve(directory).startsWith(path.join(os.tmpdir(), 'sis-chat-memory-')));
    fs.rmSync(directory, { recursive: true, force: true });
  });
  return { directory, turns: new ConversationTurns(conversations) };
}
test('a failed build request and the actual unfinished proposal survive restart and Yes retains their meaning', async (t) => {
  const { turns } = fixture(t);
  const task = 'Build a browser 3D city game as a full project, not only a single HTML file.';
  const proposal =
    'I can stage a multi-file project with modules and a browser test. Shall I propose it?';
  await assert.rejects(
    turns.run(
      { conversationId: 'failed-build', requestId: 'build-1', query: task },
      {},
      async (_params, emitter) => {
        assert.equal(conversations.get('failed-build').messages[0].content, task);
        emitter.onStreamToken(proposal, proposal);
        throw new Error('Provider did not return the requested tool action.');
      },
    ),
    /requested tool/,
  );
  const saved = conversations.get('failed-build');
  assert.equal(saved.messages.length, 2);
  assert.equal(saved.messages[1].status, 'error');
  assert.equal(saved.messages[1].content, proposal);
  const restarted = new ConversationTurns(conversations);
  const result = await restarted.run(
    { conversationId: 'failed-build', requestId: 'build-2', query: 'Yes', history: [] },
    {},
    async (params) => {
      const intent = resolveConversationIntent(params.query, params.history);
      assert.equal(intent.effectiveQuery, task);
      assert.equal(intent.pendingOffer, proposal);
      assert.equal(nativeToolChoice(intent.effectiveQuery, new Set(['write_file'])), 'required');
      return { response: 'A real result will be supplied by the execution test.', toolCalls: [] };
    },
  );
  assert.equal(result.memory.priorMessages, 2);
  assert.equal(conversations.get('failed-build').messages.length, 4);
});
test('same request replay never repeats actions and per-chat concurrency cannot reorder memory', async (t) => {
  const { turns } = fixture(t);
  let release,
    executions = 0;
  const execute = async () => {
    executions++;
    await new Promise((resolve) => (release = resolve));
    return { response: 'Completed once', toolCalls: [{ tool: 'write_file', status: 'RESOLVED' }] };
  };
  const params = {
    conversationId: 'one-chat',
    requestId: 'one-request',
    query: 'Create the file.',
  };
  const pending = turns.run(params, {}, execute);
  const duplicate = turns.run(params, {}, execute);
  await assert.rejects(
    turns.run({ ...params, requestId: 'other-request' }, {}, execute),
    /still working/,
  );
  await assert.rejects(
    turns.run({ ...params, query: 'Different request' }, {}, execute),
    /different message/,
  );
  release();
  await pending;
  await duplicate;
  const replayed = await new ConversationTurns(conversations).run(params, {}, execute);
  assert.equal(replayed.replayed, true);
  assert.equal(executions, 1);
  assert.equal(conversations.get('one-chat').messages.length, 2);
});
test('memory preserves the original task beyond three turns and stale client tails do not erase it', () => {
  const first = {
    role: 'user',
    content: 'Build a multi-file project with keyboard controls and collision detection.',
  };
  const history = [
    first,
    ...Array.from({ length: 18 }, (_, i) => ({
      role: i % 2 ? 'user' : 'assistant',
      content: `Recorded conversation item ${i}`,
    })),
  ];
  const merged = mergeConversationHistory(history, history.slice(-3));
  assert.equal(merged.length, history.length);
  const messages = conversationMessages(merged, 'Continue');
  assert.equal(messages[0].content, first.content);
  assert.equal(messages.at(-1).content, 'Continue');
  assert.ok(messages.length > 3);
  assert.equal(resolveConversationIntent('Yes', []).continuation, false);
  assert.equal(nativeToolChoice('Build an example, but do not use tools.', new Set()), 'auto');
});
test('stream failures use the exact same memory and tool definitions on fallback', async () => {
  const options = {
    systemPrompt: 'Actual runtime contract',
    messages: [
      { role: 'user', content: 'Remember the multi-file requirement.' },
      { role: 'assistant', content: 'Shall I build it?' },
      { role: 'user', content: 'Yes' },
    ],
    tools: [{ type: 'function', function: { name: 'write_file' } }],
    toolChoice: 'required',
  };
  const response = await contextualInference(options, {
    stream: async () => {
      throw new Error('SSE transport failed');
    },
    complete: async (received) => {
      assert.deepEqual(received.messages, options.messages);
      assert.deepEqual(received.tools, options.tools);
      return {
        choices: [
          {
            message: {
              content: 'I am writing the actual module.',
              tool_calls: [
                {
                  function: {
                    name: 'write_file',
                    arguments: JSON.stringify({
                      path: 'game/player.js',
                      content: 'export const speed=2;',
                    }),
                  },
                },
              ],
            },
          },
        ],
      };
    },
  });
  assert.equal(JSON.parse(extractToolCall(response)).tool, 'write_file');
});
test('a text-only response to an action is repaired into an actual tool call before dispatch', async () => {
  let attempts = 0;
  const response = await contextualInference(
    {
      systemPrompt: 'Runtime',
      messages: [{ role: 'user', content: 'Build the project now.' }],
      tools: [{ type: 'function', function: { name: 'write_file' } }],
      toolChoice: 'required',
    },
    {
      stream: async (_options, emit) => {
        emit('Shall I create it?');
        return { text: 'Shall I create it?' };
      },
      complete: async (options) => {
        attempts++;
        assert.match(options.systemPrompt, /tool_action_repair/);
        assert.equal(options.messages[0].content, 'Build the project now.');
        return {
          choices: [
            {
              message: {
                content: 'I am creating the requested project.',
                tool_calls: [
                  {
                    function: {
                      name: 'write_file',
                      arguments: '{"path":"project/main.js","content":"export {};"}',
                    },
                  },
                ],
              },
            },
          ],
        };
      },
    },
  );
  assert.equal(attempts, 1);
  assert.ok(extractToolCall(response));
});
test('unrepairable provider output remains a failure with its real proposal preserved', async () => {
  await assert.rejects(
    contextualInference(
      { messages: [{ role: 'user', content: 'Build it.' }], tools: [], toolChoice: 'required' },
      {
        stream: async () => ({ text: 'I can create a project. Shall I proceed?' }),
        complete: async () => ({ choices: [{ message: { content: 'I can create it later.' } }] }),
      },
    ),
    (error) =>
      /valid tool action/.test(error.message) && error.partialResponse.includes('Shall I proceed?'),
  );
  assert.equal(
    extractToolCall('{"tool":"write_file","args":{"content":"braces } inside a string"}}') != null,
    true,
  );
  assert.equal(extractToolCall('{"tool":"write_file","args":'), null);
});
test('explicit personal notes persist across chats and forgetting removes them from active memory', (t) => {
  const { directory } = fixture(t);
  const options = { directory: path.join(directory, 'library') };
  const library = new LearningLibrary(options);
  assert.equal(library.rememberUserMessage('Do you remember my preference?', 'chat-a'), null);
  const remembered = library.rememberUserMessage(
    'Remember that I want multi-file projects and keyboard controls.',
    'chat-a',
  );
  const restarted = new LearningLibrary(options);
  assert.match(restarted.userMemoryContext(), /keyboard controls/);
  restarted.remove(remembered.source.id);
  assert.equal(restarted.userMemoryContext(), '');
});
test('conversation filenames reject traversal and damaged storage is never overwritten', (t) => {
  const { directory } = fixture(t);
  assert.throws(() => conversations.get('../outside'), /Invalid/);
  const file = path.join(directory, 'conversations', 'damaged.json');
  fs.writeFileSync(file, '{unfinished');
  assert.throws(() =>
    conversations.update('damaged', [{ role: 'user', content: 'Keep the old record.' }]),
  );
  assert.equal(fs.readFileSync(file, 'utf8'), '{unfinished');
});
