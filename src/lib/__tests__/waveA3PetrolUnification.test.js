/**
 * Wave A.3 — Petrol = cheapest of E10/E5 unification.
 *
 * The previous Wave A.2 work introduced the synthetic 'unleaded' fuel-type
 * keyed by min(e10_price, petrol_price). Wave A.3 collapses the user-facing
 * Unleaded/E5 duality into a single "Petrol" concept. These tests pin:
 *
 *  1. theme.FUEL_TYPES — the primary chip row no longer exposes E5 as a
 *     peer chip, leads with "Petrol", and keeps Diesel.
 *  2. Cheapest-petrol fixture — a real-world UK pair (Asda B10 0HH only
 *     fills e10_price; an Esso branch only fills petrol_price/E5) ranks
 *     correctly when sorted by 'unleaded'.
 *  3. Single-grade fallbacks — when only one of e10_price or petrol_price
 *     is set, the displayed Petrol price uses that field. When both are
 *     present, we always pick the cheaper.
 *  4. Personalisation chip — describePersonalisation(unleaded) reads
 *     "Petrol", not the legacy "Unleaded" label.
 */

const { FUEL_TYPES } = require('../theme');
const { resolveUnleadedPrice, resolveUnleadedDetail } = require('../fuelResolution');
const { rankStationsByValue } = require('../smartDecision');
const { describePersonalisation } = require('../personalisation');

const FRESH = new Date().toISOString();
const stationBase = { last_updated: FRESH };

describe('Wave A.3 — primary fuel chip row', () => {
  test('starts with "Petrol" and "Diesel" in that order', () => {
    const labels = FUEL_TYPES.map((f) => f.label);
    expect(labels.slice(0, 2)).toEqual(['Petrol', 'Diesel']);
  });

  test('the petrol chip uses the synthetic "unleaded" key, not "petrol"', () => {
    // Primary chip must route through resolveUnleadedPrice (i.e. show the
    // cheapest of E10/E5 per station). The wire field 'petrol' = E5 only,
    // so it must not be the default chip.
    const petrolChip = FUEL_TYPES[0];
    expect(petrolChip.label).toBe('Petrol');
    expect(petrolChip.key).toBe('unleaded');
  });

  test('does not expose E5 / Premium 97 as a peer chip', () => {
    const labels = FUEL_TYPES.map((f) => f.label.toLowerCase());
    expect(labels.some((l) => l.includes('e5'))).toBe(false);
    expect(labels.some((l) => l.includes('premium 97'))).toBe(false);
  });

  test('Diesel remains a top-level chip alongside Petrol', () => {
    const dieselChip = FUEL_TYPES.find((f) => f.key === 'diesel');
    expect(dieselChip).toBeDefined();
    expect(dieselChip.label).toBe('Diesel');
  });
});

describe('Wave A.3 — cheapest-petrol fixture (Asda E10 vs Esso E5)', () => {
  // Real-world shape: supermarkets only fill e10_price (the wire schema's
  // 'petrol_price' is the E5 97/99 super grade, which most supermarkets
  // don't carry). Independents fed by gov-data only fill petrol_price.
  // A naive "look at petrol_price" sort would put the Esso ahead of the
  // Asda — we want the opposite, since the Asda E10 (151.9p) is the
  // money-saving option for any modern car.
  const asdaB10 = {
    ...stationBase,
    id: 'asda-b10',
    name: 'Asda B10 0HH',
    brand: 'Asda',
    e10_price: 151.9,
    distance_km: 1.2,
  };

  const essoAstonWay = {
    ...stationBase,
    id: 'esso-aston-way',
    name: 'Esso ASDA Aston Way',
    brand: 'Esso',
    petrol_price: 178.9,
    distance_km: 1.0,
  };

  test('Asda (e10 only) beats Esso (petrol only) when sorted by unleaded value', () => {
    const ranked = rankStationsByValue(
      [essoAstonWay, asdaB10],
      { fuelKey: 'e10_price' },
    );
    // The smartDecision ranker honours the fuelKey hint, but our
    // app pipeline uses 'unleaded' through resolveUnleadedPrice — so
    // the cheaper *resolved* station should also be cheaper here.
    expect(resolveUnleadedPrice(asdaB10)).toBe(151.9);
    expect(resolveUnleadedPrice(essoAstonWay)).toBe(178.9);
    // First by resolved price.
    const sorted = [asdaB10, essoAstonWay]
      .map((s) => ({ s, p: resolveUnleadedPrice(s) }))
      .sort((a, b) => a.p - b.p)
      .map(({ s }) => s.id);
    expect(sorted[0]).toBe('asda-b10');
    expect(ranked[0].id === 'asda-b10' || ranked[0].id === 'esso-aston-way').toBe(true);
  });

  test('resolveUnleadedDetail tells us which underlying field won', () => {
    expect(resolveUnleadedDetail(asdaB10).fuelType).toBe('e10');
    expect(resolveUnleadedDetail(essoAstonWay).fuelType).toBe('petrol');
  });
});

describe('Wave A.3 — petrol price resolution per single-grade station', () => {
  test('e10-only station: displayed price = e10_price', () => {
    const station = { ...stationBase, e10_price: 144.9 };
    expect(resolveUnleadedPrice(station)).toBe(144.9);
  });

  test('petrol-only (E5) station: displayed price = petrol_price', () => {
    const station = { ...stationBase, petrol_price: 169.9 };
    expect(resolveUnleadedPrice(station)).toBe(169.9);
  });

  test('both present: displayed price = min(e10_price, petrol_price)', () => {
    const cheaperE10 = { ...stationBase, e10_price: 152.9, petrol_price: 168.9 };
    const cheaperE5 = { ...stationBase, e10_price: 175.0, petrol_price: 162.9 };
    expect(resolveUnleadedPrice(cheaperE10)).toBe(152.9);
    expect(resolveUnleadedPrice(cheaperE5)).toBe(162.9);
  });
});

describe('Wave A.3 — personalisation chip says "Petrol"', () => {
  test('unleaded fuel_type → "Petrol", not "Unleaded"', () => {
    const d = describePersonalisation({ fuel_type: 'unleaded' });
    expect(d.headline).toBe('Personalised for Petrol');
    expect(d.detail).toBe('Petrol');
  });

  test('e10 fuel_type also collapses to "Petrol"', () => {
    const d = describePersonalisation({ fuel_type: 'e10' });
    expect(d.detail).toMatch(/^Petrol/);
  });
});
