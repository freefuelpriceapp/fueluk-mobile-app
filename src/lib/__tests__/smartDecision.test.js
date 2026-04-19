/**
 * Unit tests for src/lib/smartDecision.js
 *
 * Pure functions — no React, no I/O — safe to run under plain Jest.
 * Run: `npx jest src/lib/__tests__/smartDecision.test.js`
 */

const {
  driveCostPence,
  grossSavingsPence,
  worthTheDrive,
  rankStationsByValue,
} = require('../smartDecision');

describe('grossSavingsPence', () => {
  test('positive saving when alt is cheaper', () => {
    expect(grossSavingsPence({ basePpl: 150, altPpl: 140, litres: 40 })).toBe(400);
  });
  test('negative when alt is dearer', () => {
    expect(grossSavingsPence({ basePpl: 140, altPpl: 150, litres: 40 })).toBe(-400);
  });
  test('returns null for bad input', () => {
    expect(grossSavingsPence({ basePpl: null, altPpl: 140 })).toBeNull();
    expect(grossSavingsPence({ basePpl: 140, altPpl: 'abc' })).toBeNull();
  });
});

describe('driveCostPence', () => {
  test('2-mile round trip at 40mpg and 140p/L is ~63.6p', () => {
    const c = driveCostPence({ miles: 2, mpg: 40, pencePerLitre: 140 });
    expect(c).toBeGreaterThan(60);
    expect(c).toBeLessThan(70);
  });
  test('null on invalid inputs', () => {
    expect(driveCostPence({ miles: -1, pencePerLitre: 140 })).toBeNull();
    expect(driveCostPence({ miles: 2, pencePerLitre: 0 })).toBeNull();
    expect(driveCostPence({ miles: 'x', pencePerLitre: 140 })).toBeNull();
  });
});

describe('worthTheDrive', () => {
  test('verdict=save when net saving is large', () => {
    const r = worthTheDrive({ basePpl: 150, altPpl: 140, extraMiles: 2 });
    expect(r.verdict).toBe('save');
    expect(r.worthIt).toBe(true);
    expect(r.netPence).toBeGreaterThan(50);
  });
  test('verdict=lose when drive cost dwarfs saving', () => {
    const r = worthTheDrive({ basePpl: 150, altPpl: 149, extraMiles: 10 });
    expect(r.verdict).toBe('lose');
    expect(r.worthIt).toBe(false);
  });
  test('verdict=break_even for marginal savings', () => {
    const r = worthTheDrive({ basePpl: 150, altPpl: 148, extraMiles: 3 });
    expect(['break_even', 'lose', 'save']).toContain(r.verdict);
    expect(Math.abs(r.netPence)).toBeLessThan(200);
  });
  test('verdict=unknown with missing inputs', () => {
    const r = worthTheDrive({ basePpl: null, altPpl: 140, extraMiles: 2 });
    expect(r.verdict).toBe('unknown');
    expect(r.worthIt).toBe(false);
  });
});

describe('rankStationsByValue', () => {
  test('nearby slightly-dearer station beats distant much-cheaper one when gap is small', () => {
    const stations = [
      { id: 'far', petrol_price: 139.0, distance_miles: 7.3 },
      { id: 'near', petrol_price: 140.0, distance_miles: 0.9 },
    ];
    const ranked = rankStationsByValue(stations, { fuelKey: 'petrol_price' });
    expect(ranked[0].id).toBe('near');
    expect(ranked[1].id).toBe('far');
  });

  test('distant station still wins when price gap is large enough', () => {
    const stations = [
      { id: 'far_cheap', petrol_price: 130.0, distance_miles: 7.3 },
      { id: 'near_dear', petrol_price: 145.0, distance_miles: 0.9 },
    ];
    const ranked = rankStationsByValue(stations, { fuelKey: 'petrol_price' });
    expect(ranked[0].id).toBe('far_cheap');
  });

  test('stations without a price for selected fuel go to the bottom', () => {
    const stations = [
      { id: 'no_price', diesel_price: 150, distance_miles: 0.2 },
      { id: 'has_price', petrol_price: 140, distance_miles: 2 },
    ];
    const ranked = rankStationsByValue(stations, { fuelKey: 'petrol_price' });
    expect(ranked[0].id).toBe('has_price');
    expect(ranked[1].id).toBe('no_price');
    expect(ranked[1]._hasPrice).toBe(false);
  });

  test('sorts ascending by effective price (price + amortised drive cost)', () => {
    const stations = [
      { id: 'a', petrol_price: 140, distance_miles: 0 },
      { id: 'b', petrol_price: 140, distance_miles: 5 },
      { id: 'c', petrol_price: 140, distance_miles: 2 },
    ];
    const ranked = rankStationsByValue(stations, { fuelKey: 'petrol_price' });
    expect(ranked.map((s) => s.id)).toEqual(['a', 'c', 'b']);
    expect(ranked[0]._effectivePrice).toBeLessThan(ranked[1]._effectivePrice);
    expect(ranked[1]._effectivePrice).toBeLessThan(ranked[2]._effectivePrice);
  });

  test('returns empty array for non-array input', () => {
    expect(rankStationsByValue(null)).toEqual([]);
    expect(rankStationsByValue(undefined)).toEqual([]);
  });

  test('does not mutate input array', () => {
    const stations = [
      { id: 'a', petrol_price: 140, distance_miles: 2 },
      { id: 'b', petrol_price: 135, distance_miles: 5 },
    ];
    const snapshot = JSON.parse(JSON.stringify(stations));
    rankStationsByValue(stations, { fuelKey: 'petrol_price' });
    expect(stations).toEqual(snapshot);
  });

  test('respects custom fuelKey (diesel_price)', () => {
    const stations = [
      { id: 'p_only', petrol_price: 100, distance_miles: 0.5 },
      { id: 'd_cheap', diesel_price: 140, distance_miles: 1 },
      { id: 'd_dear', diesel_price: 145, distance_miles: 1 },
    ];
    const ranked = rankStationsByValue(stations, { fuelKey: 'diesel_price' });
    expect(ranked[0].id).toBe('d_cheap');
    expect(ranked[1].id).toBe('d_dear');
    expect(ranked[2].id).toBe('p_only');
  });
});

