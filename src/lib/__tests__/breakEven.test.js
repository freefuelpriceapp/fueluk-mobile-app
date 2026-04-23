const { describeBreakEven } = require('../breakEven');

describe('describeBreakEven', () => {
  test('returns null for missing / non-object input', () => {
    expect(describeBreakEven(null)).toBeNull();
    expect(describeBreakEven(undefined)).toBeNull();
    expect(describeBreakEven('bad')).toBeNull();
    expect(describeBreakEven(42)).toBeNull();
  });

  test('worth_the_drive=true with savings renders "+£X.XX saved" as positive', () => {
    const d = describeBreakEven({
      worth_the_drive: true,
      savings_pence: 180,
      detour_miles: 1.2,
      fuel_cost_full_tank: 7200,
    });
    expect(d.tone).toBe('positive');
    expect(d.label).toBe('+£1.80 saved');
    expect(d.savingsPounds).toBe(1.8);
    expect(d.detourMiles).toBe(1.2);
    expect(d.fullTankPounds).toBe(72);
    expect(d.isEstimated).toBe(false);
    expect(d.accessibilityLabel).toContain('Saves £1.80');
    expect(d.accessibilityLabel).toContain('1.2 mile detour');
  });

  test('worth_the_drive=false renders "Similar value" as neutral', () => {
    const d = describeBreakEven({
      worth_the_drive: false,
      savings_pence: 5,
      detour_miles: 0.4,
    });
    expect(d.tone).toBe('neutral');
    expect(d.label).toBe('Similar value');
    expect(d.accessibilityLabel).toContain('Similar value');
  });

  test('default mpg_source surfaces isEstimated=true', () => {
    const d = describeBreakEven({
      worth_the_drive: true,
      savings_pence: 90,
      detour_miles: 0.8,
      mpg_source: 'default_e10',
    });
    expect(d.isEstimated).toBe(true);
    expect(d.accessibilityLabel).toContain('estimated MPG');
  });

  test('missing savings_pence + missing worth_the_drive → null', () => {
    expect(describeBreakEven({ detour_miles: 1 })).toBeNull();
  });

  test('tolerates invalid numeric fields without throwing', () => {
    const d = describeBreakEven({
      worth_the_drive: true,
      savings_pence: NaN,
      detour_miles: 'not a number',
      fuel_cost_full_tank: null,
    });
    expect(d).toBeNull();
  });

  test('rounds pence → pounds to 2dp', () => {
    const d = describeBreakEven({ worth_the_drive: true, savings_pence: 237 });
    expect(d.savingsPounds).toBe(2.37);
    expect(d.label).toBe('+£2.37 saved');
  });
});
