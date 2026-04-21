const { formatPencePrice, parsePrice, isPlausiblePrice } = require('../price');

describe('parsePrice', () => {
  test('normalises wire-format tenths-of-pence above 1000', () => {
    expect(parsePrice(1374)).toBeCloseTo(137.4, 5);
    expect(parsePrice(1666)).toBeCloseTo(166.6, 5);
    expect(parsePrice(2499)).toBeCloseTo(249.9, 5);
  });

  test('passes through plausible pence values unchanged', () => {
    expect(parsePrice(137.4)).toBe(137.4);
    expect(parsePrice(80)).toBe(80);
    expect(parsePrice(250)).toBe(250);
  });

  test('multiplies plausible pound values by 100', () => {
    expect(parsePrice(1.374)).toBeCloseTo(137.4, 5);
    expect(parsePrice(2.5)).toBeCloseTo(250, 5);
    expect(parsePrice(0.8)).toBeCloseTo(80, 5);
  });

  test('accepts string numerics', () => {
    expect(parsePrice('1374')).toBeCloseTo(137.4, 5);
    expect(parsePrice('137.4')).toBe(137.4);
    expect(parsePrice(' 137.4 ')).toBe(137.4);
  });

  test('rejects values outside all plausible ranges', () => {
    expect(parsePrice(0)).toBeNull();
    expect(parsePrice(10)).toBeNull();
    expect(parsePrice(70)).toBeNull();        // below pence min, above pound max
    expect(parsePrice(260)).toBeNull();       // above pence max, below wire-tenths min
    expect(parsePrice(500)).toBeNull();       // same
    expect(parsePrice(2600)).toBeCloseTo(260, 5); // passes parsePrice but fails isPlausible
  });

  test('returns null for nullish / NaN / garbage input', () => {
    expect(parsePrice(null)).toBeNull();
    expect(parsePrice(undefined)).toBeNull();
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('abc')).toBeNull();
    expect(parsePrice(NaN)).toBeNull();
    expect(parsePrice({})).toBeNull();
    expect(parsePrice([])).toBeNull();
  });
});

describe('isPlausiblePrice', () => {
  test('accepts values within the UK forecourt range after normalisation', () => {
    expect(isPlausiblePrice(1374)).toBe(true);
    expect(isPlausiblePrice(137.4)).toBe(true);
    expect(isPlausiblePrice(1.374)).toBe(true);
  });

  test('rejects wire values that normalise above 250', () => {
    expect(isPlausiblePrice(2600)).toBe(false);
    expect(isPlausiblePrice(9999)).toBe(false);
  });

  test('rejects null / garbage', () => {
    expect(isPlausiblePrice(null)).toBe(false);
    expect(isPlausiblePrice(undefined)).toBe(false);
    expect(isPlausiblePrice('junk')).toBe(false);
  });
});

describe('formatPencePrice', () => {
  test('formats wire-format tenths to the "137.4p" display string', () => {
    expect(formatPencePrice(1374)).toBe('137.4p');
    expect(formatPencePrice(1666)).toBe('166.6p');
  });

  test('formats plausible pence values', () => {
    expect(formatPencePrice(137.4)).toBe('137.4p');
    expect(formatPencePrice(137)).toBe('137.0p');
  });

  test('formats pounds correctly', () => {
    expect(formatPencePrice(1.374)).toBe('137.4p');
    expect(formatPencePrice(1.99)).toBe('199.0p');
  });

  test('returns null for implausible prices so the caller can hide the marker', () => {
    expect(formatPencePrice(null)).toBeNull();
    expect(formatPencePrice(undefined)).toBeNull();
    expect(formatPencePrice('nope')).toBeNull();
    expect(formatPencePrice(2600)).toBeNull(); // normalises to 260, out of range
    expect(formatPencePrice(10)).toBeNull();
    expect(formatPencePrice(NaN)).toBeNull();
  });

  test('never emits a bare number like "1374" or "1666"', () => {
    const outputs = [1374, 1666, 1500, 999, 1200].map(formatPencePrice);
    for (const o of outputs) {
      if (o !== null) {
        expect(o).toMatch(/^\d{2,3}\.\d[p]$/);
        expect(o).not.toBe('1374');
        expect(o).not.toBe('1666');
      }
    }
  });
});
