/**
 * Wave A.4 — E10 default everywhere.
 *
 * Two collisions between PR #53 (Wave A.3 unleaded=min(E10,E5)) and PR #55
 * (taxonomy unification) silently re-introduced the original bug:
 *
 *   1. fuelTaxonomy.BACKEND_FIELD_FOR_KEY['unleaded'] = 'petrol_price'
 *      → any caller looking up a single column for 'unleaded' got E5,
 *        not the cheaper-of-both, which buried E10-only stations.
 *   2. fuelApi.wireFuelType('unleaded') = 'petrol'
 *      → the backend ranked nearby/cheapest results by E5 price; the
 *        cheaper E10 stations could be truncated out of the top-N.
 *
 * These tests pin the fix:
 *   - BACKEND_FIELD_FOR_KEY['unleaded'] is null (fail-loud).
 *   - resolvePriceForKey routes 'unleaded' through resolveUnleadedPrice.
 *   - wireFuelType('unleaded') === 'e10'.
 *   - The Asda B10 0HH (e10-only) vs Esso ASDA Aston Way (E5-only)
 *     scenario sorts cheapest-first at every entry point: client list
 *     ranking, smart-decision ranker, BestOption fallback.
 */

const {
  resolveUnleadedPrice,
  resolvePriceForKey,
} = require('../fuelResolution');
const { BACKEND_FIELD_FOR_KEY } = require('../fuelTaxonomy');
const { rankStationsByValue } = require('../smartDecision');
const { pickFallbackBest } = require('../bestOption');
const { wireFuelType } = require('../../api/wireFuelType');

const FRESH = new Date().toISOString();
const base = { last_updated: FRESH };

const asdaB10 = {
  ...base,
  id: 'asda-b10',
  name: 'Asda B10 0HH',
  brand: 'Asda',
  e10_price: 151.9,
  petrol_price: null,
  distance_km: 1.2,
  distance_miles: 0.75,
};

const essoAstonWay = {
  ...base,
  id: 'esso-aston-way',
  name: 'Esso ASDA Aston Way',
  brand: 'Esso',
  e10_price: null,
  petrol_price: 178.9,
  distance_km: 1.0,
  distance_miles: 0.62,
};

describe('Wave A.4 — BACKEND_FIELD_FOR_KEY.unleaded is null', () => {
  test('unleaded has no single backend field — callers must use the resolver', () => {
    expect(BACKEND_FIELD_FOR_KEY.unleaded).toBeNull();
  });

  test('single-grade keys still map directly', () => {
    expect(BACKEND_FIELD_FOR_KEY.super_unleaded).toBe('super_unleaded_price');
    expect(BACKEND_FIELD_FOR_KEY.diesel).toBe('diesel_price');
    expect(BACKEND_FIELD_FOR_KEY.premium_diesel).toBe('premium_diesel_price');
    expect(BACKEND_FIELD_FOR_KEY.e10).toBe('e10_price');
  });
});

describe('Wave A.4 — resolvePriceForKey covers every key', () => {
  test('unleaded picks the cheaper of E10/E5 (min)', () => {
    expect(resolvePriceForKey({ ...base, e10_price: 150, petrol_price: 160 }, 'unleaded'))
      .toBe(150);
    // The case the user reported: E5-cheaper than E10 (rare but possible).
    expect(resolvePriceForKey({ ...base, e10_price: 165, petrol_price: 155 }, 'unleaded'))
      .toBe(155);
  });

  test('unleaded falls back gracefully when only one column is filled', () => {
    expect(resolvePriceForKey(asdaB10, 'unleaded')).toBe(151.9);
    expect(resolvePriceForKey(essoAstonWay, 'unleaded')).toBe(178.9);
  });

  test('diesel reads diesel_price', () => {
    expect(resolvePriceForKey({ ...base, diesel_price: 165 }, 'diesel')).toBe(165);
  });

  test('premium_diesel reads premium_diesel_price', () => {
    expect(resolvePriceForKey({ ...base, premium_diesel_price: 175 }, 'premium_diesel')).toBe(175);
  });

  test('super_unleaded reads super_unleaded_price', () => {
    expect(resolvePriceForKey({ ...base, super_unleaded_price: 185 }, 'super_unleaded')).toBe(185);
  });

  test('null station / empty key are safe', () => {
    expect(resolvePriceForKey(null, 'unleaded')).toBeNull();
    expect(resolvePriceForKey({}, '')).toBeNull();
    expect(resolvePriceForKey({ e10_price: 150 }, 'unknown_grade')).toBeNull();
  });
});

describe('Wave A.4 — wireFuelType maps unleaded → e10', () => {
  test('unleaded → e10 (was: petrol/E5)', () => {
    expect(wireFuelType('unleaded')).toBe('e10');
  });

  test('every other fuel type passes through untouched', () => {
    expect(wireFuelType('diesel')).toBe('diesel');
    expect(wireFuelType('e10')).toBe('e10');
    expect(wireFuelType('petrol')).toBe('petrol');
    expect(wireFuelType('super_unleaded')).toBe('super_unleaded');
    expect(wireFuelType('premium_diesel')).toBe('premium_diesel');
  });
});

describe('Wave A.4 — Asda B10 0HH vs Esso ASDA Aston Way regression', () => {
  // Bug report: with fuel filter = 'unleaded' the Esso (E5 178.9p) was
  // ranking ahead of the Asda (E10 151.9p). Asda must come first at every
  // entry point.

  test('resolveUnleadedPrice gives Asda the lower number', () => {
    expect(resolveUnleadedPrice(asdaB10)).toBe(151.9);
    expect(resolveUnleadedPrice(essoAstonWay)).toBe(178.9);
  });

  test('client-side cheapest-first sort puts Asda first', () => {
    const sorted = [essoAstonWay, asdaB10]
      .map((s) => ({ s, p: resolveUnleadedPrice(s) }))
      .sort((a, b) => a.p - b.p)
      .map(({ s }) => s.id);
    expect(sorted[0]).toBe('asda-b10');
    expect(sorted[1]).toBe('esso-aston-way');
  });

  test('rankStationsByValue with priceFn=resolveUnleadedPrice puts Asda first', () => {
    const ranked = rankStationsByValue(
      [essoAstonWay, asdaB10],
      { priceFn: resolveUnleadedPrice },
    );
    expect(ranked[0].id).toBe('asda-b10');
    expect(ranked[1].id).toBe('esso-aston-way');
  });

  test('rankStationsByValue WITHOUT resolver — confirms the bug we just fixed', () => {
    // Sanity-check: if a future regression made a caller hand a single
    // wire field (e.g. petrol_price=E5) for 'unleaded', the Esso would
    // rank ahead of the Asda. This is exactly what we no longer do.
    const ranked = rankStationsByValue(
      [essoAstonWay, asdaB10],
      { fuelKey: 'petrol_price' },
    );
    // Esso is the only one with a petrol_price → it ranks first under
    // the buggy path. Asda has _hasPrice=false and goes to the bottom.
    expect(ranked[0].id).toBe('esso-aston-way');
  });

  test('BestOption fallback for unleaded picks Asda by lowest resolved price', () => {
    const best = pickFallbackBest([essoAstonWay, asdaB10], 'unleaded');
    expect(best && best.id).toBe('asda-b10');
  });
});

describe('Wave A.4 — petrol-family chip ordering by price', () => {
  // StationDetailScreen renders [E10, E5, diesel, premiumDiesel] by
  // default, but at render time sorts the petrol family by price. Pin
  // that the sort produces cheapest-first regardless of which input
  // ordering the FUEL_DISPLAY array uses.
  test('cheaper E10 renders before pricier E5', () => {
    const station = { ...base, e10_price: 151.9, petrol_price: 178.9 };
    const FUEL_DISPLAY = [
      { key: 'e10',    field: 'e10_price' },
      { key: 'petrol', field: 'petrol_price' },
    ];
    const sorted = FUEL_DISPLAY
      .slice()
      .sort((a, b) => Number(station[a.field]) - Number(station[b.field]))
      .map((f) => f.key);
    expect(sorted).toEqual(['e10', 'petrol']);
  });

  test('cheaper E5 renders before pricier E10 (the rare independent case)', () => {
    const station = { ...base, e10_price: 175.0, petrol_price: 162.9 };
    const FUEL_DISPLAY = [
      { key: 'e10',    field: 'e10_price' },
      { key: 'petrol', field: 'petrol_price' },
    ];
    const sorted = FUEL_DISPLAY
      .slice()
      .sort((a, b) => Number(station[a.field]) - Number(station[b.field]))
      .map((f) => f.key);
    expect(sorted).toEqual(['petrol', 'e10']);
  });
});
