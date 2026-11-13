# Supergence — Styles

Supergence uses pastel surfaces, clear text contrast, and rounded controls. Lilac Mist is the default. Apricot Cream, Mint Glass, and Lavender Dusk use the same component styles.

## Source of truth

- `client/styles/supergence-tokens.css` defines the shared palettes, typography, and appearance previews.
- `client/styles/workspace-shell.css` defines the workspace layout and common controls.
- `client/styles/workspace-theme.css` styles conversation and navigation surfaces.
- `client/styles/supergence-guide.css` defines the guide layout.
- `client/styles/supergence-motion.css` and `client/scripts/supergence-motion.js` handle optional motion and reduced motion.
- `client/scripts/supergence-icons.js` contains the shared SVG icon primitives.

Use the shared tokens for new surfaces and appearance previews. The app, sign-in wizard, guide, and storage view all load them.

## Color and hierarchy

Use `--shell-page` for the canvas, `--shell-panel` for the reading and working areas, and `--shell-surface` for controls. Use `--shell-tint`, `--shell-mint`, `--shell-blue`, and `--shell-peach` for grouped or selected content. Use `--shell-accent` with `--shell-accent-ink` for primary actions. Use `--shell-shadow` and `--shell-backdrop` for floating layers.

| Theme         | Saved key  | Page      | Panel     | Accent    |
| ------------- | ---------- | --------- | --------- | --------- |
| Lilac Mist    | `obsidian` | `#f0edf8` | `#fefcff` | `#6544a3` |
| Apricot Cream | `warm`     | `#f8eee7` | `#fffdfb` | `#87442d` |
| Lavender Dusk | `midnight` | `#252239` | `#2d2844` | `#d9c5ff` |
| Mint Glass    | `cyber`    | `#eaf5f0` | `#fcfffd` | `#245f55` |

The preference remains `sis-ui-theme`. The previous `neutral` key maps to Lilac Mist. The default palettes use dark text on soft surfaces. Lavender Dusk uses pale lavender and mint accents on deep violet surfaces.

Pair status colors with a label or icon. Keep telemetry and progress tied to application state.

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
- Primary action: the accent fill with its paired accent-ink foreground. Secondary actions use quiet filled surfaces or text.
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
- Check readability in all four themes, keyboard operation, mobile overflow, and increased zoom.
- Clipboard controls must report actual success or failure. Do not claim an action occurred because a button was clicked.

## Reuse

```html
<link rel="stylesheet" href="/styles/supergence-tokens.css" />
<body class="sis-workspace-ui" data-theme="obsidian">
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

> Use the shared Supergence tokens for [page or feature]. Group related controls with pastel fills and spacing, and use the accent pair for the primary action. Reuse existing controls. Test desktop and mobile layouts, keyboard focus, and each palette. Respect reduced motion and display application state accurately.

## Delivery check

Open the actual page and app in a real browser. Check desktop and narrow layouts, theme variants, keyboard focus, every interactive control, links and downloads. Confirm that any app feature is accessible from the app rather than stranded in a standalone demo.

## Motion and icons

- Reuse `mountMotionSurface`, `decorateMotion`, `revealOnScroll`, and `bindMotionToggle` from the shared motion module. The guide mounts particles over its hero. The app workspace keeps a static, undecorated surface.
- Particle motion is decorative. Its initial distribution is mathematical, with no fabricated backend metrics or logs. Pointer movement adds short trails, and pointer presses add a small spark burst.
- Cap decorative canvas drawing near 30 frames per second and device pixel ratio at 1.5. Use fewer particles on narrow or coarse-pointer devices. Pause when offscreen, when the page is hidden, or when the user disables motion.
- Ambient motion is configured in the app's Preferences → Ambient motion and stored as `sis-visual-motion`. The guide follows that preference without displaying a motion control. System reduced-motion preferences take precedence. A static orbital graphic remains when motion is reduced.
- Use the original 24px SVG primitives in `supergence-icons.js`, with currentColor, rounded caps and joins, and accessible control labels. Use actual copy, arrow, compass, layers, check, and sparkle icons instead of Unicode arrow/copy glyphs. Keep decorative SVGs hidden from assistive technology.
- Motion is progressive enhancement. Content, prompt copying, forms, navigation, and keyboard focus must work with effects turned off.
