import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
const baseURL = process.env.SIS_BASE_URL;
if (!baseURL) throw new Error('Set SIS_BASE_URL.');
async function api(url, method = 'GET', body) {
  const response = await fetch(new URL(url, baseURL), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(180000),
  });
  return response.json();
}
const filename = `capability-${randomUUID()}.html`;
const heading = `Evidence ${randomUUID()}`;
const threads = [];
try {
  const shell = await api('/api/openclaw/execute', 'POST', {
    command: 'powershell -NoProfile -Command "Write-Output (47*19)"',
  });
  assert.equal(shell.success, true, JSON.stringify(shell));
  assert.match(shell.stdout, /893/);
  await api('/api/workspace/file', 'POST', {
    path: filename,
    content: `<!doctype html><html><title>Capability verification</title><h1>${heading}</h1><p>Local browser evidence.</p></html>`,
  });
  const result = await api('/api/sis/unified-turn', 'POST', {
    query: `Use open_workspace_browser to open ${new URL(`/workspace/${filename}`, baseURL).href}, then use read_workspace_browser to read the actual page. Report its exact h1 heading.`,
    agentId: 'agent-cs',
    conversationId: `capability-${randomUUID()}`,
    persistConversation: false,
  });
  assert.equal(result.success, true);
  assert.ok(result.toolCalls.some((call) => call.tool === 'open_workspace_browser'));
  assert.ok(result.toolCalls.some((call) => call.tool === 'read_workspace_browser'));
  assert.ok(result.response.includes(heading), result.response);
  const exchange = await api('/api/sis/unified-turn', 'POST', {
    query:
      'Use send_agent_message to send agent-biology this exact question: Explain in one sentence why source provenance matters. Report the actual reply.',
    agentId: 'agent-cs',
    conversationId: `capability-${randomUUID()}`,
    persistConversation: false,
  });
  const call = exchange.toolCalls.find((item) => item.tool === 'send_agent_message');
  assert.ok(call, exchange.response);
  threads.push(call.output.threadId);
  assert.equal(call.output.success, true, JSON.stringify(call.output));
  assert.equal(call.output.messages[0].senderId, 'agent-cs');
  assert.equal(call.output.messages[1].senderId, 'agent-biology');
  await fs.mkdir('test-results/workspace-capabilities', { recursive: true });
  await fs.writeFile(
    'test-results/workspace-capabilities/results.json',
    JSON.stringify(
      {
        baseURL,
        checkedAt: new Date().toISOString(),
        checks: [
          'legacy Windows shell quoting',
          'selected agent actually opens and reads shared browser with an unknown heading',
          'selected agent messages another actual agent with grounded sender identity',
        ],
        browserToolCalls: result.toolCalls.map((item) => ({
          tool: item.tool,
          status: item.status,
        })),
        response: result.response,
        exchange: call.output.messages,
      },
      null,
      2,
    ),
  );
  console.log('Passed 3 real browser, terminal, and agent messaging checks.');
} finally {
  await api('/api/workspace/file', 'DELETE', { path: filename });
  for (const id of threads) await api(`/api/agent-conversations/${id}`, 'DELETE');
}
