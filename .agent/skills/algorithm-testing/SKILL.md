---
name: algorithm-testing
description: Test strategy for the cutting and packing algorithms using Vitest, known examples and invariant checks. Use when writing, changing or reviewing algorithm code, and before any release.
---

# Testing the algorithms

Reference: https://vitest.dev

## Principle
A wrong layout costs real money. No algorithm change is done until tests pass. Tests must run in CI before every deploy.

## Setup
- Vitest for unit tests. Algorithm modules are pure TypeScript or JavaScript with no DOM, so tests run fast in Node.
- Layout: `src/algorithms/*.js` with `tests/algorithms/*.test.js`, fixtures in `tests/fixtures/`.
- Commands: `npm test` runs once, `npm run test:watch` for development.

## Three kinds of tests
1. Known-answer tests: hand-solved examples with exact expected output. Examples: 2400 mm bar, pieces 1000, 800, 600 with 3 mm kerf. A set that fits exactly. A set with an obvious two-bar answer.
2. Invariant tests (hold for every input):
   - No two pieces overlap.
   - Every piece lies fully inside its stock.
   - Every input piece is placed or listed as unplaced, with counts matching.
   - Used length plus kerf plus waste equals stock length (1D). Area is conserved (2D).
   - Grain-locked pieces are never rotated.
   - 2D guillotine mode: the layout can be cut with edge-to-edge cuts only.
3. Property and fuzz tests: generate many random inputs with a seeded random generator, assert the invariants hold on all of them, and assert the result is never worse than a trivial one-piece-per-stock layout.

## Edge cases to always cover
Empty input, one piece, piece equal to stock, piece larger than stock, zero kerf, large kerf, quantity 1000, duplicate sizes, mixed stock lengths, limited stock, unit conversion round trips, inputs with fractions and decimals.

## Regression
- Every bug becomes a failing test first, then the fix.
- Store reference results for sample jobs. If a heuristic change alters results, the diff must be reviewed and explained in progress.txt.

## Quality gates
- Coverage target for algorithm modules: 90% lines.
- Also test input parsing and unit conversion.
- Manual cross-check: compare a few results with an independent tool or hand calculation before each phase release, and note it in plan.txt.
