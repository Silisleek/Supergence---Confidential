import { responseWithToolCall, extractToolCall } from './assistantStream.js';

const fromCompletion = (raw) => {
  const choice = raw.choices?.[0];
  return {
    text: choice?.message?.content || '',
    toolCalls: choice?.message?.tool_calls || null,
    finishReason: choice?.finish_reason,
    truncated: choice?.finish_reason === 'length',
  };
};
const incomplete = (result) =>
  result?.truncated || ['length', 'stream_cut'].includes(result?.finishReason);

// Retries generate a proposal only; they never replay an executed tool.
export async function contextualInference(options, { stream, complete }, onToken) {
  const selectedName = options.toolChoice?.function?.name;
  if (selectedName && options.tools?.some((tool) => tool.function?.name === selectedName)) {
    options = {
      ...options,
      tools: options.tools.filter((tool) => tool.function?.name === selectedName),
      systemPrompt: `${options.systemPrompt || ''}\n<required_native_action>The next action must use the native ${selectedName} function. Only its schema is offered in this action phase. A proposal for a different tool is not accepted or executed. Generate complete arguments for this function from the task and observed file interfaces. Continue implementation rather than repeating discovery.</required_native_action>`,
    };
  }
  let result,
    failure,
    partial = '';
  const required = options.toolChoice && !['auto', 'none'].includes(options.toolChoice);
  const validAction = (response) => {
    const raw = extractToolCall(response);
    if (!raw) return false;
    const expected = options.toolChoice?.function?.name;
    const call = JSON.parse(raw);
    return !expected || (call.tool || call.name || call.function?.name) === expected;
  };
  const deferred = options.deferActionText || required;
  const forward = (token) => {
    partial += token;
    if (!deferred) onToken?.(token);
  };
  try {
    result = await stream(options, forward);
  } catch (error) {
    failure = error;
  }
  if (!result || (!result.text?.trim() && !result.toolCalls?.length && !incomplete(result))) {
    try {
      result = fromCompletion(await complete({ ...options, stream: false }));
      if (result.text && !deferred) onToken?.(result.text);
    } catch (error) {
      error.partialResponse = partial;
      throw error;
    }
  }
  let response = '',
    parseFailure;
  try {
    response = responseWithToolCall(result, partial);
  } catch (error) {
    parseFailure = error;
  }
  const needsAction = required && !validAction(response);
  if (incomplete(result) || parseFailure || needsAction) {
    if (!required && !options.tools?.length) {
      const error =
        parseFailure ||
        new Error(
          'The provider response was interrupted or reached its output limit. The unfinished response is saved; this turn is not complete.',
        );
      error.partialResponse = response || partial || result?.text || '';
      throw error;
    }
    const correction = `The previous proposal did not complete a usable tool action (missing, wrong tool, malformed, interrupted or output-limited). No action from that proposal was executed. Preserve the original task and observations. ${selectedName ? `Call the native ${selectedName} function now; a different function is invalid.` : 'Produce ONE complete registered tool call now.'} Use one brief sentence and no internal planning or code drafts in chat. For implementation, write a small complete module through the file tool; split large work across modules instead of spending the output budget planning. Ordinary requested work is already authorized; do not ask for routine confirmation or invent execution.`;
    const repaired = fromCompletion(
      await complete({
        ...options,
        toolChoice: required ? options.toolChoice : 'required',
        thinking: { type: 'disabled' },
        maxTokens: Math.min(options.maxTokens || 8192, 8192),
        systemPrompt: `${options.systemPrompt || ''}\n<tool_action_repair>${correction}</tool_action_repair>`,
        messages: [
          ...options.messages,
          ...(response || partial ? [{ role: 'assistant', content: response || partial }] : []),
        ],
        stream: false,
      }),
    );
    let repairedResponse = '';
    if (!incomplete(repaired)) {
      try {
        repairedResponse = responseWithToolCall(repaired, '');
      } catch {
        /* Invalid native argument packets are not executable actions. */
      }
    }
    if (!validAction(repairedResponse)) {
      const error = new Error(
        'The provider did not produce a valid tool action after retry. Your request and the unfinished response are saved; no action from these proposals was executed.',
      );
      error.partialResponse = [
        response || partial || result?.text,
        repairedResponse || repaired.text,
      ]
        .filter(Boolean)
        .join('\n\n');
      throw error;
    }
    response = repairedResponse;
  }
  if (!response.trim()) {
    const error =
      failure || new Error('The provider returned no usable response. Your request is saved.');
    error.partialResponse = partial;
    throw error;
  }
  // Tool executors emit actual action commentary. Keep project code and long
  // planning drafts out of chat while native tool arguments are generated.
  if (deferred && !extractToolCall(response)) onToken?.(response);
  return response;
}
