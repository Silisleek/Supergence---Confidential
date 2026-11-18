import conversations from '../services/agentConversations.js';
import { runtimeAccess } from '../services/runtimeAccess.js';

export const agentMessageTools = {
  list_team_agents: {
    name: 'list_team_agents',
    description: 'List actual available Supergence teammates and their IDs, roles and status before delegating.',
    parameters: { type: 'object', properties: {}, required: [] },
    execute: async () => {
      const { default: team } = await import('../services/agentTeam.js');
      return { agents: team.getAllAgents().filter((agent) => agent.active !== false && agent.enabled !== false && !['INACTIVE', 'OFFLINE', 'DISABLED'].includes(String(agent.status || '').toUpperCase()))
        .map(({ id, name, role, domain, status }) => ({ id, name, role, domain, status })) };
    },
  },
  send_agent_message: {
    name: 'send_agent_message',
    description:
      'Send an actual message to another available Supergence agent and receive its real model reply. Persists the exchange in the project team chat visible to the user. The recipient can work with the same project and access controls. Use the live roster agent ID; sender identity comes from the active task context.',
    parameters: { targetAgentId: 'string', content: 'string', threadId: 'string' },
    required: ['targetAgentId', 'content'],
    execute: async ({ targetAgentId, content, threadId }) => {
      const context = runtimeAccess.currentContext() || {};
      if (context.teamWorker) throw new Error('A delegated agent cannot start another delegation while the team chat is busy. Report your findings to the sender.');
      if ((context.agentMessageDepth || 0) >= 2)
        throw new Error('Agent messaging depth limit reached.');
      context.agentMessageCount = (context.agentMessageCount || 0) + 1;
      if (context.agentMessageCount > 4)
        throw new Error('This turn reached its four agent-message limit.');
      const senderAgentId =
        !context.agentId || context.agentId === 'agent-supergence' ? 'supergence' : context.agentId;
      const projectId = context.teamProjectId || context.conversationId;
      const thread = await runtimeAccess.run({ agentMessageDepth: (context.agentMessageDepth || 0) + 1, teamProjectId: projectId }, () =>
        conversations.messageAgent({ targetAgentId, content, threadId, senderAgentId, projectId }),
      );
      return {
        success: thread.status !== 'error',
        threadId: thread.id,
        status: thread.status,
        error: thread.error,
        messages: thread.messages.slice(-2),
      };
    },
  },
  read_agent_conversation: {
    name: 'read_agent_conversation',
    description:
      'Read an existing persistent side conversation, or list conversation metadata when no threadId is supplied.',
    parameters: { threadId: 'string' },
    execute: ({ threadId }) =>
      threadId ? { thread: conversations.get(threadId) } : { threads: conversations.list() },
  },
};
