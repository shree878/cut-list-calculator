---
name: product-scoping
description: Scope control for the cutting optimizer. Use when planning phases, writing or editing plan.txt, deciding whether a feature belongs in the MVP, or when a request risks turning four trades into four half-finished tools.
---

# Product scoping (MVP and phases)

Goal: ship one finished, trustworthy tool at a time. Four half-finished tools is the main project risk.

## Phase order (fixed unless the owner changes it)
1. MVP: 1D cutting for pipes, bars and lumber.
2. Phase 2: 2D plywood with kerf, grain and guillotine cuts (largest audience, hardest algorithm; reuses MVP parsing, units, UI rows).
3. Phase 3: tile calculator (simple maths, large search demand).
4. Phase 4: fabric yardage (nap and pattern rules).
5. Later: Guides/blog content, paid extras (saved projects, bulk export, branded quotes), more languages (English only until then).

## Rules
- Only the current phase gets built. Later-phase ideas go to the Parking Lot section of plan.txt, never into code.
- A phase is done only when every item in its Definition of Done is checked: algorithm tests pass, mobile layout verified, accessibility checklist passed, SEO page live, "Verify before cutting" note present, deployed to GitHub Pages.
- Each task is small enough to finish and verify in one agent session. If a task needs more, split it.
- Order work in layers, never skipping down the stack:
  1. Foundations (repo, tooling, design tokens, layout shell)
  2. Core logic (pure algorithm modules plus tests)
  3. UI for one tool (inputs, results, diagram)
  4. Output (print, PDF, share link)
  5. Quality (accessibility, performance, offline)
  6. Discovery (SEO pages, metadata)
  7. Launch (deploy, smoke test)
- Validate early: after the MVP works, show it to 5 to 10 real carpenters or tailors and record the feedback in plan.txt before starting the next phase.

## Writing plan.txt
- Plain text, numbered phases and tasks, each task with an ID (for example P1-T03), a one-line goal, inputs, outputs and an acceptance check.
- Include: goals and non-goals, phase list, task list per phase, Definition of Done per phase, risks, parking lot, open questions.
- No code in plan.txt. It says what and why, not how to type it.
- When scope changes, edit plan.txt first, then work.

## Page-shape rule (applies to every phase)
Every tool page is tool first and short. Long explanations go to Help, About and Guides. If a task adds text above the tool or makes a tool page long, it breaks this rule.

## Anti-scope-creep checks
Before adding anything, ask: Which phase is this? Does it block the current phase's Definition of Done? If not, park it.
