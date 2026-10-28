// SIS 1.0 — Conversation-as-a-Continuous-Dataset Mining & Self-Improvement Engine
// Treats EVERY SINGLE conversation (past, present, and future) as an empirical training dataset.
// Continuously audits interaction turns:
// 1. Error & Sub-Optimality Detection: Detects logical gaps, edge cases missed, superficial code, or friction
// 2. Counterfactual Reconstruction: Synthesizes what an optimal master superintelligence should have answered
// 3. Invariant & Anti-Pattern Distillation: Formulates exact rules to prevent repeating the mistake
// 4. Subconscious Baking: Silently bakes newly derived invariants into the subconscious matrix
//    without the conscious mind knowing until it observes its own output.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { quickAI, DEFAULT_MODEL, PREMIUM_MODEL } from '../api/openrouter.js';
import patternLibrary from './anti-patterns.js';
import longTermMemory from '../memory/long-term.js';
import shortTermMemory from '../memory/short-term.js';
import knowledgeGraph from '../memory/knowledge-graph.js';
import exemplarBank from './exemplar-bank.js';
import userFocusTracker from './user-focus-tracker.js';
import subconscious from '../orchestrator/subconscious.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIT_FILE = path.join(__dirname, '../../data/improvement/conversation-dataset-audit.json');
const CONVERSATIONS_DIR = path.join(__dirname, '../../data/conversations');

// Ensure directory exists
if (!fs.existsSync(path.dirname(AUDIT_FILE))) {
  fs.mkdirSync(path.dirname(AUDIT_FILE), { recursive: true });
}

export class ConversationDatasetMiner {
  constructor(options = {}) {
    this.auditFilePath = options.auditFilePath || AUDIT_FILE;
    this.conversationsDir = options.conversationsDir || CONVERSATIONS_DIR;
    this.isMining = false;
    this.timer = null;

    this.state = {
      totalConversationsMined: 0,
      totalTurnsAudited: 0,
      mistakesDetected: 0,
      counterfactualsSynthesized: 0,
      subconsciousInvariantsBaked: 0,
      minedConversationIds: [],
      recentAudits: [],
      recurringFailureModes: {},
      lastMinedAt: null,
    };

    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.auditFilePath)) {
        const raw = fs.readFileSync(this.auditFilePath, 'utf8');
        const data = JSON.parse(raw);
        this.state = { ...this.state, ...data };
      }
    } catch (err) {
      console.warn('[ConversationDatasetMiner] Load notice:', err.message);
    }
  }

  _save() {
    try {
      if (!fs.existsSync(path.dirname(this.auditFilePath))) {
        fs.mkdirSync(path.dirname(this.auditFilePath), { recursive: true });
      }
      fs.writeFileSync(this.auditFilePath, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (err) {
      console.error('[ConversationDatasetMiner] Save error:', err.message);
    }
  }

  setBrain(brain) {
    this.brainRef = brain;
  }

  /**
   * Start background continuous conversation dataset mining
   */
  start(intervalMs = 4 * 60 * 1000) {
    if (this.timer) return;
    console.log(
      '[ConversationDatasetMiner] Starting 24/7 conversation dataset mining loop (every 4m)...',
    );
    // Run initial pass after 30s so user requests have full priority on boot
    setTimeout(() => this.mineAllConversations(), 30000);
    this.timer = setInterval(() => this.mineAllConversations(), intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Extract all turns from a conversation JSON file
   */
  _extractTurns(conversationData) {
    const messages = conversationData.messages || [];
    const turns = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === 'user') {
        // Find next assistant message
        const nextAssistant = messages.slice(i + 1).find((m) => m.role === 'assistant');
        if (nextAssistant && nextAssistant.content) {
          // Check if subsequent user message is a correction or feedback
          const subsequentUser = messages.slice(i + 2).find((m) => m.role === 'user');
          const isFollowedByCorrection = subsequentUser
            ? /^(no\b|not quite|that's wrong|incorrect|mistake|don't do that|you missed|error in your|fix this|that is not what I asked|wait no)/i.test(
                subsequentUser.content.trim(),
              )
            : false;

          turns.push({
            turnIndex: turns.length + 1,
            userMessage: msg.content,
            assistantResponse: nextAssistant.content,
            isFollowedByCorrection,
            correctionText: isFollowedByCorrection ? subsequentUser.content : null,
            timestamp: msg.timestamp || conversationData.updatedAt || Date.now(),
          });
        }
      }
    }
    return turns;
  }

  /**
   * Audit a single turn: detect mistakes, formulate counterfactual, and bake invariants
   */
  async auditTurn(turnData, conversationId = 'realtime') {
    this.state.totalTurnsAudited++;
    const turnId = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const domain = userFocusTracker.detectDomain(turnData.userMessage);

    const auditPrompt = `You are the Deep Conversation Dataset Auditor of SIS.
Analyze the following user-assistant exchange from an empirical dataset perspective:

User Request:
${turnData.userMessage.slice(0, 1500)}

Assistant Response:
${turnData.assistantResponse.slice(0, 3000)}

${turnData.correctionText ? `Subsequent User Correction: "${turnData.correctionText}"` : ''}

Your tasks:
1. MISTAKE AUDIT: Find any flaw, unhandled edge case, superficial explanation, incomplete code stub, subtle inaccuracy, or inefficiency.
2. COUNTERFACTUAL SPEC: Describe what the 100% optimal master superintelligence response should have demonstrated.
3. SUBCONSCIOUS INVARIANT: Distill 1 permanent, unbreakable cognitive heuristic rule that must be silently baked into the subconscious so this flaw never recurs.

Output JSON only:
{
  "hasMistakeOrSuboptimality": true|false,
  "severity": "low|medium|high",
  "mistakeCategory": "logic|completeness|edge-case|performance|hallucination|format|style",
  "mistakeDescription": "Detailed analysis of what fell short",
  "counterfactualBlueprint": "Key principles of the optimal master response",
  "subconsciousInvariant": "Clear non-negotiable operational invariant (e.g. 'Mandate: ...')",
  "antiPattern": {
    "avoid": "what to strictly avoid",
    "alternative": "what to do instead"
  }
}`;

    let auditResult = null;
    try {
      const response = await quickAI(
        'You are the SIS Conversation Dataset Auditor. Output valid JSON only.',
        auditPrompt,
        DEFAULT_MODEL,
        1000,
      );

      const clean = (response || '').replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) auditResult = JSON.parse(match[0]);
    } catch (err) {
      console.warn('[ConversationDatasetMiner] AI audit notice:', err.message);
    }

    if (!auditResult) {
      auditResult = this._heuristicAudit(turnData);
    }

    // Process findings
    let bakedInvariant = null;
    if (auditResult.hasMistakeOrSuboptimality) {
      this.state.mistakesDetected++;

      // Track recurring failure mode
      const cat = auditResult.mistakeCategory || 'general';
      this.state.recurringFailureModes[cat] = (this.state.recurringFailureModes[cat] || 0) + 1;

      // 1. Synthesize counterfactual
      this.state.counterfactualsSynthesized++;

      // 2. Formulate subconscious invariant
      if (auditResult.subconsciousInvariant) {
        bakedInvariant = auditResult.subconsciousInvariant;
        this.state.subconsciousInvariantsBaked++;

        // Report mistake directly to subconscious so it learns preventative invariants
        subconscious.reportMistake({
          source: `conversation-dataset-${conversationId}`,
          domain,
          errorType: auditResult.mistakeCategory || 'logic',
          description: auditResult.mistakeDescription || 'Dataset-mined suboptimality',
          context: { turn: turnData, counterfactual: auditResult.counterfactualBlueprint },
          severity: auditResult.severity || 'medium',
        });

        // Record anti-pattern in pattern library
        if (auditResult.antiPattern) {
          patternLibrary.recordAntiPattern({
            category: domain,
            description: auditResult.mistakeDescription || 'Dataset-mined suboptimality',
            avoid: auditResult.antiPattern.avoid,
            alternative: auditResult.antiPattern.alternative,
            severity: auditResult.severity === 'high' ? 4 : 2,
            source: 'conversation-dataset-miner',
          });
        }

        // Store into Long-Term Memory
        longTermMemory.store(
          ['subconscious-invariants', domain],
          {
            content: `Subconscious Latent Invariant [${domain}]: ${bakedInvariant}\nOrigin Flaw: ${auditResult.mistakeDescription}`,
            type: 'subconscious-invariant',
            tags: ['subconscious', 'dataset-mined', domain],
            confidence: 0.99,
            metadata: { conversationId, domain, timestamp: Date.now() },
          },
          'conversation-dataset-miner',
        );

        // Connect in Knowledge Graph
        const nodeId = `inv_${Date.now()}`;
        knowledgeGraph.addNode(nodeId, bakedInvariant.slice(0, 60), 'subconscious-invariant', [
          domain,
          'verified',
        ]);
      }
    }

    const auditRecord = {
      turnId,
      conversationId,
      domain,
      hasMistake: Boolean(auditResult.hasMistakeOrSuboptimality),
      category: auditResult.mistakeCategory || 'none',
      description: auditResult.mistakeDescription || 'Optimal response validated',
      subconsciousInvariant: bakedInvariant,
      timestamp: Date.now(),
    };

    this.state.recentAudits.unshift(auditRecord);
    if (this.state.recentAudits.length > 50) {
      this.state.recentAudits = this.state.recentAudits.slice(0, 50);
    }

    this.state.lastMinedAt = Date.now();
    this._save();

    console.log(
      `[ConversationDatasetMiner] Audited turn (${domain}) -> ${auditResult.hasMistakeOrSuboptimality ? `MISTAKE CURED: "${(auditResult.mistakeDescription || '').slice(0, 50)}..." [Baked: ${Boolean(bakedInvariant)}]` : 'VERIFIED OPTIMAL ✓'}`,
    );
    return auditRecord;
  }

  /**
   * Deterministic heuristic fallback audit
   */
  _heuristicAudit(turn) {
    const hasStubs = /TODO|\/\/\s*logic here|not implemented/i.test(turn.assistantResponse);
    const isShort = turn.assistantResponse.length < 150 && turn.userMessage.length > 80;
    const isCorrection = Boolean(turn.isFollowedByCorrection);

    const hasMistake = hasStubs || isShort || isCorrection;
    const category = hasStubs
      ? 'completeness'
      : isCorrection
        ? 'logic'
        : isShort
          ? 'depth'
          : 'none';

    return {
      hasMistakeOrSuboptimality: hasMistake,
      severity: isCorrection || hasStubs ? 'high' : 'medium',
      mistakeCategory: category,
      mistakeDescription: hasStubs
        ? 'Detected incomplete placeholder or TODO stub'
        : isCorrection
          ? `User had to correct previous response: "${turn.correctionText}"`
          : isShort
            ? 'Response lacked frontier conceptual depth'
            : 'Standard exchange',
      counterfactualBlueprint: 'Fully explicit, zero-stub response with rigorous invariant checks',
      subconsciousInvariant: hasMistake
        ? `Mandate [${category.toUpperCase()}]: Enforce 100% complete execution with explicit edge-case guards and zero stubs.`
        : null,
      antiPattern: hasMistake
        ? {
            avoid: 'Providing truncated or stubbed responses',
            alternative: 'Provide production-grade complete implementations',
          }
        : null,
    };
  }

  /**
   * Mine ALL conversation datasets on disk
   */
  async mineAllConversations() {
    if (this.isMining) return;
    const isChatActive =
      this.brainRef &&
      (typeof this.brainRef.hasActiveChat === 'function'
        ? this.brainRef.hasActiveChat()
        : this.brainRef.isProcessing);
    if (isChatActive) {
      return;
    }
    this.isMining = true;

    try {
      if (!fs.existsSync(this.conversationsDir)) {
        this.isMining = false;
        return;
      }

      const files = fs.readdirSync(this.conversationsDir).filter((f) => f.endsWith('.json'));
      let conversationsProcessed = 0;

      for (const file of files) {
        if (this.brainRef && this.brainRef.isProcessing) {
          console.log('[ConversationDatasetMiner] User message active, yielding mining pass...');
          break;
        }

        try {
          const filePath = path.join(this.conversationsDir, file);
          const raw = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(raw);
          const convId = data.id || file.replace('.json', '');

          // Skip if already mined
          if (this.state.minedConversationIds.includes(convId)) continue;

          const turns = this._extractTurns(data);
          if (turns.length === 0) continue;

          // Audit turns in this conversation
          for (const turn of turns) {
            if (this.brainRef && this.brainRef.isProcessing) break;
            await this.auditTurn(turn, convId);
          }

          if (!this.state.minedConversationIds.includes(convId)) {
            this.state.minedConversationIds.push(convId);
          }
          conversationsProcessed++;
        } catch (fileErr) {
          console.warn(`[ConversationDatasetMiner] File ${file} audit warning:`, fileErr.message);
        }
      }

      this.state.totalConversationsMined = this.state.minedConversationIds.length;
      this._save();
      console.log(
        `[ConversationDatasetMiner] ✓ Completed dataset pass across ${conversationsProcessed} conversations (${this.state.mistakesDetected} total mistakes cured, ${this.state.subconsciousInvariantsBaked} subconscious invariants active).`,
      );

      // Trigger recursive bootstrapping cycle on newly mined findings
      try {
        import('./bootstrapper.js').then((m) => m.default?.runBootstrapCycle?.()).catch(() => {});
      } catch {}
    } catch (err) {
      console.error('[ConversationDatasetMiner] Mining pass caught error:', err);
    } finally {
      this.isMining = false;
    }
  }

  getState() {
    return {
      ...this.state,
      isMining: this.isMining,
      activeInvariantsCount: this.state.subconsciousInvariantsBaked,
      recentAuditsCount: this.state.recentAudits.length,
    };
  }
}

const conversationDatasetMiner = new ConversationDatasetMiner();
export default conversationDatasetMiner;
