import {
  createStudioProject,
  studioStatus,
  generateTexture,
  renderGraphic,
  verifyStudioArtifact,
} from '../services/creationStudio.js';
import { verifyCreationTask, reviewWorkspaceVisual } from '../services/creationTaskVerifier.js';
import { generateBrowserApp, repairBrowserApp } from '../services/browserArtifactBuilder.js';
import { generateBrowserProject } from '../services/browserProjectBuilder.js';
const browserActions = {
  type: 'array',
  maxItems: 8,
  items: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['click', 'press', 'wait-for', 'hold-key'] },
      selector: { type: 'string' },
      key: { type: 'string' },
      frames: { type: 'integer', minimum: 1, maximum: 120 },
    },
    required: ['type'],
  },
};

export const creationTools = {
  generate_browser_project: {
    name: 'generate_browser_project',
    description:
      'Build a substantial original 3D scene/game as a multi-file project: design/API plan, detailed materials, reusable models, full experience, then actual Chrome preflight and up to two runtime repairs. Preserves the complete brief and real receipts. One autonomous build uses multiple model calls; it is not strict single-call generation. Use a NEW empty directory. Follow with task-specific behavior and visual review.',
    parameters: { brief: 'string', directory: 'string', repairBudget: 'number' },
    required: ['brief', 'directory'],
    execute: generateBrowserProject,
  },
  repair_browser_app: {
    name: 'repair_browser_app',
    description:
      'Repair observed defects in existing workspace HTML or JavaScript modules using a dedicated code model call and bounded relevant source ranges. Applies exact unique or scoped repeated patches atomically, rejects invalid syntax or concurrent edits, and saves the real model receipt. Follow with behavioral and visual checks.',
    parameters: {
      filename: 'string',
      instructions: 'string',
      reasoning: 'boolean',
      ranges: {
        type: 'array',
        maxItems: 6,
        items: {
          type: 'object',
          properties: {
            start: { type: 'integer', minimum: 1 },
            end: { type: 'integer', minimum: 1 },
          },
          required: ['start', 'end'],
        },
      },
    },
    required: ['filename', 'instructions', 'ranges'],
    execute: repairBrowserApp,
  },
  generate_browser_app: {
    name: 'generate_browser_app',
    description:
      'Generate an original complete browser game, graphic simulation or HTML application from the FULL user brief. Validates document completeness and inline script syntax before saving. Returns saved URL. Follow with behavioral testing and visual review. Use file tools for multi-file projects or targeted repairs.',
    parameters: { brief: 'string', filename: 'string', oneShot: 'boolean' },
    required: ['brief', 'filename'],
    execute: generateBrowserApp,
  },
  verify_workspace_code_task: {
    name: 'verify_workspace_code_task',
    description:
      'Run real Chrome acceptance tests for a matching published task: invoice, articulated-lamp, courtyard-museum, skyline-courier, northlight-workshop (doorway circulation, actual steps, cameras, roof/light controls), canal-rescue (acceleration, inertia, braking, pause, bank collision, rescue/delivery and restart). Also checks phone overflow, runtime and rendering errors. Fix failures and rerun. Other briefs require their own tests.',
    parameters: { filename: 'string', task: 'string' },
    required: ['filename', 'task'],
    execute: verifyCreationTask,
  },
  review_workspace_visual: {
    name: 'review_workspace_visual',
    description:
      'Capture workspace HTML/image in Chrome and send the actual screenshot and original brief to the configured vision-capable model for specific visual critique. Returns the real provider response or error. Opinion is not a behavioral test or certification.',
    parameters: { filename: 'string', brief: 'string', actions: browserActions },
    required: ['filename', 'brief'],
    execute: reviewWorkspaceVisual,
  },
  get_creation_workspace: {
    name: 'get_creation_workspace',
    description:
      'Get the real local creation workspace path, saved projects, and installed graphics capabilities.',
    parameters: {},
    execute: async ({ includeAssets = false } = {}) => {
      const status = await studioStatus();
      return includeAssets
        ? status
        : {
            ...status,
            totalProjects: status.projects.length,
            projects: status.projects
              .slice(0, 6)
              .map(({ name, directory, createdAt }) => ({ name, directory, createdAt })),
          };
    },
  },
  create_workspace_project: {
    name: 'create_workspace_project',
    description:
      'Create an isolated persistent local project with src, assets, renders, reports and a brief. Use the returned directory for file tools and run_command cwd.',
    parameters: { name: 'string', brief: 'string' },
    required: ['name'],
    execute: createStudioProject,
  },
  generate_texture: {
    name: 'generate_texture',
    description:
      'Create a tileable procedural PNG material plus normal and roughness maps locally: wood, marble, brick, metal, fabric, noise, checker, grid, rings. Supports size 64–2048, seed, #RRGGBB color and a workspace-relative filename including project subfolders. Returns real URLs and decoded dimensions.',
    parameters: {
      kind: 'string',
      size: 'number',
      seed: 'number',
      color: 'string',
      filename: 'string',
    },
    execute: generateTexture,
  },
  render_graphic: {
    name: 'render_graphic',
    description:
      'Render your custom self-contained SVG artwork to a real PNG, preserving SVG source. Author shapes, paths, text and gradients to match the brief. No image provider or API key required. Not photographic image generation.',
    parameters: { svg: 'string', filename: 'string', width: 'number' },
    required: ['svg'],
    execute: renderGraphic,
  },
  verify_workspace_artifact: {
    name: 'verify_workspace_artifact',
    description:
      'Load a saved workspace HTML or image in real Chrome; capture a PNG and persist observed runtime/load errors in a JSON report. Inspect the screenshot and repair failures before delivery. Does not prove artistic quality or all interactions.',
    parameters: { filename: 'string', width: 'number', height: 'number', actions: browserActions },
    required: ['filename'],
    execute: verifyStudioArtifact,
  },
};
