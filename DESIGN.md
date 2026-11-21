# DESIGN.md  -  Cut List Calculator design system

Single source of truth for how the site looks. `src/styles/tokens.css` implements it.
Nothing outside tokens.css may hard-code a colour, font size, spacing or radius.
Need something new? Add it here first, then to tokens.css, then use it.

## 1. Principles
1. Tool first. The tool starts inside the first screen. No hero, no marketing blocks.
2. Readable in daylight for adults aged 30 to 60: big text, strong contrast, big targets, dark mode.
3. Calm and trustworthy: one brand colour, neutrals, plain words, visible units and limits.
4. Same page structure on every tool (see plan.txt section 3).
5. No AI look: no gradients, glow, glass, emoji icons, centred hero, three identical feature cards, filler copy.

## 2. Colour tokens (verified contrast, ratios shown)
Light theme (default):
| Token | Value | Use | Contrast |
|---|---|---|---|
| --color-bg | #FFFFFF | page | |
| --color-surface | #F4F6F8 | cards, panels | |
| --color-text | #12161C | body, labels | 18.2 on bg |
| --color-text-muted | #3B4554 | hints, captions | 9.7 on bg, 8.9 on surface |
| --color-border | #6B7686 | inputs, dividers that matter | 4.6 on bg |
| --color-brand | #0A55A8 | buttons, links, focus ring | 7.3 on bg |
| --color-brand-hover | #08447F | hover and pressed | |
| --color-on-brand | #FFFFFF | text on brand | 7.3 on brand |
| --color-danger | #B3261E | errors | 6.5 on bg |
| --color-success | #1B6B3A | success | 6.5 on bg |
| --color-warning | #7A4A00 | warnings, "verify" note text | 7.5 on bg |

Dark theme (same token names):
| Token | Value | Contrast |
|---|---|---|
| --color-bg | #0E1217 | |
| --color-surface | #171C23 | |
| --color-text | #F1F4F8 | 17.0 on bg |
| --color-text-muted | #B8C1CE | 10.3 on bg, 9.4 on surface |
| --color-border | #7F8A9B | 5.4 on bg |
| --color-brand | #7DB8FF | 9.1 on bg |
| --color-brand-hover | #A3CCFF | |
| --color-on-brand | #0E1217 | 9.1 on brand |
| --color-danger | #FF9C94 | 9.3 on bg |
| --color-success | #7BDCA0 | 11.3 on bg |
| --color-warning | #FFC46B | 12.0 on bg |

Rules: re-check contrast whenever a colour token changes. Body and label text must stay at 7:1 or better in both themes.
Alert backgrounds use --color-surface with a 4 px left border in the semantic colour plus an icon and text (never colour alone).

## 3. Theme behaviour
- Default follows `prefers-color-scheme`. Header toggle (Light / Dark / Auto) overrides and is saved on the device.
- An inline script in `<head>` sets `data-theme` before first paint so there is no flash.
- Tokens are defined on `:root` and redefined on `:root[data-theme="dark"]`.

## 4. Diagram colours (the "drawing sheet")
The diagram frame always uses a light paper look in both themes so it reads and prints the same.
| Token | Value |
|---|---|
| --diagram-paper | #FFFFFF |
| --diagram-ink | #12161C (text and cut lines, 18:1) |
| --diagram-stock-border | #3B4554 |
| --diagram-waste | #E6E9ED with diagonal hatch |
| --diagram-piece-1..6 | #CFE3FA, #F9DDB0, #CDEBD5, #F4CFE0, #E0D6F5, #D9E8A8 (all 12.8:1 or better with ink) |
Every piece also shows its number and size. Piece groups differ by pattern as well as colour, so black-and-white prints work. Cut order is numbered.

## 4b. Brand and logo
Name: Cut List Calculator. Logo: wordmark only in --color-text, with a small square mark made of two rectangles in --color-brand. One mark, no gradients.

## 5. Typography
- UI font: system stack `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` (no download, works offline, fast).
- Numbers: `font-variant-numeric: tabular-nums`. Dimensions in the diagram may use `ui-monospace, "SF Mono", Consolas, monospace`.
- Weights: 400 body, 600 labels and buttons, 700 headings. Nothing lighter than 400.
- Sizes in rem (1rem = 16 px browser default; body is 1.125rem = 18 px):
| Token | Size | Use |
|---|---|---|
| --text-caption | 0.875rem (14 px) | captions only, the minimum anywhere |
| --text-small | 1rem (16 px) | secondary text, table cells |
| --text-body | 1.125rem (18 px) | body, labels |
| --text-input | 1.25rem (20 px) | inputs, buttons |
| --text-h3 | 1.5rem (24 px) | |
| --text-h2 | 1.875rem (30 px) | |
| --text-h1 | 2.375rem (38 px), 2rem on phones | one per page |
- Line height 1.6 body, 1.2 headings. Text blocks max 70 characters wide, left aligned.

## 6. Spacing, shape, motion
- Spacing scale (px): 4, 8, 12, 16, 24, 32, 48, 64 as --space-1..8.
- Radius: --radius-s 6 px (inputs, buttons), --radius-m 12 px (cards).
- Shadow: --shadow-1 (cards, subtle), --shadow-2 (menus). Prefer borders.
- Motion: 120 to 200 ms ease-out. `prefers-reduced-motion` turns animation off.
- Layout: content max width 1120 px, side padding 16 px (phone) and 24 px (desktop), breakpoints 640, 960, 1280. Tool pages: one column on phone, two columns from 960 px (inputs left, results right).

## 7. Interaction sizes
- Every tap target at least 48 x 48 px, at least 8 px apart.
- Inputs 56 px high, text 20 px, visible label above (never placeholder-only), unit shown inside or beside the field.
- Primary button 56 px high, full width on phones.
- Focus ring: 3 px --color-brand, 2 px offset, on every interactive element.
- No hover-only features. Help text opens on tap.

## 8. Components (each has default, hover, focus, active, disabled, error states)
1. Header: logo left, tool switcher (tabs, live tools only), theme toggle right. Skip link first. Same on every page.
2. Tool switcher: horizontal tabs, scrolls sideways on phones, current tool marked with text weight plus underline.
3. Page title block: h1, one-line promise, "i  How to use" button (anchor to #how-to).
4. Button: primary (filled brand), secondary (border), ghost (text). Label says the action.
5. Number input with unit: label, field, unit, hint (aria-describedby), error text below.
6. Select and toggle (segmented control for units; switch for options).
7. Row editor (pieces): columns length, width where needed, quantity; add, duplicate, delete buttons with text labels.
8. Collapsible "Advanced settings" (kerf, rotate, grain, offcuts). Closed by default.
9. Results summary card: stock used, waste %, unplaced, as large numbers with labels.
10. Diagram frame: titled SVG on the paper look, scrolls inside its own frame, zoomable.
11. Table (cut list): numbered cuts, readable on phone, no tiny text.
12. Alert: info, warning, error, success. The "Verify before cutting" note is a permanent warning alert next to the results.
13. How-to block (#how-to): numbered steps, short.
14. Footer: small links (About, Help, Guides, Privacy), a "Learn more about this site" link to About, "Calculations run in your browser. Nothing is uploaded." Text stays at --text-small or larger.
15. Related-tools row: simple text links with one line each.

## 9. Copy style
Plain, direct, trade words (kerf, offcut, rip, crosscut). Sentence case. No exclamation marks, no emoji, no slogans.
Say "efficient layout", never "zero waste" or "perfect". Errors name the field and the fix.

## 10. Icons
One set, outline style, 2 px stroke, 24 px. Inline SVG only, always with a text label next to it.
