---
name: ux-information-architecture
description: UX and information architecture rules for the tool pages and site shell. Use when designing page layouts, forms, navigation, results views or mobile behavior so every tool page works the same way.
---

# UX and information architecture

References:
- https://lawsofux.com
- https://www.nngroup.com/articles/
- https://www.refactoringui.com

## Site structure
- Home is the flagship tool itself (tool first, no marketing landing page). One page per tool. Help, About, Privacy, later Guides/Blog.
- One URL per tool and per specific search intent. Header is the same everywhere: logo, tool switcher (only LIVE tools, never "coming soon"), theme toggle.
- No language switch at launch (English only). All strings still live in a translation file so a language can be added later.
- Long explanations never go on tool pages. They live in Help, About and Guides, linked from the page footer and from the "How to use" section.

## One layout for every tool page (tool first, short page)
Same order on every tool page, so users learn it once. The tool must start inside the first screen on a 360 x 640 phone (no hero, no intro paragraph above it).
1. Title, one-line promise, and an "i  How to use" button (anchor link to #how-to further down the same page)
2. Inputs: stock, pieces, settings (kerf, rotate, grain). Advanced settings collapsed.
3. Calculate button
4. Results summary (stock used, waste %, unplaced)
5. Cutting diagram
6. Cut list or ordered steps
7. Actions: print, copy share link
8. "Verify before cutting" note, visible next to the results
Below the tool (kept short, about 3 screens at most):
9. #how-to: numbered "How to use" steps, about 150 to 250 words
10. Assumptions and limits, about 100 words. Up to 5 real FAQs.
11. Related tools row, then the footer (About, Help, Guides, Privacy, "Calculations run in your browser", "Learn more" link to About).
Anything longer than this goes to Help or Guides with a link.

## Phone-first rules
- Design at 360 px width first, then scale up.
- Big inputs: tap targets at least 44 by 44 px, 16 px minimum input text (prevents iOS zoom), correct inputmode (decimal, numeric).
- One column on phones. Primary action reachable by thumb. No hover-only features.
- Pieces entered as rows (length, width, quantity) with add, duplicate and delete. Keep entered data when the user edits.
- Units: metric and imperial toggle, remembered per device. First visit default from the browser locale (en-US, en-LR, en-MM use imperial; others metric). Fractions allowed for inches.
- Readability: text and controls sized for adults aged 30 to 60 in daylight (see DESIGN.md and the accessibility skill). Never shrink text to fit more on screen; scroll instead.

## Interaction laws that apply here (lawsofux.com)
- Fitts: large targets. Hick: few choices, advanced options collapsed. Jakob: standard patterns, no clever controls. Doherty: results in under 400 ms, otherwise show progress. Miller: group inputs into small sets.

## States every screen must handle
- Empty (helpful example with "Try sample"), loading, success, partial (some pieces unplaced), error (plain-language message saying how to fix it), offline.
- Error text names the field and the fix: "Piece 3 is longer than any stock length (2400 mm)."

## Visual output
- Diagrams are SVG, labelled with dimensions, one colour per piece group, printable in black and white (also use pattern or number labels, never colour alone).
- Cut order is numbered on the diagram.

## Copy
- Plain, direct, trade vocabulary (kerf, offcut, rip, crosscut). No marketing filler, no emoji, no exclamation marks.
- All visible strings go through a translation file, never hard-coded, so another language can be added later without a rewrite.

## Performance targets
- First useful paint under 2 s on a mid-range phone over 4G. No blocking third-party scripts. Total JavaScript for a tool page under about 100 KB gzipped where practical.
