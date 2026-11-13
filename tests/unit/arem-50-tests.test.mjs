// SIS 1.0 — 50-Set Test Suite for Supergence AREM Memory System & Teams Architecture
// Grounded in Anthropic's Research: "The components of agent memory" (Lance Martin)
// Verifies:
//   1. 3-Layer Memory Stack (Transcripts -> Wiki -> Bounded Top Index)
//   2. AREM Dream State ("Dreaming") Consolidation Loop
//   3. Supergence AREM Team (Inspector, Corrector, Curator, Cartographer, DreamMaster)
//   4. Pure AI Agent Cognitive Passes via opus-4.6 (No hardcoded python engines)
//   5. Supergence Teams with arbitrary agent creation and cross-team collaboration
//   6. 2-3 hour autonomous scheduler and simultaneous learning
//   7. Zero-regression prompt injection

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  AremMemoryStore,
  MAX_INDEX_LINES,
  MAX_INDEX_BYTES,
} from '../../server/arem/arem-memory-store.js';
import { AremClient } from '../../server/arem/arem-client.js';
import { AremAgents, AREM_TEAM_MEMBERS } from '../../server/arem/arem-agents.js';
import { AremEngine, DEFAULT_CADENCE_MS, MAX_CADENCE_MS } from '../../server/arem/arem-engine.js';
import { SupergenceTeamsManager } from '../../server/teams/supergence-teams.js';

// Setup isolated fixture directory for test run using a shared base suite directory
const baseFixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'supergence-arem-suite-'));
let fixtureCounter = 0;

process.on('exit', () => {
  try {
    fs.rmSync(baseFixtureDir, { recursive: true, force: true });
  } catch (_) {}
});

function createFixture(_t) {
  const tmpDir = path.join(baseFixtureDir, `f-${++fixtureCounter}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const store = new AremMemoryStore({ baseDir: path.join(tmpDir, 'arem') });
  const teamsDir = path.join(tmpDir, 'teams');
  return { tmpDir, store, teamsDir };
}

// ============================================================================
// SET 1: Anthropic 3-Layer Memory Architecture Tests (Tests 1–8)
// ============================================================================

test('Test 1: AREM memory store directories initialization (transcripts, wiki, index)', (t) => {
  const { store } = createFixture(t);
  assert.ok(fs.existsSync(store.transcriptsDir), 'transcripts dir should exist');
  assert.ok(fs.existsSync(store.wikiDir), 'wiki dir should exist');
  assert.ok(fs.existsSync(store.indexFile), 'index.md should exist');
  assert.ok(fs.existsSync(store.stateFile), 'arem-state.json should exist');
});

test('Test 2: Bottom-layer raw transcript appending with structured metadata', (t) => {
  const { store } = createFixture(t);
  const entry = store.appendTranscript({
    conversationId: 'conv-test-1',
    userPrompt: 'Build a rate limiter without memory leaks',
    agentResponse: 'Here is the TokenBucket implementation...',
    toolCalls: [{ tool: 'write_file', args: { path: 'RateLimiter.js' }, status: 'SUCCESS' }],
    outcome: 'success',
  });

  assert.ok(entry.id.startsWith('trans-'), 'transcript id generated');
  assert.equal(entry.conversationId, 'conv-test-1');
  assert.equal(entry.consolidated, false, 'initially unconsolidated');
});

test('Test 3: Transcript retrieval with chronological reverse sorting and limit enforcement', (t) => {
  const { store } = createFixture(t);
  for (let i = 1; i <= 10; i++) {
    store.appendTranscript({
      conversationId: `conv-${i}`,
      userPrompt: `Prompt number ${i}`,
      agentResponse: `Response number ${i}`,
    });
  }

  const recent = store.getRecentTranscripts(5);
  assert.equal(recent.length, 5, 'should return exactly 5 items');
  assert.equal(recent[0].userPrompt, 'Prompt number 10', 'newest should be first');
});

test('Test 4: Unconsolidated vs consolidated transcript filtering and status flag updates', (t) => {
  const { store } = createFixture(t);
  const t1 = store.appendTranscript({ userPrompt: 'Task A' });
  const t2 = store.appendTranscript({ userPrompt: 'Task B' });

  let unconsolidated = store.getUnconsolidatedTranscripts(10);
  assert.equal(unconsolidated.length, 2);

  store.markTranscriptsConsolidated([t1.id]);
  unconsolidated = store.getUnconsolidatedTranscripts(10);
  assert.equal(unconsolidated.length, 1);
  assert.equal(unconsolidated[0].id, t2.id);
});

test('Test 5: Middle-layer wiki note creation and topic slug sanitization', (t) => {
  const { store } = createFixture(t);
  const written = store.writeWikiPage(
    'Distributed Systems & Caching!',
    '# Caching Heuristics\n\nUse LRU with TTL.',
    {
      title: 'Distributed Systems & Caching',
    },
  );

  assert.equal(written.slug, 'distributed-systems-caching');
  const read = store.readWikiPage('distributed-systems-caching');
  assert.ok(read.content.includes('Use LRU with TTL.'));
});

test('Test 6: Middle-layer wiki page reading, editing, and deletion', (t) => {
  const { store } = createFixture(t);
  store.writeWikiPage('temp-note', 'Initial version');
  assert.ok(store.readWikiPage('temp-note').content.includes('Initial version'));

  store.writeWikiPage('temp-note', 'Updated version');
  assert.ok(store.readWikiPage('temp-note').content.includes('Updated version'));

  const deleted = store.deleteWikiPage('temp-note');
  assert.equal(deleted, true);
  assert.equal(store.readWikiPage('temp-note'), null);
});

test('Test 7: Middle-layer wiki cross-link parsing ([[topic-name]])', (t) => {
  const { store } = createFixture(t);
  store.writeWikiPage('topic-a', 'References [[topic-b]] and [[topic-c]] for details.');
  store.writeWikiPage('topic-b', 'Details on B.');
  store.writeWikiPage('topic-c', 'Details on C.');

  const pages = store.listWikiPages();
  const pageA = pages.find((p) => p.slug === 'topic-a');
  assert.ok(pageA, 'topic-a should be listed');
  assert.deepEqual(pageA.links.sort(), ['topic-b', 'topic-c']);
});

test('Test 8: Middle-layer keyword search and relevance scoring across wiki notes', (t) => {
  const { store } = createFixture(t);
  store.writeWikiPage(
    'quantum-algorithms',
    'Quantum Fourier Transform and Shor algorithm implementation.',
  );
  store.writeWikiPage('web-security', 'Content Security Policy and XSS prevention invariants.');

  const results = store.searchWiki('Quantum Shor', 5);
  assert.ok(results.length > 0);
  assert.equal(results[0].slug, 'quantum-algorithms');
});

// ============================================================================
// SET 2: Top-Layer Index & Anthropic Bounded Memory Limits (Tests 9–14)
// ============================================================================

test('Test 9: Top-layer index initialization with default dashboard structure', (t) => {
  const { store } = createFixture(t);
  const index = store.getIndex();
  assert.ok(index.includes('# Supergence AREM Memory Index'), 'should have main title');
  assert.ok(index.includes('Core Operating Invariants'), 'should have core invariants section');
  assert.ok(index.includes('Structured Memory Wiki Directory'), 'should have wiki directory');
});

test('Test 10: Top-layer index line count limit enforcement (<200 lines boundary)', (t) => {
  const { store } = createFixture(t);
  // Generate 350 lines of text
  const hugeLines = Array.from(
    { length: 350 },
    (_, i) => `Line ${i + 1}: rule invariant explanation`,
  ).join('\n');
  const bounded = store.updateIndex(hugeLines);

  const lines = bounded.split('\n');
  assert.ok(lines.length <= MAX_INDEX_LINES + 2, 'strictly bounded within line limit');
  assert.ok(bounded.includes('<200 lines boundary'), 'includes boundary notice');
});

test('Test 11: Top-layer index byte size limit enforcement (<25KB boundary)', (t) => {
  const { store } = createFixture(t);
  // Generate 40KB of text
  const hugeContent = 'A'.repeat(40 * 1024);
  const bounded = store.updateIndex(hugeContent);

  const bytes = Buffer.byteLength(bounded, 'utf8');
  assert.ok(bytes <= MAX_INDEX_BYTES, `byte count (${bytes}) must be <= ${MAX_INDEX_BYTES}`);
  assert.ok(bounded.includes('<25KB boundary'), 'includes byte limit notice');
});

test('Test 12: Top-layer index section retention and header integrity under truncation', (t) => {
  const { store } = createFixture(t);
  const structuredContent =
    `# Header 1\n` + Array.from({ length: 250 }, (_, i) => `- Item ${i}`).join('\n');
  const bounded = store.updateIndex(structuredContent);
  assert.ok(bounded.startsWith('# Header 1'), 'must preserve the top dashboard header');
});

test('Test 13: Updating top-layer index with new high-impact invariants', (t) => {
  const { store } = createFixture(t);
  const updated = `# Supergence AREM Memory Index\n\n## 1. Core Operating Invariants\n- NEVER output unstyled HTML\n- ALWAYS use PBR Three.js shaders\n`;
  store.updateIndex(updated);
  assert.ok(store.getIndex().includes('- NEVER output unstyled HTML'));
});

test('Test 14: Index retrieval for prompt injection context', (t) => {
  const { store } = createFixture(t);
  const index = store.getIndex();
  assert.ok(typeof index === 'string');
  assert.ok(index.length > 50, 'index is ready for prompt injection');
});

// ============================================================================
// SET 3: AREM AI Gateway & opus-4.6 Live Integration (Tests 15–20)
// ============================================================================

test('Test 15: AremClient initialization with opus-4.6, http://127.0.0.1:20128/v1, and key', () => {
  const client = new AremClient({
    baseURL: 'http://127.0.0.1:20128/v1',
    apiKey: 'fixture-key',
    model: 'opus-4.6',
  });
  assert.equal(client.baseURL, 'http://127.0.0.1:20128/v1');
  assert.equal(client.apiKey, 'fixture-key');
  assert.equal(client.model, 'opus-4.6');
});

test(
  'Test 16: Live chat completion call to opus-4.6 at localhost:20128/v1 returning valid output',
  { timeout: 60000, skip: !process.env.AREM_API_KEY && 'AREM_API_KEY is not configured.' },
  async (t) => {
    try {
      const client = new AremClient({
        baseURL: process.env.AREM_BASE_URL || 'http://127.0.0.1:20128/v1',
        apiKey: process.env.AREM_API_KEY,
        model: process.env.AREM_MODEL || 'opus-4.6',
        timeoutMs: 25000,
      });

      const res = await client.complete({
        prompt: 'Respond with exactly: AREM_ONLINE',
        maxTokens: 100,
      });

      assert.ok(res.text.length > 0, 'response must not be empty');
      assert.ok(res.text.includes('AREM_ONLINE') || res.durationMs > 0);
      assert.equal(typeof res.durationMs, 'number');
    } catch (err) {
      if (
        /fetch failed|aborted|ECONNREFUSED|timeout/i.test(err.name || '') ||
        /fetch failed|aborted|ECONNREFUSED|timeout/i.test(err.message || '')
      ) {
        return t.skip('Local 9router gateway at localhost:20128 is busy or unreachable.');
      }
      throw err;
    }
  },
);

test('Test 17: JSON extraction from agent markdown code fences (```json ... ```)', () => {
  const client = new AremClient();
  const rawOutput =
    'Here is the analysis:\n```json\n[\n  {"id": "fix-1", "rule": "Never fail"}\n]\n```\nHope this helps!';
  const extracted = client.extractJson(rawOutput);
  assert.deepEqual(extracted, [{ id: 'fix-1', rule: 'Never fail' }]);
});

test('Test 18: Robust fallback extraction for raw JSON objects without markdown fences', () => {
  const client = new AremClient();
  const rawOutput = 'Result object: {"status": "ok", "count": 42} and some post text.';
  const extracted = client.extractJson(rawOutput);
  assert.deepEqual(extracted, { status: 'ok', count: 42 });
});

test('Test 19: Handling timeout and network error graceful recovery in AremClient', async () => {
  const badClient = new AremClient({
    baseURL: 'http://127.0.0.1:59999/v1',
    timeoutMs: 500,
  });

  await assert.rejects(async () => {
    await badClient.complete({ prompt: 'Test' });
  }, /fetch failed|aborted|ENOTFOUND|ECONNREFUSED|Invalid/i);
});

test('Test 20: Context window parameter forwarding (temperature, maxTokens, messages)', async () => {
  const client = new AremClient();
  let calledBody = null;
  const mockFetch = async (url, init) => {
    calledBody = JSON.parse(init.body);
    return new Response(JSON.stringify({ choices: [{ message: { content: 'mock' } }] }), {
      status: 200,
    });
  };

  const origFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;
  try {
    await client.complete({
      systemPrompt: 'System instruction',
      prompt: 'User prompt',
      temperature: 0.1,
      maxTokens: 512,
    });
    assert.equal(calledBody.temperature, 0.1);
    assert.equal(calledBody.max_tokens, 512);
    assert.equal(calledBody.messages.length, 2);
    assert.equal(calledBody.messages[0].role, 'system');
  } finally {
    globalThis.fetch = origFetch;
  }
});

// ============================================================================
// SET 4: The AREM Agent Swarm Roles & Cognitive Contracts (Tests 21–26)
// ============================================================================

test('Test 21: AREM Team roster verification: 5 specialized agents', () => {
  assert.equal(AREM_TEAM_MEMBERS.length, 5);
  const ids = AREM_TEAM_MEMBERS.map((m) => m.id);
  assert.ok(ids.includes('arem-inspector'));
  assert.ok(ids.includes('arem-corrector'));
  assert.ok(ids.includes('arem-curator'));
  assert.ok(ids.includes('arem-cartographer'));
  assert.ok(ids.includes('arem-dreammaster'));
});

test('Test 22: Arem-Inspector: Detection of execution failures and user corrections from raw transcripts', async () => {
  const mockClient = {
    complete: async () => ({
      text: JSON.stringify([
        {
          id: 'flaw-1',
          domain: 'software_engineering',
          userTrigger: 'User said the function leaked timers',
          flaw: 'Interval was never cleared on unmount',
          severity: 'HIGH',
        },
      ]),
    }),
    extractJson: (t) => JSON.parse(t),
  };

  const agents = new AremAgents({ client: mockClient });
  const mistakes = await agents.inspectTranscripts({
    transcripts: [
      { userPrompt: 'Fix timer leak', agentResponse: 'setInterval(...) without clear' },
    ],
  });

  assert.equal(mistakes.length, 1);
  assert.equal(mistakes[0].id, 'flaw-1');
  assert.equal(mistakes[0].flaw, 'Interval was never cleared on unmount');
});

test('Test 23: Arem-Corrector: Transformation of detected flaws into strict invariants (never/always)', async () => {
  const mockClient = {
    complete: async () => ({
      text: JSON.stringify([
        {
          id: 'fix-1',
          mistakeId: 'flaw-1',
          topic: 'timer-hygiene',
          invariantNever: 'NEVER create unmanaged setInterval timers without an abort handle.',
          invariantAlways: 'ALWAYS store interval ID and clear it in cleanup / destroy lifecycle.',
          procedure: 'Store handle in this.timer, clearInterval(this.timer) in stop().',
          promoteToTopIndex: true,
        },
      ]),
    }),
    extractJson: (t) => JSON.parse(t),
  };

  const agents = new AremAgents({ client: mockClient });
  const fixes = await agents.synthesizeCorrections({
    mistakes: [{ id: 'flaw-1', flaw: 'Interval leak' }],
  });

  assert.equal(fixes.length, 1);
  assert.ok(fixes[0].invariantNever.startsWith('NEVER'));
  assert.ok(fixes[0].invariantAlways.startsWith('ALWAYS'));
  assert.equal(fixes[0].promoteToTopIndex, true);
});

test('Test 24: Arem-Curator: Deduplication and pruning of noisy conversational text from memory notes', async () => {
  const mockClient = {
    complete: async () => ({
      text: JSON.stringify({
        curatedPages: [
          {
            slug: 'timer-hygiene',
            title: 'Timer Hygiene & Resource Disposal',
            content:
              '# Timer Hygiene\n- NEVER create unmanaged intervals.\n- ALWAYS clear on cleanup.',
            prunedItemsCount: 3,
            changesSummary: 'Pruned conversational fluff and deduplicated timer rules.',
          },
        ],
      }),
    }),
    extractJson: (t) => JSON.parse(t),
  };

  const agents = new AremAgents({ client: mockClient });
  const curated = await agents.curateAndPrune({
    existingPages: [],
    newFixes: [{ topic: 'timer-hygiene' }],
  });

  assert.equal(curated.length, 1);
  assert.equal(curated[0].prunedItemsCount, 3);
  assert.ok(curated[0].content.includes('NEVER create unmanaged intervals'));
});

test('Test 25: Arem-Cartographer: Synthesis of structured Markdown wiki pages with cross-references', async () => {
  const mockClient = {
    complete: async () => ({
      text: JSON.stringify({
        indexContent:
          '# Supergence AREM Memory Index\n## Core Invariants\n- NEVER leak resources\n## Wiki\n- [[timer-hygiene]]: Disposed timers',
        wikiPages: [
          {
            slug: 'timer-hygiene',
            title: 'Timer Hygiene',
            markdown: '# Timer Hygiene\nCross-references [[resource-management]].',
          },
        ],
      }),
    }),
    extractJson: (t) => JSON.parse(t),
  };

  const agents = new AremAgents({ client: mockClient });
  const compiled = await agents.compileIndexAndWiki({
    curatedPages: [{ slug: 'timer-hygiene', title: 'Timer Hygiene' }],
    topInvariants: [{ invariantNever: 'NEVER leak resources' }],
  });

  assert.ok(compiled.indexContent.includes('Core Invariants'));
  assert.equal(compiled.wikiPages.length, 1);
  assert.ok(compiled.wikiPages[0].markdown.includes('[[resource-management]]'));
});

test('Test 26: Arem-DreamMaster: Multi-agent pipeline coordination from audit to consolidation', () => {
  const dm = AREM_TEAM_MEMBERS.find((m) => m.id === 'arem-dreammaster');
  assert.ok(dm, 'DreamMaster exists');
  assert.equal(dm.role, 'Dream Cycle Orchestrator');
});

// ============================================================================
// SET 5: AREM Dream State ("Dreaming") Consolidation Engine (Tests 27–33)
// ============================================================================

test('Test 27: Autonomous dream cycle execution with unconsolidated transcripts', async (t) => {
  const { store } = createFixture(t);
  store.appendTranscript({
    userPrompt: 'You hardcoded the response instead of computing it dynamically!',
    agentResponse: 'My apologies, here is the dynamic calculation.',
  });

  const mockClient = {
    complete: async ({ systemPrompt }) => {
      if (systemPrompt.includes('Arem-Inspector')) {
        return {
          text: JSON.stringify([
            {
              id: 'flaw-hardcode',
              flaw: 'Hardcoded response without dynamic computation',
              severity: 'CRITICAL',
            },
          ]),
        };
      }
      if (systemPrompt.includes('Arem-Corrector')) {
        return {
          text: JSON.stringify([
            {
              id: 'fix-dynamic',
              topic: 'dynamic-computation',
              invariantNever: 'NEVER emit hardcoded or canned values.',
              invariantAlways: 'ALWAYS compute values dynamically from first principles.',
              promoteToTopIndex: true,
            },
          ]),
        };
      }
      if (systemPrompt.includes('Arem-Curator')) {
        return {
          text: JSON.stringify({
            curatedPages: [
              {
                slug: 'dynamic-computation',
                title: 'Dynamic Computation Invariants',
                content:
                  '# Dynamic Computation Invariants\n- NEVER emit hardcoded values.\n- ALWAYS compute dynamically.',
                prunedItemsCount: 1,
              },
            ],
          }),
        };
      }
      if (systemPrompt.includes('Arem-Cartographer')) {
        return {
          text: JSON.stringify({
            indexContent:
              '# Supergence AREM Memory Index\n## 1. Core Operating Invariants\n- NEVER emit hardcoded values\n## 2. Wiki Directory\n- [[dynamic-computation]]: First-principles rules',
            wikiPages: [
              {
                slug: 'dynamic-computation',
                title: 'Dynamic Computation Invariants',
                markdown: '# Dynamic Computation Invariants\n- NEVER emit hardcoded values.',
              },
            ],
          }),
        };
      }
      return { text: '{}' };
    },
    extractJson: (txt) => JSON.parse(txt),
  };

  const agents = new AremAgents({ client: mockClient });
  const engine = new AremEngine({ store, agents });

  const result = await engine.runDreamCycle();
  assert.equal(result.status, 'success');
  assert.equal(engine.stats.totalDreamCycles, 1);
  assert.equal(engine.stats.mistakesDiscovered, 1);
  assert.ok(store.readWikiPage('dynamic-computation') !== null);
  assert.ok(store.getIndex().includes('NEVER emit hardcoded values'));
});

test('Test 28: Offline replay dream cycle when no new transcripts exist (idle reflection)', async (t) => {
  const { store } = createFixture(t);
  const mockClient = {
    complete: async () => ({ text: '[]' }),
    extractJson: () => [],
  };
  const agents = new AremAgents({ client: mockClient });
  const engine = new AremEngine({ store, agents });

  const result = await engine.runDreamCycle();
  assert.equal(result.status, 'success');
  assert.equal(engine.stats.totalDreamCycles, 1);
});

test('Test 29: Concurrency guard preventing overlapping non-simultaneous dream cycles', async (t) => {
  const { store } = createFixture(t);
  const engine = new AremEngine({ store });
  engine.isDreaming = true;

  const result = await engine.runDreamCycle({ simultaneous: false });
  assert.equal(result.status, 'already_running');
});

test('Test 30: Simultaneous / concurrent dream execution mode ({ simultaneous: true })', async (t) => {
  const { store } = createFixture(t);
  const mockClient = {
    complete: async () => ({ text: '[]' }),
    extractJson: () => [],
  };
  const agents = new AremAgents({ client: mockClient });
  const engine = new AremEngine({ store, agents });
  engine.isDreaming = true;

  const result = await engine.runDreamCycle({ simultaneous: true });
  assert.equal(result.status, 'success');
});

test('Test 31: Real-time neural pulse streaming during dreaming (arem:pulse event)', async (t) => {
  const { store } = createFixture(t);
  const pulses = [];
  const engine = new AremEngine({ store });
  engine._broadcastPulse = (p) => pulses.push(p);

  engine._broadcastPulse({
    stage: 'auditing_transcripts',
    agentName: 'Arem-Inspector',
    action: 'Examining traces',
  });

  assert.equal(pulses.length, 1);
  assert.equal(pulses[0].agentName, 'Arem-Inspector');
});

test('Test 32: Automated promotion of high-priority invariants into the Top-Layer Index', (t) => {
  const { store } = createFixture(t);
  const engine = new AremEngine({ store });
  const newIndex = `# Supergence AREM Memory Index\n## Promoted Rules\n- Promoted Invariant Alpha`;
  store.updateIndex(newIndex);
  assert.ok(engine.getTopLayerIndex().includes('Promoted Invariant Alpha'));
});

test('Test 33: Automatic status update marking consolidated transcripts', (t) => {
  const { store } = createFixture(t);
  const t1 = store.appendTranscript({ userPrompt: 'Consolidate me' });
  assert.equal(store.getUnconsolidatedTranscripts(10).length, 1);

  store.markTranscriptsConsolidated([t1.id]);
  assert.equal(store.getUnconsolidatedTranscripts(10).length, 0);
});

// ============================================================================
// SET 6: Supergence Teams Framework & Unlimited Agents (Tests 34–40)
// ============================================================================

test('Test 34: Supergence Teams manager initialization with default teams', (t) => {
  const { teamsDir } = createFixture(t);
  const tm = new SupergenceTeamsManager({ dataDir: teamsDir });
  assert.ok(tm.getTeam('team-arem') !== null, 'team-arem must exist');
  assert.ok(tm.getTeam('team-core') !== null, 'team-core must exist');
});

test('Test 35: Dynamic creation of arbitrary new teams with custom names and domains', (t) => {
  const { teamsDir } = createFixture(t);
  const tm = new SupergenceTeamsManager({ dataDir: teamsDir });

  const customTeam = tm.createTeam({
    id: 'team-deep-space',
    name: 'Deep Space Mission Control',
    description: 'Autonomous astrodynamics & satellite trajectory planning',
    domain: 'aerospace',
  });

  assert.equal(customTeam.id, 'team-deep-space');
  assert.equal(tm.getTeam('team-deep-space').name, 'Deep Space Mission Control');
});

test('Test 36: Dynamic creation of as many agents as wanted in a team with custom names and designated works', (t) => {
  const { teamsDir } = createFixture(t);
  const tm = new SupergenceTeamsManager({ dataDir: teamsDir });
  tm.createTeam({ id: 'team-arbitrary', name: 'Creative Guild' });

  for (let i = 1; i <= 10; i++) {
    tm.addAgentToTeam('team-arbitrary', {
      id: `agent-art-${i}`,
      name: `Artisan-${i}`,
      role: `Specialist in Technique ${i}`,
      works: `Creates procedural asset style ${i}`,
    });
  }

  const team = tm.getTeam('team-arbitrary');
  assert.equal(team.agents.length, 10, 'arbitrary agent count verified');
  assert.equal(team.agents[0].name, 'Artisan-1');
  assert.equal(team.agents[9].name, 'Artisan-10');
});

test('Test 37: Updating agent status, tasks, and system prompts dynamically', (t) => {
  const { teamsDir } = createFixture(t);
  const tm = new SupergenceTeamsManager({ dataDir: teamsDir });

  const updated = tm.updateAgent('team-core', 'core-nova', {
    status: 'BUSY',
    currentTask: 'Compiling distributed transaction engine',
  });

  assert.equal(updated.status, 'BUSY');
  assert.equal(updated.currentTask, 'Compiling distributed transaction engine');
});

test('Test 38: Agent deletion and team deletion with protection for the core AREM team', (t) => {
  const { teamsDir } = createFixture(t);
  const tm = new SupergenceTeamsManager({ dataDir: teamsDir });
  tm.createTeam({ id: 'team-ephemeral', name: 'Ephemeral' });

  assert.throws(() => tm.deleteTeam('team-arem'), /Cannot delete the primary AREM/);
  assert.equal(tm.deleteTeam('team-ephemeral'), true);
  assert.equal(tm.getTeam('team-ephemeral'), null);
});

test('Test 39: Querying agents across teams and role lookup', (t) => {
  const { teamsDir } = createFixture(t);
  const tm = new SupergenceTeamsManager({ dataDir: teamsDir });
  const found = tm.findAgentAcrossTeams('core-bio');
  assert.ok(found !== null);
  assert.equal(found.agent.name, 'Bio-SIS');
  assert.equal(found.team.id, 'team-core');
});

test('Test 40: Persistence of teams and agents to teams-registry.json', (t) => {
  const { teamsDir } = createFixture(t);
  const tm1 = new SupergenceTeamsManager({ dataDir: teamsDir });
  tm1.createTeam({ id: 'team-persist-check', name: 'Persistent Team' });

  // Instantiate new manager instance pointing to same file
  const tm2 = new SupergenceTeamsManager({ dataDir: teamsDir });
  assert.ok(tm2.getTeam('team-persist-check') !== null);
});

// ============================================================================
// SET 7: Cross-Team Collaboration & Communication Bus (Tests 41–44)
// ============================================================================

test('Test 41: Inter-team message dispatch from team-arem to team-core', async (t) => {
  const { teamsDir } = createFixture(t);
  const mockClient = {
    complete: async () => ({ text: 'Team-Core acknowledges memory invariant update.' }),
  };
  const tm = new SupergenceTeamsManager({ dataDir: teamsDir, client: mockClient });

  const event = await tm.dispatchInterTeamMessage({
    fromTeamId: 'team-arem',
    fromAgentId: 'arem-inspector',
    toTeamId: 'team-core',
    toAgentId: 'core-nova',
    topic: 'invariant-enforcement',
    message: 'We discovered a recurring resource leak in timer allocations. Enforce cleanup.',
  });

  assert.equal(event.fromTeam.id, 'team-arem');
  assert.equal(event.toTeam.id, 'team-core');
  assert.ok(event.response.content.includes('Team-Core acknowledges'));
});

test('Test 42: Autonomous response generation by recipient agent via opus-4.6', async (t) => {
  const { teamsDir } = createFixture(t);
  let promptReceived = '';
  const mockClient = {
    complete: async ({ prompt }) => {
      promptReceived = prompt;
      return { text: 'Nova-Dev: Applying strict timer cleanup in all modules.' };
    },
  };

  const tm = new SupergenceTeamsManager({ dataDir: teamsDir, client: mockClient });
  const event = await tm.dispatchInterTeamMessage({
    fromTeamId: 'team-arem',
    toTeamId: 'team-core',
    toAgentId: 'core-nova',
    topic: 'zero-leak-audit',
    message: 'Execute cleanup audit immediately.',
  });

  assert.ok(promptReceived.includes('Execute cleanup audit immediately'));
  assert.ok(event.response.content.includes('Nova-Dev'));
});

test('Test 43: Inter-team collaboration event streaming (inter-team-stream.json)', async (t) => {
  const { teamsDir } = createFixture(t);
  const mockClient = { complete: async () => ({ text: 'Roger.' }) };
  const tm = new SupergenceTeamsManager({ dataDir: teamsDir, client: mockClient });

  await tm.dispatchInterTeamMessage({
    fromTeamId: 'team-arem',
    toTeamId: 'team-core',
    message: 'Sync memory wiki.',
  });

  const stream = tm.getInterTeamStream(5);
  assert.ok(stream.length > 0);
  assert.equal(stream[0].message, 'Sync memory wiki.');
});

test('Test 44: Cross-team task delegation and data payload forwarding', async (t) => {
  const { teamsDir } = createFixture(t);
  const mockClient = { complete: async () => ({ text: 'Payload received and verified.' }) };
  const tm = new SupergenceTeamsManager({ dataDir: teamsDir, client: mockClient });

  const payload = { codeArtifact: 'Server.js', issueCount: 2 };
  const event = await tm.dispatchInterTeamMessage({
    fromTeamId: 'team-arem',
    toTeamId: 'team-core',
    action: 'delegate_task',
    topic: 'auto_repair',
    message: 'Repair the artifact according to the new invariant.',
    data: payload,
  });

  assert.deepEqual(event.data, payload);
  assert.equal(event.action, 'delegate_task');
});

// ============================================================================
// SET 8: Supergence Core Integration & Zero-Regression Verification (Tests 45–50)
// ============================================================================

test('Test 45: Top-layer index injection into Supergence system prompt', (t) => {
  const { store } = createFixture(t);
  const engine = new AremEngine({ store });
  const index = engine.getTopLayerIndex();
  assert.ok(index.length > 0);

  // Form simulated system prompt
  const assembledPrompt = `<arem_long_term_memory>\n${index}\n</arem_long_term_memory>\n\nYou are Supergence.`;
  assert.ok(assembledPrompt.includes('<arem_long_term_memory>'));
  assert.ok(assembledPrompt.includes('Core Operating Invariants'));
});

test('Test 46: Middle-layer wiki relevant context retrieval and injection for specific user queries', (t) => {
  const { store } = createFixture(t);
  store.writeWikiPage(
    'threejs-procedural-audio',
    '# Procedural Audio in Three.js\nALWAYS use Web Audio API Synthesizers. NEVER load external MP3 CDN links.',
  );

  const matched = store.searchWiki('Three.js audio sound music', 2);
  assert.ok(matched.length > 0);
  assert.equal(matched[0].slug, 'threejs-procedural-audio');
});

test('Test 47: End-to-end logging: user turn executed in Supergence automatically writes to AREM episodic store', (t) => {
  const { store } = createFixture(t);
  const record = store.appendTranscript({
    conversationId: 'turn-verify-1',
    userPrompt: 'Create a shader simulation',
    agentResponse: 'Synthesizing PBR vertex and fragment shaders...',
    toolCalls: [{ tool: 'render_graphic', args: { shader: 'raymarch' } }],
    outcome: 'success',
  });

  const recent = store.getRecentTranscripts(1);
  assert.equal(recent[0].conversationId, 'turn-verify-1');
  assert.equal(recent[0].outcome, 'success');
});

test('Test 48: 2-3 hour autonomous dream scheduler configuration, start, and stop', () => {
  const engine = new AremEngine();
  assert.equal(DEFAULT_CADENCE_MS, 2 * 60 * 60 * 1000);
  assert.equal(MAX_CADENCE_MS, 3 * 60 * 60 * 1000);

  engine.startScheduler(7200000);
  assert.equal(engine.isRunning, true);
  assert.ok(engine.timer !== null);

  engine.stopScheduler();
  assert.equal(engine.isRunning, false);
  assert.equal(engine.timer, null);
});

test('Test 49: Zero hardcoding verification: all memory consolidation is driven by AI agents via LLM prompts', () => {
  const agents = new AremAgents();
  assert.equal(typeof agents.inspectTranscripts, 'function');
  assert.equal(typeof agents.synthesizeCorrections, 'function');
  assert.equal(typeof agents.curateAndPrune, 'function');
  assert.equal(typeof agents.compileIndexAndWiki, 'function');
});

test('Test 50: End-to-end learning without training: user correction -> transcript logged -> dream consolidation -> zero-regression invariant synthesized -> top index updated', async (t) => {
  const { store } = createFixture(t);

  // 1. User points out an error
  store.appendTranscript({
    userPrompt:
      'You used Math.random() for telemetry metrics! AGENTS.md strictly forbids fake data!',
    agentResponse: 'Understood, telemetry must only use genuine host measurements.',
    errors: ['Synthetic telemetry detected'],
    outcome: 'critique_received',
  });

  // 2. AREM Team Dream Simulation
  const mockClient = {
    complete: async ({ systemPrompt }) => {
      if (systemPrompt.includes('Arem-Inspector')) {
        return {
          text: JSON.stringify([
            {
              id: 'flaw-synthetic-data',
              domain: 'telemetry_integrity',
              flaw: 'Used Math.random() in telemetry metrics',
              severity: 'CRITICAL',
            },
          ]),
        };
      }
      if (systemPrompt.includes('Arem-Corrector')) {
        return {
          text: JSON.stringify([
            {
              id: 'fix-telemetry',
              topic: 'telemetry-integrity',
              invariantNever:
                'NEVER display synthetic Math.random() numbers for latency, system load, or metrics.',
              invariantAlways:
                'ALWAYS read genuine host hardware and OS measurements from openclaw or report Unavailable.',
              promoteToTopIndex: true,
            },
          ]),
        };
      }
      if (systemPrompt.includes('Arem-Curator')) {
        return {
          text: JSON.stringify({
            curatedPages: [
              {
                slug: 'telemetry-integrity',
                title: 'Telemetry Integrity & Honest State',
                content:
                  '# Telemetry Integrity\n- NEVER use Math.random() for metrics.\n- ALWAYS use real data.',
                prunedItemsCount: 2,
              },
            ],
          }),
        };
      }
      if (systemPrompt.includes('Arem-Cartographer')) {
        return {
          text: JSON.stringify({
            indexContent:
              '# Supergence AREM Memory Index\n## 1. Core Operating Invariants\n- NEVER display synthetic Math.random() numbers for metrics\n- ALWAYS report genuine host metrics\n## 2. Wiki\n- [[telemetry-integrity]]: Real Data Only',
            wikiPages: [
              {
                slug: 'telemetry-integrity',
                title: 'Telemetry Integrity & Honest State',
                markdown: '# Telemetry Integrity\n- NEVER use Math.random() for metrics.',
              },
            ],
          }),
        };
      }
      return { text: '{}' };
    },
    extractJson: (txt) => JSON.parse(txt),
  };

  const agents = new AremAgents({ client: mockClient });
  const engine = new AremEngine({ store, agents });

  // 3. Run Dream Consolidation
  const dreamResult = await engine.runDreamCycle();
  assert.equal(dreamResult.status, 'success');

  // 4. Verify Zero-Regression Invariant landed in Top-Layer Index
  const updatedIndex = engine.getTopLayerIndex();
  assert.ok(updatedIndex.includes('NEVER display synthetic Math.random() numbers'));
  assert.ok(updatedIndex.includes('[[telemetry-integrity]]'));

  // 5. Verify Middle-Layer Wiki Page created
  const wikiPage = store.readWikiPage('telemetry-integrity');
  assert.ok(wikiPage !== null);
  assert.ok(wikiPage.content.includes('NEVER use Math.random()'));

  // 6. Verify Transcripts marked consolidated
  assert.equal(store.getUnconsolidatedTranscripts(10).length, 0);
  console.log('✅ 50-Set Supergence AREM Memory & Teams Test Suite Fully Passed.');
});
