// SIS 1.0 — Conversation Persistence
// JSON file-based storage for chat history

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONVERSATIONS_DIR = process.env.SIS_DATA_DIR
  ? path.join(path.resolve(process.env.SIS_DATA_DIR), 'conversations')
  : path.join(__dirname, '../data/conversations');
let conversationsDir = DEFAULT_CONVERSATIONS_DIR;
function conversationFile(id) {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,180}$/.test(id))
    throw new Error('Invalid conversation ID.');
  return path.join(conversationsDir, `${id}.json`);
}
function writeConversation(conversation) {
  const filename = conversationFile(conversation.id);
  const temporary = `${filename}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(conversation, null, 2), { flag: 'wx' });
    fs.renameSync(temporary, filename);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
  conversationMetaCache.delete(`${conversation.id}.json`);
  invalidateConversationCache();
}

// Ensure directory exists
if (!fs.existsSync(conversationsDir)) {
  fs.mkdirSync(conversationsDir, { recursive: true });
}

/**
 * Dynamically switch conversation directory for isolated SIS systems
 */
export function setStorageDir(newDir) {
  conversationsDir = path.resolve(newDir);
  if (!fs.existsSync(conversationsDir)) {
    fs.mkdirSync(conversationsDir, { recursive: true });
  }
  conversationMetaCache.clear();
  invalidateConversationCache();
}

// In-memory summary cache keyed by filename to prevent heavy sync I/O stalls
const conversationMetaCache = new Map();
let cachedConversationsList = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 300000; // 5 minutes (invalidated on any write)

export function invalidateConversationCache() {
  cachedConversationsList = null;
  lastCacheTime = 0;
}

/**
 * List all conversations, sorted by updatedAt descending (most recent first).
 * Returns lightweight summaries without full message bodies.
 */
export function listConversations() {
  const now = Date.now();
  if (cachedConversationsList && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedConversationsList;
  }

  try {
    const files = fs.readdirSync(conversationsDir).filter((f) => f.endsWith('.json'));
    const conversations = [];

    for (const file of files) {
      try {
        const fullPath = path.join(conversationsDir, file);
        const stat = fs.statSync(fullPath);
        const cached = conversationMetaCache.get(file);
        if (cached && cached.mtimeMs === stat.mtimeMs) {
          conversations.push(cached.meta);
          continue;
        }

        const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        const msgs = data.messages || [];
        const rawTitle = typeof data.title === 'string' ? data.title : data.title?.title || '';
        const title = rawTitle.trim();

        // Filter out empty ghost sessions, automated background routines, and internal test traces from user sidebar
        if (
          msgs.length === 0 ||
          !title ||
          title.startsWith('Executing Routine') ||
          title === 'test' ||
          title.includes('Ambition Test') ||
          title.includes('noodles')
        ) {
          continue;
        }

        const meta = {
          id: data.id,
          title: title,
          messageCount: msgs.length,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          activeRequest: msgs.at(-1)?.autoResume
            ? { requestId: msgs.at(-1).requestId, autoResume: true }
            : null,
        };
        conversationMetaCache.set(file, { mtimeMs: stat.mtimeMs, meta });
        conversations.push(meta);
      } catch {
        // Skip corrupted files
      }
    }

    conversations.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    cachedConversationsList = conversations;
    lastCacheTime = now;
    return conversations;
  } catch {
    return [];
  }
}

/**
 * Get a full conversation by ID, including all messages.
 */
export function getConversation(id) {
  const filePath = conversationFile(id);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error('Conversation storage is unreadable. The existing record was preserved.', {
      cause: error,
    });
  }
}

/**
 * Create a new empty conversation. Returns the full conversation object.
 */
export function createConversation(title = '') {
  const id = randomUUID();
  const now = Date.now();
  const conversation = {
    id,
    title: title || '',
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
  writeConversation(conversation);
  invalidateConversationCache();
  return conversation;
}

/**
 * Update a conversation's messages. Auto-generates title from first user message
 * if no title is set yet.
 */
export function updateConversation(id, messages) {
  const filePath = conversationFile(id);
  let conversation;

  if (fs.existsSync(filePath)) {
    try {
      conversation = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
      throw new Error(
        'Cannot replace unreadable conversation storage. The original record was preserved.',
        { cause: error },
      );
    }
  } else {
    conversation = { id, title: '', messages: [], createdAt: Date.now() };
  }

  conversation.messages = messages;
  conversation.updatedAt = Date.now();

  // Auto-title from first user message if untitled
  if (!conversation.title) {
    const firstUser = messages.find((m) => m.role === 'user');
    if (firstUser) {
      conversation.title = firstUser.content.slice(0, 60).replace(/\n/g, ' ').trim();
      if (firstUser.content.length > 60) conversation.title += '…';
    }
  }

  writeConversation(conversation);
  invalidateConversationCache();
  return conversation;
}

/**
 * Rename a conversation.
 */
export function renameConversation(id, title) {
  const filePath = conversationFile(id);
  if (!fs.existsSync(filePath)) return null;

  try {
    const conversation = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    conversation.title = title;
    conversation.updatedAt = Date.now();
    writeConversation(conversation);
    invalidateConversationCache();
    return conversation;
  } catch {
    return null;
  }
}

/**
 * Delete a conversation.
 */
/**
 * Search across past conversations and chat transcripts by query text or keywords.
 * Returns relevant message turns with surrounding excerpts, titles, and timestamps.
 */
export function searchConversations(query = '', { limit = 8, conversationId = null } = {}) {
  try {
    let files = fs.readdirSync(conversationsDir).filter((f) => f.endsWith('.json'));
    // Prioritize most recent files to keep search latency under 5ms
    if (!conversationId && files.length > 25) {
      files = files.slice(-25);
    }
    const terms = (query || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
    const matches = [];

    for (const file of files) {
      const fileId = file.replace('.json', '');
      if (conversationId && fileId !== conversationId) continue;

      try {
        const filePath = path.join(conversationsDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const messages = Array.isArray(data.messages) ? data.messages : [];
        if (messages.length === 0) continue;

        const title = data.title || 'Untitled';
        const titleLower = title.toLowerCase();

        // If query is empty, return the latest turns of recent conversations
        if (terms.length === 0) {
          const lastMsg = messages[messages.length - 1];
          matches.push({
            conversationId: data.id,
            title,
            updatedAt: data.updatedAt || data.createdAt,
            role: lastMsg.role,
            content: lastMsg.content.slice(0, 300),
            snippet: lastMsg.content.slice(0, 200),
            matchScore: 1,
          });
          continue;
        }

        // Search messages
        messages.forEach((msg, idx) => {
          const content = String(msg.content || '');
          const contentLower = content.toLowerCase();

          let score = 0;
          if (contentLower.includes(query.toLowerCase())) {
            score += 10; // Exact phrase match
          }
          if (titleLower.includes(query.toLowerCase())) {
            score += 8; // Title exact match
          }

          terms.forEach((term) => {
            if (contentLower.includes(term)) score += 2;
            if (titleLower.includes(term)) score += 3;
          });

          if (score > 0) {
            // Generate clean snippet around first matching term
            let snippet = content;
            const matchIndex = contentLower.indexOf(terms[0]);
            if (matchIndex !== -1 && content.length > 240) {
              const start = Math.max(0, matchIndex - 60);
              const end = Math.min(content.length, matchIndex + 180);
              snippet =
                (start > 0 ? '…' : '') +
                content.slice(start, end).replace(/\n/g, ' ') +
                (end < content.length ? '…' : '');
            } else if (content.length > 240) {
              snippet = content.slice(0, 240).replace(/\n/g, ' ') + '…';
            }

            matches.push({
              conversationId: data.id,
              title,
              messageIndex: idx,
              updatedAt: data.updatedAt || data.createdAt,
              role: msg.role,
              content: content.slice(0, 500),
              snippet,
              matchScore: score,
            });
          }
        });
      } catch {
        // Skip unparseable files
      }
    }

    // Rank by score descending, then by updatedAt descending
    matches.sort((a, b) => b.matchScore - a.matchScore || (b.updatedAt || 0) - (a.updatedAt || 0));
    return matches.slice(0, limit);
  } catch (err) {
    console.warn('[Conversations Search Error]:', err.message);
    return [];
  }
}

/**
 * Append a single message turn to a conversation, updating title and timestamps.
 */
export function appendMessage(id, message) {
  conversationFile(id);
  let conv = getConversation(id);
  if (!conv) {
    conv = { id, title: '', messages: [], createdAt: Date.now(), updatedAt: Date.now() };
  }
  conv.messages = conv.messages || [];
  conv.messages.push(message);
  conv.updatedAt = Date.now();

  if (!conv.title && message.role === 'user' && message.content) {
    conv.title = message.content.slice(0, 60).replace(/\n/g, ' ').trim();
    if (message.content.length > 60) conv.title += '…';
  }

  writeConversation(conv);
  return conv;
}

/**
 * Delete a conversation.
 */
export function deleteConversation(id) {
  const filePath = conversationFile(id);
  if (!fs.existsSync(filePath)) return false;
  try {
    fs.unlinkSync(filePath);
    conversationMetaCache.delete(`${id}.json`);
    invalidateConversationCache();
    return true;
  } catch {
    return false;
  }
}

export default {
  list: listConversations,
  get: getConversation,
  create: createConversation,
  update: updateConversation,
  save: updateConversation,
  append: appendMessage,
  search: searchConversations,
  rename: renameConversation,
  delete: deleteConversation,
  setStorageDir,
};
