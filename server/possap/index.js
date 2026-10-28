// SIS 1.0 — POSSAP (Predictive System)
// Real-Time AI Predictor + User Trajectory Forecaster — runs 24/7

import shortTermMemory from '../memory/short-term.js';
import { quickAI, DEFAULT_MODEL } from '../api/openrouter.js';

class POSSAP {
  constructor() {
    this.aiHistory = [];
    this.userHistory = [];
    this.interval = null;
    this.isRunning = false;
    this.onBroadcast = null;
    this.stats = {
      cycles: 0,
      aiPredictions: 0,
      userPredictions: 0,
      lastCycleAt: null,
      lastSource: 'heuristic',
    };

    // Seed with rich initial baseline predictions so predictor is active from moment 0
    this.predictions = this._generateBaselinePredictions();
  }

  setBroadcastCallback(fn) {
    this.onBroadcast = fn;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    // Run periodic predictive cadence every 45 seconds
    this.interval = setInterval(() => this.predict(), 45000);
    console.log('[POSSAP] Predictive engine started (24/7 Dual-Mode Forecaster)');
    this._emitPredictions();
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.isRunning = false;
  }

  _emitPredictions() {
    if (typeof this.onBroadcast === 'function') {
      try {
        this.onBroadcast('possap-prediction', {
          predictions: this.predictions,
          stats: this.getStatus(),
        });
      } catch (err) {
        console.warn('[POSSAP] Broadcast error:', err.message);
      }
    }
  }

  _generateBaselinePredictions() {
    return {
      user: [
        {
          prediction: 'Request procedural 3D visual simulation or architectural demonstration',
          confidence: 0.88,
          reasoning:
            'System default capabilities emphasize 3D viewport generation and spatial simulation.',
          category: '3d-simulation',
        },
        {
          prediction: 'Query system self-improvement or trigger autonomous theory synthesis',
          confidence: 0.82,
          reasoning:
            'Idle engine and autonomous introspection modules are active in working memory.',
          category: 'reasoning',
        },
        {
          prediction: 'Provide complex multi-domain coding task or algorithmic challenge',
          confidence: 0.79,
          reasoning:
            '25-agent subconscious matrix is calibrated for high-throughput code synthesis.',
          category: 'coding',
        },
      ],
      ai: [
        {
          prediction: 'Pre-warm Three.js WebGL procedural shaders & kinematic pipeline',
          confidence: 0.91,
          preparation: 'Staging shader buffers and orbit controls for zero-latency 3D rendering.',
          category: '3d-prep',
        },
        {
          prediction: 'Cache AST compiler verification rules & workspace file write buffers',
          confidence: 0.86,
          preparation: 'Preparing sandboxed workspace directory and syntax linting tools.',
          category: 'code-prep',
        },
        {
          prediction: 'Activate cross-domain memory graph indexing & internet gap researcher',
          confidence: 0.84,
          preparation: 'Gating specialist agents for immediate parallel heuristic dispatch.',
          category: 'cognition-prep',
        },
      ],
      lastUpdated: Date.now(),
      source: 'heuristic',
    };
  }

  recordInteraction(userMessage, aiResponse = '') {
    if (typeof userMessage === 'object' && userMessage !== null) {
      aiResponse = userMessage.aiResponse || userMessage.aiAction || userMessage.response || '';
      userMessage = userMessage.userMessage || userMessage.message || '';
    }
    userMessage = String(userMessage || '');
    aiResponse = String(aiResponse || '');

    const userTopics = this._extractTopics(userMessage);
    const aiTopics = this._extractTopics(aiResponse);

    this.userHistory.push({
      message: userMessage,
      timestamp: Date.now(),
      length: userMessage.length,
      topics: userTopics,
    });

    this.aiHistory.push({
      response: aiResponse.substring(0, 400),
      timestamp: Date.now(),
      length: aiResponse.length,
      topics: aiTopics,
    });

    // Keep only last 50 interactions
    if (this.userHistory.length > 50) this.userHistory = this.userHistory.slice(-50);
    if (this.aiHistory.length > 50) this.aiHistory = this.aiHistory.slice(-50);

    // Immediately generate instant heuristic forecast (0ms) so predictions are never stale
    this._updateHeuristicPredictions(userMessage, userTopics, aiTopics);

    // Asynchronously trigger deep AI forecast with model
    this.predict().catch((err) => {
      console.warn('[POSSAP] Async prediction notice:', err.message);
    });
  }

  _extractTopics(text) {
    if (!text || typeof text !== 'string') return [];
    const stopWords = new Set([
      'this',
      'that',
      'with',
      'from',
      'have',
      'what',
      'your',
      'about',
      'will',
      'then',
      'them',
      'they',
      'when',
      'which',
      'there',
      'could',
      'should',
      'would',
      'system',
    ]);
    const keywords = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    const freq = {};
    keywords.forEach((w) => {
      if (!stopWords.has(w)) freq[w] = (freq[w] || 0) + 1;
    });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([word]) => word);
  }

  /**
   * Fast, reliable trajectory forecaster (0ms synchronous update)
   */
  _updateHeuristicPredictions(lastUserMsg, userTopics = [], aiTopics = []) {
    const msg = (lastUserMsg || '').toLowerCase();
    const userPreds = [];
    const aiPreds = [];

    // 1. Detect 3D Simulation Intent
    if (
      /3d|render|model|cube|titan|drone|crystal|blender|three\.?js|mesh|scene|hologram|orbit|view/i.test(
        msg,
      )
    ) {
      userPreds.push({
        prediction: `Inquire about camera controls, animations, or texture tweaks for the 3D scene`,
        confidence: 0.92,
        reasoning: 'User is actively engaged in 3D visual and spatial simulation workflows.',
        category: '3d-simulation',
      });
      userPreds.push({
        prediction: `Request export to Blender (.blend/.glb) or modify procedural shaders`,
        confidence: 0.85,
        reasoning: 'Typical 3D workflow progression moves from preview to asset export.',
        category: '3d-export',
      });
      userPreds.push({
        prediction: `Ask for physics/kinematics simulation or multi-part assembly`,
        confidence: 0.78,
        reasoning: 'Procedural geometry generation frequently pairs with dynamic physics.',
        category: '3d-kinematics',
      });

      aiPreds.push({
        prediction: 'Pre-warm Three.js orbit controller and WebGL canvas render loop',
        confidence: 0.94,
        preparation: 'Optimizing frame-rate buffers and procedural Three.js templates in memory.',
        category: '3d-prep',
      });
      aiPreds.push({
        prediction:
          'Stage Blender Python bridge (server/3d/blender.js) for background asset export',
        confidence: 0.88,
        preparation: 'Checking local Blender executable path and GLTF export pipeline.',
        category: 'blender-prep',
      });
      aiPreds.push({
        prediction: 'Dispatch procedural shader specialist to compute lighting and normal maps',
        confidence: 0.82,
        preparation: 'Pre-calculating PBR metallic-roughness material uniforms.',
        category: 'shader-prep',
      });
    }
    // 2. Detect Code / Debugging / Architecture Intent
    else if (
      /code|script|bug|fix|function|api|error|server|test|debug|implement|class|file|refactor/i.test(
        msg,
      )
    ) {
      userPreds.push({
        prediction: `Request unit tests, benchmark verification, or edge-case handling for the code`,
        confidence: 0.89,
        reasoning:
          'Code implementation naturally leads to correctness verification and test harness creation.',
        category: 'code-testing',
      });
      userPreds.push({
        prediction: `Ask to write or modify project files directly into the ./workspace/ sandbox`,
        confidence: 0.84,
        reasoning: 'User is working on concrete programming tasks requiring persistent files.',
        category: 'file-creation',
      });
      userPreds.push({
        prediction: `Inquire about performance optimization or async concurrency bottlenecks`,
        confidence: 0.8,
        reasoning: 'Algorithmic refinement follows initial code structure validation.',
        category: 'optimization',
      });

      aiPreds.push({
        prediction: 'Prime AST parser and syntax verification sandbox for instant code linting',
        confidence: 0.91,
        preparation: 'Pre-allocating in-memory syntax tree buffers and safe file write handlers.',
        category: 'ast-prep',
      });
      aiPreds.push({
        prediction: 'Route coder and verifier subconscious parts to active standby',
        confidence: 0.87,
        preparation: 'Elevating priority of coder specialist in the 25-agent matrix.',
        category: 'specialist-prep',
      });
      aiPreds.push({
        prediction: 'Prepare empirical benchmark harness (server/improvement/empirical-gym.js)',
        confidence: 0.83,
        preparation: 'Staging micro-benchmark timers for sub-millisecond execution verification.',
        category: 'benchmark-prep',
      });
    }
    // 3. Detect Theory / Reasoning / Science Intent
    else if (
      /theory|why|how|explain|proof|math|quantum|consensus|logic|physics|concept|frontier/i.test(
        msg,
      )
    ) {
      userPreds.push({
        prediction: `Request formal mathematical proofs, invariants, or algorithmic complexity bounds`,
        confidence: 0.91,
        reasoning:
          'Theoretical queries probe core foundational principles and mathematical bounds.',
        category: 'formal-proof',
      });
      userPreds.push({
        prediction: `Probe edge cases, counterfactuals, or practical real-world limitations`,
        confidence: 0.86,
        reasoning: 'User seeks to test the theoretical hypothesis under adversarial conditions.',
        category: 'counterfactuals',
      });
      userPreds.push({
        prediction: `Ask to connect this concept with a disparate domain (e.g. quantum + distributed systems)`,
        confidence: 0.82,
        reasoning: 'SIS cross-domain dot-connecting encourages interdisciplinary synthesis.',
        category: 'cross-domain',
      });

      aiPreds.push({
        prediction: 'Weave working memory concepts into long-term knowledge graph',
        confidence: 0.93,
        preparation: 'Extracting semantic entities and relations for associative retrieval.',
        category: 'graph-prep',
      });
      aiPreds.push({
        prediction: 'Trigger background internet research for relevant recent arXiv preprints',
        confidence: 0.89,
        preparation: 'Querying live DuckDuckGo API for academic benchmarks and empirical papers.',
        category: 'research-prep',
      });
      aiPreds.push({
        prediction: 'Prime logician, mathematician, and theorist subconscious specialists',
        confidence: 0.85,
        preparation: 'Setting high attention weights for analytical and formal reasoning parts.',
        category: 'theorist-prep',
      });
    }
    // 4. Default / General Multi-Domain Intent
    else {
      const topKeyword = userTopics[0] || 'operational';
      userPreds.push({
        prediction: `Deepen inquiry regarding ${topKeyword} or ask for an actionable demonstration`,
        confidence: 0.82,
        reasoning: `Recent interaction heavily featured topic "${topKeyword}".`,
        category: 'follow-up',
      });
      userPreds.push({
        prediction: `Request practical implementation steps or workspace file artifacts`,
        confidence: 0.77,
        reasoning: 'User queries typically progress from general intent to concrete deliverables.',
        category: 'practical-steps',
      });
      userPreds.push({
        prediction: `Explore system capabilities, memory tree, or 3D holographic visualization`,
        confidence: 0.73,
        reasoning: 'Exploring available operating system tools and visualization panels.',
        category: 'system-exploration',
      });

      aiPreds.push({
        prediction: `Pre-cache contextual memory nodes related to [${userTopics.slice(0, 3).join(', ') || 'core'}]`,
        confidence: 0.87,
        preparation:
          'Scanning short-term memory and knowledge graph for rapid associative retrieval.',
        category: 'memory-prep',
      });
      aiPreds.push({
        prediction: 'Maintain 25-specialist dispatch matrix in high-responsiveness standby',
        confidence: 0.85,
        preparation: 'Keeping parallel subconscious worker threads warmed up.',
        category: 'matrix-prep',
      });
      aiPreds.push({
        prediction: 'Prepare proactive follow-up recommendations and next-step actions',
        confidence: 0.8,
        preparation: 'Synthesizing preemptive guidance based on current trajectory.',
        category: 'guidance-prep',
      });
    }

    this.predictions = {
      user: userPreds,
      ai: aiPreds,
      lastUpdated: Date.now(),
      source: 'heuristic',
    };
    this.stats.lastSource = 'heuristic';
    this.stats.lastCycleAt = Date.now();
    this.stats.userPredictions += userPreds.length;
    this.stats.aiPredictions += aiPreds.length;

    this._emitPredictions();
  }

  /**
   * Calculate full multi-branch possibilities and probabilistic trajectories for a specific query
   */
  calculatePossibilityMatrix(query, context = {}) {
    const clean = String(query || '').trim();
    const topics = this._extractTopics(clean);

    // Determine primary intent domain
    let domain;
    let probabilityDistribution;
    if (/3d|render|mesh|blender|three|scene|model|shader|animation/i.test(clean)) {
      domain = 'spatial-3d-simulation';
      probabilityDistribution = {
        '3d-generation': 0.88,
        'blender-mcp': 0.76,
        'interactive-viewport': 0.92,
        'procedural-kinematics': 0.65,
      };
    } else if (
      /code|script|function|file|create|build|implement|debug|algorithm|test/i.test(clean)
    ) {
      domain = 'systems-software-engineering';
      probabilityDistribution = {
        'workspace-file-ops': 0.94,
        'code-synthesis': 0.96,
        'ast-validation': 0.85,
        'empirical-testing': 0.72,
      };
    } else if (/theory|why|explain|prove|math|physics|quantum|concept|science/i.test(clean)) {
      domain = 'theoretical-frontier-synthesis';
      probabilityDistribution = {
        'formal-proof': 0.89,
        'cross-domain-analogy': 0.84,
        'first-principles': 0.91,
        'counterfactual-test': 0.78,
      };
    } else if (/search|github|repo|internet|find|lookup|who|history|latest/i.test(clean)) {
      domain = 'omni-information-retrieval';
      probabilityDistribution = {
        'web-research': 0.95,
        'github-intelligence': 0.88,
        'knowledge-graph-traversal': 0.82,
        'memory-recall': 0.79,
      };
    } else {
      domain = 'multimodal-deliberation';
      probabilityDistribution = {
        'deep-understanding': 0.92,
        'possibility-branching': 0.85,
        'grounded-synthesis': 0.88,
      };
    }

    // Branching Trajectories (Possible user intentions & follow-ups)
    const branchingTrajectories = [
      {
        branch: 'Branch Alpha (Direct Action & Execution)',
        probability: probabilityDistribution[Object.keys(probabilityDistribution)[0]] || 0.88,
        projectedOutcome: `Immediate concrete execution or artifact generation for "${clean.slice(0, 40)}"`,
        mitigation:
          'Verify workspace sandbox paths and validate generated syntax before presentation',
      },
      {
        branch: 'Branch Beta (Exploratory Deepening)',
        probability: Math.max(
          0.6,
          (probabilityDistribution[Object.keys(probabilityDistribution)[1]] || 0.76) - 0.05,
        ),
        projectedOutcome: `Deep dive into architectural nuances, proofs, or underlying mechanics`,
        mitigation: 'Pre-index relevant long-term memory nodes and empirical research papers',
      },
      {
        branch: 'Branch Gamma (Cross-Domain Synthesis & Expansion)',
        probability: 0.68,
        projectedOutcome: `Connecting this query to adjacent domains in the knowledge graph and repositories`,
        mitigation: 'Activate relational edges across associative memory graph',
      },
    ];

    return {
      query: clean,
      domain,
      topics,
      probabilityDistribution,
      branchingTrajectories,
      uncertaintyScore: Math.min(
        0.35,
        Math.max(0.05, +(1 - (branchingTrajectories[0].probability || 0.8)).toFixed(2)),
      ),
      recommendedStrategy:
        'Ground in real data (Web + GitHub + Memory) then synthesize via specialist matrix before conscious streaming.',
      calculatedAt: Date.now(),
    };
  }

  /**
   * Deep Predictive AI Cycle (runs with timeout and graceful heuristic fallback)
   */
  async predict() {
    this.stats.cycles++;
    this.stats.lastCycleAt = Date.now();

    const recentUser = this.userHistory.slice(-5);
    const recentAI = this.aiHistory.slice(-5);

    // If no interactions yet, heuristic baseline is already active
    if (recentUser.length === 0) {
      this._emitPredictions();
      return this.predictions;
    }

    // Preserve 100% LLM quota for interactive user and agent tasks
    if (process.env.ENABLE_BACKGROUND_LLM_LOOPS !== 'true') {
      this._emitPredictions();
      return this.predictions;
    }

    try {
      const userTopicsStr = recentUser
        .flatMap((u) => u.topics)
        .slice(0, 8)
        .join(', ');
      const aiTopicsStr = recentAI
        .flatMap((a) => a.topics)
        .slice(0, 8)
        .join(', ');

      const userMessagesContext = recentUser
        .map((u) => `- "${u.message.slice(0, 150)}"`)
        .join('\n');
      const aiResponsesContext = recentAI.map((a) => `- "${a.response.slice(0, 150)}"`).join('\n');

      const latestMsg = recentUser[recentUser.length - 1]?.message || '';

      const userPrompt = `You are the User Trajectory Predictive Engine of SIS 1.0.
Analyze the user's conversation trajectory, with primary weight given to their MOST RECENT message ("${latestMsg.slice(0, 100)}").
Predict what the user is most likely to ask, request, or investigate next based on this active focus.
Output a JSON array of 3 distinct predictions with confidence (0.0 to 1.0) and concrete reasoning.

JSON format:
[
  {
    "prediction": "Clear description of predicted user move directly relevant to recent trajectory",
    "confidence": 0.85,
    "reasoning": "Why this is likely based on conversation trajectory",
    "category": "coding|3d-simulation|reasoning|file-creation|follow-up"
  }
]`;

      const aiPrompt = `You are the AI Preparedness Predictive Engine of SIS 1.0.
Based on the user's latest interaction ("${latestMsg.slice(0, 100)}") and where their trajectory is heading, predict what preemptive background preparations the SIS operating system should initiate immediately (e.g. pre-warming 3D shaders, staging AST rules, searching research papers, caching memory nodes).
Output a JSON array of 3 distinct AI preparations with confidence and preparation details.

JSON format:
[
  {
    "prediction": "Specific preemptive system action to take",
    "confidence": 0.90,
    "preparation": "Technical actions being staged in the background",
    "category": "3d-prep|code-prep|memory-prep|research-prep"
  }
]`;

      const context = `Active User Request: "${latestMsg}"\n\nRecent User Messages:\n${userMessagesContext}\n\nRecent AI Responses:\n${aiResponsesContext}\n\nObserved User Topics: ${userTopicsStr || 'general'}\nObserved AI Topics: ${aiTopicsStr || 'general'}`;

      // Run user and AI predictions in parallel with safety timeout
      const [userRes, aiRes] = await Promise.allSettled([
        Promise.race([
          quickAI(userPrompt, context, DEFAULT_MODEL, 1200),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('User prediction timeout')), 25000),
          ),
        ]),
        Promise.race([
          quickAI(aiPrompt, context, DEFAULT_MODEL, 1200),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('AI prediction timeout')), 25000),
          ),
        ]),
      ]);

      let parsedUser = null;
      let parsedAI = null;

      if (userRes.status === 'fulfilled' && typeof userRes.value === 'string') {
        try {
          const match = userRes.value.match(/\[[\s\S]*\]/);
          if (match) {
            const arr = JSON.parse(match[0]);
            if (Array.isArray(arr) && arr.length > 0 && arr[0].prediction) {
              parsedUser = arr.slice(0, 3);
            }
          }
        } catch (e) {}
      }

      if (aiRes.status === 'fulfilled' && typeof aiRes.value === 'string') {
        try {
          const match = aiRes.value.match(/\[[\s\S]*\]/);
          if (match) {
            const arr = JSON.parse(match[0]);
            if (Array.isArray(arr) && arr.length > 0 && arr[0].prediction) {
              parsedAI = arr.slice(0, 3);
            }
          }
        } catch (e) {}
      }

      if (parsedUser && parsedUser.length > 0) {
        this.predictions.user = parsedUser;
        this.stats.userPredictions += parsedUser.length;
      }
      if (parsedAI && parsedAI.length > 0) {
        this.predictions.ai = parsedAI;
        this.stats.aiPredictions += parsedAI.length;
      }

      if (parsedUser || parsedAI) {
        this.predictions.lastUpdated = Date.now();
        this.predictions.source = 'ai-synthesis';
        this.stats.lastSource = 'ai-synthesis';

        // Store high-confidence predictions in short-term working memory
        shortTermMemory.store(
          ['possap', 'predictions'],
          {
            content: JSON.stringify(this.predictions),
            type: 'prediction',
            tags: ['possap', 'prediction', 'active', 'ai-synthesized'],
            metadata: { cycle: this.stats.cycles, timestamp: Date.now() },
          },
          'possap',
        );
      }

      this._emitPredictions();
      return this.predictions;
    } catch (e) {
      console.warn('[POSSAP] Prediction error:', e.message);
      // Fallback already updated synchronously via _updateHeuristicPredictions
      this._emitPredictions();
      return this.predictions;
    }
  }

  /**
   * Force an immediate on-demand prediction cycle
   */
  async triggerPrediction(forcedUserMsg = null) {
    if (forcedUserMsg) {
      this.userHistory.push({
        message: forcedUserMsg,
        timestamp: Date.now(),
        length: forcedUserMsg.length,
        topics: this._extractTopics(forcedUserMsg),
      });
      if (this.userHistory.length > 50) this.userHistory = this.userHistory.slice(-50);
      this._updateHeuristicPredictions(forcedUserMsg, this._extractTopics(forcedUserMsg));
    }
    return await this.predict();
  }

  getLatestPredictions() {
    return this.predictions;
  }

  getStatus() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      userHistoryCount: this.userHistory.length,
      aiHistoryCount: this.aiHistory.length,
      predictionsAvailable:
        (this.predictions.user?.length || 0) + (this.predictions.ai?.length || 0),
      lastUpdated: this.predictions.lastUpdated,
    };
  }
}

const possap = new POSSAP();
export default possap;
