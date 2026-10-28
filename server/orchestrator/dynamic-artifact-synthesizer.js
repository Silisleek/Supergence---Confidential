// SIS 1.0 — Dynamic Artifact Synthesizer (Zero Hardcoding Engine)
// Pure generative code synthesis: prompts the LLM to author bespoke, standalone
// HTML5 / Canvas / WebGL / WebAudio simulations from first principles.
// Eliminates all static templates, predetermined switch-cases, and canned HTML strings.

import { streamAI, quickAI, DEFAULT_MODEL, PREMIUM_MODEL } from '../api/openrouter.js';

export class DynamicArtifactSynthesizer {
  constructor() {
    this.broadcastFn = null;
    this.stats = {
      totalSynthesized: 0,
      totalCharsGenerated: 0,
      avgSynthesisTimeMs: 0,
      lastTopic: null,
    };
  }

  setBroadcast(fn) {
    this.broadcastFn = fn;
  }

  /**
   * Synthesize a complete, self-contained HTML5 interactive visual simulation
   * tailored specifically to the given blueprint or topic.
   * @param {Object} blueprint - { id, title, hypothesis, concepts, domains, parameters }
   * @param {Object} [options] - { model, onProgress }
   * @returns {Promise<string>} Pure executable HTML code starting with <!DOCTYPE html>
   */
  async synthesizeArtifact(blueprint, options = {}) {
    const t0 = Date.now();
    const title = blueprint.title || 'Dynamic Interactive System';
    const hypothesis =
      blueprint.hypothesis || 'Real-time dynamical evolution of coupled state variables.';
    const concepts = (blueprint.concepts || []).join(', ') || title;
    const domains = (blueprint.domains || []).join(' & ') || 'Computational Science';
    const parameters = (blueprint.parameters || []).join(', ') || 'coupling, damping, scale';

    console.log(`[DynamicSynthesizer] ⚡ Initiating dynamic code synthesis for: "${title}"`);

    const systemPrompt = `You are a world-class computational physicist, mathematical visualization engineer, and creative technologist.
Your task is to write a COMPLETE, PRODUCTION-READY, FULLY FUNCTIONAL, STANDALONE HTML5 interactive visual simulation for: "${title}".

MANDATORY TECHNICAL REQUIREMENTS:
1. PURE STANDALONE HTML: Output ONLY valid, executable HTML starting with <!DOCTYPE html> and ending with </html>. Do NOT wrap in markdown code blocks (\`\`\`html). No explanatory preamble or postscript.
2. ZERO HARDCODING OR PLACEHOLDERS: Implement the actual mathematical physics and algorithms for "${title}" (e.g. numerical integration, differential equations, field PDEs, symplectic steps, matrices, particle vectors, or wave mechanics). NO dummy loops, NO "TODO" comments.
3. VISUAL RENDERING: Use high-performance 2D Canvas (<canvas id="stage">) or WebGL / Three.js / Web Audio API. Run at smooth 60 FPS using requestAnimationFrame. Must be visually stunning, responsive, and beautiful with a dark astronomical/cyberpunk aesthetic (background: #030712 or #010204).
4. TACTILE INTERACTIVE AFFORDANCES: Include a bottom or side control deck with:
   - At least 3 continuous range sliders (<input type="range">) with live value displays that DIRECTLY modify simulation physics parameters (e.g. ${parameters}).
   - At least 3 distinct action buttons (e.g. pulse, invert, inject energy, reset, perturb) that trigger immediate visual feedback.
   - Mouse & touch interactions: clicking or dragging on the canvas must directly perturb, inject, or steer the simulation (support pointermove / pointerdown / touchmove).
5. LIVE TELEMETRY HUD: Include a top header HUD showing:
   - Title: "${title}"
   - Active domains: "${domains}"
   - Live real-time metric counters (FPS, total energy, entropy, or domain-specific invariants) updated dynamically in the animation loop.
   - A brief hypothesis overlay explaining: "${hypothesis}".
6. RESPONSIVE & MOBILE-FRIENDLY: Layout must adapt cleanly across desktop and mobile screens (CSS media queries, touch-friendly min 44px button tap targets).
7. COMPACT CSS & FULL CODE COMPLETION: Keep CSS styling compact (under 25 lines). Ensure all control sliders, buttons, and the full JavaScript <script> block are completely authored and closed cleanly with </script></body></html>. Never leave the code truncated or unfinished.

Output the pure, complete HTML document now:`;

    const userPrompt = `Synthesize the complete interactive simulation code for "${title}". Ground the simulation in: ${concepts}. Ensure sliders directly control the mathematical physics and canvas interaction is deeply responsive.`;

    let generatedCode = '';
    let lastBroadcastTime = 0;

    try {
      const result = await streamAI(
        {
          model: options.model || PREMIUM_MODEL || DEFAULT_MODEL,
          systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          temperature: 0.6,
          maxTokens: 4096,
        },
        // Real-time token streaming callback
        (token) => {
          generatedCode += token;
          const now = Date.now();
          if (now - lastBroadcastTime > 800) {
            lastBroadcastTime = now;
            if (this.broadcastFn && !options.silent && !options.isAutonomous) {
              this.broadcastFn('status', {
                status: 'thinking',
                stage: 'dynamic-code-synthesis',
                message: `⚡ Writing dynamic code for "${title}" (${generatedCode.length} bytes)...`,
              });
            }
            if (options.onProgress) {
              options.onProgress({
                chars: generatedCode.length,
                elapsedMs: now - t0,
              });
            }
          }
        },
      );

      // Extract full text from streaming result
      let cleanCode = (result?.text || generatedCode || '').trim();

      // Extract HTML from markdown fences with multi-fence combiner support
      const fences = [...cleanCode.matchAll(/```([a-z0-9_-]*)\s*\n?([\s\S]*?)```/gi)];

      if (fences.length > 0) {
        // Check if any single fence contains a complete standalone HTML document with scripts
        const fullHtmlFence = fences.find((f) => {
          const c = f[2].toLowerCase();
          return (
            (c.includes('<!doctype') || c.includes('<html')) &&
            c.includes('<script') &&
            c.includes('</script>') &&
            c.length > 1500
          );
        });

        if (fullHtmlFence) {
          cleanCode = fullHtmlFence[2].trim();
        } else {
          // Check if the AI split into an HTML scaffold fence and a separate JavaScript fence
          const htmlFence = fences.find((f) => {
            const lang = (f[1] || '').toLowerCase();
            const c = f[2].toLowerCase();
            return lang === 'html' || c.includes('<!doctype') || c.includes('<html');
          });
          const jsFences = fences.filter((f) => {
            const lang = (f[1] || '').toLowerCase();
            const c = f[2].toLowerCase();
            return (
              (lang === 'javascript' ||
                lang === 'js' ||
                (!c.includes('<html') &&
                  !c.includes('<!doctype') &&
                  (c.includes('three') ||
                    c.includes('function') ||
                    c.includes('const ') ||
                    c.includes('let ') ||
                    c.includes('class ')))) &&
              f !== htmlFence
            );
          });

          if (htmlFence && jsFences.length > 0) {
            let htmlStr = htmlFence[2].trim();
            const jsStr = jsFences.map((f) => f[2].trim()).join('\n\n');
            const inlineScriptRegex = /<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/i;
            if (inlineScriptRegex.test(htmlStr)) {
              htmlStr = htmlStr.replace(inlineScriptRegex, `<script>\n${jsStr}\n</script>`);
            } else if (htmlStr.toLowerCase().includes('</body>')) {
              htmlStr = htmlStr.replace(/<\/body>/i, `<script>\n${jsStr}\n</script>\n</body>`);
            } else {
              htmlStr += `\n<script>\n${jsStr}\n</script>\n</body>\n</html>`;
            }
            cleanCode = htmlStr;
          } else {
            // Otherwise choose the largest code fence
            let maxFence = fences[0][2];
            for (const f of fences) {
              if (f[2].length > maxFence.length) maxFence = f[2];
            }
            cleanCode = maxFence.trim();
          }
        }
      } else {
        // No closed fences: check for unclosed fence from streaming cutoff
        const unclosed = cleanCode.match(/```(?:[a-z0-9_-]+)?\s*\n?([\s\S]+)$/i);
        if (unclosed && unclosed[1].length > 500) {
          cleanCode = unclosed[1].trim();
        } else {
          const docStart = cleanCode.search(/<!DOCTYPE html|<html/i);
          if (docStart > 0) cleanCode = cleanCode.slice(docStart);
        }
        cleanCode = cleanCode.replace(/```\s*$/i, '').trim();
      }

      // If code was truncated mid-stream, auto-close the script and document tags
      if (cleanCode.includes('<script') && !cleanCode.toLowerCase().includes('</script>')) {
        cleanCode += '\n</script>\n</body>\n</html>';
      } else if (!cleanCode.toLowerCase().includes('</html>')) {
        cleanCode += '\n</body>\n</html>';
      }

      // Ensure valid HTML root
      if (
        !cleanCode.toLowerCase().includes('<!doctype html') &&
        !cleanCode.toLowerCase().includes('<html')
      ) {
        cleanCode = `<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8"><title>${title}</title></head>\n<body>\n${cleanCode}\n</body>\n</html>`;
      }

      // Verify that code contains essential functional components
      const lowerCode = cleanCode.toLowerCase();
      const hasCanvasOrSvg =
        lowerCode.includes('<canvas') ||
        lowerCode.includes('<svg') ||
        lowerCode.includes('three') ||
        lowerCode.includes('webgl') ||
        lowerCode.includes('renderer');
      const hasScript = lowerCode.includes('<script');

      if (
        !hasScript ||
        !lowerCode.includes('</script>') ||
        (!hasCanvasOrSvg && cleanCode.length < 5000)
      ) {
        console.warn(
          `[DynamicSynthesizer] Generated code lacked closed script or canvas. Requesting concise direct synthesis for "${title}"...`,
        );
        const fallbackCode = await this._synthesizeConciseDynamic(blueprint);
        if (
          fallbackCode &&
          fallbackCode.toLowerCase().includes('<script') &&
          fallbackCode.length > 500
        ) {
          cleanCode = fallbackCode;
        }
      }

      const elapsed = Date.now() - t0;
      this.stats.totalSynthesized++;
      this.stats.totalCharsGenerated += cleanCode.length;
      this.stats.avgSynthesisTimeMs = Math.round(
        (this.stats.avgSynthesisTimeMs * (this.stats.totalSynthesized - 1) + elapsed) /
          this.stats.totalSynthesized,
      );
      this.stats.lastTopic = title;

      console.log(
        `[DynamicSynthesizer] ✓ Successfully synthesized dynamic code for "${title}" (${cleanCode.length} chars in ${(elapsed / 1000).toFixed(1)}s)`,
      );
      return cleanCode;
    } catch (err) {
      console.error(`[DynamicSynthesizer] Stream synthesis error for "${title}":`, err.message);
      // Fall back to concise direct AI synthesis — NEVER static templates
      return await this._synthesizeConciseDynamic(blueprint);
    }
  }

  /**
   * Pure generative concise dynamic synthesis via quickAI.
   * Prompts the AI model to author a standalone simulation from first principles.
   * Zero hardcoded HTML strings or static templates.
   */
  async _synthesizeConciseDynamic(blueprint) {
    const title = blueprint.title || 'Dynamic State Simulation';
    const hypothesis =
      blueprint.hypothesis || 'Real-time phase-space evolution under non-linear constraints.';
    const concepts = (blueprint.concepts || []).join(', ') || title;
    const parameters = (blueprint.parameters || []).join(', ') || 'coupling, damping, perturbation';

    console.log(`[DynamicSynthesizer] ⚡ Executing direct dynamic LLM synthesis for: "${title}"`);

    const prompt = `You are an expert computational visualization engineer.
Write a COMPLETE, STANDALONE, FULLY WORKING HTML5 file simulating: "${title}".
Ground the mathematics and physics in: ${concepts}.

REQUIREMENTS:
1. Output ONLY executable HTML starting with <!DOCTYPE html> and ending with </html>. No markdown, no comments outside HTML.
2. Include a dark-themed <canvas id="stage"> with a 60 FPS requestAnimationFrame loop implementing the real differential equations or geometry of ${title}.
3. Include an interactive control bar with at least 2 range sliders (<input type="range">) modifying parameters (${parameters}) and at least 2 action buttons that perturb or reset the simulation.
4. Include mouse/touch drag interaction on the canvas to perturb state variables in real time.
5. Include a top HUD displaying "${title}" and live metrics (e.g. FPS and Energy/Hamiltonian).
6. Keep JavaScript concise (< 120 lines) and ensure all tags (<script>, </body>, </html>) are fully closed.`;

    try {
      const raw = await quickAI(
        prompt,
        `Write standalone HTML5 simulation for ${title}`,
        DEFAULT_MODEL,
        3000,
      );
      let code = (raw || '').trim();

      const fence = code.match(/```(?:html)?\s*\n?([\s\S]*?)```/i);
      if (fence && fence[1] && fence[1].length > 100) {
        code = fence[1].trim();
      } else {
        const start = code.search(/<!DOCTYPE html|<html/i);
        if (start > 0) code = code.slice(start);
        code = code.replace(/```\s*$/i, '').trim();
      }

      if (code.includes('<script') && !code.toLowerCase().includes('</script>')) {
        code += '\n</script>\n</body>\n</html>';
      } else if (!code.toLowerCase().includes('</html>')) {
        code += '\n</body>\n</html>';
      }

      if (!code.toLowerCase().includes('<!doctype html') && !code.toLowerCase().includes('<html')) {
        code = `<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8"><title>${title}</title></head>\n<body>\n${code}\n</body>\n</html>`;
      }

      if (
        !code.toLowerCase().includes('<script') ||
        code.length < 300 ||
        code.includes('User Safety:')
      ) {
        throw new Error('QuickAI output lacked functional script or returned safety notice');
      }

      return code;
    } catch (e) {
      console.warn(
        `[DynamicSynthesizer] Concise synthesis attempt failed (${e.message}). Retrying with primary model...`,
      );
      try {
        const retryRaw = await quickAI(
          prompt,
          `Write standalone HTML5 simulation for ${title}`,
          DEFAULT_MODEL,
          3000,
        );
        let retryCode = (retryRaw || '').trim();
        const retryFence = retryCode.match(/```(?:html)?\s*\n?([\s\S]*?)```/i);
        if (retryFence && retryFence[1] && retryFence[1].length > 100) {
          retryCode = retryFence[1].trim();
        } else {
          const start = retryCode.search(/<!DOCTYPE html|<html/i);
          if (start > 0) retryCode = retryCode.slice(start);
          retryCode = retryCode.replace(/```\s*$/i, '').trim();
        }
        if (retryCode.includes('<script') && !retryCode.toLowerCase().includes('</script>')) {
          retryCode += '\n</script>\n</body>\n</html>';
        } else if (!retryCode.toLowerCase().includes('</html>')) {
          retryCode += '\n</body>\n</html>';
        }
        if (
          !retryCode.toLowerCase().includes('<!doctype html') &&
          !retryCode.toLowerCase().includes('<html')
        ) {
          retryCode = `<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8"><title>${title}</title></head>\n<body>\n${retryCode}\n</body>\n</html>`;
        }
        if (retryCode.toLowerCase().includes('<script') && retryCode.length >= 300) {
          return retryCode;
        }
      } catch (retryErr) {
        console.error(`[DynamicSynthesizer] Secondary synthesis retry failed:`, retryErr.message);
      }
      throw new Error(
        `Dynamic code synthesis failed for "${title}": upstream model did not generate functional code. No canned templates permitted.`,
        { cause: e },
      );
    }
  }
}

const dynamicArtifactSynthesizer = new DynamicArtifactSynthesizer();
export default dynamicArtifactSynthesizer;
