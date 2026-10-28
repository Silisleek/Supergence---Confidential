const core = [
  'read_file',
  'write_file',
  'generate_browser_app',
  'repair_browser_app',
  'edit_file',
  'list_files',
  'run_command',
  'get_creation_workspace',
  'create_workspace_project',
  'verify_workspace_artifact',
  'tool_cognition_query',
];
export function selectWorkspaceTools(definitions, query = '') {
  const selected = new Set(core);
  const add = (names) => names.forEach((name) => selected.add(name));
  // Recall is useful even when the user does not mention memory explicitly.
  selected.add('recall_knowledge');
  if (/retain|remember|memory|knowledge|\brules?\b|learn|import|saved.*source/i.test(query))
    add(['retain_knowledge', 'inspect_knowledge', 'edit_knowledge']);
  if (/skill|learn|reverse.engineer/i.test(query)) selected.add('read_learning_skill');
  if (/remember|memory|previous|earlier|history|last time/i.test(query))
    add(['recall_knowledge', 'search_chat_history', 'get_chat_history']);
  if (
    /\b(?:search|reference|sign.?in|log.?in|navigate|browse|visit|research)\b|https?:\/\/|open.*browser/i.test(
      query,
    )
  )
    add([
      'open_workspace_browser',
      'read_workspace_browser',
      'browser_click',
      'browser_type',
      'browser_fill_form',
      'browser_scroll',
      'browser_new_tab',
      'web_search',
      'web_fetch',
      'retain_knowledge',
      'capture_reference_feature',
      'reverse_engineer_artifact',
    ]);
  if (/graphic|visual|image|texture|game|canvas|3d|design|lamp|render|material|svg/i.test(query))
    add(['generate_texture', 'render_graphic', 'review_workspace_visual']);
  if (/\b3d\b|three|webgl|voxel|lamp|architecture/i.test(query))
    add([
      'generate_browser_project',
      'generate_3d_game',
      'generate_3d_architecture',
      'execute_code_sandbox',
    ]);
  if (/invoice|lamp|courtyard.museum|skyline.courier|northlight.workshop|canal.rescue/i.test(query))
    selected.add('verify_workspace_code_task');
  if (
    /evol|(?:improve|modify|upgrade)\s+supergence|itself|add.*tool|skill|proposal|research/i.test(
      query,
    )
  )
    add([
      'propose_evolution',
      'revise_evolution',
      'inspect_evolution',
      'verify_evolution',
      'queue_research',
      'inspect_research',
      'deep_research',
    ]);
  if (/outside.*workspace|absolute.*path|local.*file|host.*directory|disk/i.test(query))
    add(['read_local_file', 'write_local_file', 'list_local_directory']);
  if (/agent|specialist|team|coworker/i.test(query))
    add(['send_agent_message', 'read_agent_conversation']);
  if (/connector|composio|gmail|calendar/i.test(query))
    add(['composio_discover', 'composio_request_action']);
  if (
    /\b(?:fix|repair|improve)\b/i.test(query) &&
    /\bexisting\b/i.test(query) &&
    /\.html\b/i.test(query)
  ) {
    for (const name of [
      'generate_browser_app',
      'generate_browser_project',
      'get_creation_workspace',
      'create_workspace_project',
      'generate_3d_game',
      'generate_3d_architecture',
      'execute_code_sandbox',
      'render_graphic',
      'generate_texture',
    ])
      selected.delete(name);
  }
  if (
    /\b(?:write_file|run_command)\b/.test(query) &&
    /\b(?:source|modules?|terminal|project)\b/i.test(query)
  ) {
    for (const name of [
      'generate_browser_app',
      'generate_browser_project',
      'generate_3d_game',
      'generate_3d_architecture',
      'execute_code_sandbox',
      'repair_browser_app',
      'tool_cognition_query',
    ])
      if (!query.includes(name)) selected.delete(name);
  }
  return definitions.filter(
    (definition) =>
      selected.has(definition.function.name) || query.includes(definition.function.name),
  );
}
