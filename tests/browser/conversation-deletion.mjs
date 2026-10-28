import assert from 'node:assert/strict';

const baseURL = process.env.SIS_BASE_URL;
if (!baseURL) throw new Error('Set SIS_BASE_URL to an isolated backend.');
const request = async (route, method = 'GET', body) => {
  const response = await fetch(new URL(route, baseURL), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
};
const created = await request('/api/conversations', 'POST', {
  title: 'Verification-only deletion regression',
});
assert.equal(created.status, 200);
const id = created.data.id;
try {
  await request('/api/chat/focus', 'POST', { conversationId: id });
  const before = await request('/api/chat/focus');
  assert.equal(before.data.activeConversationId, id);
  const deleted = await request(`/api/conversations/${id}`, 'DELETE');
  assert.equal(deleted.status, 200);
  assert.equal(deleted.data.success, true);
  const after = await request('/api/chat/focus');
  assert.equal(after.data.activeConversationId, null);
  assert.equal(after.data.chatClosed, true);
  assert.equal(after.data.chatFocused, false);
  assert.equal((await request(`/api/conversations/${id}`)).status, 404);
  console.log(
    'Passed: deleting an active conversation returns success, clears active chat state, and removes the durable record.',
  );
} finally {
  await request(`/api/conversations/${id}`, 'DELETE').catch(() => {});
}
