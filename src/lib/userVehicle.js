import AsyncStorage from '@react-native-async-storage/async-storage';

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
};
