import { createHash, randomUUID } from 'node:crypto';
import { mergeConversationHistory } from './conversationContext.js';
import { compactTaskCall, resumableTaskError } from './taskCompletion.js';

export class ConversationTurns {
  constructor(store, { maxRecoveryAttempts = 3, maxBatches = 8, retryDelayMs = 700 } = {}) {
    this.store = store;
    this.active = new Map();
    this.maxRecoveryAttempts = maxRecoveryAttempts;
    this.maxBatches = maxBatches;
    this.retryDelayMs = retryDelayMs;
  }
  async run(params, emitter, execute) {
    const query = params.query || params.prompt || params.message || params.userPrompt;
    if (typeof query !== 'string' || !query.trim())
      throw new Error('Query must be a non-empty string.');
    const conversationId = params.conversationId || params.id || `conv-${randomUUID()}`;
    const requestId = params.requestId || randomUUID();
    if (!/^[a-zA-Z0-9_-]{1,180}$/.test(conversationId) || !/^[a-zA-Z0-9_-]{1,180}$/.test(requestId))
      throw new Error('Invalid conversation or request ID.');
    const fingerprint = createHash('sha256')
      .update(JSON.stringify([query.trim(), params.agentId || null]))
      .digest('hex');
    const key = `${conversationId}:${requestId}`;
    const previous = this.active.get(key);
    if (previous) {
      if (previous.fingerprint !== fingerprint)
        throw new Error('Request ID was already used for a different message.');
      previous.observers.add(emitter);
      try {
        return await previous.promise;
      } finally {
        previous.observers.delete(emitter);
      }
    }
    if ([...this.active.keys()].some((k) => k.startsWith(`${conversationId}:`)))
      throw new Error('This conversation is still working. Wait for its current turn to finish.');
    const entry = {
      fingerprint,
      controller: new AbortController(),
      observers: new Set([emitter]),
      snapshot: null,
    };
    this.active.set(key, entry);
    const dispatch = Object.fromEntries(
      ['onToolCall', 'onToolResult', 'onStreamToken', 'onInteractiveUI', 'onTaskStatus'].map(
        (name) => [
          name,
          (...args) => {
            for (const observer of entry.observers) {
              try {
                observer?.[name]?.(...args);
              } catch {
                /* A closed subscriber does not cancel server work. */
              }
            }
          },
        ],
      ),
    );
    entry.promise = this.execute(
      { ...params, conversationId, requestId },
      dispatch,
      execute,
      fingerprint,
      entry,
    );
    try {
      return await entry.promise;
    } finally {
      this.active.delete(key);
    }
  }
  status(conversationId, requestId) {
    const active = this.active.get(`${conversationId}:${requestId}`);
    const record =
      active?.snapshot ||
      this.store.get(conversationId)?.messages?.find((m) => m.id === `${requestId}:assistant`);
    if (!record) return { status: active ? 'running' : 'not-found', conversationId, requestId };
    const running =
      active && !['completed', 'blocked', 'cancelled', 'error'].includes(record.status);
    return {
      conversationId,
      requestId,
      status: running
        ? record.status
        : !active && record.autoResume
          ? 'interrupted'
          : record.status,
      response: record.content || '',
      error: record.error || null,
      message: record.taskMessage || '',
      recoveryAttempt: record.recoveryAttempt || 0,
      completionAudit: record.completionAudit || null,
      toolCalls: record.toolCalls || [],
      artifacts: record.artifacts || [],
      primaryAgent: record.agent || null,
    };
  }
  cancel(conversationId, requestId) {
    const entry = this.active.get(`${conversationId}:${requestId}`);
    if (!entry) return { stopped: false, ...this.status(conversationId, requestId) };
    const reason = new Error('Task stopped by the user. No further actions will be started.');
    reason.code = 'TASK_CANCELLED';
    entry.controller.abort(reason);
    return { stopped: true, status: 'stopping', conversationId, requestId };
  }
  async recoverPending(resume) {
    const resumed = [];
    for (const conversation of this.store.list()) {
      if (
        !conversation.activeRequest?.autoResume ||
        this.active.has(`${conversation.id}:${conversation.activeRequest.requestId}`)
      )
        continue;
      const saved = this.store.get(conversation.id);
      const assistant = saved?.messages.find(
        (m) => m.id === `${conversation.activeRequest.requestId}:assistant`,
      );
      const user = saved?.messages.find(
        (m) => m.id === `${conversation.activeRequest.requestId}:user`,
      );
      if (!assistant?.autoResume || !user) continue;
      const params = {
        ...assistant.taskParameters,
        query: user.content,
        conversationId: conversation.id,
        requestId: user.requestId,
      };
      resumed.push(conversation.id);
      // Serial startup reconciliation avoids competing writes or a provider stampede.
      try {
        await resume(params);
      } catch {
        /* Durable final error explains an exhausted or blocked recovery. */
      }
    }
    return resumed;
  }
  async execute(params, emitter, execute, fingerprint, entry) {
    const { conversationId, requestId } = params;
    const persist = params.persistConversation !== false;
    const stored = persist ? this.store.get(conversationId) : null;
    const existing = stored?.messages?.find((m) => m.id === `${requestId}:user`);
    const previous = stored?.messages?.find((m) => m.id === `${requestId}:assistant`);
    if (existing) {
      if (existing.fingerprint !== fingerprint)
        throw new Error('Request ID was already used for a different message.');
      if (previous && ['completed', 'blocked', 'cancelled'].includes(previous.status))
        return {
          success: previous.status === 'completed',
          response: previous.content,
          taskStatus: previous.status,
          conversationId,
          requestId,
          artifacts: previous.artifacts || [],
          toolCalls: previous.toolCalls || [],
          completionAudit: previous.completionAudit || null,
          primaryAgent: previous.agent || null,
          replayed: true,
        };
      if (!previous?.autoResume)
        throw new Error(
          previous?.error ||
            'The previous attempt was interrupted. Your request is saved. Retry explicitly with a new request ID.',
        );
    }
    const history = mergeConversationHistory(stored?.messages || [], params.history || []).filter(
      (m) => m.id !== `${requestId}:user` && m.id !== `${requestId}:assistant`,
    );
    const user = existing || {
      id: `${requestId}:user`,
      requestId,
      fingerprint,
      role: 'user',
      content: (params.query || params.prompt || params.message || params.userPrompt).trim(),
      timestamp: Date.now(),
    };
    if (persist && !existing) this.store.update(conversationId, [...history, user]);
    let partial = previous?.content || '',
      attempt = previous ? (previous.recoveryAttempt || 0) + 1 : 0;
    let transientRetries = previous?.transientRetries || 0,
      batches = previous?.batches || 0;
    const activity = new Map(
      (previous?.toolCalls || []).map((call) => [call.id || randomUUID(), call]),
    );
    const signal = entry.controller.signal;
    let checkpointAt = 0,
      persistenceError = null;
    const save = (status, extra = {}) => {
      const record = {
        id: `${requestId}:assistant`,
        requestId,
        role: 'assistant',
        content: partial,
        status,
        autoResume: ['running', 'recovering', 'checking', 'continuing'].includes(status),
        recoveryAttempt: attempt,
        transientRetries,
        batches,
        taskParameters: { mode: params.mode, agentId: params.agentId },
        toolCalls: [...activity.values()].map(compactTaskCall),
        timestamp: Date.now(),
        ...extra,
      };
      entry.snapshot = record;
      if (persist) {
        const messages = this.store.get(conversationId)?.messages || [...history, user];
        this.store.update(conversationId, [...messages.filter((m) => m.id !== record.id), record]);
      }
      checkpointAt = Date.now();
      return record;
    };
    const checkpoint = (status, extra) => {
      try {
        return save(status, extra);
      } catch (error) {
        persistenceError = error;
        entry.controller.abort(error);
        return null;
      }
    };
    const callbacks = {
      ...emitter,
      onStreamToken: (token, full) => {
        partial = full || partial + token;
        if (Date.now() - checkpointAt > 5000) checkpoint('running');
        emitter.onStreamToken?.(token, full);
      },
      onToolCall: (event) => {
        activity.set(event.id, { ...activity.get(event.id), ...event });
        checkpoint('running');
        emitter.onToolCall?.(event);
      },
      onToolResult: (event) => {
        activity.set(event.id, { ...activity.get(event.id), ...event });
        checkpoint('running');
        emitter.onToolResult?.(event);
      },
      onTaskStatus: (event) => {
        checkpoint(event.status, { taskMessage: event.message, remaining: event.remaining });
        emitter.onTaskStatus?.(event);
      },
    };
    checkpoint('running');
    let lastBudgetFingerprint = '';
    while (true) {
      try {
        signal.throwIfAborted();
        if (attempt > this.maxBatches + this.maxRecoveryAttempts)
          throw new Error(
            'Automatic recovery limit reached. The task remains unfinished and its checkpoint is saved.',
          );
        if (attempt)
          for (const [id, call] of activity) {
            if (call.status === 'RUNNING') activity.set(id, { ...call, status: 'UNCONFIRMED' });
          }
        const recoveryRecord = {
          ...entry.snapshot,
          toolCalls: [...activity.values()].map(compactTaskCall),
        };
        const resumeHistory = attempt
          ? [
              ...history,
              user,
              {
                ...recoveryRecord,
                status: 'error',
                error:
                  'Resume the original task from observed results. Confirmed actions already happened. Unresolved actions may also have happened: inspect actual state before repeating any side effect.',
              },
            ]
          : history;
        const result = await execute(
          {
            ...params,
            query: attempt ? 'continue' : user.content,
            history: resumeHistory,
            persistConversation: false,
            signal,
            recoveryAttempt: attempt,
            requireReconciliation:
              attempt > 0 && [...activity.values()].some((c) => c.status === 'UNCONFIRMED'),
          },
          callbacks,
        );
        signal.throwIfAborted();
        if (persistenceError) throw persistenceError;
        for (const call of result.toolCalls || []) activity.set(call.id || randomUUID(), call);
        partial = result.response || partial;
        if (result.completionAudit?.status === 'continue') {
          if (attempt >= this.maxBatches + this.maxRecoveryAttempts) {
            const limit = new Error(
              'Automatic continuation limit reached. The task is unfinished and its checkpoint is saved.',
            );
            limit.code = 'TASK_RECOVERY_LIMIT';
            throw limit;
          }
          attempt++;
          checkpoint('continuing', {
            taskMessage:
              'Double checking task completion: unfinished work remaining, continuing to complete...',
            remaining: result.completionAudit.remaining,
          });
          emitter.onTaskStatus?.({
            status: 'continuing',
            message:
              'Double checking task completion: unfinished work remaining, continuing to complete...',
            remaining: result.completionAudit.remaining,
            attempt,
          });
          await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs));
          continue;
        }
        const taskStatus = result.completionAudit?.status === 'blocked' ? 'blocked' : 'completed';
        save(taskStatus, {
          artifacts: result.artifacts || [],
          completionAudit: result.completionAudit || null,
          toolCalls: [...activity.values()],
          agent: result.primaryAgent || null,
          autoResume: false,
        });
        return {
          ...result,
          taskStatus,
          conversationId,
          requestId,
          toolCalls: [...activity.values()],
          recoveryAttempts: attempt,
          memory: { priorMessages: history.length, saved: persist },
        };
      } catch (error) {
        partial = error.partialResponse || partial;
        const cancelled = signal.aborted && signal.reason?.code === 'TASK_CANCELLED';
        const budget = error.code === 'TASK_BATCH_LIMIT';
        const progress = createHash('sha256')
          .update(
            JSON.stringify(
              [...activity.values()].slice(-12).map((c) => [c.tool, c.args, c.status, c.output]),
            ),
          )
          .digest('hex');
        const retry =
          !signal.aborted &&
          !persistenceError &&
          resumableTaskError(error) &&
          (budget
            ? batches < this.maxBatches && progress !== lastBudgetFingerprint
            : transientRetries < this.maxRecoveryAttempts);
        if (retry) {
          if (budget) {
            batches++;
            lastBudgetFingerprint = progress;
          } else transientRetries++;
          attempt++;
          checkpoint('recovering', {
            error: error.message,
            taskMessage: 'Checking saved progress and resuming unfinished work.',
          });
          emitter.onTaskStatus?.({
            status: 'recovering',
            message: 'Checking saved progress and resuming unfinished work.',
            attempt,
          });
          await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs));
          continue;
        }
        const failure = cancelled ? signal.reason : error;
        if (cancelled) partial = partial || failure.message;
        save(cancelled ? 'cancelled' : 'error', { error: failure.message, autoResume: false });
        failure.conversationId = conversationId;
        failure.requestId = requestId;
        failure.partialResponse = partial;
        throw failure;
      }
    }
  }
}
