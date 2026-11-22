import { describe, it, expect } from 'vitest';
import {
  validateInputs,
  MAX_PIECES,
  MAX_STOCK_ENTRIES,
  type StockEntry,
  type PieceEntry,
} from '../../src/algorithms/validate';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ok(stocks: StockEntry[], kerf: number, pieces: PieceEntry[]) {
  const result = validateInputs(stocks, kerf, pieces);
  expect(result.ok).toBe(true);
  expect(result.errors).toHaveLength(0);
}

function fails(
  stocks: StockEntry[],
  kerf: number,
  pieces: PieceEntry[],
  expectedField: 'stock' | 'kerf' | 'piece' | 'global',
  messagePart: string,
) {
  const result = validateInputs(stocks, kerf, pieces);
  expect(result.ok).toBe(false);
  const match = result.errors.find(
    (e) => e.field === expectedField && e.message.includes(messagePart),
  );
  expect(match, `Expected error on field '${expectedField}' containing "${messagePart}"`).toBeTruthy();
}

// Minimal valid inputs for reuse
const S1: StockEntry[] = [{ length: 24000 }]; // 2400 mm
const P1: PieceEntry[] = [{ length: 1000, quantity: 1 }]; // 100 mm × 1

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe('validateInputs — happy path', () => {
  it('accepts valid metric inputs with zero kerf', () => {
    ok(S1, 0, P1);
  });

  it('accepts valid imperial inputs with non-zero kerf', () => {
    const stocks: StockEntry[] = [{ length: 1152 }]; // 18 in (1152 × 1/64)
    const pieces: PieceEntry[] = [{ length: 64, quantity: 3 }]; // 1 in each
    ok(stocks, 4, pieces); // 1/16 in kerf
  });

  it('accepts unlimited stock quantity (undefined)', () => {
    ok([{ length: 24000, quantity: undefined }], 0, P1);
  });

  it('accepts unlimited stock quantity (Infinity)', () => {
    ok([{ length: 24000, quantity: Infinity }], 0, P1);
  });

  it('accepts finite stock quantity >= 1', () => {
    ok([{ length: 24000, quantity: 5 }], 0, P1);
  });

  it('accepts multiple stock entries', () => {
    const stocks: StockEntry[] = [
      { length: 24000, quantity: 2 },
      { length: 36000, quantity: 1 },
    ];
    ok(stocks, 0, [{ length: 1000, quantity: 4 }]);
  });

  it('accepts multiple piece entries', () => {
    ok(S1, 0, [
      { length: 1000, quantity: 2 },
      { length: 2000, quantity: 3 },
    ]);
  });

  it('accepts piece exactly equal to stock length', () => {
    ok([{ length: 5000 }], 0, [{ length: 5000, quantity: 1 }]);
  });

  it('accepts kerf = 0', () => {
    ok(S1, 0, P1);
  });

  it('accepts kerf > 0', () => {
    ok(S1, 10, P1);
  });

  it('accepts exactly MAX_PIECES total pieces', () => {
    ok(S1, 0, [{ length: 100, quantity: MAX_PIECES }]);
  });
});

// ---------------------------------------------------------------------------
// Stock errors
// ---------------------------------------------------------------------------

describe('validateInputs — stock errors', () => {
  it('rejects empty stock array', () => {
    fails([], 0, P1, 'stock', 'at least one stock length');
  });

  it('rejects stock length of 0', () => {
    fails([{ length: 0 }], 0, P1, 'stock', 'greater than 0');
  });

  it('rejects negative stock length', () => {
    fails([{ length: -100 }], 0, P1, 'stock', 'greater than 0');
  });

  it('rejects non-integer stock length', () => {
    fails([{ length: 1000.5 }], 0, P1, 'stock', 'whole number');
  });

  it('rejects stock quantity of 0', () => {
    fails([{ length: 24000, quantity: 0 }], 0, P1, 'stock', 'at least 1');
  });

  it('rejects negative stock quantity', () => {
    fails([{ length: 24000, quantity: -1 }], 0, P1, 'stock', 'at least 1');
  });

  it('rejects non-integer stock quantity', () => {
    fails([{ length: 24000, quantity: 1.5 }], 0, P1, 'stock', 'whole number');
  });

  it('rejects too many stock entries', () => {
    const stocks: StockEntry[] = Array.from({ length: MAX_STOCK_ENTRIES + 1 }, () => ({
      length: 10000,
    }));
    fails(stocks, 0, P1, 'stock', 'Too many stock entries');
  });

  it('reports errors for each invalid stock entry', () => {
    const stocks: StockEntry[] = [
      { length: -1 },
      { length: 24000 },
      { length: 0 },
    ];
    const result = validateInputs(stocks, 0, P1);
    expect(result.ok).toBe(false);
    const stockErrors = result.errors.filter((e) => e.field === 'stock');
    expect(stockErrors.length).toBeGreaterThanOrEqual(2);
    const indices = stockErrors.map((e) => e.index);
    expect(indices).toContain(0);
    expect(indices).toContain(2);
  });
});

// ---------------------------------------------------------------------------
// Kerf errors
// ---------------------------------------------------------------------------

describe('validateInputs — kerf errors', () => {
  it('rejects negative kerf', () => {
    fails(S1, -1, P1, 'kerf', '0 or a positive');
  });

  it('rejects non-integer kerf', () => {
    fails(S1, 0.5, P1, 'kerf', 'whole number');
  });

  it('rejects NaN kerf', () => {
    fails(S1, NaN, P1, 'kerf', 'whole number');
  });
});

// ---------------------------------------------------------------------------
// Piece errors
// ---------------------------------------------------------------------------

describe('validateInputs — piece errors', () => {
  it('rejects empty piece array', () => {
    fails(S1, 0, [], 'piece', 'at least one piece');
  });

  it('rejects piece length of 0', () => {
    fails(S1, 0, [{ length: 0, quantity: 1 }], 'piece', 'greater than 0');
  });

  it('rejects negative piece length', () => {
    fails(S1, 0, [{ length: -50, quantity: 1 }], 'piece', 'greater than 0');
  });

  it('rejects non-integer piece length', () => {
    fails(S1, 0, [{ length: 100.5, quantity: 1 }], 'piece', 'whole number');
  });

  it('rejects piece quantity of 0', () => {
    fails(S1, 0, [{ length: 100, quantity: 0 }], 'piece', 'at least 1');
  });

  it('rejects piece quantity < 1', () => {
    fails(S1, 0, [{ length: 100, quantity: -1 }], 'piece', 'at least 1');
  });

  it('rejects non-integer piece quantity', () => {
    fails(S1, 0, [{ length: 100, quantity: 2.5 }], 'piece', 'at least 1');
  });

  it('rejects total pieces > MAX_PIECES', () => {
    fails(S1, 0, [{ length: 100, quantity: MAX_PIECES + 1 }], 'global', 'Too many pieces');
  });

  it('total pieces across multiple rows can exceed limit', () => {
    const pieces: PieceEntry[] = [
      { length: 100, quantity: 300 },
      { length: 200, quantity: 201 },
    ];
    fails(S1, 0, pieces, 'global', 'Too many pieces');
  });

  it('reports errors for each invalid piece entry', () => {
    const pieces: PieceEntry[] = [
      { length: 0, quantity: 1 },
      { length: 500, quantity: 2 },
      { length: -10, quantity: 1 },
    ];
    const result = validateInputs(S1, 0, pieces);
    expect(result.ok).toBe(false);
    const pieceErrors = result.errors.filter((e) => e.field === 'piece');
    const indices = pieceErrors.map((e) => e.index);
    expect(indices).toContain(0);
    expect(indices).toContain(2);
  });
});

// ---------------------------------------------------------------------------
// Fit check: piece longer than every stock
// ---------------------------------------------------------------------------

describe('validateInputs — fit check', () => {
  it('rejects piece longer than all stock lengths', () => {
    fails(
      [{ length: 1000 }],
      0,
      [{ length: 1001, quantity: 1 }],
      'piece',
      'cannot fit',
    );
  });

  it('accepts piece exactly equal to longest stock', () => {
    ok([{ length: 1000 }, { length: 2000 }], 0, [{ length: 2000, quantity: 1 }]);
  });

  it('accepts piece <= longest stock even when shorter stock exists', () => {
    ok(
      [{ length: 500 }, { length: 2000 }],
      0,
      [{ length: 1500, quantity: 1 }],
    );
  });

  it('reports "cannot fit" for each oversized piece', () => {
    const result = validateInputs(
      [{ length: 500 }],
      0,
      [
        { length: 600, quantity: 1 },
        { length: 400, quantity: 1 },
        { length: 700, quantity: 1 },
      ],
    );
    expect(result.ok).toBe(false);
    const fitErrors = result.errors.filter((e) => e.message.includes('cannot fit'));
    expect(fitErrors).toHaveLength(2);
    const indices = fitErrors.map((e) => e.index);
    expect(indices).toContain(0);
    expect(indices).toContain(2);
  });

  it('skips fit check when stock entries are invalid', () => {
    // Invalid stock means no fit check should run
    const result = validateInputs([], 0, [{ length: 999999, quantity: 1 }]);
    expect(result.ok).toBe(false);
    const fitErrors = result.errors.filter((e) => e.message.includes('cannot fit'));
    expect(fitErrors).toHaveLength(0);
  });

  it('skips fit check when kerf is invalid', () => {
    const result = validateInputs(S1, -1, [{ length: 99999, quantity: 1 }]);
    expect(result.ok).toBe(false);
    const fitErrors = result.errors.filter((e) => e.message.includes('cannot fit'));
    expect(fitErrors).toHaveLength(0);
  });

  it('skips fit check when piece entries are invalid', () => {
    const result = validateInputs([{ length: 500 }], 0, [{ length: 0, quantity: 1 }]);
    expect(result.ok).toBe(false);
    const fitErrors = result.errors.filter((e) => e.message.includes('cannot fit'));
    expect(fitErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Return shape
// ---------------------------------------------------------------------------

describe('validateInputs — return shape', () => {
  it('returns ok:true with empty errors array on success', () => {
    const result = validateInputs(S1, 0, P1);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('returns ok:false with non-empty errors array on failure', () => {
    const result = validateInputs([], 0, []);
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('every error has field and message', () => {
    const result = validateInputs([], -1, []);
    for (const e of result.errors) {
      expect(typeof e.message).toBe('string');
      expect(e.message.length).toBeGreaterThan(0);
      expect(['stock', 'kerf', 'piece', 'global']).toContain(e.field);
    }
  });
});
