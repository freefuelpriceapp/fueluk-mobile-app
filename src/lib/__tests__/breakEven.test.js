const {
  describeBreakEven,
  formatPounds,
  formatPencePerLitre,
} = require('../breakEven');

describe('describeBreakEven', () => {
  test('returns null for missing / non-object input', () => {
    expect(describeBreakEven(null)).toBeNull();
    expect(describeBreakEven(undefined)).toBeNull();
    expect(describeBreakEven('bad')).toBeNull();
    expect(describeBreakEven(42)).toBeNull();
  });

  test('worth_the_drive=true renders new primary line', () => {
    const d = describeBreakEven({
      worth_the_drive: true,
      savings_pence: 420,
      detour_miles: 2.3,
      fuel_cost_full_tank: 5600,
      price_per_l_pence: 140.0,
      tank_litres: 40,
    });
    expect(d.variant).toBe('worth');
    expect(d.tone).toBe('positive');
    expect(d.primary).toBe('£4.20 cheaper to fill up here');
    expect(d.secondary).toBe('£56.00 to fill (40L @ 140.0p) · 2.3mi extra drive · net £4.20 saved');
    expect(d.label).toBe('+£4.20 saved');
    expect(d.savingsPounds).toBe(4.2);
    expect(d.detourMiles).toBe(2.3);
    expect(d.fullTankPounds).toBe(56);
    expect(d.isEstimated).toBe(false);
    expect(d.accessibilityLabel).toContain('£4.20 cheaper');
    expect(d.accessibilityLabel).toContain('2.3 mile extra drive');
  });

  test('worth_the_drive=false renders "Similar value" as neutral', () => {
    const d = describeBreakEven({
      worth_the_drive: false,
      savings_pence: 5,
      detour_miles: 0.4,
    });
    expect(d.variant).toBe('similar');
    expect(d.tone).toBe('neutral');
    expect(d.primary).toBe('Similar value to your closest');
    expect(d.label).toBe('Similar value');
    expect(d.accessibilityLabel).toContain('Similar value');
  });

  test('is_closest omits comparison, returns "closest" variant', () => {
    const d = describeBreakEven({
      is_closest: true,
      fuel_cost_full_tank: 5600,
      tank_litres: 40,
      price_per_l_pence: 140.0,
    });
    expect(d.variant).toBe('closest');
    expect(d.primary).toBeNull();
    expect(d.secondary).toBe('£56.00 to fill (40L @ 140.0p)');
    expect(d.label).toBe('£56.00 tank');
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

  test('missing savings_pence + missing worth_the_drive + no closest → null', () => {
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
    expect(d.primary).toBe('£2.37 cheaper to fill up here');
  });

  // --- Regression: currency formatter never mixes £ and p ---
  test('currency regression: never outputs "£X.XXp" or "XXXp.XX"', () => {
    const shapes = [
      { worth_the_drive: true, savings_pence: 420, fuel_cost_full_tank: 5600, price_per_l_pence: 140.0, tank_litres: 40, detour_miles: 2.3 },
      { worth_the_drive: false, savings_pence: 5 },
      { is_closest: true, fuel_cost_full_tank: 6280, tank_litres: 40, price_per_l_pence: 157.0 },
      { worth_the_drive: true, savings_pence: 50, fuel_cost_full_tank: 56, price_per_l_pence: 140 },
    ];
    const badPatterns = [
      /£\d+(\.\d+)?p/,   // £0.56p
      /\d+p\.\d+/,       // 56p.40
      /£\d+p/,           // £56p
    ];
    for (const s of shapes) {
      const d = describeBreakEven(s);
      if (!d) continue;
      const allText = [d.primary, d.secondary, d.label, d.accessibilityLabel]
        .filter(Boolean)
        .join(' | ');
      for (const bad of badPatterns) {
        expect(allText).not.toMatch(bad);
      }
    }
  });
});

describe('formatPounds', () => {
  test('formats pounds with no trailing p', () => {
    expect(formatPounds(56)).toBe('£56.00');
    expect(formatPounds(4.2)).toBe('£4.20');
    expect(formatPounds(0.5)).toBe('£0.50');
  });
  test('null for non-finite', () => {
    expect(formatPounds(NaN)).toBeNull();
    expect(formatPounds(null)).toBeNull();
    expect(formatPounds(undefined)).toBeNull();
  });
  test('never appends "p"', () => {
    const out = formatPounds(0.56);
    expect(out).toBe('£0.56');
    expect(out).not.toMatch(/p$/);
  });
});

describe('formatPencePerLitre', () => {
  test('formats pence per litre with trailing p, no £', () => {
    expect(formatPencePerLitre(140)).toBe('140.0p');
    expect(formatPencePerLitre(157.4)).toBe('157.4p');
  });
  test('never prefixes £', () => {
    const out = formatPencePerLitre(140);
    expect(out).not.toMatch(/^£/);
  });
  test('null for non-finite', () => {
    expect(formatPencePerLitre(NaN)).toBeNull();
    expect(formatPencePerLitre('x')).toBeNull();
  });
});
