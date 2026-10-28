// SIS 1.0 — Human Learning & Cognitive Adaptation Engine
// Implements biological and developmental learning principles:
// 1. Mirror Neuron System (Rizzolatti): Action imitation & intent inference from demonstrations
// 2. Piagetian Constructivism: Cognitive Schemas, Assimilation (fitting in), and Accommodation (schema shifting)
// 3. Spike-Timing-Dependent Plasticity (STDP) & Hebbian Synaptic Rewiring
// 4. Complementary Learning Systems (CLS): Fast Hippocampal episodic encoding to slow Neocortical consolidation

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EventEmitter } from 'events';
import knowledgeGraph from '../memory/knowledge-graph.js';
import neuromodulators from './neuromodulators.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMAS_PATH = path.join(__dirname, '../../data/improvement/human-schemas.json');

class HumanLearningEngine extends EventEmitter {
  constructor() {
    super();
    this.schemasPath = SCHEMAS_PATH;
    this.schemas = new Map(); // schemaId -> Schema
    this.episodicBuffer = []; // Fast hippocampal buffer
    this.maxEpisodic = 100;

    this.stats = {
      mirrorObservations: 0,
      intentsInferred: 0,
      assimilations: 0,
      accommodations: 0,
      stdpUpdates: 0,
      consolidations: 0,
    };

    this._loadSchemas();
  }

  _loadSchemas() {
    try {
      if (fs.existsSync(this.schemasPath)) {
        const raw = JSON.parse(fs.readFileSync(this.schemasPath, 'utf8'));
        if (Array.isArray(raw.schemas)) {
          for (const s of raw.schemas) {
            this.schemas.set(s.id, s);
          }
        }
        if (raw.stats) {
          this.stats = { ...this.stats, ...raw.stats };
        }
      } else {
        this._seedFoundationalSchemas();
      }
    } catch (e) {
      console.warn('[HumanLearning] Schema load warning:', e.message);
      this._seedFoundationalSchemas();
    }
  }

  _saveSchemas() {
    try {
      const dir = path.dirname(this.schemasPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const payload = {
        schemas: Array.from(this.schemas.values()),
        stats: this.stats,
        updatedAt: Date.now(),
      };
      fs.writeFileSync(this.schemasPath, JSON.stringify(payload, null, 2));
    } catch (e) {
      console.error('[HumanLearning] Schema save error:', e.message);
    }
  }

  _seedFoundationalSchemas() {
    const seeds = [
      {
        id: 'schema_modular_architecture',
        domain: 'systems',
        concept: 'Component Modularity',
        invariants: ['Single Responsibility Principle', 'Loose Coupling', 'Explicit Interfaces'],
        confidence: 0.95,
        assimilatedCount: 12,
        accommodatedCount: 0,
        lastUpdated: Date.now(),
      },
      {
        id: 'schema_tactile_interaction',
        domain: 'design',
        concept: 'Direct Physical Affordances',
        invariants: [
          'Immediate Visual Feedback (<16ms)',
          'Visible Action Controls',
          'Zero Modal Trap',
        ],
        confidence: 0.92,
        assimilatedCount: 8,
        accommodatedCount: 0,
        lastUpdated: Date.now(),
      },
      {
        id: 'schema_empirical_verification',
        domain: 'science',
        concept: 'Falsifiability & Invariance Testing',
        invariants: [
          'Hypothesis Precedes Build',
          'Quantitative Discrepancy Metric',
          'Closed-Loop Correction',
        ],
        confidence: 0.98,
        assimilatedCount: 15,
        accommodatedCount: 0,
        lastUpdated: Date.now(),
      },
    ];

    for (const s of seeds) {
      this.schemas.set(s.id, s);
    }
    this._saveSchemas();
  }

  /**
   * 1. Mirror Neuron System: Observe demonstration, infer underlying intent, extract reusable exemplar
   * @param {Object} params
   * @param {string} params.demonstration - Code, prompt, or tool sequence observed
   * @param {string} [params.context=''] - High-level user context
   * @returns {Object} { inferredIntent, emulatedAction, exemplar }
   */
  mirrorNeuronObserve({ demonstration, context = '' }) {
    this.stats.mirrorObservations++;
    const text = String(demonstration || '').trim();

    // Dynamic intent and semantic extraction from demonstration
    const cleanSubject =
      text
        .replace(
          /^(can you|please|build|create|make|code|write|test|verify|fix|check|debug|const|let|var|function)\s+/i,
          '',
        )
        .replace(/[^\w\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 60) || 'system component';

    let targetDomain = 'general';
    let inferredIntent = `Synthesize and coordinate ${cleanSubject}`;

    if (/fix|error|bug|broken|crash|null|undefined|overflow|fail|exception/i.test(text)) {
      targetDomain = 'debugging';
      inferredIntent = `Diagnose and resolve structural defects in ${cleanSubject}`;
    } else if (/speed|fast|perf|cache|optimize|latency|fps|throughput/i.test(text)) {
      targetDomain = 'performance';
      inferredIntent = `Streamline computational throughput and eliminate latency in ${cleanSubject}`;
    } else if (
      /build|create|canvas|three|ui|design|component|render|simulate|draw|append/i.test(text)
    ) {
      targetDomain = 'creation';
      inferredIntent = `Construct interactive tactile model for ${cleanSubject}`;
    } else if (/test|verify|check|benchmark|assert|validate|expect/i.test(text)) {
      targetDomain = 'verification';
      inferredIntent = `Empirically validate operational invariants of ${cleanSubject}`;
    } else if (/explore|study|understand|learn|analyze|research|quantum|physics|math/i.test(text)) {
      targetDomain = 'epistemic';
      inferredIntent = `Investigate epistemic principles and dynamics of ${cleanSubject}`;
    }

    this.stats.intentsInferred++;

    // Mirror emulation: Construct internal cognitive motor plan
    const emulatedAction = {
      domain: targetDomain,
      intent: inferredIntent,
      corePattern: text.slice(0, 160),
      timestamp: Date.now(),
    };

    // Store in fast Hippocampal episodic buffer
    this.episodicBuffer.unshift(emulatedAction);
    if (this.episodicBuffer.length > this.maxEpisodic) {
      this.episodicBuffer.pop();
    }

    // Trigger Acetylcholine plasticity surge for observational learning
    neuromodulators.triggerBurst('acetylcholine', 0.08, 'observational-learning');

    this.emit('mirror-observation', { emulatedAction, inferredIntent });
    return {
      inferredIntent,
      inferredGoal: inferredIntent,
      targetDomain,
      emulatedAction,
      emulationConfidence: 0.88,
      motorSubroutines: [
        `Parse intention: ${inferredIntent}`,
        `Synthesize mental template for domain: ${targetDomain}`,
        `Execute motor emulation: ${text.slice(0, 50)}...`,
      ],
    };
  }

  /**
   * 2. Piagetian Constructivism: Process an observation via Assimilation or Accommodation
   * @param {Object} params
   * @param {string} params.observation - The new pattern or discovery
   * @param {string} params.domain - Knowledge domain
   * @param {number} [params.surpriseLevel=0.1] - 0.0 to 1.0 (prediction error)
   * @returns {Object} { mode: 'assimilation' | 'accommodation', schema }
   */
  piagetianAdaptation({ observation, domain = 'systems', surpriseLevel = 0.1 }) {
    const cleanObs = String(observation || '').trim();
    const schemaId = `schema_${domain.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    let schema = this.schemas.get(schemaId);
    if (!schema) {
      schema = {
        id: schemaId,
        domain,
        concept: `${domain} Cognitive Model`,
        name: `${domain} Cognitive Model`,
        invariants: [],
        confidence: 0.7,
        assimilatedCount: 0,
        accommodatedCount: 0,
        revision: 0,
        lastUpdated: Date.now(),
      };
      this.schemas.set(schemaId, schema);
    }
    schema.name = schema.concept;
    schema.revision = schema.accommodatedCount;

    // If surprise is low (< 0.4), assimilate into existing mental model
    if (surpriseLevel < 0.4) {
      this.stats.assimilations++;
      schema.assimilatedCount++;
      schema.confidence = Math.min(0.99, +(schema.confidence + 0.01).toFixed(3));
      schema.lastUpdated = Date.now();
      schema.name = schema.concept;
      schema.revision = schema.accommodatedCount;
      this._saveSchemas();

      this.emit('assimilation', { schemaId, observation: cleanObs });
      return {
        mode: 'assimilation',
        type: 'assimilation',
        equilibriumPreserved: true,
        schemaRestructured: false,
        schema,
        message: `Assimilated observation smoothly into schema [${schema.concept}] (Confidence: ${(schema.confidence * 100).toFixed(1)}%)`,
      };
    }

    // If surprise is high (>= 0.40), trigger ACCOMMODATION (Schema Restructuring)
    this.stats.accommodations++;
    schema.accommodatedCount++;
    schema.confidence = Math.max(0.6, +(schema.confidence * 0.95).toFixed(3)); // Temporary dip while reorganizing
    schema.name = schema.concept;
    schema.revision = schema.accommodatedCount;

    // Extract new invariant rule from surprising observation
    const newInvariant = cleanObs.slice(0, 100);
    if (!schema.invariants.includes(newInvariant)) {
      schema.invariants.push(newInvariant);
      if (schema.invariants.length > 8) schema.invariants.shift();
    }
    schema.lastUpdated = Date.now();
    this._saveSchemas();

    // Neurochemical burst: High surprise engages Noradrenaline (vigilance) and Dopamine (exploration)
    neuromodulators.onHighSalience(surpriseLevel);

    // Knowledge graph accommodation: Connect concept to domain
    try {
      knowledgeGraph.addConcept({
        name: `Accommodation: ${newInvariant.slice(0, 30)}`,
        category: domain,
        properties: { source: 'piagetian-accommodation', surprise: surpriseLevel },
      });
    } catch {}

    this.emit('accommodation', { schemaId, newInvariant, surpriseLevel });
    return {
      mode: 'accommodation',
      type: 'accommodation',
      equilibriumPreserved: false,
      schemaRestructured: true,
      schema,
      message: `⚡ Cognitive Accommodation triggered! Restructured schema [${schema.concept}] with new invariant: "${newInvariant}"`,
    };
  }

  accommodateSchema(schemaId, schemaData = {}) {
    return this.piagetianAdaptation({
      observation: schemaData.concept || schemaData.domain || schemaId,
      domain: schemaData.domain || 'systems',
      surpriseLevel: 0.85,
    });
  }

  /**
   * 3. Spike-Timing-Dependent Plasticity (STDP)
   * Modulates synaptic associative strength between concepts
   */
  applySTDP(preConcept, postConcept, dtMs = 10, isSuccess = true) {
    this.stats.stdpUpdates++;
    const tau = 20.0; // Time constant in ms
    let deltaWeight;

    if (isSuccess && dtMs > 0) {
      // Potentiation (LTP): Pre fires before Post -> Causal reinforcement
      deltaWeight = +(0.15 * Math.exp(-dtMs / tau)).toFixed(4);
    } else {
      // Depression (LTD): Anti-causal or failed attempt
      deltaWeight = -(0.1 * Math.exp(Math.abs(dtMs) / tau)).toFixed(4);
    }

    const associationWeight =
      deltaWeight > 0 ? +(0.5 + deltaWeight).toFixed(3) : +(0.5 + deltaWeight).toFixed(3);

    try {
      const edge = knowledgeGraph.addEdge({
        source: preConcept,
        target: postConcept,
        type: 'STDP_ASSOCIATION',
        weight: deltaWeight > 0 ? 0.8 : 0.4,
        properties: { deltaWeight, associationWeight, lastUpdated: Date.now() },
      });
      return { preConcept, postConcept, deltaWeight, associationWeight, edge };
    } catch {
      return { preConcept, postConcept, deltaWeight, associationWeight, applied: false };
    }
  }

  /**
   * 4. Hippocampal-to-Neocortical Consolidation
   * Distills episodic events into structural long-term schemas
   */
  consolidateMemory() {
    if (this.episodicBuffer.length === 0) return { consolidated: 0 };
    this.stats.consolidations++;

    const count = this.episodicBuffer.length;
    const domainCounts = {};
    for (const ep of this.episodicBuffer) {
      domainCounts[ep.domain] = (domainCounts[ep.domain] || 0) + 1;
    }

    // Reinforce most active domains
    for (const [dom, freq] of Object.entries(domainCounts)) {
      if (freq >= 2) {
        this.piagetianAdaptation({
          observation: `Consolidated behavioral pattern in ${dom} from ${freq} recent episodes`,
          domain: dom,
          surpriseLevel: 0.15,
        });
      }
    }

    this.episodicBuffer = []; // Clear hippocampal buffer post-consolidation
    return { consolidated: count, domainProfiles: domainCounts };
  }

  getState() {
    return {
      stats: { ...this.stats },
      schemasCount: this.schemas.size,
      schemas: Array.from(this.schemas.values()).map((s) => ({
        id: s.id,
        concept: s.concept,
        domain: s.domain,
        confidence: s.confidence,
        assimilated: s.assimilatedCount,
        accommodated: s.accommodatedCount,
        invariantsCount: s.invariants.length,
      })),
      episodicBufferLength: this.episodicBuffer.length,
    };
  }
}

const humanLearningEngine = new HumanLearningEngine();
export { HumanLearningEngine };
export default humanLearningEngine;
