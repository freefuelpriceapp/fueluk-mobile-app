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
    expect(d.primary).toBe('£4.20 cheaper per tank than your nearest station');
    expect(d.secondary).toBe('includes 2.3mi detour fuel · £56.00 to fill (40L @ 140.0p)');
    expect(d.label).toBe('+£4.20 saved');
    expect(d.savingsPounds).toBe(4.2);
    expect(d.detourMiles).toBe(2.3);
    expect(d.fullTankPounds).toBe(56);
    expect(d.isEstimated).toBe(false);
    expect(d.accessibilityLabel).toContain('£4.20 cheaper per tank');
    expect(d.accessibilityLabel).toContain('includes 2.3 mile detour fuel');
  });

  test('worth_the_drive=false renders tied copy when |diff| < £1', () => {
    const d = describeBreakEven({
      worth_the_drive: false,
      savings_pence: 5,
      detour_miles: 0.4,
    });
    expect(d.variant).toBe('similar');
    expect(d.tone).toBe('neutral');
    expect(d.isTied).toBe(true);
    expect(d.primary).toBe('Same value as your nearest station');
    expect(d.secondary).toBe('Under £1 difference per full tank — either works');
    expect(d.label).toBe('Same value');
    expect(d.accessibilityLabel).toContain('Same value as your nearest station');
  });

  test('worth_the_drive=false with |diff| >= £1 renders "Similar price" copy', () => {
    const d = describeBreakEven({
      worth_the_drive: false,
      savings_pence: 71, // £0.71 → tied (< £1)
    });
    expect(d.variant).toBe('similar');
    expect(d.isTied).toBe(true);
    expect(d.primary).toBe('Same value as your nearest station');

    const d2 = describeBreakEven({
      worth_the_drive: false,
      savings_pence: 180, // £1.80 → not tied
    });
    expect(d2.variant).toBe('similar');
    expect(d2.isTied).toBe(false);
    expect(d2.primary).toBe('Similar price to your nearest station');
    expect(d2.secondary).toBe('Only £1.80 difference per full tank');
    expect(d2.label).toBe('Similar price');
  });

  test('similar secondary always uses formatPounds (never concatenates bare £)', () => {
    const d = describeBreakEven({
      worth_the_drive: false,
      savings_pence: 237,
    });
    // £2.37 — must appear as a clean pounds figure, no trailing "p".
    expect(d.secondary).toContain('£2.37');
    expect(d.secondary).not.toMatch(/£\d+(\.\d+)?p/);
  });

  test('similar copy reads as one thought (no middle-dot concat)', () => {
    const d = describeBreakEven({
      worth_the_drive: false,
      savings_pence: 120,
    });
    // Neither primary nor secondary should chain via "·" for the similar variant.
    expect(d.primary).not.toContain(' · ');
    expect(d.secondary).not.toContain(' · ');
  });

  test('worth variant best-value copy from PR #37 is preserved', () => {
    const d = describeBreakEven({
      worth_the_drive: true,
      savings_pence: 500,
      detour_miles: 3.2,
      fuel_cost_full_tank: 5600,
      price_per_l_pence: 140,
      tank_litres: 40,
    });
    expect(d.variant).toBe('worth');
    expect(d.primary).toBe('£5.00 cheaper per tank than your nearest station');
    expect(d.secondary).toContain('includes 3.2mi detour fuel');
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
    expect(d.primary).toBe('£2.37 cheaper per tank than your nearest station');
  });

  test('worth variant secondary includes detour caveat when detour_miles present', () => {
    const d = describeBreakEven({
      worth_the_drive: true,
      savings_pence: 380,
      detour_miles: 1.2,
    });
    expect(d.variant).toBe('worth');
    expect(d.secondary).toContain('includes 1.2mi detour fuel');
  });

  test('worth variant with no detour skips the detour caveat', () => {
    const d = describeBreakEven({
      worth_the_drive: true,
      savings_pence: 200,
      fuel_cost_full_tank: 5600,
      price_per_l_pence: 140,
      tank_litres: 40,
    });
    expect(d.variant).toBe('worth');
    expect(d.secondary).not.toMatch(/detour/);
    expect(d.secondary).toContain('£56.00 to fill');
  });

  test('worth variant primary never uses the legacy "cheaper to fill up here" copy', () => {
    const d = describeBreakEven({
      worth_the_drive: true,
      savings_pence: 420,
      detour_miles: 2.3,
    });
    expect(d.primary).not.toMatch(/cheaper to fill up here/);
    expect(d.primary).toMatch(/cheaper per tank than your nearest station/);
  });

  test('accessibility label for worth variant uses the new per-tank phrasing', () => {
    const d = describeBreakEven({
      worth_the_drive: true,
      savings_pence: 420,
      detour_miles: 2.3,
      fuel_cost_full_tank: 5600,
      price_per_l_pence: 140,
      tank_litres: 40,
    });
    expect(d.accessibilityLabel).toMatch(/£4\.20 cheaper per tank/);
    expect(d.accessibilityLabel).toMatch(/includes 2\.3 mile detour fuel/);
    expect(d.accessibilityLabel).not.toMatch(/net saving/);
    expect(d.accessibilityLabel).not.toMatch(/extra drive/);
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
