# Supergence Design Direction & Architecture

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

**Unified Palette: Deep Dark Obsidian with Cyan/Teal Accent** — Zero bluish gradients, zero full-page glow, zero neon. One accent color used purposefully.

### Color Tokens

```css
:root {
  /* Canvas — deepest layer */
  --sg-void:        #050608;   /* Deep obsidian void, neutral pitch black */
  --sg-page:        #0a0c10;   /* App background */

  /* Surfaces — elevated layers */
  --sg-surface-1:   #0f1117;   /* Primary cards, panels */
  --sg-surface-2:   #14171e;   /* Elevated cards, modals */
  --sg-surface-3:   #1a1e27;   /* Highest elevation (tooltips, dropdowns) */

  /* Borders & Dividers */
  --sg-border:      rgba(255, 255, 255, 0.08);   /* Standard hairline */
  --sg-border-strong: rgba(255, 255, 255, 0.14); /* Active/focused borders */
  --sg-divider:     rgba(255, 255, 255, 0.06);   /* Subtle separators */

  /* Text */
  --sg-text:        #f4f4f5;   /* Primary — WCAG AA > 12:1 on void */
  --sg-text-dim:    #94a3b8;   /* Secondary — > 5:1 contrast */
  --sg-text-muted:  #64748b;   /* Tertiary — labels, placeholders */
  --sg-text-inverse:#050608;   /* On accent surfaces */

  /* Accent — ONE purposeful color: Cyan/Teal */
  --sg-accent:      #06b6d4;   /* Primary accent — cyan-500 */
  --sg-accent-hover:#0891b2;   /* Hover state */
  --sg-accent-soft: rgba(6, 182, 212, 0.12); /* Backgrounds, badges */
  --sg-accent-glow: rgba(6, 182, 212, 0.18); /* Focus rings, subtle glows */

  /* Semantic — derived from accent, not new hues */
  --sg-success:     #10b981;   /* Emerald — only for success states */
  --sg-warning:     #f59e0b;   /* Amber — only for warnings */
  --sg-error:       #ef4444;   /* Crimson — only for errors */

  /* Typography */
  --sg-font-ui:     'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --sg-font-display:'Instrument Serif', Georgia, serif;
  --sg-font-mono:   'JetBrains Mono', 'Fira Code', Consolas, monospace;

  /* Motion */
  --sg-ease:        cubic-bezier(0.16, 1, 0.3, 1);
  --sg-ease-out:    cubic-bezier(0.33, 1, 0.68, 1);
  --sg-duration-fast: 120ms;
  --sg-duration-normal: 180ms;
  --sg-duration-slow: 240ms;

  /* Layout */
  --sg-rail-width:  64px;
  --sg-sidebar-width: 280px;
  --sg-composer-max-h: 140px;
  --sg-radius-sm:   6px;
  --sg-radius-md:   10px;
  --sg-radius-lg:   14px;
  --sg-radius-full: 999px;

  /* Shadows — elevation only, never decorative */
  --sg-shadow-sm:   0 1px 3px rgba(0, 0, 0, 0.4);
  --sg-shadow-md:   0 4px 12px rgba(0, 0, 0, 0.45);
  --sg-shadow-lg:   0 12px 32px rgba(0, 0, 0, 0.5);
  --sg-shadow-xl:   0 20px 48px rgba(0, 0, 0, 0.55);
}
```

### Theme Variants (all derived from base tokens)

```css
/* Warm variant — coffee tones, same structure */
[data-theme="warm"] {
  --sg-void:        #0d0a08;
  --sg-page:        #13100d;
  --sg-surface-1:   #1a1511;
  --sg-surface-2:   #221c16;
  --sg-surface-3:   #2a231b;
  --sg-border:      rgba(251, 146, 60, 0.14);
  --sg-border-strong: rgba(251, 146, 60, 0.22);
  --sg-text:        #fef7f2;
  --sg-text-dim:    #c9b8a8;
  --sg-text-muted:  #9a8a7a;
  --sg-accent:      #fb923c;
  --sg-accent-hover:#f97316;
  --sg-accent-soft: rgba(251, 146, 60, 0.12);
  --sg-accent-glow: rgba(251, 146, 60, 0.18);
}

/* Midnight variant — deeper blue undertones */
[data-theme="midnight"] {
  --sg-void:        #06060c;
  --sg-page:        #0b0b14;
  --sg-surface-1:   #11111d;
  --sg-surface-2:   #181828;
  --sg-surface-3:   #1f1f32;
  --sg-border:      rgba(139, 92, 246, 0.14);
  --sg-border-strong: rgba(139, 92, 246, 0.22);
  --sg-text:        #f8f6fc;
  --sg-text-dim:    #c8c2d9;
  --sg-text-muted:  #8b82a3;
  --sg-accent:      #a78bfa;
  --sg-accent-hover:#8b5cf6;
  --sg-accent-soft: rgba(167, 139, 250, 0.12);
  --sg-accent-glow: rgba(167, 139, 250, 0.18);
}
```

---

## 3. Typography Scale

```css
:root {
  /* Display — Instrument Serif, editorial moments only */
  --sg-display-xl:  clamp(2.5rem, 4vw + 1rem, 4rem) / 1.1 var(--sg-font-display);
  --sg-display-lg:  clamp(1.75rem, 2.5vw + 1rem, 2.5rem) / 1.15 var(--sg-font-display);
  --sg-display-md:  clamp(1.375rem, 1.5vw + 1rem, 1.75rem) / 1.2 var(--sg-font-display);

  /* UI — Manrope, all interface text */
  --sg-heading-lg:  1.25rem / 1.3 var(--sg-font-ui);
  --sg-heading-md:  1.125rem / 1.35 var(--sg-font-ui);
  --sg-heading-sm:  1rem / 1.4 var(--sg-font-ui);
  --sg-body-lg:     1rem / 1.6 var(--sg-font-ui);
  --sg-body:        0.9375rem / 1.6 var(--sg-font-ui);
  --sg-body-sm:     0.875rem / 1.55 var(--sg-font-ui);
  --sg-caption:     0.8125rem / 1.5 var(--sg-font-ui);
  --sg-micro:       0.75rem / 1.4 var(--sg-font-ui);

  /* Mono — JetBrains Mono, code & telemetry */
  --sg-mono-lg:     0.9375rem / 1.6 var(--sg-font-mono);
  --sg-mono:        0.875rem / 1.6 var(--sg-font-mono);
  --sg-mono-sm:     0.8125rem / 1.55 var(--sg-font-mono);
  --sg-mono-xs:     0.75rem / 1.5 var(--sg-font-mono);

  /* Weights */
  --sg-wt-light:    300;
  --sg-wt-regular:  400;
  --sg-wt-medium:   500;
  --sg-wt-semibold: 600;
  --sg-wt-bold:     700;
}
```

---

## 4. Component Architecture

### 4.1 Rail (Left Navigation) — `ENERGY 2`, `RHYTHM 2`

- Fixed 64px width, full height
- Icon-only at rest, expands on hover/focus to show labels
- Active state: accent border-left (3px) + soft accent background
- No tooltips needed — expansion reveals labels naturally

### 4.2 Top Bar — `ENERGY 1`, `RHYTHM 1`

- Height: 48px
- Left: workspace title + breadcrumb
- Center: empty (breathing room)
- Right: model switcher (pill), side-chat toggle, superbox, side-browser toggle
- Border-bottom: `var(--sg-divider)`

### 4.3 Main Chat Column — `ENERGY 2`, `RHYTHM 2`

- Flex: 1, min-width: 0
- Chat stream: virtualized, auto-scroll lock when user scrolls up
- Messages: user (right, accent bg), assistant (left, surface-1), tool calls (collapsible cards)
- Composer: bottom-docked, auto-grow to max-h, enters on focus

### 4.4 Side Browser (Right Pane) — `ENERGY 2`, `RHYTHM 2`

- Width: 320px default, resizable (240px–520px), collapsible
- Two modes: **Artifact Stage** (iframe/code) | **Browser Swarm** (Playwright screenshots)
- Header: mode tabs + title + actions (reload, popout, download, expand, close)
- No glassmorphism — solid surfaces with hairline borders

### 4.5 Right Sidebar (Agents/Progress) — `ENERGY 1`, `RHYTHM 1`

- Width: 280px, collapsible to 48px (icon-only)
- Sections: Progress (task list), SIS Systems (agent cards), Routines
- Agent cards: avatar (color-coded), name, domain, status pill
- No bento grids — simple vertical stack with consistent rhythm

### 4.6 Modals & Drawers — `ENERGY 2`, `MOTION 2`

- Backdrop: `rgba(5, 6, 8, 0.6)` + `backdrop-filter: blur(8px)`
- Panel: `var(--sg-surface-2)`, `var(--sg-radius-lg)`, `var(--sg-shadow-xl)`
- Enter: slide + fade (180ms spring), Exit: fade (120ms)
- Focus trap, Escape to close, click backdrop to close

---

## 5. Interaction Patterns

| Interaction | Pattern | Motion |
|-------------|---------|--------|
| Rail hover | Width 64px → 200px, labels fade in | 160ms spring |
| Sidebar collapse | Width 280px → 48px, content slides out | 180ms spring |
| Composer focus | Height auto-grow, border accent | 140ms ease-out |
| Tool call expand | Height auto, chevron rotate | 160ms spring |
| Modal open | Scale 0.96→1 + fade | 180ms spring |
| Tab switch | Cross-fade, indicator slide | 140ms ease-out |
| Tooltip | Fade in/out, no motion | 100ms/80ms |

---

## 6. Rationale for Every Major Decision (R-31)

1. **Why Deep Dark Obsidian?** Developer environments and persistent AI workspaces require low eye fatigue during long sessions; neutral deep dark provides optimal contrast without colored hue pollution.
2. **Why One Accent Color (Cyan/Teal)?** Multiple accents create visual noise. One purposeful accent creates hierarchy: active states, focus rings, primary actions, live indicators.
3. **Why Manrope + Instrument Serif + JetBrains Mono?** Manrope: geometric, legible, tabular numerals for telemetry. Instrument Serif: editorial warmth for display moments only. JetBrains Mono: code, logs, coordinates — monospace with clear glyphs.
4. **Why No Glassmorphism/Blur as Default?** Blur is expensive and reduces legibility. Used only on modal backdrops (context preservation) and one floating panel. Never on nav, cards, or modals themselves.
5. **Why Collapsible Tool Calls?** Real agentic execution involves dozens of tool calls. Collapsible cards with status pills and duration show transparency without overwhelming conversation flow.
6. **Why Three-Column Layout?** Chat (primary), Side Browser (artifact/browser context), Right Sidebar (agents/progress) — each serves a distinct cognitive mode. Resizable/collapsible respects screen real estate.
7. **Why Spring Curves (0.16, 1, 0.3, 1)?** Natural deceleration feels responsive, not "animated." 140–200ms keeps interactions snappy without drawing attention to motion itself.
8. **Why Hairline Borders (0.08 opacity)?** Defines structure without weight. Stronger borders (0.14) only for active/focused states — hierarchy through contrast, not thickness.

---

## 7. Accessibility Commitments

- All text meets WCAG AA (4.5:1 normal, 3:1 large) in all themes
- Focus visible: `outline: 2px solid var(--sg-accent); outline-offset: 2px`
- Keyboard: Tab order matches visual, Escape closes modals/drawers, arrows navigate tabs
- Reduced motion: `@media (prefers-reduced-motion: reduce)` disables all transitions > 50ms
- ARIA: Labels on icon buttons, live regions for status, roles on custom controls
- Color never sole indicator: status pills have icons + text, focus has outline + color

---

## 8. Anti-Patterns Explicitly Banned

- ❌ Blue-to-purple gradients, neon glows, radial orbs
- ❌ Glassmorphism on nav, cards, modals, sidebar simultaneously
- ❌ Pill-shaped everything (buttons, cards, inputs, badges)
- ❌ Bento grids, fake terminals, "Trusted By" logo bars
- ❌ "AI Powered", "Revolutionary", "Seamless", "Next Generation" copy
- ❌ Fake stats (10K+ users, 99.9% uptime), fictional testimonials
- ❌ Sparkle/star/magic/lightning/diamond/orb/robot icons as feature markers
- ❌ Em dashes (—) in any UI text
- ❌ Non-functional buttons, dead nav links, missing empty/loading/error states