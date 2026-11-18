const NS = 'http://www.w3.org/2000/svg';

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

function layoutNodes(nodes, edges) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const children = new Map(nodes.map((node) => [node.id, []]));
  const hasParent = new Set();
  for (const edge of edges) {
    if (edge.kind !== 'parent' || !byId.has(edge.source) || !byId.has(edge.target) || hasParent.has(edge.target)) continue;
    children.get(edge.source).push(edge.target);
    hasParent.add(edge.target);
  }
  const roots = nodes.filter((node) => !hasParent.has(node.id));
  const placed = new Map();
  let row = 0;
  function place(id, depth) {
    if (placed.has(id)) return placed.get(id).y;
    const position = { x: 105 + depth * 215, y: 0, depth };
    placed.set(id, position);
    const descendants = children.get(id).filter((child) => !placed.has(child));
    if (descendants.length) {
      const ys = descendants.map((child) => place(child, depth + 1));
      position.y = (ys[0] + ys[ys.length - 1]) / 2;
    } else position.y = 52 + row++ * 58;
    return position.y;
  }
  for (const node of roots) place(node.id, 0);
  for (const node of nodes) if (!placed.has(node.id)) place(node.id, 0);
  return { placed, width: Math.max(400, ...[...placed.values()].map(({ x }) => x + 150)),
    height: Math.max(220, row * 58 + 45) };
}

async function readJson(url, { allowMissing = false } = {}) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (allowMissing && response.status === 404) return null;
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const result = await response.json();
  if (result.success === false) throw new Error(result.error || 'Request failed');
  return result;
}

const wikiCache = new Map();

export async function loadLegacyGraph(conversation) {
  const chat = encodeURIComponent(conversation);
  const [memory, wiki, sleep] = await Promise.all([
    readJson(`/api/arem/nodes?conversationId=${chat}&limit=20`),
    readJson('/api/arem/wiki'),
    conversation ? readJson(`/api/arem/sleep/${chat}`, { allowMissing: true }) : null,
  ]);
  if (!Array.isArray(memory.nodes) || !Array.isArray(wiki.pages)) throw new Error('Invalid memory data');
  const stored = memory.nodes.filter((node) => !String(node.id).startsWith('checkpoint:'));
  const nodes = stored.map((node) => ({ ...node, kind: 'memory' }));
  const ids = new Set(nodes.map(({ id }) => id));
  const edges = nodes.filter(({ parent }) => parent && ids.has(parent))
    .map(({ id, parent }) => ({ source: parent, target: id, kind: 'parent' }));
  const pages = wiki.pages.slice(0, 100);
  const slugs = new Set(pages.map(({ slug }) => slug));
  const pageData = await Promise.all(pages.map(async (page) => {
    const cached = wikiCache.get(page.slug);
    if (cached && page.updatedAt != null && cached.updatedAt === page.updatedAt) return cached.data;
    const data = await readJson(`/api/arem/wiki/${encodeURIComponent(page.slug)}`, { allowMissing: true });
    if (data && page.updatedAt != null) wikiCache.set(page.slug, { updatedAt: page.updatedAt, data });
    return data;
  }));
  for (const [index, page] of pages.entries()) {
    nodes.push({ id: `wiki:${page.slug}`, kind: 'wiki', scope: 'permanent', title: page.title,
      note: String(pageData[index]?.page?.content || '').slice(0, 6000),
      evidence: `AREM wiki / ${page.filename}`, updated: page.updatedAt });
    for (const link of page.links || []) {
      if (slugs.has(link)) edges.push({ source: `wiki:${page.slug}`, target: `wiki:${link}`, kind: 'wiki-link' });
    }
  }
  for (const note of sleep?.sleep?.notes || []) {
    nodes.push({ id: `sleep:${note.id}`, kind: 'consolidated', scope: 'chat',
      title: note.title, note: note.note, evidence: note.sourceId });
  }
  return { nodes, edges, sleep: sleep?.sleep || null, limited: memory.nodes.length >= 20 || wiki.pages.length > pages.length };
}

export function mountAremGraph(root) {
  if (!root) return;
  const canvas = root.querySelector('#sgAremCanvas');
  const counts = root.querySelector('#sgAremCounts');
  const live = root.querySelector('#sgAremLive');
  const detail = root.querySelector('#sgAremDetail');
  const usage = root.querySelector('#sgAremUsage');
  let sequence = 0;
  let activeConversation = null;
  let signature = '';
  let selectedId = null;
  let currentNodes = [];
  let currentEdges = [];

  function inspect(node) {
    selectedId = node.id;
    detail.replaceChildren();
    const label = document.createElement('span');
    label.className = 'sg-arem-detail-kind';
    label.textContent = node.kind === 'consolidated' ? 'Consolidated note · this chat' : node.kind === 'wiki' ? 'AREM wiki page' : `${node.scope === 'permanent' ? 'Shared' : node.scope === 'working' ? 'Working' : 'Chat'} memory`;
    const title = document.createElement('strong');
    title.textContent = node.title;
    const content = document.createElement('p');
    content.textContent = node.note || 'No details available.';
    detail.append(label, title, content);
    const connected = currentEdges.filter((edge) => edge.source === node.id || edge.target === node.id);
    if (connected.length) {
      const links = document.createElement('div');
      links.className = 'sg-arem-connections';
      for (const edge of connected) {
        const otherId = edge.source === node.id ? edge.target : edge.source;
        const other = currentNodes.find((item) => item.id === otherId);
        if (!other) continue;
        const row = document.createElement('button');
        row.type = 'button';
        const relation = edge.kind === 'parent' ? (edge.source === node.id ? 'Child' : 'Parent') : edge.kind === 'wiki-link' ? 'Wiki link' : String(edge.relation || 'related').replaceAll('_', ' ');
        const direction = edge.kind === 'association' && edge.relation !== 'related' ? (edge.source === node.id ? ' → ' : ' ← ') : ' · ';
        row.textContent = `${relation}${direction}${other.title}`;
        row.title = edge.evidence ? `Evidence: ${edge.evidence}` : 'Open connected node';
        row.addEventListener('click', () => inspect(other));
        links.append(row);
      }
      if (links.childElementCount) detail.append(links);
    }
    if (node.evidence) {
      const source = document.createElement('small');
      source.textContent = `Source: ${node.evidence}`;
      detail.append(source);
    }
    canvas.querySelectorAll('[data-node-id]').forEach((item) => {
      item.setAttribute('aria-pressed', String(item.dataset.nodeId === node.id));
    });
  }

  function render(data) {
    currentNodes = data.nodes;
    currentEdges = data.edges;
    counts.textContent = `${data.nodes.length.toLocaleString()} shown · ${data.edges.length.toLocaleString()} stored ${data.edges.length === 1 ? 'link' : 'links'}${data.truncated ? ` · ${data.totalMemoryNodes.toLocaleString()} memory nodes total` : data.limited ? ' · limited view' : ''}`;
    canvas.replaceChildren();
    if (!data.nodes.length) {
      const empty = document.createElement('div');
      empty.className = 'sg-arem-empty';
      empty.textContent = 'No AREM memory nodes yet. Saved memories and consolidated notes will appear here.';
      canvas.append(empty);
      detail.textContent = 'Select a node to inspect its memory.';
      selectedId = null;
      return;
    }
    const { placed, width, height } = layoutNodes(data.nodes, data.edges);
    const svg = svgElement('svg', { width, height, viewBox: `0 0 ${width} ${height}`, role: 'group', 'aria-label': 'Memory nodes and stored links' });
    for (const edge of data.edges) {
      const a = placed.get(edge.source);
      const b = placed.get(edge.target);
      if (!a || !b) continue;
      svg.append(svgElement('path', { d: `M ${a.x + 8} ${a.y} C ${a.x + 105} ${a.y}, ${b.x - 105} ${b.y}, ${b.x - 8} ${b.y}`, class: edge.kind === 'association' ? 'sg-arem-link sg-arem-link-association' : 'sg-arem-link' }));
    }
    for (const node of data.nodes) {
      const { x, y } = placed.get(node.id);
      const group = svgElement('g', { transform: `translate(${x} ${y})`, role: 'button', tabindex: '0', 'aria-label': `${node.title}, ${node.kind === 'consolidated' ? 'consolidated note' : node.kind === 'wiki' ? 'wiki page' : `${node.scope} memory`}`, 'aria-pressed': String(selectedId === node.id), class: `sg-arem-node sg-arem-node-${node.kind}` });
      group.dataset.nodeId = node.id;
      group.append(svgElement('circle', { r: 6 }));
      const text = svgElement('text', { x: 15, y: 4 });
      text.textContent = node.title.length > 24 ? `${node.title.slice(0, 23)}…` : node.title;
      group.append(text);
      group.addEventListener('click', () => inspect(node));
      group.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); inspect(node); }
      });
      svg.append(group);
    }
    canvas.append(svg);
    const selected = currentNodes.find((node) => node.id === selectedId);
    if (selected) inspect(selected);
    else { selectedId = null; detail.textContent = 'Select a node to inspect its memory.'; }
  }

  async function refresh() {
    if (!root.isConnected || !root.closest('.sg-space-panel')?.classList.contains('active') || document.hidden) return;
    const conversation = window.__activeWorkspaceConvId || '';
    if (conversation !== activeConversation) {
      activeConversation = conversation;
      signature = '';
      selectedId = null;
      canvas.replaceChildren();
      detail.textContent = 'Select a node to inspect its memory.';
      counts.textContent = 'Loading memory…';
      if (usage) usage.textContent = 'No recent AREM activity for this chat.';
    }
    const request = ++sequence;
    try {
      const graph = await readJson(`/api/arem/graph?conversationId=${encodeURIComponent(conversation)}`, { allowMissing: true });
      const data = graph || await loadLegacyGraph(conversation);
      if (request !== sequence || conversation !== (window.__activeWorkspaceConvId || '')) return;
      if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) throw new Error('Invalid memory data');
      const next = JSON.stringify([data.nodes, data.edges, data.truncated, data.totalMemoryNodes, data.limited]);
      if (signature !== next) { signature = next; render(data); }
      if (usage && data.activity) {
        const a = data.activity;
        const retrieved = a.agentNodes + (a.linkedNodes || 0) + a.sleepNotes + a.wikiPages + a.retainedSources;
        usage.textContent = `Last turn · ${retrieved} retrieved · ${a.agentWrites} notes saved${a.workingCheckpoint === 'saved' ? ' · checkpoint saved' : a.workingCheckpoint === 'unavailable' ? ' · checkpoint unavailable' : ''}${a.agentMemoryUnavailable ? ' · agent memory unavailable' : ''}`;
      } else if (usage) usage.textContent = 'No recent AREM activity available for this chat.';
      if (data.sleep?.phase && data.sleep.phase !== 'awake') live.textContent = `AREM · ${data.sleep.phase}`;
      else if (data.sleep?.lastOutcome === 'error') live.textContent = 'Sleep review failed · will retry';
      else if (data.sleep?.organized === 'unavailable') live.textContent = 'Notes saved · file unavailable';
      else if (data.automaticSleep === true) live.textContent = data.sleep?.pending ? `Sleep on · ${data.sleep.pending} pending` : 'Sleep on · idle';
      else if (data.automaticSleep === false) live.textContent = 'Automatic sleep off';
      else live.textContent = 'Up to date';
    } catch {
      if (request !== sequence) return;
      live.textContent = 'Unavailable';
      if (!signature) {
        counts.textContent = 'Memory unavailable';
        canvas.textContent = 'Could not load AREM memory. Select refresh to try again.';
      }
    }
  }

  root.querySelector('#sgAremRefresh').addEventListener('click', () => void refresh());
  root.addEventListener('arem-refresh', () => void refresh());
  const timer = setInterval(() => {
    if (!root.isConnected) { clearInterval(timer); return; }
    void refresh();
  }, 10000);
  void refresh();
}
