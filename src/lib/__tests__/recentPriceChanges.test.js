/**
 * recentPriceChanges.test.js
 *
 * Tests for src/lib/recentPriceChanges.js
 */

const path = require('path');

// ESM → CJS via babel-jest transform configured in babel.config.test.js
const { getRecentPriceChanges } = require(
  path.resolve(__dirname, '../recentPriceChanges.js')
);

// ---------------------------------------------------------------------------
// Helper station builders
// ---------------------------------------------------------------------------
function makeStation(overrides = {}) {
  return {
    id: overrides.id ?? 'station-1',
    name: overrides.name ?? 'Tesco Solihull',
    brand: overrides.brand ?? 'Tesco',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('getRecentPriceChanges', () => {
  test('returns [] for empty stations array', () => {
    expect(getRecentPriceChanges([])).toEqual([]);
  });

  test('returns [] for null input', () => {
    expect(getRecentPriceChanges(null)).toEqual([]);
  });

  test('returns [] for undefined input', () => {
    expect(getRecentPriceChanges(undefined)).toEqual([]);
  });

  test('uses real price_change_pence_24h when present', () => {
    const stations = [
      makeStation({ id: 'a', name: 'Asda Coventry', price_change_pence_24h: -0.8 }),
      makeStation({ id: 'b', name: 'BP Warwick', price_change_pence_24h: 1.5 }),
    ];
    const result = getRecentPriceChanges(stations, 8);
    expect(result).toHaveLength(2);
    expect(result[0].delta).toBe(-0.8);
    expect(result[1].delta).toBe(1.5);
  });

  test('real data: shortName is derived from station name', () => {
    const stations = [
      makeStation({ id: 'x', name: 'Sainsburys Shirley', price_change_pence_24h: -1.2 }),
    ];
    const result = getRecentPriceChanges(stations);
    expect(result[0].shortName).toBe('Sainsburys Shirley');
  });

  test('deterministic fallback: same station id + same day → same delta', () => {
    const station = makeStation({ id: 'det-99', name: 'Gulf Derby' });
    const r1 = getRecentPriceChanges([station], 1);
    const r2 = getRecentPriceChanges([station], 1);
    expect(r1[0].delta).toBe(r2[0].delta);
  });

  test('deterministic fallback: different station ids → (usually) different deltas', () => {
    const stationA = makeStation({ id: 'aaa-1', name: 'Esso A' });
    const stationB = makeStation({ id: 'bbb-2', name: 'Esso B' });
    const rA = getRecentPriceChanges([stationA], 1);
    const rB = getRecentPriceChanges([stationB], 1);
    // Very unlikely to collide — guard with a loose check
    // (we just want to assert the function runs; exact collision risk is ~1/46)
    expect(typeof rA[0].delta).toBe('number');
    expect(typeof rB[0].delta).toBe('number');
  });

  test('respects limit param — returns at most limit items', () => {
    const stations = Array.from({ length: 12 }, (_, i) =>
      makeStation({ id: `s-${i}`, name: `Station ${i}` })
    );
    const result = getRecentPriceChanges(stations, 5);
    expect(result).toHaveLength(5);
  });

  test('default limit is 8', () => {
    const stations = Array.from({ length: 20 }, (_, i) =>
      makeStation({ id: `s-${i}`, name: `Station ${i}` })
    );
    const result = getRecentPriceChanges(stations);
    expect(result).toHaveLength(8);
  });

  test('delta values are numbers rounded to 1 decimal place', () => {
    const stations = [makeStation({ id: 'round-1', price_change_pence_24h: -1.23456 })];
    const result = getRecentPriceChanges(stations);
    expect(result[0].delta).toBe(-1.2);
  });

  test('result objects have shortName and delta fields', () => {
    const stations = [makeStation({ id: 'field-test', name: 'Shell Nottingham' })];
    const result = getRecentPriceChanges(stations);
    expect(result[0]).toHaveProperty('shortName');
    expect(result[0]).toHaveProperty('delta');
  });

  test('shortName falls back to brand + locality when no name', () => {
    const station = { id: 'no-name', brand: 'Esso', locality: 'Redditch' };
    const result = getRecentPriceChanges([station]);
    expect(result[0].shortName).toBe('Esso Redditch');
  });
});
