/**
 * Wave A.7 — E5 inline link visibility rules (Option A).
 *
 * After Wave A.7, ALL petrol/hybrid vehicles default to 'unleaded', so the
 * old "hide for E10-eligible vehicle" gating is removed. The E5 opt-in link
 * is now ALWAYS shown when selectedFuel === 'unleaded', regardless of vehicle
 * age or registration status. The only case where the link is absent is when
 * selectedFuel falls outside the ('unleaded' | 'petrol') set (e.g. 'diesel').
 *
 * Wave A.7 condition (mirrors HomeScreen.js JSX, Option A):
 *
 *   show = selectedFuel === 'unleaded' || selectedFuel === 'petrol'
 *
 * This test exercises the condition logic directly — no React rendering
 * required. The screen test environment is node-only.
 */

const { recommendedFuelKey } = require('../../lib/vehicleFuelDefault');

/**
 * Mirror of the updated HomeScreen.js E5 link visibility condition (Wave A.7).
 * Returns true when the E5 opt-in / back link should be rendered.
 */
function shouldShowE5Link({ selectedFuel }) {
  return selectedFuel === 'unleaded' || selectedFuel === 'petrol';
}

// --- Fixtures -----------------------------------------------------------

const audiA3_2019 = {
  reg: 'NJ69DDF',
  fuel_type_detailed: 'PETROL',
  engine_capacity_cc: 1498,
  monthOfFirstRegistration: '2019-09',
  make: 'Audi',
  model: 'A3',
};

const oldClassicPetrol = {
  reg: 'OLD001',
  fuel_type_detailed: 'PETROL',
  monthOfFirstRegistration: '1999-06',
  make: 'Classic',
  model: 'Car',
};

const dieselVehicle = {
  reg: 'AB12CDE',
  fuel_type_detailed: 'DIESEL',
  monthOfFirstRegistration: '2018-03',
  make: 'Skoda',
  model: 'Octavia',
};

// -----------------------------------------------------------------------

describe('Wave A.7 — E5 link visible for ALL vehicles on unleaded tab (Option A)', () => {
  test('Audi A3 2019 (selectedFuel=unleaded, vehicle present) → E5 link IS shown', () => {
    // Wave A.7: no vehicle-based gating; link always shows on unleaded tab
    expect(shouldShowE5Link({ selectedFuel: 'unleaded', userVehicle: audiA3_2019 })).toBe(true);
  });

  test('Any post-2011 petrol vehicle → E5 link IS shown on unleaded tab', () => {
    const modernPetrol = {
      fuel_type_detailed: 'PETROL',
      monthOfFirstRegistration: '2015-03',
    };
    expect(shouldShowE5Link({ selectedFuel: 'unleaded', userVehicle: modernPetrol })).toBe(true);
  });

  test('fuelRecommendation for Audi A3 2019 is unleaded (confirms Wave A.7 default)', () => {
    expect(recommendedFuelKey(audiA3_2019)).toBe('unleaded');
  });

  test('fuelRecommendation for pre-2011 classic petrol is now unleaded (Wave A.7)', () => {
    expect(recommendedFuelKey(oldClassicPetrol)).toBe('unleaded');
  });
});

describe('Wave A.7 — E5 link remains visible in appropriate scenarios', () => {
  test('No vehicle registered → E5 link IS shown', () => {
    expect(shouldShowE5Link({ selectedFuel: 'unleaded', userVehicle: null })).toBe(true);
    expect(shouldShowE5Link({ selectedFuel: 'unleaded', userVehicle: undefined })).toBe(true);
  });

  test('Pre-2011 petrol (now unleaded recommendation) → E5 link IS shown', () => {
    // Wave A.7: pre-2011 cars get unleaded recommendation, link still shows
    expect(recommendedFuelKey(oldClassicPetrol)).toBe('unleaded');
    expect(shouldShowE5Link({ selectedFuel: 'unleaded', userVehicle: oldClassicPetrol })).toBe(true);
  });

  test('Diesel vehicle + unleaded tab → E5 link IS shown (useful opt-in)', () => {
    expect(shouldShowE5Link({ selectedFuel: 'unleaded', userVehicle: dieselVehicle })).toBe(true);
  });

  test('User already tapped to E5 tab (selectedFuel=petrol) → back-link IS shown', () => {
    // When the user is ON the petrol/E5 tab, the "go back" link must show
    // regardless of vehicle type so they can return to standard petrol.
    expect(shouldShowE5Link({ selectedFuel: 'petrol', userVehicle: audiA3_2019 })).toBe(true);
  });

  test('Diesel fuel tab selected → outer condition false, link not rendered', () => {
    // When selectedFuel='diesel', the entire condition is false —
    // no E5 link for diesel tab at all (unchanged behaviour).
    expect(shouldShowE5Link({ selectedFuel: 'diesel', userVehicle: null })).toBe(false);
  });
});

describe('Wave A.7 — E5 link hidden ONLY when on non-petrol/unleaded tabs', () => {
  test('selectedFuel=diesel → E5 link hidden', () => {
    expect(shouldShowE5Link({ selectedFuel: 'diesel' })).toBe(false);
  });

  test('selectedFuel=premium_diesel → E5 link hidden', () => {
    expect(shouldShowE5Link({ selectedFuel: 'premium_diesel' })).toBe(false);
  });

  test('selectedFuel=unleaded → E5 link shown (even with vehicle)', () => {
    expect(shouldShowE5Link({ selectedFuel: 'unleaded' })).toBe(true);
  });

  test('selectedFuel=petrol → back-link shown (user on E5 tab)', () => {
    expect(shouldShowE5Link({ selectedFuel: 'petrol' })).toBe(true);
  });
});

describe('Wave A.7 — E5 link condition truth table', () => {
  // Rows: [selectedFuel, userVehicle, expected]
  const cases = [
    // E10-eligible vehicle + unleaded tab → SHOW (Wave A.7 change)
    ['unleaded', audiA3_2019,      true],
    // E10-eligible vehicle + petrol tab  → SHOW (back-link)
    ['petrol',   audiA3_2019,      true],
    // No vehicle + unleaded tab          → SHOW
    ['unleaded', null,             true],
    // No vehicle + petrol tab            → SHOW
    ['petrol',   null,             true],
    // Pre-2011 petrol + unleaded tab     → SHOW (Wave A.7: always show)
    ['unleaded', oldClassicPetrol, true],
    // Diesel vehicle + unleaded tab      → SHOW
    ['unleaded', dieselVehicle,    true],
    // Diesel fuel tab + any vehicle      → no-render (outer condition false)
    ['diesel',   audiA3_2019,      false],
    ['diesel',   null,             false],
  ];

  cases.forEach(([fuel, vehicle, expected]) => {
    const vehicleDesc = vehicle ? (vehicle.reg || vehicle.fuel_type_detailed) : 'no-vehicle';
    test(`selectedFuel=${fuel}, vehicle=${vehicleDesc} → show=${expected}`, () => {
      expect(shouldShowE5Link({ selectedFuel: fuel, userVehicle: vehicle })).toBe(expected);
    });
  });
});
