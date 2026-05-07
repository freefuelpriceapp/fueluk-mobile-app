/**
 * src/lib/vehicleFuelDefault.js
 *
 * Wave A.5 — Pick a sensible default fuel filter from the user's registered
 * vehicle. Replaces the hard-coded `'unleaded'` (and the inconsistent E5
 * defaults dotted across StationDetail / FlagPriceSheet) with a single
 * deterministic recommendation.
 *
 * E10/E5 eligibility rule
 * -----------------------
 * Per official UK government guidance at
 * https://www.gov.uk/check-vehicle-e10-petrol every petrol vehicle built
 * from 2011 onwards is factory-cleared for E10. E10 was rolled out across
 * UK forecourts in September 2021 as the standard 95-RON unleaded grade;
 * E5 (the old standard, now sold as Super Unleaded 97/99) is being phased
 * out at most stations and only remains relevant for older / classic
 * petrol engines that may suffer ethanol corrosion damage.
 *
 * All petrol/hybrid vehicles default to `'unleaded'`; the smart-resolver
 * returns `min(E10, E5)` so the cheapest 95-RON price wins regardless of
 * car age. The E5 opt-in link remains visible for pre-2011 drivers who
 * specifically need E5 super.
 *
 * @typedef {Object} Vehicle
 * @property {string} [fuel_type_detailed]  Backend column, e.g. 'PETROL'
 * @property {string} [fuel_type]           Legacy column, e.g. 'petrol'
 * @property {number} [engine_capacity_cc]  Engine CC, optional
 * @property {string} [monthOfFirstRegistration]  'YYYY-MM' string
 * @property {number|string} [year]         Manufacture year (fallback)
 */

const PETROL_PATTERNS = ['PETROL', 'GASOLINE'];
const DIESEL_PATTERNS = ['DIESEL'];
const ELECTRIC_PATTERNS = ['ELECTRIC', 'EV', 'BEV'];
const HYBRID_PATTERNS = ['HYBRID', 'PHEV'];

function normaliseType(vehicle) {
  if (!vehicle) return '';
  const a = vehicle.fuel_type_detailed;
  const b = vehicle.fuel_type;
  return String(a || b || '').toUpperCase();
}

function deriveYear(vehicle) {
  if (!vehicle) return null;
  const m = vehicle.monthOfFirstRegistration;
  if (typeof m === 'string') {
    const match = m.match(/^(\d{4})/);
    if (match) {
      const y = Number(match[1]);
      if (Number.isFinite(y) && y >= 1900 && y <= 2100) return y;
    }
  }
  if (typeof vehicle.year === 'number' && Number.isFinite(vehicle.year)) {
    return vehicle.year;
  }
  if (typeof vehicle.year === 'string') {
    const y = Number(vehicle.year);
    if (Number.isFinite(y)) return y;
  }
  return null;
}

function matchesAny(haystack, patterns) {
  if (!haystack) return false;
  return patterns.some((p) => haystack.includes(p));
}

/**
 * Recommended fuel-filter key for a registered vehicle.
 *
 * Branch order:
 *   1. DIESEL family       → 'diesel'
 *   2. ELECTRIC / EV / BEV → null  (no fuel filter applies)
 *   3. PETROL or HYBRID    → always 'unleaded'; smart-resolver returns
 *                             min(E10, E5) so cheapest 95-RON wins
 *   4. Anything unknown    → 'unleaded' (best-guess for the modal UK driver)
 *
 * Returns one of: 'unleaded' | 'super_unleaded' | 'diesel' | 'premium_diesel' | null.
 *
 * @param {Vehicle|null|undefined} vehicle
 * @returns {string|null}
 */
function recommendedFuelKey(vehicle) {
  if (!vehicle || typeof vehicle !== 'object') return 'unleaded';

  const t = normaliseType(vehicle);

  if (matchesAny(t, DIESEL_PATTERNS)) return 'diesel';

  // Hybrids and combined "PETROL/ELECTRIC" / "PETROL/EV" labels still need
  // unleaded; check petrol/hybrid BEFORE the EV branch so the slash form
  // doesn't false-match the ELECTRIC pattern.
  const isPetrolOrHybrid = matchesAny(t, HYBRID_PATTERNS) || /\bPETROL\b/.test(t);
  if (isPetrolOrHybrid) {
    // Always recommend unleaded. The smart-resolver returns min(E10, E5)
    // per station so users see the cheapest 95-RON pump price regardless
    // of vehicle age. Pre-2011 drivers who need E5 specifically have the
    // explicit E5 opt-in link below the chip row.
    return 'unleaded';
  }

  if (matchesAny(t, ELECTRIC_PATTERNS)) return null;

  return 'unleaded';
}

/**
 * Map the recommended key to the alert-table fuel-type. The alert backend
 * expects per-grade rows, so 'unleaded' becomes 'e10' (the post-2021 UK
 * default 95-RON grade). Other keys pass through.
 *
 * @param {string|null|undefined} key
 * @returns {string}
 */
function alertFuelKeyFor(key) {
  if (key === 'unleaded') return 'e10';
  if (!key) return 'e10';
  return key;
}

/**
 * Build a short user-facing reason string for why a fuel was recommended.
 * Returns null when no recommendation can be expressed (e.g. EV).
 *
 * @param {Vehicle|null|undefined} vehicle
 * @returns {string|null}
 */
function recommendedReason(vehicle) {
  if (!vehicle) return null;
  const key = recommendedFuelKey(vehicle);
  if (!key) return null;
  const make = vehicle.make ? String(vehicle.make).trim() : '';
  const model = vehicle.model ? String(vehicle.model).trim() : '';
  const year = deriveYear(vehicle);
  const desc = [year, make, model].filter(Boolean).join(' ').trim();
  if (!desc) return null;
  if (key === 'unleaded') return `E10 \u2014 recommended for your ${desc}`;
  if (key === 'super_unleaded') return `Super (E5) \u2014 recommended for your ${desc}`;
  if (key === 'diesel') return `Diesel \u2014 recommended for your ${desc}`;
  if (key === 'premium_diesel') return `Premium Diesel \u2014 recommended for your ${desc}`;
  return null;
}

module.exports = {
  recommendedFuelKey,
  alertFuelKeyFor,
  recommendedReason,
};
module.exports.default = module.exports;
