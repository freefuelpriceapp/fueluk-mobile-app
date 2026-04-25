const { sparklinePath, sparklineDirection } = require('../sparkline');

describe('sparklinePath', () => {
  test('returns null for non-array input', () => {
    expect(sparklinePath(null)).toBeNull();
    expect(sparklinePath(undefined)).toBeNull();
    expect(sparklinePath('bad')).toBeNull();
    expect(sparklinePath(42)).toBeNull();
  });

  test('returns null when fewer than 2 finite values', () => {
    expect(sparklinePath([])).toBeNull();
    expect(sparklinePath([1])).toBeNull();
    expect(sparklinePath([NaN, NaN])).toBeNull();
    expect(sparklinePath([1, NaN])).toBeNull();
  });

  test('produces a path starting with M and using L for subsequent', () => {
    const p = sparklinePath([1, 2, 3], { width: 60, height: 16 });
    expect(p).toMatch(/^M /);
    expect(p.match(/L /g).length).toBe(2);
  });

  test('rising series: first y > last y (svg y is inverted)', () => {
    const p = sparklinePath([1, 2, 3], { width: 60, height: 16, inset: 2 });
    const points = p.split(/[ML]\s+/).filter(Boolean);
    const firstY = parseFloat(points[0].split(/\s+/)[1]);
    const lastY = parseFloat(points[points.length - 1].split(/\s+/)[1]);
    expect(firstY).toBeGreaterThan(lastY);
  });

  test('falling series: first y < last y', () => {
    const p = sparklinePath([3, 2, 1], { width: 60, height: 16 });
    const points = p.split(/[ML]\s+/).filter(Boolean);
    const firstY = parseFloat(points[0].split(/\s+/)[1]);
    const lastY = parseFloat(points[points.length - 1].split(/\s+/)[1]);
    expect(firstY).toBeLessThan(lastY);
  });

  test('flat series renders horizontal line at vertical centre', () => {
    const p = sparklinePath([5, 5, 5, 5], { width: 60, height: 16 });
    const ys = p.split(/[ML]\s+/).filter(Boolean).map((seg) => parseFloat(seg.split(/\s+/)[1]));
    const centre = 16 / 2;
    ys.forEach((y) => expect(y).toBe(centre));
  });

  test('respects width — last x equals width', () => {
    const p = sparklinePath([1, 2, 3, 4, 5], { width: 80, height: 16 });
    const segments = p.split(/[ML]\s+/).filter(Boolean);
    const lastX = parseFloat(segments[segments.length - 1].split(/\s+/)[0]);
    expect(lastX).toBe(80);
  });

  test('first x is zero', () => {
    const p = sparklinePath([1, 2, 3], { width: 60, height: 16 });
    const firstX = parseFloat(p.split(/\s+/)[1]);
    expect(firstX).toBe(0);
  });

  test('respects inset — values stay within [inset, height-inset]', () => {
    const p = sparklinePath([1, 5, 10], { width: 60, height: 16, inset: 2 });
    const ys = p.split(/[ML]\s+/).filter(Boolean).map((seg) => parseFloat(seg.split(/\s+/)[1]));
    ys.forEach((y) => {
      expect(y).toBeGreaterThanOrEqual(2);
      expect(y).toBeLessThanOrEqual(14);
    });
  });

  test('default size is 60x16', () => {
    const p = sparklinePath([1, 2, 3]);
    const segments = p.split(/[ML]\s+/).filter(Boolean);
    const lastX = parseFloat(segments[segments.length - 1].split(/\s+/)[0]);
    expect(lastX).toBe(60);
  });

  test('minimum 3-point series works (spec: even 3 points is enough)', () => {
    const p = sparklinePath([141.2, 140.5, 138.9]);
    expect(p).not.toBeNull();
    expect(p.match(/[ML]/g).length).toBe(3);
  });

  test('non-positive width / height fall back to defaults', () => {
    const p = sparklinePath([1, 2, 3], { width: -10, height: 0 });
    expect(p).not.toBeNull();
  });

  test('filters non-finite values', () => {
    const p = sparklinePath([1, NaN, 2, Infinity, 3]);
    expect(p).not.toBeNull();
    expect(p.match(/[ML]/g).length).toBe(3);
  });
});

describe('sparklineDirection', () => {
  test('rising', () => {
    expect(sparklineDirection([100, 102, 105])).toBe('rising');
  });

  test('falling', () => {
    expect(sparklineDirection([141.2, 140.0, 138.9])).toBe('falling');
  });

  test('stable when small noise', () => {
    expect(sparklineDirection([140.0, 140.1, 140.2])).toBe('stable');
  });

  test('stable when first equals last exactly', () => {
    expect(sparklineDirection([140.0, 138.0, 142.0, 140.0])).toBe('stable');
  });

  test('returns null when fewer than 2 finite values', () => {
    expect(sparklineDirection([])).toBeNull();
    expect(sparklineDirection([1])).toBeNull();
    expect(sparklineDirection(null)).toBeNull();
  });

  test('custom stable threshold', () => {
    expect(sparklineDirection([140, 141], { stableThreshold: 2 })).toBe('stable');
    expect(sparklineDirection([140, 141], { stableThreshold: 0.5 })).toBe('rising');
  });
});
