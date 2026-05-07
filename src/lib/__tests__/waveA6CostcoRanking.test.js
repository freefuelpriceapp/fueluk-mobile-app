/**
 * Wave A.6 — Costco ranking integrity test.
 *
 * Regression guard: Costco Birmingham B7 5SA has e10_price=147.9 and
 * petrol_price=null. In Cheapest sort mode with selectedFuel='unleaded',
 * resolveUnleadedPrice(costco) must return 147.9 and Costco must rank #1
 * in a field that also includes Asda (e10=153.7) and Esso (e10=null,
 * petrol=170.0).
 *
 * Also verifies: selectedReason from the API does NOT affect the client-
 * side cheapest sort — it is a BestOptionCard hint only.
 */

const { resolveUnleadedPrice } = require('../fuelResolution');

const FRESH = new Date().toISOString();

// --- Fixtures -----------------------------------------------------------

const costcoBirmingham = {
  id: 'costco-b7-5sa',
  name: 'Costco Birmingham',
  brand: 'Costco',
  e10_price: 147.9,
  petrol_price: null,
  distance_miles: 1.99,
  distance_km: 1.99 * 1.60934,
  last_updated: FRESH,
};

const asdaLongbridge = {
  id: 'asda-longbridge',
  name: 'Asda Longbridge',
  brand: 'Asda',
  e10_price: 153.7,
  petrol_price: null,
  distance_miles: 2.5,
  distance_km: 2.5 * 1.60934,
  last_updated: FRESH,
};

const essoIndependent = {
  id: 'esso-independent',
  name: 'Esso Independent',
  brand: 'Esso',
  e10_price: null,
  petrol_price: 170.0,
  distance_miles: 0.8,
  distance_km: 0.8 * 1.60934,
  last_updated: FRESH,
};

// Mirror of HomeScreen.js getPrice() for selectedFuel='unleaded'
function getPrice(s) {
  const v = Number(resolveUnleadedPrice(s));
  return Number.isFinite(v) && v > 0 ? v : Infinity;
}

function getDistance(s) {
  const m = Number(s.distance_miles);
  if (Number.isFinite(m)) return m;
  const km = Number(s.distance_km);
  if (Number.isFinite(km)) return km / 1.60934;
  return Infinity;
}

function cheapestSort(stations) {
  return [...stations].sort((a, b) => {
    const pa = getPrice(a);
    const pb = getPrice(b);
    if (pa !== pb) return pa - pb;
    return getDistance(a) - getDistance(b);
  });
}

// -----------------------------------------------------------------------

describe('Wave A.6 — resolveUnleadedPrice for Costco (e10-only station)', () => {
  test('Costco e10=147.9, petrol=null → resolves to 147.9', () => {
    expect(resolveUnleadedPrice(costcoBirmingham)).toBe(147.9);
  });

  test('Asda e10=153.7, petrol=null → resolves to 153.7', () => {
    expect(resolveUnleadedPrice(asdaLongbridge)).toBe(153.7);
  });

  test('Esso e10=null, petrol=170.0 → resolves to 170.0', () => {
    expect(resolveUnleadedPrice(essoIndependent)).toBe(170.0);
  });
});

describe('Wave A.6 — Costco ranks #1 in Cheapest sort', () => {
  const stations = [asdaLongbridge, essoIndependent, costcoBirmingham];

  test('Costco is index 0 after cheapest sort', () => {
    const sorted = cheapestSort(stations);
    expect(sorted[0].id).toBe('costco-b7-5sa');
  });

  test('Asda is index 1 after cheapest sort', () => {
    const sorted = cheapestSort(stations);
    expect(sorted[1].id).toBe('asda-longbridge');
  });

  test('Esso (E5 only, most expensive) is index 2 after cheapest sort', () => {
    const sorted = cheapestSort(stations);
    expect(sorted[2].id).toBe('esso-independent');
  });

  test('Order is stable regardless of input order', () => {
    const reversed = [costcoBirmingham, essoIndependent, asdaLongbridge];
    const sorted = cheapestSort(reversed);
    expect(sorted.map((s) => s.id)).toEqual([
      'costco-b7-5sa',
      'asda-longbridge',
      'esso-independent',
    ]);
  });

  test('Tiebreak by distance when prices are equal', () => {
    const costcoClone = {
      ...costcoBirmingham,
      id: 'costco-closer',
      distance_miles: 1.0,
    };
    const sorted = cheapestSort([costcoBirmingham, costcoClone]);
    expect(sorted[0].id).toBe('costco-closer');
    expect(sorted[1].id).toBe('costco-b7-5sa');
  });
});

describe('Wave A.6 — selectedReason does not affect client-side sort', () => {
  // selectedReason is a backend hint surfaced only in BestOptionCard.
  // The cheapest sort ignores it — this test confirms the sort function
  // has no dependency on selectedReason and cannot be overridden by it.
  test('sort produces same result with or without a selectedReason annotation', () => {
    const withReason = stations => stations.map(s => ({ ...s, _selectedReason: 'Nearest station' }));
    const annotated = withReason([asdaLongbridge, essoIndependent, costcoBirmingham]);
    const sorted = cheapestSort(annotated);
    expect(sorted[0].id).toBe('costco-b7-5sa');
  });
});

describe('Wave A.6 — headlineStation selects Costco as cheapest', () => {
  // Mirror of HomeScreen.js headlineStation useMemo for selectedFuel='unleaded'
  function headlineStation(stations) {
    const priceOf = (s) => {
      const v = Number(resolveUnleadedPrice(s));
      return Number.isFinite(v) && v > 0 ? v : null;
    };
    const priced = stations.filter((s) => priceOf(s) != null);
    if (priced.length === 0) return null;
    return priced.reduce((best, s) => (priceOf(s) < priceOf(best) ? s : best));
  }

  test('headlineStation returns Costco as the cheapest E10', () => {
    const result = headlineStation([asdaLongbridge, essoIndependent, costcoBirmingham]);
    expect(result.id).toBe('costco-b7-5sa');
    expect(resolveUnleadedPrice(result)).toBe(147.9);
  });
});
