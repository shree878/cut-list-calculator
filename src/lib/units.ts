/**
 * Units module: parse, format, and convert lengths for the cutting calculators.
 * Pure TypeScript, no DOM. All internal values are non-negative integers.
 *
 * Internal units:
 *   metric:   0.1 mm  → 1 mm = 10, 1 cm = 100, 1 m = 10 000
 *   imperial: 1/64 in → 1 in = 64, 1 ft = 768
 *
 * Convert between systems only at input/output boundaries. Never mix systems
 * inside a single calculation.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Unit system for a job. */
export type UnitSystem = 'metric' | 'imperial';

/** Display units the user picks from. */
export type MetricUnit = 'mm' | 'cm' | 'm';
export type ImperialUnit = 'in' | 'ft';
export type DisplayUnit = MetricUnit | ImperialUnit;

/** Result of parsing user input. */
export type ParseResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Scale factors: 1 of the display unit = this many internal units.
// ---------------------------------------------------------------------------

const SCALE: Record<DisplayUnit, number> = {
  mm: 10,
  cm: 100,
  m: 10_000,
  in: 64,
  ft: 768, // 64 × 12
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Return the unit system a display unit belongs to. */
export function unitSystem(unit: DisplayUnit): UnitSystem {
  return unit === 'mm' || unit === 'cm' || unit === 'm' ? 'metric' : 'imperial';
}

/**
 * Parse a user-entered length string into internal integer units.
 *
 * Metric accepts decimal numbers (e.g. "1200", "1200.5").
 * Imperial also accepts fractions and mixed numbers
 * (e.g. "1/2", "3 1/2", "3-1/2").
 *
 * Returns `{ ok: true, value }` on success (value is a non-negative integer)
 * or `{ ok: false, error }` with a plain-language message.
 */
export function parseLength(text: string, unit: DisplayUnit): ParseResult {
  const trimmed = text.trim();
  if (trimmed === '') {
    return { ok: false, error: 'Enter a length.' };
  }
  const system = unitSystem(unit);
  const scale = SCALE[unit];
  return system === 'imperial'
    ? parseImperial(trimmed, scale)
    : parseDecimal(trimmed, scale, 'Enter a number (e.g. 1200 or 1200.5).');
}

/**
 * Format an internal-unit value for display in the given unit.
 *
 * Metric: decimal string, trailing zeros trimmed.
 * Imperial inches: reduced fraction or mixed number (e.g. "3 1/2").
 * Imperial feet: feet-and-inches notation (e.g. "3' 6 1/2\"").
 *
 * `value` must be a non-negative integer.
 */
export function formatLength(value: number, unit: DisplayUnit): string {
  if (unitSystem(unit) === 'metric') {
    return formatMetric(value, unit as MetricUnit);
  }
  return unit === 'ft' ? formatFeetInches(value) : formatInches(value);
}

/**
 * Convert internal units from one system to the other.
 *
 * Uses the exact relation 1 in = 25.4 mm:
 *   imperial → metric:  × 127/32  (1/64 in → 0.1 mm)
 *   metric → imperial:  × 32/127  (0.1 mm → 1/64 in)
 *
 * Returns a rounded non-negative integer. Same-system calls return the
 * value unchanged.
 */
export function convertToSystem(
  value: number,
  from: UnitSystem,
  to: UnitSystem,
): number {
  if (from === to) return value;
  return from === 'imperial'
    ? Math.round((value * 127) / 32) // 1/64 in → 0.1 mm
    : Math.round((value * 32) / 127); // 0.1 mm → 1/64 in
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

/** Matches a mixed number: "3 1/2", "3-1/2", "10 3/4" */
const MIXED_RE = /^(\d+)[\s-]+(\d+)\s*\/\s*(\d+)$/;

/** Matches a bare fraction: "1/2", "3/4" */
const FRAC_RE = /^(\d+)\s*\/\s*(\d+)$/;

function parseDecimal(
  text: string,
  scale: number,
  errorMsg: string,
): ParseResult {
  const n = Number(text);
  if (!Number.isFinite(n)) {
    return { ok: false, error: errorMsg };
  }
  if (n < 0) {
    return { ok: false, error: 'Length must not be negative.' };
  }
  return { ok: true, value: Math.round(n * scale) };
}

function parseImperial(text: string, scale: number): ParseResult {
  // Try mixed number first: "3 1/2", "3-1/2"
  let m = MIXED_RE.exec(text);
  if (m) {
    const whole = parseInt(m[1], 10);
    const num = parseInt(m[2], 10);
    const den = parseInt(m[3], 10);
    if (den === 0) {
      return { ok: false, error: 'Fraction denominator must not be zero.' };
    }
    const value = whole + num / den;
    return { ok: true, value: Math.round(value * scale) };
  }

  // Try bare fraction: "1/2"
  m = FRAC_RE.exec(text);
  if (m) {
    const num = parseInt(m[1], 10);
    const den = parseInt(m[2], 10);
    if (den === 0) {
      return { ok: false, error: 'Fraction denominator must not be zero.' };
    }
    return { ok: true, value: Math.round((num / den) * scale) };
  }

  // Fall back to decimal: "5", "5.25"
  return parseDecimal(
    text,
    scale,
    'Enter a number, fraction, or mixed number (e.g. 5, 5.25, 1/2, 3 1/2).',
  );
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/** Max decimal places per metric unit. */
const METRIC_DECIMALS: Record<MetricUnit, number> = {
  mm: 1,
  cm: 2,
  m: 4,
};

function formatMetric(value: number, unit: MetricUnit): string {
  const scale = SCALE[unit];
  const decimal = value / scale;
  const maxDp = METRIC_DECIMALS[unit];
  let s = decimal.toFixed(maxDp);
  // Trim trailing zeros and a trailing dot
  if (s.includes('.')) {
    s = s.replace(/0+$/, '').replace(/\.$/, '');
  }
  return s;
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

/**
 * Format a value (in 1/64 in) as an inch string with reduced fractions.
 *   320 → "5"      224 → "3 1/2"      32 → "1/2"      0 → "0"
 */
function formatInches(value: number): string {
  const whole = Math.floor(value / 64);
  const rem = value % 64;

  if (rem === 0) return String(whole);

  const g = gcd(rem, 64);
  const num = rem / g;
  const den = 64 / g;

  return whole > 0 ? `${whole} ${num}/${den}` : `${num}/${den}`;
}

/**
 * Format a value (in 1/64 in) as feet-and-inches notation.
 *   768 → "1'"      2688 → "3' 6\""      32 → "1/2\""      0 → "0"
 */
function formatFeetInches(value: number): string {
  const feet = Math.floor(value / 768);
  const rem = value % 768;

  if (rem === 0) {
    return feet === 0 ? '0' : `${feet}'`;
  }

  const inches = formatInches(rem);
  return feet === 0 ? `${inches}"` : `${feet}' ${inches}"`;
}
