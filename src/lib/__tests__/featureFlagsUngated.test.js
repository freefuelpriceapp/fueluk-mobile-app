/**
 * Tests for src/lib/featureFlags.js
 *
 * Audit item LB-05: price_alerts and price_history_charts must be free for
 * all users — no paywall, no sign-up wall, no "premium" gating. These tests
 * pin those flags ON so a future change cannot silently regress that.
 */

const { FEATURES, isEnabled, getActiveFeatures } = require('../featureFlags');

describe('feature flags — ungated launch features', () => {
  it('priceAlerts is enabled (LB-05: must be free for all users)', () => {
    expect(FEATURES.priceAlerts).toBe(true);
    expect(isEnabled('priceAlerts')).toBe(true);
  });

  it('priceHistoryCharts is enabled (LB-05: core money-saving feature)', () => {
    expect(FEATURES.priceHistoryCharts).toBe(true);
    expect(isEnabled('priceHistoryCharts')).toBe(true);
  });

  it('does not expose any premium / paywall flag', () => {
    // If a future change reintroduces a premium gate via a flag named
    // `premium*`, this test will fail and surface it for review.
    const flagNames = Object.keys(FEATURES);
    const paywallFlags = flagNames.filter((name) =>
      /^premium/i.test(name) || /paywall/i.test(name)
    );
    expect(paywallFlags).toEqual([]);
  });

  it('lists priceAlerts and priceHistoryCharts in the active features set', () => {
    const active = getActiveFeatures();
    expect(active).toContain('priceAlerts');
    expect(active).toContain('priceHistoryCharts');
  });
});
