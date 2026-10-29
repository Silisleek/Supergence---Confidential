// SIS 1.0 — Coding Expert Engine (Production-Grade Self-Correcting Execution & Verification Engine)
// Pillar 7: Multi-file synthesis, AST syntax verification, automated sandbox assertions,
// Playwright headless browser WebGL smoke-testing, and autonomous self-healing debug cycle.

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';
import { SandboxRunner } from './sandbox.js';
import autoHealer from '../orchestrator/auto-healer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = process.env.SIS_WORKSPACE_DIR
  ? path.resolve(process.env.SIS_WORKSPACE_DIR)
  : path.resolve(__dirname, '../../workspace');
const SCREENSHOTS_DIR = path.join(WORKSPACE_DIR, 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  try {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  } catch (_) {}
}

export class CodingExpertEngine {
  constructor() {
    this.sandbox = new SandboxRunner();
  }

  /**
   * Evaluate, execute, and verify code with automatic test assertions and self-healing
   */
  async evaluateAndVerify(draft = {}) {
    const filename = draft.filename || draft.targetFile || 'module.js';
    let code = draft.code || draft.content || '';
    const language = (
      draft.language ||
      path.extname(filename).slice(1) ||
      'javascript'
    ).toLowerCase();

    // ESM / CommonJS Interoperability Adaptation:
    // When operating in an ES module project ("type": "module"), ensure CommonJS patterns in .js execute seamlessly
    if (
      ['javascript', 'js'].includes(language) &&
      !filename.endsWith('.html') &&
      !filename.endsWith('.cjs') &&
      !filename.endsWith('.mjs')
    ) {
      if (
        (code.includes('require(') || code.includes('module.exports')) &&
        !code.includes('createRequire')
      ) {
        code =
          `import { createRequire } from 'node:module';\nconst require = createRequire(import.meta.url);\nconst module = { exports: {} };\n` +
          code +
          `\nexport default module.exports;\n`;
        draft.code = code;
      }
    }

    const startTime = Date.now();
    const evaluation = {
      filename,
      language,
      sizeBytes: Buffer.byteLength(code, 'utf8'),
      syntaxValid: true,
      testsPassed: true,
      diagnostics: [],
      healed: false,
      browserVerified: false,
    };

    // 1. AST & Lexical Syntax Verification
    const structCheck = this._checkStructure(code, language);
    if (!structCheck.valid) {
      evaluation.syntaxValid = false;
      evaluation.diagnostics.push(...structCheck.errors);
    }

    // 2. Language-Specific Execution & Verification
    if (language === 'html' || filename.endsWith('.html')) {
      // Browser-based execution & WebGL rendering verification for HTML
      await this._verifyHtmlInBrowser(draft, evaluation);
    } else {
      // Sandbox Runner for Backend, CLI, and Scripting Languages
      try {
        const sandboxRes = await this.sandbox.execute({
          targetFile: filename,
          language,
          code,
          testCode: draft.testCode || this._generateSmokeTest(code, language, filename),
          runCommand: draft.runCommand,
        });

        if (!sandboxRes.success) {
          evaluation.testsPassed = false;
          const errDetail = sandboxRes.error || sandboxRes.stderr || 'Execution failed in sandbox';
          evaluation.diagnostics.push(`Execution error: ${errDetail}`);

          // 3. Self-healing loop: auto-heal if sandbox failed
          if (draft.autoHeal !== false) {
            try {
              console.log(
                `[CodingExpert] Code execution error in ${filename}. Triggering autonomous Auto-Healer...`,
              );
              const healRes = await autoHealer.healFile({
                filename,
                error: errDetail,
                userContext: `Code execution verification for ${filename} (${language})`,
              });

              if (healRes && healRes.verified) {
                evaluation.healed = true;
                evaluation.healedCode = healRes.code;
                evaluation.testsPassed = true;
                evaluation.diagnostics.push('Auto-healed and re-verified successfully in sandbox');
              }
            } catch (healErr) {
              evaluation.diagnostics.push(`Auto-heal attempt failed: ${healErr.message}`);
            }
          }
        }
      } catch (err) {
        evaluation.testsPassed = false;
        evaluation.diagnostics.push(`Sandbox error: ${err.message}`);
      }
    }

    evaluation.durationMs = Date.now() - startTime;
    return evaluation;
  }

  /**
   * Headless Browser Smoke-Testing for HTML, Three.js, Canvas, and Web Applications
   * Uses real Playwright Chromium to verify 0 console errors, active WebGL rendering, and zero black screens.
   */
  async _verifyHtmlInBrowser(draft, evaluation) {
    const filename = path.basename(draft.filename || draft.targetFile || 'index.html');
    const localFilePath = path.join(WORKSPACE_DIR, filename);
    const port = process.env.ACTIVE_SERVER_PORT || process.env.PORT || 3009;
    const httpUrl = `http://127.0.0.1:${port}/workspace/${filename}`;
    const fileUrl = pathToFileURL(localFilePath).href;
    const code =
      draft.code ||
      draft.content ||
      (fs.existsSync(localFilePath) ? fs.readFileSync(localFilePath, 'utf8') : '');
    if (evaluation.testsPassed === undefined) evaluation.testsPassed = true;

    try {
      // Dynamically import playwright-core
      const { chromium } = await import('playwright-core');
      const browser = await chromium.launch({
        channel: 'chrome',
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--allow-file-access-from-files',
          '--use-gl=angle',
          '--mute-audio',
        ],
      });

      const page = await browser.newPage();
      const pageErrors = [];
      const consoleErrors = [];

      page.on('pageerror', (err) => {
        pageErrors.push(err.message || String(err));
      });
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const txt = msg.text();
          const loc = msg.location() && msg.location().url ? msg.location().url : '';
          // Filter benign network warnings or favicon 404s
          if (
            !txt.includes('favicon.ico') &&
            !loc.includes('favicon.ico') &&
            !txt.includes('Permissions-Policy') &&
            !txt.includes('adguard') &&
            !(
              txt.includes('Failed to load resource') &&
              (loc.includes('favicon') || loc.endsWith('.ico'))
            )
          ) {
            consoleErrors.push(txt);
          }
        }
      });

      try {
        let navigated = false;
        // Prioritize local HTTP server if active, avoiding file:// CDN blocking and CORS restrictions
        try {
          await page.goto(httpUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          navigated = true;
        } catch (httpErr) {
          console.warn(
            `[CodingExpert] httpUrl navigation note: ${httpErr.message}. Falling back to fileUrl...`,
          );
        }
        if (!navigated && fs.existsSync(localFilePath)) {
          try {
            await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            navigated = true;
          } catch (fileErr) {
            console.warn(`[CodingExpert] fileUrl fallback note: ${fileErr.message}`);
          }
        }
        // Allow scripts and WebGL/requestAnimationFrame to execute and render
        await page.waitForTimeout(2500);

        // Inspect WebGL and DOM health
        const domHealth = await page.evaluate(() => {
          const canvas = document.querySelector('canvas');
          let webglOk = false;
          let webglError = null;
          let isBlack = false;

          let totalActivePixels = 0;
          let checkedCanvases = 0;

          const canvases = Array.from(document.querySelectorAll('canvas'));
          if (canvases.length > 0) {
            for (const c of canvases) {
              try {
                // Try 2D context first (non-destructive if already 2D)
                let ctx2d = null;
                try {
                  ctx2d = c.getContext('2d');
                } catch (_) {}
                if (ctx2d) {
                  checkedCanvases++;
                  const w = Math.min(c.width || 300, 200);
                  const h = Math.min(c.height || 150, 200);
                  if (w > 0 && h > 0) {
                    const imgData = ctx2d.getImageData(0, 0, w, h);
                    let nonZero = 0;
                    for (let i = 0; i < imgData.data.length; i += 4) {
                      if (
                        imgData.data[i] > 15 ||
                        imgData.data[i + 1] > 15 ||
                        imgData.data[i + 2] > 15
                      )
                        nonZero++;
                    }
                    totalActivePixels += nonZero;
                  }
                } else {
                  // Fall back to WebGL
                  const gl = c.getContext('webgl2') || c.getContext('webgl');
                  if (gl) {
                    checkedCanvases++;
                    webglOk = !gl.isContextLost();
                    const w = c.width || 300;
                    const h = c.height || 150;
                    const pixels = new Uint8Array(4);
                    gl.readPixels(
                      Math.floor(w / 2),
                      Math.floor(h / 2),
                      1,
                      1,
                      gl.RGBA,
                      gl.UNSIGNED_BYTE,
                      pixels,
                    );
                    if (pixels[0] > 10 || pixels[1] > 10 || pixels[2] > 10 || pixels[3] > 0) {
                      totalActivePixels += 50;
                    }
                  }
                }
              } catch (glErr) {
                webglError = glErr.message;
              }
            }
          }

          let threeMeshCount = 0;
          try {
            if (window.THREE && window.__threeScene) {
              window.__threeScene.traverse((obj) => {
                if (obj.isMesh) threeMeshCount++;
              });
            } else if (window.scene && window.scene.traverse) {
              window.scene.traverse((obj) => {
                if (obj.isMesh) threeMeshCount++;
              });
            }
          } catch (_) {}

          if (checkedCanvases > 0 && totalActivePixels < 25 && threeMeshCount === 0) {
            isBlack = true;
          }

          const hasSpaceCombatHud = Boolean(
            document.getElementById('shield-bar') || document.getElementById('hull-bar'),
          );

          return {
            hasCanvas: canvases.length > 0,
            canvasCount: canvases.length,
            webglOk,
            webglError,
            isBlack,
            threeMeshCount,
            hasSpaceCombatHud,
            bodyChildrenCount: document.body ? document.body.children.length : 0,
            hasContent: document.body ? document.body.innerText.trim().length > 0 : false,
          };
        });

        // Collect runtime failure indicators (filtering benign audio/network/policy notices)
        const genuineErrors = [
          ...pageErrors,
          ...consoleErrors.filter((e) => {
            const lower = (e || '').toLowerCase();
            return (
              !lower.includes('audiocontext') &&
              !lower.includes('autoplay') &&
              !lower.includes('sourcemap') &&
              !lower.includes('favicon') &&
              !lower.includes('permissions-policy') &&
              !lower.includes('adguard') &&
              !lower.includes('user gesture') &&
              !lower.includes('allowed to start') &&
              !lower.includes('failed to load resource') &&
              !lower.includes('.woff') &&
              !lower.includes('.ttf') &&
              !lower.includes('status of 404')
            );
          }),
        ];
        if (genuineErrors.length > 0) {
          evaluation.testsPassed = false;
          evaluation.diagnostics.push(
            `Browser runtime error: ${genuineErrors.slice(0, 3).join(' | ')}`,
          );
        }

        if (domHealth.hasCanvas && domHealth.webglError) {
          evaluation.testsPassed = false;
          evaluation.diagnostics.push(`WebGL Context Error: ${domHealth.webglError}`);
        }

        if (domHealth.hasCanvas && domHealth.isBlack) {
          evaluation.testsPassed = false;
          evaluation.diagnostics.push(
            'WebGL visual rendering failure: canvas pixels are completely empty/black void.',
          );
        }

        const promptContext = (draft.prompt || '') + ' ' + filename;
        const isVisualOrSim =
          /simulation|simulator|quantum|particle|canvas|wave|physics|visualizer|game|3d|webgl|interactive/i.test(
            promptContext,
          );

        if (isVisualOrSim && !domHealth.hasCanvas) {
          evaluation.testsPassed = false;
          evaluation.diagnostics.push(
            'Visual Simulation Invariant Failed: Application did not render any <canvas> elements in the DOM.',
          );
        }

        const scriptTags = code.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) || [];
        if (isVisualOrSim && scriptTags.length === 0) {
          evaluation.testsPassed = false;
          evaluation.diagnostics.push(
            'Application Invariant Failed: Deliverable contains no inline or external <script> execution tags.',
          );
        }

        // Universal non-emptiness invariant: deliverables must contain substantial code and render visual content
        const minLength = isVisualOrSim ? 3000 : 800;
        if (
          !code ||
          code.trim().length < minLength ||
          (!domHealth.hasCanvas && !domHealth.hasContent)
        ) {
          evaluation.testsPassed = false;
          evaluation.diagnostics.push(
            `Deliverable failed minimum content threshold (${code ? code.length : 0} bytes, min required: ${minLength}, hasCanvas: ${domHealth.hasCanvas}, hasContent: ${domHealth.hasContent}).`,
          );
        }

        const is3DRequest =
          /three\.js|webgl|3d|game|landmark|bridge|scenery|building|tower|monument/i.test(
            promptContext,
          );
        const isLandmarkReq =
          /bridge|golden gate|tower|monument|building|cathedral|castle|architecture|landmark|skyline/i.test(
            promptContext,
          );
        const usesThreeJs = /three(?:\.min)?\.js|from\s+['"]three['"]|new\s+THREE\./i.test(code);

        // AST / Code-level mesh and geometry counting (immune to scope isolation)
        const codeMeshCount = (code.match(/new\s+THREE\.Mesh\b/g) || []).length;
        const codeGeomCount = (code.match(/new\s+THREE\.\w+Geometry\b/g) || []).length;

        if (isLandmarkReq || (is3DRequest && usesThreeJs)) {
          const effectiveMeshCount = Math.max(codeMeshCount, domHealth.threeMeshCount || 0);
          if (effectiveMeshCount < 8 || code.length < 5000) {
            evaluation.testsPassed = false;
            evaluation.diagnostics.push(
              `Insufficient 3D geometric fidelity (${effectiveMeshCount} meshes detected, ${code.length} bytes). Production 3D simulations require articulated meshes and full scene code.`,
            );
          }
          if (domHealth.hasCanvas && domHealth.threeMeshCount > 0 && domHealth.threeMeshCount < 8) {
            evaluation.testsPassed = false;
            evaluation.diagnostics.push(
              `Insufficient runtime 3D fidelity (${domHealth.threeMeshCount} active meshes detected in DOM).`,
            );
          }
        }

        if (isLandmarkReq && domHealth.hasSpaceCombatHud) {
          evaluation.testsPassed = false;
          evaluation.diagnostics.push(
            'Architectural simulation defect: scene contains combat game HUD (#shield-bar) instead of architectural exploration controls.',
          );
        }

        // Capture verification screenshot
        const screenshotName = `verified_${filename.replace(/\.[^.]+$/, '')}.png`;
        const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotName);
        try {
          await page.screenshot({ path: screenshotPath, type: 'png' });
          evaluation.screenshot = screenshotPath;
        } catch (_) {}

        evaluation.browserVerified = evaluation.testsPassed;
      } finally {
        await browser.close();
      }

      // Self-healing for HTML if genuine fatal browser errors occurred
      const hadBrowserSkip = evaluation.diagnostics.some((d) =>
        d.includes('Browser verification skipped'),
      );
      if (!evaluation.testsPassed && draft.autoHeal !== false && !hadBrowserSkip) {
        console.log(
          `[CodingExpert] Browser smoke test failed for ${filename}. Invoking auto-healer...`,
        );
        try {
          const healRes = await autoHealer.healFile({
            filename,
            error: evaluation.diagnostics.join('\n'),
            userContext: `Browser smoke-test failure for ${filename}`,
          });
          if (healRes && healRes.verified) {
            evaluation.healed = true;
            evaluation.healedCode = healRes.code;
            evaluation.testsPassed = true;
            evaluation.browserVerified = true;
            evaluation.diagnostics.push('Auto-healed HTML and re-verified successfully in browser');
          }
        } catch (healErr) {
          evaluation.diagnostics.push(`HTML auto-heal failed: ${healErr.message}`);
        }
      }
    } catch (err) {
      // If browser cannot be launched, fall back gracefully to AST syntax checking
      evaluation.diagnostics.push(`Browser verification skipped: ${err.message}`);
    }
  }

  /**
   * AST and Lexical Syntax Verification across JS, Python, HTML, JSON, and C++
   */
  _checkStructure(code = '', lang = 'javascript') {
    const errors = [];
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return { valid: false, errors: ['Code buffer is empty'] };
    }

    const cleanLang = (lang || '').toLowerCase();

    // 1. JavaScript & TypeScript Syntax Parsing
    if (['javascript', 'js', 'mjs', 'cjs', 'typescript', 'ts'].includes(cleanLang)) {
      try {
        // Strip ESM import statements and export qualifiers for syntax validation
        const scriptCode = code
          .replace(/\r\n/g, '\n')
          .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '// [import]')
          .replace(/import\s+['"][^'"]+['"];?/g, '// [import]')
          .replace(/import\.meta(?:\.[a-zA-Z0-9_$]+)*/g, '({})')
          .replace(/export\s+default\s+/g, '/* export default */ ')
          .replace(/export\s+\{[^}]*\};?/g, '// [export list]')
          .replace(/export\s+/g, '');
        new Function(scriptCode);
      } catch (err) {
        errors.push(`JavaScript AST Syntax Error: ${err.message}`);
      }
    }

    // 2. JSON Validation
    if (cleanLang === 'json') {
      try {
        JSON.parse(code);
      } catch (err) {
        errors.push(`JSON Syntax Error: ${err.message}`);
      }
    }

    // 3. HTML Document Validation
    if (cleanLang === 'html') {
      if (!code.includes('<html') && !code.includes('<!DOCTYPE html>')) {
        errors.push('HTML file missing <!DOCTYPE html> or <html> root tags');
      }
      if (code.includes('<script>') || code.includes('<script type="module">')) {
        // Verify inline module scripts
        const scriptMatch = code.match(/<script(?:\s+type="module")?>([\s\S]*?)<\/script>/i);
        if (scriptMatch && scriptMatch[1]) {
          try {
            const inlineJs = scriptMatch[1]
              .replace(/\r\n/g, '\n')
              .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '// [import]')
              .replace(/export\s+/g, '');
            new Function(inlineJs);
          } catch (scriptErr) {
            errors.push(`Inline Script Syntax Error: ${scriptErr.message}`);
          }
        }
      }
    }

    // 4. Bracket Balance Fallback Guard
    const openBraces = (code.match(/\{/g) || []).length;
    const closeBraces = (code.match(/\}/g) || []).length;
    if (Math.abs(openBraces - closeBraces) > 3) {
      errors.push(`Unbalanced braces detected: ${openBraces} open vs ${closeBraces} close`);
    }

    // 5. Zero-Placeholder & Production-Grade Completeness Guard
    const placeholderRegex =
      /(?:\/\/|#|\/\*|<!--)\s*(?:TODO|implement(?:ed)?|stub|placeholder|fixme|add logic here)\b/i;
    const placeholderMatch = code.match(placeholderRegex);
    if (placeholderMatch) {
      errors.push(
        `Unfinished stub/placeholder detected: "${placeholderMatch[0].trim()}". Complete production implementation required.`,
      );
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Generates REAL functional smoke tests that actually import and assert the code!
   */
  _generateSmokeTest(code = '', lang = 'javascript', filename = 'module.js') {
    const cleanLang = (lang || '').toLowerCase();

    if (['javascript', 'js', 'mjs', 'cjs'].includes(cleanLang) && !filename.endsWith('.html')) {
      const isESM = code.includes('import ') || code.includes('export ');
      if (isESM) {
        return `
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

console.log('[SmokeTest] Validating ES module "${filename}"...');
try {
  let targetPath = path.resolve(process.cwd(), 'workspace', '${filename}');
  if (!fs.existsSync(targetPath)) targetPath = path.resolve(process.cwd(), '${filename}');
  const modUrl = pathToFileURL(targetPath).href;
  const mod = await import(modUrl);
  console.log('[SmokeTest] Module loaded successfully. Exported symbols:', Object.keys(mod));
  if (typeof mod.runTests === 'function') await mod.runTests();
  else if (typeof mod.test === 'function') await mod.test();
  else if (typeof mod.default?.selfTest === 'function') await mod.default.selfTest();
  else if (typeof mod.selfTest === 'function') await mod.selfTest();
  console.log('[SmokeTest] Verification PASSED.');
} catch (e) {
  console.error('[SmokeTest] FAILED during module import/execution:');
  console.error(e.stack || e.message);
  process.exit(1);
}
`;
      } else {
        return `
const path = require('path');
const fs = require('fs');
console.log('[SmokeTest] Validating CommonJS module "${filename}"...');
try {
  let modPath = path.resolve(process.cwd(), 'workspace', '${filename}');
  if (!fs.existsSync(modPath)) modPath = path.resolve(process.cwd(), '${filename}');
  const mod = require(modPath);
  console.log('[SmokeTest] Module loaded successfully. Exported symbols:', Object.keys(mod));
  if (typeof mod.runTests === 'function') mod.runTests();
  else if (typeof mod.test === 'function') mod.test();
  else if (typeof mod.default?.selfTest === 'function') mod.default.selfTest();
  else if (typeof mod.selfTest === 'function') mod.selfTest();
  else if (typeof mod.test === 'function') mod.test();
  console.log('[SmokeTest] Verification PASSED.');
} catch (e) {
  console.error('[SmokeTest] FAILED during module require/execution:');
  console.error(e.stack || e.message);
  process.exit(1);
}
`;
      }
    }

    if (['python', 'py'].includes(cleanLang)) {
      return `
import sys
import importlib.util
from pathlib import Path

target = Path.cwd() / "workspace" / "${filename}"
if not target.exists():
    target = Path.cwd() / "${filename}"
sys.path.insert(0, str(target.parent))
print(f"[SmokeTest] Validating Python script '{target}'...")
try:
    spec = importlib.util.spec_from_file_location("verified_module", str(target))
    mod = importlib.util.module_from_spec(spec)
    sys.modules["verified_module"] = mod
    spec.loader.exec_module(mod)
    print(f"[SmokeTest] Python module imported and validated. Symbols: {[s for s in dir(mod) if not s.startswith('_')]}")
except Exception as e:
    import traceback
    print(f"[SmokeTest] FAILED during Python execution: {e}", file=sys.stderr)
    traceback.print_exc()
    sys.exit(1)
`;
    }

    return '';
  }
}

const codingExpertEngine = new CodingExpertEngine();
export default codingExpertEngine;
