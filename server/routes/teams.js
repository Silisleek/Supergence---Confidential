// SIS 1.0 — Supergence Teams REST Routes
// Exposes Multi-Agent Teams and Inter-Team Cross-Collaboration

import supergenceTeams from '../teams/supergence-teams.js';

export function registerSupergenceTeamsRoutes(app) {
  const route = (method, path, handler) =>
    app[method](path, async (req, res) => {
      try {
        const result = await handler(req, res);
        if (!res.headersSent) {
          res.json({ success: true, ...result });
        }
      } catch (error) {
        if (!res.headersSent) {
          res.status(400).json({ success: false, error: error.message });
        }
      }
    });

  // List all teams
  route('get', '/api/supergence/teams', async () => ({
    teams: supergenceTeams.getAllTeams(),
  }));

  // Create a new team
  route('post', '/api/supergence/teams', async (req) => {
    const created = supergenceTeams.createTeam(req.body || {});
    return { team: created };
  });

  // Get specific team details
  route('get', '/api/supergence/teams/:teamId', async (req) => {
    const team = supergenceTeams.getTeam(req.params.teamId);
    if (!team) throw new Error(`Team "${req.params.teamId}" not found.`);
    return { team };
  });

  // Delete a team
  route('delete', '/api/supergence/teams/:teamId', async (req) => {
    const deleted = supergenceTeams.deleteTeam(req.params.teamId);
    return { deleted };
  });

  // Add agent to team (unlimited agents with custom names & works)
  route('post', '/api/supergence/teams/:teamId/agents', async (req) => {
    const agent = supergenceTeams.addAgentToTeam(req.params.teamId, req.body || {});
    return { agent };
  });

  // Remove agent from team
  route('delete', '/api/supergence/teams/:teamId/agents/:agentId', async (req) => {
    const removed = supergenceTeams.removeAgentFromTeam(req.params.teamId, req.params.agentId);
    return { removed };
  });

  // Update agent in team
  route('put', '/api/supergence/teams/:teamId/agents/:agentId', async (req) => {
    const updated = supergenceTeams.updateAgent(
      req.params.teamId,
      req.params.agentId,
      req.body || {},
    );
    if (!updated) throw new Error('Agent not found.');
    return { agent: updated };
  });

  // Dispatch Inter-Team Message / Collaboration
  route('post', '/api/supergence/teams/message', async (req) => {
    const event = await supergenceTeams.dispatchInterTeamMessage(req.body || {});
    return { event };
  });

  // Inter-Team Communication Stream
  route('get', '/api/supergence/teams/messages', async (req) => {
    const limit = Number(req.query.limit || 50);
    return {
      messages: supergenceTeams.getInterTeamStream(limit),
    };
  });
}

export default registerSupergenceTeamsRoutes;
