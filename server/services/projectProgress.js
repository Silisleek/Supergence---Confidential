const changesSource =
  /^(?:write_file|create_file|edit_file|write_local_file|generate_browser_project|generate_browser_app|repair_browser_app)$/;
const discovery =
  /^(?:get_creation_workspace|read_file|list_files|list_local_directory|read_local_file|run_command)$/;
const isAcceptanceCommand = (command = '') => {
  if (/\bnpm(?:\.cmd)?\s+(?:run\s+)?(?:test|verify|review|acceptance)\b/i.test(command))
    return true;
  return [...command.matchAll(/\bnode(?:\.exe)?\s+("[^"]+"|'[^']+'|[^\s&|]+)/gi)].some((match) => {
    const filename = match[1]
      .replace(/^["']|["']$/g, '')
      .split(/[\\/]/)
      .at(-1);
    return /^(?:test|verify|review|acceptance)(?=[-_.]|$).*\.[cm]?js$/i.test(filename);
  });
};

export function isProjectBuild(query) {
  const text = String(query || '');
  if (/\b(?:explain|plan|prompt|review) only\b/i.test(text)) return false;
  // A constraint on one surface must not cancel a separate implementation task.
  const actionText = text.replace(
    /\b(?:do not|don['’]t|never)\s+(?:build|create|write|edit|fix|repair|modify|implement|develop)\b[^,;.!\n]*(?:[,;.!\n]|$)/gi,
    ' ',
  );
  return (
    /\b(?:build|create|implement|develop|make|fix|repair|optimi[sz]e|improve|refine|finish|complete)\b/i.test(
      actionText,
    ) && /\b(?:city|game|website|application|app|project|simulation|scene)\b/i.test(actionText)
  );
}

export function projectProgress(query, calls = [], available = new Set()) {
  if (!isProjectBuild(query)) return { toolChoice: 'auto', instruction: '' };
  const succeeded = calls.filter(
    (c) =>
      c.status === 'RESOLVED' &&
      !c.output?.error &&
      c.output?.success !== false &&
      (!Number.isFinite(c.output?.exitCode) || c.output.exitCode === 0),
  );
  const changed = succeeded.filter((c) => changesSource.test(c.tool));
  const diagnostic = (c) =>
    /(?:^|[\\/])tools[\\/](?:probe[^\\/]*|inspect[^\\/]*|list[^\\/]*|fix-verify[^\\/]*)$/i.test(
      c.args?.filepath || c.args?.path || '',
    );
  const lastProductChange = succeeded.findLastIndex(
    (c) => changesSource.test(c.tool) && !diagnostic(c),
  );
  const repairObservations =
    lastProductChange < 0
      ? []
      : succeeded.slice(lastProductChange + 1).filter((c) => discovery.test(c.tool));
  const repairInspections = repairObservations.length;
  const repeatedReads = new Map();
  for (const call of repairObservations) {
    if (call.tool === 'run_command') continue;
    const key = JSON.stringify([
      call.tool,
      call.args?.filepath || call.args?.path,
      call.args?.start_line,
      call.args?.end_line,
    ]);
    repeatedReads.set(key, (repeatedReads.get(key) || 0) + 1);
  }
  const inspectionLoop = [...repeatedReads.values()].some((count) => count >= 3);
  const acceptance = [...calls]
    .reverse()
    .find(
      (c) =>
        ['RESOLVED', 'FAILED'].includes(c.status) &&
        ((c.tool === 'run_command' && isAcceptanceCommand(c.args?.command)) ||
          /^verify_/.test(c.tool)),
    );
  const acceptanceFailed =
    acceptance &&
    (acceptance.status === 'FAILED' ||
      acceptance.output?.error ||
      acceptance.output?.success === false ||
      acceptance.output?.passed === false ||
      (Number.isFinite(acceptance.output?.exitCode) && acceptance.output.exitCode !== 0));
  const built = succeeded.some(
    (c) =>
      c.tool === 'run_command' &&
      /\b(?:npm\s+(?:run\s+)?(?:build|test|export)|node\s+\S*(?:build|test|export)\.[cm]?js)\b/i.test(
        c.args?.command || '',
      ),
  );
  const setup = succeeded.filter((c) => discovery.test(c.tool));
  const lastChange = succeeded.findLastIndex((c) => changesSource.test(c.tool));
  const inspectionsSinceChange =
    lastChange < 0
      ? 0
      : succeeded.slice(lastChange + 1).filter((c) => discovery.test(c.tool)).length;
  const project = [...succeeded].reverse().find((c) => c.tool === 'create_workspace_project')
    ?.output?.directory;
  const stalled = changed.length > 0 && inspectionsSinceChange >= 4;
  const mustWrite =
    !built &&
    available.has('write_file') &&
    ((changed.length === 0 && setup.length >= 3) || stalled);
  const repairTool = available.has('repair_browser_app')
    ? 'repair_browser_app'
    : available.has('edit_file')
      ? 'edit_file'
      : available.has('write_file')
        ? 'write_file'
        : null;
  const mustRepair =
    built && acceptanceFailed && repairInspections >= 8 && inspectionLoop && repairTool;
  return {
    toolChoice: mustRepair
      ? { type: 'function', function: { name: repairTool } }
      : mustWrite
        ? { type: 'function', function: { name: 'write_file' } }
        : 'auto',
    instruction: mustRepair
      ? `The latest actual acceptance check failed after compilation. There have been ${repairInspections} successful inspection actions since the last implementation change, including repeated reads of unchanged ranges. Make one bounded implementation repair now through ${repairTool}, using the saved source/interfaces and actual failure output. ${repairTool === 'repair_browser_app' ? 'Supply the actual workspace filename, relevant bounded line ranges and observed failure requirements; its dedicated compiler reads those exact current ranges and validates patches atomically.' : ''} Preserve working functionality. Additional probe scripts and repeated file reads do not repair the product. Then rebuild and rerun the failing acceptance check; compilation alone is not verification.`
      : mustWrite
        ? `${stalled ? `There have been ${inspectionsSinceChange} successful inspection actions since the last saved source change, without a successful build. Use the observed source interfaces and results to implement the next missing module now; do not spend another step rereading the same code or writing inspection scripts.` : `Setup discovery has already returned ${setup.length} successful observations, but no implementation file has been written through a source tool.`} ${project ? `Use the existing project directory ${project}.` : 'Use the project path established by the existing tool observations.'} Stop rechecking versions, executables and dependency directories. Write one complete bounded source module or concrete module/data contract now using write_file, then continue implementing. Keep each module small enough to finish in one tool call. Do not put implementation drafts or internal planning in the chat. A plan, code fence or empty project scaffold is not a completed build.`
        : 'Continue the authorized project through actual file tools, execution and verification. Keep implementation in project files and user-facing commentary brief.',
  };
}
import { sourceInterface } from './sourceInterface.js';
import { projectFileObservation } from './projectFileObservation.js';

export function projectCheckpoint(calls = [], workspaceRoot = null) {
  const files = new Map();
  for (const call of calls) {
    if (call.status !== 'RESOLVED' || call.output?.error || call.output?.success === false)
      continue;
    const filepath = call.args?.filepath || call.args?.path;
    if (!filepath || !changesSource.test(call.tool)) continue;
    const content = call.args?.content;
    // A later edit supersedes an earlier full-source observation. Never retain
    // signatures that may have been removed or renamed by that edit.
    files.delete(filepath);
    files.set(filepath, {
      filepath,
      lastAction: call.tool,
      bytes: call.output?.size,
      interface: typeof content === 'string' ? sourceInterface(content) : null,
    });
  }
  if (!files.size) return '';
  const recent = [...files.values()].slice(-16);
  let latestSource = null;
  if (workspaceRoot)
    for (const file of recent) {
      const observed = projectFileObservation(workspaceRoot, file.filepath, {
        includeSource: file === recent.at(-1),
      });
      if (observed) {
        const { interface: currentInterface, source, ...metadata } = observed;
        if (source) latestSource = { filepath: file.filepath, sha256: observed.sha256, source };
        file.observedFile = metadata;
        // Current observations supersede earlier write arguments, especially edits.
        file.interface = currentInterface || null;
      }
    }
  const evidence = [];
  let remaining = 14000;
  for (const file of recent.reverse()) {
    const item = JSON.stringify(file);
    if (item.length > remaining) {
      evidence.unshift({ ...file, interface: null });
      continue;
    }
    remaining -= item.length;
    evidence.unshift(file);
  }
  const execution = calls
    .filter((c) => c.tool === 'run_command')
    .slice(-3)
    .map((c) => ({
      command: c.args?.command,
      cwd: c.args?.cwd,
      status: c.status,
      exitCode: c.output?.exitCode,
      error: c.output?.error,
      stdout: c.output?.stdout?.slice(-1600),
      stderr: c.output?.stderr?.slice(-1600),
    }));
  return `Saved project checkpoint from actual tool records. Files below were written, not necessarily built or verified. observedFile, when present, is a fresh confined read of the saved source and its real syntax/interface. Use actual HTML ids and exported APIs; do not guess alternate method names. Repair reported syntax failures. latestSource retains the most recent bounded file in full to avoid rereading work just written. Other source bodies are omitted, not replaced. Preserve paths and continue implementation instead of restarting setup.\n${JSON.stringify({ files: evidence, latestSource, recentExecution: execution })}`;
}
