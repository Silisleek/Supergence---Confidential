// Opt-in verification with the configured real model; no scripted provider responses.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright-core';

const baseURL = process.env.SIS_BASE_URL;
if (!baseURL) throw new Error('Set SIS_BASE_URL to an isolated backend using the real provider.');
const output = path.resolve('test-results/live-knowledge-chat');
await fs.mkdir(output, { recursive: true });
const marker = randomUUID();
const project = `Linden-${marker}`;
const content = `Verification-only project ${project}.\nBackup window: 04:17 UTC.\nRetention period: 23 days.\nEscalation code: LINDEN-7029.\nThe on-call engineer is not specified.`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({
  viewport: { width: 1500, height: 1000 },
  reducedMotion: 'reduce',
});
page.setDefaultTimeout(60000);
const results = [];
const chats = new Set(),
  sources = new Set(),
  errors = [];
page.on('pageerror', (error) => errors.push(error.message));
let currentChat, source;
async function newChat() {
  await page.locator('#shellNewConversation').click();
  currentChat = await page.evaluate(() => window.__activeWorkspaceConvId);
  assert.ok(currentChat);
  chats.add(currentChat);
}
async function chat(prompt) {
  await page.locator('#workspaceInp').fill(prompt);
  const done = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/sis/unified-turn-stream') &&
      response.request().method() === 'POST',
    { timeout: 240000 },
  );
  await page.locator('#workspaceSendBtn').click();
  await (await done).finished();
  await page.waitForFunction(() => document.body.dataset.agentWorking !== 'true', null, {
    timeout: 240000,
  });
  const conversation = await (
    await page.request.get(`${baseURL}/api/conversations/${currentChat}`)
  ).json();
  const answer = conversation.messages.findLast((message) => message.role === 'assistant');
  if (!answer || answer.status !== 'completed')
    throw new Error(
      `Chat did not complete: ${answer?.error || answer?.status || 'missing response'}`,
    );
  return answer;
}
async function check(name, action) {
  const started = Date.now();
  try {
    const evidence = await action();
    results.push({ name, passed: true, durationMs: Date.now() - started, ...evidence });
    console.log(`PASS ${name}: ${String(evidence?.response || '').slice(0, 500)}`);
  } catch (error) {
    results.push({ name, passed: false, durationMs: Date.now() - started, error: error.message });
    console.log(`FAIL ${name}: ${error.message}`);
  }
  await fs.writeFile(
    path.join(output, 'results.json'),
    JSON.stringify(
      { kind: 'Live configured model, real main-app UI and storage', project, results, errors },
      null,
      2,
    ),
  );
}
try {
  const deadline = Date.now() + 90000;
  let healthy = false;
  while (!healthy && Date.now() < deadline) {
    healthy = await page.request
      .get(`${baseURL}/api/health`, { timeout: 1000 })
      .then((response) => response.ok())
      .catch(() => false);
    if (!healthy) await new Promise((resolve) => setTimeout(resolve, 300));
  }
  assert.ok(healthy, 'Server did not become healthy.');
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__sisWorkspaceReady && window.LearningPanel);
  console.log('Main app ready; importing the live verification reference.');
  await page.locator('#railLearning').click();
  await page.getByRole('button', { name: 'Retain knowledge', exact: true }).click();
  await page.locator('#learningImportForm [name="title"]').fill(`${project} schedule`);
  await page.locator('#learningImportForm [name="content"]').fill(content);
  await page.locator('#learningImportForm [type="submit"]').click();
  await page.locator('#learningStatus').filter({ hasText: 'Source retained' }).waitFor();
  source = (await (await page.request.get(`${baseURL}/api/learning/library`)).json()).sources.find(
    (record) => record.title === `${project} schedule`,
  );
  assert.ok(source);
  sources.add(source.id);
  await page.getByRole('button', { name: 'Close learning library' }).click();
  await newChat();
  await check('live answer grounded in imported reference', async () => {
    const answer = await chat(
      `For ${project}, what are the backup window and retention period? Cite the retained source ID.`,
    );
    assert.match(answer.content, /04:17/);
    assert.match(answer.content, /23\s*days/i);
    assert.ok(answer.content.includes(source.id), 'Missing source citation.');
    return {
      prompt: `Backup window and retention for ${project}`,
      response: answer.content,
      tools: answer.toolCalls,
    };
  });
  await check('same-chat follow-up preserves referent', async () => {
    const answer = await chat('And what is its escalation code?');
    assert.match(answer.content, /LINDEN-7029/);
    return { response: answer.content };
  });
  await check('explicit rule is saved by chatting', async () => {
    const answer = await chat(
      `Remember this rule: Begin answers about ${project} with the exact prefix "LINDEN VERIFIED:".`,
    );
    const records = (await (await page.request.get(`${baseURL}/api/learning/library`)).json())
      .sources;
    const saved = records.find(
      (record) => record.sourceType === 'user-rule' && record.title.includes(project.slice(0, 20)),
    );
    assert.ok(saved, 'Rule was not retained as user-rule.');
    sources.add(saved.id);
    return { response: answer.content, ruleId: saved.id };
  });
  await newChat();
  await check('new chat receives reference and obeys saved rule', async () => {
    const answer = await chat(
      `What backup window and retention period apply to ${project}? Cite the retained source.`,
    );
    assert.match(answer.content, /LINDEN VERIFIED:/);
    assert.match(answer.content, /04:17/);
    assert.match(answer.content, /23\s*days/i);
    return { response: answer.content };
  });
  await check('chat tool edits actual retained source', async () => {
    const updated = content.replace('04:17', '05:26').replace('23 days', '29 days');
    const answer = await chat(
      `Use edit_knowledge to update the retained source ${source.id}. Its expectedDigest is ${source.digest} and expectedRevision is ${source.revision}. Keep its title. Replace its content with exactly:\n${updated}`,
    );
    const actual = (
      await (await page.request.get(`${baseURL}/api/learning/sources/${source.id}`)).json()
    ).source;
    assert.equal(actual.content, updated);
    assert.ok(
      answer.toolCalls?.some((call) => call.tool === 'edit_knowledge'),
      'No actual edit_knowledge tool call recorded.',
    );
    return { response: answer.content, revision: actual.revision, tools: answer.toolCalls };
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__sisWorkspaceReady);
  await newChat();
  await check('reload and new chat use corrected facts', async () => {
    const answer = await chat(
      `What backup window and retention period apply to ${project}? Cite the retained source.`,
    );
    assert.match(answer.content, /05:26/);
    assert.match(answer.content, /29\s*days/i);
    assert.match(answer.content, /LINDEN VERIFIED:/);
    return { response: answer.content };
  });
  await check('missing fact is reported rather than invented', async () => {
    const answer = await chat(
      `What is the on-call engineer's name for ${project}? If the retained source does not specify it, say so.`,
    );
    assert.match(
      answer.content,
      /not specified|not provided|doesn.t specify|does not specify|unknown|unavailable/i,
    );
    return { response: answer.content };
  });
  await page.screenshot({ path: path.join(output, 'live-chat.png'), fullPage: true });
  assert.deepEqual(errors, []);
  assert.ok(
    results.every((result) => result.passed),
    `${results.filter((result) => !result.passed).length} live checks failed. See results.json.`,
  );
  console.log(`All ${results.length} live-model chat checks passed.`);
} catch (error) {
  await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
  await fs.writeFile(
    path.join(output, 'failure.json'),
    JSON.stringify({ error: error.message, results, errors }, null, 2),
  );
  throw error;
} finally {
  for (const id of sources)
    await page.request.delete(`${baseURL}/api/learning/sources/${id}`).catch(() => {});
  // Include a rule saved before a provider error in cleanup as well.
  const records = await page.request
    .get(`${baseURL}/api/learning/library`)
    .then((response) => response.json())
    .then((data) => data.sources || [])
    .catch(() => []);
  for (const record of records.filter((record) => record.title.includes(project.slice(0, 20))))
    await page.request.delete(`${baseURL}/api/learning/sources/${record.id}`);
  for (const id of chats)
    await page.request.delete(`${baseURL}/api/conversations/${id}`).catch(() => {});
  await browser.close();
}
