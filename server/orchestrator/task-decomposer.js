// SIS 1.0 — Task Decomposer
// Splits complex user requests into parallel sub-tasks and assigns them to specialist agents.
// Simple/atomic messages bypass decomposition entirely for instant response.

import { quickAI } from '../api/openrouter.js';
import registry from '../parts/registry.js';
import { isExplicitBuildOrSaveIntent } from './intent.js';

// Patterns that should NEVER be decomposed (instant passthrough)
const ATOMIC_PATTERNS = [
  /^(hey|hi|hello|greetings|howdy|yo|good\s+(morning|afternoon|evening)|sup|what's up)\b/i,
  /^(thanks|thank you|ok|okay|sure|yes|no|yep|nope|cool|great|nice)\b/i,
  /^(continue|go on|keep going|proceed|finish|resume|do it)\b/i,
];

// Heuristic: messages shorter than this word count are rarely decomposable
const MIN_DECOMPOSE_WORDS = 8;

// Maximum sub-tasks to prevent runaway decomposition
const MAX_SUBTASKS = 4;

/**
 * Decompose a user message into sequential sub-tasks for focused specialist execution.
 *
 * @param {string} userMessage - The user's raw message
 * @param {Array} conversationHistory - Recent conversation context
 * @returns {Object} { decomposable: boolean, subtasks: Array<{ id, objective, agents: string[] }> }
 */
export async function decompose(userMessage, conversationHistory = []) {
  const clean = String(userMessage || '').trim();

  // ─── Fast-path: skip decomposition for atomic messages ───
  if (!clean || clean.split(/\s+/).length < MIN_DECOMPOSE_WORDS) {
    return _atomicFallback(clean, conversationHistory);
  }

  for (const pattern of ATOMIC_PATTERNS) {
    if (pattern.test(clean)) {
      return _atomicFallback(clean, conversationHistory);
    }
  }

  // Fast-path: non-build conversational & explanatory queries route directly to the single top specialist
  if (!isExplicitBuildOrSaveIntent(clean)) {
    return _atomicFallback(clean, conversationHistory);
  }

  // ─── LLM-powered decomposition for complex messages ───
  try {
    const availableAgents = registry.getAll().map((p) => ({
      name: p.name,
      capabilities: p.capabilities,
      tags: p.tags,
    }));

    const agentListStr = availableAgents
      .map((a) => `- "${a.name}": ${a.capabilities.join(', ')}`)
      .join('\n');

    const decompositionPrompt = `You are a task decomposition engine for a superintelligence system with ${availableAgents.length} specialist AI agents.

AVAILABLE AGENTS:
${agentListStr}

USER REQUEST:
"${clean.slice(0, 2000)}"

INSTRUCTIONS:
1. Divide the user request into 2 to 4 logical, sequential execution steps (e.g., Step 1: Architecture/Design, Step 2: Implementation, Step 3: Edge Cases & Verification).
2. If the request is a simple, direct question or conversational message, set "decomposable" to false.
3. Each sub-task must have a clear, actionable objective and EXACTLY ONE primary specialist agent assigned from the list above. Never assign multiple agents to one step.
4. Assign the single BEST matching agent for each step (e.g. "architect" for system design, "coder" for core code, "debugger" for tests/verifications, "security" for vulnerability checks).
5. Return ONLY valid JSON, no markdown.

RESPOND WITH THIS EXACT JSON STRUCTURE:
{
  "decomposable": true/false,
  "reasoning": "brief explanation of decomposition decision",
  "subtasks": [
    {
      "id": "st-1",
      "objective": "specific actionable objective for this execution step",
      "agents": ["agent_name"]
    }
  ]
}

If decomposable is false, return empty subtasks array.`;

    const result = await Promise.race([
      quickAI(
        'You are a JSON-only task decomposition engine. Return ONLY valid JSON.',
        decompositionPrompt,
        undefined,
        1200,
      ),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Decomposition timeout')), 4500),
      ),
    ]);

    // Parse JSON from response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[TaskDecomposer] No JSON found in LLM response, falling back to atomic');
      return _atomicFallback(clean, conversationHistory);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.decomposable || !Array.isArray(parsed.subtasks) || parsed.subtasks.length === 0) {
      return _atomicFallback(clean, conversationHistory);
    }

    // Validate and sanitize subtasks
    const validatedSubtasks = parsed.subtasks
      .slice(0, MAX_SUBTASKS)
      .map((st, idx) => ({
        id: st.id || `st-${idx + 1}`,
        objective: String(st.objective || clean).slice(0, 500),
        agents: _validateAgents(st.agents || []),
      }))
      .filter((st) => st.agents.length > 0);

    if (validatedSubtasks.length === 0) {
      return _atomicFallback(clean, conversationHistory);
    }

    console.log(
      `[TaskDecomposer] Decomposed into ${validatedSubtasks.length} parallel sub-tasks: ${validatedSubtasks.map((s) => `[${s.agents.join(',')}] ${s.objective.slice(0, 50)}`).join(' | ')}`,
    );

    return {
      decomposable: true,
      reasoning: parsed.reasoning || 'Multi-faceted request decomposed for parallel processing',
      subtasks: validatedSubtasks,
    };
  } catch (err) {
    console.warn('[TaskDecomposer] Decomposition failed, falling back to atomic:', err.message);
    return _atomicFallback(clean, conversationHistory);
  }
}

/**
 * Fallback: return a single task routed to the top specialist agent via MoS router.
 */
function _atomicFallback(userMessage, conversationHistory = []) {
  const isBuildIntent = isExplicitBuildOrSaveIntent(userMessage);
  const relevant = registry.findRelevant(userMessage, 3, conversationHistory);

  let selectedAgent;
  if (relevant.length > 0) {
    // If not a build intent and top matched is coder, pick next best non-building analytical specialist if available
    if (!isBuildIntent && relevant[0].name === 'coder' && relevant.length > 1) {
      selectedAgent = relevant[1].name;
    } else {
      selectedAgent = relevant[0].name;
    }
  } else {
    // Dynamic semantic fallback based on user query domain
    if (/\b(math|calculate|equation|number|formula|algebra|calculus)\b/i.test(userMessage))
      selectedAgent = 'mathematician';
    else if (/\b(physics|quantum|force|energy|gravity)\b/i.test(userMessage))
      selectedAgent = 'physicist';
    else if (/\b(code|program|script|debug|bug|develop|software)\b/i.test(userMessage))
      selectedAgent = isBuildIntent ? 'coder' : 'analyst';
    else if (/\b(philosophy|why|meaning|ethics|morals|think)\b/i.test(userMessage))
      selectedAgent = 'philosopher';
    else if (/\b(write|story|essay|article|poem)\b/i.test(userMessage)) selectedAgent = 'writer';
    else selectedAgent = 'researcher';
  }

  return {
    decomposable: false,
    reasoning: 'Atomic or focused request — single specialist routing',
    subtasks: [
      {
        id: 'st-atomic',
        objective: userMessage,
        agents: [selectedAgent],
      },
    ],
  };
}

/**
 * Validate agent names against the registry. Remove invalid names.
 */
function _validateAgents(agentNames) {
  if (!Array.isArray(agentNames)) return [];
  return agentNames
    .map((name) => String(name).toLowerCase().trim())
    .filter((name) => {
      const part = registry.get(name);
      if (!part) {
        console.warn(`[TaskDecomposer] Unknown agent "${name}" — skipping`);
      }
      return !!part;
    })
    .slice(0, 3); // max 3 agents per sub-task
}

export default { decompose };
