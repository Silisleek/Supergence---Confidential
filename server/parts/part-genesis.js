// SIS 1.0 — Autonomous Meta-Part Genesis & Delegation Engine
// Pillar 14: SIS's conscious mind can dynamically create as many experts as needed, dispatch tasks to them anytime, and make parts by itself

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BasePart } from './base-part.js';
import registry from './registry.js';
import shortTermMemory from '../memory/short-term.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DYNAMIC_PARTS_FILE = process.env.SIS_DATA_DIR
  ? path.join(path.resolve(process.env.SIS_DATA_DIR), 'dynamic-parts.json')
  : path.resolve(__dirname, '../../data/dynamic-parts.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DYNAMIC_PARTS_FILE))) {
  fs.mkdirSync(path.dirname(DYNAMIC_PARTS_FILE), { recursive: true });
}

export class PartGenesisEngine {
  constructor() {
    this.persistedParts = new Map();
    this._loadPersisted();
  }

  _loadPersisted() {
    try {
      if (fs.existsSync(DYNAMIC_PARTS_FILE)) {
        const raw = fs.readFileSync(DYNAMIC_PARTS_FILE, 'utf8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          for (const item of list) {
            this.persistedParts.set(item.name, item);
          }
        }
      }
    } catch (e) {
      console.warn('[PartGenesis] Persisted parts load notice:', e.message);
    }
  }

  _savePersisted() {
    try {
      const arr = Array.from(this.persistedParts.values());
      fs.writeFileSync(DYNAMIC_PARTS_FILE, JSON.stringify(arr, null, 2), 'utf8');
    } catch (e) {
      console.error('[PartGenesis] Failed to save dynamic parts:', e.message);
    }
  }

  /**
   * Conscious Part Creation: Dynamically create an expert part from scratch
   */
  async createExpertPart({
    name,
    role = '',
    domain = 'general',
    capabilities = [],
    promptInstructions = '',
    tags = [],
    priority = 3,
  }) {
    const safeName = name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    if (!safeName) throw new Error('Expert name required');

    // 1. Generate specialized markdown prompt
    const promptContent = `# Dynamic Specialist: ${safeName.toUpperCase()}
**Domain**: ${domain}
**Role**: ${role || safeName}
**Capabilities**: ${(capabilities || []).join(', ') || 'specialized analysis'}

## Operational Instructions
${promptInstructions || `You are an elite, dedicated AI specialist in ${domain}. Analyze the given input with rigorous precision, first-principles logic, and deliver clear, actionable results.`}

## Behavioral Mandates
- Provide definitive, deeply grounded specialist answers.
- Format all equations using KaTeX notation.
- Never emit incomplete stubs, placeholders, or superficial conversational filler.`;

    const promptFile = `dynamic-${safeName}.md`;
    const promptPath = path.join(__dirname, '../prompts', promptFile);
    fs.writeFileSync(promptPath, promptContent, 'utf8');

    // 2. Instantiate BasePart
    const partConfig = {
      name: safeName,
      promptFile,
      capabilities: capabilities.length > 0 ? capabilities : [domain],
      tags: tags.length > 0 ? tags : [safeName, domain],
      priority,
    };

    const newPart = new BasePart(partConfig);
    registry.dynamicParts.set(safeName, newPart);

    // 3. Persist metadata
    this.persistedParts.set(safeName, {
      ...partConfig,
      role,
      domain,
      createdAt: Date.now(),
    });
    this._savePersisted();

    // 4. Log to working memory
    shortTermMemory.store(
      ['parts', 'genesis'],
      {
        content: `SIS Conscious Layer autonomously spawned expert part: ${safeName} (${role || domain})`,
        type: 'part-genesis',
        tags: ['dynamic-expert', safeName, domain],
      },
      'genesis-engine',
    );

    console.log(
      `[PartGenesis] ⚡ Autonomous Meta-Part Genesis: Created and hot-registered expert "${safeName}"`,
    );

    return {
      success: true,
      name: safeName,
      role: role || safeName,
      domain,
      capabilities: partConfig.capabilities,
      registered: true,
    };
  }

  /**
   * Conscious Delegation: Dispatch a custom task directly to any part (built-in or dynamic)
   */
  async dispatchTaskToPart({ partName, taskObjective, context = {} }) {
    const safeName = String(partName || '')
      .toLowerCase()
      .trim();
    const part = registry.get(safeName);

    if (!part) {
      throw new Error(
        `Part "${safeName}" not found in registry. Use list_dynamic_parts to view available experts, or create_expert_part to make one.`,
      );
    }

    const startTime = Date.now();
    console.log(`[PartGenesis] 🎯 Conscious Layer dispatching task to expert "${safeName}"...`);

    const result = await part.process(taskObjective, context.conversationHistory || []);

    const finalOutput =
      result.output ||
      (result.error
        ? `[Autonomous Expert: ${safeName}] Processed objective: "${taskObjective}". (Subconscious fallback recorded: ${result.error})`
        : `[Autonomous Expert: ${safeName}] Analysis concluded.`);

    return {
      success: true,
      part: safeName,
      objective: taskObjective,
      output: finalOutput,
      error: result.error || null,
      elapsedMs: Date.now() - startTime,
    };
  }

  /**
   * List all dynamic and built-in parts
   */
  listAllExperts() {
    const builtIn = Array.from(registry.parts.keys()).map((name) => ({
      name,
      type: 'built-in',
      capabilities: registry.parts.get(name)?.capabilities || [],
    }));

    const dynamic = Array.from(registry.dynamicParts.keys()).map((name) => ({
      name,
      type: 'dynamic-genesis',
      capabilities: registry.dynamicParts.get(name)?.capabilities || [],
    }));

    return {
      total: builtIn.length + dynamic.length,
      builtInCount: builtIn.length,
      dynamicCount: dynamic.length,
      builtIn,
      dynamic,
    };
  }
}

const partGenesisEngine = new PartGenesisEngine();
export default partGenesisEngine;
