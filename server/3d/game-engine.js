import { currentWorkspace } from '../services/conversationWorkspaces.js';
// SIS 1.0 — Studio 3D Game Engine & Autonomous Game Architect
// Generates task-specific Three.js HTML and reports observed runtime checks.
// Equipped with player controllers (WASD/arrows/pointer/touch), physics, enemy AI,
// procedural Web Audio sound synthesis, particle systems, cockpit/arcade HUDs, and win/loss states.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { synthesizeSplit3DGame } from './split-game-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sharedWorkspaceRoot = process.env.SIS_WORKSPACE_DIR
  ? path.resolve(process.env.SIS_WORKSPACE_DIR)
  : path.resolve(__dirname, '../../workspace');
const workspaceRoot = () => currentWorkspace()?.root || sharedWorkspaceRoot;

export class Studio3DGameEngine {
  constructor() {
    this.name = 'Studio 3D Game Engine (Generative Three.js WebGL + Web Audio)';
    this.status = 'ACTIVE';
    this.ensureWorkspace();
  }

  ensureWorkspace() {
    if (!fs.existsSync(workspaceRoot())) {
      fs.mkdirSync(workspaceRoot(), { recursive: true });
    }
  }

  /**
   * Main entrypoint: synthesizes any requested 3D game purely from generative AI.
   * ZERO TEMPLATES — builds custom 3D geometries, materials, lighting, controls, and audio from first principles.
   * @param {Object} params
   * @param {string} params.prompt - User's game prompt / query
   * @param {string} [params.title] - Optional game title
   * @param {Function} [params.onProgress] - Optional progress callback
   * @returns {Promise<Object>} Artifact metadata with url, filename, title, meshCount, controls
   */
  async synthesize3DGame({
    prompt = '3D Space Shooter Game',
    title = '',
    onProgress = null,
    referenceRequirements = '',
  }) {
    this.ensureWorkspace();
    const cleanPrompt = prompt.trim();
    const gameTitle = title || this._deriveTitle(cleanPrompt);

    // Every brief, including voxel requests, reaches the task-specific generator.
    // A failed generation is surfaced instead of changing the requested task.
    return await synthesizeSplit3DGame({
      prompt: cleanPrompt,
      title: gameTitle,
      onProgress,
      referenceRequirements,
    });
  }

  _deriveTitle(prompt) {
    const clean = prompt
      .replace(
        /^(?:make|create|generate|synthesize|build|code|develop|author|play|program)\s+(?:me\s+)?(?:a|an)?\s*/i,
        '',
      )
      .replace(/[\.\?!]+$/, '')
      .trim();
    if (!clean) return 'Custom 3D WebGL Game';
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  _ensureFluidEmbedStyles(html) {
    let out = html;
    // Add CSS ensuring no scrollbars and clean flex fit
    const embedFix = `
<style id="sis-game-embed-fix">
  html, body {
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    background: #000003 !important;
  }
  #canvas-container, canvas {
    display: block !important;
    width: 100% !important;
    height: 100% !important;
  }
</style>
`;
    if (!out.includes('sis-game-embed-fix')) {
      out = out.replace('</head>', `${embedFix}\n</head>`);
    }
    return out;
  }
}

export const studio3DGameEngine = new Studio3DGameEngine();
export default studio3DGameEngine;
