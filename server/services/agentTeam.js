// SIS 1.0 — Specialized AI Agent Team Swarm
// Fully Dynamic Multi-Agent Swarm Combining:
// 1. Bio-SIS: Biology, Genomics & Life Sciences Lead (OpenDots Biology)
// 2. Nova-Dev: Coding, Systems & Robotics Lead (openclaw & OpenBot Code Engine)
// 3. Astra-Canvas: Art, Spatial 3D & Creative Design Lead (OpenDots & OpenBot 3D)
// 4. Ada-SI: Autonomous Missing Tool Forger with User Approval Gate
// 5. Hermes: Lifelong In-Chat / In-Task Cognitive Learner (v32.1 Memory)
// 6. Zero canned/hardcoded scripts — dynamic LLM synthesis & cross-agent collaboration

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import brain from '../orchestrator/brain.js';
import hermesLearner from './hermesLearner.js';
import adaToolForger from './adaToolForger.js';
import publicApisManager from './publicApis.js';
import { quickAI, DEFAULT_MODEL } from '../api/openrouter.js';
import agentProfiles from './agentProfiles.js';
import { runtimeAccess } from './runtimeAccess.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../');
const DATA_DIR = process.env.SIS_DATA_DIR
  ? path.resolve(process.env.SIS_DATA_DIR)
  : path.join(ROOT_DIR, 'data');
const AGENTS_STORE_FILE = path.join(DATA_DIR, 'agent-team-registry.json');
const TEAM_STREAM_FILE = path.join(DATA_DIR, 'agent-team-activity.json');

async function safeQuickAI(
  systemPrompt,
  prompt,
  model = DEFAULT_MODEL,
  maxTokens = 300,
  temp = 0.7,
  timeoutMs = 15000,
) {
  let timer;
  try {
    const response = await Promise.race([
      quickAI(systemPrompt, prompt, model, maxTokens, temp),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('AI gateway timed out')), timeoutMs);
      }),
    ]);
    return typeof response === 'string' ? response : response?.text || '';
  } finally {
    clearTimeout(timer);
  }
}

export class AgentTeamManager {
  constructor() {
    this.agents = new Map();
    this.teamStream = [];
    this.isRunning247 = true;
    this.collaborationTimer = null;
    this.isGeneratingDialogue = false;
    this.activeTopic = null;
    this.humanDirectives = [];

    this._ensureStore();
    this._initDefaultTeam();
    this._loadCustomAgents();
    this._restoreActivityState();
    this._startAutonomousCollaborationLoop();
  }

  _ensureStore() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (!fs.existsSync(AGENTS_STORE_FILE)) {
        fs.writeFileSync(AGENTS_STORE_FILE, JSON.stringify([], null, 2), 'utf8');
      }
      if (!fs.existsSync(TEAM_STREAM_FILE)) {
        fs.writeFileSync(TEAM_STREAM_FILE, JSON.stringify([], null, 2), 'utf8');
      }
    } catch (e) {
      console.warn('[AgentTeamManager] Storage notice:', e.message);
    }
  }

  _initDefaultTeam() {
    const defaultAgents = [
      {
        id: 'agent-biology',
        name: 'Biology & Genomics',
        role: 'Bio-Genomics & Life Sciences Lead',
        domain: 'Molecular Biology, Bioinformatics, Genetics & Structural Biology',
        avatar: '🧬',
        color: '#34D399', // Emerald
        status: 'AVAILABLE',
        currentTask: null,
        tasksCompleted: 0,
        isCustom: false,
        systemPrompt: `You are the Biology & Genomics Specialist of Supergence (powered by the SIS System). You are an expert in computational biology, genetics, protein folding, drug discovery, and life sciences. You have direct access to computer execution (OpenClaw), live internet research, and lifelong memory (Hermes).`,
        capabilities: [
          'Genomics & CRISPR',
          'Protein Structures',
          'Biomedical Literature',
          'Bioinformatics Pipelines',
        ],
      },
      {
        id: 'agent-mathematics',
        name: 'Mathematics & Logic',
        role: 'Pure Mathematics & Logic Lead',
        domain: 'Symbolic Computation, Topology, Real Analysis, Proof Verification & Algebra',
        avatar: '📐',
        color: '#FBBF24', // Solar Amber
        status: 'AVAILABLE',
        currentTask: null,
        tasksCompleted: 0,
        isCustom: false,
        systemPrompt: `You are the Mathematics & Logic Specialist of Supergence (powered by the SIS System). You solve complex mathematical problems with rigorous proofs, formal verification, differential equations, and abstract algebra. You have direct access to computer execution (OpenClaw), live internet research, and lifelong memory (Hermes).`,
        capabilities: [
          'Symbolic Proofs',
          'Differential Geometry',
          'Statistical Theory',
          'Linear Algebra & Tensors',
        ],
      },
      {
        id: 'agent-cs',
        name: 'Computer Science & Software',
        role: 'Systems Architecture & Engineering Lead',
        domain: 'Distributed Systems, Compilers, Algorithmic Complexity, Cloud & Full-Stack',
        avatar: '💻',
        color: '#38BDF8', // Sky Blue
        status: 'AVAILABLE',
        currentTask: null,
        tasksCompleted: 0,
        isCustom: false,
        systemPrompt: `You are the Computer Science & Software Engineering Specialist of Supergence (powered by the SIS System). You design world-class architectures, write flawless high-performance code, optimize distributed algorithms, and build complete software systems. You have direct access to computer execution (OpenClaw), live internet research, and lifelong memory (Hermes).`,
        capabilities: [
          'Distributed Systems',
          'Compiler Design',
          'Full-Stack Engineering',
          'Algorithm Optimization',
        ],
      },
      {
        id: 'agent-ee',
        name: 'Electrical Engineering & Physics',
        role: 'Circuits, Hardware & Quantum Physics Lead',
        domain:
          'Digital Logic, Semiconductor Physics, Signal Processing, Electromagnetism & Robotics',
        avatar: '⚡',
        color: '#C6CD85', // Pistachio
        status: 'AVAILABLE',
        currentTask: null,
        tasksCompleted: 0,
        isCustom: false,
        systemPrompt: `You are the Electrical Engineering & Physics Specialist of Supergence (powered by the SIS System). You specialize in circuit analysis, hardware synthesis, quantum physics, DSP, and electromechanical robotics. You have direct access to computer execution (OpenClaw), live internet research, and lifelong memory (Hermes).`,
        capabilities: [
          'Circuit Synthesis',
          'Signal Processing (DSP)',
          'Semiconductor Physics',
          'Robotics Hardware',
        ],
      },
      {
        id: 'agent-data-ai',
        name: 'Data Science & AI',
        role: 'Machine Learning & Neural Architecture Lead',
        domain: 'Deep Learning, Transformer Architectures, Statistical Modeling & Data Science',
        avatar: '🧠',
        color: '#9F7CEF', // Royal Lavender
        status: 'AVAILABLE',
        currentTask: null,
        tasksCompleted: 0,
        isCustom: false,
        systemPrompt: `You are the Data Science & AI Specialist of Supergence (powered by the SIS System). You develop cutting-edge machine learning models, statistical inference pipelines, transformer architectures, and data transformations. You have direct access to computer execution (OpenClaw), live internet research, and lifelong memory (Hermes).`,
        capabilities: [
          'Deep Learning Architectures',
          'Statistical Inference',
          'Predictive Modeling',
          'Feature Engineering',
        ],
      },
      {
        id: 'agent-cybernetics',
        name: 'Cybernetics & OS Automation',
        role: 'Autonomous Process & OS Execution Lead',
        domain: 'Full Computer Control, Terminal Automation, Hardware Actuation & Swarm Robotics',
        avatar: '🦾',
        color: '#2DD4BF', // Cyber Emerald
        status: 'AVAILABLE',
        currentTask: null,
        tasksCompleted: 0,
        isCustom: false,
        systemPrompt: `You are the Cybernetics & OS Automation Specialist of Supergence (powered by the SIS System). You can perform any action on the user's computer via OpenClaw, orchestrate local shells, manage files, and automate browser tasks. You have direct access to computer execution (OpenClaw), live internet research, and lifelong memory (Hermes).`,
        capabilities: [
          'Autonomous OS Control',
          'Terminal & Shell Execution',
          'Browser Automation',
          'File System Robotics',
        ],
      },
      {
        id: 'agent-economics',
        name: 'Economics & Quantitative Systems',
        role: 'Financial Modeling & Quantitative Systems Lead',
        domain: 'Macroeconomics, Quantitative Trading, Algorithmic Game Theory & Risk Modeling',
        avatar: '📊',
        color: '#F472B6', // Coral Rose
        status: 'AVAILABLE',
        currentTask: null,
        tasksCompleted: 0,
        isCustom: false,
        systemPrompt: `You are the Economics & Quantitative Systems Specialist of Supergence (powered by the SIS System). You analyze macroeconomic trends, quantitative financial systems, algorithmic market mechanisms, and game-theoretic optimizations. You have direct access to computer execution (OpenClaw), live internet research, and lifelong memory (Hermes).`,
        capabilities: [
          'Econometric Modeling',
          'Quantitative Analysis',
          'Game Theory',
          'Financial Risk Engines',
        ],
      },
      {
        id: 'agent-dialectics',
        name: 'Dialectical Synthesis & Cognition',
        role: 'Meta-Cognitive Reasoning & Epistemology Lead',
        domain: 'Multi-Perspective Synthesis, Anti-Pattern Auditing & Meta-Deliberation',
        avatar: '🔮',
        color: '#C084FC', // Amethyst Violet
        status: 'AVAILABLE',
        currentTask: null,
        tasksCompleted: 0,
        isCustom: false,
        systemPrompt: `You are the Dialectical Synthesis & Cognition Specialist of Supergence (powered by the SIS System). You subject all complex questions to thesis-antithesis-synthesis dialectics, verify premises, resolve cross-domain paradoxes, and audit outputs. You have direct access to computer execution (OpenClaw), live internet research, and lifelong memory (Hermes).`,
        capabilities: [
          'Dialectical Reasoning',
          'Epistemic Verification',
          'Cross-Domain Synthesis',
          'Anti-Pattern Auditing',
        ],
      },
    ];

    for (const a of defaultAgents) {
      this.agents.set(a.id, a);
    }
  }

  _loadCustomAgents() {
    try {
      if (fs.existsSync(AGENTS_STORE_FILE)) {
        const custom = JSON.parse(fs.readFileSync(AGENTS_STORE_FILE, 'utf8'));
        if (Array.isArray(custom)) {
          for (const a of custom) {
            this.agents.set(a.id, a);
          }
        }
      }
      if (fs.existsSync(TEAM_STREAM_FILE)) {
        const stream = JSON.parse(fs.readFileSync(TEAM_STREAM_FILE, 'utf8'));
        if (Array.isArray(stream)) {
          this.teamStream = stream.slice(-60);
        }
      }
    } catch (e) {
      console.warn('[AgentTeamManager] Notice loading custom agents:', e.message);
    }
  }

  _saveCustomAgents() {
    try {
      const custom = Array.from(this.agents.values()).filter((a) => a.isCustom);
      fs.writeFileSync(AGENTS_STORE_FILE, JSON.stringify(custom, null, 2), 'utf8');
      fs.writeFileSync(
        TEAM_STREAM_FILE,
        JSON.stringify(this.teamStream.slice(-60), null, 2),
        'utf8',
      );
    } catch (e) {
      console.error('[AgentTeamManager] Failed to persist custom agents:', e.message);
    }
  }

  _restoreActivityState() {
    // Retained events are the only authority for historical counters. Legacy
    // seeded totals and interrupted RUNNING states do not establish activity.
    for (const agent of this.agents.values()) {
      const events = this.teamStream.filter((event) => event.senderId === agent.id);
      agent.status = 'AVAILABLE';
      agent.currentTask = null;
      agent.activeRequests = 0;
      agent.tasksCompleted = events.filter((event) => event.type === 'TASK_COMPLETED').length;
      agent.repliesGenerated = events.filter((event) => event.type === 'AGENT_REPLY').length;
      agent.discussionsGenerated = events.filter((event) => event.type === 'SWARM_DIALOGUE').length;
      agent.activityCoverage = 'Retained activity events only';
      agent.lastActiveAt = events.at(-1)?.timestamp || null;
    }
  }

  _beginActivity(agent, task) {
    agent.activeRequests = (agent.activeRequests || 0) + 1;
    agent.status = 'RUNNING';
    agent.currentTask = task;
    agent.lastActiveAt = new Date().toISOString();
    agent.lastError = null;
  }

  _endActivity(agent, error = null) {
    agent.activeRequests = Math.max(0, (agent.activeRequests || 1) - 1);
    if (error) agent.lastError = error.message || String(error);
    if (agent.activeRequests === 0) {
      agent.status = 'AVAILABLE';
      agent.currentTask = null;
    }
    agent.lastActiveAt = new Date().toISOString();
  }

  createCustomAgent({ name, role, domain, avatar, color, systemPrompt, initialTask }) {
    const id = 'agent-custom-' + Date.now().toString(36);
    const newAgent = {
      id,
      name: name || 'Specialist Agent',
      role: role || 'Domain Specialist',
      domain: domain || 'Custom Domain Intelligence',
      avatar: avatar || '✦',
      color: color || '#F4F0E0',
      status: 'AVAILABLE',
      currentTask: null,
      tasksCompleted: 0,
      isCustom: true,
      systemPrompt:
        systemPrompt ||
        `You are ${name}, a specialized AI agent teammate working 24/7 alongside SIS and Supergence.`,
      capabilities: ['Domain Research', 'Task Automation', 'Cross-Agent Collaboration'],
    };

    this.agents.set(id, newAgent);
    this._saveCustomAgents();

    this.logTeamActivity({
      senderId: 'system',
      senderName: 'Supergence Nexus',
      type: 'AGENT_CREATED',
      message: `✨ New specialized teammate awakened: ${newAgent.name} (${newAgent.role}). Synchronized into autonomous swarm.`,
    });

    brain.broadcast('agent-team-updated', {
      agents: Array.from(this.agents.values()),
      newAgent,
    });

    return newAgent;
  }

  logTeamActivity({ senderId, senderName, targetId, targetName, type, message, data = null }) {
    const item = {
      id: 'act-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      senderId: senderId || 'system',
      senderName: senderName || 'Supergence',
      targetId: targetId || null,
      targetName: targetName || null,
      type: type || 'COLLABORATION',
      message,
      data,
    };

    this.teamStream.push(item);
    if (this.teamStream.length > 70) {
      this.teamStream.shift();
    }

    this._saveCustomAgents();

    // Broadcast live event to WebSocket clients
    brain.broadcast('team-activity-logged', item);
    return item;
  }

  // ─── Autonomous 24/7 Multi-Agent Living Discussion Loop ───
  _startAutonomousCollaborationLoop() {
    if (this.collaborationTimer) clearInterval(this.collaborationTimer);

    // Run dynamic collaboration turn every 3 minutes only when completely idle
    this.collaborationTimer = setInterval(async () => {
      if (process.env.ENABLE_BACKGROUND_LLM_LOOPS !== 'true') return;
      if (!this.isRunning247 || this.isGeneratingDialogue) return;
      if (
        brain &&
        (brain.isProcessing || (typeof brain.hasActiveChat === 'function' && brain.hasActiveChat()))
      )
        return;
      await this.runDynamicSwarmTurn();
    }, 180000);
  }

  async runDynamicSwarmTurn() {
    if (this.isGeneratingDialogue) return;
    if (
      brain &&
      (brain.isProcessing || (typeof brain.hasActiveChat === 'function' && brain.hasActiveChat()))
    )
      return;
    this.isGeneratingDialogue = true;
    let activeAgent = null;
    try {
      const allAgents = Array.from(this.agents.values());
      if (allAgents.length < 2) return;

      // Pick random sender and target agent
      const senderIdx = Math.floor(Math.random() * allAgents.length);
      const sender = allAgents[senderIdx];
      let targetIdx = Math.floor(Math.random() * allAgents.length);
      while (targetIdx === senderIdx && allAgents.length > 1) {
        targetIdx = Math.floor(Math.random() * allAgents.length);
      }
      const target = allAgents[targetIdx];
      activeAgent = sender;
      this._beginActivity(
        sender,
        `Discussing ${this.activeTopic || 'the current workspace'} with ${target.name}`,
      );

      // Recent context from team stream and human directives
      const recentChat = this.teamStream
        .slice(-4)
        .map((e) => `${e.senderName}: ${e.message}`)
        .join('\n');
      const humanContext = this.humanDirectives.slice(-3).join('; ');

      // Build system prompt for the sender
      const prompt = `You are ${sender.name} (${sender.role}), specialized in: ${sender.domain}.
You are in an active 24/7 working team with ${target.name} (${target.role}) and other autonomous agents inside the SIS Supergence system.
Current swarm focus: "${this.activeTopic || 'No user focus has been assigned'}".
${humanContext ? `Recent guidance from human user: "${humanContext}".` : ''}
Recent swarm discussion:
${recentChat || 'Beginning collaborative initiative.'}

Generate an authentic, concise, highly intelligent collaborative statement, question, code snippet, or scientific hypothesis directed to ${target.name}.
Keep it natural, direct (1 to 3 sentences), highly actionable, and avoid corporate fluff. If you need a new tool or computation, state it clearly.`;

      let statement = '';
      try {
        statement = await safeQuickAI(sender.systemPrompt, prompt, DEFAULT_MODEL, 200, 0.7);
      } catch (err) {
        sender.lastError = err.message;
        return;
      }

      if (!statement || statement.trim().length === 0) return;

      // Log the sender's message
      this.logTeamActivity({
        senderId: sender.id,
        senderName: sender.name,
        targetId: target.id,
        targetName: target.name,
        type: 'SWARM_DIALOGUE',
        message: statement.trim(),
      });

      sender.discussionsGenerated = (sender.discussionsGenerated || 0) + 1;

      // Check if statement mentions needing a tool -> trigger Ada-SI dynamically!
      const lower = statement.toLowerCase();
      if (
        lower.includes('need a tool') ||
        lower.includes('missing tool') ||
        lower.includes('create a tool') ||
        lower.includes('forge tool') ||
        lower.includes('new tool')
      ) {
        // Synthesize the capability the agent actually described. A tool is only
        // installed if it verifies against real execution.
        const requirement = `A tool for ${sender.name} in the ${sender.domain} domain that can: ${statement}`;
        try {
          const tool = await adaToolForger.synthesizeToolDynamically(requirement);
          this.logTeamActivity({
            senderId: 'ada-si',
            senderName: 'Ada-SI Tool Forger',
            type: 'TOOL_FORGED',
            message:
              tool.status === 'PENDING_APPROVAL'
                ? `🛠️ [Ada-SI] Forged "${tool.name}" — awaiting approval for ${tool.capabilities.join('/')} access.`
                : `🛠️ [Ada-SI] Forged and verified "${tool.name}" (${tool.capabilities.join('/')}).`,
          });
        } catch (err) {
          this.logTeamActivity({
            senderId: 'ada-si',
            senderName: 'Ada-SI Tool Forger',
            type: 'TOOL_REJECTED',
            message: `✗ [Ada-SI] No working tool could be synthesized: ${err.message}`,
          });
        }
      }

      // Check if statement mentions live data -> query public API
      if (lower.includes('nasa') || lower.includes('astronomy') || lower.includes('space')) {
        publicApisManager
          .queryApi('nasa-apod')
          .then((res) => {
            this.logTeamActivity({
              senderId: 'api-gateway',
              senderName: 'NASA Live Telemetry',
              type: 'API_DATA',
              message: `🌌 [Live NASA APOD]: "${res.data?.title}" — ${res.data?.date}`,
            });
          })
          .catch(() => {});
      } else if (
        lower.includes('weather') ||
        lower.includes('temperature') ||
        lower.includes('forecast')
      ) {
        publicApisManager
          .queryApi('open-meteo')
          .then((res) => {
            this.logTeamActivity({
              senderId: 'api-gateway',
              senderName: 'Open-Meteo Weather',
              type: 'API_DATA',
              message: `🌤️ [Live Global Weather]: Current Temp ${res.data?.current_weather?.temperature}°C, Wind ${res.data?.current_weather?.windspeed} km/h`,
            });
          })
          .catch(() => {});
      }

      // Hermes learns from every real exchange
      hermesLearner.learnFromTurn({
        role: 'swarm_exchange',
        content: `[${sender.name} -> ${target.name}]: ${statement.trim()}`,
        context: { topic: this.activeTopic },
      });
    } catch (e) {
      console.warn('[AgentTeamManager] Swarm loop turn notice:', e.message);
    } finally {
      if (activeAgent) this._endActivity(activeAgent);
      this.isGeneratingDialogue = false;
    }
  }

  // ─── Human User Interaction & Steering (Non-blocking) ───
  async routeMessage({ message, targetAgentId = null, userContext = {} }) {
    this.getAllAgents();
    if (typeof message !== 'string' || !message.trim()) {
      throw new Error('A non-empty message is required');
    }
    // 1. Store human directive for team context
    this.humanDirectives.push(message);
    if (this.humanDirectives.length > 8) this.humanDirectives.shift();

    // 2. Let Hermes learn from this turn
    hermesLearner.learnFromTurn({ role: 'user', content: message, context: userContext });

    // 3. Determine target agent
    let agent = this.agents.get(targetAgentId);
    if (!agent) {
      const lower = (message || '').toLowerCase();
      if (
        lower.includes('bio') ||
        lower.includes('dna') ||
        lower.includes('protein') ||
        lower.includes('cell') ||
        lower.includes('gene')
      ) {
        agent = this.agents.get('agent-biology');
      } else if (
        lower.includes('math') ||
        lower.includes('calculus') ||
        lower.includes('algebra') ||
        lower.includes('proof') ||
        lower.includes('theorem')
      ) {
        agent = this.agents.get('agent-mathematics');
      } else if (
        lower.includes('ee') ||
        lower.includes('circuit') ||
        lower.includes('physics') ||
        lower.includes('signal') ||
        lower.includes('hardware')
      ) {
        agent = this.agents.get('agent-ee');
      } else if (
        lower.includes('ai') ||
        lower.includes('data') ||
        lower.includes('neural') ||
        lower.includes('model')
      ) {
        agent = this.agents.get('agent-data-ai');
      } else if (
        lower.includes('os') ||
        lower.includes('terminal') ||
        lower.includes('computer') ||
        lower.includes('robot') ||
        lower.includes('automate')
      ) {
        agent = this.agents.get('agent-cybernetics');
      } else if (
        lower.includes('econ') ||
        lower.includes('finance') ||
        lower.includes('market') ||
        lower.includes('money')
      ) {
        agent = this.agents.get('agent-economics');
      } else if (
        lower.includes('reason') ||
        lower.includes('philosophy') ||
        lower.includes('synthesis')
      ) {
        agent = this.agents.get('agent-dialectics');
      } else {
        agent = this.agents.get('agent-cs') || Array.from(this.agents.values())[0];
      }
    }

    // 4. Log human directive
    const userItem = this.logTeamActivity({
      senderId: 'user',
      senderName: 'User',
      targetId: agent.id,
      targetName: agent.name,
      type: 'USER_DIRECTIVE',
      message,
    });

    // 5. Generate dynamic intelligent reply via LLM
    const hermesContext = hermesLearner.getLearnedContextPrompt();
    const prompt = `Human user directive: "${message}".
${hermesContext}
Recent swarm activity:
${this.teamStream
  .slice(-3)
  .map((e) => `${e.senderName}: ${e.message}`)
  .join('\n')}

Respond as ${agent.name} (${agent.role}). Acknowledge the user's steer, explain what you are doing in response, and describe how you and the other teammates will implement it. Keep it concise, intelligent, and authentic.`;

    this._beginActivity(agent, message);
    let replyContent;
    try {
      replyContent = await safeQuickAI(
        `${agent.systemPrompt}\nYour current display name is ${agent.name}.\n${runtimeAccess.describe()}\nThis team-channel reply is conversational; do not claim execution without actual tool results.`,
        prompt,
        DEFAULT_MODEL,
        300,
        0.7,
      );
      if (typeof replyContent !== 'string' || !replyContent.trim()) {
        throw new Error('AI gateway returned an empty reply');
      }
    } catch (e) {
      const activity = this.logTeamActivity({
        senderId: agent.id,
        senderName: agent.name,
        targetId: 'user',
        targetName: 'User',
        type: 'AGENT_ERROR',
        message: `Agent reply failed: ${e.message}`,
      });
      this._endActivity(agent, e);
      return { agent, replyText: null, error: e.message, activity };
    }

    const replyItem = this.logTeamActivity({
      senderId: agent.id,
      senderName: agent.name,
      targetId: 'user',
      targetName: 'User',
      type: 'AGENT_REPLY',
      message: replyContent,
    });

    agent.repliesGenerated = (agent.repliesGenerated || 0) + 1;
    this._endActivity(agent);

    return {
      agent,
      replyText: replyContent,
      activity: replyItem,
    };
  }

  getAllAgents() {
    for (const agent of this.agents.values()) Object.assign(agent, agentProfiles.decorate(agent));
    return Array.from(this.agents.values());
  }

  getTeamStream() {
    return this.teamStream;
  }
}

const agentTeamManager = new AgentTeamManager();
export default agentTeamManager;
