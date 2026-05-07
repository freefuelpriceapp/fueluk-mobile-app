/**
 * Wave A.5 — vehicle-aware fuel defaults end-to-end behaviour.
 *
 * These tests pin the screen-level outcome the user actually feels:
 *   - Audi A3 2019 PETROL → unleaded (E10), NOT 'petrol' (E5)
 *   - No active vehicle   → unleaded
 *   - Diesel car          → diesel
 *   - Switching reg drops the previous manual override
 *
 * They exercise the same logic the screens call (recommendedFuelKey +
 * the override-by-reg pattern) so a regression in either place trips a
 * red bar without spinning up React Native rendering.
 */

const {
  recommendedFuelKey,
  alertFuelKeyFor,
  recommendedReason,
} = require('../vehicleFuelDefault');

// Mirror the hook used by every screen. If the screen changes its rule
// shape, this helper has to follow — keeping the test honest.
function deriveSelectedFuel({ vehicle, override }) {
  const reg = vehicle?.reg || null;
  const recommended = recommendedFuelKey(vehicle) || 'unleaded';
  if (override && override.reg === reg) return override.fuel;
  return recommended;
}

const audiA3 = {
  reg: 'NJ69DDF',
  fuel_type_detailed: 'PETROL',
  engine_capacity_cc: 1498,
  monthOfFirstRegistration: '2019-09',
  make: 'Audi',
  model: 'A3',
};

const dieselSkoda = {
  reg: 'AB12CDE',
  fuel_type_detailed: 'DIESEL',
  monthOfFirstRegistration: '2018-03',
  make: 'Skoda',
  model: 'Octavia',
};

const oldClassic = {
  reg: 'OLD123',
  fuel_type_detailed: 'PETROL',
  monthOfFirstRegistration: '1995-06',
};

describe('Wave A.5 — HomeScreen-equivalent default fuel resolution', () => {
  test('Audi A3 2019 PETROL → selectedFuel === "unleaded" (NOT "petrol"/E5)', () => {
    const fuel = deriveSelectedFuel({ vehicle: audiA3, override: null });
    expect(fuel).toBe('unleaded');
    expect(fuel).not.toBe('petrol');
  });

  test('No active vehicle → selectedFuel === "unleaded"', () => {
    expect(deriveSelectedFuel({ vehicle: null, override: null })).toBe('unleaded');
    expect(deriveSelectedFuel({ vehicle: undefined, override: null })).toBe('unleaded');
  });

  test('Active diesel vehicle → selectedFuel === "diesel"', () => {
    expect(deriveSelectedFuel({ vehicle: dieselSkoda, override: null })).toBe('diesel');
  });

  test('Old (pre-2011) petrol car → super_unleaded (E5 super)', () => {
    expect(deriveSelectedFuel({ vehicle: oldClassic, override: null })).toBe('super_unleaded');
  });
});

describe('Wave A.5 — manual override persists per-reg, resets on reg change', () => {
  test('Same reg + override → returns the user choice', () => {
    const override = { reg: audiA3.reg, fuel: 'diesel' };
    expect(deriveSelectedFuel({ vehicle: audiA3, override })).toBe('diesel');
  });

  test('Override for the OLD reg is ignored when the active reg has changed', () => {
    const staleOverride = { reg: 'OLDREG', fuel: 'diesel' };
    // User registered a new car (Audi A3); their previous "diesel" filter
    // for the old car must NOT carry over.
    expect(deriveSelectedFuel({ vehicle: audiA3, override: staleOverride })).toBe('unleaded');
  });

  test('Override on no-vehicle is ignored when a vehicle subsequently registers', () => {
    const override = { reg: null, fuel: 'super_unleaded' };
    // Active reg is now AUDIs; null-reg override is stale.
    expect(deriveSelectedFuel({ vehicle: audiA3, override })).toBe('unleaded');
  });

  test('Switching from diesel car to petrol car resets back to recommendation', () => {
    // Started on diesel car with override = diesel (matches recommendation, no-op).
    // Now reg has flipped to Audi A3 — recommendation = unleaded.
    const overrideFromDieselDays = { reg: dieselSkoda.reg, fuel: 'diesel' };
    expect(deriveSelectedFuel({ vehicle: audiA3, override: overrideFromDieselDays }))
      .toBe('unleaded');
  });
});

describe('Wave A.5 — alert-table mapping for StationDetailScreen', () => {
  test('Audi A3 alert defaults to e10 (NOT petrol/E5)', () => {
    const recommended = recommendedFuelKey(audiA3);
    expect(alertFuelKeyFor(recommended)).toBe('e10');
  });

  test('Diesel car alert defaults to diesel', () => {
    expect(alertFuelKeyFor(recommendedFuelKey(dieselSkoda))).toBe('diesel');
  });

  test('No vehicle → alert defaults to e10', () => {
    expect(alertFuelKeyFor(recommendedFuelKey(null))).toBe('e10');
  });
});

describe('Wave A.5 — recommendation caption', () => {
  test('Audi A3 produces a model-aware E10 caption', () => {
    const r = recommendedReason(audiA3);
    expect(r).toMatch(/E10/);
    expect(r).toMatch(/Audi/);
    expect(r).toMatch(/A3/);
    expect(r).toMatch(/2019/);
  });
});
