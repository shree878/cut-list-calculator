# AGENTS.md  -  Cut List Calculator

Free, no-login, browser-only cutting calculators (linear, sheet, tile, fabric) as a static
Astro site on GitHub Pages. Tool-first short pages, very readable for adults 30 to 60,
dark mode, offline-capable, professional look. All maths runs in the browser.

## SESSION START (do exactly this, nothing more)
0. The owner's first message names the active model (OPUS or SONNET). Remember it.
1. Read progress.txt.
2. Run `git status` and `git log -5 --oneline`. If they disagree with progress.txt, trust git for code, then fix progress.txt.
3. Run `npm test` once (skip if no tests exist yet).
4. Read ONLY the plan.txt section for the current task, and the 1 or 2 skills it needs.
5. MODEL CHECK: find the current task's tag ([OPUS] or [SONNET]) in plan.txt. If it differs from the active model, do NOT start it: set NEXT MODEL in progress.txt, commit, and reply only "Switch to <model>, then send the start prompt." Never switch models silently or continue on the wrong model.
6. Do the NEXT ACTION. Do not re-plan, re-explore the repo, or redo finished work.
Start prompt the owner will type: "Model: <OPUS or SONNET>. Follow AGENTS.md session start, then do NEXT ACTION in progress.txt."

## SESSION END / EVERY CHECKPOINT
After each task or working sub-step: run `npm test` and `npm run build`; rewrite progress.txt
(keep under 80 lines, rewrite do not append); set a concrete NEXT ACTION; then
`git commit -m "<task ID>: <summary>"`. Before any large step, write NEXT ACTION first.
After committing, look at the NEXT task's tag. If its model differs from the active one, set NEXT MODEL in progress.txt and tell the owner clearly to switch before you stop.
Never leave the tree broken at a checkpoint; if a task is partial, say exactly what is left under IN PROGRESS.

## Stack and commands
Astro (static) + TypeScript strict + plain CSS tokens + Vitest. Node LTS.
`npm install` | `npm run dev` | `npm test` | `npm run build` | `npm run preview`

## Folder map (keep in sync; add one line when you add a file or folder)
- AGENTS.md, plan.txt, progress.txt, DESIGN.md   project control files (root)
- .agent/skills/*/SKILL.md                        rules per topic (see list below)
- src/pages/                                      one .astro file per URL
- src/layouts/                                    BaseLayout, ToolLayout
- src/components/                                 only components listed in DESIGN.md
- src/algorithms/                                 pure TypeScript, no DOM
- src/algorithms/linear1d-results.ts              display-ready results model + plain-text cut list
- src/lib/                                        units, parsing, share link, i18n, base path
- src/i18n/en.json                                all visible strings
- src/styles/tokens.css, base.css                 design tokens and element defaults
- tests/algorithms/, tests/fixtures/              tests
- public/                                         manifest, icons, robots, service worker source
- src/i18n/en.json                                all visible strings (flat key: value)
- .github/workflows/deploy.yml                    test, build, deploy
- public/favicon.svg                              brand mark favicon (SVG)
- public/404.html                                 fallback 404 page

## Hard rules
- Work only on the current phase and task in plan.txt. New ideas go to the Parking Lot in plan.txt, not into code. Scope change = edit plan.txt first and tell the owner.
- Before any UI work read DESIGN.md and tokens.css. Use tokens and listed components only. No inline styles, no hard-coded colours, sizes or spacing.
- Every tool page is TOOL FIRST and SHORT: tool in the first screen, no intro block above it, "i How to use" button jumping to #how-to, long text only in Help/About/Guides.
- Readability standard: body 18 px, inputs 20 px, nothing under 14 px, text contrast 7:1 in light and dark, tap targets 48 px.
- All visible strings come from src/i18n/en.json. English only for now.
- Algorithm modules are pure and deterministic. Tests must pass before any commit that touches them. Never promise "zero waste"; always show "Verify before cutting".
- No new dependency without a one-line reason in progress.txt. Keep the site static: no backend, no login, no third-party scripts, no trackers.
- Never commit secrets. Respect the base path everywhere (see github-pages-deploy skill).
- Low-spec laptop (4 GB RAM): avoid heavy tools and watchers; Lighthouse runs in GitHub Actions.
- If unsure or blocked, write the question under KNOWN ISSUES / BLOCKERS in progress.txt and stop.
- Do not read whole directories or large files to "get oriented". Use progress.txt and the folder map.

## Skills (open only the ones the current task needs)
product-scoping | agent-instructions-and-handoff | design-system-tokens | ux-information-architecture |
accessibility | cutting-stock-packing | algorithm-testing | astro-static-site | github-pages-deploy |
pwa-offline | seo-tool-sites
