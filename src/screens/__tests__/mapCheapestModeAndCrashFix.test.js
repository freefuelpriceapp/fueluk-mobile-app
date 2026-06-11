/**
 * MapScreen — Cheapest mode behaviour + null-avgPrice crash hardening
 *
 * Regression coverage for the Jun 11 2026 niggle:
 * "The 'Cheapest' sorting option is a killer in heatmap or pins mode \u2014 only
 * one or two pins remain and the app crashes trying to tap anything."
 *
 * Two root causes:
 *
 *   1. The Cheapest mode chip was a styling no-op \u2014 it didn't actually
 *      filter or sort pins, so users picked it and saw nothing change.
 *      Now Cheapest mode keeps the bottom 50% of stations by price (with
 *      a minimum floor of 8) so the map visibly de-clutters.
 *
 *   2. Several .toFixed(1) call sites assumed avgPrice was numeric \u2014 but
 *      heatmap clusters with no parseable price for the current fuel type
 *      return avgPrice === null. Tapping such a cluster crashed the
 *      native bridge. All three call sites are now Number.isFinite-guarded.
 *
 * Source-text assertions (no JSX runtime available in this Jest config).
 */

const fs = require('fs');
const path = require('path');

const SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../MapScreen.js'),
  'utf8'
);

describe("MapScreen Cheapest mode \u2014 visibly filters the rendered set", () => {
  test("filteredStations memo branches on mode === 'cheapest'", () => {
    expect(SOURCE).toMatch(/mode === 'cheapest' && plausible\.length > 0/);
  });

  test('Cheapest branch sorts by price ascending', () => {
    expect(SOURCE).toMatch(/\.sort\(\(a, b\) => a\.p - b\.p\)/);
  });

  test('Cheapest branch keeps the bottom 50% but never drops below 8', () => {
    expect(SOURCE).toMatch(/Math\.max\(8,\s*Math\.ceil\(withPrices\.length\s*\*\s*0\.5\)\)/);
  });

  test("mode is in the filteredStations dep array so it re-runs when toggled", () => {
    // Look for the dep array including mode in the filteredStations block
    expect(SOURCE).toMatch(/\}, \[mappableStations, selectedBrand, fuelType, mode\]\)/);
  });
});

describe('MapScreen \u2014 null-avgPrice crash hardening', () => {
  test('heatmap marker accessibilityLabel guards c.avgPrice', () => {
    // Look for the Number.isFinite(c.avgPrice) guard in the heatmap Marker
    expect(SOURCE).toMatch(/Number\.isFinite\(c\.avgPrice\)\s*\?\s*c\.avgPrice\.toFixed/);
  });

  test('selectedCluster a11y label guards avgPrice', () => {
    expect(SOURCE).toMatch(
      /Number\.isFinite\(selectedCluster\.avgPrice\)\s*\?\s*selectedCluster\.avgPrice\.toFixed/
    );
  });

  test('selectedCluster headline text guards avgPrice', () => {
    // Two-line conditional ternary on avgPrice in the cluster callout title
    expect(SOURCE).toMatch(
      /Number\.isFinite\(selectedCluster\.avgPrice\)[\s\S]*?selectedCluster\.avgPrice\.toFixed\(1\)/
    );
  });

  test('selectedStation distance_km coerced via Number(...) before .toFixed', () => {
    // Strings, BigInt, etc. coerced safely so we never call .toFixed on a string
    expect(SOURCE).toMatch(/Number\.isFinite\(Number\(selectedStation\.distance_km\)\)/);
    expect(SOURCE).toMatch(/Number\(selectedStation\.distance_km\)\.toFixed\(1\)/);
  });
});
