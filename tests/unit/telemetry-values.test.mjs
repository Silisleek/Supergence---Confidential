import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { fetchJson, formatConfidence, formatCount } from '../../client/scripts/telemetry-values.js';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('counts retain zero and format measured values', () => {
  assert.equal(formatCount(0), '0');
  assert.equal(formatCount(187373), '187,373');
});

test('missing, invalid, and negative counts are unavailable', () => {
  for (const value of [null, undefined, NaN, Infinity, -1, '42']) {
    assert.equal(formatCount(value), 'Unavailable');
  }
});

test('confidence retains zero and validates its measured range', () => {
  assert.equal(formatConfidence(0), '0.0%');
  assert.equal(formatConfidence(1), '100.0%');
  assert.equal(formatConfidence(0.978), '97.8%');
  for (const value of [null, undefined, NaN, -0.1, 1.1, '0.5']) {
    assert.equal(formatConfidence(value), 'Unavailable');
  }
});

test('JSON requests return backend data and retain caller options', async () => {
  const controller = new AbortController();
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/example');
    assert.equal(options.method, 'POST');
    assert.equal(options.signal, controller.signal);
    return Response.json({ count: 0 });
  };
  assert.deepEqual(await fetchJson('/api/example', { method: 'POST', signal: controller.signal }), {
    count: 0,
  });
});

test('HTTP failures cannot become successful UI checks', async () => {
  globalThis.fetch = async () => new Response('Unavailable', { status: 503 });
  await assert.rejects(fetchJson('/api/example'), /503/);
});

test('application errors in successful HTTP responses are rejected', async () => {
  globalThis.fetch = async () => Response.json({ success: false, error: 'No active browser' });
  await assert.rejects(fetchJson('/api/example'), /No active browser/);
  globalThis.fetch = async () => Response.json({ error: 'Not configured' });
  await assert.rejects(fetchJson('/api/example'), /Not configured/);
});

test('malformed JSON and connection failures are surfaced', async () => {
  globalThis.fetch = async () => new Response('<html>not JSON</html>');
  await assert.rejects(fetchJson('/api/example'), SyntaxError);
  globalThis.fetch = async () => {
    throw new Error('Offline');
  };
  await assert.rejects(fetchJson('/api/example'), /Offline/);
});
