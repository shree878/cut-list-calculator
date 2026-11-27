/**
 * src/lib/linear-state.ts — Shared input state for the Linear Cutting Calculator.
 *
 * This module is the single source of truth for all user inputs: units, stock
 * rows, kerf, and advanced settings. P1-T08 (settings/stock UI), P1-T09
 * (pieces UI), and P1-T10 (solver + results) all import from here so there is
 * no prop-drilling and no duplicated parse logic. The state is a plain reactive
 * signal — no framework dependency.
 *
 * Key design decisions:
 * 1. Each field stores the raw string the user typed ("rawText") alongside its
 *    parsed internal value. When the unit changes, we re-parse rawText in the
 *    new unit so the user's words are preserved and rounding drift is avoided.
 * 2. Errors are plain English strings stored per-field id; the UI reads them
 *    and renders them beside the relevant control via aria-describedby.
 * 3. The state lives outside any component so P1-T09 pieces and P1-T10 solver
 *    can subscribe without prop-drilling or prop-threading through Astro slots.
 */

import {
  parseLength,
  formatLength,
  unitSystem,
  type DisplayUnit,
  type UnitSystem,
} from './units.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StockRow {
  id: string;
  rawText: string;
  /** Internal units (0.1 mm or 1/64 in). null when parse fails or empty. */
  value: number | null;
  /** "unlimited" | positive integer string */
  rawQty: string;
  qty: number; // Infinity for unlimited
  error: string;
  qtyError: string;
}

export interface LinearState {
  unit: DisplayUnit;
  stockRows: StockRow[];
  kerfRaw: string;
  kerf: number | null;
  kerfError: string;
  kerfAfterLast: boolean;
  errors: Record<string, string>; // field-id → error message
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _nextId = 1;
function newId(): string {
  return `s${_nextId++}`;
}

function emptyRow(): StockRow {
  return {
    id: newId(),
    rawText: '',
    value: null,
    rawQty: 'unlimited',
    qty: Infinity,
    error: '',
    qtyError: '',
  };
}

function parseStockRow(row: StockRow, unit: DisplayUnit): StockRow {
  const updated = { ...row };
  if (updated.rawText.trim() === '') {
    updated.value = null;
    updated.error = '';
  } else {
    const r = parseLength(updated.rawText, unit);
    if (r.ok) {
      if (r.value <= 0) {
        updated.value = null;
        updated.error = 'Stock length must be greater than zero.';
      } else {
        updated.value = r.value;
        updated.error = '';
      }
    } else {
      updated.value = null;
      updated.error = r.error;
    }
  }

  // Parse qty
  const rawQ = updated.rawQty.trim().toLowerCase();
  if (rawQ === '' || rawQ === 'unlimited') {
    updated.qty = Infinity;
    updated.qtyError = '';
  } else {
    const n = Number(rawQ);
    if (!Number.isInteger(n) || n < 1) {
      updated.qty = Infinity;
      updated.qtyError = 'Enter a whole number ≥ 1, or leave blank for unlimited.';
    } else {
      updated.qty = n;
      updated.qtyError = '';
    }
  }

  return updated;
}

function parseKerf(raw: string, unit: DisplayUnit): { value: number | null; error: string } {
  if (raw.trim() === '' || raw.trim() === '0') {
    return { value: 0, error: '' };
  }
  const r = parseLength(raw, unit);
  if (r.ok) {
    return { value: r.value, error: '' };
  }
  return { value: null, error: r.error };
}

// ---------------------------------------------------------------------------
// Default unit from browser locale
// ---------------------------------------------------------------------------

function defaultUnit(): DisplayUnit {
  if (typeof navigator === 'undefined') return 'mm';
  // Locales that use imperial by default: US and a few others
  const locale = navigator.language ?? 'en-US';
  const imperialLocales = ['en-US', 'en-LR', 'en-MM', 'my', 'lr'];
  if (imperialLocales.some(l => locale.startsWith(l.split('-')[0]) && locale.includes(l.split('-')[1] ?? ''))) {
    // Simpler: check if region is US, LR, or MM
    const region = locale.split('-')[1] ?? '';
    if (['US', 'LR', 'MM'].includes(region)) return 'in';
  }
  return 'mm';
}

// ---------------------------------------------------------------------------
// Persistence key
// ---------------------------------------------------------------------------

const UNIT_KEY = 'clc_unit';

function loadSavedUnit(): DisplayUnit | null {
  try {
    const v = localStorage.getItem(UNIT_KEY);
    if (v === 'mm' || v === 'cm' || v === 'm' || v === 'in' || v === 'ft') return v;
  } catch {
    /* ignore */
  }
  return null;
}

function saveUnit(unit: DisplayUnit): void {
  try {
    localStorage.setItem(UNIT_KEY, unit);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// State factory
// ---------------------------------------------------------------------------

export function createLinearState(): LinearState {
  const unit = loadSavedUnit() ?? defaultUnit();
  const row = emptyRow();
  return {
    unit,
    stockRows: [row, emptyRow()],
    kerfRaw: '0',
    kerf: 0,
    kerfError: '',
    kerfAfterLast: false,
    errors: {},
  };
}

// ---------------------------------------------------------------------------
// State update functions — pure: each returns a new LinearState
// ---------------------------------------------------------------------------

/** Change the unit system; re-parse every rawText in the new unit.
 *  Critical: rawText is preserved, not round-tripped through formatLength,
 *  so user input is kept as-is and rounding drift is avoided.
 */
export function setUnit(state: LinearState, unit: DisplayUnit): LinearState {
  const stockRows = state.stockRows.map(r => parseStockRow({ ...r }, unit));
  const kerfParsed = parseKerf(state.kerfRaw, unit);
  return {
    ...state,
    unit,
    stockRows,
    kerf: kerfParsed.value,
    kerfError: kerfParsed.error,
  };
}

/** Update a stock row's length text. */
export function setStockText(state: LinearState, id: string, rawText: string): LinearState {
  const stockRows = state.stockRows.map(r =>
    r.id === id ? parseStockRow({ ...r, rawText }, state.unit) : r,
  );
  return { ...state, stockRows };
}

/** Update a stock row's quantity text. */
export function setStockQty(state: LinearState, id: string, rawQty: string): LinearState {
  const stockRows = state.stockRows.map(r =>
    r.id === id ? parseStockRow({ ...r, rawQty }, state.unit) : r,
  );
  return { ...state, stockRows };
}

/** Add a new empty stock row. */
export function addStockRow(state: LinearState): LinearState {
  return { ...state, stockRows: [...state.stockRows, emptyRow()] };
}

/** Remove a stock row by id. */
export function removeStockRow(state: LinearState, id: string): LinearState {
  if (state.stockRows.length <= 1) return state; // keep at least one
  return { ...state, stockRows: state.stockRows.filter(r => r.id !== id) };
}

/** Update the kerf raw text. */
export function setKerf(state: LinearState, raw: string): LinearState {
  const { value, error } = parseKerf(raw, state.unit);
  return { ...state, kerfRaw: raw, kerf: value, kerfError: error };
}

/** Toggle the kerfAfterLast option. */
export function setKerfAfterLast(state: LinearState, v: boolean): LinearState {
  return { ...state, kerfAfterLast: v };
}

// ---------------------------------------------------------------------------
// Derived helpers for the solver (P1-T10)
// ---------------------------------------------------------------------------

/**
 * Returns stock entries ready for validateInputs / solveLinear1DMultiStock.
 * Only rows with a valid length are included.
 */
export function toStockEntries(
  state: LinearState,
): Array<{ length: number; quantity: number }> {
  return state.stockRows
    .filter(r => r.value !== null && r.value > 0)
    .map(r => ({ length: r.value as number, quantity: r.qty }));
}
