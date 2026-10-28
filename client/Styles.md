# Supergence — Styles

A reusable style reference for the Supergence app and guide. The current direction is **deep dark working areas with a warm brown outer frame and copper accents, clear surface hierarchy, and borderless controls: Manrope + Instrument Serif with copper motion graphics**.

## Source of truth

- `client/styles/supergence-tokens.css` — shared palettes, fonts, and theme compatibility.
- `client/styles/workspace-shell.css` — the actual workspace layout and controls.
- `client/styles/workspace-theme.css` — theme-aware app components.
- `client/styles/supergence-guide.css` — the guide's responsive reading layout.
- `client/styles/workspace-polish.css` — app interaction details and reduced-motion handling.
- `client/styles/supergence-motion.css` and `client/scripts/supergence-motion.js` — shared particles, reveals, pointer lighting, motion preference, and pause lifecycle.
- `client/scripts/supergence-icons.js` — original SVG outline icon primitives.

The app and `/guide.html` share the tokens. Download this document at `/Styles.md`. Change the shared stylesheet instead of maintaining a separate palette for each page.

## Visual direction

Keep the central conversation and composer surroundings near black. Use brown on the outer page, navigation rail, conversation sidebar, and workspace shortcuts. This inside/outside separation applies to all three themes. Pair modern Manrope UI typography with selective Instrument Serif display moments. Keep surfaces spacious and borderless. Use tonal fills and spacing to distinguish the composer and controls. Let a copper orbital graphic, flowing particles, pointer light, and smooth reveals bring energy to the page without covering the content.

No decorative borders, outlined cards, glows, or particle effects in the workspace. Keep starter actions as simple text buttons and use plain, direct copy. Use Instrument Serif deliberately rather than styling every heading as a serif. Keep a visible keyboard focus outline; it is an accessibility state, not permanent decoration.

Prefer a few clearly grouped surfaces over a box around every paragraph. Use strong hierarchy, comfortable line length, and purposeful space. Use glow, gradients, and animated graphics purposefully. Decorative particles are visual effects, never backend telemetry or capability evidence.

## Default palette — Charcoal

| Token                    | Value         | Use                                   |
| ------------------------ | ------------- | ------------------------------------- |
| `--shell-page`           | `#211a16`     | Main background                       |
| `--shell-panel`          | `#0b0c0c`     | Content and working panels            |
| `--shell-sidebar`        | `#211a16`     | Secondary navigation                  |
| `--shell-surface`        | `#191b1b`     | Inputs and compact controls           |
| `--shell-text`           | `#f5eee7`     | Primary text                          |
| `--shell-text-secondary` | `#d3d7d2`     | Supporting text                       |
| `--shell-muted`          | `#adb2ae`     | Secondary navigation and descriptions |
| `--shell-subtle`         | `#969e98`     | Lower-priority annotations            |
| `--shell-accent`         | `#e0b38c`     | Primary actions and highlights        |
| `--shell-accent-hover`   | `#f0cca9`     | Primary-action hover                  |
| `--shell-accent-ink`     | `#2a1b11`     | Text on copper actions                |
| `--shell-hover`          | `#222525`     | Hover surfaces                        |
| `--shell-selected`       | `#303532`     | Selected surfaces                     |
| `--shell-code`           | `#080909`     | Source and code areas                 |
| `--shell-raised`         | `#191b1b`     | Floating menus and dialogs            |
| `--shell-success`        | `#b6c7a2`     | Confirmed success                     |
| `--shell-warning`        | `#e6b88c`     | Attention or incomplete state         |
| `--shell-error`          | `#eea497`     | Actual errors                         |
| `--shell-border`         | `transparent` | Borderless surfaces                   |
| `--shell-backdrop`       | `#0d0805d9`   | Modal backdrop                        |

Always pair status colors with a label or icon. Telemetry and progress must come from real state. Present prompt examples as examples.

## Theme variants

Apply `class="sis-workspace-ui"` to the body. The browser preference remains `sis-ui-theme`.

| Theme    | Stored key | Page      | Panel     | Text      | Accent    |
| -------- | ---------- | --------- | --------- | --------- | --------- |
| Charcoal | `neutral`  | `#211a16` | `#0b0c0c` | `#f5eee7` | `#e0b38c` |
| Walnut   | `warm`     | `#2a2019` | `#0c0b0a` | `#f7eee5` | `#e9b98f` |
| Cocoa    | `midnight` | `#1a1613` | `#080909` | `#f2eae3` | `#cfa98c` |

The saved keys are retained for compatibility. Every theme uses deep dark central panels and a brown outer frame; the brown warmth varies. All themes share copper accents. The full foreground, surface, status, and accent palettes live in the shared stylesheet. Do not mix foregrounds and backgrounds from different themes.

## Typography

- UI: `var(--font-ui)` uses locally bundled **Manrope** variable font, weights 200–800, followed by system fallbacks.
- UI display headings: `var(--font-display)` uses Manrope.
- Editorial accents: `var(--font-editorial)` uses locally bundled **Instrument Serif**, regular and italic at weight 400. The hero pairs a Manrope first line with an oversized italic Instrument Serif second line.
- Keep body copy and controls sans-serif. Use Instrument Serif for selected phrases, empty states, or a display accent, with enough whitespace to feel contemporary.
- Manrope display text: roughly 40–61px, weight 600. Instrument Serif hero accents: roughly 68–100px, weight 400. Adapt these sizes on mobile.
- Section headings: 28–36px, weight 600. Body copy: 13–16px, line height 1.7–1.85.
- Both families are served from `client/fonts/`; no external font request is needed at runtime. Sources and OFL license files are included there. See [Instrument Serif](https://github.com/google/fonts/tree/main/ofl/instrumentserif) and [Manrope](https://github.com/google/fonts/tree/main/ofl/manrope).

## Surfaces and spacing

- Use surface color and spacing to communicate grouping. Controls and reading sections stay borderless; use restrained fills for hover and selection.
- Guide cards and large panels: approximately 18–22px radius. Controls: 9–12px. Do not put every element in a pill.
- Use 16–24px gaps between related panels and 48–64px between major reading sections.
- Use 24–30px interior padding in roomy panels; reduce it for small screens.
- Primary action: solid copper or warm cream, with the correct accent-ink foreground. Secondary actions use quiet filled surfaces or text.
- Inputs use a visibly different fill from their parent panel, with a persistent label. Focus uses a clear accent outline.
- A sticky header can use restrained background translucency and blur. Use translucent layers where they support the visual hierarchy, rather than behind every paragraph.
- Keep the existing 64px app rail and default 264px conversation sidebar. The guide uses a maximum 1400px layout, secondary navigation, and a flexible reading column.
- On narrow screens, move section navigation into a horizontal bar and stack multi-column forms and cards. Do not shrink an entire desktop layout.
- Use the actual logo at `/images/supergence-logo.png`, preserving its aspect ratio.

## Interaction and accessibility

- Use buttons for actions and links for navigation. Label inputs and icon-only controls.
- Maintain a visible 2px accent keyboard focus outline with roughly 3–4px offset. Never remove focus visibility to achieve a borderless appearance.
- Use `aria-current` or `aria-pressed` for selection as appropriate. Include clear loading, empty, disabled, success, and failure states.
- Keep touch targets comfortable, aiming for at least 44px where space permits.
- Ordinary transitions should be short, around 120–240ms. Scroll reveals may take around 650ms; ambient orbital graphics use slow 9–46 second loops. Respect `prefers-reduced-motion`.
- Check readability in all three themes, keyboard operation, mobile overflow, and increased zoom.
- Clipboard controls must report actual success or failure. Do not claim an action occurred because a button was clicked.

## Reuse

```html
<link rel="stylesheet" href="/styles/supergence-tokens.css" />
<body class="sis-workspace-ui" data-theme="neutral">
  <!-- Add the page's layout using the shared tokens. -->
</body>
```

```css
.panel {
  padding: 28px;
  border: 0;
  border-radius: 22px;
  color: var(--shell-text);
  background: var(--shell-panel);
  font-family: var(--font-ui);
}
.action {
  padding: 12px 18px;
  border: 0;
  border-radius: 12px;
  color: var(--shell-accent-ink);
  background: var(--shell-accent);
  font: inherit;
}
.action:focus-visible {
  outline: 2px solid var(--shell-accent);
  outline-offset: 4px;
}
```

For a separate project, include a local copy of the shared token stylesheet and use relative asset paths. Avoid a runtime dependency on the Supergence server unless the page is intended to run inside it.

## Prompt for reusing this style

> Build [page or feature] using Styles.md and the shared Supergence tokens. Use a modern interface with charcoal surfaces by default, optional warm brown themes, and borderless controls, Manrope UI text, selective Instrument Serif display accents, copper highlights, modern SVG icons, and spacious rounded panels. Separate sections through spacing and tone. Reuse working app components. Include [content and interactions], adapt it for mobile and desktop, preserve visible keyboard focus, add purposeful orbital motion, particles, scroll reveals, and pointer lighting; test the actual controls, and provide the files and preview. Respect reduced motion and allow ambient effects to be paused. Show real states and label anything unverified.

## Delivery check

Open the actual page and app in a real browser. Check desktop and narrow layouts, theme variants, keyboard focus, every interactive control, links and downloads. Confirm that any app feature is accessible from the app rather than stranded in a standalone demo.

## Motion and icons

- Reuse `mountMotionSurface`, `decorateMotion`, `revealOnScroll`, and `bindMotionToggle` from the shared motion module. The guide mounts particles over its hero. The app workspace keeps a static, undecorated surface.
- Particle motion is decorative. Its initial distribution is mathematical, with no fabricated backend metrics or logs. Pointer movement adds short trails, and pointer presses add a small spark burst.
- Cap decorative canvas drawing near 30 frames per second and device pixel ratio at 1.5. Use fewer particles on narrow or coarse-pointer devices. Pause when offscreen, when the page is hidden, or when the user disables motion.
- Ambient motion is configured in the app's Preferences → Ambient motion and stored as `sis-visual-motion`. The guide follows that preference without displaying a motion control. System reduced-motion preferences take precedence. A static orbital graphic remains when motion is reduced.
- Use the original 24px SVG primitives in `supergence-icons.js`, with currentColor, rounded caps and joins, and accessible control labels. Use actual copy, arrow, compass, layers, check, and sparkle icons instead of Unicode arrow/copy glyphs. Keep decorative SVGs hidden from assistive technology.
- Motion is progressive enhancement. Content, prompt copying, forms, navigation, and keyboard focus must work with effects turned off.
