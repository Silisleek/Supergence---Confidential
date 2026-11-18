import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLegacyGraph } from '../../client/scripts/arem-graph-view.js';

test('older AREM endpoints produce scoped nodes and only recorded links', async () => {
  const originalFetch = globalThis.fetch;
  const routes = new Map([
    ['/api/arem/nodes?conversationId=chat-a&limit=20', { nodes: [
      { id: 'p', title: 'Parent', scope: 'chat' },
      { id: 'c', title: 'Child', scope: 'chat', parent: 'p' },
      { id: 'checkpoint:secret', title: 'Checkpoint', scope: 'working' },
    ] }],
    ['/api/arem/wiki', { pages: [{ slug: 'alpha', title: 'Alpha', filename: 'alpha.md', links: ['beta', 'missing'] }, { slug: 'beta', title: 'Beta', filename: 'beta.md', links: [] }] }],
    ['/api/arem/wiki/alpha', { page: { content: 'Alpha contents' } }],
    ['/api/arem/wiki/beta', { page: { content: 'Beta contents' } }],
    ['/api/arem/sleep/chat-a', { sleep: { phase: 'awake', notes: [{ id: 'n', title: 'Note', note: 'Remember this', sourceId: 'turn' }] } }],
  ]);
  globalThis.fetch = async (url) => routes.has(url)
    ? new Response(JSON.stringify(routes.get(url)), { status: 200 })
    : new Response('', { status: 404 });
  try {
    const graph = await loadLegacyGraph('chat-a');
    assert.deepEqual(graph.nodes.map(({ id }) => id), ['p', 'c', 'wiki:alpha', 'wiki:beta', 'sleep:n']);
    assert.deepEqual(graph.edges.map(({ source, target }) => [source, target]), [['p', 'c'], ['wiki:alpha', 'wiki:beta']]);
    assert.equal(graph.nodes.find(({ id }) => id === 'wiki:alpha').note, 'Alpha contents');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
