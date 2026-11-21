---
name: design-system-tokens
description: Design system and tokens for a consistent, professional (not AI-looking) site. Use when creating or editing DESIGN.md, CSS variables, typography, spacing, components, or any visual styling.
---

# Design system and tokens

References:
- https://www.designtokens.org (Design Tokens format)
- https://www.radix-ui.com/colors (accessible colour scales)
- https://www.refactoringui.com (practical visual hierarchy)

## Single source of truth
- `DESIGN.md` at the repo root defines the system. `src/styles/tokens.css` implements it as CSS custom properties. Nothing else may hard-code colours, font sizes, spacing or radii.
- Changing a look means changing a token, then every page follows.

## Token groups
- Colour: neutral scale (12 steps, Radix-style), one brand colour scale, semantic colours (success, warning, danger, info), surface, text, border, focus ring. Light and dark themes use the same token names. Implement with `:root` plus `[data-theme="dark"]`, an inline script in `<head>` that sets the theme before first paint (no flash), `prefers-color-scheme` as the default and a header toggle that overrides and remembers the choice.
- Typography: system font stack for UI (no font download, works offline), monospace for dimensions. The exact scale, sizes and values are in DESIGN.md (body 18 px, inputs 20 px, nothing under 14 px). Line heights 1.5 to 1.6 for text, 1.15 to 1.25 for headings.
- Spacing: 4 px base scale (4, 8, 12, 16, 24, 32, 48, 64).
- Radius: two values only (for example 6 px and 12 px). Shadow: two levels only. Borders preferred over heavy shadows.
- Layout: max content width, 12-column grid on desktop, 16 px mobile gutter, breakpoints at 640, 960, 1280.
- Motion: 120 to 200 ms ease-out, respect prefers-reduced-motion.

## Components (each documented in DESIGN.md with states)
Button (primary, secondary, ghost), text input, number input with unit, select, toggle, row editor (add/duplicate/delete), card, results summary, diagram frame, alert (info, warning, error), table, tabs, header, footer. Each lists default, hover, focus, active, disabled, error states.

## Anti-"AI look" rules
- No purple-to-blue gradients, glassmorphism, glowing orbs, random emoji icons, centred hero with three identical feature cards, or lorem-style filler copy.
- Restrained palette: neutrals plus one brand colour. Colour carries meaning, not decoration.
- Real hierarchy: size and weight contrast, generous whitespace, left-aligned text blocks, consistent alignment on a grid.
- Icons from one set only, one stroke weight.
- Trust cues over decoration: clear units, visible limits, "Verify before cutting" note, privacy statement ("calculations run in your browser").

## Rules for the agent
- Before writing any UI, read DESIGN.md and tokens.css. Use only existing tokens and components. Need something new? Add it to DESIGN.md first, then to tokens.css, then use it.
- No inline styles. No one-off CSS values. Review diffs for hard-coded hex values and pixel sizes outside tokens.css.
- Contrast of every token pair is checked when the token is added (see the accessibility skill).
