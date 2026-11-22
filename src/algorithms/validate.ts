/**
 * Input validation for the linear cutting calculator.
 * Pure TypeScript, no DOM. All lengths are non-negative integers in internal units.
 *
 * Rules:
 *   - Stock lengths: each > 0, at least one entry.
 *   - Stock quantities: each >= 1 (use Infinity / undefined for unlimited).
 *   - Kerf: >= 0.
 *   - Piece lengths: each > 0.
 *   - Piece quantities: each >= 1.
 *   - Total pieces: <= MAX_PIECES (500).
 *   - Fit check: every piece must be <= at least one stock length minus its first kerf.
 */

export const MAX_PIECES = 500;
export const MAX_STOCK_ENTRIES = 100;

/** A single stock entry as the validator sees it. */
export interface StockEntry {
  /** Length in internal units (must be > 0). */
  length: number;
  /** Available quantity. Use Infinity for unlimited. */
  quantity?: number;
}

/** A single piece request. */
export interface PieceEntry {
  /** Length in internal units (must be > 0). */
  length: number;
  /** How many copies needed (must be >= 1). */
  quantity: number;
}

/** A single validation error referencing where it came from. */
export interface ValidationError {
  /** Human-readable, plain-language error message. */
  message: string;
  /** Which field failed: 'stock', 'kerf', 'piece', or 'global'. */
  field: 'stock' | 'kerf' | 'piece' | 'global';
  /** Zero-based index into the stock or piece array, when applicable. */
  index?: number;
}

/** Full result returned by validateInputs. */
export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
}

/**
 * Validate all inputs for a linear cutting job.
 *
 * @param stocks  One or more stock entries.
 * @param kerf    Kerf width in internal units (>= 0). Defaults to 0.
 * @param pieces  One or more piece requests.
 * @returns       {ok, errors} — ok is true only when errors is empty.
 */
export function validateInputs(
  stocks: StockEntry[],
  kerf: number,
  pieces: PieceEntry[],
): ValidationResult {
  const errors: ValidationError[] = [];

  // ---- Stocks ---------------------------------------------------------------
  if (stocks.length === 0) {
    errors.push({
      message: 'Add at least one stock length.',
      field: 'stock',
    });
  } else if (stocks.length > MAX_STOCK_ENTRIES) {
    errors.push({
      message: `Too many stock entries (max ${MAX_STOCK_ENTRIES}).`,
      field: 'stock',
    });
  } else {
    for (let i = 0; i < stocks.length; i++) {
      const s = stocks[i];
      if (!Number.isInteger(s.length) || s.length <= 0) {
        errors.push({
          message: 'Stock length must be a whole number greater than 0.',
          field: 'stock',
          index: i,
        });
      }
      const qty = s.quantity;
      if (qty !== undefined && qty !== Infinity) {
        if (!Number.isInteger(qty) || qty < 1) {
          errors.push({
            message: 'Stock quantity must be a whole number of at least 1.',
            field: 'stock',
            index: i,
          });
        }
      }
    }
  }

  // ---- Kerf -----------------------------------------------------------------
  if (!Number.isInteger(kerf) || kerf < 0) {
    errors.push({
      message: 'Kerf must be 0 or a positive whole number.',
      field: 'kerf',
    });
  }

  // ---- Pieces ---------------------------------------------------------------
  if (pieces.length === 0) {
    errors.push({
      message: 'Add at least one piece.',
      field: 'piece',
    });
  } else {
    let totalPieces = 0;
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      if (!Number.isInteger(p.length) || p.length <= 0) {
        errors.push({
          message: 'Piece length must be a whole number greater than 0.',
          field: 'piece',
          index: i,
        });
      }
      if (!Number.isInteger(p.quantity) || p.quantity < 1) {
        errors.push({
          message: 'Piece quantity must be a whole number of at least 1.',
          field: 'piece',
          index: i,
        });
      } else {
        totalPieces += p.quantity;
      }
    }
    if (totalPieces > MAX_PIECES) {
      errors.push({
        message: `Too many pieces (${totalPieces}). Maximum is ${MAX_PIECES}.`,
        field: 'global',
      });
    }
  }

  // ---- Fit check ------------------------------------------------------------
  // Only run when stocks and kerf and pieces are individually valid.
  const stocksOk = errors.filter((e) => e.field === 'stock').length === 0;
  const kerfOk = errors.filter((e) => e.field === 'kerf').length === 0;
  const piecesOk = errors.filter((e) => e.field === 'piece').length === 0;

  if (stocksOk && kerfOk && piecesOk && stocks.length > 0 && pieces.length > 0) {
    // The usable length of a stock bar when kerf is applied:
    // at minimum the bar must fit at least the piece (kerf is applied before
    // subsequent pieces, not before the first). So usable = stock.length.
    const maxStockLength = Math.max(...stocks.map((s) => s.length));
    for (let i = 0; i < pieces.length; i++) {
      if (pieces[i].length > maxStockLength) {
        errors.push({
          message: `Piece ${i + 1} (${pieces[i].length} units) is longer than every stock length and cannot fit.`,
          field: 'piece',
          index: i,
        });
      }
    }
  }

  return { ok: errors.length === 0, errors };
}
