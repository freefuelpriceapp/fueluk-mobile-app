/**
 * src/lib/fuelResolution.js
 *
 * "Smart Unleaded" resolver. UK forecourts split 95-RON unleaded reporting
 * across two columns — supermarkets typically only fill `e10_price`, while
 * gov-data-fed independents fill `petrol_price`. To rank stations apples-
 * to-apples on the fuel almost every UK driver actually buys, the
 * `'unleaded'` fuel-type collapses both fields per-station to whichever
 * plausible price is lower.
 *
 * The detail screen still surfaces E5 / E10 separately — only the
 * ranking / sorting / headline-display layer uses the smart-min.
 */
import { evaluateStation, resolvePrice as resolvePriceRaw } from './quarantine';
import { BACKEND_FIELD_FOR_KEY } from './fuelTaxonomy';

export const UNLEADED_FIELDS = ['e10_price', 'petrol_price'];

function pickPlausible(station) {
  const out = { e10: null, petrol: null };
  if (!station) return out;
  const e10 = evaluateStation(station, 'e10');
  if (!e10.quarantined && typeof e10.price === 'number') out.e10 = e10.price;
  const petrol = evaluateStation(station, 'petrol');
  if (!petrol.quarantined && typeof petrol.price === 'number') out.petrol = petrol.price;
  return out;
}

/**
 * Lowest plausible 95-RON unleaded price for a station, picking the min of
 * `e10_price` and `petrol_price` after each is evaluated against the
 * existing quarantine rules. Returns null when neither field has a usable
 * value.
 */
export function resolveUnleadedPrice(station) {
  const { e10, petrol } = pickPlausible(station);
  if (e10 == null && petrol == null) return null;
  if (e10 == null) return petrol;
  if (petrol == null) return e10;
  return Math.min(e10, petrol);
}

/**
 * Same as resolveUnleadedPrice but also tells the caller which underlying
 * field was picked. Useful for the source badge / "from {brand} feed"
 * tooltip in the UI.
 */
export function resolveUnleadedDetail(station) {
  const { e10, petrol } = pickPlausible(station);
  if (e10 == null && petrol == null) {
    return { price: null, sourceField: null, fuelType: null };
  }
  if (e10 != null && (petrol == null || e10 <= petrol)) {
    return { price: e10, sourceField: 'e10_price', fuelType: 'e10' };
  }
  return { price: petrol, sourceField: 'petrol_price', fuelType: 'petrol' };
}

/**
 * Generic price resolver respecting the synthetic 'unleaded' key. For all
 * other fuel types, callers should keep using `resolvePrice` from
 * quarantine.js — this helper exists so ranking/sorting code can switch
 * uniformly on user-facing fuel type without sprinkling 'unleaded' checks
 * through every call site.
 */
export function resolvePriceForFuelType(station, fuelType) {
  if (fuelType === 'unleaded') return resolveUnleadedPrice(station);
  return null;
}

/**
 * Wave A.4 — universal price resolver covering every taxonomy key.
 *
 * For 'unleaded' this delegates to resolveUnleadedPrice (= min of E10/E5).
 * For every other key it reads the backend field from BACKEND_FIELD_FOR_KEY
 * and applies the standard quarantine rules via resolvePrice. Returns null
 * when no plausible price is available.
 *
 * This is the function callers should use whenever they need a single
 * price for a station given a user-facing fuel key — it removes the trap
 * of mapping 'unleaded' to a single column.
 */
export function resolvePriceForKey(station, key) {
  if (!station || !key) return null;
  if (key === 'unleaded') return resolveUnleadedPrice(station);
  const field = BACKEND_FIELD_FOR_KEY[key];
  if (!field) return null;
  // Map taxonomy/legacy keys to the quarantine module's expected fuel type.
  // quarantine.evaluateStation accepts 'petrol' | 'e10' | 'diesel' | etc.
  const quarantineKey =
    key === 'super_unleaded' ? 'super_unleaded'
    : key === 'premium_diesel' ? 'premium_diesel'
    : key === 'premiumDiesel' ? 'premium_diesel'
    : key === 'e5' ? 'petrol'
    : key;
  const evalResult = evaluateStation(station, quarantineKey);
  if (evalResult && !evalResult.quarantined && typeof evalResult.price === 'number') {
    return evalResult.price;
  }
  // Fallback: try the raw resolvePrice (some quarantine variants don't
  // recognise every taxonomy key but do read the field directly).
  const direct = resolvePriceRaw ? resolvePriceRaw(station, quarantineKey) : null;
  if (typeof direct === 'number' && Number.isFinite(direct)) return direct;
  const raw = Number(station[field]);
  return Number.isFinite(raw) && raw > 0 ? raw : null;
}

export default {
  UNLEADED_FIELDS,
  resolveUnleadedPrice,
  resolveUnleadedDetail,
  resolvePriceForFuelType,
  resolvePriceForKey,
};
