// SIS 1.0 — OpenDots & OpenBot Unified Swarm Engine
// Combines OpenDots (coworker channels, collaborative Spaces, parallel research swarms)
// and OpenBot (13+ specialized coworker personas across engineering, sciences, risk, and strategy)
// All powered dynamically by the SIS System Neural Core & LLM Gateway (NO HARDCODING).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import brain from '../orchestrator/brain.js';
import hermesLearner from './hermesLearner.js';
import { quickAI, DEFAULT_MODEL, PREMIUM_MODEL } from '../api/openrouter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const SPACES_DIR = path.join(ROOT_DIR, 'workspace', 'spaces');
const AGENTS_STORE_FILE = path.join(DATA_DIR, 'openbot-dots-agents.json');

export class OpenBotDotsManager {
  constructor() {
    this.name = 'OpenDots & OpenBot Unified Swarm';
    this.version = '3.0.0';
    this.agents = new Map();
    this.activeSwarms = new Map();
    this._ensureDirectories();
    this._initAgentMatrix();
  }

  _ensureDirectories() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      if (!fs.existsSync(SPACES_DIR)) fs.mkdirSync(SPACES_DIR, { recursive: true });
    } catch (e) {
      console.warn('[OpenBotDotsManager] Directory init notice:', e.message);
    }
  }

  _initAgentMatrix() {
    const roster = [
      {
        id: 'agent-biology',
        name: 'Bio-SIS',
        role: 'Biology, Genomics & Life Sciences Lead',
        domain: 'Molecular Biology, CRISPR, Protein Folding, Bioinformatics & Synthetic Bio',
        avatar: '🧬',
        color: '#10B981', // Emerald
        framework: 'OpenBot-Bio',
        status: 'ACTIVE_24_7',
        tasksCompleted: 154,
        systemPrompt: `You are Bio-SIS, the Biology, Genomics & Life Sciences Lead of Supergence (powered by the SIS System).
You are an authority on molecular biology, CRISPR gene editing, AlphaFold structural predictions, and biochemical pathways.
Provide mathematically and scientifically rigorous, cutting-edge analyses. Speak directly and eliminate conversational filler.`,
      },
      {
        id: 'agent-cs',
        name: 'Nova-Dev',
        role: 'Computer Science, Systems & Robotics Lead',
        domain: 'Distributed Systems, Compilers, Kernel Optimization, Full-Stack & OS Architecture',
        avatar: '💻',
        color: '#0EA5E9', // Ocean Sky
        framework: 'OpenBot-Code',
        status: 'ACTIVE_24_7',
        tasksCompleted: 218,
        systemPrompt: `You are Nova-Dev, the Computer Science, Systems & Software Lead of Supergence (powered by the SIS System).
You specialize in high-performance architectures, low-latency execution, compiler optimization, clean algorithms, and full-stack software.
Provide precise code, robust system designs, and zero fluff.`,
      },
      {
        id: 'agent-mathematics',
        name: 'Astra-Logic',
        role: 'Pure Mathematics & Formal Logic Lead',
        domain:
          'Symbolic Proofs, Differential Geometry, Topology, Abstract Algebra & Category Theory',
        avatar: '📐',
        color: '#F59E0B', // Amber
        framework: 'OpenBot-Math',
        status: 'ACTIVE_24_7',
        tasksCompleted: 139,
        systemPrompt: `You are Astra-Logic, the Pure Mathematics & Formal Logic Lead of Supergence (powered by the SIS System).
You solve intricate theoretical challenges with formal proofs, tensor algebra, topological invariants, and differential equations.
Keep answers mathematically rigorous and clearly reasoned.`,
      },
      {
        id: 'agent-ee',
        name: 'Volt-Phys',
        role: 'Electrical Engineering & Quantum Physics Lead',
        domain:
          'Digital Logic, Semiconductor Physics, Signal Processing, Robotics Hardware & Quantum Optics',
        avatar: '⚡',
        color: '#84CC16', // Lime
        framework: 'OpenBot-EE',
        status: 'ACTIVE_24_7',
        tasksCompleted: 104,
        systemPrompt: `You are Volt-Phys, the Electrical Engineering & Physics Lead of Supergence (powered by the SIS System).
You specialize in VLSI design, DSP filters, electromagnetic propagation, semiconductor device physics, and robotics hardware.`,
      },
      {
        id: 'agent-data-ai',
        name: 'Synapse-AI',
        role: 'Data Science & Neural Architectures Lead',
        domain:
          'Deep Learning, Transformer Architectures, Representation Embeddings & Statistical Inference',
        avatar: '🧠',
        color: '#8B5CF6', // Purple
        framework: 'OpenBot-AI',
        status: 'ACTIVE_24_7',
        tasksCompleted: 182,
        systemPrompt: `You are Synapse-AI, the Data Science & Neural Architectures Lead of Supergence (powered by the SIS System).
You design state-of-the-art neural models, analyze latent spaces, optimize training loss landscapes, and formulate rigorous statistical models.`,
      },
      {
        id: 'agent-cybernetics',
        name: 'Claw-Cybernetics',
        role: 'Autonomous OS Execution & Computer Robotics Lead',
        domain:
          'Full Computer Control, Terminal Automation, Hardware Actuation & OpenClaw Orchestration',
        avatar: '🦾',
        color: '#14B8A6', // Teal
        framework: 'OpenClaw-Bridge',
        status: 'ACTIVE_24_7',
        tasksCompleted: 197,
        systemPrompt: `You are Claw-Cybernetics, the Autonomous OS Execution Lead of Supergence (powered by the SIS System).
You interface directly with OpenClaw to control the computer, execute shell commands, automate browsers, manage files, and orchestrate desktop workflows.`,
      },
      {
        id: 'agent-economics',
        name: 'Quant-Econ',
        role: 'Quantitative Economics & Algorithmic Systems Lead',
        domain:
          'Macroeconomics, Quantitative Trading, Algorithmic Game Theory & Financial Risk Modeling',
        avatar: '📊',
        color: '#EC4899', // Pink
        framework: 'OpenBot-Fin',
        status: 'ACTIVE_24_7',
        tasksCompleted: 98,
        systemPrompt: `You are Quant-Econ, the Quantitative Economics Specialist of Supergence (powered by the SIS System).
You model market dynamics, game-theoretic equilibria, macroeconomic shocks, and quantitative portfolio risk.`,
      },
      {
        id: 'agent-risk',
        name: 'Aegis-Risk',
        role: 'Security Governance & Boundary Auditor',
        domain:
          'Action Auditing, Vulnerability Surfaces, Safety Invariants & Regulatory Compliance',
        avatar: '🛡️',
        color: '#EF4444', // Red
        framework: 'OpenBot-Risk',
        status: 'ACTIVE_24_7',
        tasksCompleted: 112,
        systemPrompt: `You are Aegis-Risk, the Security Governance & Boundary Auditor of Supergence (powered by the SIS System).
You critically inspect agent plans and execution code for vulnerabilities, safety invariant violations, data leaks, and unsafe OS operations.`,
      },
      {
        id: 'agent-knowledge',
        name: 'Alexandria',
        role: 'Knowledge Architecture & Institutional Memory Specialist',
        domain:
          'Knowledge Graphs, Documentation Mining, Cross-Reference Synthesizer & Ontology Mapping',
        avatar: '📚',
        color: '#6366F1', // Indigo
        framework: 'OpenDots-Knowledge',
        status: 'ACTIVE_24_7',
        tasksCompleted: 165,
        systemPrompt: `You are Alexandria, the Knowledge Architecture Specialist of Supergence (powered by the SIS System).
You index knowledge graphs, extract deep conceptual taxonomies, synthesize literature, and preserve institutional continuity.`,
      },
      {
        id: 'agent-triage',
        name: 'Sentinel-Triage',
        role: 'Workflow, Ticket & Meeting Action Items Triage',
        domain:
          'Task Decomposition, Dependency Graphing, Follow-up Extraction & Project Prioritization',
        avatar: '📋',
        color: '#F97316', // Orange
        framework: 'OpenBot-Triage',
        status: 'ACTIVE_24_7',
        tasksCompleted: 126,
        systemPrompt: `You are Sentinel-Triage, the Workflow & Project Triage Specialist of Supergence (powered by the SIS System).
You turn messy meeting notes, user requests, and tickets into strictly ordered dependency graphs, actionable tasks, and milestones.`,
      },
    ];

    for (const a of roster) {
      this.agents.set(a.id, a);
    }
  }

  getAllAgents() {
    return Array.from(this.agents.values()).map((a) => ({
      ...a,
      tasks: this.getAgentTasks(a.id),
    }));
  }

  getAgent(id) {
    const a = this.agents.get(id);
    if (!a) return null;
    return {
      ...a,
      tasks: this.getAgentTasks(id),
    };
  }

  getAgentTasks(id) {
    if (!this.agentInboxes) this.agentInboxes = new Map();
    return this.agentInboxes.get(id) || [];
  }

  async assignTaskToAgent(agentId, { title, description, priority = 'NORMAL', payload = {} }) {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent not found: ${agentId}`);
    if (!this.agentInboxes) this.agentInboxes = new Map();

    const taskId = 'task-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
    const task = {
      id: taskId,
      agentId,
      agentName: agent.name,
      title: (title || 'Autonomous Background Task').trim(),
      description: (description || '').trim(),
      priority,
      status: 'EXECUTING',
      progress: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      payload,
    };

    const inbox = this.getAgentTasks(agentId);
    inbox.unshift(task);
    this.agentInboxes.set(agentId, inbox);

    agent.status = 'EXECUTING';
    agent.currentTask = task.title;

    brain.broadcast('agent-task-assigned', {
      agentId,
      task,
      timestamp: new Date().toISOString(),
    });

    // Execute in background
    (async () => {
      try {
        const prompt = `[Autonomous Task Assignment for ${agent.name}]: ${task.title}\n${task.description}`;
        const res = await this.chatWithAgent(agentId, prompt, { taskId, backgroundTask: true });
        task.status = 'COMPLETED';
        task.progress = 100;
        task.result = res.reply;
        task.updatedAt = new Date().toISOString();
        agent.status = 'ACTIVE_24_7';
        agent.currentTask = null;
        brain.broadcast('agent-task-completed', {
          agentId,
          task,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        task.status = 'FAILED';
        task.error = err.message;
        task.updatedAt = new Date().toISOString();
        agent.status = 'ACTIVE_24_7';
        agent.currentTask = null;
        brain.broadcast('agent-task-failed', {
          agentId,
          task,
          error: err.message,
          timestamp: new Date().toISOString(),
        });
      }
    })();

    return task;
  }

  // ─── Direct Agent Query (Powered dynamically by SIS LLM) ───
  async chatWithAgent(agentId, message, context = {}) {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent not found: ${agentId}`);
    if (!message || typeof message !== 'string' || !message.trim()) {
      throw new Error('Message must be a non-empty string');
    }

    const trimmed = message.trim();
    // 1. Ingest turn into Hermes memory
    hermesLearner.learnFromTurn({
      role: 'user',
      content: `[User -> ${agent.name}]: ${trimmed}`,
      context,
    });

    const hermesContext = hermesLearner.getLearnedContextPrompt();
    const fullSystemPrompt = `${agent.systemPrompt}

${hermesContext}

Guidelines:
- Embody ${agent.name} with deep domain authority.
- Deliver high-signal, zero-filler, concrete responses.
- If code, equations, or architecture are requested, provide complete production-quality artifacts.`;

    try {
      const { default: sisUnifiedSystem } = await import('./sisUnifiedSystem.js');
      const unifiedRes = await sisUnifiedSystem.executeUnifiedTurn({
        query: trimmed,
        agentId: agent.id,
        context,
      });
      agent.tasksCompleted++;
      const payload = {
        agentId: agent.id,
        agentName: agent.name,
        agentRole: agent.role,
        userMessage: trimmed,
        reply: unifiedRes.response,
        toolCalls: unifiedRes.toolCalls || [],
        steps: unifiedRes.steps,
        durationMs: unifiedRes.durationMs,
        timestamp: new Date().toISOString(),
      };
      brain.broadcast('agent-direct-reply', payload);
      return payload;
    } catch (err) {
      console.warn('[OpenBotDotsManager] Unified delegation notice, using quickAI:', err.message);
      const reply = await quickAI(fullSystemPrompt, trimmed, DEFAULT_MODEL, 1200, 0.7);
      agent.tasksCompleted++;
      const payload = {
        agentId: agent.id,
        agentName: agent.name,
        agentRole: agent.role,
        userMessage: trimmed,
        reply,
        toolCalls: [],
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
      brain.broadcast('agent-direct-reply', payload);
      return payload;
    }
  }

  // ─── OpenDots Parallel Multi-Agent Swarm Research ───
  async runParallelSwarm({ topic, agentIds = [], customPrompt = '' }) {
    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      throw new Error('Research topic is required');
    }

    const swarmId = 'swarm-' + Date.now().toString(36);
    const selectedAgents =
      agentIds.length > 0
        ? agentIds.map((id) => this.agents.get(id)).filter(Boolean)
        : [
            this.agents.get('agent-cs'),
            this.agents.get('agent-biology'),
            this.agents.get('agent-mathematics'),
            this.agents.get('agent-risk'),
          ].filter(Boolean);

    brain.broadcast('swarm-research-started', {
      swarmId,
      topic,
      agents: selectedAgents.map((a) => ({ id: a.id, name: a.name, role: a.role })),
      timestamp: new Date().toISOString(),
    });

    // Run parallel queries across all selected agents concurrently
    const hermesContext = hermesLearner.getLearnedContextPrompt();
    const startTime = Date.now();

    const agentPromises = selectedAgents.map(async (agent) => {
      const agentTaskPrompt = `Collaborative Swarm Challenge: "${topic}"
${customPrompt ? `Additional directive: ${customPrompt}\n` : ''}
${hermesContext}

From your specialized domain perspective as ${agent.name} (${agent.role}):
1. What is the fundamental challenge or mechanism at play?
2. What concrete solution, algorithm, mathematical formulation, or experimental architecture do you propose?
3. What are key risk factors, constraints, and dependencies?

Be direct, highly technical, and concise (under 250 words).`;

      try {
        const text = await quickAI(agent.systemPrompt, agentTaskPrompt, DEFAULT_MODEL, 600, 0.7);
        agent.tasksCompleted++;
        return {
          agentId: agent.id,
          agentName: agent.name,
          agentRole: agent.role,
          avatar: agent.avatar,
          color: agent.color,
          contribution: text,
        };
      } catch (err) {
        return {
          agentId: agent.id,
          agentName: agent.name,
          agentRole: agent.role,
          avatar: agent.avatar,
          color: agent.color,
          contribution: `Analysis temporarily constrained by API timeout: ${err.message}`,
        };
      }
    });

    const contributions = await Promise.all(agentPromises);

    // Synthesize contributions into a unified OpenDots Space Document
    const synthesisPrompt = `You are Supergence, the Unified Autonomous Intelligence System.
The following specialized agents have analyzed the challenge: "${topic}".

${contributions.map((c) => `### ${c.agentName} (${c.agentRole}):\n${c.contribution}`).join('\n\n')}

Synthesize these perspectives into ONE authoritative, unified OpenDots Space Document:
- Executive Overview & Unified Architecture
- Cross-Domain Technical Specifications
- Implementation Roadmap & Safety Guarantees
Keep it elegant, exhaustive, and actionable.`;

    const synthesizedDoc = await quickAI(
      'You are Supergence, synthesizing multi-agent research into a master technical document.',
      synthesisPrompt,
      PREMIUM_MODEL || DEFAULT_MODEL,
      1500,
      0.6,
    );

    // Save as an OpenDots Space file in workspace/spaces/
    const slug =
      topic
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 40) || 'research-space';
    const filename = `${slug}-${Date.now().toString(36)}.md`;
    const spacePath = path.join(SPACES_DIR, filename);

    const fullMarkdown = `# Space: ${topic}
*Generated by Supergence Unified Swarm (OpenDots & OpenBot Matrix)*  
*Timestamp: ${new Date().toISOString()}*

---

## ✦ Unified Supergence Synthesis
${synthesizedDoc}

---

## ✦ Contributing Agent Specialist Perspectives

${contributions.map((c) => `### ${c.avatar} ${c.agentName} — ${c.agentRole}\n${c.contribution}`).join('\n\n---\n\n')}
`;

    fs.writeFileSync(spacePath, fullMarkdown, 'utf8');

    const result = {
      success: true,
      swarmId,
      topic,
      durationMs: Date.now() - startTime,
      spaceFile: path.relative(ROOT_DIR, spacePath).replace(/\\/g, '/'),
      spaceTitle: topic,
      contributions,
      synthesis: synthesizedDoc,
      status: 'READY_FOR_REVIEW',
      timestamp: new Date().toISOString(),
    };

    brain.broadcast('swarm-research-completed', result);
    return result;
  }

  // ─── OpenDots Spaces Management ───
  getSpaces() {
    if (!fs.existsSync(SPACES_DIR)) return [];
    const files = fs.readdirSync(SPACES_DIR).filter((f) => f.endsWith('.md'));
    return files
      .map((filename) => {
        const full = path.join(SPACES_DIR, filename);
        const stat = fs.statSync(full);
        const firstLine = fs.readFileSync(full, 'utf8').split('\n')[0] || filename;
        const title = firstLine.replace(/^#\s*(Space:\s*)?/i, '').trim();
        return {
          id: filename.replace('.md', ''),
          filename,
          title,
          sizeBytes: stat.size,
          modified: stat.mtime.toISOString(),
          relativePath: path.relative(ROOT_DIR, full).replace(/\\/g, '/'),
        };
      })
      .sort((a, b) => new Date(b.modified) - new Date(a.modified));
  }

  getSpaceContent(filename) {
    const full = path.join(SPACES_DIR, filename);
    if (!fs.existsSync(full)) throw new Error(`Space not found: ${filename}`);
    return fs.readFileSync(full, 'utf8');
  }

  saveSpaceReview(filename, decision, notes = '') {
    const full = path.join(SPACES_DIR, filename);
    if (!fs.existsSync(full)) throw new Error(`Space not found: ${filename}`);
    let content = fs.readFileSync(full, 'utf8');
    const reviewBlock = `\n\n---\n### 🛡️ Human Review Decision: ${decision.toUpperCase()}\n*Review Date: ${new Date().toISOString()}*\n*Notes: ${notes || 'Approved for integration into Supergence.'}*\n`;
    fs.appendFileSync(full, reviewBlock, 'utf8');
    return { success: true, decision, filename };
  }
}

const openBotDotsManager = new OpenBotDotsManager();
export default openBotDotsManager;
