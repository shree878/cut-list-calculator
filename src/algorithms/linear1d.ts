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
 * keep the result with fewer bars; on tie, less total waste; on tie, BFD.
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
 * Solve a 1D linear cutting problem with a single stock length.
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
  const expanded = expandAndSort(pieces);
  const ffd = runHeuristic('ffd', expanded, stockLength, kerf, kerfAfterLast);
  const bfd = runHeuristic('bfd', expanded, stockLength, kerf, kerfAfterLast);
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
  stockLength: number,
  kerf: number,
  kerfAfterLast: boolean,
): LinearResult {
  const bars: OpenBar[] = [];
  const unplaced: LinearPiece[] = [];

  for (const piece of sorted) {
    // Cost to open a fresh bar with this piece.
    const freshCost = kerfAfterLast ? piece.length + kerf : piece.length;
    if (freshCost > stockLength) {
      unplaced.push(piece);
      continue;
    }

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
      bars.push({
        pieces: [piece],
        sumLengths: piece.length,
        remaining: stockLength - freshCost,
      });
    }
  }

  return buildResult(bars, stockLength, kerf, kerfAfterLast, unplaced);
}

/** Convert open bars into the public result type. */
function buildResult(
  bars: OpenBar[],
  stockLength: number,
  kerf: number,
  kerfAfterLast: boolean,
  unplaced: LinearPiece[],
): LinearResult {
  const resultBars: BarResult[] = bars.map((bar) => {
    const n = bar.pieces.length;
    const kerfCount = kerfAfterLast ? n : Math.max(0, n - 1);
    const kerfTotal = kerfCount * kerf;
    const waste = stockLength - bar.sumLengths - kerfTotal;
    return {
      stockLength,
      pieces: [...bar.pieces],
      usedLength: bar.sumLengths,
      kerfTotal,
      waste,
    };
  });

  const totalStock = resultBars.length * stockLength;
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
 * Fewer bars wins; on tie, less waste; on tie, prefer the second (BFD).
 */
function pickBetter(a: LinearResult, b: LinearResult): LinearResult {
  if (a.bars.length !== b.bars.length) {
    return a.bars.length < b.bars.length ? a : b;
  }
  if (a.totalWaste !== b.totalWaste) {
    return a.totalWaste < b.totalWaste ? a : b;
  }
  return b;
}
