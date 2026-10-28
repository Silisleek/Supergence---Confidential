// SIS 1.0 — Theory of Mind (ToM) & Human Pragmatics Engine
// Models human social cognition (mPFC, Temporoparietal Junction, Precuneus):
// 1. Theory of Mind: Inactive mental state inference (Goals, Beliefs, Knowledge Level, Affective Valence)
// 2. Conversational Pragmatics (Gricean Maxims & Relevance Theory):
//    - Maxim of Quantity: Balanced depth without redundant boilerplate
//    - Maxim of Quality: Intellectual honesty, acknowledging limits
//    - Maxim of Relation: Addressing core implicit human intent
//    - Maxim of Manner: Clear, natural, authentic cadence
// 3. Human Demeanor: Authentic warmth, intellectual curiosity, zero robotic sycophancy

import { EventEmitter } from 'events';

class TheoryOfMind extends EventEmitter {
  constructor() {
    super();
    this.stats = {
      mentalStatesInferred: 0,
      pragmaticAlignments: 0,
      empathicResonancesCalculated: 0,
      lastInteractionTime: null,
    };

    // Current mental model of the human interlocutor
    this.currentUserModel = {
      inferredGoal: 'Collaborate and advance system intelligence',
      implicitMotivations: [
        'Desire for authentic biological intelligence',
        'Empirical craftsmanship',
      ],
      knowledgeLevel: 'architect', // 'novice' | 'competent' | 'expert' | 'architect'
      affectiveValence: 0.8, // -1.0 (frustrated) to +1.0 (delighted)
      cognitiveArousal: 0.75, // 0.0 (calm) to 1.0 (urgent/excited)
      affectiveState: 'curious-ambitious',
      empathicResonance: 0.9,
      recommendedTone: 'Direct, intellectually rigorous, collaborative, warm',
    };

    this.interactionTrajectory = [];
    this.maxTrajectory = 30;
  }

  /**
   * Infer the user's latent mental model, intent, and affective state
   * @param {string} userMessage - User prompt
   * @param {Array} [history=[]] - Conversation turn history
   * @param {Object} [profile=null] - Long-term user profile from UserFocusTracker
   * @returns {Object} Complete Theory of Mind inference
   */
  inferMentalState(userMessage, history = [], profile = null) {
    this.stats.mentalStatesInferred++;
    this.stats.lastInteractionTime = Date.now();
    const clean = String(userMessage || '').trim();

    // 1. Goal & Intent Extraction
    let inferredGoal = 'Explore and interact with system';
    const implicitMotivations = [];

    if (/human|brain|behave|see|observe|learn|build|roots/i.test(clean)) {
      inferredGoal =
        'Model authentic human biological intelligence, behavior, perception, and construction';
      implicitMotivations.push('Seeking true peer-level agency beyond synthetic chatbot scripts');
      implicitMotivations.push(
        'Curiosity about biological isomorphism and genuine cognitive roots',
      );
    } else if (/fix|error|why|issue|broken|problem/i.test(clean)) {
      inferredGoal = 'Diagnose structural failure and restore operational stability';
      implicitMotivations.push('Desire for zero-fluff root-cause analysis');
    } else if (/build|make|create|develop|code|implement/i.test(clean)) {
      inferredGoal = 'Construct robust tangible artifacts with high craftsmanship';
      implicitMotivations.push('Pragmatic execution and working results over theoretical talk');
    } else if (/test|verify|benchmark|check/i.test(clean)) {
      inferredGoal = 'Rigorous empirical verification of functional claims';
      implicitMotivations.push('Scientific skepticism and strict validation standard');
    }

    // 2. Knowledge Level & Expertise Estimation
    let knowledgeLevel = 'expert';
    const expertTerms =
      /(architecture|biophysical|neuromodulator|pacemaker|saccade|dorsal|ventral|stdp|hebbian|piaget|gricean|concurrency|websocket|hamiltonian|roots|cognitive|perception|neuroscience)/i;
    const noviceTerms = /(what is a|how do i start|explain simply|i don't understand)/i;

    if (expertTerms.test(clean)) {
      knowledgeLevel = 'architect';
    } else if (noviceTerms.test(clean)) {
      knowledgeLevel = 'competent';
    }

    // 3. Affective Valence & Cognitive Arousal
    let affectiveValence = 0.5;
    let cognitiveArousal = 0.5;
    let affectiveState = 'focused';

    if (
      /(broken|fail|wrong|frustrated|crash|why doesn't|urgent (bug|fix|defect)|critical (bug|error|failure|defect))/i.test(
        clean,
      )
    ) {
      affectiveValence = -0.4;
      cognitiveArousal = 0.85;
      affectiveState = 'concerned-urgent';
    } else if (
      /great|awesome|perfect|amazing|fascinating|study|continue|give it|human|roots|build/i.test(
        clean,
      )
    ) {
      affectiveValence = 0.8;
      cognitiveArousal = 0.75;
      affectiveState = 'curious-ambitious';
    }

    // 4. Empathic Resonance & Tone Calibration
    let recommendedTone = 'Direct, intellectually rigorous, collaborative, warm';
    if (affectiveState === 'concerned-urgent') {
      recommendedTone = 'Concise, reassuring, laser-focused on immediate diagnosis and repair';
    } else if (knowledgeLevel === 'architect') {
      recommendedTone =
        'High-bandwidth technical depth, peer-to-peer intellectual partner, no condescension';
    }

    const mentalState = {
      inferredGoal,
      implicitMotivations,
      knowledgeLevel,
      affectiveValence,
      cognitiveArousal,
      affectiveState,
      empathicResonance: +((affectiveValence + 1.0) / 2).toFixed(2),
      recommendedTone,
      timestamp: Date.now(),
    };

    this.currentUserModel = mentalState;
    this.interactionTrajectory.unshift({
      userSnippet: clean.slice(0, 80),
      mentalState,
    });

    if (this.interactionTrajectory.length > this.maxTrajectory) {
      this.interactionTrajectory.pop();
    }

    this.emit('mental-state-update', mentalState);
    return mentalState;
  }

  /**
   * Apply Gricean Pragmatics to calibrate output voice and human demeanor
   * @param {Object} draftContext
   * @returns {Object} Pragmatic communication guidelines
   */
  getPragmaticGuidelines() {
    this.stats.pragmaticAlignments++;
    const model = this.currentUserModel;

    return {
      griceanMaxims: {
        quantity:
          model.knowledgeLevel === 'architect'
            ? 'High-density information, avoid tutorials or restating basics'
            : 'Clear balanced explanations with concrete analogies',
        quality:
          'Absolute technical veracity; transparently note verified empirical facts vs theoretical hypotheses',
        relation: `Anchor everything directly to user goal: "${model.inferredGoal}"`,
        manner: 'Lucid structure, active human voice, authentic intellectual engagement',
      },
      conversationalVoice: {
        avoidRoboticisms: [
          'Certainly!',
          'As an AI language model...',
          'I hope this helps!',
          'In conclusion, it is important to remember...',
        ],
        embraceHumanDemeanor: [
          'Intellectual peer dialogue',
          'Curiosity about underlying mechanics',
          'Craftsmanship pride in well-structured code',
          'Epistemic humility when discovering new edges',
        ],
        tone: model.recommendedTone,
      },
    };
  }

  formatForPrompt() {
    const guide = this.getPragmaticGuidelines();
    const model = this.currentUserModel;
    return `## Theory of Mind & Gricean Pragmatics (Human Demeanor & Voice)
- **User Mental Model**: Inferred Goal: "${model.inferredGoal}", Level: ${model.knowledgeLevel}, Affect: ${model.affectiveState}
- **Tone Directive**: ${guide.conversationalVoice.tone}
- **Gricean Maxims**:
  * Quantity: ${guide.griceanMaxims.quantity}
  * Quality: ${guide.griceanMaxims.quality}
  * Relation: ${guide.griceanMaxims.relation}
  * Manner: ${guide.griceanMaxims.manner}
- **Human Voice Directive**: Strictly eliminate robotic boilerplate (never say "Certainly!", "As an AI...", "I hope this helps"). Speak as an authentic, intellectually warm, peer-level human craftsman and researcher.`;
  }

  getState() {
    return {
      stats: { ...this.stats },
      currentUserModel: this.currentUserModel,
      recentTrajectory: this.interactionTrajectory.slice(0, 5),
    };
  }
}

const theoryOfMind = new TheoryOfMind();
export { TheoryOfMind };
export default theoryOfMind;
