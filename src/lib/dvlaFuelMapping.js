/**
 * dvlaFuelMapping.js — Wave A.8
 *
 * Client-side mirror of the backend dvlaFuelCategory mapping.  Used as the
 * fallback when the server does not return a `fuel_category` field (e.g. old
 * backend, cached responses, mock data).
 *
 * The authoritative path is:
 *   1. resp.fuel_category  (new server-derived canonical key — use directly)
 *   2. mapDvlaFuelToCanonical(resp.fuel_type || resp.fuelType)  (client-side)
 *   3. null  → surface soft notice, let user confirm
 *
 * Mapping (case-insensitive):
 *   DIESEL                               → 'diesel'
 *   PETROL, GASOLINE                     → 'unleaded'
 *   HYBRID ELECTRIC, HYBRID, PHEV,
 *   PETROL/ELECTRIC                      → 'unleaded'  (hybrids burn 95-RON)
 *   ELECTRICITY, ELECTRIC, EV, BEV       → 'electric'
 *   anything else / empty / null         → null
 *
 * @param {string|null|undefined} rawFuelString - Raw DVLA fuelType value
 * @returns {'diesel'|'unleaded'|'electric'|null}
 */
export function mapDvlaFuelToCanonical(rawFuelString) {
  if (!rawFuelString || typeof rawFuelString !== 'string') return null;
  const upper = rawFuelString.trim().toUpperCase();
  if (!upper) return null;

  // Diesel — check first
  if (upper === 'DIESEL' || (upper.includes('DIESEL') && !upper.includes('HYBRID'))) {
    return 'diesel';
  }

  // Hybrids — must be checked BEFORE pure electric because "HYBRID ELECTRIC"
  // and "PETROL/ELECTRIC" should map to 'unleaded'.
  if (
    upper.includes('HYBRID') ||
    upper.includes('PHEV') ||
    upper.includes('PETROL/ELECTRIC') ||
    upper.includes('PETROL / ELECTRIC')
  ) {
    return 'unleaded';
  }

  // Pure electric
  if (
    upper === 'ELECTRICITY' ||
    upper === 'ELECTRIC' ||
    upper === 'EV' ||
    upper === 'BEV' ||
    upper.includes('ELECTRIC')
  ) {
    return 'electric';
  }

  // Petrol / gasoline
  if (upper.includes('PETROL') || upper.includes('GASOLINE')) return 'unleaded';

  return null;
}

/**
 * Map a canonical fuel category ('diesel'|'unleaded'|'electric'|null) to the
 * app's internal taxonomy key used in FUEL_OPTIONS.
 *
 * electric → null  (EVs are not in the fuel price list — caller should handle)
 * diesel   → 'diesel'
 * unleaded → 'unleaded'  (default to E10)
 * null     → null
 *
 * @param {string|null} fuelCategory
 * @returns {'diesel'|'unleaded'|null}
 */
export function fuelCategoryToTaxonomyKey(fuelCategory) {
  if (!fuelCategory) return null;
  switch (fuelCategory) {
    case 'diesel':   return 'diesel';
    case 'unleaded': return 'unleaded';
    case 'electric': return null; // EVs shown as null — no pump fuel needed
    default:         return null;
  }
}
