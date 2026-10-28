// SIS 1.0 — Tool Cognition Engine
// Cognitive decision matrix, semantic routing, and usage protocols for all tools.
// Ensures Supergence knows EXACTLY HOW and WHEN to use any tool across Open Design, FigCraft, and SIS subsystems.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../');

export class ToolCognitionEngine {
  constructor() {
    this.name = 'Tool Cognition Engine';
    this.version = '2.0.0';
    this.toolCatalog = this._buildCatalog();
  }

  _buildCatalog() {
    return {
      // ═══════════════════════════════════════════════════════════════════════
      // 1. OPEN DESIGN & FIGCRAFT VECTOR DESIGN SUITE
      // ═══════════════════════════════════════════════════════════════════════
      figcraft_create_design: {
        domain: 'Vector Design & Artboards',
        description:
          'Autonomously create complete, high-resolution vector UI artboards in FigCraft (.figcraft) with frames, shapes, typography, and auto-layout, and render a 2x retina PNG preview.',
        whenToUse: [
          'User requests vector design, artboard creation, mobile/desktop UI mocks in FigCraft, wireframes, or banners',
          'Designing vector iconography, brand kits, layout compositions, or component libraries',
          'Exporting visual vector specifications to be rendered into PNG or SVG',
        ],
        whenNotToUse: [
          'Do NOT use for 3D WebGL scenes or games (use generate_3d_game or generate_3d_scene instead)',
          'Do NOT use for standalone HTML landing pages (use open_design_generate_ui or supergenceDesignEngine)',
        ],
        parameters: {
          name: {
            type: 'string',
            required: true,
            description: 'Artboard title (e.g., "Linear Dark Mode Dashboard")',
          },
          width: {
            type: 'number',
            required: false,
            default: 1200,
            description: 'Width in pixels (e.g. 1440, 1200, 393 for mobile)',
          },
          height: {
            type: 'number',
            required: false,
            default: 800,
            description: 'Height in pixels (e.g. 900, 800, 852 for mobile)',
          },
          backgroundColor: {
            type: 'string',
            required: false,
            default: '#07090E',
            description: 'Hex or rgba background color',
          },
          primaryColor: {
            type: 'string',
            required: false,
            default: '#6366F1',
            description: 'Primary brand accent color',
          },
          elements: {
            type: 'array',
            required: false,
            description:
              'List of elements ({type: rectangle|ellipse|text|vector, x, y, width, height, fills, text, fontSize})',
          },
        },
        compositionChain: [
          'open_design_get_system -> figcraft_create_design -> figcraft_render_preview',
        ],
      },

      figcraft_render_preview: {
        domain: 'Vector Design & Artboards',
        description:
          'Render any .figcraft vector design file into a high-resolution, crisp PNG at 2x or 3x scale.',
        whenToUse: [
          'Whenever a .figcraft file is created or edited and needs a visual image render for user review or Center Stage',
        ],
        parameters: {
          file: {
            type: 'string',
            required: true,
            description: 'Path or filename of the .figcraft file in ./workspace/',
          },
          scale: {
            type: 'number',
            required: false,
            default: 2,
            description: 'Render scale multiplier (1, 2, or 3)',
          },
        },
      },

      figcraft_export_assets: {
        domain: 'Vector Design & Artboards',
        description:
          'Export frames or layers from a .figcraft design into SVG, PNG, PDF, or Figma (.fig) format.',
        whenToUse: [
          'User requests downloading or exporting vectors to SVG, PDF, or Figma format',
          'Extracting production icon assets or print-ready collateral',
        ],
        parameters: {
          file: { type: 'string', required: true, description: 'Path to .figcraft file' },
          format: {
            type: 'string',
            required: false,
            default: 'svg',
            enum: ['svg', 'png', 'jpg', 'webp', 'pdf', 'fig'],
          },
          outDir: { type: 'string', required: false, description: 'Target export directory' },
        },
      },

      figcraft_inspect_file: {
        domain: 'Vector Design & Artboards',
        description:
          'Inspect the layer hierarchy, nodes, frames, typography styles, and metadata of any FigCraft or Figma file in JSON format.',
        whenToUse: [
          'Analyzing an existing design template or user-provided .figcraft/.fig file before making edits',
        ],
        parameters: {
          file: { type: 'string', required: true, description: 'Path to .figcraft or .fig file' },
        },
      },

      figcraft_run_command: {
        domain: 'Vector Design & Artboards',
        description:
          'Execute arbitrary native FigCraft commands (node.create, frame.create, shape.*, text.create, layout.auto, component.create) headlessly.',
        whenToUse: [
          'Low-level programmatic automation of FigCraft canvas operations and precision vector geometry',
        ],
        parameters: {
          commands: { type: 'array', required: true, description: 'Array of { command, params }' },
          outFile: { type: 'string', required: false, description: 'Target .figcraft output file' },
        },
      },

      open_design_list_systems: {
        domain: 'Open Design Tokens & Systems',
        description:
          'List all 100+ available design systems in Open Design (Linear, Apple, Bento, Stripe, Vercel, Tailwind, etc.).',
        whenToUse: [
          'User asks what design systems or themes are available, or when selecting an aesthetic for a new UI project',
        ],
        parameters: {},
      },

      open_design_get_system: {
        domain: 'Open Design Tokens & Systems',
        description:
          'Retrieve exact color tokens, typography scales, glassmorphism filters, border radius, and CSS variables for a specific design system.',
        whenToUse: [
          'Before building frontend UI or vector layouts to ground styles in authentic design system tokens (e.g. Linear #07090E canvas, Inter Variable typography)',
        ],
        parameters: {
          system: {
            type: 'string',
            required: true,
            description:
              'Name of design system (e.g., "linear-app", "apple", "bento", "modern-saas", "stripe")',
          },
        },
      },

      open_design_apply_craft: {
        domain: 'Open Design Tokens & Systems',
        description:
          'Retrieve authoritative design craft principles: anti-ai-slop, accessibility-baseline, animation-discipline, laws-of-ux, typography-hierarchy.',
        whenToUse: [
          'Refining designs to eliminate AI slop, verify WCAG contrast, structure typography scales, and tune micro-interactions',
        ],
        parameters: {
          topic: {
            type: 'string',
            required: false,
            default: 'anti-ai-slop',
            description: 'Craft topic',
          },
        },
      },

      open_design_generate_ui: {
        domain: 'Open Design Tokens & Systems',
        description:
          'Autonomously generate full-fidelity, responsive HTML/CSS/JS components or pages utilizing Open Design tokens and craft rules.',
        whenToUse: [
          'User requests a landing page, dashboard component, hero section, or modern web app UI',
        ],
        parameters: {
          system: {
            type: 'string',
            required: false,
            default: 'linear-app',
            description: 'Design system to style with',
          },
          type: {
            type: 'string',
            required: false,
            default: 'landing_page',
            enum: ['landing_page', 'dashboard', 'component'],
          },
          spec: {
            type: 'object',
            required: true,
            description: 'UI specification (title, tagline, features, colors)',
          },
        },
      },

      open_design_to_figcraft: {
        domain: 'Vector Design & Artboards',
        description:
          'Bridge Open Design and FigCraft: Convert Open Design tokens and layout specifications into a native .figcraft vector artboard with a 2x PNG render.',
        whenToUse: [
          'When the user wants an Open Design layout materialized as an editable FigCraft vector artboard',
        ],
        parameters: {
          system: {
            type: 'string',
            required: true,
            description: 'Open Design system name (e.g. "linear-app", "apple", "bento")',
          },
          name: { type: 'string', required: false, description: 'Artboard name' },
          filename: { type: 'string', required: false, description: 'Target filename' },
        },
      },

      // ═══════════════════════════════════════════════════════════════════════
      // 2. AUTONOMOUS STARTUP & BUSINESS ENGINE
      // ═══════════════════════════════════════════════════════════════════════
      create_startup_venture: {
        domain: 'Autonomous Startup Venture',
        description:
          'Conceive, architect, and deploy an entire startup from scratch: C-Suite roster, working landing page, MVP app dashboard, DB schema, and financial model.',
        whenToUse: [
          'User requests creating a whole startup, SaaS venture, founding a company, or automated business engine',
        ],
        parameters: {
          prompt: {
            type: 'string',
            required: true,
            description: 'Startup concept or industry vision',
          },
          unlimited: {
            type: 'boolean',
            required: false,
            default: true,
            description: 'Start 24/7 unlimited autonomous execution loop',
          },
        },
      },

      start_startup_unlimited: {
        domain: 'Autonomous Startup Venture',
        description:
          'Start the 24/7 continuous recursive execution loop for a startup venture, iteratively building features, testing, and growing.',
        whenToUse: [
          'Initiating indefinite continuous operations on an existing or newly created startup venture',
        ],
        parameters: {
          slug: { type: 'string', required: true, description: 'Venture slug' },
          intervalMs: {
            type: 'number',
            required: false,
            default: 30000,
            description: 'Cycle interval in milliseconds',
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════════════
      // 3. 3D GRAPHICS & GAME ENGINES
      // ═══════════════════════════════════════════════════════════════════════
      generate_3d_game: {
        domain: '3D Graphics & Games',
        description:
          'Synthesize a complete, studio-grade 3D Three.js game (voxel/Minecraft, arcade, physics) with controls, audio, and camera tracking.',
        whenToUse: [
          'User requests a 3D game, Minecraft clone, voxel world, or interactive WebGL game',
        ],
        parameters: {
          prompt: { type: 'string', required: true, description: 'Game concept description' },
          title: { type: 'string', required: false, description: 'Game title' },
        },
      },

      generate_3d_scene: {
        domain: '3D Graphics & Games',
        description:
          'Generate an interactive 3D Three.js visualization or physics simulation and save to workspace.',
        whenToUse: [
          'User asks for 3D data visualization, molecular models, or Newtonian orbital physics',
        ],
        parameters: {
          description: { type: 'string', required: true, description: '3D scene specification' },
          filename: { type: 'string', required: false, description: 'Target HTML filename' },
        },
      },

      // ═══════════════════════════════════════════════════════════════════════
      // 4. HOST HARDWARE & OS ACTUATION
      // ═══════════════════════════════════════════════════════════════════════
      openclaw_getSystemTelemetry: {
        domain: 'Hardware & OS Forensics',
        description:
          'Query real host hardware telemetry: CPU core clocks, physical RAM load, memory commit limits, and platform metrics with zero canned values.',
        whenToUse: [
          'Hardware audits, system performance monitoring, memory diagnostics, and real OS metrics',
        ],
        parameters: {},
      },

      openclaw_executeShell: {
        domain: 'Hardware & OS Forensics',
        description:
          'Execute powershell / cmd commands directly on the user machine with stdout/stderr capture.',
        whenToUse: ['Running terminal commands, builds, compiler benchmarks, or system scripts'],
        parameters: {
          command: { type: 'string', required: true, description: 'Shell command string' },
        },
      },

      // ═══════════════════════════════════════════════════════════════════════
      // 5. CODE VERIFICATION & STATIC ANALYSIS
      // ═══════════════════════════════════════════════════════════════════════
      ast_syntax_verifier: {
        domain: 'Code Engineering',
        description:
          'Verify syntax, token balance, and lexical invariants across C++, Python, JavaScript, and GLSL.',
        whenToUse: ['Validating code before saving or after editing to ensure zero syntax defects'],
        parameters: {
          code: { type: 'string', required: true, description: 'Code string' },
          language: { type: 'string', required: true, description: 'Language identifier' },
        },
      },

      code_complexity_analyzer: {
        domain: 'Code Engineering',
        description:
          'Perform asymptotic Big-O time/space and cyclomatic complexity analysis on source code.',
        whenToUse: [
          'Benchmarking algorithm efficiency, optimizing inner loops, and refactoring complex logic',
        ],
        parameters: {
          code: { type: 'string', required: true, description: 'Code string' },
        },
      },

      // ═══════════════════════════════════════════════════════════════════════
      // 6. WEB INTELLIGENCE & RESEARCH
      // ═══════════════════════════════════════════════════════════════════════
      web_search: {
        domain: 'Live Web & Research',
        description:
          'Execute live web search across Google/Bing for up-to-date facts, documentation, or real-time news.',
        whenToUse: ['Querying live external information, API documentation, or current events'],
        parameters: {
          query: { type: 'string', required: true, description: 'Search query' },
        },
      },

      web_fetch: {
        domain: 'Live Web & Research',
        description: 'Fetch and parse text/HTML content directly from a target URL.',
        whenToUse: ['Extracting content from a specific webpage or API endpoint'],
        parameters: {
          url: { type: 'string', required: true, description: 'Web URL' },
        },
      },
    };
  }

  /**
   * Return structured decision matrix array across all catalog tools
   */
  getDecisionMatrix() {
    return Object.entries(this.toolCatalog).map(([name, def]) => ({
      name,
      domain: def.domain,
      description: def.description,
      whenToUse: def.whenToUse,
      whenNotToUse: def.whenNotToUse,
      parameters: def.parameters,
      compositionChain: def.compositionChain,
    }));
  }

  /**
   * Returns formatted cognitive guide for the model system prompt
   */
  getToolCallingPrompt() {
    let out = `### 🧠 AUTONOMOUS TOOL COGNITION & DECISION MATRIX (HOW & WHEN TO USE TOOLS)
Supergence has direct sovereign access to a comprehensive suite of native tools. You must know EXACTLY how and when to invoke each tool:

#### 1. VECTOR DESIGN & ARTBOARDS (FIGCRAFT & OPEN DESIGN):
- **figcraft_create_design**: When the user asks for a vector artboard, mobile/desktop UI mockup in FigCraft, wireframe, or vector asset. Creates a native .figcraft file and renders a 2x PNG preview!
  * Call: \`{"tool": "figcraft_create_design", "args": {"name": "SaaS Dashboard UI", "width": 1440, "height": 900, "primaryColor": "#6366F1"}}\`
- **figcraft_render_preview**: When you want to re-render any existing .figcraft file into a crisp PNG.
  * Call: \`{"tool": "figcraft_render_preview", "args": {"file": "design_name.figcraft", "scale": 2}}\`
- **figcraft_export_assets**: When the user requests SVG, PDF, or Figma (.fig) export.
  * Call: \`{"tool": "figcraft_export_assets", "args": {"file": "design_name.figcraft", "format": "svg"}}\`
- **figcraft_inspect_file**: When you need to inspect layers, artboards, and typography nodes of a design file.
  * Call: \`{"tool": "figcraft_inspect_file", "args": {"file": "template.figcraft"}}\`
- **open_design_list_systems**: When exploring or listing available design systems (100+ systems: Linear, Apple, Bento, Stripe, Vercel, Tailwind, etc.).
  * Call: \`{"tool": "open_design_list_systems", "args": {}}\`
- **open_design_get_system**: Before generating UI, retrieve exact color tokens, typography, glassmorphism filters, and CSS variables.
  * Call: \`{"tool": "open_design_get_system", "args": {"system": "linear-app"}}\`
- **open_design_apply_craft**: Retrieve authoritative design craft guidelines (anti-ai-slop, accessibility-baseline, animation-discipline, laws-of-ux, typography-hierarchy).
  * Call: \`{"tool": "open_design_apply_craft", "args": {"topic": "anti-ai-slop"}}\`
- **open_design_generate_ui**: Generate production-grade, responsive HTML/CSS/JS components or pages utilizing Open Design tokens.
  * Call: \`{"tool": "open_design_generate_ui", "args": {"system": "linear-app", "spec": {"title": "NeuroPulse", "tagline": "..."}}}\`
- **open_design_to_figcraft**: Convert an Open Design layout/component directly into a native FigCraft vector design with a 2x rendered PNG!
  * Call: \`{"tool": "open_design_to_figcraft", "args": {"system": "bento", "name": "Bento Feature Grid"}}\`

#### 2. AUTONOMOUS STARTUP & BUSINESS:
- **create_startup_venture**: When the user asks to conceive/build a complete startup or SaaS business.
  * Call: \`{"tool": "create_startup_venture", "args": {"prompt": "AI Legal Tech", "unlimited": true}}\`
- **start_startup_unlimited**: Start the 24/7 continuous recursive execution loop for a venture.
  * Call: \`{"tool": "start_startup_unlimited", "args": {"slug": "venture_slug"}}\`

#### 3. 3D GRAPHICS & GAMING:
- **generate_3d_game**: When asked for 3D games, voxel/Minecraft clones, or interactive WebGL arcade games.
  * Call: \`{"tool": "generate_3d_game", "args": {"prompt": "Voxel Minecraft survival", "title": "VoxelCraft"}}\`
- **generate_3d_scene**: When asked for 3D physics, orbits, or scientific simulations.
  * Call: \`{"tool": "generate_3d_scene", "args": {"description": "N-Body Solar System"}}\`

#### 4. HOST HARDWARE & SYSTEM:
- **openclaw_getSystemTelemetry**: Real host hardware diagnostics (CPU, RAM, platform) — zero fake metrics.
  * Call: \`{"tool": "openclaw_getSystemTelemetry", "args": {}}\`
- **openclaw_executeShell**: Direct system command execution.
  * Call: \`{"tool": "openclaw_executeShell", "args": {"command": "dir"}}\`

#### 5. CODE VERIFICATION & LIVE RESEARCH:
- **ast_syntax_verifier**: Validate syntax invariants across C++, Python, JavaScript.
- **web_search** / **web_fetch**: Real-time live web browsing and data extraction.

#### 6. DYNAMIC TOOL GENESIS (ADA-SI):
- If the user asks for a task that requires a capability not present in the current tool catalog, Supergence autonomously invokes Subconscious Tool Genesis to synthesize, test, and hot-register the tool immediately!

#### TOOL CALLING INVOCATION PROTOCOL:
When invoking a tool, output a single balanced JSON block:
\`\`\`json
{
  "tool": "<tool_name>",
  "args": { <parameters> }
}
\`\`\`
The unified intelligence system will execute the tool, capture real output, mount visual artifacts in Center Stage, and stream back verified results.`;
    return out;
  }

  /**
   * Recommend tools for a given user query
   */
  recommendToolsForIntent(query = '') {
    const q = query.toLowerCase();
    const recommendations = [];

    if (/figcraft|vector|artboard|canvas|icon|wireframe|mockup|figma|\.fig/i.test(q)) {
      recommendations.push({
        tool: 'figcraft_create_design',
        confidence: 0.95,
        rationale: 'User requested vector artboard or FigCraft design capabilities',
      });
      recommendations.push({
        tool: 'open_design_to_figcraft',
        confidence: 0.9,
        rationale: 'Bridge Open Design tokens into native FigCraft vector artboards',
      });
    }

    if (
      /open\s*design|design\s*system|tokens|linear\s*(ui|theme)|bento|glassmorphism|craft|anti-ai-slop/i.test(
        q,
      )
    ) {
      recommendations.push({
        tool: 'open_design_get_system',
        confidence: 0.95,
        rationale: 'User requested design system tokens or Open Design styling',
      });
      recommendations.push({
        tool: 'open_design_apply_craft',
        confidence: 0.92,
        rationale: 'Retrieve authoritative design craft principles',
      });
    }

    if (/startup|venture|incubator|business|saas|founder|unlimited/i.test(q)) {
      recommendations.push({
        tool: 'create_startup_venture',
        confidence: 0.98,
        rationale: 'User requested founding or running an autonomous startup venture',
      });
    }

    if (/game|voxel|minecraft|arcade|3d/i.test(q)) {
      recommendations.push({
        tool: 'generate_3d_game',
        confidence: 0.95,
        rationale: 'User requested 3D game or simulation engine',
      });
    }

    if (/hardware|cpu|ram|telemetry|paging|clock\s*speed/i.test(q)) {
      recommendations.push({
        tool: 'openclaw_getSystemTelemetry',
        confidence: 0.96,
        rationale: 'User requested real host hardware telemetry',
      });
    }

    return recommendations;
  }
}

export const toolCognitionEngine = new ToolCognitionEngine();
export default toolCognitionEngine;
