import { randomBytes } from 'node:crypto';

export async function checkProviderConnection(complete) {
  const nonce = randomBytes(16).toString('hex');
  const started = performance.now();
  const response = await complete({
    messages: [
      {
        role: 'user',
        content: `Call confirm_connection with nonce ${nonce}. This only checks the connection; no external action will run.`,
      },
    ],
    tools: [
      {
        type: 'function',
        function: {
          name: 'confirm_connection',
          description: 'Confirm the exact connection nonce.',
          parameters: {
            type: 'object',
            properties: { nonce: { type: 'string' } },
            required: ['nonce'],
            additionalProperties: false,
          },
        },
      },
    ],
    toolChoice: { type: 'function', function: { name: 'confirm_connection' } },
    maxTokens: 200,
    temperature: 0,
    stream: false,
  });
  const calls = response?.choices?.[0]?.message?.tool_calls || [];
  const matched = calls.some((call) => {
    try {
      return (
        call.function?.name === 'confirm_connection' &&
        JSON.parse(call.function.arguments).nonce === nonce
      );
    } catch {
      return false;
    }
  });
  if (!matched)
    throw new Error(
      'The model did not return the required tool call. Check the model ID and tool-calling support.',
    );
  return {
    passed: true,
    generation: true,
    toolCalling: true,
    durationMs: performance.now() - started,
    checkedAt: new Date().toISOString(),
    limitation:
      'One generation and native tool-call check; this does not establish general task quality.',
  };
}
