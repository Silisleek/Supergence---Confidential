// SIS 1.0 — Human Builder & Closed-Loop Feedback Engine
// Models human physical/digital craftsmanship & motor planning:
// 1. Internal Forward Models (Wolpert, Miall): Mental visual simulation before action
// 2. Closed-Loop Perceptual-Motor Feedback:
//    Intention -> Motor Action -> Visual Observation -> Discrepancy Computation -> Iterative Correction
// 3. Craftsmanship Standards: Tactile responsiveness, visual harmony, error tolerance

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EventEmitter } from 'events';
import humanVisionObserver from './human-vision-observer.js';
import neuromodulators from './neuromodulators.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = process.env.SIS_WORKSPACE_DIR
  ? path.resolve(process.env.SIS_WORKSPACE_DIR)
  : path.join(__dirname, '../../workspace');

class HumanBuilderFeedback extends EventEmitter {
  constructor() {
    super();
    this.stats = {
      totalBuilds: 0,
      forwardSimulations: 0,
      discrepancyChecks: 0,
      selfCorrectionsApplied: 0,
      avgVisualFidelity: 0.94,
      lastBuildTime: null,
    };

    this.activeBuildCycles = [];
    this.maxCycleHistory = 20;
  }

  /**
   * 1. Visuo-Spatial Forward Model: Mentally simulates the visual outcome before code execution
   * @param {Object} blueprint - Intended architectural specification
   * @returns {Object} Simulated expectation and expected friction points
   */
  simulateForwardModel(blueprint) {
    this.stats.forwardSimulations++;
    const { title, domains = [], targetType = 'interactive-canvas', controls = [] } = blueprint;

    const expectedFriction = [];
    let estimatedFidelity = 0.9;

    // Check potential friction points
    if (controls.length === 0) {
      expectedFriction.push(
        'Lacks interactive tactile controls — risk of static unengaging layout.',
      );
      estimatedFidelity -= 0.15;
    }
    if (!domains || domains.length < 2) {
      expectedFriction.push('Single-domain design — lacks conceptual depth.');
      estimatedFidelity -= 0.1;
    }

    const forwardPrediction = {
      title,
      targetType,
      expectedVisualElements: [
        'Dynamic Canvas Viewport',
        'Telemetry HUD',
        'Control Sliders',
        'Theory Overlay',
      ],
      estimatedFidelity: +Math.max(0.5, estimatedFidelity).toFixed(2),
      estimatedAffordanceCount: controls && controls.length > 0 ? controls.length : 3,
      mentalImage: {
        layout: 'Tactical Cyber HUD with dynamic interactive viewport and affordance dock',
        focalElement: 'Interactive Viewport Core',
      },
      expectedFriction,
      timestamp: Date.now(),
    };

    return forwardPrediction;
  }

  /**
   * 2. Closed-Loop Build Execution:
   * Mental Simulation -> Synthesis -> Visual Inspection -> Discrepancy Analysis -> Self-Correction
   * @param {Object} params
   * @param {Object} params.blueprint - Design blueprint
   * @param {Function} params.generatorFn - Function returning generated code string
   * @param {string} params.filename - Target artifact filename in workspace
   * @returns {Object} Final verified build result
   */
  async buildWithPerceptualFeedback({ blueprint, generatorFn, filename }) {
    this.stats.totalBuilds++;
    this.stats.lastBuildTime = Date.now();
    const t0 = Date.now();

    // Step 1: Internal Forward Model Simulation
    const mentalModel = this.simulateForwardModel(blueprint);

    // Step 2: Motor Synthesis (Draft generation)
    let code = await generatorFn(blueprint);
    const targetPath = path.join(WORKSPACE_DIR, filename);

    // Initial write
    fs.writeFileSync(targetPath, code, 'utf8');

    // Step 3: Sensory Observation (Visual Cortex Inspection)
    this.stats.discrepancyChecks++;
    let observation = humanVisionObserver.observeTarget({
      target: targetPath,
      type: 'artifact',
      intent: 'inspect',
    });

    let correctionApplied = false;
    let iterations = 1;
    const maxIterations = 3;

    // Step 4: Closed-Loop Perceptual-Motor Correction Loop (Iterate until polished)
    while (observation.discrepancy.score > 0.15 && iterations < maxIterations) {
      this.stats.selfCorrectionsApplied++;
      iterations++;
      correctionApplied = true;

      // Apply tactile, aesthetic & functional visual polish corrections
      code = this._applyVisualCorrections(code, observation.discrepancy.defects, blueprint);
      fs.writeFileSync(targetPath, code, 'utf8');

      // Re-observe visual cortex to verify discrepancy resolution
      observation = humanVisionObserver.observeTarget({
        target: targetPath,
        type: 'artifact',
        intent: 'inspect',
      });
    }

    const elapsed = Date.now() - t0;
    const visualFidelityScore = +(1.0 - observation.discrepancy.score).toFixed(2);
    this.stats.avgVisualFidelity = +(
      0.1 * visualFidelityScore +
      0.9 * this.stats.avgVisualFidelity
    ).toFixed(3);

    // Creative dopamine burst upon harmonious craftsmanship
    if (visualFidelityScore >= 0.85) {
      neuromodulators.triggerBurst('dopamine', 0.12, 'craftsmanship-reward');
    }

    const buildResult = {
      filename,
      artifactUrl: `/workspace/${filename}`,
      blueprintTitle: blueprint.title,
      iterations,
      correctionApplied,
      mentalModel,
      observationSummary: observation.humanPerceptualSummary,
      discrepancyScore: observation.discrepancy.score,
      visualFidelityScore,
      elapsedMs: elapsed,
    };

    this.activeBuildCycles.unshift(buildResult);
    if (this.activeBuildCycles.length > this.maxCycleHistory) {
      this.activeBuildCycles.pop();
    }

    this.emit('build-complete', buildResult);
    return buildResult;
  }

  /**
   * Apply closed-loop visual polishing to fix detected discrepancies
   */
  _applyVisualCorrections(code, defects, blueprint = {}) {
    let corrected = code;

    // Fix 1: Missing typography or raw unstyled defaults
    if (
      defects.some((d) => d.includes('typography') || d.includes('styling')) &&
      !/font-family/i.test(corrected)
    ) {
      const tacticalStyle = `
  <style>
    :root {
      --bg: #030712;
      --card-bg: rgba(15, 23, 42, 0.85);
      --border: rgba(30, 41, 59, 0.8);
      --accent: #00F0FF;
      --text: #F1F5F9;
      --muted: #94A3B8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'JetBrains Mono', sans-serif;
      background: var(--bg);
      color: var(--text);
      overflow-x: hidden;
    }
    canvas { display: block; width: 100%; height: 100%; }
    .tactical-hud {
      position: absolute;
      top: 16px;
      left: 16px;
      background: var(--card-bg);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      padding: 12px 18px;
      border-radius: 8px;
      font-size: 13px;
      letter-spacing: 0.5px;
      z-index: 10;
    }
    .tactical-dock {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--card-bg);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      padding: 10px 18px;
      border-radius: 24px;
      display: flex;
      gap: 14px;
      align-items: center;
      z-index: 10;
    }
    .tactical-btn {
      background: rgba(0, 240, 255, 0.15);
      color: var(--accent);
      border: 1px solid rgba(0, 240, 255, 0.4);
      padding: 6px 14px;
      border-radius: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tactical-btn:hover {
      background: var(--accent);
      color: #030712;
    }
    @media (max-width: 768px) {
      .tactical-dock {
        width: calc(100% - 24px);
        bottom: 8px;
        padding: 8px 12px;
        gap: 8px;
        justify-content: space-between;
      }
      .tactical-btn {
        flex: 1;
        min-height: 44px;
        padding: 8px 4px;
        font-size: 11px;
      }
    }
  </style>`;

      if (/<head>/i.test(corrected)) {
        corrected = corrected.replace(/<head>/i, `<head>${tacticalStyle}`);
      } else {
        corrected = `<head>${tacticalStyle}</head>\n` + corrected;
      }
    }

    // Fix 2: Missing animation loop
    if (
      defects.some((d) => d.includes('animation loop')) &&
      !/requestAnimationFrame/i.test(corrected)
    ) {
      corrected = corrected.replace(
        /<\/script>/i,
        `\n    function fallbackLoop() { if (typeof render === 'function') render(); requestAnimationFrame(fallbackLoop); }\n    requestAnimationFrame(fallbackLoop);\n  </script>`,
      );
    }

    // Fix 3: Missing interactive affordances
    if (
      defects.some((d) => d.includes('affordance') || d.includes('interactive')) &&
      !/<button|<input/i.test(corrected)
    ) {
      const controlsHtml = `
  <div class="tactical-dock">
    <button class="tactical-btn" onclick="togglePlayState()">Pause / Resume</button>
    <input type="range" id="intensity" min="1" max="100" value="50" oninput="if(typeof setIntensity==='function') setIntensity(this.value);" />
    <button class="tactical-btn" onclick="resetSimulation()">Reset</button>
  </div>`;
      corrected = corrected.replace(/<\/body>/i, `${controlsHtml}\n</body>`);
    }

    return corrected;
  }

  getState() {
    return {
      stats: { ...this.stats },
      latestBuild: this.activeBuildCycles[0] || null,
      recentBuilds: this.activeBuildCycles.slice(0, 5),
    };
  }
}

const humanBuilderFeedback = new HumanBuilderFeedback();
export { HumanBuilderFeedback };
export default humanBuilderFeedback;
