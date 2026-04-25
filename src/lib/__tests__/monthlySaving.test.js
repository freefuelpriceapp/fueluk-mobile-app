const { computeMonthlySaving, _DEFAULTS } = require('../monthlySaving');

describe('computeMonthlySaving', () => {
  test('returns null when per_tank_saving_pence is missing', () => {
    expect(computeMonthlySaving({})).toBeNull();
    expect(computeMonthlySaving({ per_tank_saving_pence: null })).toBeNull();
    expect(computeMonthlySaving({ per_tank_saving_pence: 0 })).toBeNull();
    expect(computeMonthlySaving({ per_tank_saving_pence: -50 })).toBeNull();
    expect(computeMonthlySaving({ per_tank_saving_pence: NaN })).toBeNull();
  });

  test('returns null when no input at all', () => {
    expect(computeMonthlySaving()).toBeNull();
    expect(computeMonthlySaving(null)).toBeNull();
  });

  test('uses defaults for missing mpg / weekly_miles / tank size', () => {
    const r = computeMonthlySaving({ per_tank_saving_pence: 400 });
    expect(r).not.toBeNull();
    expect(r.isEstimated).toBe(true);
    // 150mi/wk @ 45mpg → ~15.15 L/wk → ~65.85 L/mo
    expect(r.monthlyLitres).toBeGreaterThan(60);
    expect(r.monthlyLitres).toBeLessThan(70);
  });

  test('per-litre saving = per_tank_saving / tank_size', () => {
    const r = computeMonthlySaving({
      per_tank_saving_pence: 500,
      tank_size_litres: 50,
    });
    expect(r.perLitreSavingPence).toBeCloseTo(10, 5);
  });

  test('monthlyPounds rounds to whole pounds', () => {
    const r = computeMonthlySaving({
      mpg: 45,
      weekly_miles: 150,
      tank_size_litres: 50,
      per_tank_saving_pence: 400,
    });
    expect(Number.isInteger(r.monthlyPounds)).toBe(true);
  });

  test('isLowSaving true when saving is small', () => {
    const r = computeMonthlySaving({
      mpg: 45,
      weekly_miles: 50, // very low mileage
      tank_size_litres: 50,
      per_tank_saving_pence: 30,
    });
    expect(r.isLowSaving).toBe(true);
  });

  test('isLowSaving false when saving is meaningful', () => {
    const r = computeMonthlySaving({
      mpg: 45,
      weekly_miles: 150,
      tank_size_litres: 50,
      per_tank_saving_pence: 600,
    });
    expect(r.isLowSaving).toBe(false);
    expect(r.monthlyPounds).toBeGreaterThanOrEqual(5);
  });

  test('isEstimated false when all inputs provided', () => {
    const r = computeMonthlySaving({
      mpg: 50,
      weekly_miles: 200,
      tank_size_litres: 60,
      per_tank_saving_pence: 400,
    });
    expect(r.isEstimated).toBe(false);
  });

  test('higher mpg → fewer litres → smaller saving', () => {
    const lowMpg = computeMonthlySaving({
      mpg: 30, weekly_miles: 150, tank_size_litres: 50, per_tank_saving_pence: 400,
    });
    const highMpg = computeMonthlySaving({
      mpg: 60, weekly_miles: 150, tank_size_litres: 50, per_tank_saving_pence: 400,
    });
    expect(highMpg.monthlyPounds).toBeLessThan(lowMpg.monthlyPounds);
  });

  test('higher weekly miles → bigger saving', () => {
    const low = computeMonthlySaving({
      mpg: 45, weekly_miles: 100, tank_size_litres: 50, per_tank_saving_pence: 400,
    });
    const high = computeMonthlySaving({
      mpg: 45, weekly_miles: 300, tank_size_litres: 50, per_tank_saving_pence: 400,
    });
    expect(high.monthlyPounds).toBeGreaterThan(low.monthlyPounds);
  });

  test('default constants match brief', () => {
    expect(_DEFAULTS.DEFAULT_WEEKLY_MILES).toBe(150);
    expect(_DEFAULTS.DEFAULT_MPG).toBe(45);
    expect(_DEFAULTS.LITRES_PER_GALLON_UK).toBeCloseTo(4.546, 5);
    expect(_DEFAULTS.WEEKS_PER_MONTH).toBeCloseTo(4.345, 5);
    expect(_DEFAULTS.LOW_SAVING_THRESHOLD_POUNDS).toBe(5);
  });

  test('non-numeric mpg falls back to default', () => {
    const r = computeMonthlySaving({
      mpg: 'fast',
      weekly_miles: 150,
      tank_size_litres: 50,
      per_tank_saving_pence: 400,
    });
    expect(r).not.toBeNull();
    expect(r.isEstimated).toBe(true);
  });

  test('zero or negative tank size falls back to default', () => {
    const r = computeMonthlySaving({
      mpg: 45, weekly_miles: 150, tank_size_litres: 0, per_tank_saving_pence: 400,
    });
    expect(r).not.toBeNull();
    expect(r.isEstimated).toBe(true);
  });

  test('roughly matches brief example: 150mi/wk @ 45mpg, ~£3/tank, 50L → ~£4-7/mo', () => {
    const r = computeMonthlySaving({
      mpg: 45, weekly_miles: 150, tank_size_litres: 50, per_tank_saving_pence: 400,
    });
    expect(r.monthlyPounds).toBeGreaterThanOrEqual(4);
    expect(r.monthlyPounds).toBeLessThanOrEqual(7);
  });
});
