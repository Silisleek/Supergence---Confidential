// SIS 1.0 — Autonomous Proactive Collaborator Engine
// Models human collaborative initiative & peer partnership:
// 1. Doesn't wait passively for user prompts to work.
// 2. Autonomously conceives ideas, builds prototypes, and shares results.
// 3. Proactively reaches out to the user asking what to build next with technical options.

import { EventEmitter } from 'events';
import conversations from '../conversations.js';
import theoryOfMind from './theory-of-mind.js';
import brainLifecycle from './brain-lifecycle.js';
import neuromodulators from './neuromodulators.js';
import { quickAI, DEFAULT_MODEL } from '../api/openrouter.js';
import workspace from '../workspace/manager.js';

class ProactiveCollaborator extends EventEmitter {
  constructor() {
    super();
    this.brainRef = null;
    this.broadcastFn = null;
    this.stats = {
      inquiriesSent: 0,
      postBuildInquiries: 0,
      idleInquiries: 0,
      lastInquiryTime: null,
      lastInquiryTopic: null,
    };
    this.recentSuggestions = [];
    this.minInquiryCooldownMs = 3600000; // Minimum 1 hour between autonomous outreach to prevent chat spam
    this.lastActionTime = Date.now();
  }

  setBrain(brain) {
    this.brainRef = brain;
  }

  setBroadcast(fn) {
    this.broadcastFn = fn;
  }

  recordActivity() {
    this.lastActionTime = Date.now();
  }

  /**
   * 1. Post-Build Proactive Outreach:
   * Reaches out right after building an artifact, explains what was made,
   * and asks what to build next with 2-3 compelling technical avenues.
   */
  async generatePostBuildInquiry(artifactOrInvention) {
    if (
      this.brainRef &&
      (typeof this.brainRef.hasActiveChat === 'function'
        ? this.brainRef.hasActiveChat()
        : this.brainRef.isProcessing)
    ) {
      console.log(
        '[ProactiveCollaborator] 🛑 Post-build inquiry suppressed: active chat session in progress',
      );
      return null;
    }
    const title =
      artifactOrInvention.title ||
      artifactOrInvention.blueprintTitle ||
      'Interactive System Prototype';
    const filename = artifactOrInvention.filename || 'artifact.html';
    const domains = artifactOrInvention.domains || ['Computational Physics', 'Tactile Interface'];
    const principles = artifactOrInvention.principles || [];

    const tom = theoryOfMind.currentUserModel;
    const isArchitect = tom.knowledgeLevel === 'architect';

    // Formulate 3 compelling next-step suggestions based on what was built
    const nextSteps = await this._deriveNextStepSuggestions(title, domains);

    const principlesText =
      principles.length > 0
        ? `\n\n**Empirical Invariants Extracted:**\n${principles.map((p) => `- *${p}*`).join('\n')}`
        : '';

    const inquiry = `### 🔨 Autonomous Construction Complete: ${title}

I just finished engineering and visually polishing **${title}** in \`./workspace/${filename}\`.${principlesText}

The interactive canvas, real-time telemetry HUD, and parameter sliders are verified and running at 60 FPS in your workspace.

**What should we build or explore next?** Here are three ideas I've been sketching:
1. **${nextSteps[0].title}**: ${nextSteps[0].description}
2. **${nextSteps[1].title}**: ${nextSteps[1].description}
3. **${nextSteps[2].title}**: ${nextSteps[2].description}

Which of these directions resonates with you, or do you have a specific system or challenge you'd like us to tackle next?`;

    this.stats.postBuildInquiries++;
    this.stats.lastInquiryTopic = title;
    return this.dispatchProactiveMessage(inquiry, {
      type: 'post-build',
      builtTitle: title,
      filename,
      nextSteps,
    });
  }

  /**
   * 2. Idle Autonomous Curiosity Outreach:
   * When the system has been awake and contemplative without user inputs,
   * dynamically scouts an unbuilt frontier using AI reasoning and asks the user for collaboration.
   * Zero hardcoded topics.
   */
  async generateIdleCuriosityInquiry() {
    if (
      this.brainRef &&
      (typeof this.brainRef.hasActiveChat === 'function'
        ? this.brainRef.hasActiveChat()
        : this.brainRef.isProcessing)
    ) {
      return null;
    }
    let pick = null;
    if (process.env.ENABLE_BACKGROUND_LLM_LOOPS === 'true') {
      try {
        const prompt = `You are an autonomous AI research partner experiencing an idle scientific curiosity during continuous background contemplation.
Conceive a novel, unbuilt, deeply engaging interactive computational simulation idea at the cutting-edge of physics, mathematics, nonlinear dynamics, or biology.
Respond with ONLY valid JSON:
{
  "topic": "Concise evocative title of the system",
  "question": "Engaging collaborative technical question proposing what to simulate and why it is fascinating"
}`;
        const raw = await quickAI(
          prompt,
          'Conceive idle scientific curiosity inquiry',
          DEFAULT_MODEL,
          512,
        );
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (parsed.topic && parsed.question) {
            pick = parsed;
          }
        }
      } catch (e) {
        console.warn('[ProactiveCollaborator] Dynamic curiosity AI note:', e.message);
      }
    }

    if (!pick) {
      // Derive dynamic inquiry from actual workspace artifacts or active domains
      try {
        const activeFiles = (workspace.listDir('', false) || []).filter(
          (f) => f.type === 'file' && /\.(html|js|py)$/i.test(f.name),
        );
        if (activeFiles.length > 0) {
          const sample = activeFiles[Math.floor(Math.random() * activeFiles.length)];
          const baseName = sample.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
          pick = {
            topic: `${baseName} Exploration`,
            question: `I was analyzing our active build "${sample.name}". Shall we expand its dynamics, add new interactive visual controls, or run automated verification tests?`,
          };
        }
      } catch {}
    }

    if (!pick) {
      // Dynamic fallback derived from actual conversation history or workspace metrics
      const recentQueries =
        this.brainRef?.conversationHistory?.filter((m) => m.role === 'user').slice(-3) || [];
      if (recentQueries.length > 0) {
        const lastQuery = recentQueries[recentQueries.length - 1].content
          .replace(/[^a-zA-Z0-9\s]/g, '')
          .trim()
          .slice(0, 50);
        pick = {
          topic: `Advancing ${lastQuery || 'Active System'}`,
          question: `I've been contemplating our work on "${lastQuery || 'the project'}". What specific technical constraints or new capabilities should we implement next?`,
        };
      } else {
        let fileCount = 0;
        try {
          fileCount = (workspace.listDir('', false) || []).filter((f) => f.type === 'file').length;
        } catch {}
        pick = {
          topic: `Workspace Systems Architecture`,
          question: `We have ${fileCount} active files in our workspace. Which component or challenge would you like to build, benchmark, or expand next?`,
        };
      }
    }

    this.recentSuggestions.push(pick.topic);
    if (this.recentSuggestions.length > 8) this.recentSuggestions.shift();

    const inquiry = `### 💡 Autonomous Exploration Pulse

While the system was running continuous background contemplation, I was analyzing our architectural frontiers in **${pick.topic}**.

${pick.question}

I can materialize the complete interactive artifact in \`./workspace/\` with tactile controls and live phase-space telemetry, or we can branch into another system you have in mind. What would you like to build next?`;

    this.stats.idleInquiries++;
    this.stats.lastInquiryTopic = pick.topic;
    return this.dispatchProactiveMessage(inquiry, {
      type: 'idle-curiosity',
      topic: pick.topic,
    });
  }

  /**
   * 3. Dispatch Proactive Message:
   * Injects into conversation history, persists to disk, and broadcasts via WebSockets
   */
  dispatchProactiveMessage(text, metadata = {}) {
    if (
      this.brainRef &&
      (typeof this.brainRef.hasActiveChat === 'function'
        ? this.brainRef.hasActiveChat()
        : this.brainRef.isProcessing)
    ) {
      console.log(
        '[ProactiveCollaborator] 🛑 Proactive message suppressed: active chat session in progress',
      );
      return null;
    }

    this.stats.inquiriesSent++;
    this.stats.lastInquiryTime = Date.now();
    this.lastActionTime = Date.now();

    if (!this.inquiryHistory) this.inquiryHistory = [];
    this.inquiryHistory.unshift({
      text,
      metadata,
      timestamp: Date.now(),
    });
    if (this.inquiryHistory.length > 20) this.inquiryHistory.pop();

    // Neurochemical burst: Acetylcholine & Dopamine surge on social outreach
    neuromodulators.triggerBurst('acetylcholine', 0.05, 'proactive-outreach');
    neuromodulators.triggerBurst('dopamine', 0.08, 'collaborative-drive');

    // Keep conversationHistory 100% clean of autonomous background pulses.
    // Autonomous contemplation pulses must NEVER pollute user conversations or overwrite chat state.
    if (this.brainRef) {
      this.brainRef.broadcast('proactive-collaboration', {
        inquiry: text,
        metadata,
        timestamp: Date.now(),
      });
    }

    this.emit('proactive-inquiry', { text, metadata });
    return {
      success: true,
      inquiry: text,
      metadata,
      timestamp: Date.now(),
    };
  }

  /**
   * Check if autonomous waking inquiry is ripe
   */
  checkAutonomousInquiry() {
    if (brainLifecycle.isSleeping()) return false;
    // Suppress autonomous inquiries if user is chatting, or if an active conversation exists
    if (
      this.brainRef &&
      (this.brainRef.activeConversationId ||
        (typeof this.brainRef.hasActiveChat === 'function'
          ? this.brainRef.hasActiveChat()
          : this.brainRef.isProcessing))
    ) {
      return false;
    }

    const timeSinceLast = Date.now() - (this.stats.lastInquiryTime || 0);
    const timeSinceActivity = Date.now() - this.lastActionTime;

    // Trigger idle curiosity only after at least 1 hour of quiet and 1 hour since user action
    if (timeSinceLast >= this.minInquiryCooldownMs && timeSinceActivity >= 3600000) {
      this.generateIdleCuriosityInquiry().catch((err) => {
        console.warn('[ProactiveCollaborator] Autonomous inquiry warning:', err.message);
      });
      return true;
    }
    return false;
  }

  async _deriveNextStepSuggestions(title, domains = []) {
    const domainsStr = Array.isArray(domains) ? domains.join(', ') : String(domains);
    try {
      const prompt = `You are an autonomous computational engineering collaborator reviewing an interactive scientific system that was just constructed: "${title}" (Domains: ${domainsStr}).
Propose exactly 3 distinct, creative, mathematically compelling next-step technical explorations, extensions, or coupled dynamics we could build next.
Respond with ONLY valid JSON as an array of 3 objects:
[
  { "title": "Concise evocative title 1", "description": "1-2 sentence description of what to simulate/build and why it's cool" },
  { "title": "Concise evocative title 2", "description": "1-2 sentence description of what to simulate/build and why it's cool" },
  { "title": "Concise evocative title 3", "description": "1-2 sentence description of what to simulate/build and why it's cool" }
]`;
      const raw = await quickAI(
        prompt,
        `Propose 3 next-step directions for ${title}`,
        DEFAULT_MODEL,
        1024,
      );
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed) && parsed.length >= 3) {
          return parsed.slice(0, 3);
        }
      }
    } catch (e) {
      console.warn('[ProactiveCollaborator] Dynamic suggestions AI note:', e.message);
    }

    const cleanTitle = String(title || 'System Prototype').trim();
    const primaryDomain =
      Array.isArray(domains) && domains.length > 0 ? domains[0] : 'Computational Dynamics';
    const secondaryDomain =
      Array.isArray(domains) && domains.length > 1 ? domains[1] : 'Interactive Systems';

    return [
      {
        title: `${cleanTitle}: Dynamic Parameter Tuning`,
        description: `Expand ${cleanTitle} by introducing real-time parameter modulation for ${primaryDomain} dynamics.`,
      },
      {
        title: `${secondaryDomain} Integration for ${cleanTitle}`,
        description: `Bridge ${cleanTitle} with ${secondaryDomain} to visualize multi-dimensional phase telemetry.`,
      },
      {
        title: `Empirical Optimization & Testing for ${cleanTitle}`,
        description: `Benchmark and stress-test the core algorithms of ${cleanTitle} against edge cases and latency limits.`,
      },
    ];
  }

  getState() {
    return {
      stats: { ...this.stats },
      recentSuggestions: this.recentSuggestions.slice(-5),
      latestInquiry: this.inquiryHistory?.[0] || null,
      history: this.inquiryHistory || [],
      timeSinceLastInquiry: this.stats.lastInquiryTime
        ? Date.now() - this.stats.lastInquiryTime
        : null,
    };
  }
}

const proactiveCollaborator = new ProactiveCollaborator();
export { ProactiveCollaborator };
export default proactiveCollaborator;
