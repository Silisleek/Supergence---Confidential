import profiles, { MASCOTS } from '../services/agentProfiles.js';

export function registerAgentProfileRoutes(app, agentTeamManager) {
  app.get('/api/agent-profiles', (_req, res) => {
    try {
      res.json({
        success: true,
        agents: profiles.list(agentTeamManager.getAllAgents()),
        mascots: MASCOTS,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.patch('/api/agent-profiles/:id', (req, res) => {
    try {
      const agent = profiles.update(req.params.id, req.body, agentTeamManager.getAllAgents());
      res.json({ success: true, agent });
    } catch (error) {
      res
        .status(error.message.includes('not found') ? 404 : 400)
        .json({ success: false, error: error.message });
    }
  });
}
