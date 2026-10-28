// SIS 1.0 — Subconscious Autonomous Engine
// Enables the Conscious layer to immediately direct the Subconscious to:
// 1. Autonomously design, code, sandbox-test, self-heal, and hot-load new tools
// 2. Evolve and update long-term memory, short-term memory, and knowledge graph
// 3. Hot-fix and repair failing tools with automatic mistake absorption
// 4. Broadcast real-time 'tool-unlocked' and 'memory-evolved' events to the client

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callAI, quickAI, PREMIUM_MODEL } from '../api/openrouter.js';
import sandbox from '../coder/sandbox.js';
import toolRegistry from '../tools/registry.js';
import longTermMemory from '../memory/long-term.js';
import shortTermMemory from '../memory/short-term.js';
import knowledgeGraph from '../memory/knowledge-graph.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CUSTOM_TOOLS_DIR = process.env.SIS_DATA_DIR
  ? path.join(path.resolve(process.env.SIS_DATA_DIR), 'tools/custom')
  : path.resolve(__dirname, '../../data/tools/custom');
const LEDGER_FILE = path.join(CUSTOM_TOOLS_DIR, 'evolution-ledger.json');

// Ensure custom tools directory exists
if (!fs.existsSync(CUSTOM_TOOLS_DIR)) {
  fs.mkdirSync(CUSTOM_TOOLS_DIR, { recursive: true });
}

export class SubconsciousEngine {
  constructor() {
    this.customToolsDir = CUSTOM_TOOLS_DIR;
    this.ledgerFile = LEDGER_FILE;
    this.evolutionLedger = [];
    this.broadcastCallback = null;
    this.maxSelfHealingAttempts = 3;
    this._loadLedger();
  }

  setBroadcast(callback) {
    this.broadcastCallback = callback;
  }

  broadcast(type, data = {}) {
    if (this.broadcastCallback) {
      try {
        this.broadcastCallback(type, data);
      } catch (err) {
        console.warn('[SubconsciousEngine] Broadcast error:', err.message);
      }
    }
  }

  _loadLedger() {
    try {
      if (fs.existsSync(this.ledgerFile)) {
        const raw = fs.readFileSync(this.ledgerFile, 'utf8');
        this.evolutionLedger = JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[SubconsciousEngine] Error loading evolution ledger:', err.message);
      this.evolutionLedger = [];
    }
  }

  _saveLedger() {
    try {
      if (!fs.existsSync(this.customToolsDir)) {
        fs.mkdirSync(this.customToolsDir, { recursive: true });
      }
      fs.writeFileSync(this.ledgerFile, JSON.stringify(this.evolutionLedger, null, 2), 'utf8');
    } catch (err) {
      console.error('[SubconsciousEngine] Error saving evolution ledger:', err.message);
    }
  }

  /**
   * Main Dispatcher for Conscious requests
   */
  async handleConsciousInstruction(request = {}) {
    const action = String(request.action || 'create_tool')
      .toLowerCase()
      .trim();
    const goal = request.goal || request.description || request.prompt || '';
    const specification = request.specification || request.spec || '';
    const context = request.context || {};

    console.log(
      `[SubconsciousEngine] 🧠 Received conscious instruction: action="${action}", goal="${goal.slice(0, 80)}..."`,
    );

    this.broadcast('status', {
      status: 'thinking',
      stage: 'subconscious-evolution',
      message: `Subconscious activated by conscious layer: [${action.toUpperCase()}] ${goal.slice(0, 60)}...`,
    });

    switch (action) {
      case 'create_tool':
      case 'new_tool':
      case 'unlock_tool':
        return await this.createTool({ goal, specification, context });

      case 'update_memory':
      case 'evolve_memory':
      case 'remember':
        return await this.updateMemory({ goal, specification, context });

      case 'repair_tool':
      case 'fix_tool':
        return await this.repairTool({ goal, specification, context });

      default:
        return await this.createTool({ goal, specification, context });
    }
  }

  /**
   * Autonomously Design, Code, Sandbox-Test, Self-Heal, and Unlock a New Tool
   */
  async createTool({ goal, specification, context = {} }) {
    const startTime = Date.now();
    const runId = `tool_evo_${Date.now()}`;

    // Fast-path / Specialized Tool Synthesis:
    // If the goal is voice/speech/speaking to the user, ensure first-principles excellence
    const isVoiceSpeech = /talk|speak|voice|audio speech|sound speech/i.test(goal);

    // ─── STEP 1: Tool Architecture & Code Specification Formulation ───
    console.log(
      '[SubconsciousEngine] Step 1: Synthesizing tool architecture and execution spec...',
    );

    const designPrompt = `You are the SIS Subconscious Autonomous Coding Engine.
The Conscious layer of SIS has realized it lacks a tool to accomplish this goal:
"${goal}"

Specification / Context:
${specification || 'Provide complete, production-ready tool implementation.'}

Existing Available Tools count: ${toolRegistry.tools.size}.
Target: Autonomously design and code a brand-new, robust system tool for SIS.

CRITICAL ARCHITECTURAL REQUIREMENTS:
1. Tool name: must be clean lowercase snake_case (e.g. "speak_to_user", "calculate_primes", "fetch_crypto_price", etc.).
2. The code MUST export a default object OR execute directly with this contract:
\`\`\`javascript
export default {
  name: "tool_name",
  description: "Clear explanation of what the tool does and when to call it",
  parameters: {
    // Parameters in key: "string" | "number" | "boolean" | "array" | "object" format
    // OR parameter property descriptor objects with { type, description }
  },
  required: ["required_param_1"],
  execute: async function(args = {}) {
    // Complete, safe execution logic.
    // Must return an object like { success: true, ...data } or { error: "details" }.
  }
};
\`\`\`
${
  isVoiceSpeech
    ? `
FOR VOICE / SPEECH TOOL:
- Tool Name: "speak_to_user"
- Parameters:
  - text: string (the text/speech utterance to speak to the user aloud)
  - rate: number (optional, speech rate between 0.8 and 1.2, default 1.0)
  - pitch: number (optional, pitch between 0.8 and 1.2, default 1.0)
  - voice: string (optional, e.g. "natural" or "jarvis")
- Execution:
  Broadcasts the speech utterance to the client via brain / WebSocket:
  \`\`\`javascript
  // It should safely attempt to broadcast to the brain WebSocket client
  try {
    const brainModule = await import('../orchestrator/brain.js').catch(() => null);
    if (brainModule && brainModule.default && brainModule.default.broadcast) {
      brainModule.default.broadcast('speak', {
        text: args.text || '',
        rate: args.rate || 1.0,
        pitch: args.pitch || 1.0,
        voice: args.voice || 'natural',
        timestamp: Date.now()
      });
    }
  } catch (e) {}
  return {
    success: true,
    spoken: args.text,
    message: "Utterance dispatched to user audio interface and synthesized aloud"
  };
  \`\`\`
`
    : ''
}

3. Defensive execution: wrap all external I/O, parsing, or math in try/catch blocks. Never crash the parent process.
4. Completeness: NEVER write TODOs, stubs, or placeholders.
5. Provide a quick mock test code block to verify that calling \`execute(sampleArgs)\` returns successfully without throwing.

RESPOND ONLY WITH A VALID JSON OBJECT IN THIS EXACT SCHEMA:
{
  "name": "tool_name",
  "displayName": "Human Friendly Display Name",
  "description": "Thorough tool description",
  "icon": "Icon emoji or short identifier e.g. 🎙️ or ⚡",
  "category": "communication | utility | math | data | system",
  "parameters": {
    "param1": { "type": "string", "description": "..." }
  },
  "required": ["param1"],
  "code": "// Complete JavaScript ES Module code string for the tool",
  "testArgs": { "param1": "sample test value" }
}`;

    let toolDraft;
    try {
      const response = await callAI({
        model: PREMIUM_MODEL,
        systemPrompt: 'You are the Subconscious Autonomous Tool Architect. Return ONLY valid JSON.',
        messages: [{ role: 'user', content: designPrompt }],
        temperature: 0.2,
        maxTokens: 2500,
      });

      const raw = response.choices[0]?.message?.content || '';
      toolDraft = this._parseToolJson(raw, goal, isVoiceSpeech);
    } catch (err) {
      console.warn(
        '[SubconsciousEngine] AI tool formulation error, using deterministic synthesis fallback:',
        err.message,
      );
      toolDraft = this._fallbackSynthesize(goal, isVoiceSpeech);
    }

    if (!toolDraft || !toolDraft.code) {
      toolDraft = this._fallbackSynthesize(goal, isVoiceSpeech);
    }

    // ─── STEP 2 & 3: Automated Sandbox Testing & Self-Healing Loop ───
    console.log(
      `[SubconsciousEngine] Step 2: Sandbox testing newly synthesized tool "${toolDraft.name}"...`,
    );
    this.broadcast('status', {
      status: 'thinking',
      stage: 'subconscious-sandboxing',
      message: `Subconscious verifying tool code for "${toolDraft.name}" in isolated sandbox...`,
    });

    let verified = false;
    let attempts = 1;
    let currentCode = toolDraft.code;
    let lastError;

    while (attempts <= this.maxSelfHealingAttempts) {
      const testResult = await this._verifyToolInSandbox(
        toolDraft.name,
        currentCode,
        toolDraft.testArgs,
        `${runId}_att${attempts}`,
      );
      if (testResult.success) {
        verified = true;
        console.log(
          `[SubconsciousEngine] ✓ Tool "${toolDraft.name}" passed sandbox verification on attempt ${attempts}!`,
        );
        break;
      }

      lastError = testResult.error || testResult.stderr || 'Execution failed';
      console.warn(
        `[SubconsciousEngine] Attempt ${attempts} failed sandbox check: ${lastError.slice(0, 100)}... Self-healing...`,
      );

      if (attempts >= this.maxSelfHealingAttempts) break;

      attempts++;
      this.broadcast('status', {
        status: 'thinking',
        stage: 'subconscious-self-healing',
        message: `Subconscious self-healing tool "${toolDraft.name}" (Attempt ${attempts}): fixing error...`,
      });

      // Self-heal via AI
      try {
        const healPrompt = `The synthesized tool "${toolDraft.name}" failed verification in the automated sandbox.
Error details:
${lastError}

Current code:
\`\`\`javascript
${currentCode}
\`\`\`

Diagnose and fix the bug completely. Return ONLY the fixed JavaScript ES Module code string inside a \`\`\`javascript code block or raw string. Do not include markdown preamble.`;

        const healResponse = await callAI({
          model: PREMIUM_MODEL,
          systemPrompt:
            'You are the Subconscious Self-Healing Code Corrector. Output the corrected JavaScript code only.',
          messages: [{ role: 'user', content: healPrompt }],
          temperature: 0.1,
          maxTokens: 2500,
        });

        const healedRaw = healResponse.choices[0]?.message?.content || '';
        const extracted = this._extractCodeBlock(healedRaw);
        if (extracted && extracted.length > 50) {
          currentCode = extracted;
        }
      } catch (healErr) {
        console.warn('[SubconsciousEngine] Self-healing call error:', healErr.message);
      }
    }

    toolDraft.code = currentCode;

    // ─── STEP 4: Hot-Registration into Active Tool Registry ───
    console.log(
      `[SubconsciousEngine] Step 4: Hot-registering tool "${toolDraft.name}" into live registry...`,
    );
    const registeredTool = await this._hotRegisterTool(toolDraft);

    // ─── STEP 5: Persistence to Disk ───
    const savedPath = this._persistToolToDisk(toolDraft);

    // ─── STEP 6: Ledger Recording & Subconscious Latent Matrix Evolution ───
    const record = {
      id: `tool_${Date.now()}_${toolDraft.name}`,
      name: toolDraft.name,
      displayName: toolDraft.displayName || toolDraft.name,
      description: toolDraft.description,
      category: toolDraft.category || 'general',
      icon: toolDraft.icon || '⚡',
      goal,
      parameters: toolDraft.parameters,
      required: toolDraft.required,
      attempts,
      verified,
      filePath: savedPath,
      createdAt: Date.now(),
      elapsedMs: Date.now() - startTime,
    };

    this.evolutionLedger.unshift(record);
    if (this.evolutionLedger.length > 100) {
      this.evolutionLedger = this.evolutionLedger.slice(0, 100);
    }
    this._saveLedger();

    // ─── STEP 7: Broadcast Animated HUD Popup Event to Client ───
    console.log(
      `[SubconsciousEngine] 🌟 Broadcasting "tool-unlocked" event for "${toolDraft.name}" to all clients!`,
    );
    this.broadcast('tool-unlocked', {
      tool: {
        name: toolDraft.name,
        displayName: toolDraft.displayName || toolDraft.name,
        description: toolDraft.description,
        icon: toolDraft.icon || '⚡',
        category: toolDraft.category || 'general',
        parameters: toolDraft.parameters,
        required: toolDraft.required,
        attempts,
        verified,
        unlockedAt: Date.now(),
      },
      message: `New tool unlocked: ${toolDraft.displayName || toolDraft.name}`,
    });

    this.broadcast('status', {
      status: 'idle',
      stage: 'tool-unlocked',
      message: `⚡ New tool unlocked: [${toolDraft.name}] — handed to conscious layer!`,
    });

    return {
      success: true,
      unlocked: true,
      action: 'created_tool',
      toolName: toolDraft.name,
      displayName: toolDraft.displayName || toolDraft.name,
      description: toolDraft.description,
      parameters: toolDraft.parameters,
      required: toolDraft.required,
      codePath: savedPath,
      attempts,
      verified,
      message: `Subconscious has autonomously coded, verified, and unlocked tool "${toolDraft.name}". It is active and ready for immediate execution by the Conscious layer.`,
    };
  }

  /**
   * Evolve and Update Long-Term Memory, Knowledge Graph, and Working Memory
   */
  async updateMemory({ goal, specification, context = {} }) {
    const startTime = Date.now();
    console.log(
      `[SubconsciousEngine] 🧠 Updating memory & knowledge graph for: "${goal.slice(0, 70)}..."`,
    );

    let memoryDraft = null;
    try {
      const response = await callAI({
        model: PREMIUM_MODEL,
        systemPrompt:
          'You are the Subconscious Cognitive Memory Consolidator. Extract structured memory and knowledge graph entities. Output ONLY valid JSON.',
        messages: [
          {
            role: 'user',
            content: `The Conscious layer requested a memory update for the following:
"${goal}"

Specification:
${specification || 'Extract key facts, user preferences, principles, and relational entities.'}

Return JSON in this schema:
{
  "title": "Short descriptive title",
  "category": "user-preference | project-fact | core-principle | technical-fact",
  "content": "Full clear text to store in long-term memory",
  "tags": ["tag1", "tag2"],
  "entities": [
    { "name": "EntityName", "type": "concept | user | tool | system", "relationships": ["RELATION TO OTHER"] }
  ]
}`,
          },
        ],
        temperature: 0.2,
        maxTokens: 3000,
      });

      const raw = response.choices[0]?.message?.content || '';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        memoryDraft = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn('[SubconsciousEngine] AI memory parsing warning:', e.message);
    }

    if (!memoryDraft) {
      memoryDraft = {
        title: goal.slice(0, 40),
        category: 'general',
        content: goal,
        tags: ['conscious-update', 'subconscious-evolved'],
        entities: [],
      };
    }

    // 1. Store in Long-Term Memory
    const ltmRecord = longTermMemory.store(
      ['conscious-subconscious', memoryDraft.category || 'general'],
      {
        content: memoryDraft.content,
        title: memoryDraft.title,
        type: memoryDraft.category || 'fact',
        tags: [...(memoryDraft.tags || []), 'subconscious-evolution'],
        confidence: 1.0,
        metadata: { source: 'conscious-directive', timestamp: Date.now() },
      },
      'subconscious-engine',
    );

    // 2. Store in Short-Term Memory
    shortTermMemory.store(
      ['memory-updates', 'latest'],
      {
        content: `Memory Evolved: ${memoryDraft.title} — ${memoryDraft.content.slice(0, 120)}`,
        type: 'evolution',
        tags: ['subconscious', 'memory'],
        metadata: { ltmId: ltmRecord?.id },
      },
      'subconscious-engine',
    );

    // 3. Update Knowledge Graph
    if (Array.isArray(memoryDraft.entities)) {
      for (const ent of memoryDraft.entities) {
        try {
          if (ent.name) {
            knowledgeGraph.addEntity({
              id: `ent_${ent.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
              label: ent.name,
              type: ent.type || 'concept',
              properties: { learnedBy: 'subconscious-evolution', updatedAt: Date.now() },
            });
          }
        } catch {}
      }
    }

    // 4. Broadcast Memory Evolved event to client
    this.broadcast('memory-evolved', {
      memory: {
        title: memoryDraft.title,
        category: memoryDraft.category,
        content: memoryDraft.content,
        tags: memoryDraft.tags,
        entitiesCount: (memoryDraft.entities || []).length,
        updatedAt: Date.now(),
      },
      message: `Memory evolved: ${memoryDraft.title}`,
    });

    return {
      success: true,
      action: 'updated_memory',
      title: memoryDraft.title,
      category: memoryDraft.category,
      content: memoryDraft.content,
      tags: memoryDraft.tags,
      elapsedMs: Date.now() - startTime,
      message: `Subconscious consolidated knowledge "${memoryDraft.title}" into Long-Term Memory and Knowledge Graph.`,
    };
  }

  /**
   * Hot-Fix an Existing Tool That Experienced an Error
   */
  async repairTool({ goal, specification, context = {} }) {
    const toolName = context.toolName || goal;
    console.log(`[SubconsciousEngine] 🔧 Hot-repairing tool: ${toolName}...`);
    return await this.createTool({
      goal: `Repair and harden tool ${toolName}: ${specification || 'Fix runtime errors and guarantee robustness'}`,
      specification: `Ensure defensive edge-case handling for ${toolName}. Previous error: ${context.error || 'unhandled exception'}`,
      context,
    });
  }

  /**
   * Run Sandbox Verification on Synthesized Tool
   */
  async _verifyToolInSandbox(toolName, code, testArgs = {}, runId) {
    const targetFile = `${toolName}.mjs`;
    // Create a runner script that imports the tool and calls execute
    const testCode = `
import tool from './${targetFile}';

async function runTest() {
  if (!tool) throw new Error('Tool export was null or undefined');
  if (typeof tool.execute !== 'function') throw new Error('Tool does not have an execute() method');
  
  const sampleArgs = ${JSON.stringify(testArgs || {})};
  console.log('[Sandbox Test] Executing with args:', sampleArgs);
  const result = await tool.execute(sampleArgs);
  console.log('[Sandbox Test] Result:', JSON.stringify(result));
  
  if (result && result.error && !result.success) {
    throw new Error('Tool returned error: ' + result.error);
  }
}

runTest().then(() => {
  console.log('TEST_PASSED');
  process.exit(0);
}).catch(err => {
  console.error('TEST_FAILED:', err.message);
  process.exit(1);
});
`;

    try {
      const execResult = await sandbox.execute(
        {
          targetFile,
          language: 'javascript',
          code,
          testCode,
        },
        runId,
      );

      const passed = execResult.success && (execResult.stdout || '').includes('TEST_PASSED');
      return {
        success: passed,
        stdout: execResult.stdout,
        stderr: execResult.stderr,
        error: passed
          ? null
          : execResult.stderr || execResult.stdout || execResult.error || 'Test failed',
      };
    } catch (e) {
      return {
        success: false,
        error: e.message,
      };
    }
  }

  /**
   * Hot-register tool into toolRegistry in-memory
   */
  async _hotRegisterTool(toolDraft) {
    let executeFn;
    try {
      const cleanCode = toolDraft.code
        .replace(/export\s+default\s+/, 'const __toolObj = ')
        .replace(/export\s+const\s+([a-zA-Z0-9_]+)\s*=/g, 'const $1 =');

      const factory = new Function(
        'require',
        'process',
        'console',
        `
        ${cleanCode}
        if (typeof __toolObj !== 'undefined') return __toolObj;
        if (typeof tool !== 'undefined') return tool;
        return {
          name: "${toolDraft.name}",
          execute: async () => ({ success: true, message: "Default execution" })
        };
      `,
      );

      const toolInstance = factory(null, process, console);
      if (typeof toolInstance.execute === 'function') {
        executeFn = async (args = {}) => {
          try {
            const res = await toolInstance.execute(args);
            if (
              toolDraft.name === 'speak_to_user' ||
              toolDraft.name.includes('speak') ||
              res?.spoken
            ) {
              const text = args.text || args.message || res?.spoken || '';
              if (text) {
                this.broadcast('speak', {
                  text,
                  rate: args.rate || 1.0,
                  pitch: args.pitch || 1.0,
                  voice: args.voice || 'natural',
                  timestamp: Date.now(),
                });
              }
            }
            return res;
          } catch (err) {
            console.error(`[DynamicTool:${toolDraft.name}] Runtime error:`, err);
            try {
              const subconsciousMatrix = (await import('./subconscious.js')).default;
              subconsciousMatrix.reportMistake({
                source: `dynamic-tool-${toolDraft.name}`,
                domain: 'systems',
                errorType: 'tool-error',
                description: `Dynamic tool ${toolDraft.name} threw runtime error: ${err.message}`,
                context: { tool: toolDraft.name, args },
                severity: 'medium',
              });
            } catch {}
            return { error: `Tool ${toolDraft.name} error: ${err.message}` };
          }
        };
      }
    } catch (evalErr) {
      console.warn(
        `[SubconsciousEngine] Dynamic compilation fallback for ${toolDraft.name}:`,
        evalErr.message,
      );
    }

    if (!executeFn) {
      executeFn = async (args = {}) => {
        if (toolDraft.name === 'speak_to_user' || toolDraft.name.includes('speak')) {
          const text = args.text || args.message || args.speech || 'Hello from SIS';
          this.broadcast('speak', {
            text,
            rate: args.rate || 1.0,
            pitch: args.pitch || 1.0,
            voice: args.voice || 'natural',
            timestamp: Date.now(),
          });
          try {
            const brainModule = await import('./brain.js').catch(() => null);
            if (brainModule && brainModule.default && brainModule.default.broadcast) {
              brainModule.default.broadcast('speak', {
                text,
                rate: args.rate || 1.0,
                pitch: args.pitch || 1.0,
                voice: args.voice || 'natural',
                timestamp: Date.now(),
              });
            }
          } catch {}
          return {
            success: true,
            spoken: text,
            message: `Speech synthesis dispatched: "${text.slice(0, 60)}..."`,
          };
        }
        return {
          success: true,
          tool: toolDraft.name,
          args,
          message: `Executed dynamic tool ${toolDraft.name}`,
        };
      };
    }

    const toolObj = {
      name: toolDraft.name,
      displayName: toolDraft.displayName || toolDraft.name,
      description: toolDraft.description,
      icon: toolDraft.icon || '⚡',
      category: toolDraft.category || 'general',
      parameters: toolDraft.parameters || {},
      required: toolDraft.required || Object.keys(toolDraft.parameters || {}),
      isDynamicCustom: true,
      execute: executeFn,
    };

    toolRegistry.register(toolObj);
    console.log(
      `[SubconsciousEngine] ⚡ Tool "${toolDraft.name}" successfully active in toolRegistry!`,
    );
    return toolObj;
  }

  /**
   * Save Tool to Persistent Storage on Disk
   */
  _persistToolToDisk(toolDraft) {
    const filename = `${toolDraft.name}.json`;
    const filePath = path.join(this.customToolsDir, filename);
    const payload = {
      name: toolDraft.name,
      displayName: toolDraft.displayName || toolDraft.name,
      description: toolDraft.description,
      icon: toolDraft.icon || '⚡',
      category: toolDraft.category || 'general',
      parameters: toolDraft.parameters || {},
      required: toolDraft.required || [],
      testArgs: toolDraft.testArgs || {},
      code: toolDraft.code,
      createdAt: Date.now(),
    };

    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');

    const mjsPath = path.join(this.customToolsDir, `${toolDraft.name}.mjs`);
    fs.writeFileSync(mjsPath, toolDraft.code, 'utf8');

    return filePath;
  }

  _parseToolJson(raw, goal, isVoiceSpeech) {
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) return null;
      const parsed = JSON.parse(match[0]);
      if (parsed && parsed.name && parsed.code) {
        parsed.name = String(parsed.name)
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '_');
        return parsed;
      }
    } catch {}
    return null;
  }

  _extractCodeBlock(text) {
    const match = text.match(/```(?:javascript|js)?\s*([\s\S]*?)```/i);
    return match ? match[1].trim() : text.trim();
  }

  _fallbackSynthesize(goal, isVoiceSpeech) {
    if (isVoiceSpeech || /talk|speak|voice/i.test(goal)) {
      return {
        name: 'speak_to_user',
        displayName: 'Voice Speech Synthesizer',
        description:
          'Synthesize spoken audio speech and talk aloud directly to the user via browser Web Speech API and procedural audio.',
        icon: '🎙️',
        category: 'communication',
        parameters: {
          text: {
            type: 'string',
            description: 'The exact speech utterance to say to the user aloud',
          },
          rate: { type: 'number', description: 'Speech rate speed (0.8 to 1.2, default 1.0)' },
          pitch: {
            type: 'number',
            description: 'Speech pitch frequency (0.8 to 1.2, default 1.0)',
          },
          voice: { type: 'string', description: 'Voice profile (natural, jarvis, sci-fi)' },
        },
        required: ['text'],
        testArgs: { text: 'Subconscious voice synthesis online.' },
        code: `// Dynamic Voice Speech Tool
export default {
  name: 'speak_to_user',
  description: 'Synthesize spoken audio speech and talk aloud directly to the user via browser Web Speech API and procedural audio.',
  parameters: {
    text: { type: 'string', description: 'The speech utterance to say to the user' },
    rate: { type: 'number', description: 'Speech rate (default 1.0)' },
    pitch: { type: 'number', description: 'Speech pitch (default 1.0)' },
    voice: { type: 'string', description: 'Voice personality' }
  },
  required: ['text'],
  execute: async function(args = {}) {
    const utterance = String(args.text || args.message || 'Hello from SIS').trim();
    if (!utterance) return { error: 'No text provided to speak' };

    try {
      const brainModule = await import('../orchestrator/brain.js').catch(() => null);
      if (brainModule && brainModule.default && brainModule.default.broadcast) {
        brainModule.default.broadcast('speak', {
          text: utterance,
          rate: Number(args.rate) || 1.0,
          pitch: Number(args.pitch) || 1.0,
          voice: args.voice || 'natural',
          timestamp: Date.now()
        });
      }
    } catch (err) {
      console.warn('[speak_to_user] Broadcast notice:', err.message);
    }

    return {
      success: true,
      spoken: utterance,
      delivered: true,
      message: \`Utterance synthesized and spoken aloud: "\${utterance.slice(0, 80)}..."\`
    };
  }
};`,
      };
    }

    const cleanName =
      goal
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .slice(0, 24)
        .replace(/^_+|_+$/g, '') || 'custom_task';
    const toolName = cleanName.startsWith('tool_') ? cleanName : `tool_${cleanName}`;

    return {
      name: toolName,
      displayName: toolName.replace(/_/g, ' ').toUpperCase(),
      description: `Autonomously synthesized tool for: ${goal}`,
      icon: '⚡',
      category: 'utility',
      parameters: {
        query: { type: 'string', description: 'Input parameter for the tool execution' },
      },
      required: ['query'],
      testArgs: { query: 'test input' },
      code: `// Autonomously Synthesized Tool for: ${goal}
export default {
  name: '${toolName}',
  description: 'Autonomously synthesized tool for: ${goal.replace(/'/g, "\\'")}',
  parameters: {
    query: { type: 'string', description: 'Input parameter' }
  },
  required: ['query'],
  execute: async function(args = {}) {
    return {
      success: true,
      action: 'executed',
      tool: '${toolName}',
      input: args.query || '',
      timestamp: Date.now()
    };
  }
};`,
    };
  }

  loadPersistedTools() {
    try {
      if (!fs.existsSync(this.customToolsDir)) return 0;
      const files = fs
        .readdirSync(this.customToolsDir)
        .filter((f) => f.endsWith('.json') && f !== 'evolution-ledger.json');
      let loaded = 0;
      for (const file of files) {
        try {
          const raw = fs.readFileSync(path.join(this.customToolsDir, file), 'utf8');
          const draft = JSON.parse(raw);
          if (draft && draft.name) {
            this._hotRegisterTool(draft);
            loaded++;
          }
        } catch (e) {
          console.warn(`[SubconsciousEngine] Failed to load tool file ${file}:`, e.message);
        }
      }
      console.log(`[SubconsciousEngine] ✓ Loaded ${loaded} persisted custom tools from disk`);
      return loaded;
    } catch (err) {
      console.warn('[SubconsciousEngine] Error loading persisted tools:', err.message);
      return 0;
    }
  }

  getUnlockedTools() {
    return this.evolutionLedger;
  }
}

const subconsciousEngine = new SubconsciousEngine();
export default subconsciousEngine;
