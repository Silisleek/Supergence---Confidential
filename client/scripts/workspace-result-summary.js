(() => {
  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function resultLabel(call) {
    const result = call.output ?? call.result;
    if (['PENDING', 'RUNNING', 'UNCONFIRMED'].includes(call.status)) return 'Outcome not confirmed';
    if (
      call.status === 'FAILED' ||
      result?.error ||
      result?.success === false ||
      result?.passed === false ||
      result?.browserVerified === false ||
      (Number.isFinite(result?.exitCode) && result.exitCode !== 0)
    )
      return 'Reported an error';
    if (Number.isFinite(result?.exitCode)) return `Exit code ${result.exitCode}`;
    if (result?.passed === true) return 'Reported passing';
    if (['COMPLETED', 'RESOLVED', 'SUCCESS'].includes(call.status)) return 'Returned';
    return 'Outcome not confirmed';
  }

  function appendDetails(item, call) {
    const result = call.output ?? call.result;
    const entries = [];
    if (typeof call.args?.command === 'string') entries.push(['Command', call.args.command]);
    if (typeof call.args?.cwd === 'string' && call.args.cwd)
      entries.push(['Working directory', call.args.cwd]);
    if (typeof result === 'string') entries.push(['Recorded output', result]);
    else if (result && typeof result === 'object') {
      for (const [key, title] of [
        ['stdout', 'Standard output'],
        ['stderr', 'Standard error'],
        ['error', 'Error'],
        ['excerpt', 'Recorded excerpt'],
        ['tail', 'Recorded tail'],
      ]) {
        if (typeof result[key] === 'string' && result[key]) entries.push([title, result[key]]);
      }
      if (result.truncated) entries.push(['Note', 'The stored result was truncated.']);
    }
    if (!entries.length) return;
    const details = node('details', 'workspace-result-details');
    details.append(node('summary', '', 'View recorded details'));
    for (const [title, value] of entries) {
      details.append(node('h5', '', title));
      const shortened =
        value.length > 5000 ? `${value.slice(0, 5000)}\n[Display truncated]` : value;
      details.append(node('pre', '', shortened));
    }
    item.append(details);
  }

  function renderSource(source) {
    if (typeof source?.url !== 'string' || source.url.length > 2048) return null;
    let url;
    try {
      url = new URL(source.url);
    } catch {
      return null;
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;

    const item = node('li');
    const title = typeof source.title === 'string' ? source.title.trim().slice(0, 180) : '';
    const id = typeof source.id === 'string' ? source.id.trim().slice(0, 32) : '';
    const text = [id, title || url.hostname].filter(Boolean).join(' · ');
    if (source.fetchStatus === 'blocked-local-source') {
      item.append(node('span', 'workspace-result-source-title', text));
    } else {
      const link = node('a', 'workspace-result-source-title', text);
      link.href = url.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      item.append(link);
    }

    const excerpt = typeof source.excerpt === 'string' ? source.excerpt.trim() : '';
    const snippet = typeof source.snippet === 'string' ? source.snippet.trim() : '';
    const retrieved =
      Number.isInteger(source.fetchStatus) &&
      source.fetchStatus >= 200 &&
      source.fetchStatus < 300 &&
      !!excerpt;
    const status = retrieved ? 'Page retrieved' : snippet ? 'Search snippet only' : 'Unavailable';
    item.append(node('p', 'workspace-result-source-status', `${url.hostname} · ${status}`));
    const passage = retrieved ? excerpt : snippet;
    if (passage) item.append(node('p', '', passage.slice(0, 360)));
    return item;
  }

  function appendSources(summary, calls) {
    const results = calls
      .filter((call) => call.tool === 'deep_research')
      .map((call) => call.output ?? call.result)
      .filter((result) => Array.isArray(result?.sources) && result.sources.length);
    if (!results.length) return;

    const details = node('details', 'workspace-result-sources');
    let count = 0;
    for (const { topic, sources } of results.slice(-4)) {
      const items = sources.slice(0, 10).map(renderSource).filter(Boolean);
      if (!items.length) continue;
      if (results.length > 1 && typeof topic === 'string' && topic.trim()) {
        details.append(node('h4', '', topic.slice(0, 240)));
      }
      const list = node('ul');
      list.append(...items);
      details.append(list);
      count += items.length;
    }
    if (!count) return;
    details.prepend(node('summary', '', `Research sources (${count})`));
    if (results.length > 4) {
      details.append(
        node('p', 'workspace-result-note', 'Showing the four most recent research runs.'),
      );
    }
    summary.append(details);
  }

  function render(slot, data) {
    if (!slot) return;
    slot.querySelector('.workspace-result-summary')?.remove();
    const artifacts = Array.isArray(data.artifacts) ? data.artifacts : [];
    const calls = Array.isArray(data.toolCalls) ? data.toolCalls : [];
    const state = data.taskStatus || data.status || (data.success === false ? 'error' : undefined);
    const hasEvidence = artifacts.length || calls.length || data.completionAudit;
    if (!hasEvidence && !['blocked', 'error', 'cancelled'].includes(state)) return;
    const summary = node('section', 'workspace-result-summary');
    summary.setAttribute('aria-label', 'Task result summary');
    summary.append(node('h3', '', 'Task result'));
    const label =
      {
        completed: 'Finished',
        blocked: 'Needs attention',
        error: 'Stopped with an error',
        cancelled: 'Stopped',
      }[state] || 'Status unavailable';
    summary.append(node('p', 'workspace-result-state', label));
    if (!hasEvidence) {
      slot.prepend(summary);
      return;
    }
    summary.append(
      node(
        'p',
        '',
        artifacts.length
          ? `${artifacts.length} file or preview ${artifacts.length === 1 ? 'attached' : 'attachments'} below.`
          : 'No files or previews attached.',
      ),
    );
    appendSources(summary, calls);
    const checks = calls.filter((call) =>
      /^(run_command|verify_and_execute_code|verify_.*|test_.*|browser_.*(?:test|inspect|verify))$/i.test(
        String(call.tool || ''),
      ),
    );
    summary.append(node('h4', '', 'Recorded checks and commands'));
    if (!checks.length) {
      summary.append(node('p', '', 'No checks or commands recorded for this task.'));
    } else {
      const list = node('ul', 'workspace-result-checks');
      for (const call of checks.slice(-8)) {
        const item = node('li', '', `${String(call.tool)}: ${resultLabel(call)}`);
        appendDetails(item, call);
        list.append(item);
      }
      summary.append(list);
      if (checks.length > 8)
        summary.append(
          node(
            'p',
            'workspace-result-note',
            `Showing the last 8 of ${checks.length} recorded checks and commands.`,
          ),
        );
      summary.append(
        node(
          'p',
          'workspace-result-note',
          'A returned command or tool is not by itself proof that the result meets your requirements.',
        ),
      );
    }
    const remaining = data.completionAudit?.remaining;
    if (Array.isArray(remaining) && remaining.length) {
      summary.append(node('h4', '', 'Remaining work'));
      const list = node('ul', 'workspace-result-remaining');
      remaining.slice(0, 12).forEach((item) => list.append(node('li', '', String(item))));
      summary.append(list);
    }
    slot.prepend(summary);
  }
  window.SupergenceResultSummary = { render };
})();
