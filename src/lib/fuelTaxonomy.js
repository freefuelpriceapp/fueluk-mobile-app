/**
 * src/lib/fuelTaxonomy.js
 *
 * Single source of truth for fuel-type identifiers and their consumer-facing
 * labels. Audit items B-04, B-05, B-11 found that fuel-key strings and label
 * maps were duplicated across screens with inconsistent coverage:
 *   - AlertsScreen only knew petrol/diesel/e10 — super_unleaded and
 *     premium_diesel rendered as `undefined`
 *   - StationDetailScreen used `petrol` as the display key for E5
 *   - VehicleSettingsScreen used `e5`
 *
 * Anything that maps a fuel key to a display label, a backend field, or a
 * colour should import from here.
 *
 * Wave A.4 — IMPORTANT: BACKEND_FIELD_FOR_KEY['unleaded'] is intentionally
 * `null`. The synthetic 'unleaded' key cannot be expressed as a single
 * backend field — it resolves per-station to min(e10_price, petrol_price)
 * via resolveUnleadedPrice. Callers ranking, sorting or displaying a
 * headline price for 'unleaded' MUST use resolvePriceForKey from
 * ./fuelResolution; mapping it to a single column was the root cause of
 * the E5/E10 sort regression that Wave A.4 fixes.
 */

// Canonical taxonomy keys — what the app uses for fuel-type identifiers in
// code, AsyncStorage, and IDs. The four consumer-facing keys.
export const FUEL_KEYS = ['unleaded', 'super_unleaded', 'diesel', 'premium_diesel'];

// Display labels shown in UI. Use these instead of redeclaring local maps.
export const FUEL_LABELS = {
  unleaded: 'Petrol',
  super_unleaded: 'Premium 97/99',
  diesel: 'Diesel',
  premium_diesel: 'Premium Diesel',

  // Legacy aliases — backend wire formats and pre-Wave-A.3 keys may still
  // appear in payloads. Listing them here means components that look up a
  // label via FUEL_LABELS[key] never render `undefined`.
  petrol: 'Petrol',
  e10: 'Petrol (E10)',
  e5: 'Premium 97/99',
  premiumDiesel: 'Premium Diesel',
};

// Map taxonomy keys → backend response field on the station payload.
// 'unleaded' is null on purpose — it has no single wire field; use
// resolvePriceForKey from ./fuelResolution instead. Reading
// BACKEND_FIELD_FOR_KEY['unleaded'] returns null, which is a deliberate
// fail-loud signal: any caller that does so will hand `null` to the
// price-lookup pipeline and immediately see a missing-price, rather than
// silently picking E5 over the cheaper E10.
export const BACKEND_FIELD_FOR_KEY = {
  unleaded: null,
  super_unleaded: 'super_unleaded_price',
  diesel: 'diesel_price',
  premium_diesel: 'premium_diesel_price',

  // Legacy aliases — these are single-grade keys, so a direct field is fine.
  petrol: 'petrol_price',
  e10: 'e10_price',
  e5: 'petrol_price',
  premiumDiesel: 'premium_diesel_price',
};

// Convenience helper — returns the label for a fuel key, falling back to the
// raw key (Title Cased) so we never render `undefined`.
export function labelForFuelKey(key) {
  if (key == null) return '';
  const k = String(key);
  if (FUEL_LABELS[k]) return FUEL_LABELS[k];
  // Best-effort fallback: replace underscores, title-case.
  return k
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default {
  FUEL_KEYS,
  FUEL_LABELS,
  BACKEND_FIELD_FOR_KEY,
  labelForFuelKey,
};
