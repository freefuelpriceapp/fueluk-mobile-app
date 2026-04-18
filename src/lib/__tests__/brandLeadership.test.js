/**
 * Unit tests for src/lib/brandLeadership.js
 * Run: `npx jest src/lib/__tests__/brandLeadership.test.js`
 */

const { rankBrands, cheapestBrand } = require('../brandLeadership');

const stations = [
  { brand: 'Tesco', prices: { petrol: 139 } },
  { brand: 'Tesco', prices: { petrol: 141 } },
  { brand: 'BP', prices: { petrol: 150 } },
  { brand: 'Shell', prices: { petrol: 148 } },
  { brand: 'Shell', is_quarantined: true, prices: { petrol: 10 } },
  { brand: 'Unknown co', prices: {} },
];

describe('rankBrands', () => {
  test('returns [] for empty input', () => {
    expect(rankBrands([], 'petrol')).toEqual([]);
    expect(rankBrands(null, 'petrol')).toEqual([]);
  });
  test('sorts ascending by avgPpl', () => {
    const r = rankBrands(stations, 'petrol');
    const brands = r.map((x) => x.brand);
    expect(brands[0]).toBe('Tesco');
    expect(brands).toContain('BP');
    expect(brands).toContain('Shell');
  });
  test('ignores quarantined prices in avg', () => {
    const r = rankBrands(stations, 'petrol');
    const shell = r.find((x) => x.brand === 'Shell');
    expect(shell.avgPpl).toBe(148);
    expect(shell.count).toBe(2);
  });
  test('unpriced brand ranks last with null avg', () => {
    const r = rankBrands(stations, 'petrol');
    const last = r[r.length - 1];
    expect(last.avgPpl).toBeNull();
  });
});

describe('cheapestBrand', () => {
  test('picks the brand with lowest avgPpl', () => {
    const w = cheapestBrand(stations, 'petrol');
    expect(w.brand).toBe('Tesco');
    expect(w.avgPpl).toBe(140);
    expect(w.leadByPence).toBeGreaterThan(0);
  });
  test('returns null when nothing rankable', () => {
    expect(cheapestBrand([{ brand: 'X', prices: {} }], 'petrol')).toBeNull();
    expect(cheapestBrand([], 'petrol')).toBeNull();
  });
});

