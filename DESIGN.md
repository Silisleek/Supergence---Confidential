# Supergence Design Direction & Architecture (DESIGN.md)

> This document defines the visual identity, interaction architecture, and design system for Supergence.
> Filtered through the Antislop Craftsmanship Standard (Mode 1: During).

---

## 1. Dials & Personality

| Dial       | Value                          | Rationale                                                                                                                                                                            |
| :--------- | :----------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ENERGY** | **2 (Balanced)**               | A focused, high-clarity professional workbench for superintelligent pair programming, agent orchestration, and memory inspection. Confident, dark, and tactile without neon clutter. |
| **RHYTHM** | **2 (Structured & Varied)**    | Modular three-column / full-viewport paradigm: clean chat stream with collapsible tool calls, dedicated real-time memory showcase, and interactive agent flow canvas.                |
| **MOTION** | **2 (Purposeful Transitions)** | 140–200ms smooth spring curves for composer expansion, drawer reveals, and tab switching. Respects `prefers-reduced-motion` strictly.                                                |

---

## 2. Core Aesthetic & Color System

Strictly adhering to user preferences: **Deep Dark Obsidian**, zero bluish gradients or full-page glow slop.

- **Canvas Void**: `#050608` (deep obsidian void, neutral pitch black)
- **Card Surfaces**: `#0b0c0f` (elevated obsidian surface)
- **Inset Containers**: `#111216` (recessed viewport and stream containers)
- **Control Surfaces**: `#18191e` (buttons, inputs, and tabs)
- **Specular Edges**: `rgba(255, 255, 255, 0.07)` to `rgba(255, 255, 255, 0.12)` (crisp, subtle luxury definition)
- **Accent Foreground**: `#f4f4f5` (high-contrast neutral silver/white, WCAG AA compliant > 12:1)
- **Muted Foreground**: `#94a3b8` / `#a1a1aa` (clear secondary reading text, > 5:1 contrast)
- **Semantic Accents**:
  - Emerald `#10b981` (active reasoning, successful tool execution)
  - Cyan/Sapphire `#38bdf8` (active memory synthesis, active agent link)
  - Amber `#f59e0b` (in-progress tool execution, pending dream consolidation)
  - Crimson `#ef4444` (tool execution error, syntax defect)

---

## 3. Typography

- **Interface & Body**: `Manrope`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `sans-serif` (clean, highly legible geometric sans with tabular numerals for telemetry).
- **Headings & Accents**: `Instrument Serif`, `Georgia`, `serif` used selectively for display elegance in header titles and empty states.
- **Code & Monospace**: `JetBrains Mono`, `Consolas`, `monospace` for tool arguments, CLI commands, and raw memory transcripts.

---

## 4. Rationale for Every Major Decision (R-31)

1. **Why Deep Dark Obsidian?** Developer environments and persistent AI workspaces require low eye fatigue during long sessions; neutral deep dark provides optimal contrast without colored hue pollution.
2. **Why Collapsible Tool Call Blocks?** Real agentic execution involves dozens of tool calls (`read_file`, `run_command`, etc.). Collapsible cards with clear status pills and execution duration show full transparency without overwhelming the conversation flow.
3. **Why Dedicated 3-Layer Memory Showcase?** Anthropic's agent memory research proves agents require episodic transcripts, structured wikis, and bounded indices. Showing this live to the user demystifies AI learning and proves self-improvement.
4. **Why Spring-Animated Bottom Composer?** A minimal resting pill keeps screen real estate focused on content, while spring expansion provides immediate access to agent switching, action chips, reasoning, and voice.
5. **Why Multi-Mode Top Switcher?** Power users need instant 1-click access between Chat, Live Memory, Tool Registry, Browser Agent, and the Swarm Graph without navigating buried menus.
