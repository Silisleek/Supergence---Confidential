import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const baseURL = process.env.SIS_BASE_URL;
if (!baseURL) throw new Error('Set SIS_BASE_URL to an isolated backend.');
const request = async (route, method, body) => {
  const response = await fetch(new URL(route, baseURL), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  assert.equal(response.ok, true, result.error || `HTTP ${response.status}`);
  return result;
};
const root = `archive-verification-${randomUUID()}`;
await request('/api/workspace/folder', 'POST', { path: root });
await request('/api/workspace/file', 'POST', {
  path: `${root}/source's.txt`,
  content: 'Archive round-trip verification',
});
await request('/api/workspace/archive/zip', 'POST', {
  src: `${root}/source's.txt`,
  output: `${root}/archive's.zip`,
});
await request('/api/workspace/archive/unzip', 'POST', {
  file: `${root}/archive's.zip`,
  dest: `${root}/output's`,
});
const result = await request(
  `/api/workspace/file?${new URLSearchParams({ path: `${root}/output's/source's.txt` })}`,
  'GET',
);
assert.match(JSON.stringify(result), /Archive round-trip verification/);
console.log('Archive round-trip with apostrophes passed.');
