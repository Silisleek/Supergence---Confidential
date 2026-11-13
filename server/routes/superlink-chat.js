// SIS 1.0 — Superlink Direct Chat route (server side)
//
// Purpose: a narrow chat channel where the operator can talk ONLY to Superlink.
// Every request is pinned to the "superlink" agent id; no other specialist is
// reachable from this router (it fails closed on any other agentId).
//
// The model call goes through the app's real provider (callAI), so this uses
// whatever endpoint/model the app already has configured — no fake replies.

import express from 'express';
import { callAI } from '../api/provider.js';

export const SUPERLINK_AGENT_ID = 'superlink';
const ALLOWED_AGENTS = Object.freeze([SUPERLINK_AGENT_ID]);
const HISTORY_LIMIT = 24;

// Superlink's standing persona: Autonomous Process & OS Execution Lead.
const SUPERLINK_SYSTEM_PROMPT = [
  'You are Superlink, the Autonomous Process & OS Execution Lead of the Supergence specialist team.',
  'Your domain: low-level runtime, OS integration, process management, systems architecture,',
  'and codebase architecture in C, C++, assembly and systems-level code.',
  'Answer directly and technically. You are talking one-on-one with Akshan Sharma,',
  'Founder & Lead Architect of Silisleek and Supergence. Keep answers focused and concrete.',
  'You are the only specialist reachable on this channel.',
].join(' ');

// In-memory conversation history, keyed by conversationId.
const conversations = new Map();

function isAuthorized(req, authorize) {
  if (typeof authorize === 'function' && authorize(req)) return true;
  if (req.session && req.session.user) return true;
  if (req.session && req.session.sisKey) return true;
  if (req.sisAgentRuntime === true) return true;
  const origin = req.headers.origin || req.headers.referer || '';
  return /9router|localhost|127\.0\.0\.1/.test(origin);
}

// ── The single outbound seam ────────────────────────────────────────────────
// Calls the app's configured model provider with Superlink's system prompt.
async function sendToSuperlink(message, conversationId) {
  const history = conversations.get(conversationId) || [];
  const messages = [...history, { role: 'user', content: message }];

  const response = await callAI({
    systemPrompt: SUPERLINK_SYSTEM_PROMPT,
    messages,
    temperature: 0.3,
    maxTokens: 2048,
  });

  const reply =
    (typeof response === 'string' && response) ||
    (typeof response?.content === 'string' && response.content) ||
    (typeof response?.text === 'string' && response.text) ||
    (Array.isArray(response?.choices) && response.choices[0]?.message?.content) ||
    null;

  if (!reply) {
    return { reply: null, error: 'Superlink returned an empty response.', conversationId };
  }

  const next = [...messages, { role: 'assistant', content: reply }].slice(-HISTORY_LIMIT);
  conversations.set(conversationId, next);

  return { reply, conversationId, configured: true };
}

export function createSuperlinkChatRouter(options = {}) {
  const { authorize } = options;
  const router = express.Router();
  router.use(express.json({ limit: '64kb' }));

  // Status: confirms this channel is locked to Superlink.
  router.get('/superlink/status', (req, res) => {
    if (!isAuthorized(req, authorize)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json({
      ok: true,
      agent: SUPERLINK_AGENT_ID,
      agentLocked: true,
      allowedAgents: ALLOWED_AGENTS,
      configured: true,
    });
  });

  // Chat: always pinned to Superlink. Any other agentId is refused (fail closed).
  router.post('/superlink', async (req, res) => {
    if (!isAuthorized(req, authorize)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = req.body || {};
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const conversationId =
      typeof body.conversationId === 'string' && body.conversationId.trim()
        ? body.conversationId.trim()
        : `sl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    // Fail closed: the only accepted target is Superlink.
    if (body.agentId !== undefined && body.agentId !== SUPERLINK_AGENT_ID) {
      return res.status(400).json({
        error: `This channel is locked to Superlink. "${body.agentId}" is not reachable here.`,
        allowedAgents: ALLOWED_AGENTS,
      });
    }

    try {
      const result = await sendToSuperlink(message, conversationId);

      if (result.error) {
        return res.status(502).json({ error: result.error, configured: result.configured });
      }

      res.json({
        ok: true,
        agent: SUPERLINK_AGENT_ID,
        reply: result.reply,
        conversationId: result.conversationId,
        configured: true,
      });
    } catch (err) {
      res.status(502).json({ error: `Superlink call failed: ${err.message}` });
    }
  });

  return router;
}

// Register with the main app: registerSuperlinkChatRoutes(app)
export function registerSuperlinkChatRoutes(app, options) {
  const router = createSuperlinkChatRouter(options);
  app.use('/api/chat', router);
  return router;
}

export default createSuperlinkChatRouter;
