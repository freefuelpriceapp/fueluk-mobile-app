const {
  PIN_TIER,
  TIER_STYLES,
  buildTierClassifier,
  classifyPin,
  tierStyle,
  isStale,
  ageHoursFromIso,
  computeSavingsDelta,
  formatSavingsDelta,
} = require('../priceTiers');

describe('buildTierClassifier', () => {
  test('classifies 10 varied prices into roughly 10/15/50/25 buckets', () => {
    const prices = [130, 132, 135, 138, 140, 142, 145, 148, 155, 160];
    const classify = buildTierClassifier(prices);

    // cheapest bottom ~10%
    expect(classify(130)).toBe(PIN_TIER.CHEAPEST);

    // cheap / next ~15% (still under the 25th percentile cutoff)
    expect(classify(132)).toBe(PIN_TIER.CHEAP);

    // middle ~50%
    expect(classify(140)).toBe(PIN_TIER.MID);
    expect(classify(145)).toBe(PIN_TIER.MID);

    // expensive ~25%
    expect(classify(160)).toBe(PIN_TIER.PRICEY);
  });

  test('classifies a 20-station cohort cleanly across tiers', () => {
    const prices = [];
    for (let i = 0; i < 20; i++) prices.push(130 + i);
    const classify = buildTierClassifier(prices);
    expect(classify(130)).toBe(PIN_TIER.CHEAPEST);
    expect(classify(149)).toBe(PIN_TIER.PRICEY);
  });

  test('small sets (<6 stations) skip the expensive tier', () => {
    const prices = [130, 135, 140, 145];
    const classify = buildTierClassifier(prices);
    expect(classify(130)).toBe(PIN_TIER.CHEAPEST);
    // Expensive collapses into MID for small sets.
    expect(classify(145)).not.toBe(PIN_TIER.PRICEY);
    expect(classify(145)).toBe(PIN_TIER.MID);
  });

  test('all-same-price cohort keeps everyone at cheapest', () => {
    const prices = [140, 140, 140, 140, 140, 140];
    const classify = buildTierClassifier(prices);
    expect(classify(140)).toBe(PIN_TIER.CHEAPEST);
  });

  test('empty cohort falls back to MID', () => {
    const classify = buildTierClassifier([]);
    expect(classify(137)).toBe(PIN_TIER.MID);
  });

  test('ignores non-finite entries when building the cohort', () => {
    const prices = [130, NaN, undefined, null, 135, 140, 145, 150, 155, 160];
    const classify = buildTierClassifier(prices);
    expect(classify(130)).toBe(PIN_TIER.CHEAPEST);
    expect(classify(160)).toBe(PIN_TIER.PRICEY);
  });

  test('non-finite input price returns MID', () => {
    const classify = buildTierClassifier([130, 140, 150, 160, 170, 180]);
    expect(classify(NaN)).toBe(PIN_TIER.MID);
    expect(classify(null)).toBe(PIN_TIER.MID);
  });
});

describe('classifyPin', () => {
  const buildCohort = () => [130, 132, 135, 138, 140, 142, 145, 148, 155, 160];

  test('returns STALE when lastUpdatedIso is older than 24h', () => {
    const old = new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString();
    expect(
      classifyPin({ price: 130, visiblePrices: buildCohort(), lastUpdatedIso: old })
    ).toBe(PIN_TIER.STALE);
  });

  test('fresh price classified normally', () => {
    const fresh = new Date(Date.now() - 1000 * 60 * 10).toISOString();
    expect(
      classifyPin({ price: 130, visiblePrices: buildCohort(), lastUpdatedIso: fresh })
    ).toBe(PIN_TIER.CHEAPEST);
  });

  test('missing lastUpdatedIso treated as fresh', () => {
    expect(
      classifyPin({ price: 160, visiblePrices: buildCohort() })
    ).toBe(PIN_TIER.PRICEY);
  });
});

describe('isStale / ageHoursFromIso', () => {
  test('null / invalid ISO returns null/false', () => {
    expect(ageHoursFromIso(null)).toBeNull();
    expect(ageHoursFromIso('')).toBeNull();
    expect(ageHoursFromIso('nope')).toBeNull();
    expect(isStale(null)).toBe(false);
  });

  test('recent timestamp is fresh', () => {
    const iso = new Date(Date.now() - 1000 * 60 * 30).toISOString();
    expect(isStale(iso)).toBe(false);
  });

  test('30h old timestamp is stale', () => {
    const iso = new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString();
    expect(isStale(iso)).toBe(true);
  });
});

describe('tierStyle snapshots', () => {
  test('tier 1 (cheapest) — bright green, glow, 1.1 scale', () => {
    const s = tierStyle(1);
    expect(s.bg).toBe('#10B981');
    expect(s.glow).toBe(true);
    expect(s.scale).toBeCloseTo(1.1);
    expect(s.opacity).toBe(1);
  });

  test('tier 2 — green outline on dark', () => {
    const s = tierStyle(2);
    expect(s.bg).toBe('#1F2937');
    expect(s.border).toBe('#10B981');
    expect(s.glow).toBe(false);
  });

  test('tier 3 — neutral dark', () => {
    const s = tierStyle(3);
    expect(s.bg).toBe('#1F2937');
    expect(s.border).toBe('#1F2937');
    expect(s.opacity).toBe(1);
  });

  test('tier 4 — muted grey, minimal', () => {
    const s = tierStyle(4);
    // tier 4 bg was #6B7280 before the v3 upgrade — it's now a slightly
    // darker grey (#4B5563) with a lighter border so the "dot" recedes.
    expect(s.bg).toBe('#4B5563');
    expect(s.text).toBe('#E5E7EB');
    expect(s.showDelta).toBe(false);
    expect(s.showDistance).toBe(false);
  });

  test('stale — 0.6 opacity', () => {
    const s = tierStyle('stale');
    expect(s.opacity).toBeCloseTo(0.6);
  });

  test('unknown tier falls back to middle (tier 3)', () => {
    expect(tierStyle('mystery')).toBe(TIER_STYLES[3]);
  });
});

describe('tier style — layout (v3 hierarchy)', () => {
  test('tier 1 (cheapest) is the largest card — hero font + biggest minWidth', () => {
    const s1 = tierStyle(1);
    const s2 = tierStyle(2);
    const s3 = tierStyle(3);
    const s4 = tierStyle(4);
    expect(s1.priceFont).toBeGreaterThan(s2.priceFont);
    expect(s2.priceFont).toBeGreaterThan(s3.priceFont);
    expect(s3.priceFont).toBeGreaterThan(s4.priceFont);
    expect(s1.minWidth).toBeGreaterThan(s2.minWidth);
    expect(s2.minWidth).toBeGreaterThan(s3.minWidth);
    expect(s3.minWidth).toBeGreaterThan(s4.minWidth);
  });

  test('tier 1 & 2 show savings delta; tier 3 & 4 do not', () => {
    expect(tierStyle(1).showDelta).toBe(true);
    expect(tierStyle(2).showDelta).toBe(true);
    expect(tierStyle(3).showDelta).toBe(false);
    expect(tierStyle(4).showDelta).toBe(false);
  });

  test('tier 1 & 2 show distance; tier 3 & 4 do not', () => {
    expect(tierStyle(1).showDistance).toBe(true);
    expect(tierStyle(2).showDistance).toBe(true);
    expect(tierStyle(3).showDistance).toBe(false);
    expect(tierStyle(4).showDistance).toBe(false);
  });

  test('elevated tiers allow longer brand labels (up to 12 chars)', () => {
    expect(tierStyle(1).brandMaxLen).toBeGreaterThanOrEqual(12);
    expect(tierStyle(2).brandMaxLen).toBeGreaterThanOrEqual(12);
    // Neutral/expensive tiers get shorter labels for compactness.
    expect(tierStyle(3).brandMaxLen).toBeLessThan(12);
    expect(tierStyle(4).brandMaxLen).toBeLessThan(tierStyle(3).brandMaxLen + 1);
  });

  test('stale tier stays desaturated', () => {
    const s = tierStyle('stale');
    expect(s.opacity).toBeLessThan(1);
  });
});

describe('computeSavingsDelta', () => {
  test('returns negative delta for prices below average', () => {
    const prices = [140, 142, 145, 148, 150];
    // avg = 145, a station at 140 is -5p below
    expect(computeSavingsDelta(140, prices)).toBeCloseTo(-5);
  });

  test('returns positive delta for prices above average', () => {
    const prices = [140, 142, 145, 148, 150];
    expect(computeSavingsDelta(150, prices)).toBeCloseTo(5);
  });

  test('rounds to 1 decimal place', () => {
    const prices = [140, 142, 145];
    // avg = 142.333…, station at 138 → -4.333 → rounded to -4.3
    expect(computeSavingsDelta(138, prices)).toBeCloseTo(-4.3, 1);
  });

  test('returns null when cohort has fewer than 3 prices', () => {
    expect(computeSavingsDelta(140, [])).toBeNull();
    expect(computeSavingsDelta(140, [140])).toBeNull();
    expect(computeSavingsDelta(140, [140, 145])).toBeNull();
  });

  test('returns null for non-finite input prices', () => {
    const prices = [140, 142, 145, 148];
    expect(computeSavingsDelta(null, prices)).toBeNull();
    expect(computeSavingsDelta(undefined, prices)).toBeNull();
    expect(computeSavingsDelta(NaN, prices)).toBeNull();
  });

  test('ignores non-finite entries in the cohort', () => {
    const prices = [140, NaN, null, 145, 150];
    expect(computeSavingsDelta(140, prices)).not.toBeNull();
  });
});

describe('formatSavingsDelta', () => {
  test('formats negative deltas with a minus sign', () => {
    expect(formatSavingsDelta(-4.2)).toBe('−4.2p');
  });

  test('formats positive deltas with a plus sign', () => {
    expect(formatSavingsDelta(2.1)).toBe('+2.1p');
  });

  test('returns null for small deltas (below 1p threshold)', () => {
    expect(formatSavingsDelta(0.4)).toBeNull();
    expect(formatSavingsDelta(-0.9)).toBeNull();
  });

  test('honours a custom threshold', () => {
    expect(formatSavingsDelta(-0.5, 0.3)).toBe('−0.5p');
    expect(formatSavingsDelta(-0.5, 2.0)).toBeNull();
  });

  test('returns null for nullish / non-finite input', () => {
    expect(formatSavingsDelta(null)).toBeNull();
    expect(formatSavingsDelta(undefined)).toBeNull();
    expect(formatSavingsDelta(NaN)).toBeNull();
  });
});
