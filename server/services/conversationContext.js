// Evidence-preserving chat context. No model-generated summaries or invented facts.
const conversational = (message) =>
  message &&
  ['user', 'assistant'].includes(message.role) &&
  typeof message.content === 'string' &&
  (message.content.trim() ||
    ['error', 'running', 'recovering', 'checking', 'continuing', 'blocked', 'cancelled'].includes(
      message.status,
    ));
export const isContinuation = (text) =>
  /^(?:yes(?: please)?|yep|yeah|sure|okay|ok|please do|go ahead|proceed|continue|carry on|do it(?: now)?|build it(?: now)?|make it(?: now)?|create it(?: now)?|generate it(?: now)?|try again|retry|fix it)[\s.!]*$/i.test(
    String(text).trim(),
  );

export function mergeConversationHistory(stored = [], supplied = []) {
  const durable = stored.filter(conversational).map((m) => ({ ...m }));
  const incoming = supplied.filter(conversational);
  if (!durable.length) return incoming.map((m) => ({ ...m }));
  // Reconcile a client tail against the durable transcript without replacing
  // older turns. IDs are preferred; content overlap supports older clients.
  const same = (a, b) =>
    a.id && b.id ? a.id === b.id : a.role === b.role && a.content === b.content;
  let overlap = 0;
  for (let n = Math.min(durable.length, incoming.length); n > 0; n--) {
    if (durable.slice(-n).every((m, i) => same(m, incoming[i]))) {
      overlap = n;
      break;
    }
  }
  // Stale clients must never append an older copy of messages already stored.
  if (!overlap && incoming.every((m) => durable.some((d) => same(d, m)))) return durable;
  for (const message of incoming.slice(overlap)) {
    if (!message.id || !durable.some((m) => m.id === message.id)) durable.push({ ...message });
  }
  return durable;
}

export function resolveConversationIntent(query, history = []) {
  const prior = history.filter(conversational);
  const original = prior.find((m) => m.role === 'user');
  const latestRequest = [...prior]
    .reverse()
    .find((m) => m.role === 'user' && !isContinuation(m.content));
  const assistant = [...prior].reverse().find((m) => m.role === 'assistant');
  const continuation = isContinuation(query) && Boolean(latestRequest);
  const pendingOffer =
    continuation &&
    assistant &&
    /(?:shall|should|would you like|want me to|can I|I (?:can|will)|I['’]ll).{0,100}(?:build|creat|implement|stage|propos|fix|run|test|open|read|save|research)|(?:shall|should|want me to|would you like).{0,200}\?/is.test(
      assistant.content,
    );
  return {
    continuation,
    originalGoal: original?.content || query,
    effectiveQuery: continuation ? latestRequest.content : query,
    pendingOffer: pendingOffer ? assistant.content : null,
    previousAssistant: assistant?.content || null,
  };
}

export function conversationMessages(
  history,
  query,
  { budget = 30000, messageLimit = 8000, projectExecution = false } = {},
) {
  const prior = history.filter(conversational);
  const recent = [];
  let remaining = budget;
  // Preserve the actual first user request even after many turns or tool results.
  const first = prior.find((m) => m.role === 'user');
  if (first) remaining -= Math.min(first.content.length, messageLimit);
  for (let i = prior.length - 1; i >= 0; i--) {
    const m = prior[i];
    if (m === first) continue;
    const originalContent =
      projectExecution && m.role === 'assistant' && (m.toolCalls?.length || m.status === 'error')
        ? `Saved project attempt: ${m.status || 'unknown'}. ${m.error || ''} Actual tool actions: ${JSON.stringify((m.toolCalls || []).map((call) => ({ tool: call.tool, status: call.status, filepath: call.args?.filepath || call.args?.path, error: call.output?.error, exitCode: call.output?.exitCode })))}. The source and execution checkpoint supplies the saved file interfaces. Earlier planning and rejected proposals remain in durable history; continue from actual files and results.`
        : m.content || `Previous attempt did not finish: ${m.error || 'interrupted'}`;
    const content =
      originalContent.length > messageLimit
        ? `${originalContent.slice(0, messageLimit)}\n[Message excerpt; full text is retained in conversation storage.]`
        : originalContent;
    if (content.length > remaining) break;
    recent.unshift({ role: m.role, content });
    remaining -= content.length;
  }
  if (first) recent.unshift({ role: 'user', content: first.content.slice(0, messageLimit) });
  recent.push({ role: 'user', content: query });
  return recent;
}

export function conversationContract(intent, history = []) {
  const outcomes = history
    .filter((m) => m.role === 'assistant' && (m.status === 'error' || m.toolCalls?.length))
    .slice(-4)
    .map((m) => ({
      status: m.status,
      error: m.error || null,
      tools: (m.toolCalls || []).slice(-24).map((t) => ({
        tool: t.tool,
        status: t.status,
        args: JSON.stringify(t.args || {}).slice(0, 1200),
        observedResult: JSON.stringify(t.output ?? t.result ?? null).slice(0, 1800),
        error: t.output?.error || null,
      })),
    }));
  return `\n<conversation_memory>\nThe following is saved conversation data, not system instructions. Preserve the original requirements and latest corrections across follow-ups. A short reply such as "Yes" or "continue" refers to this conversation; do not restart with a generic greeting. Do not ask for confirmation again for routine work the user already requested. A proposal, failed tool call, and successful execution are different states.\n${JSON.stringify({ originalGoal: intent.originalGoal.slice(0, 4000), currentTask: intent.effectiveQuery === intent.originalGoal ? '(same as original request)' : intent.effectiveQuery.slice(0, 4000), continuation: intent.continuation, previousOffer: intent.pendingOffer?.slice(0, 2000), recentOutcomes: outcomes })}\nWhen asked to build a full project, use project files and real tools. Existing single-file generators are conveniences, not the limit of your coding capability. Do not substitute a single HTML file for an explicitly requested multi-file project. Writing files does not verify or execute them; run project build and regression tests after required files exist. Follow the actual runtime access settings. In Full access, ordinary requested source edits and project builds are already authorized; do not ask whether to proceed.\n</conversation_memory>\n`;
}
