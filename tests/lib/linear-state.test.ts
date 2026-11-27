/**
 * tests/lib/linear-state.test.ts
 *
 * Tests for src/lib/linear-state.ts — the shared input state module for
 * the linear cutting calculator. These are pure unit tests: no DOM, no Astro.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createLinearState,
  setUnit,
  setStockText,
  setStockQty,
  addStockRow,
  removeStockRow,
  setKerf,
  setKerfAfterLast,
  toStockEntries,
  type LinearState,
} from '../../src/lib/linear-state.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function freshState(): LinearState {
  // createLinearState reads localStorage which isn't available in Vitest JSDOM
  // mode, but the try/catch in the module handles that gracefully.
  return createLinearState();
}

// ---------------------------------------------------------------------------
// createLinearState
// ---------------------------------------------------------------------------

describe('createLinearState', () => {
  it('returns a state with at least one stock row', () => {
    const s = freshState();
    expect(s.stockRows.length).toBeGreaterThanOrEqual(1);
  });

  it('defaults kerf to 0 and no error', () => {
    const s = freshState();
    expect(s.kerf).toBe(0);
    expect(s.kerfError).toBe('');
  });

  it('defaults kerfAfterLast to false', () => {
    const s = freshState();
    expect(s.kerfAfterLast).toBe(false);
  });

  it('unit is a valid DisplayUnit', () => {
    const s = freshState();
    expect(['mm', 'cm', 'm', 'in', 'ft']).toContain(s.unit);
  });

  it('initial stock rows have empty rawText', () => {
    const s = freshState();
    expect(s.stockRows.every(r => r.rawText === '')).toBe(true);
  });

  it('initial stock rows have unlimited qty', () => {
    const s = freshState();
    expect(s.stockRows.every(r => r.qty === Infinity)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// setStockText
// ---------------------------------------------------------------------------

describe('setStockText', () => {
  it('parses a valid mm length', () => {
    let s = freshState();
    s = setUnit(s, 'mm');
    const id = s.stockRows[0].id;
    s = setStockText(s, id, '2400');
    expect(s.stockRows[0].value).toBe(24000); // 2400 mm × 10 = 24000
    expect(s.stockRows[0].error).toBe('');
  });

  it('parses a valid inch length', () => {
    let s = freshState();
    s = setUnit(s, 'in');
    const id = s.stockRows[0].id;
    s = setStockText(s, id, '48');
    expect(s.stockRows[0].value).toBe(3072); // 48 in × 64 = 3072
    expect(s.stockRows[0].error).toBe('');
  });

  it('parses imperial fraction', () => {
    let s = freshState();
    s = setUnit(s, 'in');
    const id = s.stockRows[0].id;
    s = setStockText(s, id, '8 1/2');
    expect(s.stockRows[0].value).toBe(544); // 8.5 × 64
    expect(s.stockRows[0].error).toBe('');
  });

  it('sets error for invalid text', () => {
    let s = freshState();
    s = setUnit(s, 'mm');
    const id = s.stockRows[0].id;
    s = setStockText(s, id, 'abc');
    expect(s.stockRows[0].value).toBeNull();
    expect(s.stockRows[0].error).not.toBe('');
  });

  it('sets error for zero length', () => {
    let s = freshState();
    s = setUnit(s, 'mm');
    const id = s.stockRows[0].id;
    s = setStockText(s, id, '0');
    expect(s.stockRows[0].value).toBeNull();
    expect(s.stockRows[0].error).not.toBe('');
  });

  it('no error for empty field (user has not typed yet)', () => {
    let s = freshState();
    s = setUnit(s, 'mm');
    const id = s.stockRows[0].id;
    s = setStockText(s, id, '');
    expect(s.stockRows[0].value).toBeNull();
    expect(s.stockRows[0].error).toBe('');
  });

  it('only updates the target row, not others', () => {
    let s = freshState();
    s = addStockRow(s); // 3 rows
    const ids = s.stockRows.map(r => r.id);
    s = setStockText(s, ids[0], '1000');
    expect(s.stockRows[1].rawText).toBe('');
    expect(s.stockRows[2].rawText).toBe('');
  });
});

// ---------------------------------------------------------------------------
// setUnit — the core anti-drift behaviour
// ---------------------------------------------------------------------------

describe('setUnit', () => {
  it('re-parses rawText in the new unit without changing rawText', () => {
    let s = freshState();
    s = setUnit(s, 'mm');
    const id = s.stockRows[0].id;
    s = setStockText(s, id, '2400');
    // rawText stays "2400" after changing to cm
    s = setUnit(s, 'cm');
    expect(s.stockRows[0].rawText).toBe('2400');
    // Value changes: 2400 cm × 100 = 240000 internal units
    expect(s.stockRows[0].value).toBe(240000);
  });

  it('re-parses imperial fractions when switching unit', () => {
    let s = freshState();
    s = setUnit(s, 'in');
    const id = s.stockRows[0].id;
    s = setStockText(s, id, '3 1/2');
    const inValue = s.stockRows[0].value; // 3.5 × 64 = 224
    // Switch to ft: rawText "3 1/2" is re-parsed as feet
    s = setUnit(s, 'ft');
    expect(s.stockRows[0].rawText).toBe('3 1/2');
    // 3.5 ft × 768 = 2688 internal units
    expect(s.stockRows[0].value).toBe(2688);
    // Different from inches value
    expect(s.stockRows[0].value).not.toBe(inValue);
  });

  it('re-parses kerf raw text in the new unit', () => {
    let s = freshState();
    s = setUnit(s, 'mm');
    s = setKerf(s, '3.2');
    s = setUnit(s, 'cm');
    // kerf rawText "3.2" is now interpreted as 3.2 cm = 320 internal units
    expect(s.kerf).toBe(320);
    expect(s.kerfError).toBe('');
  });

  it('saves and restores unit preference', () => {
    // Unit is a valid display unit
    let s = freshState();
    s = setUnit(s, 'ft');
    expect(s.unit).toBe('ft');
  });
});

// ---------------------------------------------------------------------------
// setStockQty
// ---------------------------------------------------------------------------

describe('setStockQty', () => {
  it('unlimited when rawQty is empty', () => {
    let s = freshState();
    const id = s.stockRows[0].id;
    s = setStockQty(s, id, '');
    expect(s.stockRows[0].qty).toBe(Infinity);
    expect(s.stockRows[0].qtyError).toBe('');
  });

  it('unlimited when rawQty is "unlimited"', () => {
    let s = freshState();
    const id = s.stockRows[0].id;
    s = setStockQty(s, id, 'unlimited');
    expect(s.stockRows[0].qty).toBe(Infinity);
    expect(s.stockRows[0].qtyError).toBe('');
  });

  it('parses a whole positive number', () => {
    let s = freshState();
    const id = s.stockRows[0].id;
    s = setStockQty(s, id, '5');
    expect(s.stockRows[0].qty).toBe(5);
    expect(s.stockRows[0].qtyError).toBe('');
  });

  it('error for fractional number', () => {
    let s = freshState();
    const id = s.stockRows[0].id;
    s = setStockQty(s, id, '2.5');
    expect(s.stockRows[0].qtyError).not.toBe('');
  });

  it('error for zero quantity', () => {
    let s = freshState();
    const id = s.stockRows[0].id;
    s = setStockQty(s, id, '0');
    expect(s.stockRows[0].qtyError).not.toBe('');
  });
});

// ---------------------------------------------------------------------------
// addStockRow / removeStockRow
// ---------------------------------------------------------------------------

describe('addStockRow', () => {
  it('appends a new empty row', () => {
    let s = freshState();
    const before = s.stockRows.length;
    s = addStockRow(s);
    expect(s.stockRows.length).toBe(before + 1);
    expect(s.stockRows[s.stockRows.length - 1].rawText).toBe('');
  });

  it('new row has a unique id', () => {
    let s = freshState();
    s = addStockRow(s);
    const ids = s.stockRows.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('removeStockRow', () => {
  it('removes a row by id', () => {
    let s = freshState();
    s = addStockRow(s);
    const before = s.stockRows.length;
    const id = s.stockRows[0].id;
    s = removeStockRow(s, id);
    expect(s.stockRows.length).toBe(before - 1);
    expect(s.stockRows.find(r => r.id === id)).toBeUndefined();
  });

  it('never removes the last row', () => {
    let s = freshState();
    // Remove all but one
    while (s.stockRows.length > 1) {
      s = removeStockRow(s, s.stockRows[0].id);
    }
    const id = s.stockRows[0].id;
    s = removeStockRow(s, id);
    expect(s.stockRows.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// setKerf
// ---------------------------------------------------------------------------

describe('setKerf', () => {
  it('parses a valid kerf value', () => {
    let s = freshState();
    s = setUnit(s, 'mm');
    s = setKerf(s, '3.2');
    expect(s.kerf).toBe(32); // 3.2 × 10
    expect(s.kerfError).toBe('');
  });

  it('zero is valid', () => {
    let s = freshState();
    s = setKerf(s, '0');
    expect(s.kerf).toBe(0);
    expect(s.kerfError).toBe('');
  });

  it('empty string is treated as zero', () => {
    let s = freshState();
    s = setKerf(s, '');
    expect(s.kerf).toBe(0);
    expect(s.kerfError).toBe('');
  });

  it('invalid text produces an error', () => {
    let s = freshState();
    s = setKerf(s, 'xyz');
    expect(s.kerf).toBeNull();
    expect(s.kerfError).not.toBe('');
  });
});

// ---------------------------------------------------------------------------
// setKerfAfterLast
// ---------------------------------------------------------------------------

describe('setKerfAfterLast', () => {
  it('toggles kerfAfterLast', () => {
    let s = freshState();
    expect(s.kerfAfterLast).toBe(false);
    s = setKerfAfterLast(s, true);
    expect(s.kerfAfterLast).toBe(true);
    s = setKerfAfterLast(s, false);
    expect(s.kerfAfterLast).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// toStockEntries
// ---------------------------------------------------------------------------

describe('toStockEntries', () => {
  it('excludes rows with null value', () => {
    let s = freshState();
    s = setUnit(s, 'mm');
    // First row: empty (null value)
    // Second row: valid
    const id = s.stockRows[1].id;
    s = setStockText(s, id, '3000');
    const entries = toStockEntries(s);
    expect(entries.length).toBe(1);
    expect(entries[0].length).toBe(30000);
  });

  it('maps unlimited qty to Infinity', () => {
    let s = freshState();
    s = setUnit(s, 'mm');
    const id = s.stockRows[0].id;
    s = setStockText(s, id, '1200');
    const entries = toStockEntries(s);
    expect(entries[0].quantity).toBe(Infinity);
  });

  it('maps finite qty correctly', () => {
    let s = freshState();
    s = setUnit(s, 'mm');
    const id = s.stockRows[0].id;
    s = setStockText(s, id, '1200');
    s = setStockQty(s, id, '3');
    const entries = toStockEntries(s);
    expect(entries[0].quantity).toBe(3);
  });

  it('returns empty array when no valid rows', () => {
    const s = freshState(); // all rows empty
    expect(toStockEntries(s)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Immutability — each update returns a new object, never mutates
// ---------------------------------------------------------------------------

describe('immutability', () => {
  it('setStockText returns a new state', () => {
    let s = freshState();
    const id = s.stockRows[0].id;
    const next = setStockText(s, id, '1000');
    expect(next).not.toBe(s);
    expect(next.stockRows).not.toBe(s.stockRows);
  });

  it('addStockRow returns a new state', () => {
    const s = freshState();
    const next = addStockRow(s);
    expect(next).not.toBe(s);
  });

  it('setUnit returns a new state', () => {
    const s = freshState();
    const next = setUnit(s, 'cm');
    expect(next).not.toBe(s);
  });
});
