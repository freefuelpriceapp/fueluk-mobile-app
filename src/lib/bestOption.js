/**
 * bestOption — helpers for choosing the Best Option station to highlight.
 *
 * The backend's /nearby response is authoritative: it returns a `best_option`
 * object with the station it has chosen, along with a `selected_reason`
 * string. The app must render that station verbatim — no client-side
 * recomputation, no re-sorting, no weighted scores.
 *
 * Fallback: if the backend omits `best_option` (edge case for empty radius
 * or error), pick the nearest non-stale station that has a petrol price.
 */

const { resolvePrice, evaluateStation } = require('./quarantine');

/**
 * Extract the backend's Best Option station from a /nearby payload.
 * Returns the station-shaped object (or null if missing/malformed).
 */
function extractBestOption(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const bo = payload.best_option;
  if (!bo || typeof bo !== 'object') return null;
  // Backend may return {station: {...}, selected_reason: ...} or a flat
  // station-like object. Normalise to the station.
  if (bo.station && typeof bo.station === 'object') return bo.station;
  if (typeof bo.id !== 'undefined' || typeof bo.name === 'string') return bo;
  return null;
}

/**
 * Fallback: nearest non-stale station with a resolvable petrol price.
 * Used only when backend omits best_option.
 */
function pickFallbackBest(stations, fuelType = 'petrol') {
  if (!Array.isArray(stations) || !stations.length) return null;
  const getDistance = (s) => {
    if (!s) return Infinity;
    const m = Number(s.distance_miles);
    if (Number.isFinite(m)) return m;
    const km = Number(s.distance_km);
    if (Number.isFinite(km)) return km / 1.60934;
    return Infinity;
  };
  const candidates = stations.filter((s) => {
    const evalResult = evaluateStation(s, fuelType);
    return !evalResult.quarantined && resolvePrice(s, fuelType) != null;
  });
  if (!candidates.length) return null;
  return candidates.slice().sort((a, b) => getDistance(a) - getDistance(b))[0];
}

/**
 * Choose the Best Option station. Prefer the backend's choice; fall back to
 * nearest non-stale station only if backend omits it.
 */
function chooseBestOption(payload, stations, fuelType = 'petrol') {
  const fromBackend = extractBestOption(payload);
  if (fromBackend) return fromBackend;
  return pickFallbackBest(stations, fuelType);
}

module.exports = {
  extractBestOption,
  pickFallbackBest,
  chooseBestOption,
};
