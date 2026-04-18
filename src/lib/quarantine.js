/**
 * src/lib/quarantine.js
 *
 * Quarantine-safe price UX (Phase 1).
 *
 * Goals:
 *   - Valid stations stay visible in the list.
 *   - Suspect prices never enter "best" / "cheapest" ranking.
 *   - Reasons are explicit so UI can explain fallback state.
 *
 * A price is quarantined if ANY of the following is true:
 *   - Missing / non-numeric.
 *   - Outside a plausible pence-per-litre range for UK forecourts.
 *   - Deviates from the local cohort median by more than MAX_DEVIATION_P.
 *   - Flagged upstream via station.is_quarantined or price.is_suspect.
 *   - Last updated timestamp is older than MAX_AGE_H.
 */

// Plausible UK pump price range in pence per litre. Tune over time.
const MIN_PPL = 80;
const MAX_PPL = 250;

// Maximum age (hours) before a price is excluded from ranking.
const MAX_AGE_H = 24 * 7;

// Max deviation from cohort median (in pence) before quarantine.
const MAX_DEVIATION_P = 25;

const PRICE_FIELD = {
  petrol: 'petrol_price',
  diesel: 'diesel_price',
  e10: 'e10_price',
  super_unleaded: 'super_unleaded_price',
  premium_diesel: 'premium_diesel_price',
};

function toNum(v) {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return isNaN(n) ? null : n;
}

export function resolvePrice(station, fuelType) {
  const prices = station?.prices || {};
  const fromPrices = toNum(prices[fuelType]);
  if (fromPrices !== null) return fromPrices;
  const field = PRICE_FIELD[fuelType];
  return field ? toNum(station?.[field]) : null;
}

function ageHours(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return (Date.now() - d.getTime()) / 3600000;
}

function median(nums) {
  const arr = nums.filter((n) => typeof n === 'number' && !isNaN(n)).slice().sort((a, b) => a - b);
  if (!arr.length) return null;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid];
}

/**
 * Evaluate a single station for a fuel type. Returns:
 *   { quarantined: boolean, reason: string | null, price: number | null }
 *
 * `cohortMedian` is optional; when provided, deviation checks run.
 */
export function evaluateStation(station, fuelType, cohortMedian = null) {
  const price = resolvePrice(station, fuelType);

  if (station?.is_quarantined) {
    return { quarantined: true, reason: 'flagged_upstream', price };
  }
  if (price === null) {
    return { quarantined: true, reason: 'missing_price', price: null };
  }
  if (price < MIN_PPL || price > MAX_PPL) {
    return { quarantined: true, reason: 'out_of_range', price };
  }
  const age = ageHours(station?.last_updated);
  if (age !== null && age > MAX_AGE_H) {
    return { quarantined: true, reason: 'too_old', price };
  }
  if (
    cohortMedian !== null &&
    typeof cohortMedian === 'number' &&
    Math.abs(price - cohortMedian) > MAX_DEVIATION_P
  ) {
    return { quarantined: true, reason: 'deviates_from_cohort', price };
  }
  return { quarantined: false, reason: null, price };
}

/**
 * Filter stations suitable for ranking (e.g. BestOption).
 * The original list is NOT mutated and station visibility elsewhere is
 * unaffected.
 */
export function filterRankable(stations, fuelType) {
  if (!Array.isArray(stations) || !stations.length) return [];

  // First pass: resolve prices to compute a cohort median.
  const rawPrices = stations.map((s) => resolvePrice(s, fuelType));
  const cohortMedian = median(rawPrices);

  // Second pass: evaluate each station against cohort.
  return stations.filter((s) => !evaluateStation(s, fuelType, cohortMedian).quarantined);
}

/**
 * Convenience predicate for UI consumers (e.g. StationCard trust line).
 */
export function isQuarantined(station, fuelType) {
  return evaluateStation(station, fuelType).quarantined;
}

export default {
  evaluateStation,
  filterRankable,
  isQuarantined,
  resolvePrice,
};

