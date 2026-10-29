// SIS 1.0 — Human Visual Perception & Active Observer Engine
// Models the biological human visual system:
// 1. Saccadic Foveation (Yarbus scanpaths, Itti-Koch visual saliency)
// 2. Dual Visual Streams (Goodale & Milner):
//    - Ventral Stream ("What"): Semantic categorization, color, form, hierarchy, aesthetics
//    - Dorsal Stream ("Where/How"): Spatial coordinates, interaction affordances, motion, state mutations
// 3. Predictive Coding in Vision (Rao & Ballard, Friston):
//    - Discrepancy computation between mental forward model and observed visual layout.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EventEmitter } from 'events';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = process.env.SIS_WORKSPACE_DIR ? path.resolve(process.env.SIS_WORKSPACE_DIR) : path.join(__dirname, '../../workspace');

class HumanVisionObserver extends EventEmitter {
  constructor() {
    super();
    this.stats = {
      totalObservations: 0,
      totalSaccades: 0,
      ventralClassifications: 0,
      dorsalAffordancesIdentified: 0,
      visualDiscrepanciesDetected: 0,
      lastObservationTime: null,
    };

    // Current attentional focus state
    this.currentGaze = {
      target: null,
      fovealFocus: null,
      peripheralContext: null,
      scanpath: [],
      ventralAnalysis: null,
      dorsalAffordances: [],
      visualDiscrepancy: 0.0,
    };

    this.observationHistory = [];
    this.maxHistory = 50;
  }

  /**
   * Scan a visual target (HTML, code, DOM structure, or file) using active human foveation
   * @param {Object} params
   * @param {string} params.target - Content or filename to observe
   * @param {string} [params.type='file'] - 'file' | 'code' | 'artifact' | 'text'
   * @param {string} [params.intent='general'] - 'inspect' | 'debug' | 'affordance' | 'aesthetic' | 'general'
   * @returns {Object} Full perceptual observation analysis
   */
  observeTarget({ target, type = 'file', intent = 'general' }) {
    this.stats.totalObservations++;
    this.stats.lastObservationTime = Date.now();

    let content;
    let targetName;

    if (type === 'file' || type === 'artifact') {
      const fullPath = path.isAbsolute(target) ? target : path.join(WORKSPACE_DIR, target);
      targetName = path.basename(fullPath);
      if (fs.existsSync(fullPath)) {
        try {
          content = fs.readFileSync(fullPath, 'utf8');
        } catch (e) {
          content = `[File read error: ${e.message}]`;
        }
      } else {
        content = target; // Fallback to raw string
      }
    } else {
      content = String(target || '');
      targetName = type;
    }

    // 1. Saccadic Foveation: Determine fixation points and scanpath
    const fovealAnalysis = this._performSaccadicScan(content, intent);
    this.stats.totalSaccades += fovealAnalysis.scanpath.length;

    // 2. Ventral Stream Processing ("What"): Form, Structure, Semantic Hierarchy, Style
    const ventral = this._processVentralStream(content, fovealAnalysis);
    this.stats.ventralClassifications++;

    // 3. Dorsal Stream Processing ("Where/How"): Interactive Affordances, Geometry, Spatial Controls
    const dorsal = this._processDorsalStream(content, fovealAnalysis);
    this.stats.dorsalAffordancesIdentified += dorsal.affordances.length;

    // 4. Visual Discrepancy & Predictive Coding: Detect defects, missing elements, or layout glitches
    const discrepancy = this._calculateVisualDiscrepancy(content, ventral, dorsal, intent);
    if (discrepancy.score > 0.25) {
      this.stats.visualDiscrepanciesDetected++;
    }

    const observation = {
      target: targetName,
      type,
      intent,
      timestamp: Date.now(),
      foveal: fovealAnalysis,
      ventral,
      dorsal,
      discrepancy,
      humanPerceptualSummary: this._synthesizePerceptualSummary(ventral, dorsal, discrepancy),
    };

    // Update current gaze
    this.currentGaze = {
      target: targetName,
      fovealFocus: fovealAnalysis.primaryFocus,
      peripheralContext: fovealAnalysis.peripheralOverview,
      scanpath: fovealAnalysis.scanpath,
      ventralAnalysis: ventral,
      dorsalAffordances: dorsal.affordances,
      visualDiscrepancy: discrepancy.score,
    };

    this.observationHistory.unshift(observation);
    if (this.observationHistory.length > this.maxHistory) {
      this.observationHistory.pop();
    }

    this.emit('observation', observation);
    return observation;
  }

  /**
   * Saccadic scanpath generator: Models human visual fixations based on informational salience
   */
  _performSaccadicScan(content, intent) {
    const lines = content.split('\n');
    const fixations = [];

    // Identify informational peaks (interactive elements, functions, canvas setups, styling roots)
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      let salience = 0.0;
      let featureType = 'neutral';

      if (/<canvas|<svg|new\s+Three\./i.test(trimmed)) {
        salience += 0.95;
        featureType = 'rendering-core';
      } else if (/<button|<input|<select|addEventListener|onClick/i.test(trimmed)) {
        salience += 0.85;
        featureType = 'tactile-affordance';
      } else if (/function\s+\w+|class\s+\w+|const\s+\w+\s*=\s*(async\s*)?\(/i.test(trimmed)) {
        salience += 0.75;
        featureType = 'logic-architecture';
      } else if (/<style|css|class="|id="/i.test(trimmed)) {
        salience += 0.65;
        featureType = 'aesthetic-form';
      } else if (/<header|<main|<nav|<section|display:\s*flex|display:\s*grid/i.test(trimmed)) {
        salience += 0.7;
        featureType = 'spatial-layout';
      }

      if (salience > 0.6) {
        fixations.push({
          line: index + 1,
          content: trimmed.slice(0, 100),
          salience,
          featureType,
        });
      }
    });

    // Sort by human scanpath priority: Rendering Core -> Layout -> Tactile Affordances -> Logic
    const scanpath = fixations.slice(0, 8).sort((a, b) => b.salience - a.salience);

    const primaryFocus = scanpath[0] || {
      line: 1,
      lineNumber: 1,
      content: lines[0]?.trim() || '',
      salience: 0.7,
      featureType: 'top',
    };
    if (!primaryFocus.lineNumber) primaryFocus.lineNumber = primaryFocus.line;

    return {
      totalLines: lines.length,
      primaryFocus,
      scanpath,
      peripheralOverview: {
        lineCount: lines.length,
        hasStyling: /<style|class=/i.test(content),
        hasInteractivity: /addEventListener|onClick|<button|<input/i.test(content),
        hasCanvas3D: /<canvas|three|webgl|requestAnimationFrame/i.test(content),
        peripheralClusters: ['styling', 'interactivity', 'canvas'],
        detectedElements: ['styling', 'interactivity', 'canvas'],
      },
    };
  }

  /**
   * Ventral Stream: "What is this object?"
   * Form, Aesthetic Coherence, Color Balance, Semantic Typography
   */
  _processVentralStream(content, foveal) {
    const isHtml = /<!DOCTYPE html|<html/i.test(content);
    const hasCanvas = /<canvas/i.test(content);
    const hasWebGL = /webgl|three\.js|gl_FragColor/i.test(content);
    const isJavaScript = /function\s+|const\s+|import\s+/i.test(content);

    // Aesthetic analysis
    const hasDarkTheme = /#030712|#0f172a|#111827|#0c0d12|#000|background:\s*#0/i.test(content);
    const hasGradients = /radial-gradient|linear-gradient/i.test(content);
    const hasBlurBackdrop = /backdrop-filter:\s*blur/i.test(content);
    const hasTypography = /font-family|letter-spacing/i.test(content);

    let visualArchetype = 'Raw Code / Textual Substrate';
    if (isHtml && hasCanvas && hasWebGL)
      visualArchetype = 'Interactive 3D / WebGL Canvas Application';
    else if (isHtml && hasCanvas) visualArchetype = 'Interactive 2D Canvas Physics Engine';
    else if (isHtml) visualArchetype = 'Polished HTML5 / DOM Application';
    else if (isJavaScript) visualArchetype = 'Algorithmic JavaScript Module';

    return {
      visualArchetype,
      isRenderableUI: isHtml,
      hasCanvas,
      hasWebGL,
      colorPalette: {
        isDarkTheme: hasDarkTheme,
        hasGradients,
        hasBlurBackdrop,
      },
      aestheticScore: +(
        (hasDarkTheme ? 0.3 : 0.1) +
        (hasGradients ? 0.25 : 0.1) +
        (hasBlurBackdrop ? 0.25 : 0.05) +
        (hasTypography ? 0.2 : 0.1)
      ).toFixed(2),
      composition: {
        darkTacticalAesthetic: hasDarkTheme,
        opticalDepth: hasGradients && hasBlurBackdrop,
        structuredTypography: hasTypography,
      },
    };
  }

  /**
   * Dorsal Stream: "Where is it and How can I interact with it?"
   * Affordances: Clickable, Draggable, Scrollable, Adjustable
   */
  _processDorsalStream(content, foveal) {
    const affordances = [];

    // Sliders
    const sliderMatches = content.match(/<input\s+[^>]*type=["']range["'][^>]*>/gi) || [];
    sliderMatches.forEach((s, idx) => {
      const idMatch = s.match(/id=["']([^"']+)["']/i);
      affordances.push({
        type: 'slider',
        subType: 'continuous-slider',
        id: idMatch ? idMatch[1] : `slider-${idx}`,
        action: 'adjust-parameter',
        description: 'Allows continuous real-time modulation of simulation variable',
      });
    });

    // Buttons
    const buttonMatches = content.match(/<button[^>]*>([^<]+)<\/button>/gi) || [];
    buttonMatches.forEach((b, idx) => {
      const textMatch = b.match(/>([^<]+)</);
      const text = textMatch ? textMatch[1].trim() : `button-${idx}`;
      affordances.push({
        type: 'button',
        subType: 'discrete-button',
        label: text,
        action: 'trigger-state-change',
        description: `Triggers "${text}" subroutine`,
      });
    });

    // Canvas Mouse / Pointer Interaction
    const hasPointerInteraction =
      /addEventListener\(["'](pointerdown|mousedown|mousemove|click)["']/i.test(content);
    if (hasPointerInteraction) {
      affordances.push({
        type: 'spatial-direct-manipulation',
        id: 'canvas-pointer-drag',
        action: 'direct-spatial-injection',
        description:
          'Click and drag in 2D/3D viewport injects force vectors or alters camera angle',
      });
    }

    // Keyboard Shortcuts
    const hasKeyboard = /addEventListener\(["'](keydown|keyup)["']/i.test(content);
    if (hasKeyboard) {
      affordances.push({
        type: 'tactile-keyboard-nav',
        action: 'hotkey-command',
        description: 'Keybindings detected for accelerated control',
      });
    }

    return {
      affordancesCount: affordances.length,
      affordances,
      interactiveDensity:
        affordances.length >= 3 ? 'high-tactile' : affordances.length > 0 ? 'moderate' : 'static',
    };
  }

  /**
   * Predictive Coding: Compare actual observations against expected human standards
   */
  _calculateVisualDiscrepancy(content, ventral, dorsal, intent) {
    const defects = [];
    let discrepancyScore = 0.0;

    // Defect 1: Blank or truncated content
    if (content.length < 200) {
      defects.push('Content is abnormally truncated or empty (<200 bytes).');
      discrepancyScore += 0.7;
    }

    // Defect 2: Raw unstyled HTML
    if (ventral.isRenderableUI && !ventral.composition.structuredTypography) {
      defects.push('Missing explicit typography or layout styling; defaults to browser generic.');
      discrepancyScore += 0.25;
    }

    // Defect 3: Static canvas without requestAnimationFrame or event listeners
    if (/canvas/i.test(ventral.visualArchetype) && !/requestAnimationFrame/i.test(content)) {
      defects.push('Canvas viewport detected without active 60 FPS animation loop.');
      discrepancyScore += 0.35;
    }

    // Defect 4: Missing interactive affordances for an interactive intent
    if (intent === 'affordance' && dorsal.affordances.length === 0) {
      defects.push(
        'Inspection targeted affordances but zero interactive controls were identified.',
      );
      discrepancyScore += 0.4;
    }

    return {
      score: +Math.min(1.0, discrepancyScore).toFixed(2),
      isHarmonious: discrepancyScore < 0.25,
      defects,
    };
  }

  _synthesizePerceptualSummary(ventral, dorsal, discrepancy) {
    if (discrepancy.isHarmonious) {
      return `Observed ${ventral.visualArchetype} with ${dorsal.interactiveDensity} tactile affordances (${dorsal.affordancesCount} controls). Visual harmony score: ${(1.0 - discrepancy.score).toFixed(2)}.`;
    }
    return `Observed visual anomalies in ${ventral.visualArchetype} (discrepancy score: ${discrepancy.score}): ${discrepancy.defects.join(' ')}`;
  }

  /**
   * Observe a workspace artifact by filename
   */
  observeArtifact(filename) {
    return this.observeTarget({ target: filename, type: 'artifact', intent: 'inspect' });
  }

  formatGazeForPrompt() {
    if (!this.currentGaze.target && !this.currentGaze.fovealFocus) return '';
    const gaze = this.currentGaze;
    return `## Active Human Gaze & Perceptual Context
- **Target Observed**: ${gaze.target || 'None'}
- **Foveal Focus (High Salience)**: ${gaze.fovealFocus?.line || 'None'}
- **Visual Archetype (Ventral "What")**: ${gaze.ventralAnalysis?.visualArchetype || 'Undetermined'}
- **Interactive Affordances (Dorsal "Where/How")**: ${gaze.dorsalAffordances?.map((a) => a.type).join(', ') || 'Direct inspection'}
- **Visual Harmony / Discrepancy**: Discrepancy ${(gaze.visualDiscrepancy * 100).toFixed(0)}%`;
  }

  getState() {
    return {
      currentGaze: this.currentGaze,
      stats: { ...this.stats },
      recentObservations: this.observationHistory.slice(0, 5).map((o) => ({
        target: o.target,
        archetype: o.ventral.visualArchetype,
        affordances: o.dorsal.affordancesCount,
        discrepancy: o.discrepancy.score,
        summary: o.humanPerceptualSummary,
        timestamp: o.timestamp,
      })),
    };
  }
}

const humanVisionObserver = new HumanVisionObserver();
export { HumanVisionObserver };
export default humanVisionObserver;
