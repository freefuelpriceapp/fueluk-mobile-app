/**
 * firstVehicleCelebration.js — storage-key + decision helper for the
 * "Great — your 2022 Mercedes is ready" card. Pure, so we can unit-test
 * the "show once and only once" rule without mounting the component.
 */

export const FIRST_VEHICLE_CELEBRATION_KEY = 'first_vehicle_celebration_seen_v1';

/**
 * shouldShowCelebration
 *   vehicle: parsed user_vehicle object | null
 *   seenFlag: whatever AsyncStorage returned for the key (string | null)
 *
 * Returns true iff a vehicle exists AND we have not yet stored the flag.
 */
export function shouldShowCelebration(vehicle, seenFlag) {
  if (!vehicle || typeof vehicle !== 'object') return false;
  return seenFlag !== '1';
}

export default { FIRST_VEHICLE_CELEBRATION_KEY, shouldShowCelebration };
