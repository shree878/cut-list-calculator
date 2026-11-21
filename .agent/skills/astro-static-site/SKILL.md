---
name: astro-static-site
description: Conventions for the Astro static site (folders, layouts, components, calculator code, base path, build). Use when creating pages or components, wiring a tool page, adding scripts, or changing the project structure.
---

# Astro static site conventions

Reference: https://docs.astro.build

## Rules
- Astro in static mode. One `.astro` page per URL in `src/pages/`. No client-side routing, no SPA.
- Content renders as plain HTML at build time. JavaScript is added only where a tool needs it (the calculator), loaded as a small script on that page. Avoid UI framework runtimes (React, Vue) unless the plan says so; plain TypeScript modules plus Astro components keep pages light.
- Language: TypeScript, strict mode.

## Folder map (keep in sync with AGENTS.md)
- `src/layouts/BaseLayout.astro`: html shell, head tags (title, meta, canonical, JSON-LD slot), theme script, header, footer.
- `src/layouts/ToolLayout.astro`: the fixed tool-page order from the ux-information-architecture skill (slots: inputs, results, how-to, limits, faq, related).
- `src/components/`: one file per component listed in DESIGN.md. No component exists outside DESIGN.md.
- `src/algorithms/`: pure TypeScript, no DOM. Tests in `tests/algorithms/`.
- `src/lib/`: units, parsing, share-link encode/decode, i18n helper, base-path helper.
- `src/i18n/en.json`: all visible strings.
- `src/styles/tokens.css`, `src/styles/base.css`: tokens and element defaults. Component styles live in the component file and use tokens only.
- `public/`: manifest, icons, `robots.txt`, service worker source.

## Commands
`npm install`, `npm run dev`, `npm test`, `npm run build`, `npm run preview`.

## Low-spec laptop habits
- Keep dependencies few. Do not add a dependency without a note in progress.txt.
- Run `npm test` and `npm run build` before each checkpoint; skip long watchers.
