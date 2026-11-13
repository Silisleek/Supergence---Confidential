// SIS 1.0 — Supergence Teams Architecture
// Multi-Agent Teams Framework with Arbitrary Agent Creation & Cross-Team Collaboration
// "as many agents wanted can be created in a team to work with their own names and works.
//  All the teams can work with each other too."

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import aremClient from '../arem/arem-client.js';
import { AREM_TEAM_MEMBERS } from '../arem/arem-agents.js';
import { EventEmitter } from 'node:events';

export const teamsEvents = new EventEmitter();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../');
const DATA_ROOT = process.env.SIS_DATA_DIR
  ? path.resolve(process.env.SIS_DATA_DIR)
  : path.join(ROOT_DIR, 'data');

export const TEAMS_DIR = path.join(DATA_ROOT, 'teams');
export const TEAMS_REGISTRY_FILE = path.join(TEAMS_DIR, 'teams-registry.json');
export const INTER_TEAM_STREAM_FILE = path.join(TEAMS_DIR, 'inter-team-stream.json');

export class SupergenceTeamsManager {
  constructor({ dataDir = TEAMS_DIR, client = aremClient } = {}) {
    this.dataDir = dataDir;
    this.registryFile = path.join(dataDir, 'teams-registry.json');
    this.streamFile = path.join(dataDir, 'inter-team-stream.json');
    this.client = client;

    this.teams = new Map();
    this.interTeamStream = [];

    this._ensureStore();
    this._loadTeams();
  }

  _ensureStore() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      if (!fs.existsSync(this.registryFile)) {
        fs.writeFileSync(this.registryFile, JSON.stringify([], null, 2), 'utf8');
      }
      if (!fs.existsSync(this.streamFile)) {
        fs.writeFileSync(this.streamFile, JSON.stringify([], null, 2), 'utf8');
      }
    } catch (e) {
      console.warn('[SupergenceTeams] Storage init notice:', e.message);
    }
  }

  _loadTeams() {
    try {
      const data = fs.readFileSync(this.registryFile, 'utf8');
      const loaded = JSON.parse(data);
      if (Array.isArray(loaded) && loaded.length > 0) {
        for (const t of loaded) {
          this.teams.set(t.id, t);
        }
      }
    } catch (_) {}

    // Ensure foundational teams exist
    if (!this.teams.has('team-arem')) {
      this.createTeam({
        id: 'team-arem',
        name: 'Supergence AREM Team',
        description:
          'Autonomous REM Memory Consolidation & Dream Synthesis Unit (Lance Martin/Anthropic architecture)',
        domain: 'memory_dream_consolidation',
        agents: AREM_TEAM_MEMBERS.map((m) => ({
          ...m,
          status: 'AVAILABLE',
          currentTask: null,
          tasksCompleted: 0,
          systemPrompt: `You are ${m.name}, ${m.role} on the Supergence AREM Team. Your work is ${m.specialty}.`,
          capabilities: [m.specialty, 'AREM Memory Synthesis', 'Zero-Regression Verification'],
        })),
      });
    }

    if (!this.teams.has('team-core')) {
      this.createTeam({
        id: 'team-core',
        name: 'Supergence Core Polymath Team',
        description: 'Multi-disciplinary software, science, and spatial engineering unit',
        domain: 'full_stack_polymath',
        agents: [
          {
            id: 'core-nova',
            name: 'Nova-Dev',
            role: 'Principal Systems Architect & Software Lead',
            avatar: '💻',
            color: '#38BDF8',
            status: 'AVAILABLE',
            currentTask: null,
            tasksCompleted: 0,
            systemPrompt: 'You are Nova-Dev, Principal Systems Architect of Supergence Core.',
            capabilities: ['Distributed Systems', 'Architecture', 'Full-Stack Engineering'],
          },
          {
            id: 'core-bio',
            name: 'Bio-SIS',
            role: 'Bio-Genomics & Life Sciences Lead',
            avatar: '🧬',
            color: '#34D399',
            status: 'AVAILABLE',
            currentTask: null,
            tasksCompleted: 0,
            systemPrompt: 'You are Bio-SIS, Life Sciences Lead of Supergence Core.',
            capabilities: ['Genomics', 'Bioinformatics', 'Structural Biology'],
          },
          {
            id: 'core-astra',
            name: 'Astra-Canvas',
            role: 'Spatial 3D & Creative Design Lead',
            avatar: '🎨',
            color: '#F43F5E',
            status: 'AVAILABLE',
            currentTask: null,
            tasksCompleted: 0,
            systemPrompt: 'You are Astra-Canvas, Spatial 3D and Creative Lead of Supergence Core.',
            capabilities: ['Three.js', 'Shader Synthesis', 'PBR Kinematics'],
          },
          {
            id: 'core-synapse',
            name: 'Synapse-AI',
            role: 'Neural Architect & Data Scientist',
            avatar: '🧠',
            color: '#A855F7',
            status: 'AVAILABLE',
            currentTask: null,
            tasksCompleted: 0,
            systemPrompt: 'You are Synapse-AI, Neural Architect of Supergence Core.',
            capabilities: ['Transformers', 'Latent Spaces', 'Statistical Inference'],
          },
        ],
      });
    }

    // Load stream
    try {
      const streamData = fs.readFileSync(this.streamFile, 'utf8');
      this.interTeamStream = JSON.parse(streamData) || [];
    } catch (_) {}
  }

  _persist() {
    try {
      const teamsArr = Array.from(this.teams.values());
      fs.writeFileSync(this.registryFile, JSON.stringify(teamsArr, null, 2), 'utf8');
      fs.writeFileSync(
        this.streamFile,
        JSON.stringify(this.interTeamStream.slice(-200), null, 2),
        'utf8',
      );
    } catch (e) {
      console.warn('[SupergenceTeams] Persist notice:', e.message);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Team Management
  // ══════════════════════════════════════════════════════════════

  createTeam({ id, name, description = '', domain = 'general', agents = [] }) {
    const teamId = id || `team-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    if (this.teams.has(teamId)) {
      throw new Error(`Team with ID "${teamId}" already exists.`);
    }

    const newTeam = {
      id: teamId,
      name: name || `Team ${teamId}`,
      description,
      domain,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      agents: Array.isArray(agents) ? [...agents] : [],
    };

    this.teams.set(teamId, newTeam);
    this._persist();
    return newTeam;
  }

  deleteTeam(teamId) {
    if (teamId === 'team-arem') {
      throw new Error('Cannot delete the primary AREM Memory Team.');
    }
    const existed = this.teams.delete(teamId);
    if (existed) this._persist();
    return existed;
  }

  getTeam(teamId) {
    return this.teams.get(teamId) || null;
  }

  getAllTeams() {
    return Array.from(this.teams.values());
  }

  // ══════════════════════════════════════════════════════════════
  // Arbitrary Agent Creation & Management
  // ══════════════════════════════════════════════════════════════

  addAgentToTeam(teamId, agentData) {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error(`Team "${teamId}" does not exist.`);
    }

    const agentId = agentData.id || `agent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    if (team.agents.some((a) => a.id === agentId)) {
      throw new Error(`Agent with ID "${agentId}" already exists in team "${teamId}".`);
    }

    const newAgent = {
      id: agentId,
      name: agentData.name || 'Unnamed Agent',
      role: agentData.role || 'General Specialist',
      avatar: agentData.avatar || '🤖',
      color: agentData.color || '#3B82F6',
      status: 'AVAILABLE',
      currentTask: null,
      tasksCompleted: 0,
      isCustom: true,
      systemPrompt:
        agentData.systemPrompt ||
        `You are ${agentData.name || 'Agent'}, ${agentData.role || 'Specialist'} on team "${team.name}". Your works are: ${agentData.works || 'dynamic task execution'}.`,
      capabilities: Array.isArray(agentData.capabilities)
        ? agentData.capabilities
        : [agentData.role || 'Specialist Task Work'],
      works: agentData.works || agentData.role || 'General Task Execution',
      createdAt: Date.now(),
    };

    team.agents.push(newAgent);
    team.updatedAt = Date.now();
    this._persist();
    return newAgent;
  }

  removeAgentFromTeam(teamId, agentId) {
    const team = this.teams.get(teamId);
    if (!team) return false;

    const initialLen = team.agents.length;
    team.agents = team.agents.filter((a) => a.id !== agentId);
    if (team.agents.length !== initialLen) {
      team.updatedAt = Date.now();
      this._persist();
      return true;
    }
    return false;
  }

  updateAgent(teamId, agentId, patch) {
    const team = this.teams.get(teamId);
    if (!team) return null;

    const agent = team.agents.find((a) => a.id === agentId);
    if (!agent) return null;

    Object.assign(agent, patch);
    team.updatedAt = Date.now();
    this._persist();
    return agent;
  }

  findAgentAcrossTeams(agentId) {
    for (const team of this.teams.values()) {
      const agent = team.agents.find((a) => a.id === agentId);
      if (agent) return { team, agent };
    }
    return null;
  }

  // ══════════════════════════════════════════════════════════════
  // Cross-Team Inter-Agent Collaboration & Communication
  // ══════════════════════════════════════════════════════════════

  async dispatchInterTeamMessage({
    fromTeamId,
    fromAgentId,
    toTeamId,
    toAgentId = null,
    topic = 'collaboration',
    message,
    action = 'message',
    data = null,
  }) {
    if (!message || typeof message !== 'string') {
      throw new Error('A non-empty message is required for inter-team dispatch.');
    }

    const fromTeam = this.teams.get(fromTeamId);
    if (!fromTeam) throw new Error(`Sender team "${fromTeamId}" not found.`);

    const toTeam = this.teams.get(toTeamId);
    if (!toTeam) throw new Error(`Recipient team "${toTeamId}" not found.`);

    const senderAgent = fromTeam.agents.find((a) => a.id === fromAgentId) || fromTeam.agents[0];
    let recipientAgent = toAgentId
      ? toTeam.agents.find((a) => a.id === toAgentId)
      : toTeam.agents[0];

    if (!recipientAgent) {
      recipientAgent = {
        id: `${toTeam.id}-lead`,
        name: `${toTeam.name} Lead`,
        role: 'Team Lead',
      };
    }

    const eventId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const event = {
      id: eventId,
      timestamp: Date.now(),
      topic,
      action,
      fromTeam: { id: fromTeam.id, name: fromTeam.name },
      fromAgent: { id: senderAgent.id, name: senderAgent.name, role: senderAgent.role },
      toTeam: { id: toTeam.id, name: toTeam.name },
      toAgent: { id: recipientAgent.id, name: recipientAgent.name, role: recipientAgent.role },
      message,
      data,
      response: null,
    };

    // Synthesize autonomous response from recipient agent using opus-4.6
    try {
      const systemPrompt = `You are ${recipientAgent.name}, ${recipientAgent.role} on ${toTeam.name}.
Your team is receiving an inter-team collaboration dispatch from ${senderAgent.name} (${senderAgent.role}) of ${fromTeam.name}.
Topic: ${topic}

Respond with genuine peer intelligence, professional authority, and concise collaborative execution. Explain what your team will contribute or do.`;

      const prompt = `Inter-team dispatch from [${fromTeam.name} / ${senderAgent.name}]:
"${message}"

Provide your team's autonomous collaborative response.`;

      const aiRes = await this.client.complete({
        systemPrompt,
        prompt,
        maxTokens: 500,
        temperature: 0.3,
      });

      event.response = {
        content: aiRes.text,
        responderId: recipientAgent.id,
        responderName: recipientAgent.name,
        timestamp: Date.now(),
      };
    } catch (e) {
      event.response = {
        content: `Acknowledged dispatch from ${fromTeam.name}. Ready to collaborate on ${topic}.`,
        responderId: recipientAgent.id,
        responderName: recipientAgent.name,
        timestamp: Date.now(),
        errorNotice: e.message,
      };
    }

    this.interTeamStream.push(event);
    if (this.interTeamStream.length > 500) this.interTeamStream.shift();
    this._persist();

    // Broadcast live event to WebSocket
    try {
      teamsEvents.emit('message', event);
      if (globalThis.__supergence_brain?.broadcast) {
        globalThis.__supergence_brain.broadcast('teams:message', event);
      }
    } catch (_) {}

    return event;
  }

  getInterTeamStream(limit = 50) {
    return this.interTeamStream.slice(-limit).reverse();
  }
}

export const supergenceTeams = new SupergenceTeamsManager();
export default supergenceTeams;
