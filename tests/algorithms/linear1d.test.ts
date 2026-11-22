import { describe, it, expect } from 'vitest';
import {
  solveLinear1D,
  type LinearResult,
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
