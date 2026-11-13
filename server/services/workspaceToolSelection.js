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
  'superbox_create_file',
  'superbox_read_file',
  'superbox_list_files',
  'superbox_run_command',
  'superbox_apply_to_workspace',
  'create_tool',
  'synthesize_dynamic_tool',
  'inject_ui_widget',
  'get_ui_state',
];
export function selectWorkspaceTools(definitions, query = '') {
  const selected = new Set(core);
  const add = (names) => names.forEach((name) => selected.add(name));
  // Recall is useful even when the user does not mention memory explicitly.
  selected.add('recall_knowledge');
  if (/superbox|sandbox|isolate|safe.*exec|experiment/i.test(query))
    add(['superbox_create_file', 'superbox_read_file', 'superbox_list_files', 'superbox_run_command', 'superbox_apply_to_workspace', 'superbox_reset']);
  if (/tool|forge|synthesiz|custom.*tool|capability|subconscious|new.*tool/i.test(query))
    add(['synthesize_dynamic_tool', 'create_tool', 'list_dynamic_tools', 'execute_dynamic_tool']);
  if (/ui|widget|theme|style|button|panel|component|modify.*ui|inject.*ui|custom.*ui|layout/i.test(query))
    add(['get_ui_state', 'modify_ui_theme', 'inject_ui_widget', 'remove_ui_widget', 'modify_ui_source']);
  if (/retain|remember|memory|knowledge|\brules?\b|learn|import|saved.*source/i.test(query))
    add(['retain_knowledge', 'inspect_knowledge', 'edit_knowledge']);
  if (/skill|learn|reverse.engineer/i.test(query)) selected.add('read_learning_skill');
  if (/learn|study|curriculum|new.*task|apply.*knowledge/i.test(query))
    add(['study_topic', 'inspect_learning', 'record_learning_experience']);
  if (/recall|retrieval|evaluat.*knowledge|benchmark.*learn/i.test(query))
    selected.add('evaluate_knowledge');
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
