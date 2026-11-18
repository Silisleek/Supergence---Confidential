import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';

const root = process.cwd();
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-team-http-'));
const data = path.join(directory, 'data');
const workspace = path.join(directory, 'workspace');
const secret = randomBytes(32).toString('hex');
const teamProject = 'team-fixture';
const projectDirectory = 'projects/existing-fixture';
await fs.mkdir(path.join(workspace, 'chats', teamProject, projectDirectory), { recursive: true });
await fs.writeFile(path.join(workspace, 'chats', teamProject, projectDirectory, 'report.txt'), 'TEAM_FIXTURE_CONTENT');
await fs.mkdir(path.join(data, 'chat-workspaces'), { recursive: true });
await fs.writeFile(path.join(data, 'chat-workspaces', `${teamProject}.project`), projectDirectory);
const calls = [];
const provider = http.createServer(async (req, res) => {
  try {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw || '{}');
    const system = body.messages?.find((item) => item.role === 'system')?.content || '';
    const isReview = /completion reviewer/i.test(system);
    const usedTool = body.messages?.some((item) => item.role === 'tool');
    const delegate = !usedTool && body.tools?.some((tool) => tool.function.name === 'send_agent_message') && body.messages?.some((item) => item.role === 'user' && String(item.content).startsWith('Use send_agent_message'));
    let message;
    if (isReview) message = { role: 'assistant', content: JSON.stringify({ status: 'complete', remaining: [], reason: 'The file was read.' }) };
    else if (delegate) {
      message = { role: 'assistant', content: 'I will ask a teammate.', tool_calls: [{ id: 'delegate-1', type: 'function', function: { name: 'send_agent_message', arguments: JSON.stringify({ targetAgentId: 'agent-cs', content: 'Read report.txt and summarize it.' }) } }] };
    } else if (!usedTool && body.tools?.some((tool) => tool.function.name === 'read_file')) {
      message = { role: 'assistant', content: 'I will inspect the file.', tool_calls: [{ id: 'read-1', type: 'function', function: { name: 'read_file', arguments: JSON.stringify({ filepath: 'report.txt' }) } }] };
    } else message = { role: 'assistant', content: 'The file contains TEAM_FIXTURE_CONTENT.' };
    calls.push({ usedTool, isReview, toolResult: body.messages?.find((item) => item.role === 'tool')?.content || '' });
    if (body.stream) {
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      const delta = { content: message.content, ...(message.tool_calls ? { tool_calls: message.tool_calls.map((call, index) => ({ ...call, index })) } : {}) };
      res.end(`data: ${JSON.stringify({ id: 'fixture', choices: [{ index: 0, delta, finish_reason: message.tool_calls ? 'tool_calls' : 'stop' }] })}\n\ndata: [DONE]\n\n`);
    } else {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ id: 'fixture', choices: [{ message, finish_reason: message.tool_calls ? 'tool_calls' : 'stop' }] }));
    }
  } catch { res.writeHead(500).end(); }
});
await new Promise((resolve) => provider.listen(0, '127.0.0.1', resolve));
const reserve = http.createServer();
await new Promise((resolve) => reserve.listen(0, '127.0.0.1', resolve));
const port = reserve.address().port;
await new Promise((resolve) => reserve.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const backend = spawn(process.execPath, ['server/index.js'], {
  cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, PORT: String(port), SIS_DATA_DIR: data, SIS_WORKSPACE_DIR: workspace, SIS_SESSION_SECRET: secret,
    BASE_URL: `http://127.0.0.1:${provider.address().port}/v1`, DEFAULT_MODEL: 'team-fixture', API_KEY: 'fixture', OPENCODE_API_KEY: '',
    FALLBACK_MODEL: '', FALLBACK_MODELS: '', ENABLE_AREM_SLEEP: 'false', ENABLE_BACKGROUND_LLM_LOOPS: 'false' },
});
let logs = '';
backend.stdout.on('data', (chunk) => { logs += chunk; });
backend.stderr.on('data', (chunk) => { logs += chunk; });
try {
  const deadline = Date.now() + 120000;
  while (!(await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(2000) }).then((response) => response.ok, () => false))) {
    if (backend.exitCode !== null || Date.now() > deadline) throw new Error('Isolated server did not start.');
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  const headers = { authorization: `Bearer ${secret}`, 'content-type': 'application/json' };
  const response = await fetch(`${origin}/api/team-chat/messages`, { method: 'POST', headers,
    body: JSON.stringify({ conversationId: teamProject, targetAgentId: 'agent-cs', content: 'Read report.txt and summarize it.' }), signal: AbortSignal.timeout(120000) });
  const dataResponse = await response.json();
  assert.equal(response.status, 200, JSON.stringify(dataResponse));
  assert.equal(dataResponse.thread.status, 'idle', JSON.stringify(dataResponse.thread.error));
  assert.equal(dataResponse.thread.projectId, teamProject);
  assert.equal(dataResponse.thread.messages.at(-1).senderId, 'agent-cs');
  assert.match(dataResponse.thread.messages.at(-1).content, /TEAM_FIXTURE_CONTENT/);
  assert.ok(dataResponse.thread.activity.some((entry) => entry.tool === 'read_file' && entry.status === 'RESOLVED'));
  assert.ok(calls.some((call) => call.toolResult.includes('TEAM_FIXTURE_CONTENT')));
  const loaded = await fetch(`${origin}/api/team-chat?conversationId=${teamProject}`, { headers });
  assert.equal((await loaded.json()).thread.messages.length, 2);
  const other = await fetch(`${origin}/api/team-chat?conversationId=another-project`, { headers });
  assert.equal((await other.json()).thread, null);
  const delegatedResponse = await fetch(`${origin}/api/sis/unified-turn`, { method: 'POST', headers,
    body: JSON.stringify({ conversationId: teamProject, requestId: 'delegation-1', query: 'Use send_agent_message to ask the software specialist to inspect the project report.' }), signal: AbortSignal.timeout(120000) });
  const delegated = await delegatedResponse.json();
  assert.equal(delegatedResponse.status, 200, JSON.stringify(delegated.error));
  assert.ok(delegated.toolCalls?.some((entry) => entry.tool === 'send_agent_message' && entry.status === 'RESOLVED'), JSON.stringify(delegated.error));
  const shared = await (await fetch(`${origin}/api/team-chat?conversationId=${teamProject}`, { headers })).json();
  assert.equal(shared.thread.messages.length, 4);
  assert.deepEqual(shared.thread.messages.slice(-2).map(({ senderId }) => senderId), ['supergence', 'agent-cs']);
  assert.ok(shared.thread.activity.some((entry) => entry.tool === 'read_file' && entry.status === 'RESOLVED'));
  console.log('Team HTTP integration passed: user and agent delegation, real tool read, persisted replies, project isolation.');
} catch (error) {
  console.error(logs.replaceAll(secret, '[REDACTED]').slice(-5000));
  throw error;
} finally {
  if (backend.exitCode === null) { backend.kill(); await once(backend, 'exit').catch(() => {}); }
  provider.closeAllConnections();
  await new Promise((resolve) => provider.close(resolve));
  await fs.rm(directory, { recursive: true, force: true });
}
