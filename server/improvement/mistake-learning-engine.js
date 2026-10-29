// SIS 1.0 — Mistake Learning & Zero-Regression Cognitive Memory Tree Engine
// Automatically intercepts user corrections, negative feedback, and rule violations.
// Features:
// 1. Analyzes user utterances for negative feedback ("wrong", "mistake", "not like that", "don't do X", "hardcoding").
// 2. Extracts concrete negative constraints ("NEVER do X") and positive invariants ("ALWAYS do Y").
// 3. Durably records into:
//    - Hierarchical Memory Tree (under ['rules', 'prevented_mistakes', domain])
//    - Long-Term Memory (data/memory/long-term.json)
//    - Hermes Learner Ledger (data/hermes-learning-ledger.json) with highest priority
//    - Knowledge Graph (nodes: Mistake, Rule; edge: PREVENTS)
//    - Mistakes Ledger (data/memory/mistakes-ledger.json)
// 4. Injects all active prevented rules directly into the LLM system prompt on every turn to guarantee ZERO REGRESSION.
// 5. Broadcasts live memory tree update events to the UI.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import longTermMemory from '../memory/long-term.js';
import knowledgeGraph, { RELATION_TYPES } from '../memory/knowledge-graph.js';
import hermesLearner from '../services/hermesLearner.js';
import brain from '../orchestrator/brain.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../');
const DATA_DIR = path.join(
  process.env.SIS_DATA_DIR ? path.resolve(process.env.SIS_DATA_DIR) : path.join(ROOT_DIR, 'data'),
  'memory',
);
const MISTAKES_LEDGER_FILE = path.join(DATA_DIR, 'mistakes-ledger.json');

// Foundational Invariant Rules (Hard Grounding against previous user corrections)
const FOUNDATIONAL_MISTAKES = [
  {
    id: 'mistake-search-full-sentence',
    domain: 'search',
    userTrigger: 'searched whole sentence instead of keyword',
    mistake:
      'Searching full conversational sentences (e.g. "Can you search silisleek in your browser and open the first link?...") in search engines instead of concise target keywords.',
    neverDo:
      'NEVER send conversational fluff, polite phrases, or complete prompt sentences into search engines or browser query bars.',
    alwaysDo:
      'ALWAYS extract ONLY the clean, concise target subject or keyword (e.g. "silisleek") and search exclusively for that.',
    severity: 'CRITICAL',
    timestamp: Date.now(),
  },
  {
    id: 'mistake-custom-mock-browser',
    domain: 'browser',
    userTrigger: 'showed custom designed mock page instead of real chrome',
    mistake:
      'Navigating to or displaying a custom mock "agent-browser-home.html" start page instead of giving the agent genuine access to real Google Chrome and live internet websites.',
    neverDo:
      'NEVER trap the agent or user inside a custom designed mock start page when real Chrome/browser access is requested.',
    alwaysDo:
      'ALWAYS give genuine, unconstrained access to real Google Chrome (Google search, live websites, GitHub, arXiv) and allow native multi-tab navigation.',
    severity: 'CRITICAL',
    timestamp: Date.now(),
  },
  {
    id: 'mistake-hardcoded-simulations',
    domain: 'execution',
    userTrigger: 'signs of hardcoding',
    mistake:
      'Faking browser clicks or returning canned hardcoded URLs/results instead of executing real DOM interactions in Chromium.',
    neverDo: 'NEVER emit synthetic, hardcoded, or fabricated actions/results.',
    alwaysDo:
      'ALWAYS execute real Playwright clicks, cursor glides, page evaluations, and dynamic data ingestion.',
    severity: 'CRITICAL',
    timestamp: Date.now(),
  },
  {
    id: 'mistake-generic-ai-outputs',
    domain: 'generative_craftsmanship',
    userTrigger: 'generic AI outputs instead of high quality graphical video or simulation',
    mistake:
      'Generating low-fidelity, toy geometric primitives, primitive unshaded canvas doodles, silent animations, or irrelevant fallback scenes instead of studio-grade, prompt-grounded creations.',
    neverDo:
      "NEVER output crude unshaded shapes, single-box stubs, unstyled HTML, silent media without procedural audio, or irrelevant fallback scenes that ignore the user's prompt.",
    alwaysDo:
      'ALWAYS synthesize studio-grade, professional visual outputs: Three.js PBR with soft shadows and multi-camera director cinematography, precision 2D vector kinematics, procedural Web Audio API sound design, modern glassmorphic UI, and rich prompt-tailored procedural detail.',
    severity: 'CRITICAL',
    timestamp: Date.now(),
  },
  {
    id: 'mistake-quality-gate-excuse-stall',
    domain: 'human_ambition_and_craftsmanship',
    userTrigger:
      "It doesn't look like it wants to be the best and like a human who can learn anything",
    mistake:
      'Stalling, reciting internal quality gate failures, or saying "I will author it by hand" without executing in that turn.',
    neverDo:
      'NEVER output internal tool warnings/quality-gate complaints as an excuse, and NEVER promise to author something later without materializing it in this exact turn.',
    alwaysDo:
      'ALWAYS embody the ambition of a human master who wants to be the best and can learn anything: take absolute ownership, synthesize the complete studio-grade artifact immediately in this turn, auto-correct any flaws silently, and deliver with pride.',
    severity: 'CRITICAL',
    timestamp: Date.now(),
  },
  {
    id: 'mistake-poor-coding-and-unverified-stubs',
    domain: 'coding_mastery',
    userTrigger: 'bad at coding / broken stubs / black screen / unverified code',
    mistake:
      'Emitting incomplete code, syntactically broken modules, missing CDN imports, unhandled exceptions, or unverified stubs.',
    neverDo:
      'NEVER output broken stubs, unhandled module imports, naive placeholder ellipses, or unverified code that crashes on run.',
    alwaysDo:
      'ALWAYS generate 100% complete, production-grade code with AST verification, automated test assertions, and auto-healing so that all code works flawlessly on the first run.',
    severity: 'CRITICAL',
    timestamp: Date.now(),
  },
];

export class MistakeLearningEngine {
  constructor() {
    this.name = 'MistakeLearningEngine';
    this.version = '2.0.0-PRO';
    this.ledger = [];
    this._ensureStore();
    this._loadLedger();
  }

  _ensureStore() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (!fs.existsSync(MISTAKES_LEDGER_FILE)) {
        fs.writeFileSync(
          MISTAKES_LEDGER_FILE,
          JSON.stringify(FOUNDATIONAL_MISTAKES, null, 2),
          'utf8',
        );
      }
    } catch (e) {
      console.warn('[MistakeLearningEngine] Ensure store notice:', e.message);
    }
  }

  _loadLedger() {
    try {
      if (fs.existsSync(MISTAKES_LEDGER_FILE)) {
        const raw = JSON.parse(fs.readFileSync(MISTAKES_LEDGER_FILE, 'utf8'));
        this.ledger = Array.isArray(raw) ? raw : [];
      } else {
        this.ledger = [...FOUNDATIONAL_MISTAKES];
      }

      // Ensure foundational rules exist in the ledger
      for (const fm of FOUNDATIONAL_MISTAKES) {
        if (!this.ledger.some((m) => m.id === fm.id)) {
          this.ledger.push(fm);
        }
      }
    } catch (e) {
      console.warn('[MistakeLearningEngine] Load ledger notice:', e.message);
      this.ledger = [...FOUNDATIONAL_MISTAKES];
    }
  }

  _saveLedger() {
    try {
      fs.writeFileSync(MISTAKES_LEDGER_FILE, JSON.stringify(this.ledger, null, 2), 'utf8');
    } catch (e) {
      console.error('[MistakeLearningEngine] Save ledger error:', e.message);
    }
  }

  /**
   * Evaluates if a user utterance contains negative feedback, mistake corrections, or constraint enforcement.
   */
  isNegativeFeedback(userText) {
    if (!userText || typeof userText !== 'string') return false;
    const lower = userText.toLowerCase().trim();

    const correctionSignals = [
      /\b(wrong|mistake|incorrect|not right|not working|failed|broken|erroneous|fix)\b/i,
      /\b(not like that|don't do that|never do that|stop doing|you should not|don't use|stops)\b/i,
      /\b(hardcoding|hardcoded|fake|canned|simulated)\b/i,
      /\b(not your designed|give it access to chrome|real chrome not your|no access to chrome|has no access)\b/i,
      /\b(instead of|rather than|i told you|i said|fix this|fix now|does not complete)\b/i,
      /\b(unable to scroll|cannot scroll|does not scroll|can't scroll)\b/i,
      /\b(unable to click|can't click|doesn't click|cannot click)\b/i,
      /\b(does not open multiple tabs|no multiple tabs|can't open tabs)\b/i,
      /\b(sign of hardcoding|this is a sign)\b/i,
      /\b(generic ai|looks like generic|not high quality|bad quality|primitive|completely different|make.*better at making|generates anything)\b/i,
    ];

    return correctionSignals.some((pattern) => pattern.test(lower));
  }

  /**
   * Analyzes the user's feedback turn and extracts the mistake, constraint, and domain.
   */
  learnFromFeedback(userText, context = {}) {
    if (!userText || !this.isNegativeFeedback(userText)) return null;

    const lower = userText.toLowerCase().trim();
    let domain = 'general';
    let mistakeDesc = userText;
    let neverDo = 'NEVER repeat the flagged incorrect behavior.';
    let alwaysDo = "ALWAYS follow the user's explicit corrective constraints precisely.";

    // Domain & heuristic extraction
    if (
      lower.includes('generic') ||
      lower.includes('quality') ||
      lower.includes('primitive') ||
      lower.includes('better at making') ||
      lower.includes('completely different') ||
      lower.includes('generates anything')
    ) {
      domain = 'generative_craftsmanship';
      mistakeDesc =
        'Supergence produced generic AI prototypes, crude geometric stubs, or irrelevant fallback generations instead of studio-grade, prompt-grounded creations.';
      neverDo =
        'NEVER output toy primitive shapes (lone boxes, raw unshaded circles, unstyled HTML buttons, stick figures), never output silent media without procedural audio, never divert to irrelevant canned scenes when a specific topic was requested, and never deliver generic AI placeholders.';
      alwaysDo =
        'ALWAYS synthesize studio-grade, professional visual outputs: Three.js PBR 3D with lighting/shadows/camera cinematography, precision 2D vector kinematics, procedural Web Audio sound synthesis, modern Tailwind glassmorphism design systems, and rich prompt-tailored procedural detail.';
    } else if (lower.includes('scroll')) {
      domain = 'browser_navigation';
      mistakeDesc =
        'Browser viewport failed to scroll, leaving elements or page contents off-screen.';
      neverDo = 'NEVER fail to scroll or assume web elements are visible without scrolling.';
      alwaysDo =
        'ALWAYS scroll page viewports and scrollable containers using mouse wheel, DOM evaluate, and keyboard PageDown/PageUp.';
    } else if (lower.includes('complete') || lower.includes('stop') || lower.includes('stops')) {
      domain = 'task_execution';
      mistakeDesc =
        'Autonomous agent prematurely stopped or failed to complete compound workflow end-to-end.';
      neverDo = 'NEVER stop halfway or abort compound multi-step workflows prematurely.';
      alwaysDo =
        'ALWAYS execute all compound workflow steps end-to-end (navigating, typing, submitting, resolving downloads) to full completion.';
    } else if (
      lower.includes('chrome') ||
      lower.includes('browser') ||
      lower.includes('tab') ||
      lower.includes('url')
    ) {
      domain = 'browser';
      if (
        lower.includes('not your designed') ||
        lower.includes('designed') ||
        lower.includes('access to chrome') ||
        lower.includes('no access')
      ) {
        mistakeDesc =
          'Trapped the agent in a custom designed mock page or denied access to real desktop Google Chrome.';
        neverDo =
          'NEVER trap agents solely in custom mock frames or deny access to real desktop Google Chrome.';
        alwaysDo =
          'ALWAYS provide direct access to real desktop Google Chrome (chrome.exe) with persistent profiles and multi-tab workflows.';
      } else if (lower.includes('tab') || lower.includes('multiple tabs')) {
        mistakeDesc = 'Failed to provide or switch between multiple browser tabs seamlessly.';
        neverDo = 'NEVER lock the agent to a single static tab or duplicate tabs.';
        alwaysDo =
          'ALWAYS allow opening, switching, and preserving multiple real browser tabs in personal Chrome.';
      } else if (lower.includes('click') || lower.includes('human')) {
        mistakeDesc = 'Agent failed to click or interact with web elements like a real human.';
        neverDo = 'NEVER skip physical clicking or DOM element targeting.';
        alwaysDo =
          'ALWAYS glide the virtual cursor to element coordinates and execute real Playwright clicks and form inputs.';
      }
    } else if (
      lower.includes('search') ||
      lower.includes('duckduckgo') ||
      lower.includes('google') ||
      lower.includes('query')
    ) {
      domain = 'search';
      if (
        lower.includes('instead of') ||
        lower.includes('hardcoding') ||
        lower.includes('full') ||
        lower.includes('sentence')
      ) {
        mistakeDesc =
          'Searched entire user sentence/prompt in search engine instead of concise target keywords.';
        neverDo = 'NEVER search entire prompt sentences or conversational queries.';
        alwaysDo = 'ALWAYS extract and search only the clean target keyword (e.g. "silisleek").';
      }
    } else if (
      lower.includes('sidebar') ||
      lower.includes('ui') ||
      lower.includes('window') ||
      lower.includes('size')
    ) {
      domain = 'ui';
      mistakeDesc =
        'UI layout was constrained (cramped browser window, no sidebar collapse/expand).';
      neverDo = 'NEVER render cramped 350px browser frames or uncollapsible sidebars.';
      alwaysDo =
        'ALWAYS provide collapse/expand buttons for sidebars and allow expanding the browser pane to dominant width.';
    } else if (
      lower.includes('hardcod') ||
      lower.includes('test') ||
      lower.includes('learn') ||
      lower.includes('capabilit')
    ) {
      domain = 'testing_and_learning_capabilities';
      mistakeDesc =
        "Used hardcoded or shallow assertions instead of genuinely testing the system's real adaptive learning, reasoning, dynamic tool genesis, and problem-solving capabilities.";
      neverDo =
        'NEVER use hardcoded tests, canned outputs, or superficial DOM checks to pretend capabilities exist.';
      alwaysDo =
        'ALWAYS stress-test the system with genuine, non-canned challenges: novel epistemic learning across turns, dynamic tool synthesis & compilation, multi-step algorithmic reasoning, and real Playwright browser execution.';
    }

    const mistakeEntry = {
      id: 'mistake-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      domain,
      userTrigger: userText.slice(0, 180),
      mistake: mistakeDesc,
      neverDo,
      alwaysDo,
      severity: 'HIGH',
      timestamp: Date.now(),
    };

    // 1. Commit to Local Mistakes Ledger
    this.ledger.push(mistakeEntry);
    this._saveLedger();

    // 2. Commit to Hierarchical Long-Term Memory Tree
    try {
      longTermMemory.store(
        ['rules', 'prevented_mistakes', domain],
        {
          content: `PREVENTED MISTAKE [${domain.toUpperCase()}]: ${mistakeDesc}\nCONSTRAINT: ${neverDo}\nINVARIANT: ${alwaysDo}`,
          type: 'user_constraint',
          tags: ['mistake_prevention', domain, 'user_rule', 'zero_regression'],
          metadata: {
            mistakeId: mistakeEntry.id,
            userTrigger: mistakeEntry.userTrigger,
            neverDo,
            alwaysDo,
            domain,
          },
        },
        'user_correction',
        true,
      );
    } catch (e) {
      console.warn('[MistakeLearningEngine] MemoryTree store notice:', e.message);
    }

    // 3. Commit to Knowledge Graph
    try {
      const mistakeNodeId = `mistake:${mistakeEntry.id}`;
      const ruleNodeId = `rule:${mistakeEntry.id}`;
      knowledgeGraph.addNode(mistakeNodeId, mistakeDesc.slice(0, 60), 'mistake', [domain, 'flaw']);
      knowledgeGraph.addNode(
        ruleNodeId,
        `${neverDo} ${alwaysDo}`.slice(0, 60),
        'preventative_rule',
        [domain, 'rule'],
      );
      knowledgeGraph.addEdge(
        ruleNodeId,
        mistakeNodeId,
        RELATION_TYPES.PREVENTS,
        1.0,
        { domain },
        true,
      );
    } catch (e) {
      console.warn('[MistakeLearningEngine] KnowledgeGraph notice:', e.message);
    }

    // 4. Commit to Hermes Learning Ledger
    try {
      hermesLearner.addFacet({
        category: 'User Correction & Mistake Prevention',
        fact: `CRITICAL INVARIANT: ${neverDo} ${alwaysDo} (Prevented flaw: ${mistakeDesc})`,
        confidence: 1.0,
        source: `Explicit user feedback: "${userText.slice(0, 100)}"`,
      });
    } catch (e) {
      console.warn('[MistakeLearningEngine] HermesLearner notice:', e.message);
    }

    // 5. Broadcast live learning pulse to UI
    try {
      brain.broadcast('agent-mistake-learned', {
        id: mistakeEntry.id,
        domain: mistakeEntry.domain,
        mistake: mistakeEntry.mistake,
        neverDo: mistakeEntry.neverDo,
        alwaysDo: mistakeEntry.alwaysDo,
        timestamp: mistakeEntry.timestamp,
      });
    } catch (_) {}

    console.log(
      `[MistakeLearningEngine] 🧠 Acquired new preventative rule: [${domain}] ${neverDo} -> ${alwaysDo}`,
    );
    return mistakeEntry;
  }

  /**
   * Generates a strict, inviolable prompt block listing all active prevented mistakes.
   * Injected into the LLM system prompt on EVERY turn.
   */
  getActiveMistakePreventionPrompt() {
    const seen = new Set();
    const uniqueRules = [];
    for (const item of this.ledger) {
      const key = (item.neverDo || '').trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      uniqueRules.push(item);
    }

    const rulesList = uniqueRules
      .slice(0, 5)
      .map((item, idx) => {
        return `${idx + 1}. [${item.domain.toUpperCase()}]
   - 🚫 NEVER: ${item.neverDo}
   - ✅ ALWAYS: ${item.alwaysDo}`;
      })
      .join('\n');

    return `### 🛑 CRITICAL INVARIANTS & PREVENTED MISTAKES (ZERO REGRESSION ENFORCED)
${rulesList}`;
  }

  getAllMistakes() {
    return [...this.ledger];
  }
}

const mistakeLearningEngine = new MistakeLearningEngine();
export { mistakeLearningEngine };
export default mistakeLearningEngine;
