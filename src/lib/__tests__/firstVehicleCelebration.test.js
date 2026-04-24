const {
  FIRST_VEHICLE_CELEBRATION_KEY,
  shouldShowCelebration,
} = require('../firstVehicleCelebration');

describe('firstVehicleCelebration', () => {
  test('exports a stable v1 storage key', () => {
    expect(FIRST_VEHICLE_CELEBRATION_KEY).toBe('first_vehicle_celebration_seen_v1');
  });

  test('shows when a vehicle exists and seen flag not set', () => {
    expect(shouldShowCelebration({ reg: 'AB12CDE' }, null)).toBe(true);
    expect(shouldShowCelebration({ reg: 'AB12CDE' }, undefined)).toBe(true);
    expect(shouldShowCelebration({ reg: 'AB12CDE' }, '')).toBe(true);
  });

  test('hides once seen flag is "1" — shows once and only once', () => {
    expect(shouldShowCelebration({ reg: 'AB12CDE' }, '1')).toBe(false);
  });

  test('never shows with no vehicle', () => {
    expect(shouldShowCelebration(null, null)).toBe(false);
    expect(shouldShowCelebration(undefined, null)).toBe(false);
    expect(shouldShowCelebration('x', null)).toBe(false);
  });

  test('any non-"1" seen flag still allows show (robustness)', () => {
    expect(shouldShowCelebration({ reg: 'X' }, 'truthy')).toBe(true);
    expect(shouldShowCelebration({ reg: 'X' }, '0')).toBe(true);
  });
});
