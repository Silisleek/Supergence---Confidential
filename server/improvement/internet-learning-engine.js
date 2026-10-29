// SIS 1.0 — Autonomous Internet Learning Engine
// Continuously scours the live internet for cutting-edge best practices, documentation, and technical paradigms
// based on what the user uses SIS for most.
// Assimilates findings directly into Long-Term Memory, Knowledge Graph, and Autonomous Operational Rules.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import toolRegistry from '../tools/registry.js';
import longTermMemory from '../memory/long-term.js';
import knowledgeGraph, { RELATION_TYPES } from '../memory/knowledge-graph.js';
import userFocusTracker from './user-focus-tracker.js';
import autonomousRulesEngine from '../orchestrator/autonomous-rules-engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = process.env.SIS_DATA_DIR
  ? path.join(path.resolve(process.env.SIS_DATA_DIR), 'improvement/internet-learning-state.json')
  : path.join(__dirname, '../../data/improvement/internet-learning-state.json');

export class InternetLearningEngine {
  constructor() {
    this.name = 'Autonomous Internet Learning Engine';
    this.version = '1.0';
    this.broadcast = null;
    this.intervalId = null;
    this.isSearching = false;
    this.lastLearnedTopic = null;

    this.state = {
      totalSearchesExecuted: 0,
      totalInsightsAssimilated: 0,
      rulesFormulatedFromWeb: 0,
      lastCycleTimestamp: null,
      learnedTopics: [],
    };

    this._loadState();
  }

  setBroadcast(fn) {
    this.broadcast = fn;
  }

  setBrain(b) {
    this.brain = b;
  }

  async initialize() {
    this._loadState();
    return { initialized: true, state: this.state };
  }

  _loadState() {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const raw = fs.readFileSync(STATE_FILE, 'utf8');
        this.state = { ...this.state, ...JSON.parse(raw) };
      }
    } catch {}
  }

  _saveState() {
    try {
      const dir = path.dirname(STATE_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2), 'utf8');
    } catch {}
  }

  /**
   * Start 24/7 background autonomous web learning loop
   */
  start(intervalMs = 4 * 60 * 1000) {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      this.runAutonomousCycle().catch((e) => {
        console.warn('[InternetLearningEngine] Background cycle notice:', e.message);
      });
    }, intervalMs);
    console.log(
      `[InternetLearningEngine] Started 24/7 web learning loop (Interval: ${intervalMs / 1000}s)`,
    );
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Formulate high-value search queries based on what the user uses SIS for most
   */
  generateCurriculumQueries() {
    const dominantDomain = userFocusTracker.getTopDomain?.() || 'coding';
    const topKeywords = Object.entries(userFocusTracker.profile?.topKeywords || {})
      .sort((a, b) => b[1] - a[1])
      .map((e) => e[0])
      .slice(0, 5);

    const queries = [];

    if (
      dominantDomain === '3d' ||
      topKeywords.some((k) => ['game', 'three', 'world', 'blender'].includes(k))
    ) {
      queries.push({
        domain: '3d',
        query: 'three.js r160 performance optimization instancedMesh procedural terrain lighting',
        topic: 'Three.js High-Performance Open World Terrain & Foliage',
      });
      queries.push({
        domain: '3d',
        query: 'javascript 3d game engine collision detection spatial hashing octave noise',
        topic: 'Spatial Hashing & Perlin Noise for Procedural 3D Worlds',
      });
    }

    if (
      dominantDomain === 'coding' ||
      topKeywords.some((k) => ['code', 'bug', 'test', 'docker', 'api'].includes(k))
    ) {
      queries.push({
        domain: 'coding',
        query:
          'modern nodejs 22 performance best practices async local storage memory leak prevention',
        topic: 'Node.js 22 Production Asynchronous Memory Isolation',
      });
      queries.push({
        domain: 'coding',
        query: 'distributed systems raft consensus split brain recovery best practices',
        topic: 'Raft Consensus Split-Brain Mitigation Strategies',
      });
    }

    if (
      dominantDomain === 'systems' ||
      topKeywords.some((k) => ['distributed', 'database', 'ipc'].includes(k))
    ) {
      queries.push({
        domain: 'systems',
        query: 'lock-free ring buffer concurrency circular buffer atomic pointers memory barrier',
        topic: 'Lock-Free High-Throughput Ring Buffer Patterns',
      });
    }

    if (queries.length === 0) {
      queries.push({
        domain: 'coding',
        query: 'frontier ai agent software engineering automated test repair self-healing',
        topic: 'Frontier AI Coding Agents & Self-Healing Harnesses',
      });
    }

    return queries;
  }

  /**
   * Run a complete autonomous internet learning cycle
   */
  async runAutonomousCycle() {
    if (this.isSearching) return;
    this.isSearching = true;

    try {
      const curriculum = this.generateCurriculumQueries();
      const target = curriculum[Math.floor(Math.random() * curriculum.length)];

      console.log(
        `\n🌐 [InternetLearningEngine] Autonomous Web Cycle: Researching "${target.topic}" (${target.domain})...`,
      );
      if (this.broadcast) {
        this.broadcast('internet-learning-status', {
          status: 'searching',
          topic: target.topic,
          query: target.query,
          domain: target.domain,
        });
      }

      // Execute live web search
      const searchRes = await Promise.race([
        toolRegistry.execute('web_search', { query: target.query }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Search timeout')), 6000)),
      ]);

      if (!searchRes || !searchRes.results || searchRes.results.length === 0) {
        console.log('[InternetLearningEngine] No live web search results returned.');
        this.isSearching = false;
        return;
      }

      const results = searchRes.results.slice(0, 3);
      const synthesizedKnowledge = results.map((r) => `• ${r.title}: ${r.snippet}`).join('\n');

      // 1. Assimilate into Long-Term Memory
      longTermMemory.store(
        ['research', 'web-learning', target.domain],
        {
          topic: target.topic,
          query: target.query,
          findings: synthesizedKnowledge,
          sources: results.map((r) => ({ title: r.title, url: r.url })),
          learnedAt: Date.now(),
        },
        'internet-learning-engine',
      );

      // 2. Weave into Knowledge Graph
      const kgNodeId = `web_${target.domain}_${Date.now()}`;
      knowledgeGraph.addNode(kgNodeId, target.topic, 'web-insight', {
        domain: target.domain,
        source: 'live-internet-search',
        query: target.query,
      });

      // 3. Autonomously Formulate an Operational Rule if high-impact insight discovered
      const ruleDirective = `When working on ${target.domain} (${target.topic}), incorporate verified web best practices: ${results[0].snippet.slice(0, 160)}.`;
      const ruleSlug = `rule_web_${target.domain}_${target.topic
        .slice(0, 25)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')}`;

      autonomousRulesEngine.addRule({
        id: ruleSlug,
        title: `Web-Learned: ${target.topic}`,
        directive: ruleDirective,
        rationale: `Autonomously learned from live internet search on "${target.query}"`,
        source: 'web_research',
        domain: target.domain,
        triggers: [
          target.domain,
          ...target.topic
            .toLowerCase()
            .split(' ')
            .filter((w) => w.length > 3),
        ],
        weight: 0.92,
      });

      this.state.totalSearchesExecuted++;
      this.state.totalInsightsAssimilated++;
      this.state.rulesFormulatedFromWeb++;
      this.state.lastCycleTimestamp = Date.now();
      this.state.learnedTopics.unshift({
        topic: target.topic,
        domain: target.domain,
        timestamp: Date.now(),
        snippetsCount: results.length,
      });
      if (this.state.learnedTopics.length > 50) this.state.learnedTopics.pop();

      this._saveState();
      this.lastLearnedTopic = target.topic;

      console.log(
        `✓ [InternetLearningEngine] Assimilated "${target.topic}" into LTM, Knowledge Graph & Operational Rules.`,
      );
      if (this.broadcast) {
        this.broadcast('internet-learning-status', {
          status: 'complete',
          topic: target.topic,
          resultsCount: results.length,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      console.warn('[InternetLearningEngine] Cycle notice:', err.message);
    } finally {
      this.isSearching = false;
    }
  }

  /**
   * Real-time on-demand research on user message topics
   */
  async learnOnDemand(text, domain = 'all') {
    if (!text || text.length < 5) return null;

    try {
      const keywords = text
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(
          (w) =>
            w.length > 3 &&
            ![
              'what',
              'when',
              'where',
              'which',
              'who',
              'how',
              'make',
              'use',
              'from',
              'this',
              'that',
              'with',
              'and',
              'the',
              'for',
            ].includes(w.toLowerCase()),
        )
        .slice(0, 4)
        .join(' ');

      if (!keywords || keywords.length < 4) return null;

      const query = `${keywords} modern best practices 2026`;
      const searchRes = await Promise.race([
        toolRegistry.execute('web_search', { query }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2500)),
      ]);

      if (searchRes && searchRes.results && searchRes.results.length > 0) {
        const topHit = searchRes.results[0];
        longTermMemory.store(
          ['research', 'on-demand-web', domain],
          {
            query,
            topSnippet: topHit.snippet,
            url: topHit.url,
            timestamp: Date.now(),
          },
          'internet-learning-engine',
        );

        return { query, hit: topHit };
      }
    } catch {}
    return null;
  }

  getRecentLearnedKnowledge(limit = 4) {
    return this.state.learnedTopics.slice(0, limit);
  }

  getStatus() {
    return {
      enabled: !!this.intervalId,
      isSearching: this.isSearching,
      lastLearnedTopic: this.lastLearnedTopic,
      totalSearches: this.state.totalSearchesExecuted,
      totalLearnings: this.state.totalInsightsAssimilated,
      rulesFormulated: this.state.rulesFormulatedFromWeb,
      lastCycleAt: this.state.lastCycleTimestamp,
      recentTopics: this.getRecentLearnedKnowledge(5),
      state: this.state,
    };
  }
}

const internetLearningEngine = new InternetLearningEngine();
export default internetLearningEngine;
