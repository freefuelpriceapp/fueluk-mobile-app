const { priceTier, markerVisuals, TIER } = require('../markerStyle');

describe('priceTier', () => {
  const buildCohort = () => [120, 125, 130, 135, 140, 145, 150, 155, 160];

  test('returns CHEAP for prices in the bottom quartile', () => {
    expect(priceTier({ price: 120, cohort: buildCohort() })).toBe(TIER.CHEAP);
    expect(priceTier({ price: 125, cohort: buildCohort() })).toBe(TIER.CHEAP);
  });

  test('returns EXPENSIVE for prices in the top quartile', () => {
    expect(priceTier({ price: 160, cohort: buildCohort() })).toBe(TIER.EXPENSIVE);
    expect(priceTier({ price: 155, cohort: buildCohort() })).toBe(TIER.EXPENSIVE);
  });

  test('returns MID for prices in the middle', () => {
    expect(priceTier({ price: 140, cohort: buildCohort() })).toBe(TIER.MID);
  });

  test('returns MID when cohort is too small to establish quartiles', () => {
    expect(priceTier({ price: 137, cohort: [140, 138] })).toBe(TIER.MID);
    expect(priceTier({ price: 137, cohort: [] })).toBe(TIER.MID);
    expect(priceTier({ price: 137 })).toBe(TIER.MID);
  });

  test('returns STALE when lastUpdated is older than 72h even for cheap prices', () => {
    const old = new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString();
    expect(
      priceTier({ price: 120, cohort: buildCohort(), lastUpdatedIso: old })
    ).toBe(TIER.STALE);
  });

  test('returns UNKNOWN when price is missing or NaN', () => {
    expect(priceTier({ price: null, cohort: buildCohort() })).toBe(TIER.UNKNOWN);
    expect(priceTier({ price: undefined, cohort: buildCohort() })).toBe(TIER.UNKNOWN);
    expect(priceTier({ price: NaN, cohort: buildCohort() })).toBe(TIER.UNKNOWN);
  });
});

describe('markerVisuals snapshot per tier', () => {
  test('CHEAP — bright green with glow', () => {
    expect(markerVisuals({ tier: TIER.CHEAP, isSelected: false })).toEqual({
      bg: '#10B981',
      text: '#FFFFFF',
      glow: true,
      opacity: 1,
      scale: 1,
    });
  });

  test('MID — neutral dark with white text', () => {
    expect(markerVisuals({ tier: TIER.MID, isSelected: false })).toEqual({
      bg: '#1F2937',
      text: '#FFFFFF',
      glow: false,
      opacity: 1,
      scale: 1,
    });
  });

  test('EXPENSIVE — warm grey, no glow', () => {
    expect(markerVisuals({ tier: TIER.EXPENSIVE, isSelected: false })).toEqual({
      bg: '#4B5563',
      text: '#E5E7EB',
      glow: false,
      opacity: 1,
      scale: 1,
    });
  });

  test('STALE — reduced opacity 0.5', () => {
    const v = markerVisuals({ tier: TIER.STALE, isSelected: false });
    expect(v.opacity).toBe(0.5);
  });

  test('isSelected scales the pin 1.15x', () => {
    const v = markerVisuals({ tier: TIER.MID, isSelected: true });
    expect(v.scale).toBeCloseTo(1.15);
  });
});
