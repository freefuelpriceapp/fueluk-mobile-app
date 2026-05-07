/**
 * receiptOnboarding.js — tracks when to show the "Snap your receipts" celebration.
 *
 * Shows ONCE, after:
 *   (a) 3rd app open, OR
 *   (b) LifetimeSavingsCard synthetic estimate > £20
 *
 * Tracked via AsyncStorage `@fueluk/receipt_log_onboarded_v1`.
 * When dismissed (or "Set up" tapped), the key is set to "true" — never shown again.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARDED_KEY = '@fueluk/receipt_log_onboarded_v1';
export const APP_OPEN_COUNT_KEY = '@fueluk/app_open_count_v1';
export const ONBOARDING_TRIGGER_OPENS = 3;
export const ONBOARDING_TRIGGER_SAVINGS_PENCE = 2000; // £20

/**
 * incrementAppOpenCount() — increments persistent open count. Returns new count.
 */
export async function incrementAppOpenCount() {
  try {
    const raw = await AsyncStorage.getItem(APP_OPEN_COUNT_KEY);
    const count = raw ? parseInt(raw, 10) : 0;
    const next = (Number.isFinite(count) ? count : 0) + 1;
    await AsyncStorage.setItem(APP_OPEN_COUNT_KEY, String(next));
    return next;
  } catch (_e) {
    return 0;
  }
}

/**
 * getAppOpenCount() — returns current open count.
 */
export async function getAppOpenCount() {
  try {
    const raw = await AsyncStorage.getItem(APP_OPEN_COUNT_KEY);
    const count = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(count) ? count : 0;
  } catch (_e) {
    return 0;
  }
}

/**
 * isOnboardingDone() — returns true if user has already seen/dismissed the sheet.
 */
export async function isOnboardingDone() {
  try {
    const val = await AsyncStorage.getItem(ONBOARDED_KEY);
    return val === 'true';
  } catch (_e) {
    return false;
  }
}

/**
 * markOnboardingDone() — persists the dismissal so sheet never shows again.
 */
export async function markOnboardingDone() {
  try {
    await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
  } catch (_e) {
    // non-critical
  }
}

/**
 * shouldShowOnboarding({ openCount, syntheticSavingsPence, receiptCount })
 * Pure function — determines whether to show the onboarding sheet.
 *
 * Requires:
 *   - User hasn't already onboarded (caller checks isOnboardingDone)
 *   - No existing receipts (receiptCount === 0)
 *   - Trigger condition met: open count >= 3 OR synthetic savings > £20
 */
export function shouldShowOnboarding({
  openCount = 0,
  syntheticSavingsPence = 0,
  receiptCount = 0,
  alreadyDone = false,
} = {}) {
  if (alreadyDone) return false;
  if (receiptCount > 0) return false; // Already using the log
  const triggerByOpens = openCount >= ONBOARDING_TRIGGER_OPENS;
  const triggerBySavings = syntheticSavingsPence >= ONBOARDING_TRIGGER_SAVINGS_PENCE;
  return triggerByOpens || triggerBySavings;
}
