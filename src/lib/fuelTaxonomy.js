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
 * Wave A.3 (PR #53) renamed the consumer tab from "petrol/E10" to "unleaded";
 * the backend response field `petrol_price` is still the wire format, so the
 * taxonomy provides BACKEND_FIELD_FOR_KEY for translation.
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
// Keep the legacy keys mapped too so existing call sites (e.g.
// resolveUnleadedPrice helpers) work without churn.
export const BACKEND_FIELD_FOR_KEY = {
  unleaded: 'petrol_price',
  super_unleaded: 'super_unleaded_price',
  diesel: 'diesel_price',
  premium_diesel: 'premium_diesel_price',

  // Legacy aliases.
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
