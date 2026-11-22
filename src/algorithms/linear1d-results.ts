/**
 * Display-ready results model for a 1D linear cutting solution.
 *
 * Takes a LinearResult from the solver and reshapes it for the UI:
 *   - per-bar pieces in cut order, waste
 *   - summary totals (bars, material, kerf, waste, waste %)
 *   - unplaced list
 *   - plain-text cut list via a user-supplied length formatter
 *
 * All numeric values remain in internal integer units.  No display text or
 * hard-coded English lives in this module — the UI layer handles labels and
 * translations.
 */

import type { LinearResult } from './linear1d';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single cut instruction on a bar. */
export interface CutInstruction {
  /** 1-based cut number within this bar. */
  cutNumber: number;
  /** Piece length in internal units. */
  pieceLength: number;
  /** Index into the original pieces array (for linking back to input rows). */
  sourceIndex: number;
}

/** Display-ready data for one bar. */
export interface BarDisplay {
  /** 1-based bar number. */
  barNumber: number;
  /** Stock length in internal units. */
  stockLength: number;
  /** Cuts in order (same as solver placement order). */
  cuts: CutInstruction[];
  /** Sum of piece lengths in internal units. */
  usedLength: number;
  /** Total kerf consumed on this bar in internal units. */
  kerfTotal: number;
  /** Remaining material (waste / leftover) in internal units. */
  waste: number;
  /** Number of pieces on this bar. */
  pieceCount: number;
}

/** Summary totals for the entire job. */
export interface ResultSummary {
  /** Total number of stock bars used. */
  totalBars: number;
  /** Total stock material consumed = Σ bar.stockLength. */
  totalStockMaterial: number;
  /** Total material used by pieces = Σ bar.usedLength. */
  totalUsedMaterial: number;
  /** Total kerf consumed = Σ bar.kerfTotal. */
  totalKerf: number;
  /** Total waste = Σ bar.waste. */
  totalWaste: number;
  /** Waste as a percentage of total stock material (0–100). */
  wastePercent: number;
}

/** An unplaced piece with its source info. */
export interface UnplacedDisplay {
  /** Piece length in internal units. */
  length: number;
  /** Index into the original pieces array. */
  sourceIndex: number;
}

/** Full display-ready result. */
export interface DisplayResult {
  bars: BarDisplay[];
  summary: ResultSummary;
  unplaced: UnplacedDisplay[];
}

/** Converts an internal-unit integer to a display string. */
export type LengthFormatter = (internalUnits: number) => string;

// ---------------------------------------------------------------------------
// Transform
// ---------------------------------------------------------------------------

/**
 * Transform a LinearResult into display-ready data.
 * All numeric values stay in internal units — no formatting happens here.
 */
export function toDisplayResult(result: LinearResult): DisplayResult {
  const bars: BarDisplay[] = result.bars.map((bar, i) => ({
    barNumber: i + 1,
    stockLength: bar.stockLength,
    cuts: bar.pieces.map((piece, j) => ({
      cutNumber: j + 1,
      pieceLength: piece.length,
      sourceIndex: piece.sourceIndex,
    })),
    usedLength: bar.usedLength,
    kerfTotal: bar.kerfTotal,
    waste: bar.waste,
    pieceCount: bar.pieces.length,
  }));

  const totalStockMaterial = result.bars.reduce((s, b) => s + b.stockLength, 0);
  const totalUsedMaterial = result.bars.reduce((s, b) => s + b.usedLength, 0);
  const totalKerf = result.bars.reduce((s, b) => s + b.kerfTotal, 0);

  const summary: ResultSummary = {
    totalBars: result.bars.length,
    totalStockMaterial,
    totalUsedMaterial,
    totalKerf,
    totalWaste: result.totalWaste,
    wastePercent: result.wastePercent,
  };

  const unplaced: UnplacedDisplay[] = result.unplaced.map((p) => ({
    length: p.length,
    sourceIndex: p.sourceIndex,
  }));

  return { bars, summary, unplaced };
}

// ---------------------------------------------------------------------------
// Plain-text cut list
// ---------------------------------------------------------------------------

/**
 * Generate a plain-text cut list from a DisplayResult.
 *
 * Uses the provided formatter to convert internal units to display strings.
 * No English words are emitted — only numbers, structural symbols, and the
 * formatter's output.  The UI layer wraps this text with its own headings
 * and labels.
 *
 * Format per bar:
 *   #1 [<stock>]
 *     1. <piece>
 *     2. <piece>
 *     → <waste>
 *
 * Summary line:
 *   <bars> / <totalStock> / <totalWaste> / <wastePercent>%
 *
 * Unplaced (if any):
 *   ✗ <length>
 */
export function formatCutList(
  display: DisplayResult,
  fmt: LengthFormatter,
): string {
  const lines: string[] = [];

  for (const bar of display.bars) {
    lines.push(`#${bar.barNumber} [${fmt(bar.stockLength)}]`);
    for (const cut of bar.cuts) {
      lines.push(`  ${cut.cutNumber}. ${fmt(cut.pieceLength)}`);
    }
    lines.push(`  \u2192 ${fmt(bar.waste)}`);
    lines.push('');
  }

  // Summary line: bars / total stock / total waste / waste%
  const pct = display.summary.wastePercent.toFixed(1);
  lines.push(
    `${display.summary.totalBars} / ${fmt(display.summary.totalStockMaterial)} / ${fmt(display.summary.totalWaste)} / ${pct}%`,
  );

  if (display.unplaced.length > 0) {
    lines.push('');
    for (const p of display.unplaced) {
      lines.push(`\u2717 ${fmt(p.length)}`);
    }
  }

  return lines.join('\n');
}
