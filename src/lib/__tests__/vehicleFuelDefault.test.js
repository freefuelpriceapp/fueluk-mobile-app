/**
 * Wave A.5 — vehicleFuelDefault.recommendedFuelKey matrix.
 *
 * Pins:
 *   - Modern petrol (post-2011) → 'unleaded' (E10-safe)
 *   - Old petrol (<2011)        → 'super_unleaded' (E5)
 *   - Diesel                    → 'diesel'
 *   - Hybrid                    → 'unleaded'
 *   - Electric                  → null
 *   - Unknown / null vehicle    → 'unleaded' (modal-driver fallback)
 *   - The actual NJ69DDF Audi A3 (2019, PETROL) → 'unleaded'
 */

const {
  recommendedFuelKey,
  alertFuelKeyFor,
  recommendedReason,
} = require('../vehicleFuelDefault');

describe('recommendedFuelKey — branch matrix', () => {
  test('modern petrol Audi A3 (NJ69DDF, 2019) → unleaded', () => {
    expect(
      recommendedFuelKey({
        reg: 'NJ69DDF',
        fuel_type_detailed: 'PETROL',
        engine_capacity_cc: 1498,
        monthOfFirstRegistration: '2019-09',
        make: 'Audi',
        model: 'A3',
      }),
    ).toBe('unleaded');
  });

  test('post-2011 petrol → unleaded', () => {
    expect(
      recommendedFuelKey({ fuel_type_detailed: 'PETROL', monthOfFirstRegistration: '2011-01' }),
    ).toBe('unleaded');
    expect(
      recommendedFuelKey({ fuel_type_detailed: 'PETROL', monthOfFirstRegistration: '2024-06' }),
    ).toBe('unleaded');
  });

  test('pre-2011 petrol → super_unleaded (E5)', () => {
    expect(
      recommendedFuelKey({ fuel_type_detailed: 'PETROL', monthOfFirstRegistration: '2008-04' }),
    ).toBe('super_unleaded');
    expect(
      recommendedFuelKey({ fuel_type_detailed: 'PETROL', year: 1995 }),
    ).toBe('super_unleaded');
  });

  test('diesel → diesel (regardless of year)', () => {
    expect(
      recommendedFuelKey({ fuel_type_detailed: 'DIESEL', monthOfFirstRegistration: '2017-03' }),
    ).toBe('diesel');
    expect(
      recommendedFuelKey({ fuel_type_detailed: 'DIESEL', monthOfFirstRegistration: '2003-11' }),
    ).toBe('diesel');
  });

  test('hybrid (PETROL/ELECTRIC) → unleaded', () => {
    expect(
      recommendedFuelKey({ fuel_type_detailed: 'HYBRID', monthOfFirstRegistration: '2020-01' }),
    ).toBe('unleaded');
    expect(
      recommendedFuelKey({ fuel_type_detailed: 'PETROL/ELECTRIC' }),
    ).toBe('unleaded');
  });

  test('plug-in hybrid (PHEV) → unleaded', () => {
    expect(recommendedFuelKey({ fuel_type_detailed: 'PHEV' })).toBe('unleaded');
  });

  test('electric / BEV → null (no fuel filter applies)', () => {
    expect(recommendedFuelKey({ fuel_type_detailed: 'ELECTRIC' })).toBeNull();
    expect(recommendedFuelKey({ fuel_type_detailed: 'EV' })).toBeNull();
    expect(recommendedFuelKey({ fuel_type_detailed: 'BEV' })).toBeNull();
  });

  test('unknown / missing fuel type → unleaded (modal UK driver fallback)', () => {
    expect(recommendedFuelKey({})).toBe('unleaded');
    expect(recommendedFuelKey({ fuel_type_detailed: 'HYDROGEN' })).toBe('unleaded');
    expect(recommendedFuelKey({ make: 'Ford', model: 'Mondeo' })).toBe('unleaded');
  });

  test('null / undefined vehicle → unleaded (no-vehicle fallback)', () => {
    expect(recommendedFuelKey(null)).toBe('unleaded');
    expect(recommendedFuelKey(undefined)).toBe('unleaded');
    expect(recommendedFuelKey('not-an-object')).toBe('unleaded');
  });

  test('legacy fuel_type field is honoured when fuel_type_detailed missing', () => {
    expect(
      recommendedFuelKey({ fuel_type: 'diesel', monthOfFirstRegistration: '2016-01' }),
    ).toBe('diesel');
    expect(
      recommendedFuelKey({ fuel_type: 'petrol', monthOfFirstRegistration: '2016-01' }),
    ).toBe('unleaded');
  });

  test('year derives from monthOfFirstRegistration when present, else year field', () => {
    expect(
      recommendedFuelKey({ fuel_type_detailed: 'PETROL', year: 2008 }),
    ).toBe('super_unleaded');
    expect(
      recommendedFuelKey({ fuel_type_detailed: 'PETROL', year: '2015' }),
    ).toBe('unleaded');
  });
});

describe('alertFuelKeyFor — alert-table mapping', () => {
  test('unleaded maps to e10 (the alert table is per-grade)', () => {
    expect(alertFuelKeyFor('unleaded')).toBe('e10');
  });

  test('null/undefined fall back to e10', () => {
    expect(alertFuelKeyFor(null)).toBe('e10');
    expect(alertFuelKeyFor(undefined)).toBe('e10');
  });

  test('other keys pass through', () => {
    expect(alertFuelKeyFor('diesel')).toBe('diesel');
    expect(alertFuelKeyFor('super_unleaded')).toBe('super_unleaded');
    expect(alertFuelKeyFor('premium_diesel')).toBe('premium_diesel');
  });
});

describe('recommendedReason — user-facing caption', () => {
  test('Audi A3 2019 produces a model-aware caption', () => {
    const r = recommendedReason({
      fuel_type_detailed: 'PETROL',
      monthOfFirstRegistration: '2019-09',
      make: 'Audi',
      model: 'A3',
    });
    expect(r).toContain('Audi');
    expect(r).toContain('A3');
    expect(r).toContain('2019');
    expect(r.toLowerCase()).toContain('e10');
  });

  test('returns null when nothing useful to say', () => {
    expect(recommendedReason(null)).toBeNull();
    expect(recommendedReason({ fuel_type_detailed: 'ELECTRIC' })).toBeNull();
    expect(recommendedReason({ fuel_type_detailed: 'PETROL' })).toBeNull();
  });

  test('diesel reason mentions Diesel', () => {
    const r = recommendedReason({
      fuel_type_detailed: 'DIESEL',
      monthOfFirstRegistration: '2018-03',
      make: 'BMW',
      model: '320d',
    });
    expect(r.toLowerCase()).toContain('diesel');
    expect(r).toContain('BMW');
  });
});
