import AsyncStorage from '@react-native-async-storage/async-storage';
import { mapDvlaFuelToCanonical } from './dvlaFuelMapping';

export const USER_VEHICLE_KEY = 'user_vehicle';
export const VEHICLE_PROMPT_DISMISSED_KEY = 'vehicle_prompt_dismissed_v1';
export const BEST_OPTION_MODE_KEY = 'best_option_mode';

// Official UK averages — used when the user picks a fuel type but doesn't
// have / know their mpg. Source: DfT/DEFRA fleet averages referenced in
// the feature brief. Deliberately conservative.
export const UK_AVG_MPG = {
  e10: 45,
  petrol: 45,
  e5: 42,
  super_unleaded: 42,
  b7: 55,
  diesel: 55,
  premium_diesel: 40,
};

export function defaultMpgFor(fuelType) {
  if (!fuelType || typeof fuelType !== 'string') return null;
  return UK_AVG_MPG[fuelType.toLowerCase()] || null;
}

export async function loadUserVehicle() {
  try {
    const raw = await AsyncStorage.getItem(USER_VEHICLE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

export async function saveUserVehicle(vehicle) {
  const clean = {
    reg: vehicle.reg ? String(vehicle.reg).toUpperCase().replace(/\s+/g, '') : undefined,
    fuel_type: vehicle.fuel_type || null,
    mpg: typeof vehicle.mpg === 'number' && Number.isFinite(vehicle.mpg) ? vehicle.mpg : null,
    make: vehicle.make || undefined,
    model: vehicle.model || undefined,
    year: typeof vehicle.year === 'number' ? vehicle.year : (vehicle.year || undefined),
    colour: typeof vehicle.colour === 'string'
      ? vehicle.colour
      : (typeof vehicle.color === 'string' ? vehicle.color : undefined),
    body_type: typeof vehicle.body_type === 'string'
      ? vehicle.body_type
      : (typeof vehicle.bodyType === 'string' ? vehicle.bodyType : undefined),
    source: vehicle.source || 'manual',
    updated_at: new Date().toISOString(),
  };
  await AsyncStorage.setItem(USER_VEHICLE_KEY, JSON.stringify(clean));
  return clean;
}

export async function clearUserVehicle() {
  try { await AsyncStorage.removeItem(USER_VEHICLE_KEY); } catch (_) {}
}

export async function isVehiclePromptDismissed() {
  try {
    const v = await AsyncStorage.getItem(VEHICLE_PROMPT_DISMISSED_KEY);
    return v === '1';
  } catch (_) {
    return false;
  }
}

export async function dismissVehiclePrompt() {
  try {
    await AsyncStorage.setItem(VEHICLE_PROMPT_DISMISSED_KEY, '1');
  } catch (_) {}
}

// ──────────────────────────────────────────────────────────────────────────────
// Wave A.8 — Silent DVLA truth backfill
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Feature flag key for the vehicle truth backfill.
 * Defaults ON; can be overridden via remote config by writing 'false' to this
 * AsyncStorage key (or wiring up your remote config provider).
 */
export const VEHICLE_TRUTH_BACKFILL_KEY = 'feature.vehicle_truth_backfill';

/**
 * Returns true when the backfill feature is enabled.
 * Defaults to ON so it runs on first foreground after the OTA ships.
 */
async function isBackfillEnabled() {
  try {
    const val = await AsyncStorage.getItem(VEHICLE_TRUTH_BACKFILL_KEY);
    // Explicit 'false' disables; anything else (including null = not set) → ON.
    return val !== 'false';
  } catch (_) {
    return true;
  }
}

/**
 * logDiagnostic — lightweight structured event log written to AsyncStorage.
 * Does not throw; safe to call fire-and-forget.
 */
async function logDiagnostic(event, payload) {
  try {
    const key = 'diagnostics_log';
    const raw = await AsyncStorage.getItem(key);
    const existing = raw ? JSON.parse(raw) : [];
    const entry = { event, ...payload, ts: new Date().toISOString() };
    // Keep last 50 entries
    const updated = [entry, ...existing].slice(0, 50);
    await AsyncStorage.setItem(key, JSON.stringify(updated));
  } catch (_) {}
}

/**
 * runVehicleTruthBackfill — Wave A.8 one-shot silent backfill.
 *
 * Call on app foreground. Checks if the saved vehicle was DVLA-sourced and
 * whether its stored fuel_type matches what DVLA would return now.  If there
 * is a mismatch, silently updates the record and logs a diagnostic event.
 *
 * ONLY corrects source==='dvla' vehicles. Manual selections are never touched.
 *
 * @param {object} options
 * @param {function} options.lookupVehicleFn - async (reg) => DVLA response object
 *   (injected to avoid circular import; pass lookupVehicle from fuelApi.js)
 */
export async function runVehicleTruthBackfill({ lookupVehicleFn }) {
  try {
    const enabled = await isBackfillEnabled();
    if (!enabled) return;

    const vehicle = await loadUserVehicle();
    if (!vehicle) return;
    if (!vehicle.reg) return;
    if (vehicle.source !== 'dvla') return; // Never touch manual saves

    const resp = await lookupVehicleFn(vehicle.reg);

    // Determine authoritative DVLA fuel category
    const VALID_CATEGORIES = ['diesel', 'unleaded', 'electric'];
    let dvlaCategory = null;
    if (resp?.fuel_category && VALID_CATEGORIES.includes(resp.fuel_category)) {
      dvlaCategory = resp.fuel_category;
    } else {
      const rawFuel = resp?.fuel_type || resp?.fuelType;
      dvlaCategory = mapDvlaFuelToCanonical(rawFuel);
    }

    if (!dvlaCategory) return; // DVLA unknown — don't overwrite
    if (dvlaCategory === 'electric') return; // EV — no taxonomy key to correct

    const expectedTaxonomyKey = dvlaCategory; // 'diesel' | 'unleaded'
    if (vehicle.fuel_type === expectedTaxonomyKey) return; // Already correct

    // Mismatch detected — silently update
    const corrected = {
      ...vehicle,
      fuel_type: expectedTaxonomyKey,
      updated_at: new Date().toISOString(),
    };
    await AsyncStorage.setItem(USER_VEHICLE_KEY, JSON.stringify(corrected));

    await logDiagnostic('vehicle_truth_corrected', {
      reg: vehicle.reg,
      was: vehicle.fuel_type,
      now: expectedTaxonomyKey,
      dvla_category: dvlaCategory,
    });
  } catch (_) {
    // Backfill is best-effort; never let it crash the app
  }
}

export default {
  loadUserVehicle,
  saveUserVehicle,
  clearUserVehicle,
  isVehiclePromptDismissed,
  dismissVehiclePrompt,
  defaultMpgFor,
  UK_AVG_MPG,
  USER_VEHICLE_KEY,
  VEHICLE_PROMPT_DISMISSED_KEY,
  BEST_OPTION_MODE_KEY,
  VEHICLE_TRUTH_BACKFILL_KEY,
  runVehicleTruthBackfill,
};
