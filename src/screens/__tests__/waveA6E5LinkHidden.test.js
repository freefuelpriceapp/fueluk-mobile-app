/**
 * Wave A.6 — E5 inline link visibility rules.
 *
 * The E5 "tap for E5 prices" link should be hidden for E10-eligible
 * (post-2011 petrol/hybrid) users who have a registered vehicle.
 *
 * Wave A.6 condition (mirrors HomeScreen.js JSX):
 *
 *   show = (selectedFuel === 'unleaded' || selectedFuel === 'petrol')
 *          && !(fuelRecommendation === 'unleaded' && !!userVehicle && selectedFuel !== 'petrol')
 *
 * This test exercises the condition logic directly — no React rendering
 * required. The screen test environment is node-only.
 */

const { recommendedFuelKey } = require('../../lib/vehicleFuelDefault');

/**
 * Mirror of the HomeScreen.js E5 link visibility condition.
 * Returns true when the E5 opt-in link should be rendered.
 */
function shouldShowE5Link({ selectedFuel, userVehicle }) {
  const fuelRecommendation = recommendedFuelKey(userVehicle) || 'unleaded';
  const outerCondition = selectedFuel === 'unleaded' || selectedFuel === 'petrol';
  const hideForE10Vehicle =
    fuelRecommendation === 'unleaded' && !!userVehicle && selectedFuel !== 'petrol';
  return outerCondition && !hideForE10Vehicle;
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

describe('Wave A.6 — E5 link hidden for E10-eligible vehicle (post-2011 petrol)', () => {
  test('Audi A3 2019 (selectedFuel=unleaded, vehicle present) → E5 link NOT shown', () => {
    expect(shouldShowE5Link({ selectedFuel: 'unleaded', userVehicle: audiA3_2019 })).toBe(false);
  });

  test('Any post-2011 petrol vehicle → E5 link NOT shown on unleaded tab', () => {
    const modernPetrol = {
      fuel_type_detailed: 'PETROL',
      monthOfFirstRegistration: '2015-03',
    };
    expect(shouldShowE5Link({ selectedFuel: 'unleaded', userVehicle: modernPetrol })).toBe(false);
  });

  test('fuelRecommendation for Audi A3 2019 is unleaded (confirms hide applies)', () => {
    expect(recommendedFuelKey(audiA3_2019)).toBe('unleaded');
  });
});

describe('Wave A.6 — E5 link remains visible in appropriate scenarios', () => {
  test('No vehicle registered (modal-driver fallback) → E5 link IS shown', () => {
    expect(shouldShowE5Link({ selectedFuel: 'unleaded', userVehicle: null })).toBe(true);
    expect(shouldShowE5Link({ selectedFuel: 'unleaded', userVehicle: undefined })).toBe(true);
  });

  test('Pre-2011 petrol (super_unleaded recommendation) → E5 link IS shown', () => {
    expect(recommendedFuelKey(oldClassicPetrol)).toBe('super_unleaded');
    expect(shouldShowE5Link({ selectedFuel: 'unleaded', userVehicle: oldClassicPetrol })).toBe(true);
  });

  test('Diesel vehicle → E5 link IS shown (useful opt-in)', () => {
    expect(shouldShowE5Link({ selectedFuel: 'unleaded', userVehicle: dieselVehicle })).toBe(true);
  });

  test('User already tapped to E5 tab (selectedFuel=petrol) → back-link IS shown', () => {
    // When the user is ON the petrol/E5 tab, the "go back" link must show
    // regardless of vehicle type so they can return to standard petrol.
    expect(shouldShowE5Link({ selectedFuel: 'petrol', userVehicle: audiA3_2019 })).toBe(true);
  });

  test('Diesel fuel tab selected → outer condition false, link not rendered (not petrol tab)', () => {
    // When selectedFuel='diesel', the entire outer condition is false —
    // no E5 link for diesel tab at all (unchanged behaviour).
    expect(shouldShowE5Link({ selectedFuel: 'diesel', userVehicle: null })).toBe(false);
  });
});

describe('Wave A.6 — E5 link condition exhaustive truth table', () => {
  // Rows: [selectedFuel, userVehicle, expected]
  const cases = [
    // E10-eligible vehicle + unleaded tab → HIDE
    ['unleaded', audiA3_2019,        false],
    // E10-eligible vehicle + petrol tab  → SHOW (back-link)
    ['petrol',   audiA3_2019,        true],
    // No vehicle + unleaded tab          → SHOW
    ['unleaded', null,                true],
    // No vehicle + petrol tab            → SHOW
    ['petrol',   null,                true],
    // Pre-2011 petrol + unleaded tab     → SHOW
    ['unleaded', oldClassicPetrol,   true],
    // Diesel vehicle + unleaded tab      → SHOW
    ['unleaded', dieselVehicle,      true],
    // Diesel fuel tab + any vehicle      → no-render (outer condition false)
    ['diesel',   audiA3_2019,        false],
    ['diesel',   null,               false],
  ];

  cases.forEach(([fuel, vehicle, expected]) => {
    const vehicleDesc = vehicle ? (vehicle.reg || vehicle.fuel_type_detailed) : 'no-vehicle';
    test(`selectedFuel=${fuel}, vehicle=${vehicleDesc} → show=${expected}`, () => {
      expect(shouldShowE5Link({ selectedFuel: fuel, userVehicle: vehicle })).toBe(expected);
    });
  });
});
