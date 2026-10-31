# Website styles: Supergence launch design

A practical design brief for people and agents building presentation-led websites. Use it as a starting point, then adapt the composition, language, imagery, and color to the actual product. The Supergence launch page is implemented in `client/styles/silisleek-launch.css`, with its closing composition in `client/styles/silisleek-closing.css`.

## Creative direction

Make the page feel like a considered product launch: editorial, confident, spacious, and quietly futuristic. Give each section one clear idea and a distinct visual role. Use a small number of exceptional, relevant images at a generous scale. Contrast a dark, cinematic opening with warm, light sections and return to darkness for a memorable closing moment. Let typography and composition do most of the work; use glow, motion, and ornament sparingly.

Build a narrative: introduce the product, explain its purpose, make its capabilities concrete, express its point of view, and provide a clear next step. Write concise, natural copy grounded in verified product capabilities. Never invent customers, statistics, security guarantees, or telemetry.

## Palette

The earlier launch stylesheet uses the following foundation:

| Role                 | Value                       |
| -------------------- | --------------------------- |
| Near-black canvas    | `#0b0b0b`                   |
| Dark section         | `#111210`                   |
| Warm paper           | `#e9e7e1`                   |
| Light text           | `#f4f2ec`                   |
| Ink on paper         | `#10100f`                   |
| Warm accent          | `#c6ab98`                   |
| Accent on paper      | `#9a8274`                   |
| Quiet border on dark | `rgba(255, 255, 255, 0.17)` |

Muted greys support secondary copy. A subtle brown radial gradient adds depth to dark surfaces, for example `radial-gradient(ellipse at 75% 46%, #30251f, #171310 26%, #0b0b0b 58%)`. Check contrast in context, especially for small text.

## Typography

Pair **Instrument Serif** (including italic) for expressive headlines with **DM Sans** for body text, navigation, and labels. Use sensible serif and sans-serif fallbacks. The current legacy page uses Manrope for supporting text.

- Headlines are large, regular weight, tightly spaced, and deliberately broken into short lines. The earlier desktop hero uses `clamp(70px, 8.3vw, 130px)`, `line-height: .95`, and `letter-spacing: -.045em`.
- Set a key phrase in italic and a warm accent color. Use this contrast as punctuation, not on every line.
- Body copy is typically 14–15px with approximately 1.7–1.8 line height and a narrow measure.
- Use small uppercase labels, around 9–10px, with generous tracking for section numbers and quiet metadata. Keep essential instructions and controls larger and legible.

## Layout and composition

Use approximately 6% horizontal page padding on desktop and 110px vertical section padding, reducing vertical padding to about 80px on smaller screens. Create rhythm by alternating an asymmetric text/image hero, an open editorial split, an uneven feature grid, a centered statement, and a direct call to action.

The launch hero puts the headline and action on the left, a large supplied metallic sphere on the right, and thin orbital lines behind it. A restrained radial glow and shadow give the artwork depth. The feature section uses a larger card beside two stacked smaller cards. A warm paper section gives the eye a rest between dark sections.

The closing composition takes inspiration from the supplied reference: a centered statement, a constellation of transparent cutouts, and the official Supergence logo. Keep text readable above the art and position the elements independently at smaller widths. Use the actual supplied brand asset; do not recreate or replace it with a generic symbol.

## Components and interaction

- Navigation: simple brand, a few section links, and one outlined pill action.
- Primary action: high-contrast pill, approximately `18px 22px` padding, with a small directional arrow. A subtle 3px upward hover movement is sufficient.
- Secondary action: a simple text link with an arrow.
- Feature surfaces: nearly black backgrounds, fine borders, short headings, brief descriptions, and a single focal image.
- Use real links and semantic landmarks. Include a skip link, visible keyboard focus, meaningful accessible names, and empty alt text for purely decorative images.

## Assets and motion

Use the provided Supergence assets in `client/images/silisleek/`: the metallic sphere, liquid starburst, golden record, atom, butterfly, neuron, chess knight, and science badge. The official logo is `supergence-official.png`, copied from the user-supplied original. Preserve aspect ratios and use `object-fit: contain`; avoid stretching or adding effects that obscure the work.

A slow, subtle float (the earlier hero used a 12px movement over nine seconds) can add life. Keep the page useful without animation and honor `prefers-reduced-motion: reduce`. Avoid animated decoration that interferes with reading, scrolling, or controls.

## Responsive and verification checklist

At approximately 800px and below, stack editorial splits and feature cards, reduce section padding, and adjust the hero artwork so it does not obscure text or actions. At narrow phone widths, keep artwork within the viewport, wrap actions naturally, and check the complete page rather than only the first screen.

Verify the real page in Chrome at desktop and phone widths. Check actual image loads, link destinations, keyboard focus, reduced motion, browser errors, and horizontal overflow. Review the visual result at full size and revise collisions or illegible text. Run the repository's applicable lint and browser checks, and report any environment or test limitations honestly.

