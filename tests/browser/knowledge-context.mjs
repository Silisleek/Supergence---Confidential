// A local scripted provider checks the actual context supplied by the main app.
import assert from 'node:assert/strict';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright-core';

const baseURL = process.env.SIS_BASE_URL;
if (!baseURL) throw new Error('Set SIS_BASE_URL to an isolated test backend.');
const marker = randomUUID();
const reference = `Quasar launch window ${marker}: 07:45 UTC.`;
const rule = `For ${marker}, include source citations with launch schedules.`;
const failures = [];
let observed = 0;
const provider = http.createServer(async (req, res) => {
  try {
    if (req.url.endsWith('/models'))
      return res.end(JSON.stringify({ data: [{ id: 'knowledge-context-fixture' }] }));
    let body = '';
    for await (const chunk of req) body += chunk;
    const input = JSON.parse(body);
    const system = input.messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n');
    const primary = system.includes('<live_runtime_contract>');
    if (primary) {
      assert.ok(system.includes(reference), 'Ordinary question did not receive saved reference.');
      assert.ok(system.includes(rule), 'New chat did not receive saved rule.');
      assert.ok(
        input.tools.some((tool) => tool.function.name === 'recall_knowledge'),
        'Recall tool missing.',
      );
      observed++;
    }
    const content = primary ? 'The saved launch window is 07:45 UTC.' : '{}';
    if (input.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      return res.end(
        `data: ${JSON.stringify({ choices: [{ delta: { content }, finish_reason: null }] })}\n\ndata: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\n\ndata: [DONE]\n\n`,
      );
    }
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        choices: [
          {
            message: { role: 'assistant', content },
            finish_reason: 'stop',
          },
        ],
      }),
    );
  } catch (error) {
    failures.push(error.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: error.message } }));
  }
});
await new Promise((resolve) => provider.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
const sources = [],
  chats = [];
let original, token;
async function config(provider) {
  const response = await page.request.patch(`${baseURL}/api/evolution/settings`, {
    data: { provider },
    headers: { 'x-evolution-token': token },
  });
  assert.ok(response.ok(), await response.text());
}
try {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  const state = await (await page.request.get(`${baseURL}/api/evolution`)).json();
  original = state.settings.provider;
  token = state.uiToken;
  assert.equal(
    original.hasKey,
    false,
    'Run against an isolated backend; preserve existing provider secrets.',
  );
  await config({
    enabled: true,
    baseURL: `http://127.0.0.1:${provider.address().port}/v1`,
    model: 'knowledge-context-fixture',
    apiKey: 'local-protocol-fixture',
  });
  for (const source of [
    { content: reference, title: 'Quasar schedule' },
    { content: rule, sourceType: 'user-rule', title: 'Quasar citation rule' },
  ]) {
    const response = await page.request.post(`${baseURL}/api/learning/sources`, { data: source });
    const result = await response.json();
    assert.ok(result.success, result.error);
    sources.push(result.source.id);
  }
  for (let turn = 0; turn < 2; turn++) {
    const conversationId = `knowledge-context-${randomUUID()}`;
    chats.push(conversationId);
    const response = await page.request.post(`${baseURL}/api/sis/unified-turn`, {
      data: { query: `When is the quasar launch window for ${marker}?`, conversationId },
      timeout: 60000,
    });
    const result = await response.json();
    assert.ok(result.success, JSON.stringify(result));
    assert.match(result.response, /07:45 UTC/);
  }
  assert.ok(observed >= 2);
  assert.deepEqual(failures, []);
  console.log(
    'Passed: actual main-app inference receives retained reference and rule in two independent chats without memory trigger words. Scripted provider tests context delivery, not model intelligence.',
  );
} finally {
  if (original && token && !original.hasKey)
    await config({
      enabled: original.enabled,
      baseURL: original.baseURL,
      model: original.model,
      apiKey: '',
    });
  for (const id of sources) await page.request.delete(`${baseURL}/api/learning/sources/${id}`);
  for (const id of chats) await page.request.delete(`${baseURL}/api/conversations/${id}`);
  await browser.close();
  await new Promise((resolve) => provider.close(resolve));
}
