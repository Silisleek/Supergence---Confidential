import conversations from '../services/agentConversations.js';
import { runtimeAccess } from '../services/runtimeAccess.js';

export const agentMessageTools = {
  send_agent_message: {
    name: 'send_agent_message',
    description:
      'Send an actual message to another available Supergence agent and receive its real model reply. Persists the exchange in a side conversation visible to the user. Use the live roster agent ID; sender identity comes from the active task context.',
    parameters: { targetAgentId: 'string', content: 'string', threadId: 'string' },
    required: ['targetAgentId', 'content'],
    execute: async ({ targetAgentId, content, threadId }) => {
      const context = runtimeAccess.currentContext() || {};
      if ((context.agentMessageDepth || 0) >= 2)
        throw new Error('Agent messaging depth limit reached.');
      context.agentMessageCount = (context.agentMessageCount || 0) + 1;
      if (context.agentMessageCount > 4)
        throw new Error('This turn reached its four agent-message limit.');
      const senderAgentId =
        !context.agentId || context.agentId === 'agent-supergence' ? 'supergence' : context.agentId;
      const thread = await conversations.messageAgent({
        targetAgentId,
        content,
        threadId,
        senderAgentId,
      });
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
