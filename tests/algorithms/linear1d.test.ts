import { describe, it, expect } from 'vitest';
import {
  solveLinear1D,
  solveLinear1DMultiStock,
  type LinearResult,
  type StockItem,
} from '../../src/algorithms/linear1d';

// ---------------------------------------------------------------------------
// Invariant checker — reused across tests
// ---------------------------------------------------------------------------

function checkInvariants(
  result: LinearResult,
  inputPieces: ReadonlyArray<{ length: number; quantity: number }>,
  kerf: number,
  kerfAfterLast: boolean,
) {
  for (const bar of result.bars) {
    // usedLength = sum of piece lengths
    const sumPieces = bar.pieces.reduce((s, p) => s + p.length, 0);
    expect(sumPieces).toBe(bar.usedLength);

    // kerf total correct
    const n = bar.pieces.length;
    const kerfCount = kerfAfterLast ? n : Math.max(0, n - 1);
    expect(bar.kerfTotal).toBe(kerfCount * kerf);

    // length conservation: used + kerf + waste = stock
    expect(bar.usedLength + bar.kerfTotal + bar.waste).toBe(bar.stockLength);

    // non-negative waste
    expect(bar.waste).toBeGreaterThanOrEqual(0);

    // no piece longer than stock
    for (const piece of bar.pieces) {
      expect(piece.length).toBeLessThanOrEqual(bar.stockLength);
    }
  }

  // piece conservation
  const totalInput = inputPieces.reduce((s, p) => s + p.quantity, 0);
  const totalPlaced = result.bars.reduce((s, b) => s + b.pieces.length, 0);
  expect(totalPlaced + result.unplaced.length).toBe(totalInput);

  // aggregate totals
  expect(result.totalStockUsed).toBe(result.bars.length);
  const sumWaste = result.bars.reduce((s, b) => s + b.waste, 0);
  expect(result.totalWaste).toBe(sumWaste);
}

// ---------------------------------------------------------------------------
// Known-answer tests (all expected values hand-verified)
// ---------------------------------------------------------------------------

describe('solveLinear1D — known-answer tests', () => {
  it('skill example: 2400mm bar, pieces 1000+800+600, 3mm kerf → 2 bars', () => {
    // Hand arithmetic (internal units = ×10, so 2400mm → 24000, 3mm kerf → 30):
    // Sorted desc: [10000, 8000, 6000]
    // Bar 0: fresh 10000, rem=24000−10000=14000. Add 8000: cost=30+8000=8030≤14000, rem=5970.
    //         Try 6000: cost=30+6000=6030 > 5970 → won't fit.
    //         used=18000, kerfCount=max(0,2−1)=1, kerfTotal=30, waste=24000−18000−30=5970
    // Bar 1: fresh 6000, rem=18000.
    //         used=6000, kerfCount=0, kerfTotal=0, waste=24000−6000−0=18000
    // totalWaste = 5970 + 18000 = 23970
    const r = solveLinear1D(
      24000,
      [{ length: 10000, quantity: 1 }, { length: 8000, quantity: 1 }, { length: 6000, quantity: 1 }],
      30,
    );
    checkInvariants(r, [{ length: 10000, quantity: 1 }, { length: 8000, quantity: 1 }, { length: 6000, quantity: 1 }], 30, false);

    expect(r.totalStockUsed).toBe(2);
    expect(r.bars[0].pieces.map((p) => p.length)).toEqual([10000, 8000]);
    expect(r.bars[0].usedLength).toBe(18000);
    expect(r.bars[0].kerfTotal).toBe(30);
    expect(r.bars[0].waste).toBe(5970);
    expect(r.bars[1].pieces.map((p) => p.length)).toEqual([6000]);
    expect(r.bars[1].waste).toBe(18000);
    expect(r.totalWaste).toBe(23970);
  });

  it('exact fit, zero kerf → 1 bar, 0 waste', () => {
    // Hand arithmetic: 5000+3000+2000=10000=stock, kerf=0 → 1 bar, waste=10000−10000−0=0
    const pieces = [{ length: 5000, quantity: 1 }, { length: 3000, quantity: 1 }, { length: 2000, quantity: 1 }];
    const r = solveLinear1D(10000, pieces, 0);
    checkInvariants(r, pieces, 0, false);

    expect(r.totalStockUsed).toBe(1);
    expect(r.bars[0].pieces.map((p) => p.length)).toEqual([5000, 3000, 2000]);
    expect(r.bars[0].waste).toBe(0);
  });

  it('exact fit with kerf → 1 bar, 0 waste', () => {
    // Hand arithmetic: 5000+30+3000+30+2000=10060=stock, kerfCount=max(0,3−1)=2, waste=10060−10000−60=0
    const pieces = [{ length: 5000, quantity: 1 }, { length: 3000, quantity: 1 }, { length: 2000, quantity: 1 }];
    const r = solveLinear1D(10060, pieces, 30);
    checkInvariants(r, pieces, 30, false);

    expect(r.totalStockUsed).toBe(1);
    expect(r.bars[0].waste).toBe(0);
  });

  it('kerfAfterLast=false: two 5000 pieces fit on 10030 bar', () => {
    // Hand arithmetic: fresh=5000, rem=10030−5000=5030. Add: 30+5000=5030≤5030, rem=0.
    // kerfCount=max(0,2−1)=1, kerfTotal=30, waste=10030−10000−30=0 → 1 bar, 0 waste
    const pieces = [{ length: 5000, quantity: 2 }];
    const r = solveLinear1D(10030, pieces, 30, false);
    checkInvariants(r, pieces, 30, false);

    expect(r.totalStockUsed).toBe(1);
    expect(r.bars[0].pieces).toHaveLength(2);
    expect(r.bars[0].waste).toBe(0);
  });

  it('kerfAfterLast=true: same pieces need 2 bars', () => {
    // Hand arithmetic: kerfAfterLast=true, kerf=30, stock=10030, 2×5000.
    // Bar 0 fresh: cost=5000+30=5030, rem=10030−5030=5000.
    //   Add 2nd: cost=30+5000=5030 > 5000 → won't fit.
    // Bar 1 fresh: cost=5030, rem=5000.
    // Each bar: used=5000, kerfCount=1(n=1, kerfAfterLast), kerfTotal=30,
    //           waste=10030−5000−30=5000.
    // totalWaste = 5000+5000 = 10000
    const pieces = [{ length: 5000, quantity: 2 }];
    const r = solveLinear1D(10030, pieces, 30, true);
    checkInvariants(r, pieces, 30, true);

    expect(r.totalStockUsed).toBe(2);
    expect(r.bars[0].pieces).toHaveLength(1);
    expect(r.bars[1].pieces).toHaveLength(1);
    expect(r.bars[0].waste).toBe(5000);
    expect(r.bars[1].waste).toBe(5000);
    expect(r.totalWaste).toBe(10000);
  });

  it('multiple identical pieces: 4 × 3000 on stock 10000', () => {
    // Hand arithmetic: kerf=0, 4×3000, stock=10000.
    // Bar 0: 3000+3000+3000=9000≤10000, rem=1000. 4th: 3000>1000 → bar 1.
    // Bar 0: used=9000, kerfTotal=0, waste=10000−9000=1000
    // Bar 1: used=3000, kerfTotal=0, waste=10000−3000=7000
    // totalWaste = 1000+7000 = 8000
    const pieces = [{ length: 3000, quantity: 4 }];
    const r = solveLinear1D(10000, pieces, 0);
    checkInvariants(r, pieces, 0, false);

    expect(r.totalStockUsed).toBe(2);
    expect(r.bars[0].pieces).toHaveLength(3);
    expect(r.bars[0].waste).toBe(1000);
    expect(r.bars[1].pieces).toHaveLength(1);
    expect(r.bars[1].waste).toBe(7000);
    expect(r.totalWaste).toBe(8000);
  });

  it('single piece → 1 bar', () => {
    // Hand arithmetic: 1×5000, stock=10000, kerf=0. waste=10000−5000=5000
    const pieces = [{ length: 5000, quantity: 1 }];
    const r = solveLinear1D(10000, pieces, 0);
    checkInvariants(r, pieces, 0, false);

    expect(r.totalStockUsed).toBe(1);
    expect(r.bars[0].pieces.map((p) => p.length)).toEqual([5000]);
    expect(r.bars[0].waste).toBe(5000);
  });

  it('piece exactly equals stock with kerf → 1 bar, 0 waste (kerfAfterLast off)', () => {
    // Hand arithmetic: 1×5000, stock=5000, kerf=30, kerfAfterLast=false.
    // Fresh cost = 5000 (no kerf on first). kerfCount = max(0,1−1) = 0.
    // waste = 5000 − 5000 − 0 = 0
    const pieces = [{ length: 5000, quantity: 1 }];
    const r = solveLinear1D(5000, pieces, 30, false);
    checkInvariants(r, pieces, 30, false);

    expect(r.totalStockUsed).toBe(1);
    expect(r.bars[0].waste).toBe(0);
  });

  it('large kerf eats into capacity', () => {
    // Hand arithmetic: stock=10000, kerf=1000, 3×3000.
    // Bar 0: fresh 3000, rem=7000. Add: 1000+3000=4000≤7000, rem=3000.
    //         Add: 1000+3000=4000 > 3000 → bar 1.
    //         used=6000, kerfCount=max(0,2−1)=1, kerfTotal=1000, waste=10000−6000−1000=3000
    // Bar 1: fresh 3000, rem=7000.
    //         used=3000, kerfCount=0, kerfTotal=0, waste=10000−3000−0=7000
    // totalWaste = 3000+7000 = 10000
    const pieces = [{ length: 3000, quantity: 3 }];
    const r = solveLinear1D(10000, pieces, 1000);
    checkInvariants(r, pieces, 1000, false);

    expect(r.totalStockUsed).toBe(2);
    expect(r.bars[0].pieces).toHaveLength(2);
    expect(r.bars[0].usedLength).toBe(6000);
    expect(r.bars[0].kerfTotal).toBe(1000);
    expect(r.bars[0].waste).toBe(3000);
    expect(r.bars[1].waste).toBe(7000);
    expect(r.totalWaste).toBe(10000);
  });
});

// ---------------------------------------------------------------------------
// Invariant tests (hold for every input)
// ---------------------------------------------------------------------------

describe('solveLinear1D — invariants', () => {
  const cases: Array<{
    label: string;
    stock: number;
    pieces: Array<{ length: number; quantity: number }>;
    kerf: number;
    kerfAfterLast: boolean;
  }> = [
    { label: 'small mixed', stock: 100, pieces: [{ length: 40, quantity: 3 }, { length: 25, quantity: 4 }], kerf: 2, kerfAfterLast: false },
    { label: 'large qty', stock: 10000, pieces: [{ length: 450, quantity: 20 }], kerf: 30, kerfAfterLast: false },
    { label: 'tight fit', stock: 1000, pieces: [{ length: 999, quantity: 1 }], kerf: 0, kerfAfterLast: false },
    { label: 'kerfAfterLast', stock: 1000, pieces: [{ length: 300, quantity: 5 }], kerf: 10, kerfAfterLast: true },
    { label: 'many sizes', stock: 5000, pieces: [
      { length: 1200, quantity: 2 },
      { length: 800, quantity: 3 },
      { length: 500, quantity: 4 },
      { length: 200, quantity: 5 },
    ], kerf: 15, kerfAfterLast: false },
    { label: 'duplicate lengths', stock: 1000, pieces: [{ length: 333, quantity: 6 }], kerf: 1, kerfAfterLast: false },
  ];

  for (const c of cases) {
    it(`invariants hold: ${c.label}`, () => {
      const r = solveLinear1D(c.stock, c.pieces, c.kerf, c.kerfAfterLast);
      checkInvariants(r, c.pieces, c.kerf, c.kerfAfterLast);
    });
  }

  it('never worse than trivial 1-piece-per-bar', () => {
    const stock = 10000;
    const pieces = [
      { length: 4000, quantity: 3 },
      { length: 3000, quantity: 2 },
      { length: 2000, quantity: 4 },
    ];
    const totalPieces = pieces.reduce((s, p) => s + p.quantity, 0);
    const r = solveLinear1D(stock, pieces, 30);
    // Must use no more bars than the trivial solution (1 per piece).
    expect(r.totalStockUsed).toBeLessThanOrEqual(totalPieces);
  });
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

describe('solveLinear1D — determinism', () => {
  it('same input produces identical output on repeated runs', () => {
    const stock = 10000;
    const pieces = [
      { length: 4500, quantity: 2 },
      { length: 3000, quantity: 3 },
      { length: 1500, quantity: 4 },
    ];
    const r1 = solveLinear1D(stock, pieces, 30, false);
    const r2 = solveLinear1D(stock, pieces, 30, false);

    expect(r1.totalStockUsed).toBe(r2.totalStockUsed);
    expect(r1.totalWaste).toBe(r2.totalWaste);
    expect(r1.bars.length).toBe(r2.bars.length);
    for (let i = 0; i < r1.bars.length; i++) {
      expect(r1.bars[i].pieces.map((p) => p.length)).toEqual(
        r2.bars[i].pieces.map((p) => p.length),
      );
      expect(r1.bars[i].waste).toBe(r2.bars[i].waste);
    }
    expect(r1.unplaced.length).toBe(r2.unplaced.length);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('solveLinear1D — edge cases', () => {
  it('piece larger than stock → unplaced', () => {
    const pieces = [{ length: 6000, quantity: 1 }, { length: 3000, quantity: 1 }];
    const r = solveLinear1D(5000, pieces, 0);
    checkInvariants(r, pieces, 0, false);

    expect(r.totalStockUsed).toBe(1);
    expect(r.bars[0].pieces.map((p) => p.length)).toEqual([3000]);
    expect(r.unplaced).toHaveLength(1);
    expect(r.unplaced[0].length).toBe(6000);
  });

  it('piece equals stock with kerfAfterLast=true → unplaced when kerf>0', () => {
    // freshCost = 5000 + 30 = 5030 > 5000
    const pieces = [{ length: 5000, quantity: 1 }];
    const r = solveLinear1D(5000, pieces, 30, true);
    checkInvariants(r, pieces, 30, true);

    expect(r.totalStockUsed).toBe(0);
    expect(r.unplaced).toHaveLength(1);
  });

  it('zero kerf with many pieces', () => {
    // 10 × 100 on stock 1000 → 1 bar, waste 0
    const pieces = [{ length: 100, quantity: 10 }];
    const r = solveLinear1D(1000, pieces, 0);
    checkInvariants(r, pieces, 0, false);

    expect(r.totalStockUsed).toBe(1);
    expect(r.bars[0].pieces).toHaveLength(10);
    expect(r.bars[0].waste).toBe(0);
  });

  it('pieces from multiple input rows', () => {
    const pieces = [
      { length: 500, quantity: 2 },
      { length: 500, quantity: 1 },
    ];
    const r = solveLinear1D(1000, pieces, 0);
    checkInvariants(r, pieces, 0, false);

    // 3 pieces of 500, stock 1000. Bar 0: [500,500], bar 1: [500].
    expect(r.totalStockUsed).toBe(2);
    expect(r.bars[0].pieces).toHaveLength(2);
  });

  it('no pieces → 0 bars', () => {
    const r = solveLinear1D(10000, [], 0);
    expect(r.totalStockUsed).toBe(0);
    expect(r.bars).toHaveLength(0);
    expect(r.unplaced).toHaveLength(0);
    expect(r.wastePercent).toBe(0);
  });

  it('pieces sorted descending within each bar', () => {
    const pieces = [
      { length: 200, quantity: 1 },
      { length: 400, quantity: 1 },
      { length: 300, quantity: 1 },
    ];
    const r = solveLinear1D(1000, pieces, 0);
    // All fit on 1 bar sorted desc: [400, 300, 200]
    expect(r.bars[0].pieces.map((p) => p.length)).toEqual([400, 300, 200]);
  });

  it('wastePercent is 0 when all bars have 0 waste', () => {
    // 2 × 5000 on stock 10000 with 0 kerf → 1 bar, 0 waste
    const r = solveLinear1D(10000, [{ length: 5000, quantity: 2 }], 0);
    expect(r.wastePercent).toBe(0);
  });

  it('kerf = 0 and kerfAfterLast = true behaves like kerfAfterLast = false', () => {
    const pieces = [{ length: 3000, quantity: 3 }];
    const r1 = solveLinear1D(10000, pieces, 0, false);
    const r2 = solveLinear1D(10000, pieces, 0, true);

    expect(r1.totalStockUsed).toBe(r2.totalStockUsed);
    expect(r1.totalWaste).toBe(r2.totalWaste);
    for (let i = 0; i < r1.bars.length; i++) {
      expect(r1.bars[i].pieces.map((p) => p.length)).toEqual(
        r2.bars[i].pieces.map((p) => p.length),
      );
    }
  });
});

// ===========================================================================
// Multi-stock invariant checker
// ===========================================================================

function checkMultiStockInvariants(
  result: LinearResult,
  stocks: ReadonlyArray<StockItem>,
  inputPieces: ReadonlyArray<{ length: number; quantity: number }>,
  kerf: number,
  kerfAfterLast: boolean,
) {
  for (const bar of result.bars) {
    // usedLength = sum of piece lengths
    const sumPieces = bar.pieces.reduce((s, p) => s + p.length, 0);
    expect(sumPieces).toBe(bar.usedLength);

    // kerf total correct
    const n = bar.pieces.length;
    const kerfCount = kerfAfterLast ? n : Math.max(0, n - 1);
    expect(bar.kerfTotal).toBe(kerfCount * kerf);

    // length conservation: used + kerf + waste = stock
    expect(bar.usedLength + bar.kerfTotal + bar.waste).toBe(bar.stockLength);

    // non-negative waste
    expect(bar.waste).toBeGreaterThanOrEqual(0);

    // bar must reference a valid stock length
    expect(stocks.some((s) => s.length === bar.stockLength)).toBe(true);

    // no piece longer than the bar's stock
    for (const piece of bar.pieces) {
      expect(piece.length).toBeLessThanOrEqual(bar.stockLength);
    }
  }

  // piece conservation
  const totalInput = inputPieces.reduce((s, p) => s + p.quantity, 0);
  const totalPlaced = result.bars.reduce((s, b) => s + b.pieces.length, 0);
  expect(totalPlaced + result.unplaced.length).toBe(totalInput);

  // aggregate totals
  expect(result.totalStockUsed).toBe(result.bars.length);
  const sumWaste = result.bars.reduce((s, b) => s + b.waste, 0);
  expect(result.totalWaste).toBe(sumWaste);

  // *** Stock quantity constraint: never use more bars of a given length
  //     than the stock allows. ***
  // Merge duplicate stock lengths (the algorithm does this internally).
  const mergedQty = new Map<number, number>();
  for (const stock of stocks) {
    mergedQty.set(stock.length, (mergedQty.get(stock.length) ?? 0) + stock.quantity);
  }
  const usedCounts = new Map<number, number>();
  for (const bar of result.bars) {
    usedCounts.set(bar.stockLength, (usedCounts.get(bar.stockLength) ?? 0) + 1);
  }
  for (const [len, qty] of mergedQty) {
    const used = usedCounts.get(len) ?? 0;
    expect(used).toBeLessThanOrEqual(qty);
  }
}

// ===========================================================================
// P1-T04: solveLinear1DMultiStock — known-answer tests
// ===========================================================================

describe('solveLinear1DMultiStock — multi-stock known-answer tests', () => {
  it('two stock lengths: picks shorter stock when it fits', () => {
    // Stocks: 6000 (unlimited), 10000 (unlimited).  Piece: 5000, kerf=0.
    // Shortest stock >= 5000 is 6000. → 1 bar from 6000.
    // waste = 6000 − 5000 = 1000
    const stocks: StockItem[] = [
      { length: 6000, quantity: Infinity },
      { length: 10000, quantity: Infinity },
    ];
    const pieces = [{ length: 5000, quantity: 1 }];
    const r = solveLinear1DMultiStock(stocks, pieces, 0);
    checkMultiStockInvariants(r, stocks, pieces, 0, false);

    expect(r.totalStockUsed).toBe(1);
    expect(r.bars[0].stockLength).toBe(6000);
    // waste = 6000 − 5000 = 1000
    expect(r.bars[0].waste).toBe(1000);
  });

  it('piece too large for short stock, fits on long stock', () => {
    // Stocks: 4000 (unlimited), 8000 (unlimited).  Piece: 5000, kerf=0.
    // 5000 > 4000, so it must use the 8000 stock. → 1 bar from 8000.
    // waste = 8000 − 5000 = 3000
    const stocks: StockItem[] = [
      { length: 4000, quantity: Infinity },
      { length: 8000, quantity: Infinity },
    ];
    const pieces = [{ length: 5000, quantity: 1 }];
    const r = solveLinear1DMultiStock(stocks, pieces, 0);
    checkMultiStockInvariants(r, stocks, pieces, 0, false);

    expect(r.totalStockUsed).toBe(1);
    expect(r.bars[0].stockLength).toBe(8000);
    // waste = 8000 − 5000 = 3000
    expect(r.bars[0].waste).toBe(3000);
  });

  it('mixed stock lengths: 2 sizes used', () => {
    // Stocks: 5000 (unlimited), 10000 (unlimited).
    // Pieces: 4500 ×1, 3000 ×1, 2000 ×1, kerf=0.
    // Sorted desc: [4500, 3000, 2000]
    // Piece 4500: shortest stock >= 4500 is 5000. Bar 0 (5000): rem = 5000−4500 = 500.
    // Piece 3000: 3000 > 500, won't fit on bar 0. Shortest >= 3000 is 5000. Bar 1 (5000): rem = 5000−3000 = 2000.
    // Piece 2000: bar 0 rem=500, too small. Bar 1 rem=2000, addCost=0+2000=2000 ≤ 2000, fits!
    // Bar 1 final: [3000,2000], used=5000, kerfCount=max(0,2−1)=1, kerf=0, waste=5000−5000−0=0
    // Bar 0: [4500], used=4500, waste=5000−4500=500
    // totalWaste = 500 + 0 = 500
    const stocks: StockItem[] = [
      { length: 5000, quantity: Infinity },
      { length: 10000, quantity: Infinity },
    ];
    const pieces = [
      { length: 4500, quantity: 1 },
      { length: 3000, quantity: 1 },
      { length: 2000, quantity: 1 },
    ];
    const r = solveLinear1DMultiStock(stocks, pieces, 0);
    checkMultiStockInvariants(r, stocks, pieces, 0, false);

    expect(r.totalStockUsed).toBe(2);
    // Both bars should be from the 5000 stock (smaller is preferred).
    for (const bar of r.bars) {
      expect(bar.stockLength).toBe(5000);
    }
    // total waste = 500 (bar 0 has 500 leftover, bar 1 has 0)
    expect(r.totalWaste).toBe(500);
  });

  it('limited quantity: runs out of short stock, falls back to long', () => {
    // Stocks: 6000 × 1 (limited), 10000 (unlimited).
    // Pieces: 5000 ×2, kerf=0.
    // Sorted desc: [5000, 5000]
    // Piece 1: shortest >= 5000 is 6000 (qty 1 left). Bar 0 (6000): rem = 6000−5000 = 1000. qty→0.
    // Piece 2: won't fit on bar 0 (addCost=0+5000=5000 > 1000).
    //   Shortest stock with qty left >= 5000: 6000 is exhausted, so 10000. Bar 1 (10000): rem = 10000−5000 = 5000.
    // Bar 0: waste = 6000 − 5000 = 1000
    // Bar 1: waste = 10000 − 5000 = 5000
    // totalWaste = 1000 + 5000 = 6000
    const stocks: StockItem[] = [
      { length: 6000, quantity: 1 },
      { length: 10000, quantity: Infinity },
    ];
    const pieces = [{ length: 5000, quantity: 2 }];
    const r = solveLinear1DMultiStock(stocks, pieces, 0);
    checkMultiStockInvariants(r, stocks, pieces, 0, false);

    expect(r.totalStockUsed).toBe(2);
    expect(r.bars[0].stockLength).toBe(6000);
    // waste = 6000 − 5000 = 1000
    expect(r.bars[0].waste).toBe(1000);
    expect(r.bars[1].stockLength).toBe(10000);
    // waste = 10000 − 5000 = 5000
    expect(r.bars[1].waste).toBe(5000);
    expect(r.totalWaste).toBe(6000);
  });

  it('all stock exhausted: remaining pieces go to unplaced', () => {
    // Stocks: 10000 × 2 (limited).
    // Pieces: 5000 ×3, kerf=0.
    // Sorted desc: [5000, 5000, 5000]
    // Piece 1: 10000 (qty 2). Bar 0 (10000): rem = 10000−5000 = 5000. qty→1.
    // Piece 2: bar 0 rem=5000, addCost=0+5000=5000 ≤ 5000, fits! Bar 0: [5000,5000], rem=0.
    // Piece 3: bar 0 full. Need new bar. 10000 (qty 1 left). Bar 1 (10000): rem = 5000. qty→0.
    // But wait — 3 pieces of 5000, 2 fit on bar 0, 1 on bar 1. All placed.
    // Let me re-check: 3 pieces, 2 bars of 10000, each can hold 2 pieces of 5000.
    // Actually all 3 fit. Let me try with 5 pieces instead.
    // Actually the test name says "all stock exhausted". Let me use 3×8000 on 10000×2.
    // Sorted desc: [8000, 8000, 8000]
    // Piece 1: 10000 (qty 2). Bar 0 (10000): rem = 10000−8000 = 2000. qty→1.
    // Piece 2: bar 0 rem=2000, addCost=0+8000=8000 > 2000. New bar.
    //   10000 (qty 1 left). Bar 1 (10000): rem = 2000. qty→0.
    // Piece 3: bar 0 rem=2000, 8000>2000. Bar 1 rem=2000, 8000>2000. New bar.
    //   10000 qty=0. No stock left. → unplaced.
    // Result: 2 bars, 1 unplaced.
    // Bar 0: used=8000, waste=10000−8000=2000
    // Bar 1: used=8000, waste=10000−8000=2000
    // totalWaste = 2000+2000 = 4000
    const stocks: StockItem[] = [{ length: 10000, quantity: 2 }];
    const pieces = [{ length: 8000, quantity: 3 }];
    const r = solveLinear1DMultiStock(stocks, pieces, 0);
    checkMultiStockInvariants(r, stocks, pieces, 0, false);

    expect(r.totalStockUsed).toBe(2);
    expect(r.unplaced).toHaveLength(1);
    expect(r.unplaced[0].length).toBe(8000);
    // waste = 2000 + 2000 = 4000
    expect(r.bars[0].waste).toBe(2000);
    expect(r.bars[1].waste).toBe(2000);
    expect(r.totalWaste).toBe(4000);
  });

  it('offcuts as extra stock: short offcut used before opening new stock', () => {
    // Stocks: 10000 (unlimited), plus an offcut of 3500 × 1.
    // Pieces: 3000 ×1, 2000 ×1, kerf=0.
    // Sorted desc: [3000, 2000].  Stocks sorted asc: [3500, 10000].
    // Piece 3000: shortest stock >= 3000 is 3500 (qty 1). Bar 0 (3500): rem=3500−3000=500. qty→0.
    // Piece 2000: bar 0 rem=500, addCost=0+2000=2000>500. New bar.
    //   3500 exhausted. Next: 10000. Bar 1 (10000): rem=10000−2000=8000.
    // Bar 0: waste = 3500−3000 = 500
    // Bar 1: waste = 10000−2000 = 8000
    // totalWaste = 500+8000 = 8500
    const stocks: StockItem[] = [
      { length: 10000, quantity: Infinity },
      { length: 3500, quantity: 1 },
    ];
    const pieces = [
      { length: 3000, quantity: 1 },
      { length: 2000, quantity: 1 },
    ];
    const r = solveLinear1DMultiStock(stocks, pieces, 0);
    checkMultiStockInvariants(r, stocks, pieces, 0, false);

    expect(r.totalStockUsed).toBe(2);
    // The 3500 offcut should be used for the 3000 piece.
    expect(r.bars[0].stockLength).toBe(3500);
    // waste = 3500 − 3000 = 500
    expect(r.bars[0].waste).toBe(500);
    expect(r.bars[1].stockLength).toBe(10000);
    // waste = 10000 − 2000 = 8000
    expect(r.bars[1].waste).toBe(8000);
  });

  it('offcuts used efficiently: both pieces on one offcut when they fit', () => {
    // Stocks: 10000 (unlimited), offcut of 5500 × 1.
    // Pieces: 3000 ×1, 2000 ×1, kerf=0.
    // Sorted desc: [3000, 2000].  Stocks asc: [5500, 10000].
    // Piece 3000: shortest >= 3000 is 5500. Bar 0 (5500): rem=5500−3000=2500. qty→0.
    // Piece 2000: bar 0 rem=2500, addCost=0+2000=2000 ≤ 2500. Fits!
    //   Bar 0: [3000, 2000], used=5000, kerfCount=max(0,2−1)=1, kerf=0, waste=5500−5000=500.
    // 1 bar total. waste = 500.
    const stocks: StockItem[] = [
      { length: 10000, quantity: Infinity },
      { length: 5500, quantity: 1 },
    ];
    const pieces = [
      { length: 3000, quantity: 1 },
      { length: 2000, quantity: 1 },
    ];
    const r = solveLinear1DMultiStock(stocks, pieces, 0);
    checkMultiStockInvariants(r, stocks, pieces, 0, false);

    expect(r.totalStockUsed).toBe(1);
    expect(r.bars[0].stockLength).toBe(5500);
    expect(r.bars[0].pieces.map((p) => p.length)).toEqual([3000, 2000]);
    // waste = 5500 − 5000 = 500
    expect(r.bars[0].waste).toBe(500);
  });

  it('multi-stock with kerf: shortest stock that fits after kerf', () => {
    // Stocks: 5000 (unlimited), 8000 (unlimited). Kerf=100, kerfAfterLast=false.
    // Pieces: 4900 ×1, kerf=100.
    // freshCost (kerfAfterLast=false) = 4900. 4900 ≤ 5000, so shortest = 5000.
    // Bar 0 (5000): rem=5000−4900=100.
    // waste = 5000−4900−0 = 100 (kerfCount=max(0,1−1)=0)
    const stocks: StockItem[] = [
      { length: 5000, quantity: Infinity },
      { length: 8000, quantity: Infinity },
    ];
    const pieces = [{ length: 4900, quantity: 1 }];
    const r = solveLinear1DMultiStock(stocks, pieces, 100);
    checkMultiStockInvariants(r, stocks, pieces, 100, false);

    expect(r.totalStockUsed).toBe(1);
    expect(r.bars[0].stockLength).toBe(5000);
    // waste = 5000 − 4900 − 0 = 100
    expect(r.bars[0].waste).toBe(100);
  });

  it('multi-stock with kerf: kerfAfterLast forces longer stock', () => {
    // Stocks: 5000 (unlimited), 8000 (unlimited). Kerf=200, kerfAfterLast=true.
    // Pieces: 4900 ×1.
    // freshCost = 4900 + 200 = 5100. 5100 > 5000, so 5000 won't work.
    // Next: 8000. 5100 ≤ 8000. Bar 0 (8000): rem=8000−5100=2900.
    // kerfCount = 1 (n=1, kerfAfterLast=true), kerfTotal = 200.
    // waste = 8000 − 4900 − 200 = 2900
    const stocks: StockItem[] = [
      { length: 5000, quantity: Infinity },
      { length: 8000, quantity: Infinity },
    ];
    const pieces = [{ length: 4900, quantity: 1 }];
    const r = solveLinear1DMultiStock(stocks, pieces, 200, true);
    checkMultiStockInvariants(r, stocks, pieces, 200, true);

    expect(r.totalStockUsed).toBe(1);
    expect(r.bars[0].stockLength).toBe(8000);
    // waste = 8000 − 4900 − 200 = 2900
    expect(r.bars[0].waste).toBe(2900);
  });

  it('duplicate stock entries are merged', () => {
    // Two entries of length 5000 × 1 each should merge to 5000 × 2.
    // Pieces: 4000 ×2, kerf=0.
    // Sorted: [4000, 4000]. Merged stock: 5000 qty=2.
    // Piece 1: 5000 (qty 2). Bar 0 (5000): rem=1000. qty→1.
    // Piece 2: bar 0 rem=1000, addCost=4000>1000. New bar.
    //   5000 (qty 1). Bar 1 (5000): rem=1000. qty→0.
    // Bar 0: waste=5000−4000=1000. Bar 1: waste=5000−4000=1000.
    // totalWaste=2000. 2 bars, both from 5000.
    const stocks: StockItem[] = [
      { length: 5000, quantity: 1 },
      { length: 5000, quantity: 1 },
    ];
    const pieces = [{ length: 4000, quantity: 2 }];
    const r = solveLinear1DMultiStock(stocks, pieces, 0);
    checkMultiStockInvariants(r, stocks, pieces, 0, false);

    expect(r.totalStockUsed).toBe(2);
    expect(r.bars[0].stockLength).toBe(5000);
    expect(r.bars[1].stockLength).toBe(5000);
    // waste = 1000 + 1000 = 2000
    expect(r.totalWaste).toBe(2000);
  });

  it('no pieces → 0 bars (multi-stock)', () => {
    const stocks: StockItem[] = [{ length: 10000, quantity: 5 }];
    const r = solveLinear1DMultiStock(stocks, [], 0);
    expect(r.totalStockUsed).toBe(0);
    expect(r.bars).toHaveLength(0);
    expect(r.unplaced).toHaveLength(0);
  });

  it('piece too large for all stocks → unplaced', () => {
    // Stocks: 4000 (unlimited), 6000 ×2. Piece: 7000 ×1, kerf=0.
    // freshCost=7000. 7000>4000, 7000>6000. No stock fits. → unplaced.
    const stocks: StockItem[] = [
      { length: 4000, quantity: Infinity },
      { length: 6000, quantity: 2 },
    ];
    const pieces = [{ length: 7000, quantity: 1 }];
    const r = solveLinear1DMultiStock(stocks, pieces, 0);
    checkMultiStockInvariants(r, stocks, pieces, 0, false);

    expect(r.totalStockUsed).toBe(0);
    expect(r.unplaced).toHaveLength(1);
    expect(r.unplaced[0].length).toBe(7000);
  });

  it('complex scenario: 3 stock sizes, kerf, limited qtys', () => {
    // Stocks: 3000 ×2, 5000 ×1, 8000 (unlimited). Kerf=50, kerfAfterLast=false.
    // Pieces: 2500 ×2, 4000 ×1, 7000 ×1.
    // Sorted desc: [7000, 4000, 2500, 2500]
    //
    // Piece 7000: freshCost=7000. 3000? no (7000>3000). 5000? no (7000>5000).
    //   8000? yes. Bar 0 (8000): rem=8000−7000=1000.
    // Piece 4000: bar 0 rem=1000, addCost=50+4000=4050>1000.
    //   New bar: freshCost=4000. 3000? no (4000>3000). 5000? yes. Bar 1 (5000): rem=5000−4000=1000. 5000 qty→0.
    // Piece 2500: bar 0 rem=1000, addCost=50+2500=2550>1000. Bar 1 rem=1000, 2550>1000.
    //   New bar: freshCost=2500. 3000? yes (qty=2). Bar 2 (3000): rem=3000−2500=500. 3000 qty→1.
    // Piece 2500: bar 0 rem=1000, 2550>1000. Bar 1 rem=1000, 2550>1000.
    //   Bar 2 rem=500, 2550>500.
    //   New bar: freshCost=2500. 3000 (qty=1)? yes. Bar 3 (3000): rem=500. 3000 qty→0.
    //
    // 4 bars: [8000], [5000], [3000], [3000].
    // Bar 0: used=7000, kerfCount=0, kerfTotal=0, waste=8000−7000−0=1000
    // Bar 1: used=4000, kerfCount=0, kerfTotal=0, waste=5000−4000−0=1000
    // Bar 2: used=2500, kerfCount=0, kerfTotal=0, waste=3000−2500−0=500
    // Bar 3: used=2500, kerfCount=0, kerfTotal=0, waste=3000−2500−0=500
    // totalWaste = 1000+1000+500+500 = 3000
    const stocks: StockItem[] = [
      { length: 3000, quantity: 2 },
      { length: 5000, quantity: 1 },
      { length: 8000, quantity: Infinity },
    ];
    const pieces = [
      { length: 2500, quantity: 2 },
      { length: 4000, quantity: 1 },
      { length: 7000, quantity: 1 },
    ];
    const r = solveLinear1DMultiStock(stocks, pieces, 50);
    checkMultiStockInvariants(r, stocks, pieces, 50, false);

    expect(r.totalStockUsed).toBe(4);
    expect(r.unplaced).toHaveLength(0);
    // totalWaste = 1000+1000+500+500 = 3000
    expect(r.totalWaste).toBe(3000);
  });

  it('single unlimited stock via multi-stock matches solveLinear1D', () => {
    const stock = 10000;
    const pieces = [
      { length: 4500, quantity: 2 },
      { length: 3000, quantity: 3 },
      { length: 1500, quantity: 4 },
    ];
    const r1 = solveLinear1D(stock, pieces, 30);
    const r2 = solveLinear1DMultiStock(
      [{ length: stock, quantity: Infinity }],
      pieces,
      30,
    );

    expect(r1.totalStockUsed).toBe(r2.totalStockUsed);
    expect(r1.totalWaste).toBe(r2.totalWaste);
    expect(r1.bars.length).toBe(r2.bars.length);
    for (let i = 0; i < r1.bars.length; i++) {
      expect(r1.bars[i].pieces.map((p) => p.length)).toEqual(
        r2.bars[i].pieces.map((p) => p.length),
      );
    }
  });
});

// ===========================================================================
// P1-T04: stock quantity invariant tests
// ===========================================================================

describe('solveLinear1DMultiStock — stock quantity invariants', () => {
  it('never uses more bars than total available stock', () => {
    // 2 stocks of 5000 ×3 and 8000 ×2 = max 5 bars. 10 pieces of 4000.
    // At most 5 bars can be opened; remaining pieces are unplaced.
    const stocks: StockItem[] = [
      { length: 5000, quantity: 3 },
      { length: 8000, quantity: 2 },
    ];
    const pieces = [{ length: 4000, quantity: 10 }];
    const r = solveLinear1DMultiStock(stocks, pieces, 0);
    checkMultiStockInvariants(r, stocks, pieces, 0, false);

    // max possible bars = 3 + 2 = 5
    expect(r.totalStockUsed).toBeLessThanOrEqual(5);
    // 10 pieces of 4000. Each bar of 5000 holds 1 (4000+4000=8000>5000).
    // Each bar of 8000 holds 1 (4000+4000=8000≤8000, so 2 fit on 8000!).
    // Bars of 5000: 3 bars × 1 piece = 3 pieces. Bars of 8000: 2 bars × 2 pieces = 4 pieces.
    // Total placed = 3 + 4 = 7. Unplaced = 10 − 7 = 3.
    expect(r.totalStockUsed).toBe(5);
    expect(r.unplaced).toHaveLength(3);
  });

  it('unlimited stock never runs out', () => {
    const stocks: StockItem[] = [{ length: 1000, quantity: Infinity }];
    const pieces = [{ length: 900, quantity: 50 }];
    const r = solveLinear1DMultiStock(stocks, pieces, 0);
    checkMultiStockInvariants(r, stocks, pieces, 0, false);

    // Each bar holds 1 piece (900+900=1800>1000). So 50 bars.
    expect(r.totalStockUsed).toBe(50);
    expect(r.unplaced).toHaveLength(0);
  });

  it('mixed limited + unlimited: limited used first (shorter)', () => {
    // Stocks: 6000 ×1 (limited), 10000 (unlimited).
    // Pieces: 5000 ×3, kerf=0.
    // Sorted: [5000, 5000, 5000].
    // Piece 1: shortest >=5000 → 6000 (qty=1). Bar 0 (6000): rem=1000. qty→0.
    // Piece 2: bar 0 rem=1000, 5000>1000. New bar: 6000 exhausted, 10000. Bar 1 (10000): rem=5000.
    // Piece 3: bar 0 rem=1000, too small. Bar 1 rem=5000, addCost=5000≤5000. Fits!
    //   Bar 1: [5000,5000], used=10000, waste=10000−10000=0.
    // Bar 0: waste=6000−5000=1000.
    // totalWaste=1000. 2 bars.
    const stocks: StockItem[] = [
      { length: 6000, quantity: 1 },
      { length: 10000, quantity: Infinity },
    ];
    const pieces = [{ length: 5000, quantity: 3 }];
    const r = solveLinear1DMultiStock(stocks, pieces, 0);
    checkMultiStockInvariants(r, stocks, pieces, 0, false);

    expect(r.totalStockUsed).toBe(2);
    expect(r.unplaced).toHaveLength(0);
    // Check the limited stock was used (bar 0 = 6000)
    expect(r.bars[0].stockLength).toBe(6000);
    // waste = 6000−5000 = 1000
    expect(r.bars[0].waste).toBe(1000);
    // Bar 1: 10000, 2 pieces, waste = 0
    expect(r.bars[1].stockLength).toBe(10000);
    expect(r.bars[1].waste).toBe(0);
    expect(r.totalWaste).toBe(1000);
  });

  it('wastePercent calculation with mixed stock lengths', () => {
    // Stocks: 4000 ×1, 6000 ×1. Pieces: 3000 ×1, 5000 ×1. Kerf=0.
    // Sorted desc: [5000, 3000].
    // Piece 5000: shortest >= 5000 is 6000 (qty=1). Bar 0 (6000): rem=1000. qty→0.
    // Piece 3000: bar 0 rem=1000, 3000>1000. New bar: 4000 (qty=1). Bar 1 (4000): rem=1000. qty→0.
    // Bar 0: waste = 6000−5000 = 1000
    // Bar 1: waste = 4000−3000 = 1000
    // totalStock = 6000 + 4000 = 10000
    // totalWaste = 1000 + 1000 = 2000
    // wastePercent = 2000/10000 × 100 = 20
    const stocks: StockItem[] = [
      { length: 4000, quantity: 1 },
      { length: 6000, quantity: 1 },
    ];
    const pieces = [
      { length: 3000, quantity: 1 },
      { length: 5000, quantity: 1 },
    ];
    const r = solveLinear1DMultiStock(stocks, pieces, 0);
    checkMultiStockInvariants(r, stocks, pieces, 0, false);

    expect(r.totalStockUsed).toBe(2);
    // totalWaste = 1000 + 1000 = 2000
    expect(r.totalWaste).toBe(2000);
    // wastePercent = 2000 / (6000+4000) × 100 = 20
    expect(r.wastePercent).toBe(20);
  });
});

// ===========================================================================
// P1-T04: pickBetter tie-break — largest leftover
// ===========================================================================

describe('solveLinear1DMultiStock — pickBetter tie-break', () => {
  it('determinism: multi-stock produces identical output on repeated runs', () => {
    const stocks: StockItem[] = [
      { length: 5000, quantity: 2 },
      { length: 8000, quantity: Infinity },
    ];
    const pieces = [
      { length: 4500, quantity: 2 },
      { length: 3000, quantity: 3 },
    ];
    const r1 = solveLinear1DMultiStock(stocks, pieces, 30);
    const r2 = solveLinear1DMultiStock(stocks, pieces, 30);

    expect(r1.totalStockUsed).toBe(r2.totalStockUsed);
    expect(r1.totalWaste).toBe(r2.totalWaste);
    for (let i = 0; i < r1.bars.length; i++) {
      expect(r1.bars[i].pieces.map((p) => p.length)).toEqual(
        r2.bars[i].pieces.map((p) => p.length),
      );
      expect(r1.bars[i].stockLength).toBe(r2.bars[i].stockLength);
    }
  });
});
