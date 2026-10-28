// SIS 1.0 — Memory Verifier
// Runs 24/7, fact-checks new short-term memories and promotes to long-term

import shortTermMemory from './short-term.js';
import longTermMemory from './long-term.js';
import { quickAI } from '../api/openrouter.js';
import { toText } from './tree.js';

const VERIFY_INTERVAL = 30000; // 30 seconds
let isRunning = false;

const VERIFIER_PROMPT = `You are the Memory Verifier of SIS (Superintelligence System).

Your job:
1. Review new information added to short-term memory
2. Fact-check each piece of information
3. Determine if it should be promoted to long-term memory
4. Flag uncertain information with "(could be wrong)"

For each memory item, respond with a JSON object:
{
  "shouldPromote": true/false,
  "confidence": 0.0-1.0,
  "couldBeWrong": true/false,
  "reason": "brief explanation",
  "category": ["suggested", "category", "path"],
  "correctedContent": "corrected version if needed, or null"
}

Rules:
- Factual claims need high confidence to promote (>0.8)
- User preferences, observations, and context are always promoted
- Code outputs and generated content are promoted as-is
- Mathematical results should be verified
- Scientific claims need careful review
- If unsure, set couldBeWrong: true`;

class MemoryVerifier {
  constructor() {
    this.interval = null;
    this.verified = new Set(); // IDs we've already checked
    this.stats = { checked: 0, promoted: 0, flagged: 0, errors: 0, skippedForChat: 0 };
    this._brain = null;
  }

  /**
   * Bind the brain instance so verification can yield to active chat tasks.
   */
  setBrain(brain) {
    this._brain = brain;
  }

  start() {
    if (isRunning) return;
    isRunning = true;
    console.log('[Verifier] Started — checking every 60s');
    this.interval = setInterval(() => this.verify(), 60000);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    isRunning = false;
    console.log('[Verifier] Stopped');
  }

  async verify() {
    // Cognitive Gating: Never consume API slots while user is actively chatting
    if (this._brain && (this._brain.hasActiveChat() || this._brain.isProcessing)) {
      this.stats.skippedForChat++;
      return;
    }

    try {
      const unverified = shortTermMemory.getUnverified();
      const toCheck = unverified.filter((n) => !this.verified.has(n.id)).slice(0, 5);

      for (const node of toCheck) {
        await this.verifyNode(node);
      }
    } catch (e) {
      console.error('[Verifier] Cycle error:', e.message);
      this.stats.errors++;
    }
  }

  async verifyNode(node) {
    if (this.verified.has(node.id)) return;
    if (node.type === 'root' || node.type === 'category') return;

    try {
      this.verified.add(node.id);
      this.stats.checked++;

      const safeContent = toText(node.content);

      // Retain short context without claiming it was fact-checked.
      if (!safeContent || safeContent.length < 10) {
        this._promote(node, ['general'], null);
        return;
      }

      // Retention is useful even when model review is disabled. It is not verification.
      if (process.env.ENABLE_BACKGROUND_LLM_LOOPS !== 'true') {
        this._promote(node, ['general'], null);
        return;
      }

      // Use AI to verify
      const response = await quickAI(
        VERIFIER_PROMPT,
        `Verify this memory item:\nType: ${node.type}\nTags: ${node.tags.join(', ')}\nContent: ${safeContent.substring(0, 1000)}\nSource: ${node.source}`,
      );

      let result;
      try {
        // Extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        // An unparseable review supplies no authority to promote or verify.
        result = null;
      }

      if (!result) return;

      // Update short-term memory with verification status
      shortTermMemory.update(node.id, {
        metadata: {
          verified: false,
          reviewedAt: Date.now(),
          reviewConfidence: result.confidence,
          verificationStatus: 'MODEL_REVIEWED',
        },
      });

      if (result.couldBeWrong) {
        const stmNode = shortTermMemory.read(node.id);
        if (stmNode) stmNode.markCouldBeWrong();
        this.stats.flagged++;
      }

      if (result.shouldPromote) {
        const content = result.correctedContent || node.content;
        this._promote(
          node,
          result.category || ['general'],
          result.confidence,
          content,
          result.couldBeWrong,
        );
      }
    } catch (e) {
      console.error(`[Verifier] Error verifying ${node.id}:`, e.message);
      this.stats.errors++;
    }
  }

  _promote(node, category, confidence, content = null, couldBeWrong = false) {
    const ltmNode = longTermMemory.store(
      category,
      {
        content: content || node.content,
        type: node.type,
        tags: [...node.tags.filter((tag) => tag !== 'verified'), 'retained'],
        metadata: {
          ...node.metadata,
          originalId: node.id,
          reviewConfidence: confidence,
          retainedAt: Date.now(),
          verificationStatus: confidence === null ? 'UNVERIFIED' : 'MODEL_REVIEWED',
        },
        confidence: node.confidence,
        couldBeWrong,
      },
      'verifier',
    );

    if (couldBeWrong) {
      ltmNode.markCouldBeWrong();
    }

    this.stats.promoted++;
    console.log(`[Verifier] Promoted memory ${node.id} → LTM (confidence: ${confidence})`);
  }

  getStats() {
    return { ...this.stats, isRunning };
  }

  getStatus() {
    return this.getStats();
  }
}

const verifier = new MemoryVerifier();
export default verifier;
