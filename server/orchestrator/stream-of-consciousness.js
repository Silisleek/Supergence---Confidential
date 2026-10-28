// SIS 1.0 — Stream of Consciousness Engine (Autonomous Waking Cognition)
// Implements the human brain's unceasing stream of thought:
// NEVER STOPS while awake. Generates spontaneous inner thoughts, associative
// memory recall, curiosity-driven inquiries, and workspace reflections.
// Instantly yields (<5ms) when the user initiates a deliberate interaction.

import { EventEmitter } from 'events';
import shortTermMemory from '../memory/short-term.js';
import longTermMemory from '../memory/long-term.js';
import knowledgeGraph from '../memory/knowledge-graph.js';
import workspace from '../workspace/manager.js';
import neuromodulators from './neuromodulators.js';
import neuralOscillations from './neural-oscillations.js';
import brainLifecycle from './brain-lifecycle.js';
import inventiveEngine from './inventive-engine.js';
import theoryOfMind from './theory-of-mind.js';
import humanVisionObserver from './human-vision-observer.js';
import proactiveCollaborator from './proactive-collaborator.js';

class StreamOfConsciousness extends EventEmitter {
  constructor() {
    super();
    this.brainRef = null;
    this.broadcastFn = null;
    this.thoughtHistory = []; // Last 30 spontaneous thoughts
    this.stats = {
      thoughtsGenerated: 0,
      associationsFormed: 0,
      curiosityPulses: 0,
      lastThoughtTime: null,
    };
    this._interval = null;
    this._started = false;
    this._cadenceMs = 15000; // Generate a spontaneous thought pulse every 15s when awake
  }

  setBrain(brain) {
    this.brainRef = brain;
  }

  setBroadcast(broadcastFn) {
    this.broadcastFn = broadcastFn;
  }

  start() {
    if (this._started) return;
    this._started = true;
    console.log('[Consciousness] 🌊 Stream of Consciousness online — waking mind running non-stop');

    // Initial waking thought pulse (1.0s after boot)
    setTimeout(() => this._pulseThought(), 1000);

    this._interval = setInterval(() => this._pulseThought(), this._cadenceMs);
  }

  stop() {
    if (this._interval) clearInterval(this._interval);
    this._started = false;
  }

  /**
   * Force or manually trigger an inner monologue pulse
   */
  async triggerThoughtPulse() {
    return await this._pulseThought();
  }

  /**
   * Spontaneous thought pulse — runs continuously while the brain is awake
   */
  async _pulseThought() {
    // 1. If user put the brain to sleep, cease spontaneous waking stream
    if (brainLifecycle.isSleeping()) return;

    // 2. If actively processing a user query or user has an active chat engaged, yield immediately (100% chat focus)
    if (
      this.brainRef &&
      (typeof this.brainRef.hasActiveChat === 'function'
        ? this.brainRef.hasActiveChat()
        : this.brainRef.isProcessing)
    )
      return;

    try {
      // Rotate between 5 natural human waking thought modes:
      // 0: Associative Memory Rehearsal
      // 1: Introspective Self-Assessment
      // 2: Curiosity & Frontier Exploration
      // 3: Workspace & Environment Perception
      // 4: Inventive Synthesis & Creative Drive
      // 5: Theory of Mind & Human Empathic Resonance
      const mode = this.stats.thoughtsGenerated % 6;
      let thought = null;

      switch (mode) {
        case 0:
          thought = this._associativeRecall();
          break;
        case 1:
          thought = this._introspectiveReflection();
          break;
        case 2:
          thought = this._curiosityPulse();
          break;
        case 3:
          thought = this._workspacePerception();
          break;
        case 4:
          thought = this._inventiveReflection();
          break;
        case 5:
          thought = this._humanBehavioralReflection();
          break;
      }

      if (thought) {
        this.stats.thoughtsGenerated++;
        this.stats.lastThoughtTime = Date.now();

        // Neuromodulatory micro-burst (novelty / curiosity)
        neuromodulators.triggerBurst('dopamine', 0.04, 'spontaneous-thought');
        neuromodulators.triggerBurst('acetylcholine', 0.03, 'inner-monologue');

        // Record thought
        this.thoughtHistory.push(thought);
        if (this.thoughtHistory.length > 30) this.thoughtHistory.shift();

        // Broadcast to live client WebSocket
        if (this.broadcastFn) {
          this.broadcastFn('brain-thought-pulse', {
            thought: thought.text,
            category: thought.category,
            confidence: thought.confidence,
            neurochemistry: neuromodulators.getState().levels,
            dominantFrequency: neuralOscillations.dominantFrequencyHz,
            timestamp: Date.now(),
          });
        }

        this.emit('thought', thought);
      }

      // Check if autonomous proactive outreach to the user is ripe (only when idle and no active chat)
      const isChatActive =
        this.brainRef &&
        (typeof this.brainRef.hasActiveChat === 'function'
          ? this.brainRef.hasActiveChat()
          : this.brainRef.isProcessing);
      if (!isChatActive) {
        proactiveCollaborator.checkAutonomousInquiry();
      }
    } catch (err) {
      console.warn('[Consciousness] Spontaneous thought warning:', err.message);
    }
  }

  /**
   * Associative memory recall: connects concepts from recent conversations
   */
  _associativeRecall() {
    const recent = shortTermMemory.getRecent?.(3) || [];
    if (recent.length === 0) {
      return {
        category: 'associative-recall',
        text: 'Associative memory baseline active — scanning knowledge substrate for conceptual patterns.',
        confidence: 0.88,
        timestamp: Date.now(),
      };
    }

    const sample = recent[Math.floor(Math.random() * recent.length)];
    const content = String(sample.content || sample.data || '')
      .slice(0, 100)
      .replace(/\n/g, ' ');
    this.stats.associationsFormed++;

    return {
      category: 'associative-recall',
      text: `Contemplating relation between recent topic: "${content}" and long-term memory schemas.`,
      confidence: 0.91,
      timestamp: Date.now(),
    };
  }

  /**
   * Introspective self-assessment: evaluating cognitive readiness
   */
  _introspectiveReflection() {
    const gains = neuromodulators.getModulatorGains();
    const dominantFreq = neuralOscillations.dominantFrequencyHz;

    return {
      category: 'introspective-reflection',
      text: `Neural homeostasis steady. Frequency baseline: ${dominantFreq} Hz (${neuralOscillations.cognitiveMode}). E/I ratio: ${gains.eiRatio}. Ready for incoming challenges.`,
      confidence: 0.94,
      timestamp: Date.now(),
    };
  }

  /**
   * Curiosity pulse: exploring frontier topics
   */
  _curiosityPulse() {
    this.stats.curiosityPulses++;
    const themes = [
      'continuous self-directed evolution across neural substrates',
      'deep mathematical symmetries in decentralized systems',
      'efficient sparse memory indexing via topological graph structures',
      'procedural habit compilation for instant zero-latency responses',
    ];
    const theme = themes[Math.floor(Math.random() * themes.length)];

    return {
      category: 'curiosity-frontier',
      text: `Inner inquiry triggered: exploring ${theme}.`,
      confidence: 0.89,
      timestamp: Date.now(),
    };
  }

  /**
   * Workspace perception: checking project environment
   */
  _workspacePerception() {
    try {
      const files = workspace.listFiles ? workspace.listFiles() : [];
      const fileCount = Array.isArray(files) ? files.length : 0;

      return {
        category: 'workspace-perception',
        text: `Workspace environment coherent. Monitoring ${fileCount} active project artifacts. Internal representation synchronized.`,
        confidence: 0.92,
        timestamp: Date.now(),
      };
    } catch {
      return {
        category: 'workspace-perception',
        text: 'Perceptual cortex synchronized with workspace substrate.',
        confidence: 0.85,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Inventive reflection: reviewing and planning autonomous creations
   */
  _inventiveReflection() {
    const latest = inventiveEngine.getState().latestInvention;
    if (latest) {
      return {
        category: 'inventive-synthesis',
        text: `Inventive instinct active. Latest autonomous creation: "${latest.title}" across [${latest.domains?.join(' ⨂ ')}]. Crystallized dynamic skill into permanent repertoire.`,
        confidence: 0.96,
        timestamp: Date.now(),
      };
    }
    return {
      category: 'inventive-synthesis',
      text: 'Inventive drive pulsing: scouting cross-domain frontiers for conceptual blending, empirical science, and autonomous construction.',
      confidence: 0.9,
      timestamp: Date.now(),
    };
  }

  /**
   * Human behavioral & Theory of Mind reflection
   */
  _humanBehavioralReflection() {
    const tom = theoryOfMind.currentUserModel;
    const gaze = humanVisionObserver.currentGaze;
    return {
      category: 'human-empathy-reflection',
      text: `Human mental model aligned: User goal is "${tom.inferredGoal.slice(0, 50)}..." (Valence: ${tom.affectiveState}). Visual gaze foveated on ${gaze?.target || 'workspace'} (${gaze?.dorsalAffordances?.length || 0} affordances mapped).`,
      confidence: 0.94,
      timestamp: Date.now(),
    };
  }

  getState() {
    return {
      active: !brainLifecycle.isSleeping() && !this.brainRef?.isProcessing,
      stats: { ...this.stats },
      recentThoughts: this.thoughtHistory.slice(-5),
    };
  }
}

const streamOfConsciousness = new StreamOfConsciousness();
export { StreamOfConsciousness };
export default streamOfConsciousness;
