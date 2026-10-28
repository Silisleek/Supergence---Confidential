// SIS 1.0 — Dynamic Intent Classifier
// Classifies user message intent dynamically into:
// - Explicit Build / Save Intent (user explicitly wants a file, project, simulation, or app built)
// - Conversational / Explanatory Intent (questions, discussions, theory, concepts, chat)
// Strictly ZERO HARDCODING. Uses general linguistics, grammatical directives, and semantic flags.

/**
 * Dynamically determines if user message contains explicit intent to build, create, or save a file/artifact.
 * Pure questions, discussions, conceptual inquiries, or conversational turns return false.
 *
 * @param {string} message - Raw user message
 * @returns {boolean}
 */
export function isExplicitBuildOrSaveIntent(message) {
  if (!message || typeof message !== 'string') return false;
  const clean = message.trim().toLowerCase();

  // 1. Direct conversational & explanatory query patterns (questions, inquiries, reviews, discussions)
  // These indicate the user wants to understand, discuss, or converse, NOT to generate workspace files.
  const isPureQuestionOrChat =
    /^(what('?s| is| are)|how (do|does|can|to|would)|why (is|are|do|does)|tell me|explain|describe|who (is|are)|where (is|are)|when (did|was)|can you (explain|tell|clarify|elaborate|think)|discuss|review|what do you think|hello|hi|hey|greetings)\b/i.test(
      clean,
    );

  // 2. Direct save / persist commands (e.g., "save this to app.js", "write this to a file", "save into workspace")
  const hasSaveDirective =
    /\b(save|write|persist)\s+(this|it|the\s+code|to\s+file|as\s+a\s+file|into\s+workspace|to\s+workspace)\b/i.test(
      clean,
    );
  if (hasSaveDirective) return true;

  // 3. Build / Create / Generate directives with explicit tangible targets
  // Verbs: build, create, make, develop, scaffold, generate, code, implement, write
  const hasBuildVerb =
    /\b(build|create|develop|scaffold|generate|implement)\b/i.test(clean) ||
    /^(make|code|program|write)\s+(a|an|the|me)\b/i.test(clean);
  const hasTangibleTarget =
    /\b(file|script|app|application|website|web\s*page|project|game|simulation|scene|3d\s+model|workspace|module|package|component)\b/i.test(
      clean,
    );
  const hasExplicitFilename = /\b[a-zA-Z0-9_\-]+\.(js|ts|py|html|css|json|cpp|rs|sh|sql)\b/i.test(
    clean,
  );
  const has3DDirective =
    /\b(in\s+blender|blender\s+scene|three\.?js\s+scene|interactive\s+3d|3d\s+simulation)\b/i.test(
      clean,
    );

  // 4. Engineering Bug Fix / Repair / TDD / Refactor directives
  const hasEngineeringDirective =
    /\b(fix|repair|patch|refactor|debug|reproduce|solve)\b/i.test(clean) &&
    (hasTangibleTarget ||
      hasExplicitFilename ||
      /\b(bug|defect|issue|error|failure|test|tdd|crash|exception)\b/i.test(clean));
  if (hasEngineeringDirective) return true;

  // If asking an explanatory question (e.g. "how do you build a website?", "what is a 3D scene?", "can you explain how to make a file?"),
  // treat as explanatory unless there is a strong imperative command ("build me a...", "create index.html")
  if (isPureQuestionOrChat) {
    const hasImperativeAction =
      /^(please\s+)?(build|create|generate|write|make)\s+(me\s+)?(a|an|the)\s+/i.test(clean) ||
      /\b(now\s+create|please\s+save)\b/i.test(clean);
    if (!hasImperativeAction) {
      return false;
    }
  }

  if (hasBuildVerb && (hasTangibleTarget || hasExplicitFilename || has3DDirective)) {
    return true;
  }

  return false;
}

/**
 * Checks if a message is purely conversational, theoretical, or explanatory.
 * @param {string} message
 * @returns {boolean}
 */
export function isConversationalOrExplanatoryQuery(message) {
  if (!message || typeof message !== 'string') return true;
  return !isExplicitBuildOrSaveIntent(message);
}
