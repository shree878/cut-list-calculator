/**
 * P1-T06: Seeded fuzz tests and edge cases for the linear cutting solver.
 *
 * Uses fixed seeds (via a simple mulberry32 PRNG) so every run is repeatable.
 * All tests run the REAL solver (solveLinear1DMultiStock), pipe through
 * toDisplayResult, and check the following invariants:
 *
 *   1. No overlap: per-bar usedLength + kerfTotal + waste = stockLength.
 *   2. Piece conservation: placed + unplaced = requested (by quantity).
 *   3. Per-bar length conserved (same as #1 — explicit in the checker).
 *   4. Stock quantity not exceeded.
 *   5. Never worse than the trivial one-piece-per-bar layout.
 *   6. DisplayResult summary totals are consistent with bars.
 */

import { describe, it, expect } from 'vitest';
import {
  solveLinear1DMultiStock,
  type LinearResult,
  type StockItem,
} from '../../src/algorithms/linear1d';
import { toDisplayResult, type DisplayResult } from '../../src/algorithms/linear1d-results';

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32) — deterministic across platforms
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Return a random integer in [min, max] (inclusive). */
function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

// ---------------------------------------------------------------------------
// Combined invariant checker (solver result + display result)
// ---------------------------------------------------------------------------

interface FuzzJob {
  stocks: StockItem[];
  pieces: Array<{ length: number; quantity: number }>;
  kerf: number;
  kerfAfterLast: boolean;
}

function checkAllInvariants(job: FuzzJob, result: LinearResult, display: DisplayResult) {
  const { stocks, pieces, kerf, kerfAfterLast } = job;

  // --- Solver-level invariants ---

  for (const bar of result.bars) {
    // 1. usedLength = Σ piece.length
    const sumPieces = bar.pieces.reduce((s, p) => s + p.length, 0);
    expect(sumPieces).toBe(bar.usedLength);

    // kerf total correct
    const n = bar.pieces.length;
    const kerfCount = kerfAfterLast ? n : Math.max(0, n - 1);
    expect(bar.kerfTotal).toBe(kerfCount * kerf);

    // 3. length conservation
    expect(bar.usedLength + bar.kerfTotal + bar.waste).toBe(bar.stockLength);

    // non-negative waste
    expect(bar.waste).toBeGreaterThanOrEqual(0);

    // no piece longer than its bar
    for (const piece of bar.pieces) {
      expect(piece.length).toBeLessThanOrEqual(bar.stockLength);
    }
  }

  // 2. piece conservation
  const totalInput = pieces.reduce((s, p) => s + p.quantity, 0);
  const totalPlaced = result.bars.reduce((s, b) => s + b.pieces.length, 0);
  expect(totalPlaced + result.unplaced.length).toBe(totalInput);

  // aggregate totals
  expect(result.totalStockUsed).toBe(result.bars.length);
  const sumWaste = result.bars.reduce((s, b) => s + b.waste, 0);
  expect(result.totalWaste).toBe(sumWaste);

  // 4. stock quantity constraint
  const mergedQty = new Map<number, number>();
  for (const stock of stocks) {
    const prev = mergedQty.get(stock.length) ?? 0;
    mergedQty.set(stock.length, prev + stock.quantity);
  }
  const usedCounts = new Map<number, number>();
  for (const bar of result.bars) {
    usedCounts.set(bar.stockLength, (usedCounts.get(bar.stockLength) ?? 0) + 1);
  }
  for (const [len, qty] of mergedQty) {
    const used = usedCounts.get(len) ?? 0;
    expect(used).toBeLessThanOrEqual(qty);
  }

  // 5. never worse than trivial (one piece per bar)
  //    Count how many pieces can actually fit on at least one stock bar.
  const maxStockLen = Math.max(...stocks.filter(s => s.quantity > 0).map(s => s.length), 0);
  let fittable = 0;
  for (const p of pieces) {
    const freshCost = kerfAfterLast ? p.length + kerf : p.length;
    if (freshCost <= maxStockLen) {
      fittable += p.quantity;
    }
  }
  // The solver should use at most as many bars as there are fittable pieces
  // (the trivial solution). It may also have unplaced pieces.
  expect(result.totalStockUsed).toBeLessThanOrEqual(fittable);

  // --- Display-level invariants ---

  // Summary consistency
  expect(display.summary.totalBars).toBe(display.bars.length);
  const dTotalStock = display.bars.reduce((s, b) => s + b.stockLength, 0);
  expect(display.summary.totalStockMaterial).toBe(dTotalStock);
  const dTotalUsed = display.bars.reduce((s, b) => s + b.usedLength, 0);
  expect(display.summary.totalUsedMaterial).toBe(dTotalUsed);
  const dTotalKerf = display.bars.reduce((s, b) => s + b.kerfTotal, 0);
  expect(display.summary.totalKerf).toBe(dTotalKerf);
  const dTotalWaste = display.bars.reduce((s, b) => s + b.waste, 0);
  expect(display.summary.totalWaste).toBe(dTotalWaste);
  expect(display.summary.totalStockMaterial).toBe(
    display.summary.totalUsedMaterial + display.summary.totalKerf + display.summary.totalWaste,
  );

  // per-bar conservation on DisplayResult
  for (const bar of display.bars) {
    const dSumPieces = bar.cuts.reduce((s, c) => s + c.pieceLength, 0);
    expect(dSumPieces).toBe(bar.usedLength);
    expect(bar.usedLength + bar.kerfTotal + bar.waste).toBe(bar.stockLength);
    expect(bar.pieceCount).toBe(bar.cuts.length);
    expect(bar.waste).toBeGreaterThanOrEqual(0);
  }

  // piece conservation on display
  const dPlaced = display.bars.reduce((s, b) => s + b.pieceCount, 0);
  expect(dPlaced + display.unplaced.length).toBe(totalInput);
}

// ---------------------------------------------------------------------------
// Random job generator
// ---------------------------------------------------------------------------

function generateJob(rng: () => number): FuzzJob {
  // 1–3 stock lengths
  const numStocks = randInt(rng, 1, 3);
  const stocks: StockItem[] = [];
  for (let i = 0; i < numStocks; i++) {
    const length = randInt(rng, 500, 50000);
    const isUnlimited = rng() < 0.4;
    const quantity = isUnlimited ? Infinity : randInt(rng, 1, 20);
    stocks.push({ length, quantity });
  }

  // 1–8 piece types, 1–20 qty each
  const numPieceTypes = randInt(rng, 1, 8);
  const pieces: Array<{ length: number; quantity: number }> = [];
  for (let i = 0; i < numPieceTypes; i++) {
    const length = randInt(rng, 10, 40000);
    const quantity = randInt(rng, 1, 20);
    pieces.push({ length, quantity });
  }

  const kerf = rng() < 0.3 ? 0 : randInt(rng, 1, 500);
  const kerfAfterLast = rng() < 0.3;

  return { stocks, pieces, kerf, kerfAfterLast };
}

// ---------------------------------------------------------------------------
// Fuzz tests — 50 jobs per seed, 4 seeds = 200 fuzz cases
// ---------------------------------------------------------------------------

describe('fuzz: seeded random jobs → solver + display invariants', () => {
  const seeds = [42, 1337, 2024, 98765];
  const jobsPerSeed = 50;

  for (const seed of seeds) {
    describe(`seed ${seed}`, () => {
      const rng = mulberry32(seed);
      for (let j = 0; j < jobsPerSeed; j++) {
        const job = generateJob(rng);
        it(`job ${j}`, () => {
          const result = solveLinear1DMultiStock(
            job.stocks,
            job.pieces,
            job.kerf,
            job.kerfAfterLast,
          );
          const display = toDisplayResult(result);
          checkAllInvariants(job, result, display);
        });
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Edge-case tests
// ---------------------------------------------------------------------------

describe('edge cases: empty pieces', () => {
  it('empty pieces array → 0 bars, 0 unplaced', () => {
    const stocks: StockItem[] = [{ length: 10000, quantity: Infinity }];
    const result = solveLinear1DMultiStock(stocks, [], 30);
    const display = toDisplayResult(result);

    expect(result.totalStockUsed).toBe(0);
    expect(result.bars).toHaveLength(0);
    expect(result.unplaced).toHaveLength(0);
    expect(display.summary.totalBars).toBe(0);
    expect(display.summary.wastePercent).toBe(0);
  });
});

describe('edge cases: single piece', () => {
  it('one piece exactly fills stock', () => {
    const stocks: StockItem[] = [{ length: 5000, quantity: Infinity }];
    const pieces = [{ length: 5000, quantity: 1 }];
    const result = solveLinear1DMultiStock(stocks, pieces, 0);
    const display = toDisplayResult(result);

    expect(result.totalStockUsed).toBe(1);
    expect(result.bars[0].waste).toBe(0);
    checkAllInvariants({ stocks, pieces, kerf: 0, kerfAfterLast: false }, result, display);
  });

  it('one piece with large kerf, kerfAfterLast=false → fits', () => {
    const stocks: StockItem[] = [{ length: 5000, quantity: Infinity }];
    const pieces = [{ length: 5000, quantity: 1 }];
    const result = solveLinear1DMultiStock(stocks, pieces, 9999, false);
    const display = toDisplayResult(result);

    // freshCost = 5000 (kerfAfterLast=false, single piece → 0 kerf). Fits.
    expect(result.totalStockUsed).toBe(1);
    expect(result.bars[0].waste).toBe(0);
    checkAllInvariants({ stocks, pieces, kerf: 9999, kerfAfterLast: false }, result, display);
  });
});

describe('edge cases: kerf larger than every piece', () => {
  it('kerf bigger than every piece → pieces still place (kerf only between pieces)', () => {
    // Pieces: [100, 200, 50], kerf=500, stock=10000, kerfAfterLast=false.
    // Each piece places alone on fresh bar (no kerf before first piece).
    // No second piece can be added because kerf+piece > remaining.
    const stocks: StockItem[] = [{ length: 10000, quantity: Infinity }];
    const pieces = [
      { length: 100, quantity: 1 },
      { length: 200, quantity: 1 },
      { length: 50, quantity: 1 },
    ];
    const result = solveLinear1DMultiStock(stocks, pieces, 500, false);
    const display = toDisplayResult(result);

    // 3 pieces, each on its own bar (kerf+next_piece > remaining after first placement).
    // Actually, let's check: bar 0 has piece 200 (largest sorted first). rem = 10000 - 200 = 9800.
    // Add piece 100: cost = 500 + 100 = 600 ≤ 9800. Fits! rem = 9800 - 600 = 9200.
    // Add piece 50: cost = 500 + 50 = 550 ≤ 9200. Fits! rem = 8650.
    // So actually all 3 may fit on 1 bar. That's fine — the invariants still hold.
    expect(result.unplaced).toHaveLength(0);
    checkAllInvariants({ stocks, pieces, kerf: 500, kerfAfterLast: false }, result, display);
  });

  it('kerf so large that second piece never fits → one piece per bar', () => {
    // Pieces: [4000 ×3], kerf=7000, stock=10000, kerfAfterLast=false.
    // Fresh: 4000 ≤ 10000, rem=6000. Add second: 7000+4000=11000 > 6000. → 1 per bar.
    const stocks: StockItem[] = [{ length: 10000, quantity: Infinity }];
    const pieces = [{ length: 4000, quantity: 3 }];
    const result = solveLinear1DMultiStock(stocks, pieces, 7000, false);
    const display = toDisplayResult(result);

    expect(result.totalStockUsed).toBe(3);
    for (const bar of result.bars) {
      expect(bar.pieces).toHaveLength(1);
    }
    checkAllInvariants({ stocks, pieces, kerf: 7000, kerfAfterLast: false }, result, display);
  });

  it('kerfAfterLast=true with huge kerf → pieces unplaced if kerf+piece > stock', () => {
    // Pieces: [5000 ×2], kerf=6000, stock=10000, kerfAfterLast=true.
    // freshCost = 5000 + 6000 = 11000 > 10000 → all unplaced.
    const stocks: StockItem[] = [{ length: 10000, quantity: Infinity }];
    const pieces = [{ length: 5000, quantity: 2 }];
    const result = solveLinear1DMultiStock(stocks, pieces, 6000, true);
    const display = toDisplayResult(result);

    expect(result.totalStockUsed).toBe(0);
    expect(result.unplaced).toHaveLength(2);
    checkAllInvariants({ stocks, pieces, kerf: 6000, kerfAfterLast: true }, result, display);
  });
});

describe('edge cases: quantity 500 (max)', () => {
  it('500 small identical pieces', () => {
    const stocks: StockItem[] = [{ length: 10000, quantity: Infinity }];
    const pieces = [{ length: 100, quantity: 500 }];
    const result = solveLinear1DMultiStock(stocks, pieces, 0);
    const display = toDisplayResult(result);

    // 500 × 100 = 50000. Each bar holds 10000/100 = 100 pieces. → 5 bars.
    expect(result.totalStockUsed).toBe(5);
    expect(result.unplaced).toHaveLength(0);
    expect(result.totalWaste).toBe(0);
    checkAllInvariants({ stocks, pieces, kerf: 0, kerfAfterLast: false }, result, display);
  });

  it('500 pieces with kerf', () => {
    const stocks: StockItem[] = [{ length: 10000, quantity: Infinity }];
    // Each piece = 100, kerf = 10. On a bar: n pieces cost 100n + 10(n-1) = 110n - 10.
    // 110n - 10 ≤ 10000 → n ≤ 91.0 → 91 pieces/bar.
    // 500 / 91 = 5 full bars + 45 leftover → 6 bars.
    const pieces = [{ length: 100, quantity: 500 }];
    const result = solveLinear1DMultiStock(stocks, pieces, 10, false);
    const display = toDisplayResult(result);

    expect(result.unplaced).toHaveLength(0);
    checkAllInvariants({ stocks, pieces, kerf: 10, kerfAfterLast: false }, result, display);
  });

  it('500 pieces split across multiple piece types', () => {
    const stocks: StockItem[] = [{ length: 20000, quantity: Infinity }];
    const pieces = [
      { length: 500, quantity: 200 },
      { length: 300, quantity: 150 },
      { length: 100, quantity: 150 },
    ];
    // Total pieces = 200 + 150 + 150 = 500
    const result = solveLinear1DMultiStock(stocks, pieces, 5);
    const display = toDisplayResult(result);

    const totalExpanded = pieces.reduce((s, p) => s + p.quantity, 0);
    expect(totalExpanded).toBe(500);
    expect(result.unplaced).toHaveLength(0);
    checkAllInvariants({ stocks, pieces, kerf: 5, kerfAfterLast: false }, result, display);
  });
});

describe('edge cases: stock list with duplicates', () => {
  it('duplicate stock entries get merged correctly', () => {
    // 3 entries of 5000 × 1 → effectively 5000 × 3.
    const stocks: StockItem[] = [
      { length: 5000, quantity: 1 },
      { length: 5000, quantity: 1 },
      { length: 5000, quantity: 1 },
    ];
    const pieces = [{ length: 4000, quantity: 3 }];
    const result = solveLinear1DMultiStock(stocks, pieces, 0);
    const display = toDisplayResult(result);

    expect(result.totalStockUsed).toBe(3);
    expect(result.unplaced).toHaveLength(0);
    for (const bar of result.bars) {
      expect(bar.stockLength).toBe(5000);
    }
    checkAllInvariants({ stocks, pieces, kerf: 0, kerfAfterLast: false }, result, display);
  });

  it('duplicate stocks with different quantities merge', () => {
    // 5000 × 2 + 5000 × Infinity → Infinity
    const stocks: StockItem[] = [
      { length: 5000, quantity: 2 },
      { length: 5000, quantity: Infinity },
    ];
    const pieces = [{ length: 4000, quantity: 10 }];
    const result = solveLinear1DMultiStock(stocks, pieces, 0);
    const display = toDisplayResult(result);

    expect(result.totalStockUsed).toBe(10); // 1 per bar (4000+4000=8000>5000)
    expect(result.unplaced).toHaveLength(0);
    checkAllInvariants({ stocks, pieces, kerf: 0, kerfAfterLast: false }, result, display);
  });

  it('mixed lengths with duplicates', () => {
    // 5000 ×1, 8000 ×1, 5000 ×1 → merged: 5000 ×2, 8000 ×1
    const stocks: StockItem[] = [
      { length: 5000, quantity: 1 },
      { length: 8000, quantity: 1 },
      { length: 5000, quantity: 1 },
    ];
    const pieces = [
      { length: 4000, quantity: 2 },
      { length: 7000, quantity: 1 },
    ];
    const result = solveLinear1DMultiStock(stocks, pieces, 0);
    const display = toDisplayResult(result);

    expect(result.unplaced).toHaveLength(0);
    checkAllInvariants({ stocks, pieces, kerf: 0, kerfAfterLast: false }, result, display);
  });
});

describe('edge cases: stress & boundary', () => {
  it('piece length = 1 (minimum)', () => {
    const stocks: StockItem[] = [{ length: 100, quantity: Infinity }];
    const pieces = [{ length: 1, quantity: 50 }];
    const result = solveLinear1DMultiStock(stocks, pieces, 0);
    const display = toDisplayResult(result);

    expect(result.totalStockUsed).toBe(1); // 50 × 1 = 50 ≤ 100
    expect(result.unplaced).toHaveLength(0);
    checkAllInvariants({ stocks, pieces, kerf: 0, kerfAfterLast: false }, result, display);
  });

  it('stock quantity = 1 everywhere, more pieces than bars', () => {
    const stocks: StockItem[] = [
      { length: 1000, quantity: 1 },
      { length: 2000, quantity: 1 },
    ];
    const pieces = [{ length: 500, quantity: 10 }];
    const result = solveLinear1DMultiStock(stocks, pieces, 0);
    const display = toDisplayResult(result);

    // Bar 1000 holds 2 pieces (500+500=1000). Bar 2000 holds 4 pieces (500×4=2000).
    // Total placed = 2+4 = 6. Unplaced = 4.
    expect(result.totalStockUsed).toBe(2);
    expect(result.unplaced).toHaveLength(4);
    checkAllInvariants({ stocks, pieces, kerf: 0, kerfAfterLast: false }, result, display);
  });

  it('all pieces identical to stock length', () => {
    const stocks: StockItem[] = [{ length: 5000, quantity: Infinity }];
    const pieces = [{ length: 5000, quantity: 10 }];
    const result = solveLinear1DMultiStock(stocks, pieces, 0);
    const display = toDisplayResult(result);

    expect(result.totalStockUsed).toBe(10);
    for (const bar of result.bars) {
      expect(bar.pieces).toHaveLength(1);
      expect(bar.waste).toBe(0);
    }
    checkAllInvariants({ stocks, pieces, kerf: 0, kerfAfterLast: false }, result, display);
  });

  it('kerf = 1, pieces that just barely fit two per bar', () => {
    // stock=1001, kerf=1, 2 × 500. Cost = 500 + 1 + 500 = 1001. Fits exactly.
    const stocks: StockItem[] = [{ length: 1001, quantity: Infinity }];
    const pieces = [{ length: 500, quantity: 2 }];
    const result = solveLinear1DMultiStock(stocks, pieces, 1, false);
    const display = toDisplayResult(result);

    expect(result.totalStockUsed).toBe(1);
    expect(result.bars[0].pieces).toHaveLength(2);
    expect(result.bars[0].waste).toBe(0);
    checkAllInvariants({ stocks, pieces, kerf: 1, kerfAfterLast: false }, result, display);
  });
});
