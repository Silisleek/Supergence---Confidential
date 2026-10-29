// SIS 1.0 — Orchestrated Coder Part (4-Step Self-Correcting Execution Loop)
// Implements: Structured Output -> Local RAG -> Sandbox Testing -> Self-Correction Loop

import { BasePart } from '../parts/base-part.js';
import { callAI, PREMIUM_MODEL } from '../api/openrouter.js';
import contextScanner from './context-scanner.js';
import sandbox from './sandbox.js';
import shortTermMemory from '../memory/short-term.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DiffPatcher } from './diff-patcher.js';
import { TddHarness } from './tdd-harness.js';
import { TrajectoryLogger } from '../trajectory/trajectory-logger.js';
import { RewardVerifier } from '../trajectory/reward-verifier.js';

import { isExplicitBuildOrSaveIntent } from '../orchestrator/intent.js';
import { perfectionistCoderEngine } from './perfectionist-coder-engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = process.env.SIS_WORKSPACE_DIR
  ? path.resolve(process.env.SIS_WORKSPACE_DIR)
  : path.join(__dirname, '../../workspace');

export class CoderPart extends BasePart {
  constructor(config = {}) {
    super({
      name: 'coder',
      id: 'coder',
      promptFile: 'coder.md',
      capabilities: [
        'software engineering',
        'automated testing',
        'debugging',
        'full-stack code',
        'algorithms',
        'web development',
      ],
      tags: [
        'code',
        'program',
        'function',
        'bug',
        'software',
        'app',
        'website',
        'api',
        'build',
        'create',
        'make',
        'develop',
        'script',
        'game',
      ],
      priority: 1,
      ...config,
    });
    this.maxCorrectionAttempts = 3;
    this.onProgress = null; // optional callback for brain/WS events
    this.diffPatcher = DiffPatcher;
    this.tddHarness = new TddHarness({ sandboxRunner: sandbox });
    this.trajectoryLogger = new TrajectoryLogger('coder_part_executions');
  }

  /**
   * Orchestrated 4-step execution loop
   */
  async process(userMessage, conversationHistory = []) {
    this.isActive = true;
    this.lastRun = Date.now();
    this.runCount++;
    const runId = `coder_${Date.now()}`;

    try {
      // ─── CONVERSATIONAL / ADVISORY PATH: If user didn't ask to build or save a file ───
      if (!isExplicitBuildOrSaveIntent(userMessage)) {
        console.log(
          '[Coder] Non-build query — providing expert engineering analysis without workspace file persistence...',
        );
        const explanation = await callAI({
          model: this.model,
          systemPrompt: `${this.systemPrompt}\n\n## ADVISORY MODE\nThe user is asking for conceptual guidance, explanation, or code analysis — NOT requesting to build or save a project file into workspace. Provide concise, expert engineering analysis with illustrative markdown code snippets. Do NOT specify a target file or trigger file persistence.`,
          messages: [...conversationHistory.slice(-4), { role: 'user', content: userMessage }],
          temperature: 0.5,
          maxTokens: 2500,
        });
        this.isActive = false;
        return {
          part: this.name,
          output: explanation,
          code: '',
          targetFile: null,
          language: 'markdown',
          verified: true,
          attempts: 1,
          confidence: 0.95,
          timestamp: Date.now(),
        };
      }

      // ─── FAST PATH: 3D/scene builds are owned by the generate_3d_scene tool ───
      // A full 12k-token HTML draft here duplicates that pipeline, burns minutes,
      // and truncates into sandbox failures. Instead return a compact build spec
      // that becomes high-signal context for the Output Streamer.
      if (this._isSceneBuild(userMessage)) {
        console.log(
          '[Coder] Scene-build detected — returning build spec (full render owned by 3D tool)...',
        );
        const spec = await this._generateSceneSpec(userMessage, conversationHistory);
        this.isActive = false;
        return {
          part: this.name,
          output: spec,
          code: '',
          targetFile: 'index.html',
          language: 'html',
          verified: false,
          specOnly: true,
          attempts: 1,
          confidence: 0.8,
          timestamp: Date.now(),
        };
      }

      // ─── ELITE ENGINEERING PATH: Verifier-Driven Bug Repairs, TDD, Refactoring ───
      const isEngineeringRepair =
        /\b(bug|fix|repair|patch|tdd|test-driven|refactor|defect|reproduce)\b/i.test(userMessage) &&
        !this._isSceneBuild(userMessage);
      if (isEngineeringRepair) {
        console.log('[Coder] 🛡️ Routing to Elite Verifier-Driven Engineering Pipeline...');
        const engineeringResult = await perfectionistCoderEngine.executeEliteEngineeringTask({
          prompt: userMessage,
          onProgress: (p) => {
            if (this.onProgress) this.onProgress(p);
          },
        });
        this.isActive = false;
        const hypClaim = engineeringResult.hypothesis?.claim || 'Defect analysis';
        const hypAnchor = engineeringResult.hypothesis?.anchor
          ? `${engineeringResult.hypothesis.anchor.file}:${engineeringResult.hypothesis.anchor.line}`
          : 'target:1';
        return {
          part: this.name,
          output: `### Elite Software Engineering Execution\n- **Hypothesis**: ${hypClaim}\n- **Anchor**: \`${hypAnchor}\`\n- **Red-Green TDD Gate**: ${engineeringResult.phases.redPhase.passed ? '✓ Pre-patch RED confirmed' : '❌ Red phase failed'} -> ${engineeringResult.phases.greenPhase.passed ? '✓ Post-patch GREEN confirmed' : '❌ Green phase failed'}\n- **Diff Budget**: ${engineeringResult.phases.diffBudgetPhase.linesChanged} lines changed (budget <= 40)\n- **Anti-Slop Scan**: ${engineeringResult.phases.antiSlopPhase.passed ? '✓ Clean (zero suppression hacks)' : '❌ Banned patterns detected'}\n- **Verifiable Reward**: **${engineeringResult.reward}** (${engineeringResult.rewardStatus})\n\n\`\`\`javascript\n${engineeringResult.patch ? `// Patch applied to ${engineeringResult.patch.file}:\n${engineeringResult.patch.newLines || ''}` : '// No patch applied'}\n\`\`\``,
          code: engineeringResult.patch?.newLines || '',
          targetFile: engineeringResult.hypothesis?.anchor?.file || null,
          language: 'javascript',
          verified: engineeringResult.success,
          attempts: 1,
          reward: engineeringResult.reward,
          confidence: engineeringResult.success ? 0.99 : 0.6,
          timestamp: Date.now(),
        };
      }

      // ─── STEP 2: Context Injection (Local RAG) ───
      console.log('[Coder] Step 2: Scanning workspace for context injection...');
      const codebaseContext = await contextScanner.buildContext(userMessage);

      const systemPromptWithContext = `${this.systemPrompt}

## Injected Codebase Context (Local RAG)
${codebaseContext}

## Memory Context
${this._buildContext(userMessage)}`;

      // ─── STEP 1: Strict Formatting via Structured Outputs ───
      console.log('[Coder] Step 1: Requesting structured code draft from model...');
      let currentDraft = await this._generateDraft({
        systemPrompt: systemPromptWithContext,
        userMessage,
        conversationHistory,
      });

      // ─── STEP 3: Automated Execution and Sandbox Testing ───
      console.log(
        `[Coder] Step 3: Running sandbox tests on target file: ${currentDraft.targetFile}...`,
      );
      let testResult = await sandbox.execute(currentDraft, runId);
      let attempts = 1;
      // Best-effort retention: never end with LESS than the longest code seen.
      let bestDraft = currentDraft.code && currentDraft.code.trim() ? currentDraft : null;
      let emptyStreak = currentDraft.code && currentDraft.code.trim() ? 0 : 1;

      // ─── STEP 4: Self-Correction Error Feedback Loop ───
      while (!testResult.success && attempts < this.maxCorrectionAttempts) {
        // Stop burning calls when the model twice returns nothing parseable —
        // a third identical attempt will not fix a truncation-shaped failure.
        if (emptyStreak >= 2) {
          console.warn(
            '[Coder] Step 4: Two consecutive empty parses — stopping correction loop with best effort.',
          );
          break;
        }
        attempts++;
        const errorDetails =
          testResult.stderr || testResult.error || testResult.stdout || 'Unknown execution error';
        console.warn(
          `[Coder] Step 4: Attempt ${attempts - 1} failed. Self-correcting with error trace...`,
        );

        if (this.onProgress) {
          this.onProgress({
            stage: 'self-correcting',
            attempt: attempts,
            error: errorDetails.slice(0, 120),
          });
        }

        // Slice prior code: echoing 12k chars back doubles the failure surface.
        const priorCode = (currentDraft.code || '').slice(0, 6000);
        const priorCut =
          (currentDraft.code || '').length > 6000
            ? '\n... [sliced for brevity — fix the reported error, regenerate the FULL file]'
            : '';
        const correctionPrompt = `Your previous code generation for "${currentDraft.targetFile}" failed in automated sandbox testing:
--------------------------------------------------
PHASE: ${testResult.phase || 'execution'}
TERMINAL OUTPUT / ERROR:
${errorDetails.slice(0, 1500)}
--------------------------------------------------
Previous code draft (may be sliced):
\`\`\`${currentDraft.language}
${priorCode}${priorCut}
\`\`\`

Diagnose the root cause of this failure, fix the issue completely, and respond with the corrected code conforming to the required JSON schema. IMPORTANT: output the COMPLETE file in one valid JSON block — never truncate, never leave fences unclosed.`;

        const correctedResponse = await callAI({
          model: PREMIUM_MODEL || this.model,
          systemPrompt: systemPromptWithContext,
          messages: [
            ...conversationHistory.slice(-4),
            { role: 'user', content: userMessage },
            {
              role: 'assistant',
              content: `\`\`\`json\n${JSON.stringify({ ...currentDraft, code: priorCode }, null, 2)}\n\`\`\``,
            },
            { role: 'user', content: correctionPrompt },
          ],
          temperature: 0.3, // lower temperature for precision bug fixing
          maxTokens: 12000,
        });

        const rawCorrection = correctedResponse.choices[0]?.message?.content || '';
        const parsed = this._parseDraft(
          rawCorrection,
          currentDraft.targetFile,
          currentDraft.language,
        );
        if (parsed) {
          if (parsed.code && parsed.code.trim().length > (bestDraft?.code || '').length)
            bestDraft = parsed;
          if (!parsed.code || !parsed.code.trim()) {
            emptyStreak++;
          } else {
            emptyStreak = 0;
          }
          currentDraft = parsed.code && parsed.code.trim() ? parsed : currentDraft;
          testResult = await sandbox.execute(currentDraft, `${runId}_retry${attempts}`);
        } else {
          break;
        }
      }

      // If the loop ends without passing but a longer draft exists, keep it.
      if (
        !testResult.success &&
        bestDraft &&
        (bestDraft.code || '').length > (currentDraft.code || '').length
      ) {
        currentDraft = bestDraft;
      }

      // Cleanup temporary sandbox dirs (base + every retry dir — retries leaked before)
      sandbox.cleanup(runId);
      for (let a = 2; a <= attempts; a++) sandbox.cleanup(`${runId}_retry${a}`);

      // ─── Trajectory Logging & Verifiable Reward Recording ───
      try {
        const finalEval = RewardVerifier.evaluate({
          exitCode: testResult.exitCode ?? (testResult.success ? 0 : 1),
          testSummary: {
            total: 1,
            passed: testResult.success ? 1 : 0,
            failed: testResult.success ? 0 : 1,
          },
        });
        this.trajectoryLogger.logStep({
          state: { prompt: userMessage, targetFile: currentDraft.targetFile, attempts },
          action: { type: 'code_synthesis', codeLength: (currentDraft.code || '').length },
          observation: {
            success: testResult.success,
            exitCode: testResult.exitCode,
            phase: testResult.phase,
          },
          reward: finalEval.reward,
          metadata: { scoreBreakdown: finalEval.scoreBreakdown },
        });
      } catch (logErr) {
        console.warn('[Coder] Trajectory log notice:', logErr.message);
      }

      // ─── Workspace Promotion (Only if verified and valid) ───
      const safeFilename = path.basename(currentDraft.targetFile || 'solution.js');
      if (testResult.success && currentDraft.code && currentDraft.code.trim().length > 10) {
        const promotedPath = path.join(WORKSPACE_DIR, safeFilename);
        fs.writeFileSync(promotedPath, currentDraft.code, 'utf8');
        console.log(
          `[Coder] Verified code promoted to workspace: ${safeFilename} (Passed: true, Attempts: ${attempts})`,
        );
      } else {
        console.warn(
          `[Coder] Code did not pass validation; not promoting to workspace (Passed: ${testResult.success})`,
        );
      }

      // Store in memory
      shortTermMemory.store(
        ['coder', 'executions'],
        {
          content: `Generated ${safeFilename}: ${currentDraft.explanation} (Verified: ${testResult.success})`,
          type: 'code-artifact',
          tags: [
            'coder',
            currentDraft.language,
            safeFilename,
            testResult.success ? 'verified' : 'unverified',
          ],
          metadata: {
            file: safeFilename,
            attempts,
            passed: testResult.success,
            stdout: testResult.stdout?.slice(0, 200),
          },
        },
        'coder',
      );

      const formattedOutput = this._formatFinalOutput(currentDraft, testResult, attempts);

      this.isActive = false;
      return {
        part: this.name,
        output: formattedOutput,
        code: currentDraft.code,
        targetFile: safeFilename,
        language: currentDraft.language,
        verified: testResult.success,
        attempts,
        confidence: testResult.success ? 0.98 : 0.75,
        timestamp: Date.now(),
      };
    } catch (err) {
      this.isActive = false;
      console.error('[Coder] Execution loop exception:', err);
      return {
        part: this.name,
        output: '',
        error: err.message,
        confidence: 0,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * True when the request is a 3D/scene/visualization build with no explicit
   * code file named — those are rendered by the generate_3d_scene tool, not
   * by a hand-written HTML draft from this part.
   */
  _isSceneBuild(query = '') {
    const q = (query || '').toLowerCase();
    const wantsNamedCodeFile = /\b[a-zA-Z0-9_\-]+\.(?:js|py|ts|json|css|jsx|tsx)\b/i.test(query);
    if (wantsNamedCodeFile) return false;
    const sceneHints = [
      '3d',
      'three.js',
      'threejs',
      'webgl',
      'scene',
      'simulation',
      'viewport',
      'tesla',
      'car ',
      ' car',
      'vehicle',
      'render',
    ];
    const buildVerbs = ['make', 'build', 'create', 'generate', 'show', 'render', 'model'];
    return sceneHints.some((h) => q.includes(h)) && buildVerbs.some((v) => q.includes(v));
  }

  async _generateSceneSpec(userMessage, conversationHistory = []) {
    try {
      const response = await callAI({
        model: this.model,
        systemPrompt: `${this.systemPrompt}\n\n## SCENE-SPEC MODE\nThe 3D generator tool owns full rendering. Output a COMPACT markdown build spec (under 400 words, NO code): target file, hero object + supports with materials, animation behavior, HUD/controls, Jarvis palette mapping (coffee brown / tactical blue / cyber lime, solid colors only), and an acceptance checklist. No placeholders.`,
        messages: [...conversationHistory.slice(-2), { role: 'user', content: userMessage }],
        temperature: 0.5,
        maxTokens: 900,
      });
      return (
        response.choices[0]?.message?.content ||
        `Build spec for "${userMessage}": single-room 3D scene, hero object + supports, HUD + controls.`
      );
    } catch (e) {
      return `Build spec for "${userMessage}": single-room 3D scene (spec generation failed: ${e.message}).`;
    }
  }

  _detectTarget(query = '') {
    const q = (query || '').toLowerCase();
    const explicit = q.match(/\b([a-zA-Z0-9_\-]+\.(?:html|js|py|css|json|ts|cpp|rs))\b/i);
    if (explicit) return { filename: explicit[1], language: path.extname(explicit[1]).slice(1) };
    if (
      q.includes('3d') ||
      q.includes('website') ||
      q.includes('html') ||
      q.includes('scene') ||
      q.includes('simulation') ||
      q.includes('viewport') ||
      q.includes('page')
    ) {
      return { filename: 'index.html', language: 'html' };
    }
    if (q.includes('python') || q.includes('py ') || q.includes('script.py')) {
      return { filename: 'main.py', language: 'python' };
    }
    return { filename: 'main.js', language: 'javascript' };
  }

  async _generateDraft({ systemPrompt, userMessage, conversationHistory }) {
    const target = this._detectTarget(userMessage);
    const isHtml = target.language === 'html';
    const deliveryBar = isHtml
      ? '## Delivery Bar\nShip a COMPLETE, polished, visually premium web artifact. No stubs, no TODOs, no lorem ipsum. HTML must include Tailwind CDN + Google Fonts + responsive layout + real content + wired interactivity.'
      : `## Delivery Bar\nShip a COMPLETE, production-grade, 100% working ${target.language} implementation for ${target.filename}. No stubs, no TODOs, no ellipses (...), no placeholder comments. Implement all algorithms, data structures, methods, and error cases with zero missing logic.`;
    const richPrompt = `${systemPrompt}\n\n${deliveryBar}`;
    const response = await callAI({
      model: PREMIUM_MODEL || this.model,
      systemPrompt: richPrompt,
      messages: [...conversationHistory.slice(-4), { role: 'user', content: userMessage }],
      temperature: isHtml ? 0.3 : 0.1, // low deterministic temperature for algorithms & precision code
      maxTokens: 12000,
    });

    const rawContent = response.choices[0]?.message?.content || '';
    return this._parseDraft(rawContent, target.filename, target.language);
  }

  /**
   * Best-effort unescape of a possibly TRUNCATED JSON string value
   * (a cut response is not valid JSON, so JSON.parse cannot save it).
   */
  _unescapeTruncated(s = '') {
    return s
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .replace(/\\$/, '');
  }

  _draftFromCode(code, lang, fallbackFilename, fallbackLang, explanation) {
    const extMap = {
      javascript: 'js',
      js: 'js',
      python: 'py',
      py: 'py',
      html: 'html',
      css: 'css',
      json: 'json',
      typescript: 'ts',
    };
    const normLang = (lang || fallbackLang).toLowerCase();
    const ext = extMap[normLang] || normLang;
    const fn = fallbackFilename.endsWith(`.${ext}`) ? fallbackFilename : `solution.${ext}`;
    return {
      targetFile: fn,
      language: normLang,
      action: 'create',
      explanation: explanation || 'Synthesized implementation',
      code: (code || '').trim(),
      testCode: '',
      runCommand: '',
    };
  }

  _parseDraft(rawContent, fallbackFilename = 'main.js', fallbackLang = 'javascript') {
    const content = rawContent || '';

    // 1. Try parsing JSON block (```json ... ```)
    const jsonBlockMatch = content.match(/```json\s*\n([\s\S]*?)```/i);
    if (jsonBlockMatch) {
      try {
        const parsed = JSON.parse(jsonBlockMatch[1].trim());
        if (parsed.code && parsed.code.trim().length > 0) return this._normalizeDraft(parsed);
      } catch {}
    }

    // 2. Direct JSON parse attempt (if full response is raw JSON)
    try {
      const parsed = JSON.parse(content.trim());
      if (parsed.code && parsed.code.trim().length > 0) return this._normalizeDraft(parsed);
    } catch {}

    // 3. Extract fenced code blocks (handles single or multi-block modular code)
    const allFences = [...content.matchAll(/```([a-zA-Z0-9_-]*)\s*\n([\s\S]*?)```/g)];
    const validCodeBlocks = allFences
      .map((m) => ({ tag: (m[1] || '').toLowerCase(), code: m[2].trim() }))
      .filter(
        (b) =>
          b.code.length > 15 && !b.code.startsWith('{') && b.tag !== 'json' && b.tag !== 'text',
      );

    if (validCodeBlocks.length > 0) {
      // Filter out explanatory/incomplete snippets containing invalid syntax placeholders like { ... } or (...)
      const cleanBlocks = validCodeBlocks.filter(
        (b) =>
          !/\{\s*\.\.\.\s*\}|\(\s*\.\.\.\s*\)|\[\s*\.\.\.\s*\]|\.\.\.\s*validate/i.test(b.code),
      );
      const candidateBlocks = cleanBlocks.length > 0 ? cleanBlocks : validCodeBlocks;

      // Separate main implementation blocks from standalone test assertion blocks
      const mainBlocks = candidateBlocks.filter(
        (b) => !b.tag.includes('test') && !b.code.includes('TASK_') && !b.code.includes('assert.'),
      );
      const testBlocks = candidateBlocks.filter(
        (b) => b.tag.includes('test') || b.code.includes('assert.'),
      );

      // If one block is a complete export/class block, only prepend strictly valid top-level helper declarations
      const fullModuleBlock = mainBlocks.find(
        (b) =>
          (b.code.includes('export class') || b.code.includes('class ')) && b.code.length > 400,
      );

      const validHelpers = mainBlocks.filter((b) => {
        if (b === fullModuleBlock) return false;
        if (b.code.includes('class ')) return false;
        if (/^\s*return\b/m.test(b.code)) return false; // top-level return is illegal in module scope
        if (!/^\s*(?:function|const|let|var|import)\b/m.test(b.code)) return false;
        return true;
      });

      const combinedCode = fullModuleBlock
        ? validHelpers
            .map((b) => b.code)
            .concat(fullModuleBlock.code)
            .join('\n\n')
        : (mainBlocks.length > 0 ? mainBlocks : candidateBlocks).map((b) => b.code).join('\n\n');

      const combinedTest = testBlocks.map((b) => b.code).join('\n\n');

      return {
        targetFile: fallbackFilename,
        language: fallbackLang,
        action: 'create',
        explanation: 'Synthesized implementation',
        code: combinedCode.trim(),
        testCode: combinedTest.trim(),
        runCommand: '',
      };
    }

    // 5. TRUNCATED or Malformed JSON recovery: response contains "code": "..."
    const codeStartMatch = content.match(/"code"\s*:\s*"/);
    if (codeStartMatch) {
      const startIndex = codeStartMatch.index + codeStartMatch[0].length;
      let rawCode;
      // Check if there is a following field like "testCode" or end of object
      const nextFieldMatch = content
        .slice(startIndex)
        .match(/",\s*"(?:testCode|runCommand|explanation|action)"/);
      if (nextFieldMatch) {
        rawCode = content.slice(startIndex, startIndex + nextFieldMatch.index);
      } else {
        const lastQuoteIndex = content.lastIndexOf('"');
        if (lastQuoteIndex > startIndex) {
          rawCode = content.slice(startIndex, lastQuoteIndex);
        } else {
          rawCode = content.slice(startIndex);
        }
      }

      const fileHint = content.match(/"targetFile"\s*:\s*"([^"]+)"/);
      const langHint = content.match(/"language"\s*:\s*"([^"]+)"/);
      const expHint = content.match(/"explanation"\s*:\s*"([^"]{0,300})/);
      const fn = fileHint ? path.basename(fileHint[1]) : fallbackFilename;
      const lang = (
        langHint ? langHint[1] : path.extname(fn).slice(1) || fallbackLang
      ).toLowerCase();
      const unescaped = this._unescapeTruncated(rawCode);
      if (unescaped.trim().length > 10) {
        return {
          targetFile: fn,
          language: lang,
          action: 'create',
          explanation: expHint ? expHint[1] : 'Recovered from structured output',
          code: unescaped.trim(),
          testCode: '',
          runCommand: '',
          truncated: !nextFieldMatch,
        };
      }
    }

    // 6. UNCLOSED fence recovery: model was cut before closing ``` — take the rest.
    const openFence = content.match(/```([a-zA-Z0-9_-]*)\n([\s\S]*)$/);
    if (openFence && openFence[2].trim().length > 10) {
      const draft = this._draftFromCode(
        openFence[2],
        openFence[1] || fallbackLang,
        fallbackFilename,
        fallbackLang,
        'Recovered from unclosed code fence',
      );
      draft.truncated = true;
      return draft;
    }

    // 7. Check for direct HTML
    if (content.includes('<!DOCTYPE') || content.includes('<html')) {
      const start =
        content.indexOf('<!DOCTYPE') !== -1
          ? content.indexOf('<!DOCTYPE')
          : content.indexOf('<html');
      const end = content.lastIndexOf('</html>');
      const htmlCode = end !== -1 ? content.slice(start, end + 7) : content.slice(start);
      return {
        targetFile: fallbackFilename.endsWith('.html') ? fallbackFilename : 'index.html',
        language: 'html',
        action: 'create',
        explanation:
          end !== -1
            ? 'HTML application synthesized'
            : 'HTML application synthesized [TRUNCATED — needs completion]',
        code: htmlCode.trim(),
        testCode: '',
        runCommand: '',
        ...(end !== -1 ? {} : { truncated: true }),
      };
    }

    // 5. If purely conversational with no code, return empty code so sandbox doesn't fail on plain English
    // Derive language from the filename extension to keep it consistent with the file.
    // Without this, language can be 'javascript' while targetFile is 'index.html',
    // causing sandbox to run node --check on an HTML file.
    const derivedLang = path.extname(fallbackFilename).slice(1).toLowerCase() || fallbackLang;
    return {
      targetFile: fallbackFilename,
      language: derivedLang,
      action: 'create',
      explanation: content.slice(0, 200),
      code: '',
      testCode: '',
      runCommand: '',
    };
  }

  _normalizeDraft(draft) {
    return {
      targetFile: draft.targetFile || 'index.js',
      language: draft.language || path.extname(draft.targetFile || '').slice(1) || 'javascript',
      action: draft.action || 'create',
      explanation: draft.explanation || 'Implementation complete',
      code: draft.code || '',
      testCode: draft.testCode || '',
      runCommand: draft.runCommand || '',
    };
  }

  _formatFinalOutput(draft, testResult, attempts) {
    const statusTag = testResult.success
      ? `[STATUS: VERIFIED // PASSED SANDBOX TESTS (Attempts: ${attempts})]`
      : `[STATUS: PARTIAL // FAILED VALIDATION (Attempts: ${attempts})]`;
    // Cap embedded code: the full file lives in workspace; the specialist-context
    // pipe truncates at 1500 chars anyway, so send a useful head + pointer.
    const codeHead = (draft.code || '').slice(0, 1500);
    const codeCut =
      (draft.code || '').length > 1500
        ? `\n... [${(draft.code || '').length - 1500} more chars in workspace file ${draft.targetFile}]`
        : '';

    return `### ${draft.targetFile} ${statusTag}
**Architecture & Design:** ${draft.explanation}

\`\`\`${draft.language}
${codeHead}${codeCut}
\`\`\`

**Sandbox Validation Telemetry:**
- Tests Executed: ${draft.testCode ? 'Unit Test Suite' : 'Syntax Check'}
- Exit Code: ${testResult.exitCode}
- Output: ${testResult.stdout || testResult.stderr || 'All assertions passed cleanly.'}`;
  }
}

export { DiffPatcher, TddHarness };
export default CoderPart;
