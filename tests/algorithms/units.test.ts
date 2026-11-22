import { describe, it, expect } from 'vitest';
import {
  unitSystem,
  parseLength,
  formatLength,
  convertToSystem,
} from '../../src/lib/units';
import type { DisplayUnit } from '../../src/lib/units';

// =========================================================================
// unitSystem
// =========================================================================

describe('unitSystem', () => {
  it('returns metric for mm, cm, m', () => {
    expect(unitSystem('mm')).toBe('metric');
    expect(unitSystem('cm')).toBe('metric');
    expect(unitSystem('m')).toBe('metric');
  });

  it('returns imperial for in, ft', () => {
    expect(unitSystem('in')).toBe('imperial');
    expect(unitSystem('ft')).toBe('imperial');
  });
});

// =========================================================================
// parseLength
// =========================================================================

describe('parseLength', () => {
  // ----- metric - decimals ------------------------------------------------

  describe('metric - decimals', () => {
    it('parses integer mm', () => {
      expect(parseLength('1200', 'mm')).toEqual({ ok: true, value: 12_000 });
    });

    it('parses decimal mm', () => {
      expect(parseLength('1200.5', 'mm')).toEqual({ ok: true, value: 12_005 });
    });

    it('parses cm', () => {
      expect(parseLength('120', 'cm')).toEqual({ ok: true, value: 12_000 });
    });

    it('parses decimal cm', () => {
      expect(parseLength('120.5', 'cm')).toEqual({ ok: true, value: 12_050 });
    });

    it('parses m', () => {
      expect(parseLength('1.2', 'm')).toEqual({ ok: true, value: 12_000 });
    });

    it('parses zero', () => {
      expect(parseLength('0', 'mm')).toEqual({ ok: true, value: 0 });
    });

    it('trims whitespace', () => {
      expect(parseLength('  1200  ', 'mm')).toEqual({ ok: true, value: 12_000 });
    });

    it('handles 0.1 mm (smallest metric unit)', () => {
      expect(parseLength('0.1', 'mm')).toEqual({ ok: true, value: 1 });
    });
  });

  // ----- imperial - decimals -----------------------------------------------

  describe('imperial - decimals', () => {
    it('parses integer inches', () => {
      expect(parseLength('5', 'in')).toEqual({ ok: true, value: 320 });
    });

    it('parses decimal inches', () => {
      expect(parseLength('5.25', 'in')).toEqual({ ok: true, value: 336 });
    });

    it('parses feet', () => {
      expect(parseLength('12', 'ft')).toEqual({ ok: true, value: 9216 });
    });

    it('parses decimal feet', () => {
      expect(parseLength('3.5', 'ft')).toEqual({ ok: true, value: 2688 });
    });

    it('parses zero', () => {
      expect(parseLength('0', 'in')).toEqual({ ok: true, value: 0 });
    });
  });

  // ----- imperial - fractions ----------------------------------------------

  describe('imperial - fractions', () => {
    it('parses 1/2', () => {
      expect(parseLength('1/2', 'in')).toEqual({ ok: true, value: 32 });
    });

    it('parses 3/4', () => {
      expect(parseLength('3/4', 'in')).toEqual({ ok: true, value: 48 });
    });

    it('parses 1/8', () => {
      expect(parseLength('1/8', 'in')).toEqual({ ok: true, value: 8 });
    });

    it('parses 1/16', () => {
      expect(parseLength('1/16', 'in')).toEqual({ ok: true, value: 4 });
    });

    it('parses 1/32', () => {
      expect(parseLength('1/32', 'in')).toEqual({ ok: true, value: 2 });
    });

    it('parses 1/64', () => {
      expect(parseLength('1/64', 'in')).toEqual({ ok: true, value: 1 });
    });

    it('parses fraction with spaces around slash', () => {
      expect(parseLength('3 / 4', 'in')).toEqual({ ok: true, value: 48 });
    });

    it('rounds non-power-of-2 denominator to nearest 64th', () => {
      // 1/3 of an inch = 21.33/64, rounds to 21
      expect(parseLength('1/3', 'in')).toEqual({ ok: true, value: 21 });
    });
  });

  // ----- imperial - mixed numbers ------------------------------------------

  describe('imperial - mixed numbers', () => {
    it('parses "3 1/2"', () => {
      expect(parseLength('3 1/2', 'in')).toEqual({ ok: true, value: 224 });
    });

    it('parses "3-1/2"', () => {
      expect(parseLength('3-1/2', 'in')).toEqual({ ok: true, value: 224 });
    });

    it('parses "12 3/16"', () => {
      expect(parseLength('12 3/16', 'in')).toEqual({ ok: true, value: 780 });
    });

    it('parses "5 0/4" as plain 5', () => {
      expect(parseLength('5 0/4', 'in')).toEqual({ ok: true, value: 320 });
    });

    it('handles multiple spaces', () => {
      expect(parseLength('3   1/2', 'in')).toEqual({ ok: true, value: 224 });
    });

    it('parses mixed number for feet', () => {
      // 3 1/2 ft = 3.5 ft = 3.5 × 768 = 2688
      expect(parseLength('3 1/2', 'ft')).toEqual({ ok: true, value: 2688 });
    });
  });

  // ----- error cases -------------------------------------------------------

  describe('error cases', () => {
    it('rejects empty string', () => {
      const r = parseLength('', 'mm');
      expect(r.ok).toBe(false);
    });

    it('rejects whitespace-only', () => {
      expect(parseLength('   ', 'mm').ok).toBe(false);
    });

    it('rejects non-numeric text (metric)', () => {
      const r = parseLength('abc', 'mm');
      expect(r.ok).toBe(false);
    });

    it('rejects non-numeric text (imperial)', () => {
      const r = parseLength('abc', 'in');
      expect(r.ok).toBe(false);
    });

    it('rejects fraction in metric mode', () => {
      const r = parseLength('3 1/2', 'mm');
      expect(r.ok).toBe(false);
    });

    it('rejects division by zero in fraction', () => {
      const r = parseLength('1/0', 'in');
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toContain('zero');
    });

    it('rejects division by zero in mixed number', () => {
      const r = parseLength('3 1/0', 'in');
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toContain('zero');
    });

    it('rejects negative (metric)', () => {
      const r = parseLength('-5', 'mm');
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toContain('negative');
    });

    it('rejects negative (imperial)', () => {
      const r = parseLength('-5', 'in');
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toContain('negative');
    });

    it('rejects Infinity', () => {
      expect(parseLength('Infinity', 'mm').ok).toBe(false);
    });

    it('rejects malformed decimal', () => {
      expect(parseLength('3..5', 'mm').ok).toBe(false);
    });
  });
});

// =========================================================================
// formatLength
// =========================================================================

describe('formatLength', () => {
  // ----- metric -----------------------------------------------------------

  describe('metric', () => {
    it('formats whole mm', () => {
      expect(formatLength(12_000, 'mm')).toBe('1200');
    });

    it('formats fractional mm', () => {
      expect(formatLength(12_005, 'mm')).toBe('1200.5');
    });

    it('formats cm', () => {
      expect(formatLength(12_000, 'cm')).toBe('120');
    });

    it('formats fractional cm', () => {
      expect(formatLength(12_050, 'cm')).toBe('120.5');
    });

    it('formats m', () => {
      expect(formatLength(12_000, 'm')).toBe('1.2');
    });

    it('formats zero', () => {
      expect(formatLength(0, 'mm')).toBe('0');
    });

    it('formats smallest metric unit (0.1 mm)', () => {
      expect(formatLength(1, 'mm')).toBe('0.1');
    });

    it('trims trailing zeros in m', () => {
      // 12000 / 10000 = 1.2, not "1.2000"
      expect(formatLength(12_000, 'm')).toBe('1.2');
    });
  });

  // ----- imperial - inches ------------------------------------------------

  describe('imperial - inches', () => {
    it('formats whole inches', () => {
      expect(formatLength(320, 'in')).toBe('5');
    });

    it('formats mixed number', () => {
      expect(formatLength(224, 'in')).toBe('3 1/2');
    });

    it('formats pure fraction', () => {
      expect(formatLength(32, 'in')).toBe('1/2');
    });

    it('formats 1/64', () => {
      expect(formatLength(1, 'in')).toBe('1/64');
    });

    it('formats zero', () => {
      expect(formatLength(0, 'in')).toBe('0');
    });

    it('reduces fractions', () => {
      expect(formatLength(48, 'in')).toBe('3/4');
    });

    it('formats 12 3/16', () => {
      expect(formatLength(780, 'in')).toBe('12 3/16');
    });

    it('formats non-standard fraction as 64ths', () => {
      // 21/64 cannot be reduced further
      expect(formatLength(21, 'in')).toBe('21/64');
    });
  });

  // ----- imperial - feet --------------------------------------------------

  describe('imperial - feet', () => {
    it('formats whole feet', () => {
      expect(formatLength(768, 'ft')).toBe("1'");
    });

    it('formats feet and whole inches', () => {
      expect(formatLength(2688, 'ft')).toBe('3\' 6"');
    });

    it('formats feet and fractional inches', () => {
      // 1 foot + 1/2 inch = 768 + 32 = 800
      expect(formatLength(800, 'ft')).toBe('1\' 1/2"');
    });

    it('formats feet and mixed-number inches', () => {
      // 2' + 3 1/2" = 2×768 + 3×64 + 32 = 1536 + 192 + 32 = 1760
      expect(formatLength(1760, 'ft')).toBe('2\' 3 1/2"');
    });

    it('formats inches only (no feet)', () => {
      expect(formatLength(32, 'ft')).toBe('1/2"');
    });

    it('formats whole inches only (no feet)', () => {
      // 6 inches = 384 internal
      expect(formatLength(384, 'ft')).toBe('6"');
    });

    it('formats zero', () => {
      expect(formatLength(0, 'ft')).toBe('0');
    });
  });
});

// =========================================================================
// convertToSystem
// =========================================================================

describe('convertToSystem', () => {
  it('returns same value for same system', () => {
    expect(convertToSystem(10_000, 'metric', 'metric')).toBe(10_000);
    expect(convertToSystem(1000, 'imperial', 'imperial')).toBe(1000);
  });

  it('converts metric to imperial', () => {
    // 10 000 × 0.1 mm = 1000 mm ≈ 39.37 in ≈ 2520 × 1/64 in
    expect(convertToSystem(10_000, 'metric', 'imperial')).toBe(2520);
  });

  it('converts imperial to metric', () => {
    // 2520 × 1/64 in = 39.375 in = 1000.125 mm ≈ 10001 × 0.1 mm
    expect(convertToSystem(2520, 'imperial', 'metric')).toBe(10_001);
  });

  it('converts zero', () => {
    expect(convertToSystem(0, 'metric', 'imperial')).toBe(0);
    expect(convertToSystem(0, 'imperial', 'metric')).toBe(0);
  });

  it('converts 1 inch to mm exactly', () => {
    // 1 in = 64 internal → 64 × 127/32 = 254 internal metric = 25.4 mm
    expect(convertToSystem(64, 'imperial', 'metric')).toBe(254);
  });

  it('converts 25.4 mm to inches exactly', () => {
    // 25.4 mm = 254 internal → 254 × 32/127 = 64 internal imperial = 1 in
    expect(convertToSystem(254, 'metric', 'imperial')).toBe(64);
  });

  it('converts 1 foot to mm exactly', () => {
    // 1 ft = 768 internal → 768 × 127/32 = 3048 = 304.8 mm
    expect(convertToSystem(768, 'imperial', 'metric')).toBe(3048);
  });
});

// =========================================================================
// Round-trip tests
// =========================================================================

describe('round-trips', () => {
  describe('parse → format (same unit)', () => {
    const cases: [string, DisplayUnit, string][] = [
      ['5', 'in', '5'],
      ['3 1/2', 'in', '3 1/2'],
      ['1/4', 'in', '1/4'],
      ['12 3/16', 'in', '12 3/16'],
      ['1200', 'mm', '1200'],
      ['1200.5', 'mm', '1200.5'],
      ['120', 'cm', '120'],
      ['1.2', 'm', '1.2'],
      ['0', 'mm', '0'],
      ['0', 'in', '0'],
      ['3.5', 'ft', "3' 6\""],
    ];

    for (const [input, unit, expected] of cases) {
      it(`"${input}" ${unit} → parse → format = "${expected}"`, () => {
        const parsed = parseLength(input, unit);
        expect(parsed.ok).toBe(true);
        if (parsed.ok) {
          expect(formatLength(parsed.value, unit)).toBe(expected);
        }
      });
    }
  });

  describe('cross-system (within ±1 internal unit)', () => {
    it('metric → imperial → metric', () => {
      const original = 10_000; // 1000 mm
      const imperial = convertToSystem(original, 'metric', 'imperial');
      const backToMetric = convertToSystem(imperial, 'imperial', 'metric');
      expect(Math.abs(backToMetric - original)).toBeLessThanOrEqual(1);
    });

    it('imperial → metric → imperial', () => {
      const original = 1000; // 1000/64 = 15.625 in
      const metric = convertToSystem(original, 'imperial', 'metric');
      const backToImperial = convertToSystem(metric, 'metric', 'imperial');
      expect(Math.abs(backToImperial - original)).toBeLessThanOrEqual(1);
    });

    it('1 inch round-trips exactly', () => {
      const imp = 64; // 1 inch
      const met = convertToSystem(imp, 'imperial', 'metric');
      expect(met).toBe(254); // 25.4 mm
      const back = convertToSystem(met, 'metric', 'imperial');
      expect(back).toBe(64);
    });

    it('1 foot round-trips exactly', () => {
      const imp = 768;
      const met = convertToSystem(imp, 'imperial', 'metric');
      expect(met).toBe(3048); // 304.8 mm
      const back = convertToSystem(met, 'metric', 'imperial');
      expect(back).toBe(768);
    });

    it('common lengths round-trip within tolerance', () => {
      // Two Math.round calls with the 127/32 ratio can compound up to ~2.5
      // internal-unit error for metric→imperial→metric (0.3 mm — no practical
      // impact). Imperial→metric→imperial stays within 1 (1/64 in ≈ 0.4 mm).
      const metricValues = [2400_0, 1200_0, 600_0, 300_0, 1]; // 2400, 1200, 600, 300, 0.1 mm
      for (const v of metricValues) {
        const imp = convertToSystem(v, 'metric', 'imperial');
        const back = convertToSystem(imp, 'imperial', 'metric');
        expect(Math.abs(back - v)).toBeLessThanOrEqual(3);
      }

      const imperialValues = [768, 384, 192, 96, 48, 1]; // 12, 6, 3, 1.5, 0.75 in, 1/64 in
      for (const v of imperialValues) {
        const met = convertToSystem(v, 'imperial', 'metric');
        const back = convertToSystem(met, 'metric', 'imperial');
        expect(Math.abs(back - v)).toBeLessThanOrEqual(1);
      }
    });
  });
});
