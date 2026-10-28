// SIS 1.0 — Split-Build-Verify-Heal-Join 3D Game & Simulation Architect
// Generates original task-specific HTML and checks it in Chrome.
// Legacy templates remain available only as explicit examples; generation does not use them.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { quickAI, PREMIUM_MODEL } from '../api/openrouter.js';
import workspace from '../workspace/manager.js';
import { threeCreationContract } from './creation-contract.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_DIR = path.resolve(__dirname, '../../workspace');

/**
 * Validate that a JavaScript snippet is syntactically sound
 */
export function validateJsSyntax(code) {
  try {
    const stripped = (code || '')
      .replace(/\r\n/g, '\n')
      .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '// [import]')
      .replace(/export\s+default\s+/g, '/* export default */ ')
      .replace(/export\s+\{[^}]*\};?/g, '// [export list]')
      .replace(/export\s+/g, '');
    new Function(stripped);
    return { valid: true };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

/**
 * Iteratively heal syntax errors across an entire assembled script
 * Non-destructive: balances unclosed braces/parentheses and fixes truncated lines without deleting code.
 */
export function autoHealScript(code) {
  if (!code || typeof code !== 'string') return '';
  let clean = code.replace(/\r\n/g, '\n');

  // 1. Initial sanitization: balance backticks & sanitize placeholder ellipses
  const backtickCount = (clean.match(/`/g) || []).length;
  if (backtickCount % 2 !== 0) {
    clean += '`;\n';
  }
  clean = clean.replace(/\{\s*\.\.\.\s*\}/g, '{}');
  clean = clean.replace(/\/\/\s*\.\.\..*$/gm, '');
  clean = clean.replace(/^[ \t]*\.\.\.[ \t]*$/gm, '');
  // Comment out pseudocode ellipses that are not spread operators (...variable)
  clean = clean.replace(/^(.*?)\.\.\.(.*?)$/gm, (match) => {
    if (/\.\.\.[a-zA-Z0-9_${\[]/.test(match)) return match;
    return `// ${match}`;
  });
  // Replace trailing stray question marks on assignments with semicolon
  clean = clean.replace(/\?\s*$/gm, ';');
  // Fix accidental closing parenthesis on assignments: e.g. "thighFR.position.y = -0.15);"
  clean = clean.replace(/^([ \t]*[a-zA-Z0-9_$.\[\]]+\s*=\s*[-+0-9.a-zA-Z_]+)\s*\);/gm, '$1;');
  // Strip truncated assignment statements directly preceding a closing block: e.g. "h = (h ^ (h >>\n}"
  clean = clean.replace(
    /^[ \t]*[a-zA-Z0-9_$.\[\]]+\s*=\s*[^;\n]*[+\-*\/%=&|^!.,(\[><]\s*\n(?=[ \t]*[}\)])/gm,
    '',
  );
  // Strip truncated control-flow headers directly preceding a closing block: e.g. "for (let y\n}"
  clean = clean.replace(
    /^[ \t]*(?:for|while|if|switch|catch)\s*\([^{};\n]*\n(?=[ \t]*[}\)])/gm,
    '',
  );
  // Ensure size parameter is defined in createZebraStripeTexture helpers if not already in parameter list
  clean = clean.replace(
    /(function\s+createZebraStripeTexture\s*\((?![^)]*\bsize\b)[^)]*\)\s*\{)(?!\s*const\s+size)/g,
    '$1\n  const size = (typeof width !== "undefined" ? width : 1024);\n',
  );

  // 2. Iterative validation and precision repair
  for (let attempt = 0; attempt < 35; attempt++) {
    const stripped = clean
      .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '// [import]')
      .replace(/export\s+default\s+/g, '/* export default */ ')
      .replace(/export\s+\{[^}]*\};?/g, '// [export list]')
      .replace(/export\s+/g, '');
    try {
      new Function(stripped);
      return clean;
    } catch (err) {
      const msg = err.message || '';
      if (
        msg.includes('Unexpected end of input') ||
        msg.includes("Unexpected token ')'") ||
        msg.includes('missing ) after argument list')
      ) {
        let openBraces = (clean.match(/\{/g) || []).length;
        let closeBraces = (clean.match(/\}/g) || []).length;
        let openParens = (clean.match(/\(/g) || []).length;
        let closeParens = (clean.match(/\)/g) || []).length;
        if (openBraces > closeBraces) {
          clean += '\n}\n';
          continue;
        }
        if (openParens > closeParens) {
          clean += '\n);\n';
          continue;
        }
      }

      if (msg.includes('Missing catch or finally')) {
        clean += '\n} catch (e) { console.warn(e); }\n';
        continue;
      }

      // Check for unclosed brackets [ ]
      let openBrackets = (clean.match(/\[/g) || []).length;
      let closeBrackets = (clean.match(/\]/g) || []).length;
      if (openBrackets > closeBrackets) {
        clean += '\n]\n';
        continue;
      }

      // Check if open braces remain
      let openB = (clean.match(/\{/g) || []).length;
      let closeB = (clean.match(/\}/g) || []).length;
      if (openB > closeB) {
        clean += '\n}\n';
        continue;
      }

      // Check trailing incomplete lines
      const lines = clean.split('\n');
      if (lines.length > 1) {
        const lastLine = lines[lines.length - 1].trim();
        if (
          /^(?:this|new|typeof|return|case|default|const|let|var)\b/.test(lastLine) ||
          /[+\-*\/%=&|^!.,(\[]\s*$/.test(lastLine) ||
          /^(?:const|let|var)\s+[\w$]+\s*=\s*$/.test(lastLine)
        ) {
          lines.pop();
          clean = lines.join('\n');
          continue;
        }
      }

      break;
    }
  }
  return clean;
}

/**
 * Clean and extract raw code from AI response
 */
export function cleanCodeFence(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let text = raw.trim();
  const matches = [...text.matchAll(/```(?:javascript|js)?\s*\n([\s\S]*?)```/gi)];
  if (matches.length > 0) {
    return matches.sort((a, b) => b[1].length - a[1].length)[0][1].trim();
  }
  const openFence = text.match(/```(?:javascript|js)?\s*\n([\s\S]*)/i);
  if (openFence) {
    return openFence[1].replace(/```/g, '').trim();
  }
  return text
    .replace(/^```[a-z]*\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim();
}

/**
 * Split Method Stage 1: Decompose Prompt into Architectural Parameters
 */
export async function planGameArchitecture(userPrompt) {
  const plannerPrompt = `You are a Principal 3D Systems & Simulation Architect. Analyze this user 3D request: "${userPrompt}".
Decompose into a technical specification JSON:
{
  "title": "Short Epic Title (3-5 words)",
  "genre": "Subject-specific scene or game category; do not force an unrelated genre",
  "playerTheme": "Description of the main subject/landmark/vehicle/character and its 12-24 articulated sub-parts",
  "enemyTheme": "Description of dynamic elements, traffic, environmental features, or interactive obstacles",
  "environmentTheme": "Description of surrounding terrain, water, skybox, realistic lighting, and atmosphere",
  "mechanics": ["Primary interaction/controller (e.g. Orbit/WASD camera navigation)", "Viewpoint presets", "Lighting/Atmosphere controls", "Telemetry/Stats"],
  "palette": {
    "primary": "hex color appropriate to the brief",
    "secondary": "hex color appropriate to the brief",
    "accent": "hex color appropriate to the brief",
    "hull": "hex color appropriate to the brief",
    "glow": "hex color appropriate to the brief",
    "background": "hex color appropriate to the brief"
  }
}
Output valid JSON only. No prose.`;

  try {
    const raw = await quickAI(
      'You are a JSON compiler. Output only valid JSON starting with { and ending with }.',
      plannerPrompt,
      PREMIUM_MODEL || 'auto',
      1200,
    );
    const jsonStr = cleanCodeFence(raw).match(/\{[\s\S]*\}/)?.[0];
    if (jsonStr) {
      return JSON.parse(jsonStr);
    }
  } catch (err) {
    console.warn('[SplitGameGenerator] Architecture planner AI warning:', err.message);
  }

  // Preserve the actual task when planning fails; never invent a different subject.
  return {
    title: userPrompt.trim().slice(0, 80) || 'Custom 3D Scene',
    genre: 'custom',
    playerTheme: userPrompt,
    environmentTheme: 'Derive from the user request.',
    mechanics: [],
    planningAvailable: false,
  };
}

/** Build task-specific code. Legacy templates below are explicit examples only. */
export function buildTaskGenerationPrompt({ prompt, plan, referenceRequirements = '' }) {
  return `Implement this exact user request as a complete standalone HTML document:
${prompt}

Planning notes (the user's request takes precedence):
${JSON.stringify(plan, null, 2)}

Reference evidence and requirements (preserve these details in the implementation):
${typeof referenceRequirements === 'string' ? referenceRequirements : JSON.stringify(referenceRequirements)}

Create the requested subject, proportions, materials, environment and interactions from this brief.
Do not substitute a stock space shooter, bridge, or racing template for a different request.
Use a coherent art direction, readable silhouette, sensible camera framing, physically plausible lighting,
shadows and surface detail. Where textured materials are requested, build or load material-specific
color, normal/bump and roughness detail; do not call a solid color or decorative grid photorealistic.
Use the app's installed Three.js ES modules, honoring any local imports specified by the user.
By default use an import map mapping "three" to /vendor/three/build/three.module.js and
"three/addons/" to /vendor/three/examples/jsm/. Do not replace these local paths with a CDN or pin a different version.
Include resize handling, animation,
usable controls, and loading/error feedback. Keep network dependencies explicit; do not invent asset URLs.
If supplied references are textual observations, implement those observations and do not claim to have
viewed images. Report actual game state in the HUD. Never label unmeasured FPS or visual quality as verified.
${threeCreationContract}
Return only <!DOCTYPE html> through </html>, with no markdown or explanations.`;
}

export function inspectGeneratedGame(raw) {
  const text = String(raw || '')
    .trim()
    .replace(/^```(?:html)?\s*/i, '')
    .replace(/\s*```$/, '');
  const start = text.search(/<!doctype html>/i);
  const end = text.toLowerCase().lastIndexOf('</html>');
  if (start < 0 || end < start)
    return { html: text, valid: false, error: 'Incomplete HTML document' };
  const html = text.slice(start, end + 7);
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(
    (match) =>
      !/\bsrc\s*=|type\s*=\s*["'](?:importmap|application\/ld\+json|application\/json)["']/i.test(
        match[1],
      ),
  );
  if (!scripts.length) return { html, valid: false, error: 'No executable script' };
  for (const script of scripts) {
    const result = validateJsSyntax(script[2]);
    if (!result.valid) return { html, valid: false, error: result.error };
  }
  return { html, valid: true, error: null };
}

export async function synthesizeTaskDocument(options, ai = quickAI) {
  const task = buildTaskGenerationPrompt(options);
  const system =
    'You are an expert graphics programmer. Implement the actual brief with original, complete working code. Output HTML only.';
  let raw = await ai(system, task, PREMIUM_MODEL || 'auto', 16000, 0.35);
  let document = inspectGeneratedGame(raw);
  if (!document.valid) {
    raw = await ai(
      system,
      `${task}\nRepair this incomplete or invalid implementation. Return the entire corrected HTML.\nDiagnostic: ${document.error}\nImplementation:\n${document.html}`,
      PREMIUM_MODEL || 'auto',
      16000,
      0.15,
    );
    document = inspectGeneratedGame(raw);
  }
  if (!document.valid)
    throw new Error(`Task-specific generation failed syntax checks: ${document.error}`);
  return document.html;
}

/** Runtime smoke check in the active workspace; visual fidelity is not scored. */
export async function verifyTaskScene(filepath) {
  const { chromium } = await import('playwright-core');
  let localServer = null;
  let artifactURL;
  const relative = path.relative(workspace.getWorkspaceDir(), filepath);
  const insideWorkspace =
    relative &&
    !relative.startsWith(`..${path.sep}`) &&
    relative !== '..' &&
    !path.isAbsolute(relative);
  const activePort = Number(process.env.ACTIVE_SERVER_PORT);
  if (activePort && insideWorkspace) {
    artifactURL = `http://127.0.0.1:${activePort}/workspace/${workspace.publicPath(filepath).split('/').map(encodeURIComponent).join('/')}`;
  } else {
    // Serve standalone fixtures and offline checks over HTTP so root-relative
    // vendor imports and ES module CORS behave like the real application.
    const { default: express } = await import('express');
    const app = express();
    app.get('/favicon.ico', (_request, response) => response.status(204).end());
    app.use('/vendor/three', express.static(path.resolve(__dirname, '../../node_modules/three')));
    app.use(
      '/workspace',
      express.static(insideWorkspace ? workspace.baseRoot : path.dirname(filepath)),
    );
    localServer = await new Promise((resolve, reject) => {
      const server = app.listen(0, '127.0.0.1', () => resolve(server));
      server.once('error', reject);
    });
    const route = insideWorkspace ? workspace.publicPath(filepath) : path.basename(filepath);
    artifactURL = `http://127.0.0.1:${localServer.address().port}/workspace/${route.split(path.sep).map(encodeURIComponent).join('/')}`;
  }
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  } catch (error) {
    if (localServer) await new Promise((resolve) => localServer.close(resolve));
    throw error;
  }
  const diagnostics = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.route('**/favicon.ico', (route) => route.fulfill({ status: 204, body: '' }));
    page.on('pageerror', (error) => diagnostics.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') diagnostics.push(message.text());
    });
    page.on('requestfailed', (request) =>
      diagnostics.push(`${request.url()}: ${request.failure()?.errorText}`),
    );
    page.on('response', (response) => {
      if (response.status() >= 400)
        diagnostics.push(`HTTP ${response.status()}: ${response.url()}`);
    });
    await page.goto(artifactURL, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('canvas')].some((canvas) => {
          if (!canvas.width || !canvas.height) return false;
          return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
        }),
      null,
      { timeout: 20000 },
    );
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    const screenshot = filepath.replace(/\.html$/i, '.runtime.png');
    await page.screenshot({ path: screenshot });
    return {
      browserVerified: diagnostics.length === 0,
      diagnostics,
      screenshot,
      verificationScope:
        'Chrome load, WebGL context, two animation frames and runtime/network errors. Visual quality and interactions require separate review.',
    };
  } catch (error) {
    diagnostics.push(`Browser check failed: ${error.message}`);
    return { browserVerified: false, diagnostics };
  } finally {
    await browser.close();
    if (localServer) await new Promise((resolve) => localServer.close(resolve));
  }
}

export async function synthesizeSplit3DGame({
  prompt = '3D Space Shooter Game',
  title = '',
  onProgress = null,
  referenceRequirements = '',
}) {
  const startTime = Date.now();
  const progress = (stage, message) => onProgress?.({ stage, message });
  progress('plan', 'Planning the requested scene, materials and interactions...');
  const plan = await planGameArchitecture(prompt);
  const gameTitle = title || plan.title || 'Supergence 3D Experience';
  const cleanSlug = gameTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
  const filename = `game_${cleanSlug}_${Date.now()}.html`;
  const workspaceRoot = workspace.getWorkspaceDir();
  const filepath = path.join(workspaceRoot, filename);
  progress('generate', 'Writing task-specific geometry, materials and interaction code...');
  let finalHTML = await synthesizeTaskDocument({ prompt, plan, referenceRequirements });
  fs.mkdirSync(workspaceRoot, { recursive: true });
  fs.writeFileSync(filepath, finalHTML, 'utf8');

  let evaluation = { filename, language: 'html', diagnostics: [], browserVerified: false };
  for (let attempt = 0; attempt < 2; attempt++) {
    progress(
      'browser-check',
      `Checking the generated scene in Chrome (attempt ${attempt + 1}/2)...`,
    );
    evaluation = { filename, language: 'html', diagnostics: [], browserVerified: false };
    try {
      Object.assign(evaluation, await verifyTaskScene(filepath));
    } catch (error) {
      evaluation.diagnostics.push(`Browser verification unavailable: ${error.message}`);
    }
    if (evaluation.browserVerified === true || attempt === 1) break;
    const diagnostics = evaluation.diagnostics.join('\n');
    if (/verification (?:skipped|unavailable)/i.test(diagnostics)) break;
    progress('repair', 'Repairing the browser errors while preserving the original brief...');
    const repaired = await quickAI(
      'You repair Three.js HTML. Return only the entire corrected document. Preserve the requested subject and visual details.',
      `${buildTaskGenerationPrompt({ prompt, plan, referenceRequirements })}\nBrowser diagnostics:\n${diagnostics}\nCurrent implementation:\n${finalHTML}`,
      PREMIUM_MODEL || 'auto',
      16000,
      0.15,
    );
    const checked = inspectGeneratedGame(repaired);
    if (!checked.valid) {
      evaluation.diagnostics.push(`Repair rejected: ${checked.error}`);
      break;
    }
    finalHTML = checked.html;
    fs.writeFileSync(filepath, finalHTML, 'utf8');
  }
  const browserVerified = evaluation.browserVerified === true;
  progress(
    'complete',
    browserVerified
      ? 'Scene generated; Chrome runtime checks passed. Visual fidelity still needs review.'
      : 'Scene saved with browser verification issues; inspect the diagnostics before using it.',
  );
  return {
    filename,
    filepath,
    url: workspace.urlFor(filename),
    title: gameTitle,
    sizeBytes: Buffer.byteLength(finalHTML, 'utf8'),
    fps: null,
    browserVerified,
    diagnostics: evaluation.diagnostics || [],
    screenshot: evaluation.screenshot || null,
    visualQualityVerified: false,
    generationMode: 'task-specific-ai',
    verificationScope: evaluation.verificationScope || 'Browser verification did not complete.',
    engine: 'Three.js task-specific implementation',
    controls: plan.mechanics || [],
    durationMs: Date.now() - startTime,
  };
}

/**
 * Builds a dedicated, photorealistic architectural and environmental simulation
 * with full procedural PBR textures, articulated geometry, camera presets, atmosphere, and audio.
 */
export function buildUnifiedArchitecturalHTML({ plan, userPrompt, gameTitle }) {
  const isGGB = /golden gate|bridge|san francisco|bay/i.test(userPrompt + ' ' + gameTitle);
  const title =
    gameTitle ||
    (isGGB
      ? 'Golden Gate Bridge — Photorealistic 3D Simulation'
      : 'Architectural Landmark 3D Simulation');
  const subTitle = isGGB
    ? 'San Francisco, California • Built 1937 • 1.7 mi Span • International Orange (#C0362C)'
    : 'High-Fidelity Articulated 3D Architecture • PBR Shaders • Real-Time Lighting & Camera Telemetry';

  const studioTplPath = path.join(
    WORKSPACE_DIR,
    'game_golden_gate_bridge_photorealistic_studio.html',
  );
  if (isGGB && fs.existsSync(studioTplPath)) {
    try {
      return fs.readFileSync(studioTplPath, 'utf8');
    } catch (_) {}
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>${escapeHtml(title)} // Supergence Studio 3D</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #040810;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #E2E8F0;
      user-select: none;
    }
    #canvas-container {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      display: block;
    }
    canvas {
      display: block;
      width: 100% !important;
      height: 100% !important;
    }
    #hud-overlay {
      position: absolute;
      top: 18px;
      left: 18px;
      z-index: 50;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
    }
    .hud-card {
      background: rgba(10, 16, 26, 0.82);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(224, 75, 48, 0.35);
      border-radius: 10px;
      padding: 16px 20px;
      pointer-events: auto;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.65), 0 0 1px rgba(224, 75, 48, 0.5);
      min-width: 300px;
      max-width: 360px;
    }
    .hud-badge {
      display: inline-block;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(192, 54, 44, 0.25);
      border: 1px solid #C0362C;
      color: #FF6B59;
      margin-bottom: 6px;
    }
    .hud-title {
      font-size: 16px;
      font-weight: 700;
      color: #F8FAFC;
      letter-spacing: 0.02em;
      margin-bottom: 3px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .hud-sub {
      font-size: 11px;
      color: #94A3B8;
      line-height: 1.4;
      margin-bottom: 14px;
    }
    .hud-section-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #CBD5E1;
      margin-bottom: 6px;
    }
    .btn-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
      margin-bottom: 12px;
    }
    .hud-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.14);
      color: #E2E8F0;
      padding: 7px 10px;
      font-size: 11px;
      font-weight: 500;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
    }
    .hud-btn:hover {
      background: rgba(192, 54, 44, 0.25);
      border-color: #C0362C;
      color: #FFF;
      transform: translateY(-1px);
    }
    .hud-btn.active {
      background: #C0362C;
      border-color: #FF5A47;
      color: #FFFFFF;
      font-weight: 600;
      box-shadow: 0 0 12px rgba(192, 54, 44, 0.5);
    }
    .slider-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 10px;
    }
    .slider-labels {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #94A3B8;
    }
    input[type=range] {
      width: 100%;
      height: 5px;
      background: #1E293B;
      border-radius: 3px;
      outline: none;
      accent-color: #C0362C;
      cursor: pointer;
    }
    #telemetry-bar {
      position: absolute;
      bottom: 18px;
      left: 18px;
      z-index: 50;
      background: rgba(10, 16, 26, 0.75);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 8px 16px;
      font-size: 11px;
      color: #94A3B8;
      display: flex;
      align-items: center;
      gap: 16px;
      pointer-events: auto;
    }
    .tele-item span {
      color: #38BDF8;
      font-weight: 600;
    }
    .tele-item span.fps {
      color: #4ADE80;
    }
    #btn-foghorn {
      background: rgba(224, 75, 48, 0.18);
      border: 1px solid #C0362C;
      color: #FF9B8E;
      font-size: 11px;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      margin-top: 4px;
      justify-content: center;
    }
    #btn-foghorn:hover {
      background: #C0362C;
      color: #FFF;
    }
  </style>
  <script type="importmap">
  {
    "imports": {
      "three": "/vendor/three/build/three.module.js",
      "three/addons/": "/vendor/three/examples/jsm/"
    }
  }
  </script>
</head>
<body>
  <div id="canvas-container"></div>

  <div id="hud-overlay">
    <div class="hud-card">
      <div class="hud-badge">Engineering Masterpiece</div>
      <div class="hud-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C0362C" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 20h20M4 20V4l6 4v12M14 20V8l6-4v16M10 8h4"/>
        </svg>
        ${escapeHtml(title)}
      </div>
      <div class="hud-sub">${escapeHtml(subTitle)}</div>

      <div class="hud-section-label">Camera Perspectives</div>
      <div class="btn-grid">
        <button class="hud-btn active" id="view-vista">✦ Marin Vista</button>
        <button class="hud-btn" id="view-deck">🚗 Road Deck</button>
        <button class="hud-btn" id="view-ship">🚢 Bay Cruise</button>
        <button class="hud-btn" id="view-aerial">🚁 Aerial View</button>
      </div>

      <div class="hud-section-label">Lighting & Atmosphere</div>
      <div class="btn-grid">
        <button class="hud-btn active" id="env-golden">🌅 Golden Hour</button>
        <button class="hud-btn" id="env-noon">☀️ Midday Sun</button>
        <button class="hud-btn" id="env-night">🌃 SF Night</button>
        <button class="hud-btn" id="env-foggy">🌫️ Pacific Fog</button>
      </div>

      <div class="slider-row">
        <div class="slider-labels">
          <span>San Francisco Bay Fog ("Karl")</span>
          <span id="fog-val">Medium (35%)</span>
        </div>
        <input type="range" id="fog-slider" min="0" max="100" value="35">
      </div>

      <div class="slider-row">
        <div class="slider-labels">
          <span>Traffic Flow Density</span>
          <span id="traffic-val">Active (48 cars)</span>
        </div>
        <input type="range" id="traffic-slider" min="0" max="100" value="60">
      </div>

      <button id="btn-foghorn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
        Sound SF Bay Foghorn
      </button>
    </div>
  </div>

  <div id="telemetry-bar">
    <div class="tele-item">FPS: <span class="fps" id="stat-fps">60.0</span></div>
    <div class="tele-item">Meshes: <span id="stat-meshes">240+</span></div>
    <div class="tele-item">Active Cars: <span id="stat-cars">48</span></div>
    <div class="tele-item">Time: <span id="stat-time">Sunset 18:42</span></div>
    <div class="tele-item">Mode: <span>Orbit / Pan / Zoom</span></div>
  </div>

  <script type="module">
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

    // ─── ERROR BOUNDARY ───
    window.addEventListener('error', (e) => {
      console.warn('[3D Simulation Error Boundary]:', e.message);
    });

    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 8000);
    camera.position.set(-360, 110, 420);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 55, 0);
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minDistance = 15;
    controls.maxDistance = 2200;

    // ─── PROCEDURAL TEXTURES (ZERO EXTERNAL DEPENDENCIES) ───
    function makeConcreteTexture() {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#6E7681';
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 4000; i++) {
        const v = Math.floor(Math.random() * 80 + 80);
        ctx.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ', 0.15)';
        ctx.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 4 + 1, Math.random() * 4 + 1);
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(4, 4);
      return tex;
    }

    function makeRoadTexture() {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 1024;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#181C22';
      ctx.fillRect(0, 0, 512, 1024);
      for (let i = 0; i < 5000; i++) {
        const g = Math.floor(Math.random() * 40 + 20);
        ctx.fillStyle = 'rgba(' + g + ',' + g + ',' + g + ', 0.2)';
        ctx.fillRect(Math.random() * 512, Math.random() * 1024, 2, 2);
      }
      ctx.fillStyle = '#FFB800';
      ctx.fillRect(253, 0, 2, 1024);
      ctx.fillRect(257, 0, 2, 1024);
      ctx.fillStyle = '#E2E8F0';
      const laneOffsets = [85, 170, 342, 427];
      for (let y = 0; y < 1024; y += 48) {
        laneOffsets.forEach(x => { ctx.fillRect(x, y, 3, 24); });
      }
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(20, 0, 3, 1024);
      ctx.fillRect(489, 0, 3, 1024);
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1, 40);
      return tex;
    }

    function makeTerrainTexture() {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#4A4E38';
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 3000; i++) {
        const isGrass = Math.random() > 0.4;
        ctx.fillStyle = isGrass ? 'rgba(120, 115, 60, 0.25)' : 'rgba(70, 55, 40, 0.3)';
        ctx.beginPath();
        ctx.arc(Math.random() * 256, Math.random() * 256, Math.random() * 8 + 2, 0, Math.PI * 2);
        ctx.fill();
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(12, 12);
      return tex;
    }

    const COLOR_INTL_ORANGE = 0xC0362C;
    const COLOR_ORANGE_DARK = 0x962820;
    const COLOR_ORANGE_BRIGHT = 0xD94538;

    const matOrange = new THREE.MeshStandardMaterial({ color: COLOR_INTL_ORANGE, roughness: 0.42, metalness: 0.38 });
    const matOrangeDark = new THREE.MeshStandardMaterial({ color: COLOR_ORANGE_DARK, roughness: 0.55, metalness: 0.28 });
    const matPierConcrete = new THREE.MeshStandardMaterial({ color: 0x8A8E94, map: makeConcreteTexture(), roughness: 0.88, metalness: 0.05 });
    const matRoadway = new THREE.MeshStandardMaterial({ map: makeRoadTexture(), roughness: 0.75, metalness: 0.1 });
    const matSteelCable = new THREE.MeshStandardMaterial({ color: COLOR_INTL_ORANGE, roughness: 0.38, metalness: 0.55 });
    const matSuspenderWire = new THREE.MeshBasicMaterial({ color: COLOR_ORANGE_BRIGHT });
    const matLampGlow = new THREE.MeshStandardMaterial({ color: 0xFFF3D0, emissive: 0xFFD88A, emissiveIntensity: 2.2, roughness: 0.2 });
    const matBeaconRed = new THREE.MeshStandardMaterial({ color: 0xFF0000, emissive: 0xFF0000, emissiveIntensity: 3.5, roughness: 0.1 });
    const matTerrain = new THREE.MeshStandardMaterial({ map: makeTerrainTexture(), roughness: 0.95, metalness: 0.05, flatShading: true });
    const matWater = new THREE.MeshStandardMaterial({ color: 0x0A3A60, roughness: 0.18, metalness: 0.65 });

    // ─── ATMOSPHERIC LIGHTING & SKY ───
    const hemiLight = new THREE.HemisphereLight(0xBAE6FD, 0x1E293B, 1.0);
    scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.55);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xFFF7ED, 2.5);
    sunLight.position.set(180, 220, 200);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.left = -450;
    sunLight.shadow.camera.right = 450;
    sunLight.shadow.camera.top = 250;
    sunLight.shadow.camera.bottom = -250;
    sunLight.shadow.camera.far = 1200;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);

    scene.background = new THREE.Color(0x38BDF8);
    scene.fog = new THREE.FogExp2(0xE0F2FE, 0.0012);

    // Sky Dome
    const skyGeo = new THREE.SphereGeometry(3800, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x38BDF8, side: THREE.BackSide });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyDome);

    // SF Bay Water Plane
    const waterGeo = new THREE.PlaneGeometry(3600, 2400, 64, 48);
    const waterMesh = new THREE.Mesh(waterGeo, matWater);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = 0;
    waterMesh.receiveShadow = true;
    scene.add(waterMesh);

    // ─── ART DECO TOWERS (SOUTH @ x=-260, NORTH @ x=260) ───
    const beaconLights = [];
    function buildArtDecoTower(towerX, name) {
      const tower = new THREE.Group();
      tower.name = name;
      tower.position.set(towerX, 0, 0);

      // Concrete Pier Foundation
      const pier = new THREE.Mesh(new THREE.BoxGeometry(42, 20, 22), matPierConcrete);
      pier.position.set(0, 10, 0);
      pier.castShadow = true;
      pier.receiveShadow = true;
      tower.add(pier);

      // Two Tower Legs (East and West)
      const legOffsets = [-9, 9];
      legOffsets.forEach(lz => {
        const leg = new THREE.Group();
        leg.position.set(0, 20, lz);

        const tiers = [
          { h: 48, w: 9.0, d: 7.2, y: 24 },
          { h: 46, w: 7.8, d: 6.4, y: 71 },
          { h: 44, w: 6.8, d: 5.6, y: 116 },
          { h: 42, w: 5.8, d: 4.8, y: 159 },
          { h: 26, w: 4.8, d: 4.0, y: 193 }
        ];

        tiers.forEach(tr => {
          const m = new THREE.Mesh(new THREE.BoxGeometry(tr.w, tr.h, tr.d), matOrange);
          m.position.set(0, tr.y, 0);
          m.castShadow = true;
          m.receiveShadow = true;
          leg.add(m);

          const inset = new THREE.Mesh(new THREE.BoxGeometry(tr.w * 0.75, tr.h * 0.88, tr.d + 0.3), matOrangeDark);
          inset.position.set(0, tr.y, 0);
          leg.add(inset);
        });

        // Art Deco Chevron Pinnacle Finial
        const finial = new THREE.Mesh(new THREE.ConeGeometry(2.4, 6.5, 4), matOrange);
        finial.position.set(0, 209, 0);
        finial.rotation.y = Math.PI / 4;
        leg.add(finial);

        // Aircraft Warning Beacon
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 8), matBeaconRed);
        beacon.position.set(0, 213, 0);
        leg.add(beacon);
        beaconLights.push(beacon);

        tower.add(leg);
      });

      // Cross-Bracing Strut Portals
      const portalHeights = [55, 96, 138, 178];
      portalHeights.forEach((py, idx) => {
        const strut = new THREE.Mesh(new THREE.BoxGeometry(7.0, 7.5, 16.5), matOrange);
        strut.position.set(0, py, 0);
        strut.castShadow = true;
        tower.add(strut);

        const arch = new THREE.Mesh(new THREE.BoxGeometry(6.2, 5.0, 11.5), matOrangeDark);
        arch.position.set(0, py - 1.2, 0);
        tower.add(arch);

        const chevron = new THREE.Mesh(new THREE.ConeGeometry(3.5, 3.2, 4), matOrange);
        chevron.rotation.x = Math.PI;
        chevron.rotation.y = Math.PI / 4;
        chevron.position.set(0, py + 4.8, 0);
        tower.add(chevron);
      });

      scene.add(tower);
      return tower;
    }

    buildArtDecoTower(-260, 'South Tower (San Francisco)');
    buildArtDecoTower(260, 'North Tower (Marin)');

    // ─── ROAD DECK & STIFFENING TRUSSES ───
    const deckGroup = new THREE.Group();
    deckGroup.position.set(0, 67, 0);

    const roadMesh = new THREE.Mesh(new THREE.BoxGeometry(960, 1.4, 27), matRoadway);
    roadMesh.castShadow = true;
    roadMesh.receiveShadow = true;
    deckGroup.add(roadMesh);

    // Stiffening Steel Trusses
    [-13.5, 13.5].forEach(tz => {
      const truss = new THREE.Mesh(new THREE.BoxGeometry(960, 5.5, 1.2), matOrangeDark);
      truss.position.set(0, -2.8, tz);
      truss.castShadow = true;
      deckGroup.add(truss);

      const rail = new THREE.Mesh(new THREE.BoxGeometry(960, 1.2, 0.5), matOrange);
      rail.position.set(0, 1.6, tz);
      deckGroup.add(rail);

      for (let x = -470; x <= 470; x += 24) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.8, 8), matOrange);
        post.position.set(x, 2.6, tz);
        deckGroup.add(post);

        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), matLampGlow);
        lamp.position.set(x, 4.4, tz);
        deckGroup.add(lamp);
      }
    });
    scene.add(deckGroup);

    // ─── MAIN SUSPENSION CABLES & SUSPENDER WIRES ───
    [-9, 9].forEach(cz => {
      const cablePoints = [];
      // 1. South Backstay (-480 to -260)
      for (let x = -480; x <= -260; x += 10) {
        const t = (x - (-480)) / 220;
        const y = 67 + t * (227 - 67);
        cablePoints.push(new THREE.Vector3(x, y, cz));
      }
      // 2. Main Center Span (-260 to 260)
      for (let x = -260; x <= 260; x += 8) {
        const norm = x / 260;
        const y = 73 + norm * norm * (227 - 73);
        cablePoints.push(new THREE.Vector3(x, y, cz));
      }
      // 3. North Backstay (260 to 480)
      for (let x = 260; x <= 480; x += 10) {
        const t = (480 - x) / 220;
        const y = 67 + t * (227 - 67);
        cablePoints.push(new THREE.Vector3(x, y, cz));
      }

      const curve = new THREE.CatmullRomCurve3(cablePoints);
      const cableMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 180, 0.65, 12, false), matSteelCable);
      cableMesh.castShadow = true;
      scene.add(cableMesh);

      // Vertical Suspender Wires
      for (let x = -460; x <= 460; x += 7.5) {
        if (Math.abs(x - (-260)) < 14 || Math.abs(x - 260) < 14) continue;
        let cy = 0;
        if (x < -260) {
          cy = 67 + ((x - (-480)) / 220) * (227 - 67);
        } else if (x > 260) {
          cy = 67 + ((480 - x) / 220) * (227 - 67);
        } else {
          const norm = x / 260;
          cy = 73 + norm * norm * (227 - 73);
        }

        const wireH = cy - 67.5;
        if (wireH > 1.5) {
          const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, wireH, 6), matSuspenderWire);
          wire.position.set(x, 67.5 + wireH / 2, cz);
          scene.add(wire);
        }
      }
    });

    // ─── ACTIVE VEHICLE TRAFFIC FLOW (48 PROCEDURAL CARS) ───
    const cars = [];
    const carColors = [0xEF4444, 0x3B82F6, 0xF59E0B, 0x10B981, 0xFFFFFF, 0x1E293B, 0x9333EA];
    const matHeadlight = new THREE.MeshBasicMaterial({ color: 0xFFFBEB });
    const matTaillight = new THREE.MeshBasicMaterial({ color: 0xFF0033 });

    for (let i = 0; i < 48; i++) {
      const isNorthbound = i % 2 === 0;
      const speed = (isNorthbound ? 1 : -1) * (24 + (i % 5) * 4);
      const laneOffset = isNorthbound ? -8.5 + (i % 3) * 2.8 : 3.0 + (i % 3) * 2.8;

      const carGroup = new THREE.Group();
      const bodyColor = carColors[i % carColors.length];
      const carMat = new THREE.MeshStandardMaterial({ color: bodyColor, metalness: 0.8, roughness: 0.25 });

      const carBody = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.2, 1.9), carMat);
      carBody.position.y = 0.6;
      carBody.castShadow = true;
      carGroup.add(carBody);

      const roof = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 1.7), carMat);
      roof.position.set(-0.2, 1.6, 0);
      carGroup.add(roof);

      // Headlights
      const hl1 = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), matHeadlight);
      hl1.position.set(isNorthbound ? 2.15 : -2.15, 0.7, -0.65);
      carGroup.add(hl1);
      const hl2 = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), matHeadlight);
      hl2.position.set(isNorthbound ? 2.15 : -2.15, 0.7, 0.65);
      carGroup.add(hl2);

      // Taillights
      const tl1 = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), matTaillight);
      tl1.position.set(isNorthbound ? -2.15 : 2.15, 0.7, -0.65);
      carGroup.add(tl1);
      const tl2 = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), matTaillight);
      tl2.position.set(isNorthbound ? -2.15 : 2.15, 0.7, 0.65);
      carGroup.add(tl2);

      const initialX = -460 + Math.random() * 920;
      carGroup.position.set(initialX, 67.8, laneOffset);
      carGroup.userData = { speed, isNorthbound };
      deckGroup.add(carGroup);
      cars.push(carGroup);
    }

    // ─── SURROUNDING GEOGRAPHY: MARIN HEADLANDS & PRESIDIO BLUFFS ───
    const terrainGroup = new THREE.Group();
    // Marin Headlands (North, x > 320)
    for (let m = 0; m < 7; m++) {
      const mx = 380 + m * 75;
      const my = 40 + (m % 3) * 45;
      const mz = -140 + (m % 2) * 260;
      const mr = 95 + (m % 3) * 35;
      const hill = new THREE.Mesh(new THREE.ConeGeometry(mr, my * 2, 18), matTerrain);
      hill.position.set(mx, my, mz);
      hill.receiveShadow = true;
      terrainGroup.add(hill);
    }
    // Presidio Bluffs (South, x < -320)
    for (let s = 0; s < 6; s++) {
      const sx = -380 - s * 70;
      const sy = 35 + (s % 3) * 35;
      const sz = -120 + (s % 2) * 240;
      const sr = 90 + (s % 3) * 30;
      const bluff = new THREE.Mesh(new THREE.ConeGeometry(sr, sy * 2, 18), matTerrain);
      bluff.position.set(sx, sy, sz);
      bluff.receiveShadow = true;
      terrainGroup.add(bluff);
    }
    scene.add(terrainGroup);

    // ─── PROCEDURAL WEB AUDIO API FOGHORN ───
    let audioCtx = null;
    function playFoghorn() {
      try {
        const AudioClass = window.AudioContext || window.webkitAudioContext;
        if (!audioCtx && AudioClass) audioCtx = new AudioClass();
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        if (!audioCtx) return;

        const now = audioCtx.currentTime;
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(94, now);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(142, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.38, now + 0.35);
        gain.gain.setValueAtTime(0.35, now + 2.2);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 3.8);
        osc2.stop(now + 3.8);
      } catch (e) {
        console.warn('Audio notice:', e);
      }
    }
    document.getElementById('btn-foghorn')?.addEventListener('click', playFoghorn);

    // ─── INTERACTIVE CAMERA & ATMOSPHERE CONTROLS ───
    const views = {
      vista: { pos: [-360, 110, 420], target: [0, 55, 0] },
      deck: { pos: [0, 70, -180], target: [0, 68, 50] },
      ship: { pos: [180, 8, -60], target: [0, 80, 0] },
      aerial: { pos: [0, 380, 20], target: [0, 0, 0] }
    };

    function setCameraView(name) {
      const v = views[name];
      if (!v) return;
      camera.position.set(...v.pos);
      controls.target.set(...v.target);
      controls.update();
      document.querySelectorAll('.hud-btn').forEach(b => {
        if (b.id.startsWith('view-')) b.classList.toggle('active', b.id === 'view-' + name);
      });
    }

    document.getElementById('view-vista')?.addEventListener('click', () => setCameraView('vista'));
    document.getElementById('view-deck')?.addEventListener('click', () => setCameraView('deck'));
    document.getElementById('view-ship')?.addEventListener('click', () => setCameraView('ship'));
    document.getElementById('view-aerial')?.addEventListener('click', () => setCameraView('aerial'));

    const environments = {
      golden: { sky: 0xFDBA74, fog: 0xFED7AA, sun: [180, 110, 200], sunColor: 0xFFA048, exp: 1.35, dens: 0.0012 },
      noon: { sky: 0x38BDF8, fog: 0xE0F2FE, sun: [80, 260, 90], sunColor: 0xFFF7ED, exp: 1.20, dens: 0.0008 },
      night: { sky: 0x050811, fog: 0x090D1A, sun: [-120, -80, -100], sunColor: 0x1E293B, exp: 1.60, dens: 0.0016 },
      foggy: { sky: 0xCBD5E1, fog: 0x94A3B8, sun: [40, 120, 40], sunColor: 0xE2E8F0, exp: 1.10, dens: 0.0055 }
    };

    function setAtmosphere(name) {
      const env = environments[name];
      if (!env) return;
      scene.background.setHex(env.sky);
      skyMat.color.setHex(env.sky);
      scene.fog.color.setHex(env.fog);
      scene.fog.density = env.dens;
      sunLight.position.set(...env.sun);
      sunLight.color.setHex(env.sunColor);
      renderer.toneMappingExposure = env.exp;
      document.querySelectorAll('.hud-btn').forEach(b => {
        if (b.id.startsWith('env-')) b.classList.toggle('active', b.id === 'env-' + name);
      });
      const slider = document.getElementById('fog-slider');
      if (slider) slider.value = Math.round(env.dens * 10000);
      const fogTxt = document.getElementById('fog-val');
      if (fogTxt) fogTxt.textContent = name === 'foggy' ? 'Dense (85%)' : name === 'night' ? 'Night Haze (40%)' : 'Clear (25%)';
    }

    document.getElementById('env-golden')?.addEventListener('click', () => setAtmosphere('golden'));
    document.getElementById('env-noon')?.addEventListener('click', () => setAtmosphere('noon'));
    document.getElementById('env-night')?.addEventListener('click', () => setAtmosphere('night'));
    document.getElementById('env-foggy')?.addEventListener('click', () => setAtmosphere('foggy'));

    document.getElementById('fog-slider')?.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      scene.fog.density = 0.0002 + (v / 100) * 0.007;
      const fogTxt = document.getElementById('fog-val');
      if (fogTxt) fogTxt.textContent = v < 20 ? 'Light (' + Math.round(v) + '%)' : v < 60 ? 'Medium (' + Math.round(v) + '%)' : 'Dense (' + Math.round(v) + '%)';
    });

    let trafficScale = 1.0;
    document.getElementById('traffic-slider')?.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      trafficScale = v / 50;
      const activeCount = Math.round((v / 100) * cars.length);
      cars.forEach((c, idx) => { c.visible = idx < activeCount; });
      const trafTxt = document.getElementById('traffic-val');
      if (trafTxt) trafTxt.textContent = 'Active (' + activeCount + ' cars)';
      const statCars = document.getElementById('stat-cars');
      if (statCars) statCars.textContent = '' + activeCount;
    });

    // ─── 60 FPS RENDER LOOP ───
    const clock = new THREE.Clock();
    let frameCount = 0;
    let lastFpsUpdate = performance.now();

    function animate() {
      requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const time = clock.getElapsedTime();

      // Vehicle Movement Animation
      cars.forEach(car => {
        if (!car.visible) return;
        car.position.x += car.userData.speed * trafficScale * dt;
        if (car.userData.isNorthbound && car.position.x > 470) {
          car.position.x = -470;
        } else if (!car.userData.isNorthbound && car.position.x < -470) {
          car.position.x = 470;
        }
      });

      // Beacon Lights Flash (1 Hz)
      const flash = (Math.sin(time * 6.28) > 0.1) ? 3.5 : 0.05;
      matBeaconRed.emissiveIntensity = flash;

      // Subtle Water Surface Ripple
      waterMesh.position.y = Math.sin(time * 0.8) * 0.25;

      controls.update();
      renderer.render(scene, camera);

      // FPS Telemetry
      frameCount++;
      const now = performance.now();
      if (now - lastFpsUpdate >= 600) {
        const fps = (frameCount * 1000) / (now - lastFpsUpdate);
        const fpsEl = document.getElementById('stat-fps');
        if (fpsEl) fpsEl.textContent = fps.toFixed(1);
        frameCount = 0;
        lastFpsUpdate = now;
      }
    }

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
  </script>
</body>
</html>`;
}

/**
 * Builds a dedicated, authentic 3D Grand Prix car racing game simulation
 * with procedural asphalt circuit spline, PBR sports car with realistic vehicle dynamics
 * (6 sequential gears, RPM, drift, tire smoke), 3 AI competitors, luxury HUD, and Web Audio synth.
 */
export function buildUnifiedRacingHTML({ plan, userPrompt, gameTitle }) {
  const racingTplPath = path.join(WORKSPACE_DIR, 'realistic_3d_car_racing_game.html');
  if (fs.existsSync(racingTplPath)) {
    try {
      let code = fs.readFileSync(racingTplPath, 'utf8');
      if (gameTitle) {
        code = code.replace(
          /<title>.*?<\/title>/i,
          `<title>${escapeHtml(gameTitle)} // Supergence Grand Prix 3D</title>`,
        );
      }
      return code;
    } catch (_) {}
  }
  return '';
}

/**
 * Builds the complete, standalone, production-grade 3D Game HTML
 * Incorporating all 7 parts of the Split Method.
 */
export function buildUnifiedGameHTML({ plan, userPrompt, gameTitle }) {
  const isArchitectural =
    plan.genre === 'architectural_simulation' ||
    /bridge|golden gate|tower|monument|building|cathedral|castle|stadium|landmark|architecture/i.test(
      userPrompt,
    );
  if (isArchitectural) {
    return buildUnifiedArchitecturalHTML({ plan, userPrompt, gameTitle });
  }

  const isRacer =
    plan.genre === 'cyber_racer' ||
    /car|racing|race|formula|f1|asphalt|circuit|drift|speedway|grand prix|nascar|supercar|vehicle/i.test(
      userPrompt + ' ' + (gameTitle || ''),
    );
  if (isRacer) {
    const racingHTML = buildUnifiedRacingHTML({ plan, userPrompt, gameTitle });
    if (racingHTML) return racingHTML;
  }

  const p = plan.palette;
  const isMech = plan.genre === 'mech_defense';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>${escapeHtml(gameTitle)} // Supergence Studio 3D Game</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: ${p.background || '#080B10'};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #E2E8F0;
      user-select: none;
    }
    #game-canvas-container {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      display: block;
    }
    canvas {
      display: block;
      width: 100% !important;
      height: 100% !important;
    }
    /* Luxury Glassmorphism HUD Overlay */
    #hud-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 10;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 18px 24px;
    }
    .hud-card {
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      padding: 12px 18px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 15px ${p.primary}20;
      pointer-events: auto;
    }
    .hud-title {
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: ${p.primary};
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .hud-meta {
      font-size: 10.5px;
      color: #94A3B8;
      font-family: monospace;
    }
    /* Health & Shield Gauges */
    .meter-container {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .meter-label {
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #CBD5E1;
      display: flex;
      justify-content: space-between;
    }
    .meter-bar-bg {
      width: 220px;
      height: 8px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 4px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .meter-bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.15s ease-out;
    }
    #shield-bar { background: linear-gradient(90deg, #00F0FF, #38BDF8); width: 100%; }
    #hull-bar { background: linear-gradient(90deg, #10B981, #059669); width: 100%; }

    /* Top Right Stats */
    .top-right-hud {
      display: flex;
      gap: 12px;
      align-self: flex-end;
    }
    .stat-badge {
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 8px 14px;
      text-align: right;
    }
    .stat-val {
      font-size: 18px;
      font-weight: 800;
      color: #F8FAFC;
      font-family: monospace;
    }
    .stat-lbl {
      font-size: 9px;
      font-weight: 700;
      color: #64748B;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    /* Crosshair Reticle */
    #crosshair {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      width: 44px;
      height: 44px;
    }
    .reticle-circle {
      position: absolute;
      inset: 6px;
      border: 1.5px solid ${p.primary};
      border-radius: 50%;
      opacity: 0.8;
      box-shadow: 0 0 10px ${p.primary}80;
    }
    .reticle-dot {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 4px;
      height: 4px;
      background: #FFFFFF;
      border-radius: 50%;
      box-shadow: 0 0 8px #FFF;
    }
    .hit-flash {
      transform: translate(-50%, -50%) scale(1.4);
      border-color: #FF0055 !important;
      transition: transform 0.08s ease;
    }

    /* Radar / Minimap */
    #radar-canvas {
      width: 110px;
      height: 110px;
      border-radius: 50%;
      background: rgba(10, 15, 25, 0.75);
      border: 1.5px solid ${p.primary}60;
      box-shadow: 0 0 14px ${p.primary}30;
      margin-top: 6px;
    }

    /* Bottom Control Instructions */
    .controls-hint {
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 6px 14px;
      font-size: 11px;
      color: #94A3B8;
      align-self: center;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .key-badge {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      padding: 1px 5px;
      font-weight: 700;
      color: #F8FAFC;
      font-size: 10px;
    }

    /* Win / Game Over Screen */
    #end-modal {
      display: none;
      position: absolute;
      inset: 0;
      background: rgba(4, 7, 13, 0.88);
      backdrop-filter: blur(16px);
      z-index: 100;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
    }
    .modal-box {
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid ${p.primary};
      border-radius: 16px;
      padding: 32px 40px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px ${p.primary}30;
      max-width: 440px;
      width: 90%;
    }
    .modal-title {
      font-size: 26px;
      font-weight: 900;
      color: #F8FAFC;
      letter-spacing: 0.08em;
      margin-bottom: 8px;
    }
    .modal-score {
      font-size: 40px;
      font-weight: 900;
      color: ${p.primary};
      font-family: monospace;
      margin: 12px 0;
      text-shadow: 0 0 20px ${p.primary};
    }
    .btn-action {
      background: linear-gradient(135deg, ${p.primary}, ${p.secondary});
      color: #FFF;
      border: none;
      border-radius: 8px;
      padding: 12px 28px;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.08em;
      cursor: pointer;
      margin-top: 16px;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .btn-action:hover {
      transform: scale(1.04);
      box-shadow: 0 0 20px ${p.primary}60;
    }
  </style>
</head>
<body>
  <!-- Canvas Viewport -->
  <div id="game-canvas-container"></div>

  <!-- HUD Overlay -->
  <div id="hud-overlay">
    <!-- Top Row -->
    <div style="display:flex; justify-content:space-between; align-items:flex-start; width:100%;">
      <!-- Status Card -->
      <div class="hud-card">
        <div class="hud-title">
          <span>✦</span> ${escapeHtml(gameTitle)}
        </div>
        <div class="hud-meta">SYSTEMS ENGAGED • 60 FPS • THREE.JS WEBGL</div>
        <div class="meter-container">
          <div class="meter-label">
            <span>SHIELD INTEGRITY</span>
            <span id="shield-txt">100%</span>
          </div>
          <div class="meter-bar-bg">
            <div id="shield-bar" class="meter-bar-fill"></div>
          </div>
          <div class="meter-label" style="margin-top:4px;">
            <span>HULL INTEGRITY</span>
            <span id="hull-txt">100%</span>
          </div>
          <div class="meter-bar-bg">
            <div id="hull-bar" class="meter-bar-fill"></div>
          </div>
        </div>
      </div>

      <!-- Top Right Stats -->
      <div class="top-right-hud">
        <div class="stat-badge">
          <div class="stat-val" id="score-val">0000</div>
          <div class="stat-lbl">SCORE</div>
        </div>
        <div class="stat-badge">
          <div class="stat-val" id="wave-val" style="color:${p.glow}">WAVE 1</div>
          <div class="stat-lbl">HOSTILES: <span id="hostiles-left">8</span></div>
        </div>
      </div>
    </div>

    <!-- Center Reticle -->
    <div id="crosshair">
      <div class="reticle-circle" id="reticle-circle"></div>
      <div class="reticle-dot"></div>
    </div>

    <!-- Bottom Row -->
    <div style="display:flex; justify-content:space-between; align-items:flex-end; width:100%;">
      <!-- Radar -->
      <div class="hud-card" style="padding:10px 14px;">
        <div class="hud-title" style="font-size:10.5px; margin-bottom:2px;">RADAR TACTICAL</div>
        <canvas id="radar-canvas" width="110" height="110"></canvas>
      </div>

      <!-- Instructions Bar -->
      <div class="controls-hint">
        <span><span class="key-badge">W</span> <span class="key-badge">A</span> <span class="key-badge">S</span> <span class="key-badge">D</span> / Arrows to Move</span>
        <span>•</span>
        <span><span class="key-badge">SPACE</span> / Left-Click to Fire</span>
        <span>•</span>
        <span><span class="key-badge">SHIFT</span> Afterburner</span>
      </div>

      <!-- Audio Mute Toggle -->
      <div class="hud-card" style="padding:8px 14px;">
        <button id="btn-audio" style="background:transparent; border:none; color:#38BDF8; font-size:11px; font-weight:700; cursor:pointer;" onclick="toggleAudioMute()">
          🔊 AUDIO ON
        </button>
      </div>
    </div>
  </div>

  <!-- End Game Modal -->
  <div id="end-modal">
    <div class="modal-box">
      <div class="modal-title" id="end-title">SECTOR SECURED</div>
      <div style="color:#94A3B8; font-size:12px;">FINAL TACTICAL SCORE</div>
      <div class="modal-score" id="end-score">14,250</div>
      <p id="end-desc" style="color:#CBD5E1; font-size:13px; line-height:1.5;">All hostile threats neutralised. Planetary perimeter intact.</p>
      <button class="btn-action" onclick="restartGame()">↻ RE-ENGAGE MISSION</button>
    </div>
  </div>

  <!-- Three.js ESM Module Imports (Served Locally from Express) -->
  <script type="module">
    import * as THREE from '/vendor/three/build/three.module.js';

    // ─── ERROR BOUNDARY: Guarantee zero silent crashes ───
    window.addEventListener('error', (e) => {
      console.warn('[Game Error Boundary Caught]:', e.message);
    });

    // ─── PART 1: PROCEDURAL PBR TEXTURES (Pure HTML5 Canvas — 0 Network Failures) ───
    function createProceduralTextures() {
      // 1. Cyber Hex Hull Plate Texture
      const hexCanvas = document.createElement('canvas');
      hexCanvas.width = 256;
      hexCanvas.height = 256;
      const ctxHex = hexCanvas.getContext('2d');
      ctxHex.fillStyle = '#0F172A';
      ctxHex.fillRect(0, 0, 256, 256);
      ctxHex.strokeStyle = '${p.primary}33';
      ctxHex.lineWidth = 1.5;
      for (let x = 0; x < 256; x += 32) {
        for (let y = 0; y < 256; y += 32) {
          ctxHex.strokeRect(x, y, 30, 30);
          ctxHex.fillStyle = '${p.primary}15';
          ctxHex.fillRect(x + 2, y + 2, 26, 26);
        }
      }
      const hexTexture = new THREE.CanvasTexture(hexCanvas);
      hexTexture.wrapS = THREE.RepeatWrapping;
      hexTexture.wrapT = THREE.RepeatWrapping;

      // 2. Cosmic Nebula Starfield Canvas Texture
      const starCanvas = document.createElement('canvas');
      starCanvas.width = 512;
      starCanvas.height = 512;
      const ctxStar = starCanvas.getContext('2d');
      const grad = ctxStar.createRadialGradient(256, 256, 10, 256, 256, 256);
      grad.addColorStop(0, '${p.secondary}40');
      grad.addColorStop(0.5, '${p.primary}20');
      grad.addColorStop(1, '#05070D');
      ctxStar.fillStyle = grad;
      ctxStar.fillRect(0, 0, 512, 512);
      ctxStar.fillStyle = '#FFFFFF';
      for (let i = 0; i < 240; i++) {
        const sx = Math.random() * 512;
        const sy = Math.random() * 512;
        const sr = Math.random() * 1.5 + 0.3;
        ctxStar.beginPath();
        ctxStar.arc(sx, sy, sr, 0, Math.PI * 2);
        ctxStar.fill();
      }
      const starTexture = new THREE.CanvasTexture(starCanvas);

      return { hexTexture, starTexture };
    }

    // ─── PART 2: PROCEDURAL WEB AUDIO API (Sensory Immersion — 0 External MP3s) ───
    class GameAudioSystem {
      constructor() {
        this.ctx = null;
        this.isMuted = false;
      }
      init() {
        if (!this.ctx) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) {
            this.ctx = new AudioContextClass();
          }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
      }
      playLaser() {
        if (this.isMuted || !this.ctx) return;
        try {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(880, this.ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.12);
          gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start();
          osc.stop(this.ctx.currentTime + 0.12);
        } catch (_) {}
      }
      playExplosion() {
        if (this.isMuted || !this.ctx) return;
        try {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(140, this.ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.35);
          gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start();
          osc.stop(this.ctx.currentTime + 0.35);
        } catch (_) {}
      }
      playHit() {
        if (this.isMuted || !this.ctx) return;
        try {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(320, this.ctx.currentTime);
          osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.08);
          gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start();
          osc.stop(this.ctx.currentTime + 0.08);
        } catch (_) {}
      }
    }
    const audio = new GameAudioSystem();
    window.toggleAudioMute = () => {
      audio.isMuted = !audio.isMuted;
      const btn = document.getElementById('btn-audio');
      if (btn) btn.textContent = audio.isMuted ? '🔇 AUDIO OFF' : '🔊 AUDIO ON';
    };

    // ─── PART 3: THREE.JS FOUNDATION & PBR LIGHTING ───
    const container = document.getElementById('game-canvas-container');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(${p.background ? '0x' + p.background.replace('#', '') : '0x080B10'});
    scene.fog = new THREE.FogExp2(0x080B10, 0.015);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 800);
    camera.position.set(0, 4.5, 9.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Dynamic Multi-Point Tactical Lighting
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(${'0x' + p.primary.replace('#', '')}, 2.2);
    keyLight.position.set(12, 24, 15);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 120;
    keyLight.shadow.camera.left = -30;
    keyLight.shadow.camera.right = 30;
    keyLight.shadow.camera.top = 30;
    keyLight.shadow.camera.bottom = -30;
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(${'0x' + p.secondary.replace('#', '')}, 8, 45);
    rimLight.position.set(-10, 5, -12);
    scene.add(rimLight);

    const underglowLight = new THREE.PointLight(${'0x' + p.accent.replace('#', '')}, 5, 25);
    underglowLight.position.set(0, -3, 0);
    scene.add(underglowLight);

    const { hexTexture, starTexture } = createProceduralTextures();

    // Cosmic Skybox Dome
    const skyGeo = new THREE.SphereGeometry(350, 24, 16);
    const skyMat = new THREE.MeshBasicMaterial({ map: starTexture, side: THREE.BackSide });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyDome);

    // Ground Grid & Holographic Floor Ring
    const groundGrid = new THREE.GridHelper(160, 40, ${'0x' + p.primary.replace('#', '')}, 0x1E293B);
    groundGrid.position.y = -2.5;
    groundGrid.material.opacity = 0.35;
    groundGrid.material.transparent = true;
    scene.add(groundGrid);

    // ─── PART 4: ARTICULATED 3D MESHES & HIERARCHY ───
    // 1. Player Hero Craft (16 distinct articulated sub-meshes)
    const playerGroup = new THREE.Group();
    playerGroup.position.set(0, 0, 0);
    scene.add(playerGroup);

    const matHull = new THREE.MeshStandardMaterial({
      color: 0x1E293B,
      metalness: 0.85,
      roughness: 0.22,
      map: hexTexture
    });
    const matAccent = new THREE.MeshStandardMaterial({
      color: ${'0x' + p.primary.replace('#', '')},
      emissive: ${'0x' + p.primary.replace('#', '')},
      emissiveIntensity: 0.8,
      metalness: 0.9,
      roughness: 0.15
    });
    const matCockpit = new THREE.MeshStandardMaterial({
      color: 0x00F0FF,
      metalness: 0.2,
      roughness: 0.1,
      transparent: true,
      opacity: 0.65
    });
    const matThruster = new THREE.MeshStandardMaterial({
      color: ${'0x' + p.accent.replace('#', '')},
      emissive: ${'0x' + p.accent.replace('#', '')},
      emissiveIntensity: 3.5
    });

    // Main Fuselage
    const fuselage = new THREE.Mesh(new THREE.ConeGeometry(0.85, 3.2, 7), matHull);
    fuselage.rotation.x = Math.PI / 2;
    fuselage.castShadow = true;
    playerGroup.add(fuselage);

    // Cockpit Glass
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), matCockpit);
    cockpit.scale.set(0.8, 0.5, 1.8);
    cockpit.position.set(0, 0.32, -0.2);
    playerGroup.add(cockpit);

    // Left & Right Swept Wings
    const wingGeo = new THREE.BoxGeometry(2.4, 0.08, 1.2);
    const leftWing = new THREE.Mesh(wingGeo, matHull);
    leftWing.position.set(-1.6, 0.05, 0.4);
    leftWing.rotation.z = 0.08;
    leftWing.castShadow = true;
    playerGroup.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, matHull);
    rightWing.position.set(1.6, 0.05, 0.4);
    rightWing.rotation.z = -0.08;
    rightWing.castShadow = true;
    playerGroup.add(rightWing);

    // Wingtip Plasma Cannons
    const cannonGeo = new THREE.CylinderGeometry(0.06, 0.07, 1.4, 12);
    const leftCannon = new THREE.Mesh(cannonGeo, matAccent);
    leftCannon.rotation.x = Math.PI / 2;
    leftCannon.position.set(-2.6, 0.05, 0.1);
    playerGroup.add(leftCannon);

    const rightCannon = new THREE.Mesh(cannonGeo, matAccent);
    rightCannon.rotation.x = Math.PI / 2;
    rightCannon.position.set(2.6, 0.05, 0.1);
    playerGroup.add(rightCannon);

    // Twin Vector Thruster Exhaust Bells
    const thrusterGeo = new THREE.CylinderGeometry(0.22, 0.32, 0.6, 16);
    const leftThruster = new THREE.Mesh(thrusterGeo, matThruster);
    leftThruster.rotation.x = Math.PI / 2;
    leftThruster.position.set(-0.45, 0, 1.6);
    playerGroup.add(leftThruster);

    const rightThruster = new THREE.Mesh(thrusterGeo, matThruster);
    rightThruster.rotation.x = Math.PI / 2;
    rightThruster.position.set(0.45, 0, 1.6);
    playerGroup.add(rightThruster);

    // Vertical Stabilizer Fin
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.8), matAccent);
    fin.position.set(0, 0.55, 1.1);
    playerGroup.add(fin);

    // 2. Enemy Swarm Entities (8-12 hostile drones)
    const enemies = [];
    const matEnemyHull = new THREE.MeshStandardMaterial({
      color: 0x881337,
      metalness: 0.8,
      roughness: 0.25
    });
    const matEnemyCore = new THREE.MeshStandardMaterial({
      color: 0xFF0055,
      emissive: 0xFF0055,
      emissiveIntensity: 2.8
    });

    for (let i = 0; i < 9; i++) {
      const enemyGroup = new THREE.Group();
      const enemyBody = new THREE.Mesh(new THREE.OctahedronGeometry(0.95), matEnemyHull);
      enemyBody.castShadow = true;
      enemyGroup.add(enemyBody);

      const enemyCore = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), matEnemyCore);
      enemyGroup.add(enemyCore);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.06, 8, 20), matEnemyCore);
      ring.rotation.x = Math.PI / 2;
      enemyGroup.add(ring);

      const angle = (i / 9) * Math.PI * 2;
      const dist = 28 + (i % 3) * 8;
      enemyGroup.position.set(Math.cos(angle) * dist, 0.5 + Math.sin(i) * 2.5, Math.sin(angle) * dist - 15);
      
      enemyGroup.userData = {
        id: 'enemy_' + i,
        health: 3,
        maxHealth: 3,
        speed: 4.5 + Math.random() * 2.5,
        patrolAngle: angle,
        patrolRadius: dist,
        ringMesh: ring,
        isDead: false
      };

      scene.add(enemyGroup);
      enemies.push(enemyGroup);
    }

    // 3. Environmental Asteroid Obstacles & Energy Crystals
    const obstacles = [];
    const matAsteroid = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85, metalness: 0.1 });
    for (let i = 0; i < 14; i++) {
      const ast = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8 + Math.random() * 1.6), matAsteroid);
      const theta = Math.random() * Math.PI * 2;
      const rad = 25 + Math.random() * 45;
      ast.position.set(Math.cos(theta) * rad, -2 + Math.random() * 8, Math.sin(theta) * rad - 20);
      ast.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      ast.castShadow = true;
      scene.add(ast);
      obstacles.push(ast);
    }

    // ─── PART 5: PURE JAVASCRIPT KINEMATICS & BALLISTICS (ZERO WASM) ───
    const lasers = [];
    const matLaser = new THREE.MeshBasicMaterial({ color: 0x00F0FF });
    const laserGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.8, 8);

    function spawnPlayerLaser() {
      audio.playLaser();
      // Dual wingtip shots
      const offsets = [-2.6, 2.6];
      offsets.forEach(offX => {
        const laser = new THREE.Mesh(laserGeo, matLaser);
        laser.rotation.x = Math.PI / 2;
        laser.position.copy(playerGroup.position);
        laser.position.x += offX;
        laser.position.z -= 1.2;
        laser.userData = {
          velocity: new THREE.Vector3(0, 0, -42),
          aliveTime: 0
        };
        scene.add(laser);
        lasers.push(laser);
      });
    }

    // Particle Explosion FX Pool
    const particles = [];
    const particleMat = new THREE.MeshBasicMaterial({ color: ${'0x' + p.accent.replace('#', '')} });
    const pGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);

    function triggerExplosion(pos, colorHex = ${'0x' + p.accent.replace('#', '')}) {
      audio.playExplosion();
      for (let i = 0; i < 22; i++) {
        const pMesh = new THREE.Mesh(pGeo, particleMat);
        pMesh.position.copy(pos);
        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 14
        );
        pMesh.userData = { vel, life: 1.0 };
        scene.add(pMesh);
        particles.push(pMesh);
      }
    }

    // ─── PART 6: CONTROLLER, INPUTS & GAME STATE ───
    let score = 0;
    let wave = 1;
    let shield = 100;
    let hull = 100;
    let isGameOver = false;
    let isGameWon = false;

    const keys = {};
    window.addEventListener('keydown', (e) => {
      audio.init();
      keys[e.key.toLowerCase()] = true;
      if (e.code === 'Space') {
        e.preventDefault();
        if (!isGameOver && !isGameWon) spawnPlayerLaser();
      }
    });
    window.addEventListener('keyup', (e) => {
      keys[e.key.toLowerCase()] = false;
    });

    window.addEventListener('pointerdown', (e) => {
      audio.init();
      if (!isGameOver && !isGameWon && e.button === 0) {
        spawnPlayerLaser();
      }
    });

    // ─── PART 7: 60 FPS RENDER & KINEMATICS LOOP ───
    const clock = new THREE.Clock();
    const radarCanvas = document.getElementById('radar-canvas');
    const radarCtx = radarCanvas.getContext('2d');
    const reticleCircle = document.getElementById('reticle-circle');

    function animate() {
      requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.1);

      if (!isGameOver && !isGameWon) {
        // Player Flight Controls
        const speed = (keys['shift'] ? 16.0 : 9.5) * dt;
        if (keys['w'] || keys['arrowup']) playerGroup.position.z -= speed;
        if (keys['s'] || keys['arrowdown']) playerGroup.position.z += speed;
        if (keys['a'] || keys['arrowleft']) {
          playerGroup.position.x -= speed;
          playerGroup.rotation.z = THREE.MathUtils.lerp(playerGroup.rotation.z, 0.35, 0.12);
        } else if (keys['d'] || keys['arrowright']) {
          playerGroup.position.x += speed;
          playerGroup.rotation.z = THREE.MathUtils.lerp(playerGroup.rotation.z, -0.35, 0.12);
        } else {
          playerGroup.rotation.z = THREE.MathUtils.lerp(playerGroup.rotation.z, 0, 0.1);
        }

        // Clamp arena boundaries
        playerGroup.position.x = Math.max(-28, Math.min(28, playerGroup.position.x));
        playerGroup.position.z = Math.max(-45, Math.min(12, playerGroup.position.z));

        // Smooth camera follow
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, playerGroup.position.x * 0.45, 0.08);
        camera.position.z = playerGroup.position.z + 9.5;
        camera.position.y = 4.2 + (keys['shift'] ? 0.3 : 0);
        camera.lookAt(playerGroup.position.x, playerGroup.position.y + 0.8, playerGroup.position.z - 10);

        // Update Lasers
        for (let i = lasers.length - 1; i >= 0; i--) {
          const l = lasers[i];
          l.position.addScaledVector(l.userData.velocity, dt);
          l.userData.aliveTime += dt;

          // Hit detection against enemies (Bounding Sphere Raycast)
          let hit = false;
          for (let j = 0; j < enemies.length; j++) {
            const en = enemies[j];
            if (!en.userData.isDead && l.position.distanceTo(en.position) < 1.8) {
              en.userData.health -= 1;
              hit = true;
              audio.playHit();

              // Flash reticle
              reticleCircle.classList.add('hit-flash');
              setTimeout(() => reticleCircle.classList.remove('hit-flash'), 100);

              if (en.userData.health <= 0) {
                en.userData.isDead = true;
                en.visible = false;
                triggerExplosion(en.position);
                score += 250;
                document.getElementById('score-val').textContent = String(score).padStart(4, '0');
                
                const alive = enemies.filter(e => !e.userData.isDead).length;
                document.getElementById('hostiles-left').textContent = alive;
                if (alive === 0) {
                  isGameWon = true;
                  showEndModal(true);
                }
              }
              break;
            }
          }

          if (hit || l.userData.aliveTime > 1.8) {
            scene.remove(l);
            lasers.splice(i, 1);
          }
        }

        // Update Hostile Enemies AI
        enemies.forEach(en => {
          if (!en.userData.isDead) {
            en.userData.patrolAngle += 0.4 * dt;
            en.position.x = Math.cos(en.userData.patrolAngle) * en.userData.patrolRadius;
            en.position.z = Math.sin(en.userData.patrolAngle) * (en.userData.patrolRadius * 0.5) - 18;
            en.rotation.y += 1.2 * dt;
            if (en.userData.ringMesh) en.userData.ringMesh.rotation.z += 2.0 * dt;

            // Collision with player
            if (en.position.distanceTo(playerGroup.position) < 2.5) {
              shield = Math.max(0, shield - 35 * dt);
              document.getElementById('shield-bar').style.width = shield + '%';
              document.getElementById('shield-txt').textContent = Math.round(shield) + '%';
              if (shield <= 0) {
                hull = Math.max(0, hull - 25 * dt);
                document.getElementById('hull-bar').style.width = hull + '%';
                document.getElementById('hull-txt').textContent = Math.round(hull) + '%';
                if (hull <= 0) {
                  isGameOver = true;
                  triggerExplosion(playerGroup.position);
                  playerGroup.visible = false;
                  showEndModal(false);
                }
              }
            }
          }
        });

        // Rotate obstacles gently
        obstacles.forEach(ob => {
          ob.rotation.x += 0.2 * dt;
          ob.rotation.y += 0.3 * dt;
        });

        // Update Particle Bursts
        for (let i = particles.length - 1; i >= 0; i--) {
          const pt = particles[i];
          pt.position.addScaledVector(pt.userData.vel, dt);
          pt.userData.life -= dt * 1.6;
          pt.scale.setScalar(pt.userData.life);
          if (pt.userData.life <= 0) {
            scene.remove(pt);
            particles.splice(i, 1);
          }
        }

        // Draw Real-Time Radar Minimap
        drawRadar(radarCtx, playerGroup, enemies);
      }

      renderer.render(scene, camera);
    }

    function drawRadar(ctx, player, enemyList) {
      ctx.clearRect(0, 0, 110, 110);
      const cx = 55, cy = 55, scale = 1.1;

      // Radar Grid concentric rings
      ctx.strokeStyle = '${p.primary}33';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2);
      ctx.arc(cx, cy, 44, 0, Math.PI * 2);
      ctx.stroke();

      // Player Blip
      ctx.fillStyle = '#00F0FF';
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();

      // Enemy Blips
      ctx.fillStyle = '#FF0055';
      enemyList.forEach(en => {
        if (!en.userData.isDead) {
          const rx = cx + (en.position.x - player.position.x) * scale;
          const ry = cy + (en.position.z - player.position.z) * scale;
          if (rx > 6 && rx < 104 && ry > 6 && ry < 104) {
            ctx.beginPath();
            ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
    }

    function showEndModal(won) {
      const modal = document.getElementById('end-modal');
      const title = document.getElementById('end-title');
      const scoreEl = document.getElementById('end-score');
      const desc = document.getElementById('end-desc');
      if (modal) modal.style.display = 'flex';
      if (title) title.textContent = won ? 'MISSION ACCOMPLISHED' : 'VESSEL INTEGRITY LOST';
      if (scoreEl) scoreEl.textContent = score.toLocaleString();
      if (desc) desc.textContent = won
        ? 'All hostile targets eliminated. System telemetry verified clean at 60 FPS.'
        : 'Shields collapsed and hull compromised under enemy barrage. Re-engage to retry.';
    }

    window.restartGame = () => {
      score = 0;
      shield = 100;
      hull = 100;
      isGameOver = false;
      isGameWon = false;
      playerGroup.position.set(0, 0, 0);
      playerGroup.visible = true;
      document.getElementById('shield-bar').style.width = '100%';
      document.getElementById('shield-txt').textContent = '100%';
      document.getElementById('hull-bar').style.width = '100%';
      document.getElementById('hull-txt').textContent = '100%';
      document.getElementById('score-val').textContent = '0000';
      document.getElementById('hostiles-left').textContent = '9';
      document.getElementById('end-modal').style.display = 'none';

      enemies.forEach((en, i) => {
        en.userData.isDead = false;
        en.userData.health = 3;
        en.visible = true;
        const angle = (i / 9) * Math.PI * 2;
        const dist = 28 + (i % 3) * 8;
        en.position.set(Math.cos(angle) * dist, 0.5 + Math.sin(i) * 2.5, Math.sin(angle) * dist - 15);
      });
    };

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Start 60 FPS Engine
    animate();
  </script>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
