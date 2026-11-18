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
  'list_dynamic_tools',
  'execute_dynamic_tool',
  'inspect_learning',
  'record_learning_experience',
  'retain_knowledge',
  'inject_ui_widget',
  'get_ui_state',
];

export function opensBrowserDestination(query) {
  const text = String(query || '').trim();
  const opening =
    /^(?:please\s+)?(?:(?:can|could|would|will)\s+you\s+)?(?:open|visit|browse|navigate(?:\s+to)?|go\s+to)\s+(?:(?:the\s+)?(?:site|website|url|link)\s+)?[<"\x60]?/i.exec(
      text,
    );
  if (
    !opening ||
    /\b(?:do not|don['’]t|without)\s+(?:open|visit|navigate|use)\s+(?:the\s+)?(?:browser|site|website|link)\b/i.test(
      text,
    )
  )
    return false;
  const target = text.slice(opening[0].length);
  if (/^https?:\/\/[^\s<>]+/i.test(target)) return true;
  const host =
    /^(localhost|127\.0\.0\.1|\[::1\]|(?:[a-z0-9-]+\.)+[a-z]{2,})(?=[:/\s,?!)>\x60"]|\.(?:\s|$)|$)/i.exec(
      target,
    )?.[1];
  return (
    !!host &&
    !/\.(?:md|txt|json|html?|css|mjs|cjs|js|jsx|ts|tsx|py|png|pdf|csv|xml|yaml|yml|ini|log)$/i.test(
      host,
    )
  );
}

export function selectWorkspaceTools(definitions, query = '', reusableTools = []) {
  const selected = new Set(core);
  const add = (names) => names.forEach((name) => selected.add(name));
  // Approved reusable tools remain available without requiring the user to know their names.
  add(reusableTools);
  // Recall is useful even when the user does not mention memory explicitly.
  selected.add('recall_knowledge');
  add(['search_arem_memory', 'read_arem_memory', 'create_arem_memory', 'store_arem_memory', 'link_arem_memory', 'read_arem_connections']);
  if (/\b(?:arem|memory|tools?|skills?|catalog)\b/i.test(query))
    add(['read_arem_catalog', 'archive_arem_memory', 'unlink_arem_memory']);
  if (/superbox|sandbox|isolate|safe.*exec|experiment/i.test(query))
    add([
      'superbox_create_file',
      'superbox_read_file',
      'superbox_list_files',
      'superbox_run_command',
      'superbox_apply_to_workspace',
      'superbox_reset',
    ]);
  if (/tool|forge|synthesiz|custom.*tool|capability|subconscious|new.*tool/i.test(query))
    add(['synthesize_dynamic_tool', 'create_tool', 'list_dynamic_tools', 'execute_dynamic_tool']);
  if (
    /ui|widget|theme|style|button|panel|component|modify.*ui|inject.*ui|custom.*ui|layout/i.test(
      query,
    )
  )
    add([
      'get_ui_state',
      'modify_ui_theme',
      'inject_ui_widget',
      'remove_ui_widget',
      'modify_ui_source',
    ]);
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
    opensBrowserDestination(query) ||
    /\b(?:search|reference|sign.?in|log.?in|navigate|browse|browser|website|webpage|visit|research|click|scroll)\b|https?:\/\//i.test(
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
      'browser_navigate',
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
  add(['list_team_agents', 'send_agent_message', 'read_agent_conversation']);
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
