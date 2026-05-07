import {
  resolveUnleadedPrice,
  resolveUnleadedDetail,
  resolvePriceForFuelType,
  UNLEADED_FIELDS,
} from '../fuelResolution';

const FRESH = new Date().toISOString();

function st(overrides = {}) {
  return { last_updated: FRESH, ...overrides };
}

describe('resolveUnleadedPrice', () => {
  test('Asda case: only e10_price filled returns the e10 number', () => {
    expect(resolveUnleadedPrice(st({ e10_price: 151.9 }))).toBe(151.9);
  });

  test('Esso case: only petrol_price filled returns the petrol number', () => {
    expect(resolveUnleadedPrice(st({ petrol_price: 178.9 }))).toBe(178.9);
  });

  test('both filled, e10 cheaper -> picks e10 (the realistic UK case)', () => {
    expect(resolveUnleadedPrice(st({ e10_price: 159.9, petrol_price: 178.9 }))).toBe(159.9);
  });

  test('both filled, rare petrol-cheaper case -> still picks the min', () => {
    expect(resolveUnleadedPrice(st({ e10_price: 159.9, petrol_price: 155.0 }))).toBe(155.0);
  });

  test('empty station -> null', () => {
    expect(resolveUnleadedPrice({})).toBeNull();
    expect(resolveUnleadedPrice(null)).toBeNull();
  });

  test('out-of-range value (below quarantine MIN_PPL=80) -> filtered, returns null', () => {
    expect(resolveUnleadedPrice(st({ e10_price: 50 }))).toBeNull();
  });

  test('one quarantined, one plausible -> picks the plausible one', () => {
    // 50p is below MIN_PPL so quarantined; 140 is plausible.
    expect(resolveUnleadedPrice(st({ e10_price: 50, petrol_price: 140 }))).toBe(140);
  });

  test('both plausible at e10=130, petrol=140 -> picks 130 (lower)', () => {
    expect(resolveUnleadedPrice(st({ e10_price: 130, petrol_price: 140 }))).toBe(130);
  });

  test('upstream-flagged station -> both fields treated as quarantined, null', () => {
    expect(resolveUnleadedPrice(st({ e10_price: 151.9, is_quarantined: true }))).toBeNull();
  });
});

describe('resolveUnleadedDetail', () => {
  test('reports e10 as winning field when e10 is min', () => {
    expect(resolveUnleadedDetail(st({ e10_price: 151.9, petrol_price: 178.9 }))).toEqual({
      price: 151.9,
      sourceField: 'e10_price',
      fuelType: 'e10',
    });
  });

  test('reports petrol when only petrol_price is present', () => {
    expect(resolveUnleadedDetail(st({ petrol_price: 178.9 }))).toEqual({
      price: 178.9,
      sourceField: 'petrol_price',
      fuelType: 'petrol',
    });
  });

  test('returns all-null when nothing is plausible', () => {
    expect(resolveUnleadedDetail({})).toEqual({
      price: null,
      sourceField: null,
      fuelType: null,
    });
  });

  test('tie -> e10 wins (supermarket-friendly default)', () => {
    expect(resolveUnleadedDetail(st({ e10_price: 150, petrol_price: 150 }))).toEqual({
      price: 150,
      sourceField: 'e10_price',
      fuelType: 'e10',
    });
  });
});

describe('resolvePriceForFuelType', () => {
  test('routes "unleaded" through resolveUnleadedPrice', () => {
    expect(resolvePriceForFuelType(st({ e10_price: 151.9, petrol_price: 178.9 }), 'unleaded'))
      .toBe(151.9);
  });

  test('returns null for non-unleaded keys (caller uses resolvePrice from quarantine)', () => {
    expect(resolvePriceForFuelType(st({ diesel_price: 165 }), 'diesel')).toBeNull();
  });
});

describe('UNLEADED_FIELDS', () => {
  test('exports the two underlying wire fields', () => {
    expect(UNLEADED_FIELDS).toEqual(['e10_price', 'petrol_price']);
  });
});
