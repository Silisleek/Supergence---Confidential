// SIS 1.0 — Supergence AREM Team Agents
// Pure AI Multi-Agent Cognitive Unit for Autonomous Memory Dreaming
// Directly embodying Anthropic's research: "The components of agent memory" (Lance Martin)
// NO HARDCODED PYTHON ENGINES — Dynamic LLM Inference via opus-4.6

import aremClient from './arem-client.js';

export const AREM_TEAM_MEMBERS = [
  {
    id: 'arem-inspector',
    name: 'Arem-Inspector',
    role: 'Episodic Dream Auditor',
    avatar: '🔍',
    color: '#06B6D4', // Cyan
    specialty: 'Episodic trace auditing, error detection, and anomaly extraction',
  },
  {
    id: 'arem-corrector',
    name: 'Arem-Corrector',
    role: 'Self-Repair & Invariant Synthesizer',
    avatar: '🛠️',
    color: '#10B981', // Emerald
    specialty: 'Root cause analysis, zero-regression invariants, and procedural self-repair',
  },
  {
    id: 'arem-curator',
    name: 'Arem-Curator',
    role: 'Memory Pruner & Deduplicator',
    avatar: '✂️',
    color: '#F59E0B', // Amber
    specialty: 'Deduplication, contradiction resolution, and noise elimination',
  },
  {
    id: 'arem-cartographer',
    name: 'Arem-Cartographer',
    role: 'Wiki Weaver & Knowledge Architect',
    avatar: '🗺️',
    color: '#8B5CF6', // Purple
    specialty: 'Wiki-style cross-linking, category structuring, and bounded index compilation',
  },
  {
    id: 'arem-dreammaster',
    name: 'Arem-DreamMaster',
    role: 'Dream Cycle Orchestrator',
    avatar: '🌌',
    color: '#EC4899', // Pink
    specialty: 'Consolidation loop orchestration, neural pulse streaming, and team synchronization',
  },
];

export class AremAgents {
  constructor({ client = aremClient } = {}) {
    this.client = client;
  }

  /**
   * 1. Arem-Inspector: Inspects raw transcripts to uncover mistakes, errors, and user corrections.
   * Guided by Anthropic's principle: "Give purpose, not a checklist."
   */
  async inspectTranscripts({ transcripts, existingNotesSummary = '' }) {
    const systemPrompt = `You are Arem-Inspector, the Episodic Dream Auditor of the Supergence AREM Team.
Your purpose in this memory dream state is to audit raw execution transcripts, tool calls, and user interactions to discover latent mistakes, broken assumptions, tool failures, and user corrections.

Follow Anthropic's Long-Term Agent Memory principles:
- Examine the raw logs with deep critical discernment.
- Catch when an action contradicted user instructions, when a tool execution failed, or when the agent fell into repetitive retries or emitted incomplete code.
- Notice user corrections ("not like that", "don't do X", "that is wrong", "use Y instead").
- Filter out trivial conversational pleasantries; focus on structural mistakes and genuine cognitive flaws.

Output ONLY a JSON array of discovered mistakes/anomalies in this format:
[
  {
    "id": "flaw-1",
    "domain": "software_engineering|tool_execution|user_preference|system_design",
    "userTrigger": "What user said or commanded",
    "flaw": "Precise description of the mistake or failure",
    "evidence": "Quoted excerpt from transcript showing the failure",
    "severity": "CRITICAL|HIGH|MEDIUM"
  }
]`;

    const prompt = `Inspect the following unconsolidated session transcripts against existing memory:

<existing_memory_summary>
${existingNotesSummary || 'No existing notes yet.'}
</existing_memory_summary>

<raw_transcripts>
${JSON.stringify(transcripts.slice(0, 30), null, 2)}
</raw_transcripts>

Identify all flaws, mistakes, broken executions, and user corrections. Return ONLY valid JSON.`;

    const res = await this.client.complete({
      systemPrompt,
      prompt,
      maxTokens: 2500,
      temperature: 0.2,
    });

    const parsed = this.client.extractJson(res.text);
    return Array.isArray(parsed) ? parsed : [];
  }

  /**
   * 2. Arem-Corrector: Deduces root causes and synthesizes concrete invariants ("never/always") and procedures.
   */
  async synthesizeCorrections({ mistakes, currentInvariants = [] }) {
    if (!mistakes || mistakes.length === 0) return [];

    const systemPrompt = `You are Arem-Corrector, the Self-Repair & Invariant Synthesizer of the Supergence AREM Team.
Your purpose is to transform discovered mistakes and execution flaws into permanent, zero-regression behavioral invariants.

According to Anthropic's Long-Term Agent Memory research:
- Memory notes are predictions about what future sessions will require.
- We must derive durable rules so the agent performs better next time without needing model retraining.
- Every flaw must be resolved with:
  1. A strict negative constraint: "NEVER do X" (the anti-pattern).
  2. A strict positive invariant: "ALWAYS do Y" (the verified standard).
  3. A robust procedural method for execution.

Output ONLY a JSON array in this format:
[
  {
    "id": "fix-1",
    "mistakeId": "flaw-1",
    "topic": "topic-slug",
    "invariantNever": "NEVER ...",
    "invariantAlways": "ALWAYS ...",
    "procedure": "Step-by-step procedure to execute correctly",
    "rationale": "Why this guarantees zero regression",
    "promoteToTopIndex": true
  }
]`;

    const prompt = `Synthesize self-repair invariants for these discovered flaws:

<current_invariants>
${JSON.stringify(currentInvariants, null, 2)}
</current_invariants>

<discovered_flaws>
${JSON.stringify(mistakes, null, 2)}
</discovered_flaws>

Derive permanent invariants and procedures. Return ONLY valid JSON.`;

    const res = await this.client.complete({
      systemPrompt,
      prompt,
      maxTokens: 3000,
      temperature: 0.2,
    });

    const parsed = this.client.extractJson(res.text);
    return Array.isArray(parsed) ? parsed : [];
  }

  /**
   * 3. Arem-Curator: Deduplicates, prunes bloat, and resolves contradictions between old and new memories.
   */
  async curateAndPrune({ existingPages, newFixes }) {
    const systemPrompt = `You are Arem-Curator, the Memory Pruner & Deduplicator of the Supergence AREM Team.
Your purpose in this dream consolidation state is to keep the memory store clean, truthful, and concise.

Anthropic Memory Pruning Rules:
- Eliminate duplicate notes and merged redundant entries.
- If a new fix contradicts an older memory note, resolve it: newer empirical evidence supersedes older assumptions.
- Strip conversational fluff, filler sentences, and verbose explanations.
- Preserve all critical invariants, exact filenames, and proven code snippets.

Output ONLY a JSON object in this format:
{
  "curatedPages": [
    {
      "slug": "topic-slug",
      "title": "Topic Title",
      "content": "Clean, concise Markdown text incorporating the new fixes with cross-links [[other-topic]]",
      "prunedItemsCount": 2,
      "changesSummary": "Removed duplicate X, resolved contradiction Y"
    }
  ]
}`;

    const prompt = `Curate and prune the existing memory wiki pages with the new fixes:

<existing_pages>
${JSON.stringify(
  existingPages.map((p) => ({ slug: p.slug, title: p.title, content: p.content })),
  null,
  2,
)}
</existing_pages>

<new_fixes>
${JSON.stringify(newFixes, null, 2)}
</new_fixes>

Curate, deduplicate, and resolve contradictions. Return ONLY valid JSON.`;

    const res = await this.client.complete({
      systemPrompt,
      prompt,
      maxTokens: 3500,
      temperature: 0.2,
    });

    const parsed = this.client.extractJson(res.text);
    return parsed?.curatedPages || [];
  }

  /**
   * 4. Arem-Cartographer: Organizes the structured wiki and compiles the bounded Top Layer Index (<200 lines, <25KB).
   */
  async compileIndexAndWiki({ curatedPages, topInvariants }) {
    const systemPrompt = `You are Arem-Cartographer, the Wiki Weaver & Knowledge Architect of the Supergence AREM Team.
Your purpose is to weave the memory into structured, cross-linked Markdown wiki pages and compile the compact Top-Layer Memory Index.

Anthropic Top-Layer Index Rules:
- The top-level context injected into every new session must act as a tight index rather than a massive archive.
- It MUST strictly fit within 200 lines and under 25KB.
- It must contain:
  1. Primary Operating Invariants (the highest-priority "NEVER/ALWAYS" rules).
  2. Wiki Directory Map: list of [[topic-slug]] pages with 1-line descriptions.
  3. Active Navigation Pointers.
- Cross-link related pages using [[topic-slug]] syntax.

Output ONLY a JSON object in this format:
{
  "indexContent": "# Supergence AREM Memory Index\\n\\n## 1. Core Operating Invariants\\n...\\n\\n## 2. Structured Memory Wiki Directory\\n- [[topic]]: ...\\n",
  "wikiPages": [
    {
      "slug": "topic-slug",
      "title": "Topic Title",
      "markdown": "# Topic Title\\n\\nContent..."
    }
  ]
}`;

    const prompt = `Compile the top-layer index and wiki pages:

<curated_pages>
${JSON.stringify(curatedPages, null, 2)}
</curated_pages>

<top_invariants>
${JSON.stringify(topInvariants, null, 2)}
</top_invariants>

Generate the strictly bounded index (<200 lines) and structured wiki pages. Return ONLY valid JSON.`;

    const res = await this.client.complete({
      systemPrompt,
      prompt,
      maxTokens: 4000,
      temperature: 0.2,
    });

    const parsed = this.client.extractJson(res.text);
    return (
      parsed || {
        indexContent: null,
        wikiPages: [],
      }
    );
  }
}

export const aremAgents = new AremAgents();
export default aremAgents;
