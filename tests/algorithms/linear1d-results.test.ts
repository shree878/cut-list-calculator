import { describe, it, expect } from 'vitest';
import {
  toDisplayResult,
  formatCutList,
  type DisplayResult,
  type LengthFormatter,
} from '../../src/algorithms/linear1d-results';
import type { LinearResult, BarResult, LinearPiece } from '../../src/algorithms/linear1d';

// ---------------------------------------------------------------------------
// Helpers — build hand-crafted LinearResult objects (no solver dependency)
// ---------------------------------------------------------------------------

/** Build a minimal BarResult. */
function makeBar(
  stockLength: number,
  pieceLengths: number[],
  sourceIndices: number[],
  kerf: number,
  kerfAfterLast: boolean,
): BarResult {
  const usedLength = pieceLengths.reduce((s, l) => s + l, 0);
  const n = pieceLengths.length;
  const kerfCount = kerfAfterLast ? n : Math.max(0, n - 1);
  const kerfTotal = kerfCount * kerf;
  const waste = stockLength - usedLength - kerfTotal;
  const pieces: LinearPiece[] = pieceLengths.map((length, i) => ({
    length,
    sourceIndex: sourceIndices[i],
  }));
  return { stockLength, pieces, usedLength, kerfTotal, waste };
}

/** Build a minimal LinearResult from bars and unplaced. */
function makeResult(bars: BarResult[], unplaced: LinearPiece[] = []): LinearResult {
  const totalWaste = bars.reduce((s, b) => s + b.waste, 0);
  const totalStock = bars.reduce((s, b) => s + b.stockLength, 0);
  return {
    bars,
    totalStockUsed: bars.length,
    totalWaste,
    wastePercent: totalStock > 0 ? (totalWaste / totalStock) * 100 : 0,
    unplaced,
  };
}

/** Identity formatter: just toString. */
const idFmt: LengthFormatter = (v) => String(v);

// ---------------------------------------------------------------------------
// Invariant checker — reusable across tests
// ---------------------------------------------------------------------------

/**
 * Check structural invariants on a DisplayResult relative to the original
 * input pieces (expanded, with quantities).
 *
 * Invariants verified:
 *   1. No overlap: each bar's pieces + kerf + waste = stockLength.
 *   2. All pieces accounted: placed + unplaced = requested (by quantity per sourceIndex).
 *   3. Per-bar length conserved: Σ pieceLengths + kerfTotal + waste = stockLength.
 *   4. Summary totals are consistent with individual bars.
 */
function checkDisplayInvariants(
  display: DisplayResult,
  /** The original input pieces array (before expansion). */
  inputPieces: ReadonlyArray<{ length: number; quantity: number }>,
) {
  // Invariant 1 & 3: per-bar length conservation (no overlap)
  for (const bar of display.bars) {
    const sumPieces = bar.cuts.reduce((s, c) => s + c.pieceLength, 0);
    // usedLength must equal sum of piece lengths
    expect(sumPieces).toBe(bar.usedLength);
    // pieces + kerf + waste = stock (length conservation)
    expect(bar.usedLength + bar.kerfTotal + bar.waste).toBe(bar.stockLength);
    // pieceCount matches cuts array length
    expect(bar.pieceCount).toBe(bar.cuts.length);
    // non-negative waste
    expect(bar.waste).toBeGreaterThanOrEqual(0);
    // cut numbers are 1-based sequential
    bar.cuts.forEach((cut, i) => {
      expect(cut.cutNumber).toBe(i + 1);
    });
  }

  // Invariant 2: all pieces accounted for (placed + unplaced = requested)
  // Count by sourceIndex
  const requestedBySource = new Map<number, number>();
  for (let i = 0; i < inputPieces.length; i++) {
    requestedBySource.set(i, inputPieces[i].quantity);
  }

  const placedBySource = new Map<number, number>();
  for (const bar of display.bars) {
    for (const cut of bar.cuts) {
      placedBySource.set(cut.sourceIndex, (placedBySource.get(cut.sourceIndex) ?? 0) + 1);
    }
  }
  for (const p of display.unplaced) {
    placedBySource.set(p.sourceIndex, (placedBySource.get(p.sourceIndex) ?? 0) + 1);
  }

  for (const [srcIdx, requested] of requestedBySource) {
    const accounted = placedBySource.get(srcIdx) ?? 0;
    expect(accounted).toBe(requested);
  }

  // Invariant 4: summary consistency
  expect(display.summary.totalBars).toBe(display.bars.length);

  const expectedTotalStock = display.bars.reduce((s, b) => s + b.stockLength, 0);
  expect(display.summary.totalStockMaterial).toBe(expectedTotalStock);

  const expectedTotalUsed = display.bars.reduce((s, b) => s + b.usedLength, 0);
  expect(display.summary.totalUsedMaterial).toBe(expectedTotalUsed);

  const expectedTotalKerf = display.bars.reduce((s, b) => s + b.kerfTotal, 0);
  expect(display.summary.totalKerf).toBe(expectedTotalKerf);

  const expectedTotalWaste = display.bars.reduce((s, b) => s + b.waste, 0);
  expect(display.summary.totalWaste).toBe(expectedTotalWaste);

  // stock = used + kerf + waste  (global level)
  expect(display.summary.totalStockMaterial).toBe(
    display.summary.totalUsedMaterial + display.summary.totalKerf + display.summary.totalWaste,
  );

  // waste percent
  if (expectedTotalStock > 0) {
    expect(display.summary.wastePercent).toBeCloseTo(
      (expectedTotalWaste / expectedTotalStock) * 100,
      10,
    );
  } else {
    expect(display.summary.wastePercent).toBe(0);
  }

  // bar numbers are 1-based sequential
  display.bars.forEach((bar, i) => {
    expect(bar.barNumber).toBe(i + 1);
  });
}

// ===========================================================================
// toDisplayResult — known-answer tests
// ===========================================================================

describe('toDisplayResult — known-answer tests', () => {
  it('single bar, 2 pieces, zero kerf', () => {
    // Hand arithmetic:
    // Stock = 10000. Pieces: [6000 (src 0), 3000 (src 1)].
    // usedLength = 6000 + 3000 = 9000. kerfTotal = 0. waste = 10000 − 9000 = 1000.
    // totalStock = 10000. totalWaste = 1000. wastePercent = 1000/10000 × 100 = 10.0.
    const input: LinearResult = makeResult([
      makeBar(10000, [6000, 3000], [0, 1], 0, false),
    ]);

    const d = toDisplayResult(input);
    checkDisplayInvariants(d, [{ length: 6000, quantity: 1 }, { length: 3000, quantity: 1 }]);

    expect(d.bars).toHaveLength(1);
    expect(d.bars[0].barNumber).toBe(1);
    expect(d.bars[0].stockLength).toBe(10000);
    expect(d.bars[0].cuts).toHaveLength(2);
    expect(d.bars[0].cuts[0]).toEqual({ cutNumber: 1, pieceLength: 6000, sourceIndex: 0 });
    expect(d.bars[0].cuts[1]).toEqual({ cutNumber: 2, pieceLength: 3000, sourceIndex: 1 });
    // usedLength = 6000 + 3000 = 9000
    expect(d.bars[0].usedLength).toBe(9000);
    expect(d.bars[0].kerfTotal).toBe(0);
    // waste = 10000 − 9000 − 0 = 1000
    expect(d.bars[0].waste).toBe(1000);
    expect(d.bars[0].pieceCount).toBe(2);

    // totalStock = 10000, totalUsed = 9000, totalKerf = 0, totalWaste = 1000
    // wastePercent = 1000 / 10000 × 100 = 10.0
    expect(d.summary.totalBars).toBe(1);
    expect(d.summary.totalStockMaterial).toBe(10000);
    expect(d.summary.totalUsedMaterial).toBe(9000);
    expect(d.summary.totalKerf).toBe(0);
    expect(d.summary.totalWaste).toBe(1000);
    expect(d.summary.wastePercent).toBe(10);
    expect(d.unplaced).toHaveLength(0);
  });

  it('two bars with kerf, one unplaced piece', () => {
    // Hand arithmetic:
    // Bar 0: stock=24000, pieces=[10000 (src 0), 8000 (src 1)].
    //   usedLength = 10000 + 8000 = 18000. kerfCount = max(0, 2−1) = 1. kerfTotal = 30.
    //   waste = 24000 − 18000 − 30 = 5970.
    // Bar 1: stock=24000, pieces=[6000 (src 2)].
    //   usedLength = 6000. kerfCount = 0. kerfTotal = 0.
    //   waste = 24000 − 6000 − 0 = 18000.
    // Unplaced: [25000 (src 3)].
    // totalStock = 24000 + 24000 = 48000. totalUsed = 18000 + 6000 = 24000.
    // totalKerf = 30 + 0 = 30. totalWaste = 5970 + 18000 = 23970.
    // wastePercent = 23970 / 48000 × 100 = 49.9375.
    const input: LinearResult = makeResult(
      [
        makeBar(24000, [10000, 8000], [0, 1], 30, false),
        makeBar(24000, [6000], [2], 30, false),
      ],
      [{ length: 25000, sourceIndex: 3 }],
    );

    const d = toDisplayResult(input);
    checkDisplayInvariants(d, [
      { length: 10000, quantity: 1 },
      { length: 8000, quantity: 1 },
      { length: 6000, quantity: 1 },
      { length: 25000, quantity: 1 },
    ]);

    expect(d.bars).toHaveLength(2);
    // Bar 0 cuts in order
    expect(d.bars[0].cuts.map((c) => c.pieceLength)).toEqual([10000, 8000]);
    // waste = 24000 − 18000 − 30 = 5970
    expect(d.bars[0].waste).toBe(5970);
    expect(d.bars[0].kerfTotal).toBe(30);

    // Bar 1
    expect(d.bars[1].cuts.map((c) => c.pieceLength)).toEqual([6000]);
    // waste = 24000 − 6000 − 0 = 18000
    expect(d.bars[1].waste).toBe(18000);

    // Summary: totalStock = 48000, totalWaste = 23970
    expect(d.summary.totalStockMaterial).toBe(48000);
    expect(d.summary.totalUsedMaterial).toBe(24000);
    expect(d.summary.totalKerf).toBe(30);
    expect(d.summary.totalWaste).toBe(23970);
    // wastePercent = 23970/48000 × 100 = 49.9375
    expect(d.summary.wastePercent).toBeCloseTo(49.9375, 4);

    // Unplaced
    expect(d.unplaced).toHaveLength(1);
    expect(d.unplaced[0].length).toBe(25000);
    expect(d.unplaced[0].sourceIndex).toBe(3);
  });

  it('mixed stock lengths with kerfAfterLast', () => {
    // Hand arithmetic:
    // Bar 0: stock=8000, pieces=[5000 (src 0), 2000 (src 1)].
    //   usedLength = 5000 + 2000 = 7000. kerfCount = 2 (kerfAfterLast). kerfTotal = 2 × 50 = 100.
    //   waste = 8000 − 7000 − 100 = 900.
    // Bar 1: stock=5000, pieces=[4000 (src 2)].
    //   usedLength = 4000. kerfCount = 1 (kerfAfterLast). kerfTotal = 50.
    //   waste = 5000 − 4000 − 50 = 950.
    // totalStock = 8000 + 5000 = 13000. totalUsed = 7000 + 4000 = 11000.
    // totalKerf = 100 + 50 = 150. totalWaste = 900 + 950 = 1850.
    // wastePercent = 1850 / 13000 × 100 ≈ 14.230769...
    const input: LinearResult = makeResult([
      makeBar(8000, [5000, 2000], [0, 1], 50, true),
      makeBar(5000, [4000], [2], 50, true),
    ]);

    const d = toDisplayResult(input);
    checkDisplayInvariants(d, [
      { length: 5000, quantity: 1 },
      { length: 2000, quantity: 1 },
      { length: 4000, quantity: 1 },
    ]);

    // Bar 0: kerfTotal = 2 × 50 = 100, waste = 8000 − 7000 − 100 = 900
    expect(d.bars[0].kerfTotal).toBe(100);
    expect(d.bars[0].waste).toBe(900);
    // Bar 1: kerfTotal = 50, waste = 5000 − 4000 − 50 = 950
    expect(d.bars[1].kerfTotal).toBe(50);
    expect(d.bars[1].waste).toBe(950);

    // totalKerf = 100 + 50 = 150, totalWaste = 900 + 950 = 1850
    expect(d.summary.totalKerf).toBe(150);
    expect(d.summary.totalWaste).toBe(1850);
    // wastePercent = 1850/13000 × 100 ≈ 14.2308
    expect(d.summary.wastePercent).toBeCloseTo(14.2308, 3);
  });

  it('no bars and no pieces → empty result', () => {
    const input: LinearResult = makeResult([]);
    const d = toDisplayResult(input);

    expect(d.bars).toHaveLength(0);
    expect(d.unplaced).toHaveLength(0);
    expect(d.summary.totalBars).toBe(0);
    expect(d.summary.totalStockMaterial).toBe(0);
    expect(d.summary.totalUsedMaterial).toBe(0);
    expect(d.summary.totalKerf).toBe(0);
    expect(d.summary.totalWaste).toBe(0);
    expect(d.summary.wastePercent).toBe(0);
  });

  it('all pieces unplaced → 0 bars, unplaced list populated', () => {
    // No bars, 2 unplaced pieces.
    const input: LinearResult = makeResult(
      [],
      [
        { length: 7000, sourceIndex: 0 },
        { length: 9000, sourceIndex: 1 },
      ],
    );

    const d = toDisplayResult(input);
    checkDisplayInvariants(d, [{ length: 7000, quantity: 1 }, { length: 9000, quantity: 1 }]);

    expect(d.bars).toHaveLength(0);
    expect(d.unplaced).toHaveLength(2);
    expect(d.unplaced[0].length).toBe(7000);
    expect(d.unplaced[1].length).toBe(9000);
    expect(d.summary.totalBars).toBe(0);
    expect(d.summary.wastePercent).toBe(0);
  });

  it('duplicate sourceIndex (multiple copies of same piece request)', () => {
    // Hand arithmetic: 3 copies of piece from source 0 (length 3000), stock 10000, kerf 0.
    // Bar 0: [3000, 3000, 3000], usedLength = 9000, waste = 10000 − 9000 = 1000.
    // totalStock = 10000, totalWaste = 1000, wastePercent = 10.
    const input: LinearResult = makeResult([
      makeBar(10000, [3000, 3000, 3000], [0, 0, 0], 0, false),
    ]);

    const d = toDisplayResult(input);
    checkDisplayInvariants(d, [{ length: 3000, quantity: 3 }]);

    expect(d.bars[0].cuts).toHaveLength(3);
    // All 3 cuts reference sourceIndex 0
    for (const cut of d.bars[0].cuts) {
      expect(cut.sourceIndex).toBe(0);
      expect(cut.pieceLength).toBe(3000);
    }
    // waste = 10000 − 9000 = 1000
    expect(d.bars[0].waste).toBe(1000);
  });
});

// ===========================================================================
// toDisplayResult — invariant tests (parametric)
// ===========================================================================

describe('toDisplayResult — invariant tests', () => {
  const cases: Array<{
    label: string;
    bars: BarResult[];
    unplaced: LinearPiece[];
    inputPieces: Array<{ length: number; quantity: number }>;
  }> = [
    {
      label: 'single bar, exact fit',
      bars: [makeBar(10000, [5000, 3000, 2000], [0, 1, 2], 0, false)],
      unplaced: [],
      inputPieces: [
        { length: 5000, quantity: 1 },
        { length: 3000, quantity: 1 },
        { length: 2000, quantity: 1 },
      ],
    },
    {
      label: 'two bars with kerf',
      bars: [
        makeBar(10000, [4000, 3000], [0, 1], 100, false),
        makeBar(10000, [2000, 1000], [2, 3], 100, false),
      ],
      unplaced: [],
      inputPieces: [
        { length: 4000, quantity: 1 },
        { length: 3000, quantity: 1 },
        { length: 2000, quantity: 1 },
        { length: 1000, quantity: 1 },
      ],
    },
    {
      label: 'bars with unplaced',
      bars: [makeBar(5000, [4000], [0], 0, false)],
      unplaced: [{ length: 6000, sourceIndex: 1 }],
      inputPieces: [
        { length: 4000, quantity: 1 },
        { length: 6000, quantity: 1 },
      ],
    },
    {
      label: 'kerfAfterLast with multiple pieces',
      bars: [makeBar(10000, [3000, 3000, 3000], [0, 0, 0], 50, true)],
      unplaced: [],
      inputPieces: [{ length: 3000, quantity: 3 }],
    },
    {
      label: 'mixed stock lengths',
      bars: [
        makeBar(6000, [5000], [0], 0, false),
        makeBar(10000, [8000], [1], 0, false),
      ],
      unplaced: [],
      inputPieces: [
        { length: 5000, quantity: 1 },
        { length: 8000, quantity: 1 },
      ],
    },
  ];

  for (const c of cases) {
    it(`invariants hold: ${c.label}`, () => {
      const input = makeResult(c.bars, c.unplaced);
      const d = toDisplayResult(input);
      checkDisplayInvariants(d, c.inputPieces);
    });
  }
});

// ===========================================================================
// formatCutList — known-answer tests
// ===========================================================================

describe('formatCutList — known-answer tests', () => {
  it('single bar, zero kerf, identity formatter', () => {
    // Hand arithmetic:
    // Stock = 10000. Pieces: [6000, 3000]. waste = 10000 − 9000 = 1000.
    // totalBars = 1, totalStock = 10000, totalWaste = 1000, wastePercent = 10.0.
    const input: LinearResult = makeResult([
      makeBar(10000, [6000, 3000], [0, 1], 0, false),
    ]);
    const d = toDisplayResult(input);
    const text = formatCutList(d, idFmt);

    const expected = [
      '#1 [10000]',
      '  1. 6000',
      '  2. 3000',
      '  → 1000',
      '',
      '1 / 10000 / 1000 / 10.0%',
    ].join('\n');

    expect(text).toBe(expected);
  });

  it('two bars with unplaced, custom formatter', () => {
    // Hand arithmetic:
    // Bar 0: stock=24000, pieces=[10000, 8000]. kerf=30, kerfAfterLast=false.
    //   usedLength = 18000. kerfCount = 1. kerfTotal = 30. waste = 24000 − 18000 − 30 = 5970.
    // Bar 1: stock=24000, pieces=[6000]. kerfCount = 0. kerfTotal = 0.
    //   waste = 24000 − 6000 = 18000.
    // Unplaced: [25000].
    // totalStock = 48000, totalWaste = 5970 + 18000 = 23970.
    // wastePercent = 23970 / 48000 × 100 = 49.9375 → "49.9%"
    const input: LinearResult = makeResult(
      [
        makeBar(24000, [10000, 8000], [0, 1], 30, false),
        makeBar(24000, [6000], [2], 30, false),
      ],
      [{ length: 25000, sourceIndex: 3 }],
    );
    const d = toDisplayResult(input);

    // Custom formatter: adds " mm" suffix after dividing by 10 (internal → mm)
    const mmFmt: LengthFormatter = (v) => `${v / 10} mm`;
    const text = formatCutList(d, mmFmt);

    const expected = [
      '#1 [2400 mm]',
      '  1. 1000 mm',
      '  2. 800 mm',
      '  → 597 mm',
      '',
      '#2 [2400 mm]',
      '  1. 600 mm',
      '  → 1800 mm',
      '',
      '2 / 4800 mm / 2397 mm / 49.9%',
      '',
      '✗ 2500 mm',
    ].join('\n');

    expect(text).toBe(expected);
  });

  it('no bars, no unplaced → summary only', () => {
    const input: LinearResult = makeResult([]);
    const d = toDisplayResult(input);
    const text = formatCutList(d, idFmt);

    // totalBars=0, totalStock=0, totalWaste=0, wastePercent=0.0
    expect(text).toBe('0 / 0 / 0 / 0.0%');
  });

  it('all unplaced, no bars', () => {
    const input: LinearResult = makeResult(
      [],
      [
        { length: 5000, sourceIndex: 0 },
        { length: 7000, sourceIndex: 1 },
      ],
    );
    const d = toDisplayResult(input);
    const text = formatCutList(d, idFmt);

    const expected = [
      '0 / 0 / 0 / 0.0%',
      '',
      '✗ 5000',
      '✗ 7000',
    ].join('\n');

    expect(text).toBe(expected);
  });

  it('formatter receives exact internal units', () => {
    // Verify the formatter is called with the raw internal values, not transformed.
    const received: number[] = [];
    const spyFmt: LengthFormatter = (v) => {
      received.push(v);
      return `[${v}]`;
    };

    const input: LinearResult = makeResult([
      makeBar(10000, [6000], [0], 0, false),
    ]);
    const d = toDisplayResult(input);
    formatCutList(d, spyFmt);

    // Expected calls: stockLength(10000), pieceLength(6000), waste(4000),
    //                 summary: totalStock(10000), totalWaste(4000)
    // waste = 10000 − 6000 = 4000
    expect(received).toEqual([10000, 6000, 4000, 10000, 4000]);
  });
});
