const {
  PIN_TIER,
  TIER_STYLES,
  buildTierClassifier,
  classifyPin,
  tierStyle,
  isStale,
  ageHoursFromIso,
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

  test('tier 4 — muted grey', () => {
    const s = tierStyle(4);
    expect(s.bg).toBe('#6B7280');
    expect(s.text).toBe('#E5E7EB');
  });

  test('stale — 0.6 opacity', () => {
    const s = tierStyle('stale');
    expect(s.opacity).toBeCloseTo(0.6);
  });

  test('unknown tier falls back to middle (tier 3)', () => {
    expect(tierStyle('mystery')).toBe(TIER_STYLES[3]);
  });
});
