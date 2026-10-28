// SIS 1.0 — Yantra AI Gateway
// Wraps the OpenAI-compatible API for all AI parts

import OpenAI from 'openai';
import { evolutionSettings } from '../services/evolutionSettings.js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import os from 'os';

dotenv.config({ override: true });

// Auto-discover OpenCode credentials from environment or local OpenCode CLI auth
function getOpenCodeCredentials() {
  const apiKey = process.env.OPENCODE_API_KEY;
  const orgId = process.env.OPENCODE_ORG_ID || 'wrk_01KTZF7GK7YSFJG0NC27V2ZW0X';
  const baseURL = process.env.OPENCODE_BASE_URL || 'https://opencode.ai/inference/openai/v1';

  if (apiKey) {
    return { apiKey, orgId, baseURL };
  }

  try {
    const authPath = path.join(os.homedir(), '.local', 'share', 'opencode', 'auth.json');
    if (fs.existsSync(authPath)) {
      const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
      if (auth?.opencode?.key) {
        return { apiKey: auth.opencode.key, orgId, baseURL };
      }
    }
  } catch (e) {
    // ignore
  }

  return { apiKey: null, orgId, baseURL };
}

const opencodeCreds = getOpenCodeCredentials();

const DEFAULT_MODEL = normalizeRouterModel(process.env.DEFAULT_MODEL || 'opus-4.6');
const FALLBACK_MODEL = process.env.FALLBACK_MODEL || process.env.FALLBACK_MODELS || '';
const PREMIUM_MODEL = process.env.PREMIUM_MODEL || FALLBACK_MODEL || DEFAULT_MODEL;
const FREE_MODEL = process.env.FREE_MODEL || DEFAULT_MODEL;
const FALLBACK_MODELS = (FALLBACK_MODEL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const OPENCODE_SESSION_ID = uuidv4();

const rawBaseURL =
  process.env.BASE_URL || process.env.OPENROUTER_BASE_URL || 'http://127.0.0.1:20128/v1';
const cleanBaseURL = rawBaseURL.replace('//localhost:', '//127.0.0.1:');
const isLocal = cleanBaseURL.includes('localhost') || cleanBaseURL.includes('127.0.0.1');

function buildOpenCodeHeaders(orgId) {
  return {
    'x-opencode-client': 'cli',
    'x-opencode-session': OPENCODE_SESSION_ID,
    'x-opencode-project': uuidv4(),
    'x-opencode-request': uuidv4(),
    'x-opencode-org-id': orgId || opencodeCreds.orgId || 'wrk_01KTZF7GK7YSFJG0NC27V2ZW0X',
    'User-Agent': 'opencode/1.18.31',
  };
}

// Direct OpenCode enterprise inference client (uses user's OpenCode limits)
const openCodeClient = opencodeCreds.apiKey
  ? new OpenAI({
      maxRetries: 0,
      baseURL: opencodeCreds.baseURL,
      apiKey: opencodeCreds.apiKey,
      defaultHeaders: buildOpenCodeHeaders(opencodeCreds.orgId),
    })
  : null;

// Custom fetch for local router: reads chunked stream and strips trailing 'data: [DONE]'
// preventing socket-close hangs on text/event-stream and JSON parse syntax errors in OpenAI SDK.
const localRouterFetch = async (url, init) => {
  let requestMetadata = {};
  try {
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body;
    requestMetadata = {
      model: body?.model,
      stream: body?.stream,
      toolChoice: body?.tool_choice,
      thinking: body?.thinking?.type,
      toolCount: body?.tools?.length || 0,
    };
  } catch {
    /* Never log raw request content or credentials. */
  }
  console.log('[localRouterFetch] Calling:', url, JSON.stringify(requestMetadata));
  const t0 = Date.now();
  // Let native fetch calculate framing. Forwarding the older SDK's explicit
  // length through a newer global Undici dispatcher can reject valid bodies.
  const headers = new Headers(init?.headers);
  headers.delete('content-length');
  const res = await fetch(url, { ...init, headers });
  console.log(
    `[localRouterFetch] Response headers in ${Date.now() - t0}ms, status: ${res.status}, content-type: ${res.headers.get('content-type')}`,
  );
  let isStream = false;
  try {
    if (init && init.body) {
      const parsed = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
      isStream = parsed.stream === true;
    }
  } catch (_) {}

  if (!isStream) {
    let text = '';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let chunkCount = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log(
          `[localRouterFetch] Reader stream closed naturally after ${chunkCount} chunks, len: ${text.length}`,
        );
        break;
      }
      chunkCount++;
      const decoded = decoder.decode(value, { stream: true });
      text += decoded;

      // 1. If upstream returns standard JSON, break as soon as the full JSON object parses cleanly
      try {
        const trimmed = text.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          const parsed = JSON.parse(trimmed);
          if (parsed && (parsed.choices || parsed.error)) {
            console.log(
              `[localRouterFetch] Complete JSON parsed successfully at chunk ${chunkCount}, len: ${text.length} in ${Date.now() - t0}ms`,
            );
            try {
              reader.cancel();
            } catch (_) {}
            break;
          }
        }
      } catch (_) {}

      // 2. If upstream returned SSE despite stream:false, stop on [DONE]
      if (
        text.includes('[DONE]') ||
        text.includes('"finish_reason":"stop"') ||
        text.includes('"finish_reason":"length"')
      ) {
        console.log(
          `[localRouterFetch] Terminal token encountered at chunk ${chunkCount}, len: ${text.length} in ${Date.now() - t0}ms`,
        );
        try {
          reader.cancel();
        } catch (_) {}
        break;
      }
    }
    text = text.replace(/data:\s*\[DONE\][\s\S]*$/, '').trim();
    if (text.startsWith('data:')) {
      text = text.replace(/^data:\s*/, '').trim();
    }
    console.log(`[localRouterFetch] Returning Response with length: ${text.length}`);
    return new Response(text, {
      status: res.status,
      statusText: res.statusText,
      headers: {
        'content-type': 'application/json',
      },
    });
  }
  return res;
};

const localRouterClient = new OpenAI({
  maxRetries: 0,
  baseURL: cleanBaseURL,
  apiKey:
    process.env.API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    process.env.LOCAL_ROUTER_API_KEY ||
    'local',
  fetch: localRouterFetch,
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:3008',
  },
});

const client = localRouterClient || openCodeClient;

// Legacy model IDs identify the same Qwen model; routing stays on the configured endpoint.
export function normalizeRouterModel(model) {
  return model === 'qwen/qwen3.8-27b' ? 'qwen3.8-27b' : model;
}

export function assertProviderAvailable(baseURL) {
  const host = new URL(baseURL).hostname.toLowerCase();
  if (host === 'groq.com' || host.endsWith('.groq.com'))
    throw new Error('Groq has been removed. Select the configured router or another provider.');
}

// Dynamic LRU cache for BYOK (Bring Your Own Key) custom providers
const dynamicClients = new Map();
const automaticToolSelection = new WeakMap();
const nonThinkingToolSelection = new WeakMap();
const rejectsForcedTools = (error) =>
  (error.status === 400 || error.statusCode === 400 || /400/i.test(error.message || '')) &&
  (/tool[_ ]choice/i.test(error.message || '') || /invalid_params/i.test(error.message || '')) &&
  /thinking|not support|unsupported/i.test(error.message || '');

// Some thinking models behind a router accept native tools but reject forced
// selection or any explicit tool_choice parameter. Adapt without dropping task
// context, failing the turn, or changing models.
async function compatibleCompletion(provider, params, requestOptions) {
  const forced = params.tool_choice && !['auto', 'none'].includes(params.tool_choice);
  const withoutThinking = () => ({ ...params, thinking: { type: 'disabled' } });
  const compatible = () => {
    const selected = params.tool_choice?.function?.name;
    return {
      ...params,
      tool_choice: 'auto',
      ...(selected && Array.isArray(params.tools)
        ? { tools: params.tools.filter((tool) => tool.function?.name === selected) }
        : {}),
    };
  };
  if (forced && automaticToolSelection.get(provider)?.has(params.model))
    return provider.chat.completions.create(compatible(), requestOptions);
  const attemptParams =
    forced && nonThinkingToolSelection.get(provider)?.has(params.model)
      ? withoutThinking()
      : params;
  try {
    const response = await provider.chat.completions.create(attemptParams, requestOptions);
    if (forced && attemptParams.thinking?.type === 'disabled') {
      const selected = params.tool_choice?.function?.name;
      const calls = response.choices?.[0]?.message?.tool_calls || [];
      if (calls.some((call) => !selected || call.function?.name === selected)) {
        const models = nonThinkingToolSelection.get(provider) || new Set();
        models.add(params.model);
        nonThinkingToolSelection.set(provider, models);
      }
    }
    return response;
  } catch (error) {
    if (
      params.thinking &&
      error.status === 400 &&
      /thinking/i.test(error.message || '') &&
      /unknown|unrecognized|unexpected|unsupported parameter|not permitted/i.test(
        error.message || '',
      )
    ) {
      const { thinking: _thinking, ...standardParams } = params;
      return provider.chat.completions.create(standardParams, requestOptions);
    }
    if (forced && rejectsForcedTools(error)) {
      // A router alias may select another backend later. A previously accepted
      // capability is a hint, not permission to bypass compatibility recovery.
      nonThinkingToolSelection.get(provider)?.delete(params.model);
      if (attemptParams.thinking?.type !== 'disabled') {
        try {
          const response = await provider.chat.completions.create(
            withoutThinking(),
            requestOptions,
          );
          const models = nonThinkingToolSelection.get(provider) || new Set();
          models.add(params.model);
          nonThinkingToolSelection.set(provider, models);
          console.warn(
            `[AI Gateway] ${params.model} accepts enforced native actions with thinking disabled for that action phase.`,
          );
          return response;
        } catch (compatibilityError) {
          if (!rejectsForcedTools(compatibilityError)) throw compatibilityError;
        }
      }
      const models = automaticToolSelection.get(provider) || new Set();
      models.add(params.model);
      automaticToolSelection.set(provider, models);
      console.warn(
        `[AI Gateway] ${params.model} requires automatic native tool selection; retaining the selected model and complete task.`,
      );
      return provider.chat.completions.create(compatible(), requestOptions);
    }
    throw error;
  }
}

/**
 * Resolve client and effective model for BYOK custom providers or system defaults
 * @param {Object|null} byok - Optional BYOK config { baseURL, apiKey, model, orgId, enabled }
 * @param {string|null} requestedModel - Requested model ID
 * @returns {{ client: OpenAI, model: string, isCustom: boolean, baseURL: string }}
 */
export function resolveClientAndModel(byok = null, requestedModel = null) {
  if (!byok || byok.enabled === false) byok = evolutionSettings.provider() || byok;
  if (byok && byok.enabled !== false && byok.baseURL && byok.apiKey) {
    const cleanUrl = String(byok.baseURL).trim().replace(/\/+$/, '');
    assertProviderAvailable(cleanUrl);
    const cleanKey = String(byok.apiKey).trim();
    const orgId = byok.orgId ? String(byok.orgId).trim() : '';
    const cacheKey = `${cleanUrl}::${cleanKey}::${orgId}`;

    let clientInstance = dynamicClients.get(cacheKey);
    if (!clientInstance) {
      clientInstance = new OpenAI({
        maxRetries: 0,
        baseURL: cleanUrl,
        apiKey: cleanKey,
        defaultHeaders: orgId ? { 'OpenAI-Organization': orgId } : undefined,
      });
      // Cap cache size to avoid memory growth
      if (dynamicClients.size > 25) {
        const firstKey = dynamicClients.keys().next().value;
        dynamicClients.delete(firstKey);
      }
      dynamicClients.set(cacheKey, clientInstance);
    }
    const model = byok.model || requestedModel || 'gpt-4o';
    return { client: clientInstance, model, isCustom: true, baseURL: cleanUrl };
  }

  // Fallback to system default clients
  const model = normalizeRouterModel(requestedModel || DEFAULT_MODEL);
  return { client, model, isCustom: false, baseURL: cleanBaseURL };
}

console.log(
  `[AI Gateway] Model: ${DEFAULT_MODEL} | OpenCode: ${openCodeClient ? 'Configured (' + opencodeCreds.baseURL + ')' : 'None'} | Local Router: ${cleanBaseURL} | Fallbacks: ${FALLBACK_MODELS.join(', ') || 'none'}`,
);

// Rate limiting state
const rateLimiter = {
  requests: [],
  maxPerMinute: isLocal ? 1000 : 60,
  queue: [],
  processing: false,
};

function canMakeRequest() {
  const now = Date.now();
  rateLimiter.requests = rateLimiter.requests.filter((t) => now - t < 60000);
  return rateLimiter.requests.length < rateLimiter.maxPerMinute;
}

async function createCompletionWithRetry(params, signal) {
  const clientEntries = [{ name: 'configuredRouter', client: localRouterClient }];
  if (
    openCodeClient &&
    opencodeCreds.baseURL.replace(/\/+$/, '') !== cleanBaseURL.replace(/\/+$/, '') &&
    !opencodeCreds.baseURL.includes('opencode.ai/inference')
  )
    clientEntries.push({ name: 'openCodeInference', client: openCodeClient });

  // Preserve the selected model and explicit fallback IDs. The configured
  // provider decides which models it supports; there is no local allowlist.
  const modelCandidates = [
    params.model,
    ...FALLBACK_MODELS.filter((mod) => mod !== params.model),
  ].filter(Boolean);
  const uniqueModels = [...new Set(modelCandidates.map(normalizeRouterModel))];

  let lastError = null;
  const deadline = Date.now() + 180000; // 180s max deadline for full dynamic code compilation and fallback

  for (const entry of clientEntries) {
    if (!entry.client) continue;
    if (Date.now() > deadline) break;
    const triedOnClient = new Set();

    for (const candModel of uniqueModels) {
      signal?.throwIfAborted();
      if (Date.now() > deadline) {
        break;
      }
      const reqModel = candModel;
      if (triedOnClient.has(reqModel)) continue;
      triedOnClient.add(reqModel);

      const runParams = { ...params, model: reqModel };

      try {
        const clientTimeout = Math.max(1, deadline - Date.now());
        const res = await compatibleCompletion(entry.client, runParams, {
          timeout: clientTimeout,
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(clientTimeout)])
            : AbortSignal.timeout(clientTimeout),
        });
        if (res) return res;
      } catch (error) {
        signal?.throwIfAborted();
        lastError = error;
        const errMsg = String(error?.message || '').toLowerCase();
        const isTimeout =
          error.name === 'APIConnectionTimeoutError' ||
          errMsg.includes('timed out') ||
          errMsg.includes('timeout');
        const isTransient =
          error.status === 502 ||
          error.status === 503 ||
          errMsg.includes('502') ||
          errMsg.includes('503') ||
          isTimeout;

        if (entry.name === 'configuredRouter') {
          // If transient 502/503/timeout, wait for reset cooldown and retry reqModel once before moving to next candidate
          if (isTransient && Date.now() < deadline) {
            const resetMatch = errMsg.match(/reset after (\d+)s/i);
            const waitSeconds = resetMatch ? Math.min(parseInt(resetMatch[1], 10) + 1, 15) : 5;
            console.warn(
              `[AI Gateway] Local router transient notice on ${reqModel} (${error.status || error.message}). Retrying in ${waitSeconds}s...`,
            );
            await new Promise((r) =>
              setTimeout(r, Math.min(waitSeconds * 1000, Math.max(0, deadline - Date.now()))),
            );
            const retryTimeout = deadline - Date.now();
            if (retryTimeout <= 0) continue;
            try {
              const retryRes = await compatibleCompletion(entry.client, runParams, {
                timeout: retryTimeout,
                signal: signal
                  ? AbortSignal.any([signal, AbortSignal.timeout(retryTimeout)])
                  : AbortSignal.timeout(retryTimeout),
              });
              if (retryRes) return retryRes;
            } catch (rErr) {
              lastError = rErr;
            }
          }

          console.warn(
            `[AI Gateway] Local router notice on ${reqModel} (${lastError.status || lastError.name || lastError.message}). Advancing to next candidate model...`,
          );
          continue;
        }
        if (isModelUnavailable(error) || isStreamCutError(error)) {
          console.warn(
            `[AI Gateway] Model "${reqModel}" on ${entry.name} unavailable (${error.status || error.message}), falling back...`,
          );
          break;
        }
        console.warn(
          `[AI Gateway] Error on ${entry.name} (${error.status || error.message}), trying next candidate/provider...`,
        );
        break;
      }
    }
  }

  throw lastError || new Error('All configured AI gateways and fallback models exhausted');
}

/** Check if the error indicates the model itself is down, rate limited, quota exhausted, or client-blocked. */
function isModelUnavailable(error) {
  if (!error) return false;
  const status = error?.status || error?.statusCode;
  if (
    status === 400 ||
    status === 401 ||
    status === 402 ||
    status === 403 ||
    status === 404 ||
    status === 410 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  ) {
    return true;
  }
  const msg = String(error?.message || '').toLowerCase();
  const type = String(error?.error?.type || error?.type || '').toLowerCase();
  const code = String(error?.error?.code || error?.code || '').toLowerCase();
  return (
    msg.includes('deprecated') ||
    msg.includes('model is unavailable') ||
    msg.includes('internal server error') ||
    msg.includes('rate limit') ||
    msg.includes('usage limit') ||
    msg.includes('quota') ||
    msg.includes('free tier') ||
    msg.includes('insufficient') ||
    msg.includes('not found') ||
    msg.includes('unauthorized') ||
    msg.includes('disabled') ||
    msg.includes('no active credentials') ||
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('connection error') ||
    msg.includes('socket hang up') ||
    msg.includes('service temporarily overloaded') ||
    msg.includes('temporarily unavailable') ||
    code.includes('model_not_found') ||
    code.includes('rate_limit') ||
    type.includes('freeusagelimit') ||
    type.includes('freetiererror') ||
    type.includes('rate_limit_error')
  );
}

async function waitForSlot() {
  while (!canMakeRequest()) {
    await new Promise((r) => setTimeout(r, 100));
  }
  rateLimiter.requests.push(Date.now());
}

/**
 * Call the AI with a system prompt, messages, and optional tools
 * @param {Object} options
 * @param {string} options.model - Model ID (default: mimo-v2.5-free)
 * @param {string} options.systemPrompt - System prompt for the AI
 * @param {Array} options.messages - Chat messages [{role, content}]
 * @param {Array} [options.tools] - Tool definitions
 * @param {number} [options.temperature] - Temperature (0-2)
 * @param {number} [options.maxTokens] - Max tokens to generate
 * @param {boolean} [options.stream] - Whether to stream the response
 * @returns {Object|AsyncGenerator} Response or stream
 */
export async function callAI({
  model = DEFAULT_MODEL,
  systemPrompt = '',
  messages = [],
  tools = null,
  parallelToolCalls = undefined,
  toolChoice = 'auto',
  temperature = 0.2,
  maxTokens = 4096,
  stream = false,
  byok = null,
  thinking = undefined,
  signal = undefined,
}) {
  signal?.throwIfAborted();
  await waitForSlot();
  signal?.throwIfAborted();

  const resolved = resolveClientAndModel(byok, model);
  const targetModel = resolved.model === 'openrouter/auto' ? DEFAULT_MODEL : resolved.model;

  const fullMessages = [];
  if (systemPrompt) {
    fullMessages.push({ role: 'system', content: systemPrompt });
  }
  fullMessages.push(...messages);

  const params = {
    model: targetModel,
    messages: fullMessages,
    temperature,
    max_tokens: maxTokens,
    stream,
    ...(thinking ? { thinking } : {}),
  };

  if (tools && tools.length > 0) {
    params.tools = tools;
    params.tool_choice = toolChoice;
    if (parallelToolCalls !== undefined) params.parallel_tool_calls = parallelToolCalls;
  }

  try {
    if (resolved.isCustom) {
      console.log(
        `[AI Gateway] Executing BYOK completion via ${resolved.baseURL} | Model: ${targetModel} | Stream: ${stream}`,
      );
      const response = await compatibleCompletion(resolved.client, params, {
        timeout: 90000,
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(90000)])
          : AbortSignal.timeout(90000),
      });
      if (stream) return response;

      return response;
    }

    if (stream) {
      return await createCompletionWithRetry(params, signal);
    }
    let response;
    try {
      response = await createCompletionWithRetry(params, signal);
    } catch (e) {
      signal?.throwIfAborted();
      // Same gateway cut as SSE streams, but on a full-body read: one retry
      // recovers it instead of failing the whole part (coder/3D/verifier).
      if (!isStreamCutError(e)) throw e;
      console.warn('[AI Gateway] Non-stream response cut, retrying once...');
      await new Promise((r) => setTimeout(r, 200));
      await waitForSlot();
      response = await createCompletionWithRetry(params, signal);
    }
    // Provider reasoning fields remain private; they are not a final answer.
    if (response?.choices?.[0]?.message) {
      const msg = response.choices[0].message;
      if (
        msg.content &&
        /no longer available|is not available.*please switch to/i.test(msg.content) &&
        msg.content.length < 250
      ) {
        throw new Error(`Upstream model returned deprecation notice: ${msg.content}`);
      }
    }
    return response;
  } catch (error) {
    console.error(`[AI Gateway] API error:`, error.message);
    throw error;
  }
}

/**
 * The gateway's Cloudflare layer intermittently kills long-lived SSE streams
 * (surfaced as "Premature close" / ECONNRESET / aborted). A cut stream is NOT
 * a failed turn when we already hold tokens — callers can resume from them.
 */
function isStreamCutError(error) {
  const m = String(error?.message || '').toLowerCase();
  return (
    m.includes('premature close') ||
    m.includes('aborted') ||
    m.includes('econnreset') ||
    m.includes('socket hang up') ||
    m.includes('terminated') ||
    m.includes('network') ||
    error?.code === 'ECONNRESET' ||
    error?.name === 'AbortError'
  );
}

/**
 * Stream AI response token by token
 * @param {Object} options - Same as callAI
 * @param {Function} onToken - Callback for each token
 * @param {Function} onDone - Callback when complete
 * @returns {string} Full response text
 */
export async function streamAI(options, onToken, onDone) {
  options.signal?.throwIfAborted();
  // Establish the stream with one retry: a cut at 0 bytes usually recovers.
  let stream = null;
  let setupFailed = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      stream = await callAI({ ...options, stream: true });
      setupFailed = null;
      break;
    } catch (e) {
      options.signal?.throwIfAborted();
      setupFailed = e;
      if (!isStreamCutError(e)) throw e;
      console.warn(`[AI Gateway] Stream setup cut (attempt ${attempt + 1}), retrying...`);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  if (!stream) throw setupFailed;

  let fullText = '';
  let reasoningText = '';
  let toolCalls = [];
  let finishReason = null;
  let responseModel = null;
  let responseUsage = null;

  let inThinkTag = false;

  try {
    for await (const chunk of stream) {
      options.signal?.throwIfAborted();
      if (chunk.model) responseModel = chunk.model;
      if (chunk.usage) responseUsage = chunk.usage;
      const choice = chunk.choices?.[0];
      if (choice?.finish_reason) {
        finishReason = choice.finish_reason;
      }
      const delta = choice?.delta;
      if (delta?.reasoning || delta?.reasoning_content) {
        const rChunk = delta.reasoning || delta.reasoning_content;
        reasoningText += rChunk;
        if (options.onReasoning) options.onReasoning(rChunk);
      }

      if (delta?.content) {
        let content = delta.content;

        // Route <think> tags dynamically to reasoning stream
        while (content.length > 0) {
          if (!inThinkTag) {
            const thinkStart = content.indexOf('<think>');
            if (thinkStart !== -1) {
              if (thinkStart > 0) {
                const normalPart = content.slice(0, thinkStart);
                fullText += normalPart;
                if (onToken) onToken(normalPart);
              }
              inThinkTag = true;
              content = content.slice(thinkStart + 7);
            } else {
              fullText += content;
              if (onToken) onToken(content);
              content = '';
            }
          } else {
            const thinkEnd = content.indexOf('</think>');
            if (thinkEnd !== -1) {
              const thinkPart = content.slice(0, thinkEnd);
              reasoningText += thinkPart;
              if (options.onReasoning) options.onReasoning(thinkPart);
              inThinkTag = false;
              content = content.slice(thinkEnd + 8);
            } else {
              reasoningText += content;
              if (options.onReasoning) options.onReasoning(content);
              content = '';
            }
          }
        }
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (tc.index !== undefined) {
            if (!toolCalls[tc.index]) {
              toolCalls[tc.index] = {
                id: tc.id,
                type: 'function',
                function: { name: '', arguments: '' },
              };
            }
            if (tc.function?.name) toolCalls[tc.index].function.name += tc.function.name;
            if (tc.function?.arguments)
              toolCalls[tc.index].function.arguments += tc.function.arguments;
          }
        }
      }
    }
  } catch (e) {
    // Mid-stream cut with tokens in hand → partial turn, NOT an exception.
    // Caller decides: resume via "continue" or accept the partial.
    if (isStreamCutError(e) && (fullText.length > 0 || toolCalls.length > 0)) {
      console.warn(
        `[AI Gateway] Stream cut mid-response at ${fullText.length} chars — keeping partial for resume.`,
      );
      const partialTools = toolCalls.length > 0 ? toolCalls : null;
      if (onDone) onDone(fullText, partialTools);
      return {
        text: fullText,
        toolCalls: partialTools,
        finishReason: 'stream_cut',
        truncated: true,
      };
    }
    throw e;
  }

  if (
    /no longer available|is not available.*please switch to/i.test(fullText) &&
    fullText.length < 250
  ) {
    throw new Error(`Upstream model stream returned deprecation notice: ${fullText}`);
  }

  const isTruncated = finishReason === 'length';
  if (onDone) onDone(fullText, toolCalls.length > 0 ? toolCalls : null);
  return {
    text: fullText,
    reasoningText,
    model: responseModel,
    usage: responseUsage,
    toolCalls: toolCalls.length > 0 ? toolCalls : null,
    finishReason,
    truncated: isTruncated,
  };
}

/**
 * Get a quick non-streaming response
 * Supports both quickAI(systemPrompt, userMessage, model, maxTokens)
 * and quickAI({ systemPrompt, userMessage, messages, model, maxTokens, temperature })
 */
export async function quickAI(
  systemPromptOrOptions,
  userMessage,
  model = DEFAULT_MODEL,
  maxTokens = 4096,
  temperature = 0.2,
) {
  let sys = '';
  let msgs = [];
  let mdl = model;
  let maxTok = maxTokens;
  let temp = temperature;

  if (Array.isArray(systemPromptOrOptions)) {
    msgs = systemPromptOrOptions;
    if (typeof userMessage === 'object' && userMessage !== null) {
      mdl = userMessage.model || model;
      maxTok = userMessage.maxTokens || userMessage.max_tokens || maxTokens;
      temp = userMessage.temperature ?? temperature;
    }
  } else if (typeof systemPromptOrOptions === 'object' && systemPromptOrOptions !== null) {
    sys = systemPromptOrOptions.systemPrompt || '';
    mdl = systemPromptOrOptions.model || DEFAULT_MODEL;
    maxTok = systemPromptOrOptions.maxTokens || maxTokens;
    temp = systemPromptOrOptions.temperature ?? temperature;
    if (Array.isArray(systemPromptOrOptions.messages)) {
      msgs = systemPromptOrOptions.messages;
    } else if (systemPromptOrOptions.userMessage) {
      msgs = [{ role: 'user', content: systemPromptOrOptions.userMessage }];
    } else if (systemPromptOrOptions.prompt) {
      msgs = [{ role: 'user', content: systemPromptOrOptions.prompt }];
    }
  } else {
    if (userMessage) {
      sys = systemPromptOrOptions || '';
      msgs = [{ role: 'user', content: userMessage || '' }];
    } else {
      sys = '';
      msgs = [{ role: 'user', content: systemPromptOrOptions || '' }];
    }
  }

  if (mdl === 'openrouter/auto') mdl = DEFAULT_MODEL;

  // For localRouter, use direct non-streaming callAI with localRouterFetch which strips data: [DONE]
  // and finishes in 3-5 seconds without SSE buffering stalls.
  let rawText;
  if (isLocal) {
    try {
      const response = await callAI({
        model: mdl,
        systemPrompt: sys,
        messages: msgs,
        stream: false,
        maxTokens: maxTok,
        temperature: temp,
      });
      const msg = response.choices[0]?.message;
      rawText = msg?.content && msg.content.trim().length > 0 ? msg.content : '';
    } catch (localErr) {
      console.warn('[AI Gateway] Local non-stream call failed, trying streamAI:', localErr.message);
      const streamRes = await streamAI({
        model: mdl,
        systemPrompt: sys,
        messages: msgs,
        maxTokens: maxTok,
        temperature: temp,
      });
      rawText = streamRes?.text || '';
    }
  } else {
    try {
      const streamRes = await streamAI({
        model: mdl,
        systemPrompt: sys,
        messages: msgs,
        maxTokens: maxTok,
        temperature: temp,
      });
      rawText = streamRes?.text || '';
    } catch (streamErr) {
      const response = await callAI({
        model: mdl,
        systemPrompt: sys,
        messages: msgs,
        stream: false,
        maxTokens: maxTok,
        temperature: temp,
      });
      const msg = response.choices[0]?.message;
      rawText = msg?.content && msg.content.trim().length > 0 ? msg.content : '';
    }
  }

  const result = new String(rawText);
  result.text = rawText;
  result.content = rawText;
  return result;
}

export { DEFAULT_MODEL, PREMIUM_MODEL, FREE_MODEL, FALLBACK_MODEL };
export default {
  callAI,
  streamAI,
  quickAI,
  DEFAULT_MODEL,
  PREMIUM_MODEL,
  FREE_MODEL,
  FALLBACK_MODEL,
};
