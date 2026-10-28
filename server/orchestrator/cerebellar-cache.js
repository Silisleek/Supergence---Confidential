// SIS 1.0 — Cerebellar Cache (System 1 Fast-Path Engine)
// Models the human cerebellum: procedural automation, internal forward models,
// and habit execution. Bypasses the slow deliberative prefrontal cortex (PFC)
// for automated, repetitive, or low-entropy requests (<50ms vs 15-50s).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.join(__dirname, '../../data/memory/cerebellar-cache.json');

// Normalization for robust pattern matching
function normalizePrompt(prompt) {
  return String(prompt || '')
    .trim()
    .toLowerCase()
    .replace(/[^\w\s\+\-\*\/=]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

class CerebellarCache {
  constructor() {
    this.storagePath = CACHE_FILE;
    this.cache = new Map(); // normalizedKey -> CacheEntry
    this.maxEntries = 200;
    this.stats = {
      hits: 0,
      misses: 0,
      learnedPatterns: 0,
      bypasses: 0,
    };
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const raw = JSON.parse(fs.readFileSync(this.storagePath, 'utf8'));
        if (Array.isArray(raw.entries)) {
          for (const entry of raw.entries) {
            const isCorrupted =
              typeof entry.output !== 'string' ||
              entry.output.includes('DIRECT RESPONSE MODE') ||
              entry.output.includes('DIRECT-FALLBACK') ||
              entry.output.includes('EVOLVED META-DIRECTIVES') ||
              entry.output.includes('All specialist agents were unavailable') ||
              entry.output.includes('Autonomous Core Fallback');
            const isCannedOrConversational =
              /^(ping|hello|hi|hey|greetings|who are you|how are you|what's up|sup|what is 2\+2|what is 2 2|2\+2|2 2|continue|go on|keep going|proceed|finish|resume|do it|more|next|fix\b|repair\b|debug\b|recreate\b|make\b|build\b|create\b|change\b|update\b|why\b|how come\b|what happened\b)/i.test(
                entry.key,
              ) ||
              /\b(it|this|that|these|those|again|more|file|preview|code|bug|error)\b/i.test(
                entry.key,
              );
            if (!isCorrupted && !isCannedOrConversational) {
              this.cache.set(entry.key, entry);
            }
          }
        }
        if (raw.stats) {
          this.stats = { ...this.stats, ...raw.stats };
        }
      }
    } catch (e) {
      console.warn('[Cerebellum] Cache load warning, starting fresh:', e.message);
    }
  }

  _save() {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const payload = {
        entries: Array.from(this.cache.values()),
        stats: this.stats,
        updatedAt: Date.now(),
      };
      fs.writeFileSync(this.storagePath, JSON.stringify(payload, null, 2));
    } catch (e) {
      console.error('[Cerebellum] Save error:', e.message);
    }
  }

  /**
   * Predict whether an incoming request can be resolved by automated cerebellar reflex.
   * STRICT ZERO HARDCODING: All conversational, identity, greeting, and contextual queries
   * strictly bypass cerebellar cache to be handled dynamically by the conscious LLM from first principles.
   */
  predict(userMessage) {
    const clean = String(userMessage || '')
      .trim()
      .toLowerCase();

    // Explicit bypass: ZERO canned replies. Greetings, conversational chat, questions, identity, and task commands always route dynamically.
    const isConversationalOrContextual =
      /^(ping|hello|hi|hey|greetings|who are you|how are you|what's up|sup|who made you|your name|what is 2\+2|what is 2 2|2\+2|2 2|continue|go on|keep going|proceed|finish|resume|do it|more|next|fix\b|repair\b|debug\b|recreate\b|make\b|build\b|create\b|change\b|update\b|why\b|how come\b|what happened\b)/i.test(
        clean,
      ) || /\b(it|this|that|these|those|again|more|file|preview|code|bug|error)\b/i.test(clean);

    if (isConversationalOrContextual) {
      this.stats.misses++;
      return { hit: false };
    }

    const key = normalizePrompt(userMessage);
    if (!key || key.length > 70) {
      this.stats.misses++;
      return { hit: false };
    }

    const entry = this.cache.get(key);
    if (entry && entry.confidence >= 0.9 && entry.output) {
      // Validate that cached output is not corrupted or fallback
      if (
        entry.output.includes('DIRECT RESPONSE MODE') ||
        entry.output.includes('DIRECT-FALLBACK') ||
        entry.output.includes('EVOLVED META-DIRECTIVES') ||
        entry.output.includes('All specialist agents were unavailable') ||
        entry.output.includes('Autonomous Core Fallback')
      ) {
        this.cache.delete(key);
        this._save();
        this.stats.misses++;
        return { hit: false };
      }

      entry.hits++;
      entry.lastHit = Date.now();
      this.stats.hits++;
      this.stats.bypasses++;
      this._save();

      console.log(
        `[Cerebellum] ⚡ System 1 Reflex Triggered: "${key.slice(0, 40)}" (hit #${entry.hits}, conf: ${entry.confidence})`,
      );
      return {
        hit: true,
        output: entry.output,
        confidence: entry.confidence,
        key: entry.key,
      };
    }

    this.stats.misses++;
    return { hit: false };
  }

  /**
   * Learn / reinforce a procedural response from successful conscious execution
   */
  learn(userMessage, output, confidence = 0.92) {
    const clean = String(userMessage || '')
      .trim()
      .toLowerCase();
    const isConversationalOrContextual =
      /^(ping|hello|hi|hey|greetings|who are you|how are you|what's up|sup|who made you|your name|what is 2\+2|what is 2 2|2\+2|2 2|continue|go on|keep going|proceed|finish|resume|do it|more|next|fix\b|repair\b|debug\b|recreate\b|make\b|build\b|create\b|change\b|update\b|why\b|how come\b|what happened\b)/i.test(
        clean,
      ) || /\b(it|this|that|these|those|again|more|file|preview|code|bug|error)\b/i.test(clean);

    if (isConversationalOrContextual) return false;

    const key = normalizePrompt(userMessage);
    // Only compile compact, high-value, reproducible atomic queries into cerebellum
    if (!key || key.length > 60 || !output || output.length > 800 || output.length < 2) {
      return false;
    }

    // Don't cache error notices, thinking text, broken outputs, or leaked prompt directives
    if (
      output.includes('[object Object]') ||
      output.includes('Error:') ||
      output.includes('Decomposition timeout') ||
      output.includes('DIRECT RESPONSE MODE') ||
      output.includes('DIRECT-FALLBACK') ||
      output.includes('EVOLVED META-DIRECTIVES') ||
      output.includes('All specialist agents were unavailable') ||
      output.includes('Autonomous Core Fallback') ||
      output.includes('CRITICAL INSTRUCTION:') ||
      output.includes('PROCEED IMMEDIATELY:') ||
      output.includes('```diff')
    ) {
      return false;
    }

    const existing = this.cache.get(key);
    if (existing) {
      existing.hits++;
      existing.confidence = Math.min(0.99, existing.confidence + 0.02);
      existing.output = output.trim();
      existing.lastHit = Date.now();
    } else {
      // Manage capacity
      if (this.cache.size >= this.maxEntries) {
        // Prune least recently used / lowest hits
        let oldestKey = null;
        let lowestScore = Infinity;
        for (const [k, v] of this.cache.entries()) {
          const score = v.hits * 10 + (Date.now() - v.lastHit) / 3600000;
          if (score < lowestScore) {
            lowestScore = score;
            oldestKey = k;
          }
        }
        if (oldestKey) this.cache.delete(oldestKey);
      }

      this.cache.set(key, {
        key,
        prompt: userMessage.trim(),
        output: output.trim(),
        confidence,
        hits: 1,
        createdAt: Date.now(),
        lastHit: Date.now(),
        source: 'conscious-distillation',
      });
      this.stats.learnedPatterns++;
    }

    this._save();
    return true;
  }

  /**
   * Get cerebellar statistics
   */
  getState() {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      stats: { ...this.stats },
      recentReflexes: Array.from(this.cache.values())
        .sort((a, b) => b.lastHit - a.lastHit)
        .slice(0, 10)
        .map((e) => ({ key: e.key, hits: e.hits, confidence: e.confidence })),
    };
  }
}

const cerebellarCache = new CerebellarCache();
export { CerebellarCache };
export default cerebellarCache;
