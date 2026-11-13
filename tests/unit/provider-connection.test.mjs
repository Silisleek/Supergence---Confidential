import test from 'node:test';
import assert from 'node:assert/strict';
import { checkProviderConnection } from '../../server/services/providerConnection.js';

test('connection check requires the model to return the fresh nonce in a native tool call', async () => {
  const result = await checkProviderConnection(async ({ messages, tools, toolChoice }) => {
    const nonce = messages[0].content.match(/nonce ([a-f0-9]{32})/)[1];
    assert.equal(toolChoice.function.name, tools[0].function.name);
    return {
      choices: [
        {
          message: {
            tool_calls: [
              {
                function: {
                  name: 'confirm_connection',
                  arguments: JSON.stringify({ nonce }),
                },
              },
            ],
          },
        },
      ],
    };
  });
  assert.equal(result.toolCalling, true);
  assert.ok(result.durationMs >= 0);
});

test('a prose response or wrong nonce cannot pass the connection check', async () => {
  for (const message of [
    { content: 'Connected!' },
    {
      tool_calls: [
        {
          function: {
            name: 'confirm_connection',
            arguments: '{"nonce":"wrong"}',
          },
        },
      ],
    },
  ])
    await assert.rejects(
      checkProviderConnection(async () => ({ choices: [{ message }] })),
      /required tool call/,
    );
});
