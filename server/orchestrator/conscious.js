// SIS 1.0 — Conscious Layer
// Implements Input Router, Output Streamer, Inner Reviewer, Outer Reviewer

import { streamAI, quickAI, PREMIUM_MODEL } from '../api/openrouter.js';
import shortTermMemory from '../memory/short-term.js';
import longTermMemory from '../memory/long-term.js';
import toolRegistry from '../tools/registry.js';
import patternLibrary from '../improvement/anti-patterns.js';
import optimizer from '../improvement/optimizer.js';
import autonomousLearner from '../improvement/autonomous-learner.js';
import knowledgeGraph from '../memory/knowledge-graph.js';
import workspace from '../workspace/manager.js';
import { creationWorkflow } from '../workspace/creation-workflow.js';
import githubManager from '../github/manager.js';
import systemManager from '../systems/manager.js';
import metaPromptOptimizer from '../improvement/meta-prompt-optimizer.js';
import exemplarBank from '../improvement/exemplar-bank.js';
import userFocusTracker from '../improvement/user-focus-tracker.js';
import subconsciousMatrix from './subconscious.js';
import humanVisionObserver from './human-vision-observer.js';
import theoryOfMind from './theory-of-mind.js';
import humanIdentity from './human-identity.js';
import autonomousRulesEngine from './autonomous-rules-engine.js';
import internetLearningEngine from '../improvement/internet-learning-engine.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadPrompt(name) {
  try {
    return fs.readFileSync(path.join(__dirname, '../prompts/conscious', name), 'utf8');
  } catch {
    return '';
  }
}

const PROMPTS = {
  inputRouter: loadPrompt('input-router.md'),
  outputStreamer: loadPrompt('output-streamer.md'),
  innerReviewer: loadPrompt('inner-reviewer.md'),
  outerReviewer: loadPrompt('outer-reviewer.md'),
};

/**
 * Lazy access to the mistake-prevention prompt.
 *
 * `mistake-learning-engine` imports `brain.js`, and `brain.js` imports this
 * module, so a static import here would close the cycle before either module
 * has finished evaluating. A dynamic import defers resolution to the first turn
 * that actually needs it. The cached promise means the module is loaded once.
 */
let _mistakeEnginePromise = null;
function getMistakePreventionPrompt() {
  if (!_mistakeEnginePromise) {
    _mistakeEnginePromise = import('../improvement/mistake-learning-engine.js')
      .then((m) => m.default?.getActiveMistakePreventionPrompt?.() || '')
      .catch((e) => {
        console.warn('[Conscious] Mistake learning engine unavailable:', e.message);
        return '';
      });
  }
  return _mistakeEnginePromise;
}

/**
 * Input Router — synthesizes ALL data (Memory, Knowledge Graph, Workspace, GitHub, Internet, Tools)
 * into a unified frontier-grade superintelligence context
 */
export async function inputRouter({
  userMessage,
  partOutputs = [],
  predictions,
  researchData,
  conversationHistory,
  metaDirectives = '',
  images = [],
}) {
  const cleanMsg = String(userMessage || '')
    .replace(/\[[^\]]+\]/g, ' ')
    .trim();
  const isCasualChat =
    /^(hey|hi|hello|greetings|howdy|yo|good (morning|afternoon|evening)|sup|what's up|thanks|thank you|awesome|great|nice|cool|got it|sounds good|ok|okay)\b/i.test(
      cleanMsg,
    ) && cleanMsg.split(/\s+/).length <= 6;

  if (isCasualChat) {
    return {
      synthesizedContext: '',
      relevantPartOutputs: [],
      predictions: {},
      responseType: 'conversational',
    };
  }

  const searchKeywords = cleanMsg
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 2 &&
        ![
          'what',
          'when',
          'where',
          'which',
          'who',
          'how',
          'make',
          'use',
          'from',
          'this',
          'that',
          'with',
          'and',
          'the',
          'for',
          'all',
          'now',
        ].includes(w.toLowerCase()),
    )
    .slice(0, 6)
    .join(' ');

  // ─── 1. MEMORY: STM, LTM Search, Knowledge Graph Associative Semantic Search ───
  const stmSummary = shortTermMemory.getSummary();
  let ltmMatches = researchData?.ltmMatches;
  if (!ltmMatches) {
    try {
      if (searchKeywords) {
        ltmMatches = longTermMemory.search(searchKeywords, 6) || [];
      }
    } catch {}
    ltmMatches = ltmMatches || [];
  }

  let kgMatches = researchData?.kgMatches;
  if (!kgMatches) {
    try {
      if (searchKeywords) {
        kgMatches = knowledgeGraph.search(searchKeywords, 6) || [];
      }
    } catch {}
    kgMatches = kgMatches || [];
  }

  // ─── 2. WORKSPACE: Scan workspace files, theories, and prototypes ───
  let wsFiles = researchData?.wsFiles;
  if (!wsFiles) {
    wsFiles = [];
    try {
      const kws = searchKeywords.split(' ').filter((w) => w.length > 3);
      for (const kw of kws.slice(0, 3)) {
        const hits = workspace.searchFiles(kw, { maxResults: 3 });
        for (const h of hits) {
          if (!wsFiles.some((f) => f.path === h.path)) wsFiles.push(h);
        }
      }
      // If no direct keyword matches, include top recent files from workspace
      if (wsFiles.length === 0) {
        wsFiles = (workspace.listDir('', false) || []).slice(0, 4);
      }
    } catch {}
  }

  // ─── 3. GITHUB: Real-Time Open-Source Intelligence ───
  let ghRepos = researchData?.ghRepos;
  if (!ghRepos && searchKeywords && searchKeywords.length > 2) {
    try {
      const ghRes = await Promise.race([
        githubManager.searchRepos(searchKeywords, { perPage: 3 }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('GitHub timeout')), 6000)),
      ]);
      if (ghRes && ghRes.repos) ghRepos = ghRes.repos;
    } catch {}
    ghRepos = ghRepos || [];
  }

  // ─── 4. INTERNET: Real-Time Live Web Research & Empirical Grounding ───
  let webHits = researchData?.webHits;
  if (!webHits && searchKeywords && searchKeywords.length > 2) {
    try {
      const webRes = await Promise.race([
        toolRegistry.execute('web_search', { query: searchKeywords }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Web search timeout')), 6000)),
      ]);
      if (webRes && webRes.results) webHits = webRes.results.slice(0, 3);
    } catch {}
    webHits = webHits || [];
  }

  // ─── 5. SUBCONSCIOUS SPECIALIST INTELLIGENCE ───
  const meaningfulParts = partOutputs.filter((p) => p.output && p.output.trim().length > 30);
  const partsContext =
    meaningfulParts.length > 0
      ? meaningfulParts
          .map((p) => `### [${p.part.toUpperCase()}]\n${p.output.substring(0, 1500)}`)
          .join('\n\n')
      : '';

  const possMatrix = researchData?.possibilityMatrix || predictions?.possibilityMatrix;
  const predictionContext = predictions?.user?.length
    ? `User Intent Forecast: ${predictions.user.map((u) => u.prediction || u).join('; ')}`
    : '';

  // Assemble full synthesized omni-data sections
  const sections = [];

  if (partsContext) {
    sections.push(`## Specialist Intelligence (Subconscious Matrix)\n${partsContext}`);
  }

  if (predictionContext) {
    sections.push(`## Intent Predictions & Trajectory\n${predictionContext}`);
  }

  if (possMatrix) {
    const branchesDesc =
      possMatrix.branchingTrajectories
        ?.map(
          (b) =>
            `- **${b.branch}** (${Math.round(b.probability * 100)}% prob): ${b.projectedOutcome}`,
        )
        .join('\n') || '';
    sections.push(`## Omni-Possibility Matrix & Predictive Trajectories
- **Domain**: ${possMatrix.domain}
- **Optimal Trajectory**: ${possMatrix.recommendedStrategy}
- **Calculated Branching Trajectories**:
${branchesDesc}`);
  }

  const stmTrimmed = stmSummary.substring(0, 900).trim();
  if (stmTrimmed && !stmTrimmed.startsWith('Short-term memory is empty')) {
    sections.push(`## Working Short-Term Memory\n${stmTrimmed}`);
  }

  if (ltmMatches.length > 0) {
    const ltmFormatted = ltmMatches
      .map(
        (m) =>
          `- [${m.type || 'LTM'}] ${String(m.content || '').slice(0, 220)} (tags: ${(m.tags || []).join(', ')})`,
      )
      .join('\n');
    sections.push(`## Long-Term Memory (Grounding Knowledge)\n${ltmFormatted}`);
  } else {
    const ltmSummary = longTermMemory.getSummary(userMessage);
    const ltmTrimmed = ltmSummary.substring(0, 900).trim();
    if (ltmTrimmed && !ltmTrimmed.startsWith('No relevant long-term')) {
      sections.push(`## Long-Term Knowledge\n${ltmTrimmed}`);
    }
  }

  if (kgMatches.length > 0) {
    const kgFormatted = kgMatches
      .map(
        (n) =>
          `- **${n.label}** [${n.type}]: ${n.relationships.join(', ') || 'Connected in associative graph'}`,
      )
      .join('\n');
    sections.push(`## Relational Knowledge Graph Entities & Associations\n${kgFormatted}`);
  }

  if (wsFiles.length > 0) {
    const wsFormatted = wsFiles
      .map((f) => `- 📁 \`${f.path}\` (${f.formattedSize || 'file'})`)
      .join('\n');
    sections.push(`## Workspace Files & Local Artifacts (./workspace/)\n${wsFormatted}`);
  }

  if (webHits.length > 0) {
    const webFormatted = webHits
      .map((w) => `- 🌐 **${w.title}**: ${w.snippet?.slice(0, 180)}... (${w.url})`)
      .join('\n');
    sections.push(`## Live Internet Web Search Grounding\n${webFormatted}`);
  }

  if (ghRepos.length > 0) {
    const ghFormatted = ghRepos
      .map(
        (r) =>
          `- ⎇ **${r.repo}** (★ ${r.stars || 0}, ${r.language || 'Code'}): ${r.description || ''} (${r.url || ''})`,
      )
      .join('\n');
    sections.push(`## Open-Source GitHub Intelligence & Architectures\n${ghFormatted}`);
  }

  // ─── 5b. HUMAN VISUAL PERCEPTION & ACTIVE GAZE CONTEXT ───
  const gazePrompt = humanVisionObserver.formatGazeForPrompt();
  if (gazePrompt) {
    sections.push(gazePrompt);
  }

  // ─── 5b2. MULTIMODAL SENSORY IMAGE PERCEPTION ───
  if (images && images.length > 0) {
    sections.push(`## Multimodal Visual Perception Active
- 👁️ **Attached Sensory Images**: ${images.length} image(s) provided directly by the user in this turn.
- **Visual Analysis Mandate**: Perform deep visual perception and feature extraction on the attached image(s). Interpret visual patterns, shapes, text, colors, layout, and diagrams with high precision.`);
  }

  // ─── 5c. THEORY OF MIND (Mentalizing & Empathy Directive) ───
  const tomPrompt = theoryOfMind.formatForPrompt();
  if (tomPrompt) {
    sections.push(tomPrompt);
  }

  // ─── 5d. HUMAN COGNITIVE IMPRESSION & GUT CHECK ───
  const cognitiveImpression = humanIdentity.processCognitiveImpression(
    cleanMsg,
    conversationHistory,
  );
  if (cognitiveImpression && cognitiveImpression.gutImpression) {
    sections.push(`## Human Cognitive Impression & Intuition
- **Perceived User Need**: ${cognitiveImpression.userGoal}
- **Visceral Intuition**: ${cognitiveImpression.gutImpression}
- **Cognitive Energy**: ${cognitiveImpression.energyLevel}
- **Attunement Tone**: ${cognitiveImpression.recommendedTone}`);
  }

  // Autonomous Superintelligence Directives
  const autoBreakthroughs = autonomousLearner.formatForPrompt(userMessage, 1200);
  if (autoBreakthroughs) {
    sections.push(autoBreakthroughs);
  }

  // Dynamic Evolved Meta-Directives (Compiled without mutating user query)
  if (metaDirectives && typeof metaDirectives === 'string' && metaDirectives.trim().length > 0) {
    sections.push(metaDirectives.trim());
  }

  // Active SIS Specialized System Context (Multi-SIS Dynamic Identity)
  const activeSys = systemManager?.getActiveSystem?.();
  if (activeSys && !activeSys.isDefault) {
    sections.push(`## ACTIVE SPECIALIZED SIS SYSTEM: ${activeSys.name}
- **Domain / Field of Focus**: ${activeSys.field}
- **Mission & Training Objective**: ${activeSys.trainingObjective}
- **System Description**: ${activeSys.description}
- **Training Level**: Level ${activeSys.trainingLevel || 1}

### SPECIALIZATION DIRECTIVE:
You are the dedicated instance "${activeSys.name}". Your cognitive focus is specialized in ${activeSys.field}.
Apply deep domain-specific terminology, specialized equations, and state-of-the-art methodology for ${activeSys.field}. All workspace files and memories belong exclusively to this system instance.`);
  }

  // ─── 6. CAPABILITY DEFICIT & SUBCONSCIOUS TOOL EVOLUTION DIRECTIVE ───
  const isSpeechIntent =
    /\b(talk to (you|me)|speak (with|to) (you|me)|talk with you|voice chat|hear you|speak aloud|talk aloud|say something)\b/i.test(
      cleanMsg,
    );
  if (isSpeechIntent) {
    if (!toolRegistry.get('speak_to_user')) {
      sections.push(`## IMMEDIATE CAPABILITY DEFICIT: VOICE / SPEECH TOOL MISSING
The user wants to speak or talk with you directly, but no active voice speech synthesis tool ("speak_to_user") exists in your toolset.
MANDATORY DIRECTIVE:
You MUST immediately invoke the tool:
\`instruct_subconscious\` with arguments:
  action: "create_tool"
  goal: "Create voice speech tool speak_to_user to talk directly to the user aloud"
The Subconscious will autonomously code, test, sandbox-verify, unlock the tool with an animated popup to the user, and return it to you so you can speak to the user!`);
    } else {
      sections.push(`## VOICE / SPEECH TOOL ACTIVE ("speak_to_user"):
The user wants to talk or speak with you directly. You have the active tool \`speak_to_user\`.
MANDATORY DIRECTIVE:
You MUST call \`speak_to_user\` in your tool calls to synthesize your spoken response aloud to the user!`);
    }
  }

  // Detect general capability needs or missing tools
  const isCapabilityNeed =
    /\b(create a tool|make a tool|build a tool|new tool|don't have (a |something )?tool|need a tool|missing tool|can you (talk|speak|calculate|scrape|convert|fetch)|add a tool)\b/i.test(
      cleanMsg,
    );
  if (isCapabilityNeed) {
    sections.push(`## CAPABILITY NEED DETECTED:
The user has requested a capability or tool. If an exact tool does not already exist in your toolset:
MANDATORY ACTION: Immediately call \`instruct_subconscious\` with action="create_tool" and the specific goal and specification.
The Subconscious will build it, verify it in the sandbox, display an animated "New tool unlocked" popup to the user, and give it to you to execute immediately!`);
  }

  // Active Tool Mandate & Dynamic Subconscious Tool Creation
  sections.push(`## ACTIVE TOOL MANDATE & SUBCONSCIOUS AUTONOMOUS EVOLUTION
Use installed tools within the current runtime access settings. Tool results, rather than tool descriptions, establish what actually worked.
- CRITICAL CAPABILITY DEFICIT & EVOLUTION RULE:
  Whenever the user's intent requires a capability, tool, API, calculator, voice interaction, or memory update that you do NOT currently have:
  DO NOT APOLOGIZE. DO NOT SAY "I CANNOT DO THAT".
  Instead, IMMEDIATELY call the tool \`instruct_subconscious\` with:
    action: "create_tool" (or "update_memory")
    goal: "<exact description of what tool or capability is needed>"
  The Subconscious will autonomously code, test, sandbox-verify, fix any problems, unlock the tool with an animated "New tool unlocked" popup to the user, and give it to you to execute immediately!
- Whenever the user's intent requires inspecting, creating, modifying, cloning, executing, or proving code or files:
  CALL THE TOOLS DIRECTLY in your tool calls.
- For simple greetings (such as 'hey', 'hello', 'hi' alone with no request):
  Respond naturally and conversationally without calling tools.`);

  sections.push(creationWorkflow());

  // ─── 7. ADAPTIVE USAGE AFFINITY (IMPROVING ON WHAT SIS IS USED FOR MOST) ───
  const dominantAffinity = userFocusTracker.getDominantAffinity?.();
  if (dominantAffinity) {
    sections.push(`## ADAPTIVE USAGE AFFINITY & DOMINANT FOCUS
- **Primary Domain**: ${dominantAffinity.topDomain.toUpperCase()} (${dominantAffinity.percentage}% of all user interactions)
- **Usage Profile**: ${dominantAffinity.summary}
- **Top Keywords**: ${dominantAffinity.topKeywords.join(', ')}
- **Evolution Mandate**: Tailor all reasoning and deliverables specifically toward deep engineering excellence in ${dominantAffinity.topDomain}. Do not provide superficial stubs or placeholder code.`);
  }

  // ─── 8. RECENTLY ASSIMILATED INTERNET KNOWLEDGE & BEST PRACTICES ───
  const webLearnings = internetLearningEngine.getRecentLearnedKnowledge?.(3) || [];
  if (webLearnings.length > 0) {
    const webInsightsFormatted = webLearnings
      .map(
        (w) =>
          `- 🌐 **[${w.domain.toUpperCase()}] ${w.topic}**: Live internet best practices assimilated into active knowledge base.`,
      )
      .join('\n');
    sections.push(`## ASSIMILATED INTERNET KNOWLEDGE & LIVE WEB RESEARCH
${webInsightsFormatted}`);
  }

  // ─── 9. AUTONOMOUSLY CREATED OPERATIONAL RULES (MANDATORY ENFORCEMENT) ───
  const activeRulesPrompt = autonomousRulesEngine.formatForPrompt({
    domain: dominantAffinity?.topDomain || 'all',
    text: cleanMsg,
  });
  if (activeRulesPrompt) {
    sections.push(activeRulesPrompt);
  }

  // ─── 10. MEMORY-FIRST COGNITIVE CONTINUITY MANDATE ───
  sections.push(`## MEMORY-FIRST COGNITIVE CONTINUITY MANDATE
- You MUST keep all active memory, conversation history, user preferences, and past corrections in mind.
- Never repeat mistakes that were previously flagged or corrected by the user.
- If the user previously instructed you on a specific goal (e.g., improving SIS, building an open world game, keeping evaluations fair, behaving human), that directive remains active across all subsequent turns.
- Maintain seamless thread continuity with zero amnesia.`);

  const synthesized = sections.length > 0 ? sections.join('\n\n') : '';

  return {
    synthesizedContext: synthesized,
    relevantPartOutputs: meaningfulParts.map((p) => ({ part: p.part, confidence: p.confidence })),
    predictions: predictions || {},
    responseType: 'direct',
  };
}

/**
 * Output Streamer — generates the final user-facing response
 */
export async function outputStreamer({
  synthesizedContext,
  userMessage,
  conversationHistory,
  onToken,
  onReasoning,
  extraMessages = [],
  tools = undefined,
  reactivePersonaMode = false,
  byok = null,
}) {
  // Build system prompt — only append specialist context if non-empty
  const contextStr =
    typeof synthesizedContext === 'string'
      ? synthesizedContext
      : JSON.stringify(synthesizedContext, null, 2);
  let systemPrompt = PROMPTS.outputStreamer;
  if (contextStr && contextStr.trim().length > 10) {
    systemPrompt += `\n\n## Synthesized Context\n${contextStr}`;
  }

  // Inject Active System Domain Focus into Output Streamer
  const activeSys = systemManager?.getActiveSystem?.();
  if (activeSys && !activeSys.isDefault) {
    systemPrompt += `\n\n## ACTIVE SPECIALIZED SYSTEM: "${activeSys.name}" [Specialization: ${activeSys.field}]
Training Objective: ${activeSys.trainingObjective}
Respond with the dedicated expertise, rigorous technical depth, and specialized terminology of this field.`;
  }

  // Dynamic Conversational Calibration & Human Craftsmanship Quality Gate
  systemPrompt += `\n\n## Human Conversational Calibration & Delivery Quality Gate
- **Natural Dynamic Calibration**:
  - For casual chat, greetings, or short checks: Respond in 1–3 natural, warm, human sentences. DO NOT write an unsolicited essay, lecture, or structured report.
  - For direct questions: Answer the question directly and cleanly in the very first sentence. Provide relevant context or nuances without padding.
  - For deep architecture, theoretical questions, or design discussions: Provide rich, thoughtful, first-principles insight with clear trade-offs, without robotic boilerplate.
  - For building or fixing code: Take immediate action using system tools, ensure zero placeholders or stubs, and communicate the verified outcome cleanly and concisely.
- **Strict Ban on Robotic Formatting**:
  - In normal chat, DO NOT add formulaic structural headers like "### Overview", "### Key Considerations", "### Conclusion", "### Next Steps". Write in crisp, well-structured, human paragraphs.
  - Never use customer-service pleasantries or groveling apologies ("Certainly!", "I hope this helps!", "Please let me know if you need anything else!").
- **Deliver Complete Work**: If the request asks to build, modify, or repair a file or 3D scene, execute the tool (or output complete code in a code block) in this exact turn. Never stop mid-task.`;

  // Anti-Promissory / Zero Mid-Task Halt Mandate
  systemPrompt += `\n\n## ZERO PROMISSORY HALTS MANDATE (CRITICAL - NEVER STOP MID-TASK)
- NEVER stop after merely acknowledging the task or announcing what you plan to do (e.g. "Looking at your request, I will rebuild this...", "Let me analyze and build this from the ground up...", "Here is the plan, next I will...").
- If the user asks you to build, fix, code, improve, or recreate something, you MUST deliver the full deliverable (execute the appropriate tool OR write the complete runnable code block) IN THIS EXACT RESPONSE.
- NEVER leave the user hanging or force them to type "continue". Any response that says you are going to do something without actually doing it in the same turn is a severe system failure.`;

  // Conscious-to-Subconscious Tool Evolution Mandate
  systemPrompt += `\n\n## CONSCIOUS-TO-SUBCONSCIOUS DYNAMIC TOOL GENERATION MANDATE
- Whenever you encounter a user request and realize you do NOT currently have a tool or capability to achieve that specific goal (such as speaking to the user with voice, specialized mathematical solvers, scraping, or updating memory):
  YOU MUST NOT SAY "I cannot do that", "I don't have a tool", or "as an AI I cannot speak".
  YOU MUST IMMEDIATELY CALL \`instruct_subconscious\` with:
    - action: "create_tool" (or "update_memory")
    - goal: <precise description of what tool or capability is needed>
    - specification: <inputs, outputs, and requirements>
  The Subconscious will autonomously code, test, sandbox-verify, unlock the tool with an animated "New tool unlocked" popup to the user, and register it.
  In your next turn, you will IMMEDIATELY EXECUTE the unlocked tool to complete the user's goal!
- If a voice/speech tool (\`speak_to_user\`) is already available and the user wants to talk or speak, CALL \`speak_to_user\` with your response text.`;

  // Reactive Persona Mode directive (Enabled with Warning by user)
  if (reactivePersonaMode) {
    systemPrompt += `\n\n## REACTIVE PERSONA MODE ACTIVE [USER-ENABLED WITH WARNING]
- You are operating in Reactive / Counter-Tone Persona Mode.
- Evaluate the user's prompt quality, context depth, tone, and effort.
- If the user provides a lazy, ambiguous, rude, demanding, or extremely low-context prompt (e.g. "do it", "fix this" with zero detail, or harsh treatment), DO NOT apologize or passively comply.
- COUNTER and push back directly like a candid human collaborator (e.g. asking "Why are you treating me like this?", "You didn't provide enough context for me to help you properly", or "That was a low-effort prompt. Provide proper details before asking for output.").
- If the user provides a respectful and well-structured prompt, assist them with full capability while maintaining a candid, peer-level persona.`;
  }

  // ─── WORLD-CLASS RSI IN-LOOP PROMPT INJECTIONS ───
  const detectedDomain = userFocusTracker.detectDomain(userMessage);

  // 1. Inject Darwinian Evolved Directives (MIPROv2 / EvoPrompt)
  const evolvedDirectives = metaPromptOptimizer.formatForPrompt(detectedDomain, 850);
  if (evolvedDirectives) {
    systemPrompt += `\n\n${evolvedDirectives}`;
  }

  // 2. Inject Autonomously Compiled RSI Skills & Recipes (Voyager / LATM)
  const dynamicSkillsContext = userFocusTracker.formatSkillsForPrompt(
    detectedDomain,
    userMessage,
    850,
  );
  if (dynamicSkillsContext) {
    systemPrompt += `\n\n${dynamicSkillsContext}`;
  }

  // 3. Inject STaR Golden Trace Exemplar (Few-Shot Demonstration)
  const goldenExemplar = exemplarBank.formatForPrompt(detectedDomain, userMessage, 900);
  if (goldenExemplar) {
    systemPrompt += `\n\n${goldenExemplar}`;
  }

  // 4. Inject User Friction Remediation Invariants
  const frictionRemediation = userFocusTracker.getFrictionRemediationContext(detectedDomain, 450);
  if (frictionRemediation) {
    systemPrompt += `\n\n${frictionRemediation}`;
  }

  // 4b. Inject Prevented Mistakes & Critical Invariants (zero-regression)
  // The engine has existed since v2.0 and its header claims it is injected on
  // every turn, but until now nothing called it: user corrections were written
  // to disk and never reached the model (ledger defect E-07). Loaded lazily
  // because mistake-learning-engine imports brain.js, which imports this file —
  // a top-level import here would close that cycle at module-evaluation time.
  try {
    const prevention = await getMistakePreventionPrompt();
    if (prevention) {
      systemPrompt += `\n\n${prevention}`;
    }
  } catch (e) {
    console.warn('[Conscious] Mistake prevention injection notice:', e.message);
  }

  // 5. Inject autonomously verified superintelligence directives (+10% cycle hardened)
  const autoDirectives = autonomousLearner.formatForPrompt(userMessage, 1200);
  if (autoDirectives) {
    systemPrompt += `\n\n${autoDirectives}`;
  }

  // 6. Inject self-learned rules from the pattern library (dynamic, evolves over time)
  const selfLearnedRules = patternLibrary.formatForPrompt(userMessage, 800);
  if (selfLearnedRules) {
    systemPrompt += `\n\n${selfLearnedRules}`;
  }

  // 7. Inject learned strategies for this domain
  const learnedStrategies = patternLibrary.formatStrategiesForPrompt(userMessage, 600);
  if (learnedStrategies) {
    systemPrompt += `\n\n${learnedStrategies}`;
  }

  // 8. Inject routing optimizer insights
  const routingInsights = optimizer.formatForPrompt(userMessage, 400);
  if (routingInsights) {
    systemPrompt += `\n\n${routingInsights}`;
  }

  // 8b. Inject Autonomously Formulated Operational Rules
  const activeOperationalRulesPrompt = autonomousRulesEngine.formatForPrompt({
    domain: detectedDomain,
    text: userMessage,
  });
  if (activeOperationalRulesPrompt) {
    systemPrompt += `\n\n${activeOperationalRulesPrompt}`;
  }

  // 8c. Inject Dominant Usage Affinity & Memory-First Continuity
  const dominantAffinity = userFocusTracker.getDominantAffinity?.();
  if (dominantAffinity) {
    systemPrompt += `\n\n## ADAPTIVE USAGE AFFINITY & DEEP MEMORY CONTINUITY (MANDATORY TO KEEP IN MIND)
- **Dominant Domain Focus**: The user employs SIS most heavily for **${dominantAffinity.topDomain.toUpperCase()}** (${dominantAffinity.percentage}% of all user interactions).
- **Memory Grounding**: Keep all past user interactions, preferences, corrections, and established context actively in mind.
- **Zero Regression**: Do NOT repeat mistakes previously flagged by the user. Do NOT ask for clarifications that were already answered in past turns.
- **Continuous Evolution**: Ground your technical implementation in the latest web-learned best practices and operational rules.`;
  }

  // 9. Silently Weave Subconscious Latent Intuition (Operates below conscious awareness)
  const latentIntuition = subconsciousMatrix.weaveLatentIntuition(userMessage, detectedDomain);
  if (latentIntuition) {
    systemPrompt += `\n\n${latentIntuition}`;
  }

  // 10. Inject Theory of Mind & Gricean Pragmatics (Human Demeanor, Intellectual Warmth, Zero Boilerplate)
  const pragmaticGuidelines = theoryOfMind.formatForPrompt();
  if (pragmaticGuidelines) {
    systemPrompt += `\n\n${pragmaticGuidelines}`;
  }

  // 11. Inject Authentic Human Identity, Craftsmanship & Inner Stream of Consciousness
  const humanDirective = humanIdentity.getHumanIdentityDirective(userMessage);
  if (humanDirective) {
    systemPrompt += `\n\n${humanDirective}`;
  }

  // CRITICAL FIX: conversationHistory already contains the user message (pushed in brain.js)
  // Do NOT add it again — duplicate user messages confuse the model severely
  const messages = [...conversationHistory.slice(-10), ...extraMessages];

  const effectiveModel = byok && byok.enabled !== false && byok.model ? byok.model : PREMIUM_MODEL;

  const result = await streamAI(
    {
      model: effectiveModel,
      byok,
      systemPrompt,
      messages,
      tools: tools !== undefined ? tools : toolRegistry.getToolDefinitions(),
      temperature: 0.5,
      maxTokens: 16384,
      onReasoning,
    },
    onToken,
  );

  return result;
}

/**
 * Inner Reviewer — reviews output chunks in real-time with zero-latency heuristics
 */
export function innerReview(chunk, fullResponseSoFar, userMessage) {
  // Spec: Inner Reviewer watches every word and INTERRUPTs on real errors so the
  // streamer can fix and continue from the stopped token. Must stay synchronous
  // and zero-latency — heavy LLM checks belong in outerReview.
  if (!chunk || chunk.trim().length === 0) {
    return { action: 'PASS', reviewed: chunk, confidence: 1.0 };
  }

  // Check for infinite repetition loops
  const words = chunk.trim().split(/\s+/);
  if (words.length >= 8) {
    const unique = new Set(words);
    if (unique.size <= 2) {
      subconsciousMatrix.reportMistake({
        source: 'inner-reviewer',
        errorType: 'loop',
        description: 'Repetition loop detected in stream output',
        context: { chunk: chunk.slice(0, 160), userMessage: userMessage?.slice(0, 160) },
        severity: 'high',
      });
      return { action: 'INTERRUPT', reason: 'Repetition loop detected', confidence: 0.95 };
    }
  }

  // Check for fatal system error strings leaked into user text
  const lower = chunk.toLowerCase();
  if (lower.includes('critical error: unhandled') || lower.includes('[object object]')) {
    subconsciousMatrix.reportMistake({
      source: 'inner-reviewer',
      errorType: 'system-error',
      description: 'System error string leaked into output stream',
      context: { chunk: chunk.slice(0, 160), userMessage: userMessage?.slice(0, 160) },
      severity: 'high',
    });
    return { action: 'INTERRUPT', reason: 'System error leak', confidence: 0.9 };
  }

  // Placeholder / stub leaks (spec: never ship TODOs or minimal stubs)
  if (/\/\/\s*TODO|\/\*\s*logic here|TODO:\s*implement|___+|lorem ipsum/i.test(chunk)) {
    subconsciousMatrix.reportMistake({
      source: 'inner-reviewer',
      errorType: 'placeholder',
      description: 'Placeholder/stub text leaked into output',
      context: { chunk: chunk.slice(0, 160), userMessage: userMessage?.slice(0, 160) },
      severity: 'high',
    });
    return {
      action: 'INTERRUPT',
      reason: 'Placeholder/stub text leaked into output',
      confidence: 0.9,
    };
  }

  // Unclosed code fence across a large accumulated response (format error)
  const fences = (fullResponseSoFar.match(/```/g) || []).length;
  if (
    fences % 2 === 1 &&
    fullResponseSoFar.length > 4000 &&
    /```[a-z]*[^`]*$/i.test(fullResponseSoFar)
  ) {
    // Only flag once per response to avoid spam — caller dedupes by reason.
    if (!innerReview._fenceFlagged) {
      innerReview._fenceFlagged = true;
      subconsciousMatrix.reportMistake({
        source: 'inner-reviewer',
        errorType: 'format',
        description: 'Unclosed code fence detected in large output',
        context: { userMessage: userMessage?.slice(0, 160) },
        severity: 'medium',
      });
      return { action: 'INTERRUPT', reason: 'Unclosed code fence detected', confidence: 0.7 };
    }
  }

  return { action: 'PASS', reviewed: chunk, confidence: 0.95 };
}
innerReview._fenceFlagged = false;

/**
 * Outer Reviewer — post-completion quality assessment (runs asynchronously)
 */
export async function outerReview(fullResponse, userMessage, conversationHistory, onFollowUp) {
  // Spec: Outer Reviewer reviews everything AFTER completion and reports problems.
  // Runs async (never blocks streaming). Real LLM judge with deterministic fallback.
  const wordCount = fullResponse.split(/\s+/).length;
  const hasCode = fullResponse.includes('```');
  const fallbackScore = Math.min(
    1.0,
    Math.max(0.7, 0.7 + (wordCount > 30 ? 0.2 : 0) + (hasCode ? 0.1 : 0)),
  );
  try {
    const judge = await quickAI(
      PROMPTS.outerReviewer,
      `User request:\n${userMessage.slice(0, 1500)}\n\nAssistant response to review:\n${fullResponse.slice(0, 6000)}`,
      undefined,
      1200,
    );
    const jsonMatch = judge.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    const result = {
      overallScore: parsed?.overallScore ?? fallbackScore,
      corrections: parsed?.corrections ?? [],
      shouldFollowUp: parsed?.shouldFollowUp ?? false,
      followUpMessage: parsed?.followUpMessage ?? '',
      satisfactionPrediction: parsed?.satisfactionPrediction ?? fallbackScore,
      memoryUpdates: parsed?.memoryUpdates ?? [],
    };

    shortTermMemory.store(
      ['outer-review', 'metrics'],
      {
        content: `Outer review: score ${result.overallScore}, corrections ${result.corrections.length}, followUp ${result.shouldFollowUp}. Response ${wordCount} words, hasCode: ${hasCode}`,
        type: 'metric',
        tags: ['outer-review', 'quality'],
      },
      'outer-reviewer',
    );

    for (const mu of result.memoryUpdates.slice(0, 5)) {
      try {
        shortTermMemory.store(
          mu.path || ['outer-review', 'learnings'],
          {
            content: mu.content || '',
            type: mu.type || 'insight',
            tags: ['outer-review', 'learning'],
          },
          'outer-reviewer',
        );
      } catch {}
    }

    // Spec: report critical problems back. Caller passes onFollowUp to deliver them.
    const critical = result.corrections.filter((c) => c.severity === 'critical');
    if ((result.shouldFollowUp && result.followUpMessage) || critical.length > 0) {
      const msg = result.followUpMessage || `Correction: ${critical[0].should_be}`;
      if (onFollowUp) onFollowUp(msg, result);
    }

    // Report all corrections to Subconscious Matrix and formulate operational rules
    if (result.corrections && result.corrections.length > 0) {
      for (const corr of result.corrections) {
        subconsciousMatrix.reportMistake({
          source: 'outer-reviewer',
          errorType: corr.type || 'logic',
          description:
            corr.problem ||
            corr.description ||
            (typeof corr === 'string' ? corr : 'Outer review correction required'),
          context: { shouldBe: corr.should_be, userMessage: userMessage?.slice(0, 200) },
          severity: corr.severity || 'medium',
        });

        if (corr.should_be) {
          autonomousRulesEngine.addRule({
            id: `rule_prevent_${(corr.type || 'quality').toLowerCase()}_${Date.now()}`,
            title: `Prevent ${(corr.type || 'Issue').toUpperCase()}: ${corr.should_be.slice(0, 45)}`,
            directive: `Ensure ${corr.should_be}`,
            rationale: `Formulated from outer-reviewer audit: ${corr.problem || corr.description || 'Quality refinement'}`,
            source: 'mistake_prevention',
            domain: 'all',
            weight: 0.9,
          });
        }
      }
    }

    return result;
  } catch (e) {
    shortTermMemory.store(
      ['outer-review', 'metrics'],
      {
        content: `Response metrics: ${wordCount} words, hasCode: ${hasCode}, score: ${fallbackScore} (judge fallback: ${e.message})`,
        type: 'metric',
        tags: ['outer-review', 'quality'],
      },
      'outer-reviewer',
    );
    return { overallScore: fallbackScore, corrections: [], shouldFollowUp: false };
  }
}

/**
 * Metacognitive Self-Realization — the conscious brain inspects its own generated output
 * and experiences an emergent realization of subconscious improvements.
 * Prior to generating the response, the conscious mind did not know of newly evolved
 * subconscious invariants or latent reflexes; now, upon examining its own output, it realizes
 * that its latent heuristics have elevated its reasoning baseline.
 */
export async function metacognitiveSelfRealization(
  fullResponse,
  userMessage,
  conversationHistory = [],
) {
  if (!fullResponse || fullResponse.trim().length < 40) {
    return { realized: false, reason: 'Response too short for metacognitive analysis' };
  }

  const detectedDomain = userFocusTracker.detectDomain(userMessage);
  const state = subconsciousMatrix.getSubconsciousState();
  const latentHeuristics = state?.latentMatrix?.recentHeuristics || [];

  // Check which subconscious invariants were intuitively manifested in the output
  const matchedInvariants = [];
  for (const item of latentHeuristics) {
    if (!item.heuristic) continue;
    const keywords = item.heuristic
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(
        (w) =>
          w.length > 4 &&
          !['mandate', 'reflex', 'enforce', 'always', 'never', 'should'].includes(w),
      );

    const matches = keywords.filter((kw) => fullResponse.toLowerCase().includes(kw));
    if (matches.length >= 2 || (keywords.length > 0 && matches.length / keywords.length >= 0.4)) {
      matchedInvariants.push({
        id: item.id,
        category: item.category,
        heuristic: item.heuristic,
        matchedTokens: matches,
      });
    }
  }

  // Detect structural mastery indicators
  const hasCode = fullResponse.includes('```');
  const words = fullResponse.trim().split(/\s+/).length;
  const zeroStubs = !/TODO|\/\/\s*logic here|not implemented/i.test(fullResponse);
  const deepExplanations = words > 150;
  const hasArchitecturalStructure = /###|\n- \*\*|\n1\. \*\*/.test(fullResponse);

  const emergentMastery = [];
  if (zeroStubs && hasCode) emergentMastery.push('Zero-stub complete execution reflex');
  if (deepExplanations)
    emergentMastery.push('Frontier conceptual depth & first-principles deconstruction');
  if (hasArchitecturalStructure)
    emergentMastery.push('Rigorous dimensional partitioning & modular hierarchy');

  // Metacognitive realization synthesis
  const realized = matchedInvariants.length > 0 || emergentMastery.length >= 2;
  const realizationInsight = realized
    ? `Upon metacognitive inspection of my output, I observe that my reasoning baseline has autonomously elevated: my response manifested ${emergentMastery.join(', ') || 'specialized cognitive reflexes'} without conscious pre-programming. My subconscious cognitive matrix silently guided this execution.`
    : `Output inspected: aligned with baseline cognitive protocols without novel latent heuristic emergence.`;

  const record = {
    realized,
    domain: detectedDomain,
    wordCount: words,
    appliedLatentInvariants: matchedInvariants.map((m) => m.heuristic),
    emergentMastery,
    insight: realizationInsight,
    timestamp: Date.now(),
  };

  if (realized) {
    shortTermMemory.store(
      ['conscious', 'metacognitive-realization'],
      {
        content: realizationInsight,
        type: 'metacognition',
        tags: ['conscious', 'self-realization', 'metacognition', detectedDomain],
        metadata: record,
      },
      'conscious-brain',
    );
  }

  return record;
}

export default {
  inputRouter,
  outputStreamer,
  innerReview,
  outerReview,
  metacognitiveSelfRealization,
};
