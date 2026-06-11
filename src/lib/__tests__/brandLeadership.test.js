/**
 * Unit tests for src/lib/brandLeadership.js
 * Run: `npx jest src/lib/__tests__/brandLeadership.test.js`
 */

const { rankBrands, cheapestBrand, cheapestStationBrand } = require('../brandLeadership');

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

describe('cheapestStationBrand', () => {
  test('picks the brand of the single absolute-cheapest station, not brand-average', () => {
    // One Asda site is the absolute cheapest, even though Gulf's *average*
    // across its two stations is lower than Asda's average.
    const mixed = [
      { brand: 'Gulf', prices: { petrol: 138 } },
      { brand: 'Gulf', prices: { petrol: 140 } }, // Gulf avg = 139
      { brand: 'Asda', prices: { petrol: 137 } }, // single cheapest pin
      { brand: 'Asda', prices: { petrol: 145 } }, // Asda avg = 141
    ];
    const w = cheapestStationBrand(mixed, 'petrol');
    expect(w.brand).toBe('Asda');
    expect(w.ppl).toBe(137);
    expect(w.leadByPence).toBe(1); // 138 - 137
  });

  test('ignores quarantined stations', () => {
    const stns = [
      { brand: 'Shell', is_quarantined: true, prices: { petrol: 100 } },
      { brand: 'BP', prices: { petrol: 150 } },
    ];
    const w = cheapestStationBrand(stns, 'petrol');
    expect(w.brand).toBe('BP');
  });

  test('returns null when nothing priceable', () => {
    expect(cheapestStationBrand([{ brand: 'X', prices: {} }], 'petrol')).toBeNull();
    expect(cheapestStationBrand([], 'petrol')).toBeNull();
    expect(cheapestStationBrand(null, 'petrol')).toBeNull();
  });

  test('returns null when only station has Unknown brand', () => {
    expect(cheapestStationBrand([{ prices: { petrol: 130 } }], 'petrol')).toBeNull();
  });
});

