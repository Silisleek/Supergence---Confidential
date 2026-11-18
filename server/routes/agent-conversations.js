import conversations from '../services/agentConversations.js';

export function registerAgentConversationRoutes(app) {
  const route = (method, url, handler) =>
    app[method](url, async (req, res) => {
      try {
        res.json({ success: true, ...(await handler(req)) });
      } catch (error) {
        res
          .status(/already waiting/.test(error.message) ? 409 : 400)
          .json({ success: false, error: error.message });
      }
    });
  route('get', '/api/team-chat', (req) => ({ thread: conversations.team(String(req.query.conversationId || '')) }));
  route('post', '/api/team-chat/messages', async (req) => ({
    thread: await conversations.sendTeam(String(req.body?.conversationId || ''), { content: req.body?.content, targetAgentId: req.body?.targetAgentId }),
  }));
  route('get', '/api/agent-conversations', () => ({ threads: conversations.list() }));
  route('post', '/api/agent-conversations', async (req) => ({
    thread: await conversations.create({ agentIds: req.body?.agentIds, title: req.body?.title }),
  }));
  route('get', '/api/agent-conversations/:id', (req) => ({
    thread: conversations.get(req.params.id),
  }));
  route('delete', '/api/agent-conversations/:id', (req) => conversations.remove(req.params.id));
  // Sender identity is always user on the public UI route. Agent identity comes only from tools.
  route('post', '/api/agent-conversations/:id/messages', async (req) => ({
    thread: await conversations.send(req.params.id, {
      content: req.body?.content,
      targetAgentId: req.body?.targetAgentId,
      senderAgentId: 'user',
    }),
  }));
}
