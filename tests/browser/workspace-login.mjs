import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright-core';

const baseURL = process.env.SIS_BASE_URL;
if (!baseURL) throw new Error('Set SIS_BASE_URL.');
const email = 'browser-test@example.test';
// Include terms that used to accidentally trigger unrelated artifact generation.
const password = `Fixture-game-3d-${randomUUID()}!`;
const evidence = `Authenticated ${randomUUID()}`;
const sessionKey = randomUUID();
let authenticated = false;
let submissions = 0;
const fixture = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (req.method === 'POST' && req.url === '/login') {
    submissions++;
    let body = '';
    for await (const chunk of req) body += chunk;
    const fields = new URLSearchParams(body);
    authenticated = fields.get('email') === email && fields.get('password') === password;
    if (authenticated) {
      res.writeHead(303, {
        Location: '/account',
        'Set-Cookie': `fixture_session=${sessionKey}; HttpOnly; SameSite=Lax; Path=/`,
      });
      res.end();
    } else {
      res.statusCode = 401;
      res.end('<h1>Incorrect credentials</h1>');
    }
    return;
  }
  if (req.url === '/account') {
    res.end(
      req.headers.cookie?.includes(`fixture_session=${sessionKey}`)
        ? `<h1>${evidence}</h1>`
        : '<h1>Not authenticated</h1>',
    );
    return;
  }
  res.end(`<!doctype html><title>Local account fixture</title>
    <h1>Sign in</h1><form method="post" action="/login">
    <label>Email <input id="email" name="email" type="email" autocomplete="username" required></label>
    <label>Password <input id="password" name="password" type="password" autocomplete="current-password" required></label>
    <button type="submit">Sign in</button></form>`);
});
await new Promise((resolve) => fixture.listen(0, '127.0.0.1', resolve));
const fixtureURL = `http://127.0.0.1:${fixture.address().port}/`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
let conversationId;
let originalAccess;
try {
  originalAccess = (await (await page.request.get(`${baseURL}/api/access`)).json()).settings;
  await page.request.patch(`${baseURL}/api/access`, { data: { mode: 'full-access' } });
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__sisWorkspaceReady);
  await page.locator('#shellNewConversation').click();
  conversationId = await page.evaluate(() => window.__activeWorkspaceConvId);
  await page.evaluate(
    ({ query }) => {
      window.__workspaceAgentId = 'agent-cs';
      window.__loginToolActivity = [];
      window.addEventListener('workspace-tool-activity', (event) =>
        window.__loginToolActivity.push(event.detail),
      );
      window.__loginCompleted = false;
      void window.executeTurnInWorkspace(query).finally(() => {
        window.__loginCompleted = true;
      });
    },
    {
      query: `Can you open ${fixtureURL} in the browser and then log in with ${email} and the password ${password}? Read the resulting page and report its exact heading.`,
    },
  );
  await page.waitForFunction(() => window.__loginCompleted, null, { timeout: 240000 });
  const turn = await page.evaluate(() => ({
    response: document.querySelector('.response-body-markdown')?.textContent || '',
    toolCalls: window.__loginToolActivity,
  }));
  // Never print credentials or raw arguments, even for the local fixture.
  console.log(
    JSON.stringify({
      tools: turn.toolCalls?.map(({ tool, status }) => ({ tool, status })),
    }),
  );
  assert.equal(
    authenticated,
    true,
    'The actual browser must submit the supplied fixture credentials.',
  );
  assert.ok(
    turn.response.replace(/\s/g, ' ').includes(evidence),
    'Final reply must use the authenticated page evidence.',
  );
  assert.ok(turn.toolCalls.some((call) => call.tool === 'read_workspace_browser'));
  assert.ok(
    !JSON.stringify(turn.toolCalls).includes(password),
    'Private input must not appear in tool activity.',
  );
  assert.ok(!turn.response.includes(password), 'Assistant messages must not repeat the password.');
  assert.equal(
    await page.locator('.chat-artifact-header').count(),
    0,
    'Credential text must not trigger unrelated artifacts.',
  );
  const pageState = await page.request.get(
    new URL('/api/browser/agent-supergence/page', baseURL).href,
  );
  const authenticatedPage = await pageState.json();
  assert.ok(JSON.stringify(authenticatedPage).includes(evidence));
  assert.ok(
    authenticatedPage.url.endsWith('/account'),
    'The browser must follow the session-backed account redirect.',
  );
  const tool = async (name, args) => {
    const response = await page.request.post(new URL('/api/tools/execute', baseURL).href, {
      data: { tool: name, args },
      timeout: 60000,
    });
    return (await response.json()).result;
  };
  await tool('open_workspace_browser', { url: fixtureURL });
  const form = await tool('read_workspace_browser', {});
  assert.ok(
    form.controls.some(
      (control) => control.type === 'password' && control.selector === '#password',
    ),
  );
  assert.ok(form.controls.every((control) => !Object.hasOwn(control, 'value')));
  const failedFill = await tool('browser_fill_form', {
    fields: [{ selector: '#missing', value: password }],
    submitSelector: 'button[type="submit"]',
  });
  assert.equal(failedFill.success, false);
  assert.equal(failedFill.submitted, false);
  assert.ok(!JSON.stringify(failedFill).includes(password));
  const failedSubmit = await tool('browser_fill_form', {
    fields: [{ selector: '#email', value: email }],
    submitSelector: '#missing-submit',
  });
  assert.equal(failedSubmit.success, false);
  assert.equal(failedSubmit.submitted, false);
  const missingClick = await tool('browser_click', { target: '#missing-button' });
  assert.equal(missingClick.success, false);
  assert.equal(submissions, 1, 'Failed selectors must never submit at the old cursor position.');
  await fs.mkdir('test-results/workspace-login', { recursive: true });
  await fs.writeFile(
    'test-results/workspace-login/results.json',
    JSON.stringify(
      {
        baseURL,
        checkedAt: new Date().toISOString(),
        checks: [
          'actual chat SSE and Chrome navigation',
          'authorized form fill and session cookie redirect',
          'authenticated page evidence in final response',
          'private tool activity and field-free page inspection',
          'credential text does not trigger unrelated artifact generation',
          'failed field, submit and click never report success or submit at the old cursor',
        ],
        tools: [...new Set(turn.toolCalls.map(({ tool }) => tool))],
      },
      null,
      2,
    ),
  );
  console.log('Passed actual Chrome navigation, authorized login, and verified outcome.');
} finally {
  if (originalAccess)
    await page.request.patch(`${baseURL}/api/access`, { data: originalAccess }).catch(() => {});
  if (conversationId)
    await page.request.delete(new URL(`/api/conversations/${conversationId}`, baseURL).href);
  await browser.close();
  fixture.closeAllConnections();
  await new Promise((resolve) => fixture.close(resolve));
}
