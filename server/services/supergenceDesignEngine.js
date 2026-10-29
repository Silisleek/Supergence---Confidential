import { currentWorkspace } from './conversationWorkspaces.js';
// SIS 1.0 — Supergence Premium Design Engine
// Powered by Open Design systems (Linear, Glassmorphism, Bento, Apple, Modern SaaS) & FigCraft vector layouts
// Generates state-of-the-art, high-converting, aesthetic, responsive production designs.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';
import workspace from '../workspace/manager.js';
import { resolveWithinRoot } from '../utils/path-confinement.js';
import { childEnvironment } from '../security/child-environment.js';
import { randomUUID } from 'node:crypto';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../');
const OPEN_DESIGN_DIR = path.join(ROOT_DIR, 'integrations', 'open-design');
const FIGCRAFT_DIR = path.join(ROOT_DIR, 'integrations', 'figcraft');
const FIGCRAFT_CLI = path.join(FIGCRAFT_DIR, 'bin', 'figcraft-cli.exe');
const figcraftExecutable = () =>
  process.env.SIS_FIGCRAFT_CLI ? path.resolve(process.env.SIS_FIGCRAFT_CLI) : FIGCRAFT_CLI;
const workspaceRoot = () => currentWorkspace()?.root || workspace.baseRoot;
const workspacePath = (candidate) => resolveWithinRoot(workspaceRoot(), candidate);

export class SupergenceDesignEngine {
  constructor() {
    this.name = 'Supergence Premium Design Engine';
    this.version = '2.0.0';
    this.defaultTheme = 'linear-glassmorphism-bento';
    this.designSystems = new Map();
    this._loadAvailableDesignSystems();
  }

  _loadAvailableDesignSystems() {
    try {
      const dsDir = path.join(OPEN_DESIGN_DIR, 'design-systems');
      if (fs.existsSync(dsDir)) {
        const dirs = fs.readdirSync(dsDir, { withFileTypes: true });
        for (const d of dirs) {
          if (d.isDirectory()) {
            this.designSystems.set(d.name, path.join(dsDir, d.name));
          }
        }
      }
    } catch (e) {
      console.warn('[SupergenceDesignEngine] Could not load design systems:', e.message);
    }
  }

  /**
   * Run FigCraft CLI to export, render, or inspect native .figcraft vector designs
   */
  async runFigcraft(command, args = []) {
    const executable = figcraftExecutable();
    if (!this.figcraftAvailable()) {
      throw new Error(
        'FigCraft CLI is unavailable. Install it separately and set SIS_FIGCRAFT_CLI to its executable path.',
      );
    }
    const { stdout, stderr } = await execFileAsync(executable, [command, ...args], {
      env: childEnvironment(),
      timeout: 120000,
    });
    if (stderr && !stdout) throw new Error(stderr);
    return stdout.trim();
  }

  figcraftAvailable() {
    try {
      return fs.statSync(figcraftExecutable()).isFile();
    } catch {
      return false;
    }
  }

  async getFigcraftInfo(filePath) {
    const raw = await this.runFigcraft('info', [workspacePath(filePath), '--json']);
    return JSON.parse(raw);
  }

  async exportFigcraft(filePath, outDir, format = 'svg') {
    return await this.runFigcraft('export', [
      workspacePath(filePath),
      '-o',
      workspacePath(outDir),
      '--format',
      format,
    ]);
  }

  async renderFigcraft(filePath, outPng) {
    return await this.runFigcraft('render', [
      workspacePath(filePath),
      '-o',
      workspacePath(outPng),
      '--scale',
      '2',
    ]);
  }

  async convertFigcraft(inPath, outPath) {
    return await this.runFigcraft('convert', [workspacePath(inPath), workspacePath(outPath)]);
  }

  /**
   * Execute arbitrary native FigCraft commands via headless script runner
   */
  async executeFigcraftScript(commands, outFigcraftPath, inFigcraftPath) {
    if (!Array.isArray(commands) || commands.length === 0) {
      throw new Error('Commands array must be a non-empty list of { command, params }');
    }
    const tempScriptPath = workspacePath(`figcraft_script_${randomUUID()}.json`);
    try {
      fs.writeFileSync(tempScriptPath, JSON.stringify(commands, null, 2), {
        encoding: 'utf8',
        flag: 'wx',
      });
      const args = ['run', tempScriptPath];
      if (inFigcraftPath) args.push('--in', workspacePath(inFigcraftPath));
      if (outFigcraftPath) args.push('--out', workspacePath(outFigcraftPath));
      const raw = await this.runFigcraft(args[0], args.slice(1));
      return { success: true, log: raw };
    } finally {
      if (fs.existsSync(tempScriptPath)) {
        try {
          fs.unlinkSync(tempScriptPath);
        } catch {}
      }
    }
  }

  /**
   * High-level human-like vector UI design artboard creation in FigCraft
   */
  async createVectorArtboard(spec = {}) {
    const artboardName = spec.name || 'Artboard';
    const width = spec.width || 1440;
    const height = spec.height || 900;
    const slug = (spec.slug || artboardName.toLowerCase().replace(/[^a-z0-9]+/g, '_')).replace(
      /^_+|_+$/g,
      '',
    );
    const filename = spec.filename || `design_${slug}_${Date.now().toString().slice(-4)}.figcraft`;
    if (!/\.figcraft$/i.test(filename)) throw new Error('Design filename must end in .figcraft.');
    const outFigcraftPath = workspacePath(filename);
    const outPngPath = workspacePath(filename.replace(/\.figcraft$/i, '.png'));

    const bgFill = spec.backgroundColor || '#07090E';
    const primaryColor = spec.primaryColor || '#6366F1';
    const accentColor = spec.accentColor || '#A855F7';
    const textColor = spec.textColor || '#F8FAFC';
    const mutedColor = spec.mutedColor || '#94A3B8';

    const commands = [
      {
        command: 'frame.create',
        params: {
          name: artboardName,
          width,
          height,
          x: 0,
          y: 0,
          props: {
            fills: [{ type: 'solid', color: bgFill }],
            clip: true,
          },
        },
      },
    ];

    if (Array.isArray(spec.elements) && spec.elements.length > 0) {
      for (const el of spec.elements) {
        if (el.type === 'rectangle' || !el.type) {
          commands.push({
            command: 'shape.rectangle',
            params: {
              x: el.x || 0,
              y: el.y || 0,
              width: el.width || 100,
              height: el.height || 100,
              props: {
                fills: el.fills || [{ type: 'solid', color: el.color || primaryColor }],
                cornerRadius: el.cornerRadius || el.radius || 0,
                strokes: el.strokes || [],
              },
            },
          });
        } else if (el.type === 'ellipse' || el.type === 'circle') {
          commands.push({
            command: 'shape.ellipse',
            params: {
              x: el.x || 0,
              y: el.y || 0,
              width: el.width || 80,
              height: el.height || 80,
              props: {
                fills: el.fills || [{ type: 'solid', color: el.color || accentColor }],
              },
            },
          });
        } else if (el.type === 'text') {
          commands.push({
            command: 'text.create',
            params: {
              text: el.text || 'Text Layer',
              x: el.x || 0,
              y: el.y || 0,
              width: el.width,
              props: {
                fontSize: el.fontSize || 16,
                fontFamily: el.fontFamily || 'Inter',
                fontStyle: el.fontStyle || 'Regular',
                letterSpacing: el.letterSpacing || '0px',
                fills: el.fills || [{ type: 'solid', color: el.color || textColor }],
              },
            },
          });
        } else if (el.type === 'vector') {
          commands.push({
            command: 'node.create',
            params: {
              type: 'vector',
              path: el.path || 'M 0 0 L 100 0 L 50 86 Z',
              x: el.x || 0,
              y: el.y || 0,
              props: {
                fills: el.fills || [{ type: 'solid', color: el.color || primaryColor }],
                strokes: el.strokes || [],
              },
            },
          });
        }
      }
    } else {
      // ─── AMBIENT GLOW MESHES (Subtle lighting gradients contained inside canvas) ───
      const glowLeftWidth = Math.min(640, Math.round(width * 0.45));
      commands.push({
        command: 'shape.ellipse',
        params: {
          name: 'Ambient Glow Left',
          x: Math.round(width * 0.15),
          y: 60,
          width: glowLeftWidth,
          height: 280,
          props: { fills: [{ type: 'solid', color: 'rgba(99, 102, 241, 0.07)' }] },
        },
      });
      const glowRightWidth = Math.min(520, Math.round(width * 0.38));
      commands.push({
        command: 'shape.ellipse',
        params: {
          name: 'Ambient Glow Right',
          x: Math.min(width - glowRightWidth - 48, Math.round(width * 0.52)),
          y: 70,
          width: glowRightWidth,
          height: 280,
          props: { fills: [{ type: 'solid', color: 'rgba(168, 85, 247, 0.05)' }] },
        },
      });

      // ─── TOP NAVIGATION BAR (Full Header) ───
      commands.push({
        command: 'shape.rectangle',
        params: {
          name: 'Navbar Container',
          x: 48,
          y: 24,
          width: width - 96,
          height: 54,
          props: {
            fills: [{ type: 'solid', color: 'rgba(15, 20, 32, 0.75)' }],
            cornerRadius: 12,
            strokes: [{ type: 'solid', color: 'rgba(255, 255, 255, 0.08)', width: 1 }],
          },
        },
      });
      // Logo Glyph & Brand
      commands.push({
        command: 'shape.ellipse',
        params: {
          name: 'Logo Glyph',
          x: 68,
          y: 39,
          width: 24,
          height: 24,
          props: { fills: [{ type: 'solid', color: primaryColor }] },
        },
      });
      const brandClean = (
        spec.brand ||
        artboardName.split(/[\s_-]+/)[0] ||
        'SUPERGENCE'
      ).toUpperCase();
      commands.push({
        command: 'text.create',
        params: {
          text: `${brandClean} // OS`,
          x: 102,
          y: 43,
          props: {
            fontSize: 14,
            fontFamily: 'Inter',
            fontStyle: 'Bold',
            letterSpacing: '0.5px',
            fills: [{ type: 'solid', color: textColor }],
          },
        },
      });

      // Dynamic Nav Links adapting to canvas width
      const navLinks =
        width >= 1340
          ? [
              { text: 'Overview', x: 380, active: true },
              { text: 'Neural Swarm', x: 475 },
              { text: 'Telemetry HUD', x: 595 },
              { text: 'Kinematics API', x: 720 },
              { text: 'Invariants', x: 845 },
            ]
          : [
              { text: 'Overview', x: 340, active: true },
              { text: 'Telemetry', x: 435 },
              { text: 'Neural Swarm', x: 535 },
            ];

      for (const nl of navLinks) {
        commands.push({
          command: 'text.create',
          params: {
            text: nl.text,
            x: nl.x,
            y: 44,
            props: {
              fontSize: 13,
              fontFamily: 'Inter',
              fontStyle: nl.active ? 'Medium' : 'Regular',
              fills: [{ type: 'solid', color: nl.active ? textColor : mutedColor }],
            },
          },
        });
      }

      // Status Pill
      commands.push({
        command: 'shape.rectangle',
        params: {
          name: 'Status Pill',
          x: width - 340,
          y: 37,
          width: 135,
          height: 28,
          props: {
            fills: [{ type: 'solid', color: 'rgba(16, 185, 129, 0.12)' }],
            cornerRadius: 14,
            strokes: [{ type: 'solid', color: 'rgba(16, 185, 129, 0.35)', width: 1 }],
          },
        },
      });
      commands.push({
        command: 'shape.ellipse',
        params: {
          x: width - 326,
          y: 48,
          width: 6,
          height: 6,
          props: { fills: [{ type: 'solid', color: '#10B981' }] },
        },
      });
      commands.push({
        command: 'text.create',
        params: {
          text: '99.99% ONLINE',
          x: width - 312,
          y: 44,
          props: {
            fontSize: 11,
            fontFamily: 'Inter',
            fontStyle: 'Bold',
            fills: [{ type: 'solid', color: '#10B981' }],
          },
        },
      });

      // Launch CTA
      commands.push({
        command: 'shape.rectangle',
        params: {
          name: 'Nav CTA',
          x: width - 188,
          y: 35,
          width: 124,
          height: 32,
          props: { fills: [{ type: 'solid', color: primaryColor }], cornerRadius: 8 },
        },
      });
      commands.push({
        command: 'text.create',
        params: {
          text: 'Deploy Fleet ↗',
          x: width - 168,
          y: 43,
          props: {
            fontSize: 12,
            fontFamily: 'Inter',
            fontStyle: 'Bold',
            fills: [{ type: 'solid', color: '#FFFFFF' }],
          },
        },
      });

      // ─── HERO SECTION ───
      commands.push({
        command: 'shape.rectangle',
        params: {
          name: 'Hero Badge',
          x: 48,
          y: 104,
          width: 320,
          height: 28,
          props: {
            fills: [{ type: 'solid', color: 'rgba(99, 102, 241, 0.12)' }],
            cornerRadius: 14,
            strokes: [{ type: 'solid', color: 'rgba(99, 102, 241, 0.35)', width: 1 }],
          },
        },
      });
      commands.push({
        command: 'text.create',
        params: {
          text: '✦ AUTONOMOUS VENTURE KINEMATICS // v4.2 PROD',
          x: 62,
          y: 112,
          props: {
            fontSize: 10,
            fontFamily: 'Inter',
            fontStyle: 'Bold',
            letterSpacing: '0.5px',
            fills: [{ type: 'solid', color: primaryColor }],
          },
        },
      });

      // Dynamic layout calculation for title and subtitle to guarantee ZERO overlap
      const titleY = 144;
      const estimatedTitleLines = Math.ceil(artboardName.length / 32);
      const titleHeight = Math.max(48, estimatedTitleLines * 46);
      const subtitleY = titleY + titleHeight + 8;
      const actionsY = subtitleY + 36;

      commands.push({
        command: 'text.create',
        params: {
          text: artboardName,
          x: 48,
          y: titleY,
          width: Math.min(width - 96, 900),
          props: {
            fontSize: 38,
            fontFamily: 'Inter',
            fontStyle: 'Bold',
            fills: [{ type: 'solid', color: textColor }],
          },
        },
      });

      commands.push({
        command: 'text.create',
        params: {
          text:
            spec.subtitle ||
            'Sub-millisecond robotic kinematics & neural swarm coordination control deck.',
          x: 48,
          y: subtitleY,
          width: 860,
          props: {
            fontSize: 16,
            fontFamily: 'Inter',
            fills: [{ type: 'solid', color: mutedColor }],
          },
        },
      });

      // Action Buttons Row
      commands.push({
        command: 'shape.rectangle',
        params: {
          x: 48,
          y: actionsY,
          width: 164,
          height: 42,
          props: { fills: [{ type: 'solid', color: primaryColor }], cornerRadius: 8 },
        },
      });
      commands.push({
        command: 'text.create',
        params: {
          text: 'Launch Console ↗',
          x: 74,
          y: actionsY + 14,
          props: {
            fontSize: 13,
            fontFamily: 'Inter',
            fontStyle: 'Bold',
            fills: [{ type: 'solid', color: '#FFFFFF' }],
          },
        },
      });

      commands.push({
        command: 'shape.rectangle',
        params: {
          x: 224,
          y: actionsY,
          width: 172,
          height: 42,
          props: {
            fills: [{ type: 'solid', color: 'rgba(255, 255, 255, 0.04)' }],
            cornerRadius: 8,
            strokes: [{ type: 'solid', color: 'rgba(255, 255, 255, 0.12)', width: 1 }],
          },
        },
      });
      commands.push({
        command: 'text.create',
        params: {
          text: 'Inspect Topology',
          x: 254,
          y: actionsY + 14,
          props: {
            fontSize: 13,
            fontFamily: 'Inter',
            fills: [{ type: 'solid', color: '#E2E8F0' }],
          },
        },
      });

      commands.push({
        command: 'shape.rectangle',
        params: {
          x: 410,
          y: actionsY + 6,
          width: 250,
          height: 30,
          props: {
            fills: [{ type: 'solid', color: 'rgba(6, 182, 212, 0.08)' }],
            cornerRadius: 6,
            strokes: [{ type: 'solid', color: 'rgba(6, 182, 212, 0.25)', width: 1 }],
          },
        },
      });
      commands.push({
        command: 'text.create',
        params: {
          text: '⚡ Fiber Latency: 0.42ms // 1,420 Nodes',
          x: 422,
          y: actionsY + 14,
          props: {
            fontSize: 11,
            fontFamily: 'Inter',
            fontStyle: 'Medium',
            fills: [{ type: 'solid', color: '#38BDF8' }],
          },
        },
      });

      // ─── ASYMMETRIC BENTO GRID (Full width) ───
      const bentoY = actionsY + 66;
      const totalWidth = width - 96;
      const leftColWidth = Math.round(totalWidth * 0.62);
      const rightColWidth = totalWidth - leftColWidth - 20;
      const rightColX = 48 + leftColWidth + 20;
      const bentoHeight = Math.max(460, height - bentoY - 36);

      // Card 1: Major Telemetry & Live Vector Sparkline
      commands.push({
        command: 'shape.rectangle',
        params: {
          name: 'Card Major Telemetry',
          x: 48,
          y: bentoY,
          width: leftColWidth,
          height: bentoHeight,
          props: {
            fills: [{ type: 'solid', color: 'rgba(15, 20, 32, 0.8)' }],
            cornerRadius: 16,
            strokes: [{ type: 'solid', color: 'rgba(255, 255, 255, 0.08)', width: 1 }],
          },
        },
      });

      commands.push({
        command: 'shape.rectangle',
        params: {
          x: 72,
          y: bentoY + 22,
          width: 90,
          height: 22,
          props: {
            fills: [{ type: 'solid', color: 'rgba(99, 102, 241, 0.15)' }],
            cornerRadius: 11,
          },
        },
      });
      commands.push({
        command: 'text.create',
        params: {
          text: 'TELEMETRY',
          x: 84,
          y: bentoY + 28,
          props: {
            fontSize: 9,
            fontFamily: 'Inter',
            fontStyle: 'Bold',
            letterSpacing: '0.8px',
            fills: [{ type: 'solid', color: primaryColor }],
          },
        },
      });

      commands.push({
        command: 'text.create',
        params: {
          text: 'Neural Kinematics & Autonomous Swarm Throughput',
          x: 72,
          y: bentoY + 54,
          props: {
            fontSize: 18,
            fontFamily: 'Inter',
            fontStyle: 'Bold',
            fills: [{ type: 'solid', color: textColor }],
          },
        },
      });
      commands.push({
        command: 'text.create',
        params: {
          text: 'Continuous vectorized execution across distributed GPU/NPU edge clusters.',
          x: 72,
          y: bentoY + 80,
          props: {
            fontSize: 13,
            fontFamily: 'Inter',
            fills: [{ type: 'solid', color: mutedColor }],
          },
        },
      });

      // KPI Row
      const kpis = [
        { label: 'Consensus Uptime', val: '99.984%', col: textColor, x: 72 },
        { label: 'Vector Inferences', val: '14,820 /s', col: '#38BDF8', x: 250 },
        { label: 'P99 Latency', val: '0.42 ms', col: accentColor, x: 440 },
        { label: 'Projected ARR', val: '$184.2K', col: '#10B981', x: 620 },
      ];
      for (const k of kpis) {
        commands.push({
          command: 'text.create',
          params: {
            text: k.val,
            x: k.x,
            y: bentoY + 115,
            props: {
              fontSize: 24,
              fontFamily: 'Inter',
              fontStyle: 'Bold',
              fills: [{ type: 'solid', color: k.col }],
            },
          },
        });
        commands.push({
          command: 'text.create',
          params: {
            text: k.label,
            x: k.x,
            y: bentoY + 146,
            props: {
              fontSize: 11,
              fontFamily: 'Inter',
              fills: [{ type: 'solid', color: '#64748B' }],
            },
          },
        });
      }

      // Chart Container Inside Card 1
      const chartBoxY = bentoY + 175;
      const chartBoxHeight = bentoHeight - 195;
      commands.push({
        command: 'shape.rectangle',
        params: {
          name: 'Chart Background',
          x: 72,
          y: chartBoxY,
          width: leftColWidth - 48,
          height: chartBoxHeight,
          props: {
            fills: [{ type: 'solid', color: 'rgba(7, 9, 14, 0.65)' }],
            cornerRadius: 12,
            strokes: [{ type: 'solid', color: 'rgba(255, 255, 255, 0.05)', width: 1 }],
          },
        },
      });

      // Smooth Area Bezier Spline
      const chartBaseY = chartBoxY + chartBoxHeight - 10;
      const p1y = chartBoxY + Math.round(chartBoxHeight * 0.7);
      const p2y = chartBoxY + Math.round(chartBoxHeight * 0.5);
      const p3y = chartBoxY + Math.round(chartBoxHeight * 0.6);
      const p4y = chartBoxY + Math.round(chartBoxHeight * 0.35);
      const p5y = chartBoxY + Math.round(chartBoxHeight * 0.45);
      const p6y = chartBoxY + Math.round(chartBoxHeight * 0.2);
      const chartStartX = 88;
      const chartEndX = 72 + leftColWidth - 64;

      const areaPath = `M ${chartStartX} ${p1y} C ${chartStartX + 120} ${p2y}, ${chartStartX + 220} ${p3y}, ${chartStartX + 340} ${p4y} C ${chartStartX + 460} ${p5y}, ${chartStartX + 580} ${p4y}, ${chartEndX} ${p6y} L ${chartEndX} ${chartBaseY} L ${chartStartX} ${chartBaseY} Z`;
      const strokePath = `M ${chartStartX} ${p1y} C ${chartStartX + 120} ${p2y}, ${chartStartX + 220} ${p3y}, ${chartStartX + 340} ${p4y} C ${chartStartX + 460} ${p5y}, ${chartStartX + 580} ${p4y}, ${chartEndX} ${p6y}`;

      commands.push({
        command: 'node.create',
        params: {
          type: 'vector',
          name: 'Telemetry Area Fill',
          path: areaPath,
          props: {
            fills: [{ type: 'solid', color: 'rgba(99, 102, 241, 0.18)' }],
          },
        },
      });
      commands.push({
        command: 'node.create',
        params: {
          type: 'vector',
          name: 'Telemetry Trend Curve',
          path: strokePath,
          props: {
            strokes: [{ type: 'solid', color: '#818CF8', width: 2 }],
          },
        },
      });

      // Card 2: Right Top (Autonomous C-Suite Swarm)
      const card2Height = Math.round((bentoHeight - 16) / 2);
      commands.push({
        command: 'shape.rectangle',
        params: {
          name: 'Card Swarm Roster',
          x: rightColX,
          y: bentoY,
          width: rightColWidth,
          height: card2Height,
          props: {
            fills: [{ type: 'solid', color: 'rgba(15, 20, 32, 0.8)' }],
            cornerRadius: 16,
            strokes: [{ type: 'solid', color: 'rgba(255, 255, 255, 0.08)', width: 1 }],
          },
        },
      });

      commands.push({
        command: 'shape.rectangle',
        params: {
          x: rightColX + 24,
          y: bentoY + 20,
          width: 78,
          height: 20,
          props: {
            fills: [{ type: 'solid', color: 'rgba(168, 85, 247, 0.15)' }],
            cornerRadius: 10,
          },
        },
      });
      commands.push({
        command: 'text.create',
        params: {
          text: 'C-SUITE',
          x: rightColX + 34,
          y: bentoY + 25,
          props: {
            fontSize: 9,
            fontFamily: 'Inter',
            fontStyle: 'Bold',
            letterSpacing: '0.8px',
            fills: [{ type: 'solid', color: accentColor }],
          },
        },
      });
      commands.push({
        command: 'text.create',
        params: {
          text: 'Autonomous Executive Swarm',
          x: rightColX + 24,
          y: bentoY + 48,
          props: {
            fontSize: 16,
            fontFamily: 'Inter',
            fontStyle: 'Bold',
            fills: [{ type: 'solid', color: textColor }],
          },
        },
      });

      // Swarm items
      const swarmMembers = [
        {
          title: 'CEO Agent — Venture Strategist',
          status: 'SYNTHESIZING',
          color: '#10B981',
          y: bentoY + 84,
        },
        {
          title: 'CTO Agent — Full-Stack Architect',
          status: 'ACTIVE',
          color: '#6366F1',
          y: bentoY + 124,
        },
        { title: 'VP Growth — Viral Engine', status: 'SCALING', color: '#A855F7', y: bentoY + 164 },
      ];
      for (const m of swarmMembers) {
        commands.push({
          command: 'shape.ellipse',
          params: {
            x: rightColX + 24,
            y: m.y + 3,
            width: 8,
            height: 8,
            props: { fills: [{ type: 'solid', color: m.color }] },
          },
        });
        commands.push({
          command: 'text.create',
          params: {
            text: m.title,
            x: rightColX + 40,
            y: m.y,
            props: {
              fontSize: 12,
              fontFamily: 'Inter',
              fontStyle: 'Medium',
              fills: [{ type: 'solid', color: textColor }],
            },
          },
        });
        commands.push({
          command: 'text.create',
          params: {
            text: m.status,
            x: rightColX + rightColWidth - 125,
            y: m.y,
            props: {
              fontSize: 10,
              fontFamily: 'Inter',
              fontStyle: 'Bold',
              fills: [{ type: 'solid', color: m.color }],
            },
          },
        });
      }

      // Card 3: Right Bottom (Cryptographic Enclave & Invariants)
      const card3Y = bentoY + card2Height + 16;
      const card3Height = bentoHeight - card2Height - 16;
      commands.push({
        command: 'shape.rectangle',
        params: {
          name: 'Card Invariants',
          x: rightColX,
          y: card3Y,
          width: rightColWidth,
          height: card3Height,
          props: {
            fills: [{ type: 'solid', color: 'rgba(15, 20, 32, 0.8)' }],
            cornerRadius: 16,
            strokes: [{ type: 'solid', color: 'rgba(255, 255, 255, 0.08)', width: 1 }],
          },
        },
      });

      commands.push({
        command: 'shape.rectangle',
        params: {
          x: rightColX + 24,
          y: card3Y + 20,
          width: 90,
          height: 20,
          props: { fills: [{ type: 'solid', color: 'rgba(6, 182, 212, 0.15)' }], cornerRadius: 10 },
        },
      });
      commands.push({
        command: 'text.create',
        params: {
          text: 'INVARIANTS',
          x: rightColX + 34,
          y: card3Y + 25,
          props: {
            fontSize: 9,
            fontFamily: 'Inter',
            fontStyle: 'Bold',
            letterSpacing: '0.8px',
            fills: [{ type: 'solid', color: '#38BDF8' }],
          },
        },
      });
      commands.push({
        command: 'text.create',
        params: {
          text: 'Zero-Trust Cryptographic Core',
          x: rightColX + 24,
          y: card3Y + 48,
          props: {
            fontSize: 16,
            fontFamily: 'Inter',
            fontStyle: 'Bold',
            fills: [{ type: 'solid', color: textColor }],
          },
        },
      });

      const invariants = [
        { text: '✦ SOC2 Type II & ISO27001 verifiable enclave', y: card3Y + 84 },
        { text: '✦ Distributed multi-cloud edge replication', y: card3Y + 114 },
        { text: '✦ Zero-drift automated rollback invariants', y: card3Y + 144 },
      ];
      for (const inv of invariants) {
        commands.push({
          command: 'text.create',
          params: {
            text: inv.text,
            x: rightColX + 24,
            y: inv.y,
            props: {
              fontSize: 12,
              fontFamily: 'Inter',
              fills: [{ type: 'solid', color: '#CBD5E1' }],
            },
          },
        });
      }
    }

    await this.executeFigcraftScript(commands, outFigcraftPath);
    await this.renderFigcraft(outFigcraftPath, outPngPath);

    try {
      const { default: brain } = await import('../orchestrator/brain.js');
      brain.broadcast('workspace-file-saved', {
        filename,
        filepath: filename,
        path: outFigcraftPath,
        action: 'figcraft-artboard-created',
      });
      brain.broadcast('artifact', {
        type: 'vector_design',
        filename: path.basename(outPngPath),
        title: artboardName,
        path: outPngPath,
        url: `/workspace/${path.basename(outPngPath)}`,
      });
    } catch (_) {}

    return {
      success: true,
      name: artboardName,
      figcraftFile: filename,
      figcraftPath: outFigcraftPath,
      pngFile: path.basename(outPngPath),
      pngPath: outPngPath,
      url: `/workspace/${path.basename(outPngPath)}`,
      dimensions: { width, height },
      elementsCount: commands.length,
    };
  }

  /**
   * List all Open Design systems categorized
   */
  listDesignSystems() {
    const list = [];
    const dsDir = path.join(OPEN_DESIGN_DIR, 'design-systems');
    if (fs.existsSync(dsDir)) {
      const dirs = fs.readdirSync(dsDir, { withFileTypes: true });
      for (const d of dirs) {
        if (d.isDirectory()) {
          const sysPath = path.join(dsDir, d.name);
          const hasTokensCss = fs.existsSync(path.join(sysPath, 'tokens.css'));
          const hasTokensJson = fs.existsSync(path.join(sysPath, 'design-tokens.json'));
          list.push({
            name: d.name,
            path: sysPath,
            hasTokens: hasTokensCss || hasTokensJson,
          });
        }
      }
    }
    return list;
  }

  /**
   * Get design system tokens (CSS and JSON)
   */
  getDesignSystemTokens(systemName = 'linear-app') {
    const safeName = (systemName || 'linear-app').toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const sysPath = path.join(OPEN_DESIGN_DIR, 'design-systems', safeName);
    if (!fs.existsSync(sysPath)) {
      if (safeName !== 'linear-app') return this.getDesignSystemTokens('linear-app');
      return { name: safeName, cssTokens: '', jsonTokens: {}, found: false };
    }
    let tokensCss = '';
    let tokensJson = {};
    const cssPath = path.join(sysPath, 'tokens.css');
    const jsonPath = path.join(sysPath, 'design-tokens.json');
    if (fs.existsSync(cssPath)) {
      tokensCss = fs.readFileSync(cssPath, 'utf8');
    }
    if (fs.existsSync(jsonPath)) {
      try {
        tokensJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      } catch {}
    }
    return {
      name: safeName,
      cssTokens: tokensCss,
      jsonTokens: tokensJson,
      found: true,
    };
  }

  /**
   * Get authoritative craft guidelines
   */
  getCraftGuidelines(topic = 'anti-ai-slop') {
    const safeTopic = (topic || 'anti-ai-slop').toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const craftPath = path.join(OPEN_DESIGN_DIR, 'craft', `${safeTopic}.md`);
    if (fs.existsSync(craftPath)) {
      return { topic: safeTopic, content: fs.readFileSync(craftPath, 'utf8') };
    }
    const craftDir = path.join(OPEN_DESIGN_DIR, 'craft');
    const files = fs.existsSync(craftDir)
      ? fs.readdirSync(craftDir).filter((f) => f.endsWith('.md'))
      : [];
    return {
      topic: safeTopic,
      availableTopics: files.map((f) => f.replace(/\.md$/, '')),
      content: files.length > 0 ? fs.readFileSync(path.join(craftDir, files[0]), 'utf8') : '',
    };
  }

  /**
   * Bridge Open Design system into a native FigCraft vector design
   */
  async synthesizeVectorDesignFromSystem(spec = {}) {
    const system = spec.system || 'linear-app';
    const tokens = this.getDesignSystemTokens(system);
    let primary = '#6366F1';
    let accent = '#A855F7';
    let bg = '#07090E';

    if (tokens.cssTokens) {
      const pMatch = tokens.cssTokens.match(/--primary:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/);
      if (pMatch) primary = pMatch[1];
      const aMatch = tokens.cssTokens.match(
        /--(?:accent|secondary|cyan|violet):\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/,
      );
      if (aMatch) accent = aMatch[1];
      const bgMatch = tokens.cssTokens.match(
        /--bg(?:-default|-app)?:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/,
      );
      if (bgMatch) bg = bgMatch[1];
    }

    return await this.createVectorArtboard({
      name: spec.name || `${system.toUpperCase()} Design Showcase`,
      brand: system.replace(/-/g, ' '),
      width: spec.width || 1440,
      height: spec.height || 900,
      backgroundColor: bg,
      primaryColor: primary,
      accentColor: accent,
      subtitle: `Vector layout synthesized using Open Design "${system}" design system tokens.`,
      filename: spec.filename,
    });
  }

  /**
   * Generates a world-class, ultra-premium, dark-mode glassmorphic landing page
   * Synthesized using Open Design's Linear + Bento + Glassmorphism tokens & FigCraft precision.
   */
  generateUltraPremiumLandingPage(spec = {}) {
    const name = spec.name || 'NeuroPulse AI';
    const industry = spec.industry || 'Autonomous Enterprise Intelligence';
    const tagline = spec.tagline || 'The Autonomous AI Operating System for the Modern Enterprise';
    const valueProp =
      spec.valueProposition ||
      'Replace fragmented tools with continuous autonomous intelligence that designs, builds, and scales your workflows 24/7.';
    const primaryColor = spec.primaryColor || '#6366F1'; // Luminous Indigo
    const accentColor = spec.accentColor || '#A855F7'; // Neon Violet
    const cyanAccent = '#06B6D4'; // High-tech Cyan
    const slug = (spec.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '_')).replace(
      /^_+|_+$/g,
      '',
    );

    const features =
      spec.features && spec.features.length >= 4
        ? spec.features
        : [
            {
              title: 'Autonomous C-Suite Intelligence',
              desc: '6 specialized autonomous AI executives (CEO, CTO, CPO, VP Eng, CMO, CFO) continuously orchestrating your business operations.',
              badge: 'C-Suite Engine',
              span: 'col-span-2',
            },
            {
              title: 'Real-Time Vector Semantic Mesh',
              desc: 'Sub-millisecond semantic retrieval across multi-million node knowledge graphs with pgvector clustering.',
              badge: '0.8ms Latency',
              span: 'col-span-1',
            },
            {
              title: '24/7 Infinite Self-Iterating Loops',
              desc: 'Autonomous background cycles that synthesize code, run sandbox test suites, and deploy features continuously.',
              badge: 'Continuous CI/CD',
              span: 'col-span-1',
            },
            {
              title: 'SOC2 & HIPAA Invariant Enforcement',
              desc: 'Strict zero-trust cryptographic boundary audits protecting every inference, query, and customer data node.',
              badge: 'Enterprise Security',
              span: 'col-span-2',
            },
            {
              title: 'Bento Real-Time Observability',
              desc: 'Streaming telemetry, live MRR tracking, active user telemetry, and biophysical neural frequency meters.',
              badge: 'Streaming HUD',
              span: 'col-span-1',
            },
            {
              title: 'Instant Multi-Cloud Deployment',
              desc: 'Zero-config Docker container orchestration, Kubernetes manifests, and automated cloud edge distribution.',
              badge: '1-Click Edge',
              span: 'col-span-2',
            },
          ];

    const pricing = spec.pricing || [
      {
        name: 'Starter Prototyper',
        price: '0',
        period: '/month',
        desc: 'Perfect for individual builders, researchers, and early prototypes.',
        features: [
          'Up to 5 autonomous agents',
          '50,000 monthly inference tokens',
          'Community Discord access',
          'Standard PostgreSQL sandbox',
          'Single-region deployment',
        ],
        cta: 'Start Free Forever',
        popular: false,
      },
      {
        name: 'Enterprise Growth',
        price: '79',
        period: '/month',
        annualPrice: '59',
        desc: 'For high-velocity startups and scaling teams demanding 24/7 autonomy.',
        features: [
          'Full 6-Member C-Suite Swarm',
          'Unlimited 24/7 autonomous cycles',
          'Dedicated vector cluster (pgvector)',
          'Priority sub-millisecond routing',
          'Automated GitHub & Stripe webhooks',
          'Private Slack Connect support',
        ],
        cta: 'Launch Growth Plan',
        popular: true,
      },
      {
        name: 'Sovereign Scale',
        price: '399',
        period: '/month',
        annualPrice: '319',
        desc: 'For enterprise organizations requiring dedicated infrastructure & compliance.',
        features: [
          'Custom autonomous agent swarms',
          'Dedicated VPC / On-premise runtime',
          'SOC2, HIPAA & ISO27001 compliance',
          'Custom fine-tuned weights & LoRAs',
          '24/7 Dedicated Solutions Architect',
          '99.99% Guaranteed SLA uptime',
        ],
        cta: 'Contact Enterprise Team',
        popular: false,
      },
    ];

    return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="utf-8">
  <title>${name} — ${tagline}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${valueProp}">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🚀</text></svg>">
  
  <!-- Inter & JetBrains Mono Fonts (Linear & Open Design Standard) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">

  <style>
    /* ─── Open Design & Linear Design Tokens ─── */
    :root {
      --bg: #07090E;
      --bg-elevated: #0C0F17;
      --surface: rgba(18, 24, 38, 0.72);
      --surface-hover: rgba(26, 34, 54, 0.85);
      --surface-glass: rgba(255, 255, 255, 0.03);
      --fg: #F8FAFC;
      --fg-muted: #94A3B8;
      --fg-subtle: #64748B;
      --border: rgba(255, 255, 255, 0.08);
      --border-focus: rgba(99, 102, 241, 0.6);
      --border-glow: rgba(99, 102, 241, 0.25);
      --primary: ${primaryColor};
      --primary-hover: #4F46E5;
      --accent: ${accentColor};
      --cyan: ${cyanAccent};
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
      --radius-sm: 6px;
      --radius-md: 10px;
      --radius-lg: 16px;
      --radius-xl: 24px;
      --radius-full: 9999px;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }
    html { scroll-behavior: smooth; background-color: var(--bg); color: var(--fg); font-family: var(--font-sans); }
    body { min-height: 100vh; overflow-x: hidden; position: relative; selection-background-color: var(--primary); }

    /* Subtle background grid & gradient illumination */
    .bg-mesh-glow {
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 100vw;
      height: 900px;
      background: 
        radial-gradient(circle at 50% 10%, rgba(99, 102, 241, 0.16) 0%, transparent 60%),
        radial-gradient(circle at 80% 25%, rgba(168, 85, 247, 0.12) 0%, transparent 50%),
        radial-gradient(circle at 20% 30%, rgba(6, 182, 212, 0.08) 0%, transparent 50%);
      pointer-events: none;
      z-index: 0;
    }

    .bg-grid-subtle {
      position: absolute;
      inset: 0;
      background-image: linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
      background-size: 48px 48px;
      mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);
      pointer-events: none;
      z-index: 0;
    }

    /* Glassmorphism Container */
    .glass-card {
      background: var(--surface);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .glass-card:hover {
      border-color: var(--border-glow);
      box-shadow: 0 12px 36px -8px rgba(0, 0, 0, 0.5), 0 0 24px -4px rgba(99, 102, 241, 0.15);
    }

    /* Container */
    .container {
      width: 100%;
      max-width: 1240px;
      margin: 0 auto;
      padding: 0 24px;
      position: relative;
      z-index: 10;
    }

    /* Navigation */
    header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;
      padding: 16px 24px;
      transition: all 0.2s ease;
    }
    .nav-inner {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 20px;
      background: rgba(10, 14, 23, 0.75);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--border);
      border-radius: var(--radius-full);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.36);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: var(--fg);
      font-weight: 700;
      font-size: 16px;
      letter-spacing: -0.02em;
    }
    .brand-logo-gem {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFF;
      font-size: 14px;
      box-shadow: 0 0 12px rgba(99, 102, 241, 0.4);
    }
    nav ul {
      display: flex;
      align-items: center;
      gap: 24px;
      list-style: none;
    }
    nav a {
      color: var(--fg-muted);
      text-decoration: none;
      font-size: 13.5px;
      font-weight: 500;
      transition: color 0.15s ease;
    }
    nav a:hover { color: var(--fg); }
    .nav-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 8px 18px;
      font-size: 13.5px;
      font-weight: 600;
      border-radius: var(--radius-full);
      text-decoration: none;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      cursor: pointer;
      border: none;
    }
    .btn-ghost {
      color: var(--fg-muted);
      background: transparent;
    }
    .btn-ghost:hover {
      color: var(--fg);
      background: rgba(255, 255, 255, 0.05);
    }
    .btn-primary {
      background: linear-gradient(135deg, var(--primary), #4338CA);
      color: #FFFFFF;
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.18);
    }
    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 24px rgba(99, 102, 241, 0.5);
    }
    .btn-glow {
      position: relative;
      overflow: hidden;
    }
    .btn-glow::after {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: linear-gradient(60deg, transparent, rgba(255, 255, 255, 0.15), transparent);
      transform: rotate(30deg);
      transition: transform 0.6s ease;
    }
    .btn-glow:hover::after {
      transform: rotate(30deg) translate(50%, 50%);
    }

    /* Hero Section */
    .hero {
      padding: 160px 0 80px 0;
      text-align: center;
      position: relative;
    }
    .badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: var(--radius-full);
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(99, 102, 241, 0.3);
      color: #A5B4FC;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.02em;
      margin-bottom: 24px;
      box-shadow: 0 0 16px rgba(99, 102, 241, 0.12);
    }
    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--cyan);
      box-shadow: 0 0 8px var(--cyan);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
    .hero h1 {
      font-size: clamp(40px, 6vw, 72px);
      font-weight: 800;
      line-height: 1.05;
      letter-spacing: -0.035em;
      margin-bottom: 24px;
      max-width: 960px;
      margin-left: auto;
      margin-right: auto;
    }
    .text-gradient {
      background: linear-gradient(135deg, #FFFFFF 40%, #A5B4FC 80%, #C084FC 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .hero p {
      font-size: clamp(16px, 2vw, 20px);
      color: var(--fg-muted);
      line-height: 1.6;
      max-width: 680px;
      margin: 0 auto 36px auto;
      font-weight: 400;
    }
    .hero-ctas {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-bottom: 56px;
      flex-wrap: wrap;
    }

    /* Live Interactive Hero Sandbox Widget (Open Design & FigCraft Live Showcase) */
    .hero-sandbox-wrap {
      max-width: 1040px;
      margin: 0 auto;
      background: rgba(12, 16, 26, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: var(--radius-xl);
      padding: 18px;
      box-shadow: 0 24px 64px -16px rgba(0, 0, 0, 0.8), 0 0 40px -8px rgba(99, 102, 241, 0.2);
      backdrop-filter: blur(28px);
    }
    .sandbox-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      margin-bottom: 16px;
    }
    .mac-dots {
      display: flex;
      gap: 6px;
    }
    .mac-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .dot-red { background: #FF5F56; }
    .dot-yellow { background: #FFBD2E; }
    .dot-green { background: #27C93F; }
    .sandbox-title {
      font-size: 12px;
      font-family: var(--font-mono);
      color: var(--fg-subtle);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .sandbox-stage {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      text-align: left;
    }
    @media (max-width: 768px) {
      .sandbox-stage { grid-template-columns: 1fr; }
    }
    .sandbox-panel {
      background: rgba(5, 8, 14, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: var(--radius-md);
      padding: 18px;
    }
    .sandbox-panel-title {
      font-size: 11.5px;
      font-weight: 700;
      color: var(--fg-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .sandbox-input {
      width: 100%;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 10px 14px;
      color: var(--fg);
      font-family: var(--font-sans);
      font-size: 13px;
      margin-bottom: 12px;
      outline: none;
      transition: border 0.15s ease;
    }
    .sandbox-input:focus {
      border-color: var(--primary);
    }
    .sandbox-run-btn {
      width: 100%;
      padding: 9px;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      color: #FFF;
      font-size: 12.5px;
      font-weight: 600;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s ease;
    }
    .sandbox-run-btn:hover {
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
    }
    .sandbox-output {
      font-family: var(--font-mono);
      font-size: 12px;
      color: #38BDF8;
      line-height: 1.6;
      height: 140px;
      overflow-y: auto;
      white-space: pre-wrap;
    }

    /* Social Proof Marquee / Metrics */
    .metrics-ribbon {
      padding: 60px 0;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      margin: 60px 0;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
      text-align: center;
    }
    @media (max-width: 768px) {
      .metrics-grid { grid-template-columns: repeat(2, 1fr); }
    }
    .metric-item h3 {
      font-size: 36px;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #FFF;
      margin-bottom: 6px;
    }
    .metric-item p {
      color: var(--fg-muted);
      font-size: 13.5px;
      font-weight: 500;
    }

    /* Bento Grid Feature Showcase (Inspired by Open Design & FigCraft) */
    .bento-section {
      padding: 80px 0;
    }
    .section-header {
      text-align: center;
      max-width: 680px;
      margin: 0 auto 56px auto;
    }
    .section-tag {
      font-size: 12px;
      font-weight: 700;
      color: var(--primary);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 12px;
    }
    .section-title {
      font-size: clamp(28px, 4vw, 44px);
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-bottom: 16px;
    }
    .section-desc {
      color: var(--fg-muted);
      font-size: 16px;
      line-height: 1.6;
    }

    .bento-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    @media (max-width: 960px) {
      .bento-grid { grid-template-columns: 1fr; }
      .col-span-2 { grid-column: span 1 !important; }
    }
    .col-span-2 { grid-column: span 2; }
    .col-span-1 { grid-column: span 1; }

    .bento-card {
      padding: 32px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 240px;
      position: relative;
      overflow: hidden;
    }
    .bento-card-header {
      margin-bottom: 20px;
    }
    .bento-badge {
      display: inline-block;
      padding: 4px 10px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      border-radius: var(--radius-full);
      font-size: 11px;
      font-weight: 600;
      color: var(--fg-muted);
      margin-bottom: 14px;
    }
    .bento-card h4 {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }
    .bento-card p {
      font-size: 14px;
      color: var(--fg-muted);
      line-height: 1.6;
    }

    /* Pricing Section */
    .pricing-section {
      padding: 100px 0;
    }
    .pricing-toggle-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 48px;
    }
    .toggle-label {
      font-size: 14px;
      font-weight: 500;
      color: var(--fg-muted);
      cursor: pointer;
    }
    .toggle-label.active { color: var(--fg); font-weight: 700; }
    .toggle-switch {
      width: 48px;
      height: 26px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 9999px;
      position: relative;
      cursor: pointer;
      border: 1px solid var(--border);
    }
    .toggle-knob {
      width: 20px;
      height: 20px;
      background: #FFF;
      border-radius: 50%;
      position: absolute;
      top: 2px;
      left: 3px;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .toggle-switch.annual .toggle-knob {
      transform: translateX(22px);
      background: var(--primary);
    }
    .save-badge {
      background: rgba(16, 185, 129, 0.15);
      color: #34D399;
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
    }

    .pricing-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      align-items: stretch;
    }
    @media (max-width: 960px) {
      .pricing-grid { grid-template-columns: 1fr; }
    }
    .pricing-card {
      padding: 40px 32px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }
    .pricing-card.featured {
      background: rgba(22, 28, 45, 0.88);
      border-color: rgba(99, 102, 241, 0.5);
      box-shadow: 0 0 40px -10px rgba(99, 102, 241, 0.3);
      transform: scale(1.02);
    }
    .popular-tag {
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, var(--primary), var(--accent));
      color: #FFF;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 14px;
      border-radius: 9999px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    }
    .price-num {
      font-size: 48px;
      font-weight: 800;
      letter-spacing: -0.04em;
      color: #FFF;
      display: flex;
      align-items: baseline;
      gap: 4px;
      margin: 16px 0 8px 0;
    }
    .price-period {
      font-size: 14px;
      font-weight: 500;
      color: var(--fg-muted);
    }
    .feature-list {
      list-style: none;
      margin: 28px 0;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .feature-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13.5px;
      color: var(--fg-muted);
    }
    .check-icon {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: rgba(99, 102, 241, 0.15);
      color: #818CF8;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      flex-shrink: 0;
    }

    /* Interactive ROI Calculator */
    .roi-section {
      padding: 80px 0;
    }
    .roi-card {
      background: rgba(14, 19, 32, 0.8);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      padding: 40px;
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 40px;
      align-items: center;
    }
    @media (max-width: 768px) {
      .roi-card { grid-template-columns: 1fr; }
    }
    .slider-group {
      margin-bottom: 24px;
    }
    .slider-header {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .slider-input {
      width: 100%;
      accent-color: var(--primary);
    }
    .roi-result-box {
      background: rgba(5, 8, 14, 0.6);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: var(--radius-lg);
      padding: 28px;
      text-align: center;
    }
    .roi-result-value {
      font-size: 44px;
      font-weight: 800;
      color: #34D399;
      letter-spacing: -0.03em;
      margin: 8px 0;
    }

    /* Footer CTA Banner */
    .footer-cta {
      padding: 80px 0;
    }
    .footer-cta-card {
      background: linear-gradient(135deg, rgba(30, 27, 75, 0.8), rgba(15, 23, 42, 0.95));
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: var(--radius-xl);
      padding: 64px 40px;
      text-align: center;
      position: relative;
      overflow: hidden;
      box-shadow: 0 20px 60px -15px rgba(99, 102, 241, 0.25);
    }
    .footer-cta-card h2 {
      font-size: clamp(32px, 4vw, 48px);
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-bottom: 16px;
    }
    .footer-cta-card p {
      color: var(--fg-muted);
      font-size: 16px;
      max-width: 580px;
      margin: 0 auto 36px auto;
    }
    .waitlist-form {
      display: flex;
      max-width: 440px;
      margin: 0 auto;
      gap: 8px;
    }
    .waitlist-input {
      flex: 1;
      padding: 12px 18px;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: var(--radius-full);
      color: #FFF;
      font-size: 14px;
      outline: none;
    }
    .waitlist-input:focus { border-color: var(--primary); }

    /* Footer */
    footer {
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding: 48px 0;
      color: var(--fg-subtle);
      font-size: 13px;
    }
    .footer-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .status-beacon {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #34D399;
    }
    .status-ping {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #34D399;
      box-shadow: 0 0 8px #34D399;
    }
  </style>
</head>
<body>
  <div class="bg-mesh-glow"></div>
  <div class="bg-grid-subtle"></div>

  <!-- Glassmorphic Header -->
  <header>
    <div class="nav-inner">
      <a href="#" class="brand">
        <div class="brand-logo-gem">✦</div>
        <span>${name}</span>
      </a>
      <nav>
        <ul>
          <li><a href="#features">Features</a></li>
          <li><a href="#sandbox">Live Demo</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="#calculator">ROI Calc</a></li>
        </ul>
      </nav>
      <div class="nav-actions">
        <a href="/workspace/startup_${slug}_mvp.html" class="btn btn-ghost">Launch MVP</a>
        <a href="#pricing" class="btn btn-primary btn-glow">Get Started</a>
      </div>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="hero">
    <div class="container">
      <div class="badge-pill">
        <span class="badge-dot"></span>
        <span>AUTONOMOUS ENGINE V4.0 • POWERED BY SIS 1.0</span>
      </div>
      <h1>
        <span class="text-gradient">${name}:</span><br>
        ${tagline}
      </h1>
      <p>${valueProp}</p>
      <div class="hero-ctas">
        <a href="/workspace/startup_${slug}_mvp.html" class="btn btn-primary btn-glow" style="padding: 12px 28px; font-size: 15px;">
          Launch Live MVP App ↗
        </a>
        <a href="#sandbox" class="btn btn-ghost" style="padding: 12px 24px; font-size: 15px; border: 1px solid var(--border);">
          Interactive Playground ↓
        </a>
      </div>

      <!-- Live Interactive Hero Sandbox Widget -->
      <div class="hero-sandbox-wrap" id="sandbox">
        <div class="sandbox-topbar">
          <div class="mac-dots">
            <span class="mac-dot dot-red"></span>
            <span class="mac-dot dot-yellow"></span>
            <span class="mac-dot dot-green"></span>
          </div>
          <span class="sandbox-title">⚡ ${name.toLowerCase()}-kernel // live-inference-sandbox</span>
          <span style="font-size:11px; color:#34D399;">● Sandbox Active (24/7)</span>
        </div>
        <div class="sandbox-stage">
          <div class="sandbox-panel">
            <div class="sandbox-panel-title">
              <span>Input Simulation Brief</span>
              <span style="color:#6366F1;">MODEL: GPT-OSS-120B</span>
            </div>
            <input type="text" id="demoBriefInput" class="sandbox-input" value="Generate autonomous B2B marketing funnel for Series-A SaaS">
            <button class="sandbox-run-btn" id="runDemoBtn">
              <span>▶ Execute Autonomous Simulation</span>
            </button>
          </div>
          <div class="sandbox-panel">
            <div class="sandbox-panel-title">
              <span>Live Kernel Telemetry</span>
              <span id="demoLatencyBadge" style="color:#34D399;">0.8ms • Verified</span>
            </div>
            <div class="sandbox-output" id="demoOutputBox">[INFO] Connected to ${name} Autonomous Matrix.
[KERNEL] Initializing pipeline for enterprise brief...
[ORCHESTRATOR] 6 C-Suite agents synchronized.
✓ Synthesized multi-stage conversion funnel (CAC: $184 | Payback: 2.8 mo).
⚡ Status: READY TO SCALE 24/7.</div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Metrics Ribbon -->
  <section class="metrics-ribbon">
    <div class="container">
      <div class="metrics-grid">
        <div class="metric-item">
          <h3>$28.4M+</h3>
          <p>Annual Value Orchestrated</p>
        </div>
        <div class="metric-item">
          <h3>99.99%</h3>
          <p>Uptime & Continuous CI/CD</p>
        </div>
        <div class="metric-item">
          <h3>0.8ms</h3>
          <p>Vector Retrieval Latency</p>
        </div>
        <div class="metric-item">
          <h3>14,800+</h3>
          <p>Active Workflows Running</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Bento Grid Features Section -->
  <section class="bento-section" id="features">
    <div class="container">
      <div class="section-header">
        <div class="section-tag">ENGINEERED FOR SCALE</div>
        <h2 class="section-title">Architected on Modern Design Principles</h2>
        <p class="section-desc">Every subsystem in ${name} is designed with precision engineering, glassmorphic elegance, and zero-compromise autonomy.</p>
      </div>

      <div class="bento-grid">
        ${features
          .map(
            (f) => `
          <div class="glass-card bento-card feature-card ${f.span || 'col-span-1'}">
            <div class="bento-card-header">
              <span class="bento-badge">${f.badge || 'Core Engine'}</span>
              <h4>${f.title}</h4>
              <p>${f.desc}</p>
            </div>
            <div style="font-size: 11px; font-family: var(--font-mono); color: var(--fg-subtle); display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px;">
              <span>SUBSYSTEM: ACTIVE</span>
              <span style="color: var(--primary);">VERIFIED ✓</span>
            </div>
          </div>
        `,
          )
          .join('')}
      </div>
    </div>
  </section>

  <!-- Interactive ROI Calculator -->
  <section class="roi-section" id="calculator">
    <div class="container">
      <div class="roi-card">
        <div>
          <div class="section-tag">VALUE CALCULATOR</div>
          <h2 style="font-size:32px; font-weight:800; letter-spacing:-0.03em; margin-bottom:12px;">Compute Your Operational ROI</h2>
          <p style="color:var(--fg-muted); font-size:15px; margin-bottom:32px;">See how much engineering and executive time ${name} saves your organization annually.</p>
          
          <div class="slider-group">
            <div class="slider-header">
              <span>Team Size (Engineers & Executives)</span>
              <strong id="teamSizeVal" style="color:#FFF;">25 people</strong>
            </div>
            <input type="range" min="5" max="250" value="25" class="slider-input" id="teamSizeRange">
          </div>

          <div class="slider-group">
            <div class="slider-header">
              <span>Hours Saved Per Week (Per Person)</span>
              <strong id="hoursSavedVal" style="color:#FFF;">8 hours</strong>
            </div>
            <input type="range" min="2" max="20" value="8" class="slider-input" id="hoursSavedRange">
          </div>
        </div>

        <div class="roi-result-box">
          <span style="font-size:12px; font-weight:700; color:var(--fg-muted); text-transform:uppercase;">ESTIMATED ANNUAL VALUE SAVED</span>
          <div class="roi-result-value" id="roiTotalDisplay">$520,000</div>
          <p style="font-size:12px; color:var(--fg-muted);">Based on standard $50/hr blended technical rate.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Pricing Section -->
  <section class="pricing-section" id="pricing">
    <div class="container">
      <div class="section-header">
        <div class="section-tag">TRANSPARENT VALUE</div>
        <h2 class="section-title">Predictable Pricing for High-Growth Ventures</h2>
        <p class="section-desc">Scale seamlessly from early prototype to sovereign multi-region enterprise cluster.</p>
      </div>

      <div class="pricing-toggle-wrap">
        <span class="toggle-label active" id="btnMonthly">Monthly Billing</span>
        <div class="toggle-switch" id="pricingToggle">
          <div class="toggle-knob"></div>
        </div>
        <span class="toggle-label" id="btnAnnual">Annual Billing</span>
        <span class="save-badge">SAVE 20%</span>
      </div>

      <div class="pricing-grid">
        ${pricing
          .map(
            (p) => `
          <div class="glass-card pricing-card ${p.popular ? 'featured' : ''}">
            ${p.popular ? '<div class="popular-tag">MOST POPULAR</div>' : ''}
            <div>
              <h3 style="font-size:20px; font-weight:700; color:#FFF;">${p.name}</h3>
              <p style="font-size:13px; color:var(--fg-muted); margin-top:6px;">${p.desc}</p>
              <div class="price-num">
                <span style="font-size:24px; font-weight:600;">$</span>
                <span class="price-val" data-monthly="${p.price}" data-annual="${p.annualPrice || Math.round(Number(p.price) * 0.8)}">${p.price}</span>
                <span class="price-period">${p.period}</span>
              </div>
              <ul class="feature-list">
                ${p.features
                  .map(
                    (f) => `
                  <li class="feature-item">
                    <span class="check-icon">✓</span>
                    <span>${f}</span>
                  </li>
                `,
                  )
                  .join('')}
              </ul>
            </div>
            <a href="/workspace/startup_${slug}_mvp.html" class="btn ${p.popular ? 'btn-primary btn-glow' : 'btn-ghost'}" style="width:100%; border: 1px solid var(--border);">
              ${p.cta}
            </a>
          </div>
        `,
          )
          .join('')}
      </div>
    </div>
  </section>

  <!-- Footer CTA -->
  <section class="footer-cta">
    <div class="container">
      <div class="footer-cta-card">
        <h2>Launch Your Enterprise AI Revolution</h2>
        <p>Join thousands of visionary founders and technical teams running continuous autonomous operations with ${name}.</p>
        <form class="waitlist-form" onsubmit="event.preventDefault(); alert('Priority access requested! Check your inbox.');">
          <input type="email" placeholder="Enter work email..." required class="waitlist-input">
          <button type="submit" class="btn btn-primary btn-glow">Request Access</button>
        </form>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer>
    <div class="container">
      <div class="footer-bottom">
        <div style="display:flex; align-items:center; gap:8px;">
          <div class="brand-logo-gem" style="width:22px; height:22px; font-size:11px;">✦</div>
          <span style="color:#FFF; font-weight:600;">${name}</span>
          <span>© ${new Date().getFullYear()} All rights reserved.</span>
        </div>
        <div class="status-beacon">
          <span class="status-ping"></span>
          <span>SYSTEMS NORMAL • 99.99% CONTINUOUS UPTIME</span>
        </div>
      </div>
    </div>
  </footer>

  <script>
    // Live Interactive Sandbox Script
    const runBtn = document.getElementById('runDemoBtn');
    const briefInput = document.getElementById('demoBriefInput');
    const outputBox = document.getElementById('demoOutputBox');
    const latencyBadge = document.getElementById('demoLatencyBadge');

    if (runBtn) {
      runBtn.addEventListener('click', () => {
        const brief = briefInput.value.trim() || 'Enterprise Autonomous Task';
        outputBox.textContent = \`[INFO] Dispatching brief: "\${brief}"\\n[C-SUITE] CEO validating business goals...\\n[CTO] Architecting vector embeddings & database schema...\\n[VP ENG] Compiling production microservice bundle...\\n✓ Simulation executed in 0.64ms. Status: 100% PASSING.\\n⚡ Venture iteration active in 24/7 unlimited loop.\`;
        latencyBadge.textContent = '0.64ms • Verified';
      });
    }

    // Pricing Annual/Monthly Switcher
    const toggle = document.getElementById('pricingToggle');
    const btnMonthly = document.getElementById('btnMonthly');
    const btnAnnual = document.getElementById('btnAnnual');
    const priceVals = document.querySelectorAll('.price-val');
    let isAnnual = false;

    function setBilling(annual) {
      isAnnual = annual;
      if (toggle) toggle.classList.toggle('annual', isAnnual);
      if (btnMonthly) btnMonthly.classList.toggle('active', !isAnnual);
      if (btnAnnual) btnAnnual.classList.toggle('active', isAnnual);
      priceVals.forEach(el => {
        el.textContent = isAnnual ? el.getAttribute('data-annual') : el.getAttribute('data-monthly');
      });
    }

    if (toggle) toggle.addEventListener('click', () => setBilling(!isAnnual));
    if (btnMonthly) btnMonthly.addEventListener('click', () => setBilling(false));
    if (btnAnnual) btnAnnual.addEventListener('click', () => setBilling(true));

    // Interactive ROI Calculator
    const teamRange = document.getElementById('teamSizeRange');
    const hoursRange = document.getElementById('hoursSavedRange');
    const teamVal = document.getElementById('teamSizeVal');
    const hoursVal = document.getElementById('hoursSavedVal');
    const roiDisplay = document.getElementById('roiTotalDisplay');

    function updateRoi() {
      const team = Number(teamRange.value);
      const hours = Number(hoursRange.value);
      if (teamVal) teamVal.textContent = team + ' people';
      if (hoursVal) hoursVal.textContent = hours + ' hours';
      const total = team * hours * 52 * 50;
      if (roiDisplay) roiDisplay.textContent = '$' + total.toLocaleString();
    }

    if (teamRange) teamRange.addEventListener('input', updateRoi);
    if (hoursRange) hoursRange.addEventListener('input', updateRoi);
  </script>
</body>
</html>`;
  }

  /**
   * Generates a modern, production-grade interactive MVP application dashboard
   */
  generateUltraPremiumMvpDashboard(spec = {}) {
    const name = spec.name || 'NeuroPulse AI';
    const slug = (spec.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '_')).replace(
      /^_+|_+$/g,
      '',
    );
    const landingFilename = spec.landingFilename || `startup_${slug}_landing.html`;

    return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="utf-8">
  <title>${name} — Production MVP Application</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  
  <style>
    :root {
      --bg: #07090E;
      --sidebar: #0C0F17;
      --surface: rgba(18, 24, 38, 0.7);
      --border: rgba(255, 255, 255, 0.08);
      --primary: #6366F1;
      --accent: #A855F7;
      --cyan: #06B6D4;
      --emerald: #10B981;
      --fg: #F8FAFC;
      --fg-muted: #94A3B8;
      --font-sans: 'Inter', sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background: var(--bg); color: var(--fg); font-family: var(--font-sans); height: 100vh; overflow: hidden; display: flex; }
    
    /* Sidebar */
    .sidebar {
      width: 260px;
      background: var(--sidebar);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 20px 16px;
      flex-shrink: 0;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 15px;
      font-weight: 700;
      color: #FFF;
      text-decoration: none;
      padding: 0 8px 20px 8px;
      border-bottom: 1px solid var(--border);
    }
    .brand-icon {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
    }
    .nav-menu {
      list-style: none;
      margin-top: 20px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .nav-item a {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      color: var(--fg-muted);
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.15s ease;
    }
    .nav-item.active a, .nav-item a:hover {
      background: rgba(99, 102, 241, 0.12);
      color: #FFF;
    }
    .nav-item.active a {
      border: 1px solid rgba(99, 102, 241, 0.3);
      font-weight: 600;
    }
    .sidebar-footer {
      padding-top: 16px;
      border-top: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .user-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4338CA, #6D28D9);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 12px;
    }

    /* Main Content */
    .main-wrap {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow-y: auto;
    }
    .topbar {
      height: 64px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 32px;
      background: rgba(12, 15, 23, 0.8);
      backdrop-filter: blur(16px);
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .topbar-search {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 6px 12px;
      width: 320px;
    }
    .topbar-search input {
      background: transparent;
      border: none;
      color: #FFF;
      font-size: 13px;
      outline: none;
      width: 100%;
    }
    .shortcut-kbd {
      font-size: 10px;
      font-family: var(--font-mono);
      background: rgba(255, 255, 255, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
      color: var(--fg-muted);
    }
    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 9999px;
      color: #34D399;
      font-size: 11.5px;
      font-weight: 600;
    }

    /* Dashboard Body */
    .content-body {
      padding: 32px;
      max-width: 1300px;
      width: 100%;
    }
    .greeting-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 28px;
    }
    .greeting-row h1 {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .greeting-row p {
      color: var(--fg-muted);
      font-size: 13.5px;
      margin-top: 4px;
    }

    /* Bento Cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 18px;
      margin-bottom: 28px;
    }
    @media (max-width: 1024px) {
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
    }
    .kpi-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .kpi-card h4 {
      font-size: 12px;
      color: var(--fg-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    .kpi-val {
      font-size: 28px;
      font-weight: 800;
      color: #FFF;
      letter-spacing: -0.03em;
    }
    .kpi-delta {
      font-size: 11.5px;
      color: var(--emerald);
      margin-top: 8px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* Interactive Pipeline Stage */
    .pipeline-section {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 24px;
      margin-bottom: 28px;
    }
    .pipeline-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
    }
    .pipeline-header h3 {
      font-size: 16px;
      font-weight: 700;
    }
    .pipeline-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .pipeline-table th {
      text-align: left;
      padding: 10px 12px;
      color: var(--fg-muted);
      font-weight: 600;
      border-bottom: 1px solid var(--border);
      font-size: 11.5px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .pipeline-table td {
      padding: 14px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }
    .pipeline-table tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }
    .exec-btn {
      padding: 6px 14px;
      background: var(--primary);
      border: none;
      border-radius: 6px;
      color: #FFF;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <!-- Sidebar -->
  <aside class="sidebar">
    <div>
      <a href="/workspace/${landingFilename}" class="brand">
        <div class="brand-icon">✦</div>
        <span>${name}</span>
      </a>
      <ul class="nav-menu">
        <li class="nav-item active"><a href="#"><span>📊</span> Dashboard</a></li>
        <li class="nav-item"><a href="#"><span>⚡</span> Autonomous Workflows</a></li>
        <li class="nav-item"><a href="#"><span>🧠</span> Vector Memory Mesh</a></li>
        <li class="nav-item"><a href="#"><span>👥</span> C-Suite Swarm</a></li>
        <li class="nav-item"><a href="#"><span>💳</span> Billing & Stripe</a></li>
        <li class="nav-item"><a href="#"><span>⚙️</span> Cluster Settings</a></li>
      </ul>
    </div>
    <div class="sidebar-footer">
      <div class="user-avatar">AD</div>
      <div>
        <div style="font-size:12.5px; font-weight:600; color:#FFF;">Autonomous Admin</div>
        <div style="font-size:11px; color:var(--fg-muted);">Enterprise Pro Cluster</div>
      </div>
    </div>
  </aside>

  <!-- Main Wrap -->
  <main class="main-wrap">
    <!-- Topbar -->
    <header class="topbar">
      <div class="topbar-search">
        <span>🔍</span>
        <input type="text" placeholder="Search commands, pipelines, embeddings...">
        <span class="shortcut-kbd">⌘K</span>
      </div>
      <div class="topbar-actions">
        <div class="status-pill">
          <span>●</span>
          <span>24/7 Loop Active</span>
        </div>
        <a href="/workspace/${landingFilename}" style="padding:6px 14px; background:rgba(255,255,255,0.06); border:1px solid var(--border); border-radius:8px; color:#FFF; font-size:12.5px; text-decoration:none;">
          View Landing Page ↗
        </a>
      </div>
    </header>

    <!-- Content Body -->
    <div class="content-body">
      <div class="greeting-row">
        <div>
          <h1>Operations Command Center</h1>
          <p>Real-time telemetry and autonomous pipeline execution for ${name}.</p>
        </div>
        <button class="exec-btn" onclick="triggerPipelineRun()">+ Trigger New Autonomous Pipeline</button>
      </div>

      <!-- Bento KPI Grid -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <h4>Monthly Recurring Revenue</h4>
          <div class="kpi-val" id="kpiMrr">$8,767</div>
          <div class="kpi-delta">▲ +14.8% this week</div>
        </div>
        <div class="kpi-card">
          <h4>Active Platform Users</h4>
          <div class="kpi-val" id="kpiUsers">1,518</div>
          <div class="kpi-delta">▲ +122 new today</div>
        </div>
        <div class="kpi-card">
          <h4>Autonomous Cycle Uptime</h4>
          <div class="kpi-val">24/7 (30s)</div>
          <div class="kpi-delta" style="color:var(--cyan);">● 100% Tests Passing</div>
        </div>
        <div class="kpi-card">
          <h4>P99 Vector Latency</h4>
          <div class="kpi-val">0.78ms</div>
          <div class="kpi-delta" style="color:#A855F7;">⚡ pgvector optimized</div>
        </div>
      </div>

      <!-- Pipeline Execution Table -->
      <div class="pipeline-section">
        <div class="pipeline-header">
          <h3>Active Business Workflows & Execution Mesh</h3>
          <span style="font-size:12px; color:var(--fg-muted);">Showing 4 active production tasks</span>
        </div>
        <table class="pipeline-table">
          <thead>
            <tr>
              <th>Workflow Name</th>
              <th>Domain</th>
              <th>Status</th>
              <th>Assigned Executive</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody id="pipelineRows">
            <tr>
              <td style="font-weight:600; color:#FFF;">OAuth2 Social & GitHub SSO Gateway</td>
              <td>Security</td>
              <td><span style="padding:2px 8px; border-radius:9999px; font-size:11px; background:rgba(16,185,129,0.15); color:#34D399;">Completed</span></td>
              <td>Nova-Dev (VP Eng)</td>
              <td>0.42s</td>
            </tr>
            <tr>
              <td style="font-weight:600; color:#FFF;">Real-Time Stripe Billing Webhooks & Metered Usage</td>
              <td>Finance</td>
              <td><span style="padding:2px 8px; border-radius:9999px; font-size:11px; background:rgba(16,185,129,0.15); color:#34D399;">Completed</span></td>
              <td>Quant-Econ (CFO)</td>
              <td>0.68s</td>
            </tr>
            <tr>
              <td style="font-weight:600; color:#FFF;">Vector Embedding Semantic Caching Layer</td>
              <td>Performance</td>
              <td><span style="padding:2px 8px; border-radius:9999px; font-size:11px; background:rgba(99,102,241,0.15); color:#818CF8;">Running</span></td>
              <td>Synapse-AI (CTO)</td>
              <td>In Progress</td>
            </tr>
            <tr>
              <td style="font-weight:600; color:#FFF;">SOC2 Automated Compliance Invariant Checker</td>
              <td>Governance</td>
              <td><span style="padding:2px 8px; border-radius:9999px; font-size:11px; background:rgba(255,255,255,0.06); color:var(--fg-muted);">Queued</span></td>
              <td>Aegis-Risk (CPO)</td>
              <td>Pending</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>

  <script>
    function triggerPipelineRun() {
      const tbody = document.getElementById('pipelineRows');
      const tr = document.createElement('tr');
      tr.innerHTML = \`
        <td style="font-weight:600; color:#FFF;">Autonomous Dynamic Feature Synthesis</td>
        <td>Engineering</td>
        <td><span style="padding:2px 8px; border-radius:9999px; font-size:11px; background:rgba(16,185,129,0.15); color:#34D399;">Completed</span></td>
        <td>Supergence Swarm</td>
        <td>0.51s</td>
      \`;
      tbody.prepend(tr);
      alert('⚡ Autonomous pipeline triggered & verified in sandbox!');
    }
  </script>
</body>
</html>`;
  }
}

export const supergenceDesignEngine = new SupergenceDesignEngine();
export default supergenceDesignEngine;
