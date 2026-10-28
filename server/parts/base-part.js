// SIS 1.0 — Base AI Part
// Every AI part extends this class

import { callAI, streamAI } from '../api/openrouter.js';
import shortTermMemory from '../memory/short-term.js';
import longTermMemory from '../memory/long-term.js';
import patternLibrary from '../improvement/anti-patterns.js';
import optimizer from '../improvement/optimizer.js';
import autonomousLearner from '../improvement/autonomous-learner.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class BasePart {
  constructor(config = {}) {
    this.name = config.name || 'unnamed';
    this.id = config.id || this.name;
    this.model =
      config.model ||
      process.env.FREE_MODEL ||
      process.env.DEFAULT_MODEL ||
      'deepseek/deepseek-v4-flash';
    this.promptFile = config.promptFile || null;
    this.systemPrompt = '';
    this.isActive = false;
    this.lastRun = null;
    this.runCount = 0;
    this.capabilities = config.capabilities || [];
    this.priority = config.priority || 5; // 1=highest, 10=lowest
    this.tags = config.tags || [];

    // Load system prompt from .md file
    if (this.promptFile) {
      this._loadPrompt();
    }
  }

  _loadPrompt() {
    try {
      const promptPath = path.join(__dirname, '../prompts', this.promptFile);
      if (fs.existsSync(promptPath)) {
        this.systemPrompt = fs.readFileSync(promptPath, 'utf8');
      }
    } catch (e) {
      console.error(`[${this.name}] Failed to load prompt: ${e.message}`);
    }
  }

  /**
   * Build context from memory for this part
   */
  _buildContext(userMessage) {
    const stmSummary = shortTermMemory.getSummary();
    const ltmSummary = longTermMemory.getSummary(userMessage);
    const selfLearned = patternLibrary.formatForPrompt(userMessage, 800);
    const strategies = patternLibrary.formatStrategiesForPrompt(userMessage, 500);
    const partBoosts = optimizer.formatForPrompt(userMessage, 400);

    let context = `## Current Memory Context

### Short-Term Memory
${stmSummary}

### Relevant Long-Term Memory
${ltmSummary}`;

    if (selfLearned) {
      context += `

${selfLearned}`;
    }
    if (strategies) {
      context += `

${strategies}`;
    }
    if (partBoosts) {
      context += `

${partBoosts}`;
    }

    const autoDirectives = autonomousLearner.formatForPrompt(userMessage, 800);
    if (autoDirectives) {
      context += `

${autoDirectives}`;
    }

    context += `

## Your Identity
You are the "${this.name}" part of SIS (Superintelligence System).
Your capabilities: ${this.capabilities.join(', ')}
You work alongside other AI parts to produce the best possible output.
Store important findings in short-term memory for other parts to access.`;

    return context;
  }

  /**
   * Process a request — override in subclasses for specialized behavior
   */
  async process(userMessage, conversationHistory = []) {
    this.isActive = true;
    this.lastRun = Date.now();
    this.runCount++;

    try {
      const context = this._buildContext(userMessage);
      const fullSystemPrompt = `${this.systemPrompt}\n\n${context}`;

      const messages = [...conversationHistory.slice(-3), { role: 'user', content: userMessage }];

      const response = await callAI({
        model: this.model,
        systemPrompt: fullSystemPrompt,
        messages,
        temperature: 0.5,
        maxTokens: 400,
      });

      const output = response.choices[0]?.message?.content || '';

      // Store output in short-term memory
      if (output.length > 20) {
        shortTermMemory.store(
          ['parts', this.name],
          {
            content: output.substring(0, 500),
            type: 'analysis',
            tags: [this.name, 'part-output', ...this.tags],
            metadata: { partName: this.name, query: userMessage.substring(0, 100) },
          },
          this.name,
        );
      }

      this.isActive = false;
      return {
        part: this.name,
        output,
        confidence: 0.8,
        timestamp: Date.now(),
      };
    } catch (e) {
      this.isActive = false;
      console.error(`[${this.name}] Process error:`, e.message);
      return {
        part: this.name,
        output: '',
        error: e.message,
        confidence: 0,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Check if this part should be activated for a given query
   */
  shouldActivate(userMessage) {
    const msg = userMessage.toLowerCase();
    return (
      this.tags.some((tag) => msg.includes(tag)) ||
      this.capabilities.some((cap) => msg.includes(cap.toLowerCase()))
    );
  }

  /**
   * Get status info
   */
  getStatus() {
    return {
      name: this.name,
      id: this.id,
      isActive: this.isActive,
      lastRun: this.lastRun,
      runCount: this.runCount,
      capabilities: this.capabilities,
      priority: this.priority,
      tags: this.tags,
      model: this.model,
    };
  }
}

export default BasePart;
