/**
 * 1D linear cutting algorithm — First Fit Decreasing / Best Fit Decreasing.
 * Pure TypeScript, no DOM. Deterministic: same input always gives same output.
 *
 * Kerf rule (from cutting-stock-packing skill):
 *   "A bar holding n pieces consumes sum(lengths) + kerf × (n − 1).
 *    Make 'kerf after the last piece' an explicit option and state the
 *    chosen rule in the UI."
 *
 *   kerfAfterLast = false (default):  consumed = sum(lengths) + kerf × (n − 1)
 *   kerfAfterLast = true:             consumed = sum(lengths) + kerf × n
 *
 * Strategy: expand pieces by quantity, sort descending, run FFD and BFD,
 * keep the result with fewer bars; on tie, less total waste; on tie, prefer
 * the layout with the largest single leftover piece (more reusable); on tie,
 * prefer BFD.
 *
 * Supports multiple stock lengths with limited quantities.  Offcuts are
 * modelled as extra stock entries with limited quantity.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single expanded piece with a back-reference to its input row. */
export interface LinearPiece {
  length: number;
  /** Index into the original pieces array (for linking results back). */
  sourceIndex: number;
}

/** A stock entry with length and available quantity. */
export interface StockItem {
  /** Length in internal integer units (> 0). */
  length: number;
  /** Available quantity. Use Infinity for unlimited. */
  quantity: number;
}

/** One stock bar in the result, with its cut list. */
export interface BarResult {
  stockLength: number;
  /** Pieces placed on this bar, in placement order. */
  pieces: LinearPiece[];
  /** Sum of piece lengths (excluding kerf). */
  usedLength: number;
  /** Total kerf consumed on this bar. */
  kerfTotal: number;
  /** Remaining material: stockLength − usedLength − kerfTotal. */
  waste: number;
}

/** Full result of a linear cutting job. */
export interface LinearResult {
  bars: BarResult[];
  /** Number of stock bars used. */
  totalStockUsed: number;
  /** Sum of waste across all bars. */
  totalWaste: number;
  /** Waste as a percentage of total stock material (0–100). */
  wastePercent: number;
  /** Pieces that could not fit on any stock bar. */
  unplaced: LinearPiece[];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Solve a 1D linear cutting problem with a single stock length (unlimited).
 * Thin wrapper around solveLinear1DMultiStock that preserves the original API.
 *
 * @param stockLength  Length of each stock bar (internal integer units, > 0).
 * @param pieces       Piece requests (each with length > 0, quantity >= 1).
 * @param kerf         Blade kerf width in internal units (>= 0).
 * @param kerfAfterLast  If true, add one extra kerf after the last piece on
 *                       each bar.  Defaults to false.
 */
export function solveLinear1D(
  stockLength: number,
  pieces: ReadonlyArray<{ length: number; quantity: number }>,
  kerf: number,
  kerfAfterLast = false,
): LinearResult {
  return solveLinear1DMultiStock(
    [{ length: stockLength, quantity: Infinity }],
    pieces,
    kerf,
    kerfAfterLast,
  );
}

/**
 * Solve a 1D linear cutting problem with multiple stock lengths and limited
 * quantities.  Reusable offcuts are modelled as extra stock entries with
 * limited quantity.
 *
 * @param stocks        Stock entries sorted by length ascending (shortest
 *                      first) is recommended but not required; the algorithm
 *                      always picks the shortest stock that fits.
 * @param pieces        Piece requests (each with length > 0, quantity >= 1).
 * @param kerf          Blade kerf width in internal units (>= 0).
 * @param kerfAfterLast If true, add one extra kerf after the last piece on
 *                      each bar.  Defaults to false.
 */
export function solveLinear1DMultiStock(
  stocks: ReadonlyArray<StockItem>,
  pieces: ReadonlyArray<{ length: number; quantity: number }>,
  kerf: number,
  kerfAfterLast = false,
): LinearResult {
  // Normalize: merge duplicate lengths (sum quantities), sort ascending.
  const merged = mergeStocks(stocks);
  const expanded = expandAndSort(pieces);
  const ffd = runHeuristic('ffd', expanded, merged, kerf, kerfAfterLast);
  const bfd = runHeuristic('bfd', expanded, merged, kerf, kerfAfterLast);
  return pickBetter(ffd, bfd);
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/** Working state for a bar during placement. */
interface OpenBar {
  pieces: LinearPiece[];
  sumLengths: number;
  /** Space remaining on this bar. */
  remaining: number;
  /** The stock length this bar was opened from. */
  stockLength: number;
}

/** Normalized stock entry (sorted ascending, unique lengths, mutable qty). */
interface MutableStock {
  length: number;
  remaining: number;
}

/** Merge duplicate stock lengths and sort ascending. */
function mergeStocks(stocks: ReadonlyArray<StockItem>): MutableStock[] {
  const map = new Map<number, number>();
  for (const s of stocks) {
    const prev = map.get(s.length) ?? 0;
    // Infinity + anything = Infinity, which is correct.
    map.set(s.length, prev + s.quantity);
  }
  const out: MutableStock[] = [];
  for (const [length, remaining] of map) {
    out.push({ length, remaining });
  }
  // Sort ascending by length so we always pick the shortest that fits.
  out.sort((a, b) => a.length - b.length);
  return out;
}

/** Expand piece requests into individual pieces, sort descending by length. */
function expandAndSort(
  pieces: ReadonlyArray<{ length: number; quantity: number }>,
): LinearPiece[] {
  const out: LinearPiece[] = [];
  for (let i = 0; i < pieces.length; i++) {
    for (let q = 0; q < pieces[i].quantity; q++) {
      out.push({ length: pieces[i].length, sourceIndex: i });
    }
  }
  // Descending by length; tie-break ascending by sourceIndex for determinism.
  out.sort((a, b) => b.length - a.length || a.sourceIndex - b.sourceIndex);
  return out;
}

/**
 * Run one bin-packing heuristic on the sorted piece list.
 *
 * FFD — First Fit Decreasing: place each piece in the first bar with room.
 * BFD — Best Fit Decreasing: place each piece in the bar with the least
 *       remaining space that still fits the piece (tightest fit).
 */
function runHeuristic(
  mode: 'ffd' | 'bfd',
  sorted: LinearPiece[],
  stocks: MutableStock[],
  kerf: number,
  kerfAfterLast: boolean,
): LinearResult {
  // Deep-copy stocks so we can mutate remaining counts.
  const avail: MutableStock[] = stocks.map((s) => ({ ...s }));
  const bars: OpenBar[] = [];
  const unplaced: LinearPiece[] = [];

  for (const piece of sorted) {
    // Cost to add this piece to an existing bar (always kerf + length,
    // because every existing bar already has at least one piece).
    const addCost = kerf + piece.length;

    let bestIdx = -1;

    if (mode === 'ffd') {
      for (let i = 0; i < bars.length; i++) {
        if (addCost <= bars[i].remaining) {
          bestIdx = i;
          break;
        }
      }
    } else {
      let bestAfter = Infinity;
      for (let i = 0; i < bars.length; i++) {
        const after = bars[i].remaining - addCost;
        if (after >= 0 && after < bestAfter) {
          bestAfter = after;
          bestIdx = i;
        }
      }
    }

    if (bestIdx >= 0) {
      bars[bestIdx].pieces.push(piece);
      bars[bestIdx].sumLengths += piece.length;
      bars[bestIdx].remaining -= addCost;
    } else {
      // Need a new bar — pick the SHORTEST available stock that holds the piece.
      const freshCost = kerfAfterLast ? piece.length + kerf : piece.length;
      let opened = false;
      for (const stock of avail) {
        if (stock.remaining <= 0) continue;
        if (freshCost <= stock.length) {
          stock.remaining--;
          bars.push({
            pieces: [piece],
            sumLengths: piece.length,
            remaining: stock.length - freshCost,
            stockLength: stock.length,
          });
          opened = true;
          break;
        }
      }
      if (!opened) {
        unplaced.push(piece);
      }
    }
  }

  return buildResult(bars, kerf, kerfAfterLast, unplaced);
}

/** Convert open bars into the public result type. */
function buildResult(
  bars: OpenBar[],
  kerf: number,
  kerfAfterLast: boolean,
  unplaced: LinearPiece[],
): LinearResult {
  const resultBars: BarResult[] = bars.map((bar) => {
    const n = bar.pieces.length;
    const kerfCount = kerfAfterLast ? n : Math.max(0, n - 1);
    const kerfTotal = kerfCount * kerf;
    const waste = bar.stockLength - bar.sumLengths - kerfTotal;
    return {
      stockLength: bar.stockLength,
      pieces: [...bar.pieces],
      usedLength: bar.sumLengths,
      kerfTotal,
      waste,
    };
  });

  const totalStock = resultBars.reduce((s, b) => s + b.stockLength, 0);
  const totalWaste = resultBars.reduce((s, b) => s + b.waste, 0);

  return {
    bars: resultBars,
    totalStockUsed: resultBars.length,
    totalWaste,
    wastePercent: totalStock > 0 ? (totalWaste / totalStock) * 100 : 0,
    unplaced: [...unplaced],
  };
}

/**
 * Pick the better of two results.
 * Fewer bars wins; on tie, less waste; on tie, largest single leftover
 * (most reusable offcut); on tie, prefer the second (BFD).
 */
function pickBetter(a: LinearResult, b: LinearResult): LinearResult {
  if (a.bars.length !== b.bars.length) {
    return a.bars.length < b.bars.length ? a : b;
  }
  if (a.totalWaste !== b.totalWaste) {
    return a.totalWaste < b.totalWaste ? a : b;
  }
  // Largest single leftover (bar.waste) — higher is better (more reusable).
  const maxLeftA = a.bars.reduce((m, bar) => Math.max(m, bar.waste), 0);
  const maxLeftB = b.bars.reduce((m, bar) => Math.max(m, bar.waste), 0);
  if (maxLeftA !== maxLeftB) {
    return maxLeftA > maxLeftB ? a : b;
  }
  return b;
}
