---
name: accessibility
description: Accessibility checklist (WCAG 2.2 AA) for contrast, touch targets, keyboard use, forms and diagrams. Use when building or reviewing any page, component, form or SVG diagram, and before marking a phase done.
---

# Accessibility

Reference: https://www.w3.org/WAI/standards-guidelines/wcag/ (target: WCAG 2.2 level AA)

## Why it matters here
Main users are adults aged about 30 to 60, often outdoors or in a bright workshop, on a phone with dirty hands. Large text, strong contrast, big targets and a dark mode are core features, not extras. Clear contrast and keyboard support also make the site feel trustworthy.

## Checklist
Colour and contrast
- Project standard (stricter than WCAG AA): body and label text at least 7:1 against its background, in BOTH light and dark themes. Large text, UI borders, icons and focus rings at least 3:1 (we target 4.5:1 for input borders).
- Daylight rule: no light-grey text, no thin font weights below 400, no text on photos or gradients.
- Dark mode is required: follows the device setting by default, manual toggle in the header, choice remembered, no flash of the wrong theme on load. Every token pair is checked in both themes.
- Never use colour alone for meaning. Diagram pieces also carry numbers or patterns.

Touch and pointer
- Targets at least 48 by 48 CSS px (WCAG 2.2 minimum is 24 px, we exceed it). At least 8 px between adjacent targets.

Keyboard and focus
- Everything works by keyboard in a logical order. Visible focus ring on every interactive element, never removed without a replacement.
- Skip link to main content. No keyboard traps.

Structure
- One h1 per page, headings in order. Landmarks: header, nav, main, footer. Language attribute set on html (and switched per language).
- Links say where they go. Buttons say what they do.

Forms
- Every input has a visible label (not placeholder-only), unit shown, hint text linked with aria-describedby.
- Errors are text, linked to the field, announced (role="alert" or aria-live polite), and say how to fix. Do not clear user input on error.
- Correct type and inputmode on numeric fields. autocomplete off for dimensions.
- Text size: body 18 px, input text 20 px, nothing smaller than 14 px anywhere (14 px only for captions). Layout uses rem so the browser's font-size setting is respected.

Diagrams and results
- SVG has a title and a description. The same information exists as a table or ordered cut list.
- Results updates are announced politely via an aria-live region.

Motion and zoom
- Respect prefers-reduced-motion. Page works at 200% zoom and 320 px width with no horizontal scroll (except the diagram, which scrolls inside its frame).

## How to verify (no extra services required)
- Keyboard-only pass through each tool page.
- Contrast check of every token pair when tokens change.
- Browser dev tools accessibility tree and Lighthouse accessibility audit, target 95+.
- Record results in progress.txt under the task.
