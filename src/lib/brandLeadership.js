/**
 * src/lib/brandLeadership.js
 *
 * Phase 4: Brand Leadership.
 *
 * Pure helpers for ranking brands by cheapness + coverage across the
 * currently-loaded nearby stations. Used by BrandHeader / BrandFilter
 * to surface „current cheapest brand" style insight.
 *
 * No I/O, no side effects.
 */

import { resolvePrice } from './quarantine';

function brandKey(station) {
  const b = station?.brand;
  if (typeof b !== 'string') return 'Unknown';
  const t = b.trim();
  return t.length ? t : 'Unknown';
}

/**
 * Compute per-brand stats across a set of stations for one fuel type.
 *
 * Returns an array of:
 *   { brand, count, avgPpl, minPpl, stations: [] }
 * sorted ascending by avgPpl, breaking ties by count descending.
 *
 * Quarantined / priceless stations are skipped for ranking but
 * still counted in coverage.
 */
export function rankBrands(stations, fuelType) {
  if (!Array.isArray(stations) || !stations.length) return [];
  const byBrand = new Map();
  for (const s of stations) {
    const k = brandKey(s);
    if (!byBrand.has(k)) {
      byBrand.set(k, { brand: k, count: 0, prices: [], stations: [] });
    }
    const bucket = byBrand.get(k);
    bucket.count += 1;
    bucket.stations.push(s);
    if (s?.is_quarantined) continue;
    const p = resolvePrice(s, fuelType);
    if (p !== null) bucket.prices.push(p);
  }
  const out = [];
  for (const b of byBrand.values()) {
    const n = b.prices.length;
    const avgPpl = n ? b.prices.reduce((a, x) => a + x, 0) / n : null;
    const minPpl = n ? Math.min(...b.prices) : null;
    out.push({
      brand: b.brand,
      count: b.count,
      avgPpl,
      minPpl,
      stations: b.stations,
    });
  }
  out.sort((a, b) => {
    const av = a.avgPpl === null ? Infinity : a.avgPpl;
    const bv = b.avgPpl === null ? Infinity : b.avgPpl;
    if (av !== bv) return av - bv;
    return b.count - a.count;
  });
  return out;
}

/**
 * Return the "cheapest brand" summary object, or null if none can be ranked.
 *   { brand, avgPpl, minPpl, count, leadByPence }
 * where leadByPence = runnerUp.avgPpl - winner.avgPpl (pence, clamped >=0).
 */
export function cheapestBrand(stations, fuelType) {
  const ranked = rankBrands(stations, fuelType).filter((r) => r.avgPpl !== null);
  if (!ranked.length) return null;
  const winner = ranked[0];
  const runnerUp = ranked[1];
  const lead = runnerUp && runnerUp.avgPpl !== null ? Math.max(0, runnerUp.avgPpl - winner.avgPpl) : 0;
  return {
    brand: winner.brand,
    avgPpl: winner.avgPpl,
    minPpl: winner.minPpl,
    count: winner.count,
    leadByPence: lead,
  };
}

export default {
  rankBrands,
  cheapestBrand,
};
