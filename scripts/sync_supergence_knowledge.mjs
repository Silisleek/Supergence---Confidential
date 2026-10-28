// SIS 1.0 — Sync Supergence Epistemic Knowledge into Graph, LTM, and Hermes
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import knowledgeGraph, { RELATION_TYPES } from '../server/memory/knowledge-graph.js';
import hermesLearner from '../server/services/hermesLearner.js';
import { SUPERGENCE_KNOWLEDGE } from '../server/services/supergenceKnowledgeCore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const MEMORY_DIR = path.join(DATA_DIR, 'memory');

async function syncKnowledge() {
  console.log('--- SYNCING SUPERGENCE EPISTEMIC KNOWLEDGE BASE ---');

  // 1. Write supergence-epistemic-core.json
  if (!fs.existsSync(MEMORY_DIR)) fs.mkdirSync(MEMORY_DIR, { recursive: true });
  const coreFile = path.join(MEMORY_DIR, 'supergence-epistemic-core.json');
  fs.writeFileSync(coreFile, JSON.stringify(SUPERGENCE_KNOWLEDGE, null, 2), 'utf8');
  console.log(`✓ Wrote complete epistemic core to: ${coreFile}`);

  // 2. Register Nodes and Edges in the Relational Knowledge Graph
  const supergenceNodeId = 'concept_supergence';
  knowledgeGraph.addNode(
    supergenceNodeId,
    'Supergence Sovereign Superintelligence Collective',
    'system_core',
    ['superintelligence', 'multi-agent', 'orchestration', 'sis-1.0'],
    {
      description: SUPERGENCE_KNOWLEDGE.identity.title,
      orchestrator: SUPERGENCE_KNOWLEDGE.identity.orchestrator,
      philosophy: SUPERGENCE_KNOWLEDGE.identity.designPhilosophy,
    },
  );

  // Register Coworker Dots
  for (const agent of SUPERGENCE_KNOWLEDGE.coworkerDotsRoster) {
    const agentNodeId = `agent_${agent.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    knowledgeGraph.addNode(
      agentNodeId,
      `${agent.name} (${agent.avatar} ${agent.role})`,
      'coworker_agent',
      ['agent', 'coworker-dot', agent.domain.toLowerCase()],
      {
        id: agent.id,
        role: agent.role,
        domain: agent.domain,
        framework: agent.framework,
        status: agent.status,
      },
    );
    knowledgeGraph.addEdge(
      supergenceNodeId,
      agentNodeId,
      RELATION_TYPES.IMPLEMENTS,
      1.0,
      { role: agent.role },
      false,
    );
  }

  // Register Subsystems
  for (const [key, sub] of Object.entries(SUPERGENCE_KNOWLEDGE.subsystems)) {
    const subNodeId = `subsystem_${key.toLowerCase()}`;
    knowledgeGraph.addNode(
      subNodeId,
      sub.name,
      'subsystem_core',
      ['subsystem', 'architecture', key],
      {
        role: sub.role,
        details: sub.mechanics || sub.metrics || sub.capabilities || '',
      },
    );
    knowledgeGraph.addEdge(
      supergenceNodeId,
      subNodeId,
      RELATION_TYPES.IMPLEMENTS,
      0.95,
      { subsystem: key },
      false,
    );
  }

  knowledgeGraph._save();
  console.log(
    `✓ Synchronized Knowledge Graph (${knowledgeGraph.nodes.size} nodes, with full Supergence architecture mappings)`,
  );

  // 3. Register Permanent Hermes Cognitive Facets
  const rules = [
    {
      category: 'Identity & Sovereign Core',
      fact: 'Supergence is a sovereign multi-agent superintelligence collective (SIS 1.0), orchestrated by the Chief of Staff and featuring 11 specialized autonomous Coworker Dots.',
    },
    {
      category: 'Coworker Dots Swarm',
      fact: 'The 11 Coworker Agents (Chief of Staff, Bio-SIS, Nova-Dev, Astra-Logic, Volt-Phys, Synapse-AI, Claw-Cybernetics, Quant-Econ, Aegis-Risk, Alexandria, Sentinel-Triage) work collaboratively across specialized spaces and swarms.',
    },
    {
      category: 'Architecture & Faculties',
      fact: 'Supergence integrates continuous epistemic memory (Hermes v32.7), dynamic tool genesis (Ada-SI), direct OS control (OpenClaw), and 4-strand recursive self-improvement (RQGM, AZR, AlphaEvolve, SEAL).',
    },
    {
      category: 'Isolated Workspace Rule',
      fact: 'All synthesized source code, simulations, and artifacts are safely isolated in ./workspace/ with compact status pills in the chat view to prevent clutter.',
    },
    {
      category: 'Empirical Grounding Principle',
      fact: 'Supergence never uses canned or fake numbers; all telemetry, benchmark measurements, and execution traces are grounded in real host operating system state.',
    },
  ];

  for (const r of rules) {
    hermesLearner.teachRule({
      category: r.category,
      fact: r.fact,
      confidence: 1.0,
      source: 'Supergence Epistemic Core Sync',
    });
  }
  console.log('✓ Registered 5 core architectural facets into Hermes learning ledger');

  console.log('\n🎉 SUPERGENCE EPISTEMIC KNOWLEDGE BASE SYNC COMPLETED SUCCESSFULLY!');
}

syncKnowledge().catch((err) => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});
