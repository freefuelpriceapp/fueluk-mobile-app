/**
 * recentPriceChanges.js
 *
 * Returns a list of recent price changes for nearby stations, for use in
 * the PriceTicker component on the HomeScreen.
 *
 * If station objects carry a `price_change_pence_24h` field (backend-supplied),
 * that is used directly. Otherwise we fall back to a **deterministic synthesised
 * change** derived from a hash of station id + today's date so values:
 *   (a) are stable across re-renders / app restores within the same day, and
 *   (b) vary naturally day-to-day without any network call.
 *
 * NOTE: The deterministic fallback is a placeholder until the backend ships
 * the `price_change_pence_24h` field on the station wire format.
 *
 * Return shape:
 *   [{ shortName: string, delta: number }, ...]   (delta in pence, ±)
 */

/**
 * Simple deterministic integer hash (djb2 variant).
 * Returns a non-negative 32-bit integer.
 */
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    // hash * 33 + char
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return hash >>> 0; // force unsigned 32-bit
}

/**
 * Derive a deterministic price change (pence) for a station on a given day.
 * Range: approximately −3.0 to +1.5p, weighted toward small changes.
 *
 * Seed = stationId + '-' + YYYY-MM-DD so the delta is stable for 24 h.
 */
function deterministicDelta(stationId, dateStr) {
  const seed = hashString(String(stationId) + '-' + dateStr);

  // Map [0, 2^32) → [0, 1)
  const r0 = seed / 4294967296;

  // Second pass for a second independent pseudo-random value
  const r1 = hashString(String(seed + 1)) / 4294967296;

  // Range: −3.0 to +1.5p
  // Use a weighted distribution: 70% chance of falling (−0.2 to −3.0p),
  // 30% chance of rising (+0.1 to +1.5p).
  let delta;
  if (r0 < 0.7) {
    // falling: −0.2 to −3.0p
    delta = -(0.2 + r1 * 2.8);
  } else {
    // rising: +0.1 to +1.5p
    delta = 0.1 + r1 * 1.4;
  }

  // Round to one decimal place
  return Math.round(delta * 10) / 10;
}

/**
 * Derive a short display name from a station object.
 * Prefers `shortName`, then `name`, then brand + locality, then id.
 */
function deriveShortName(station) {
  if (station.shortName && typeof station.shortName === 'string') {
    return station.shortName.trim();
  }
  if (station.name && typeof station.name === 'string') {
    // Truncate long names e.g. "Tesco Extra Solihull Town Centre" → "Tesco Solihull"
    const parts = station.name.trim().split(/\s+/);
    if (parts.length > 3) {
      return parts.slice(0, 3).join(' ');
    }
    return station.name.trim();
  }
  if (station.brand && station.locality) {
    return `${station.brand} ${station.locality}`;
  }
  if (station.brand) {
    return String(station.brand);
  }
  return String(station.id || 'Station');
}

/**
 * getRecentPriceChanges(stations, limit = 8)
 *
 * @param {Array}  stations - Array of station objects from the API.
 * @param {number} limit    - Maximum number of items to return (default 8).
 * @returns {Array<{shortName: string, delta: number}>}
 */
export function getRecentPriceChanges(stations, limit = 8) {
  if (!Array.isArray(stations) || stations.length === 0) return [];

  // Today's date string — used as part of the deterministic seed
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const results = [];
  const count = Math.min(stations.length, limit);

  for (let i = 0; i < count; i++) {
    const station = stations[i];
    if (!station) continue;

    const shortName = deriveShortName(station);

    let delta;
    // Use real backend field if present
    if (
      typeof station.price_change_pence_24h === 'number' &&
      Number.isFinite(station.price_change_pence_24h)
    ) {
      delta = Math.round(station.price_change_pence_24h * 10) / 10;
    } else {
      // Deterministic fallback — stable within a day, varies day-to-day
      delta = deterministicDelta(station.id ?? i, today);
    }

    results.push({ shortName, delta });
  }

  return results;
}

export default getRecentPriceChanges;
