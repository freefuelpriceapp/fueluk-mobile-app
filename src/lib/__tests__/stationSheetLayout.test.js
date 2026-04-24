const {
  describeStationSheetActions,
  formatPerTankDelta,
  ACTION_ROLE,
} = require('../stationSheetLayout');

describe('describeStationSheetActions', () => {
  test('See details is the primary action and lives on the top row', () => {
    const actions = describeStationSheetActions();
    const seeDetails = actions.find((a) => a.id === 'seeDetails');
    expect(seeDetails).toBeDefined();
    expect(seeDetails.role).toBe(ACTION_ROLE.primary);
    expect(seeDetails.row).toBe('top');
    expect(seeDetails.style).toBe('solid');
    expect(seeDetails.label).toBe('See details');
    expect(seeDetails.icon).toBe('chevron-forward');
  });

  test('Directions is the secondary top-row action (outlined, not primary)', () => {
    const actions = describeStationSheetActions();
    const directions = actions.find((a) => a.id === 'directions');
    expect(directions.role).toBe(ACTION_ROLE.secondary);
    expect(directions.row).toBe('top');
    expect(directions.style).toBe('outlined');
    expect(directions.label).toBe('Directions');
  });

  test('Save + Report are utilities on the bottom row', () => {
    const actions = describeStationSheetActions();
    const utilities = actions.filter((a) => a.role === ACTION_ROLE.utility);
    expect(utilities.map((a) => a.id)).toEqual(['save', 'report']);
    utilities.forEach((a) => {
      expect(a.row).toBe('bottom');
      expect(a.style).toBe('icon');
    });
  });

  test('Save toggles icon + label + a11y label when isFavourite is true', () => {
    const actions = describeStationSheetActions({ isFavourite: true });
    const save = actions.find((a) => a.id === 'save');
    expect(save.label).toBe('Saved');
    expect(save.icon).toBe('heart');
    expect(save.accessibilityLabel).toBe('Remove station from saved');
  });

  test('Report action a11y label mentions incorrect price', () => {
    const actions = describeStationSheetActions();
    const report = actions.find((a) => a.id === 'report');
    expect(report.accessibilityLabel).toMatch(/incorrect price/i);
  });

  test('omits Report when priceFlagsEnabled is false', () => {
    const actions = describeStationSheetActions({ priceFlagsEnabled: false });
    expect(actions.find((a) => a.id === 'report')).toBeUndefined();
    // Primary pair is still present.
    expect(actions.find((a) => a.id === 'seeDetails')).toBeDefined();
    expect(actions.find((a) => a.id === 'directions')).toBeDefined();
  });

  test('top row contains exactly the primary + secondary pair', () => {
    const top = describeStationSheetActions().filter((a) => a.row === 'top');
    expect(top).toHaveLength(2);
    expect(top[0].role).toBe(ACTION_ROLE.primary);
    expect(top[1].role).toBe(ACTION_ROLE.secondary);
  });
});

describe('formatPerTankDelta', () => {
  test('routes £ figure through formatPounds (no bare concat, no "£X.XXp")', () => {
    const out = formatPerTankDelta(0.71);
    expect(out).toBe('Only £0.71 difference per full tank');
    expect(out).not.toMatch(/£\d+(\.\d+)?p/);
  });

  test('uses absolute value so negative savings still read naturally', () => {
    expect(formatPerTankDelta(-2.4)).toBe('Only £2.40 difference per full tank');
  });

  test('tied mode returns the "either works" copy, ignores pound figure', () => {
    expect(formatPerTankDelta(0.3, { tied: true })).toBe(
      'Under £1 difference per full tank — either works',
    );
  });

  test('returns null for non-finite input when not tied', () => {
    expect(formatPerTankDelta(NaN)).toBeNull();
    expect(formatPerTankDelta(null)).toBeNull();
    expect(formatPerTankDelta(undefined)).toBeNull();
  });
});
