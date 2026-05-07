/**
 * receiptSync.js — anonymous ground-truth price sync (opt-in).
 *
 * When the user has granted consent (`@fueluk/receipts_sync_consent_v1` = true),
 * this module posts a minimal anonymous tuple to the backend.
 *
 * Privacy guarantees:
 * - Only outcode (e.g. "B10" not "B10 0HH") is sent
 * - No image, no station name, no device ID, no user ID
 * - ONE-WAY: device → server. Server never sends back receipts.
 * - 401/5xx tolerant — sync failure never breaks the save flow
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { extractOutcode } from './receiptRepository';

export const SYNC_CONSENT_KEY = '@fueluk/receipts_sync_consent_v1';

const BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl || 'https://api.freefuelpriceapp.com';

/**
 * getSyncConsent() — returns boolean consent flag (false if not set).
 */
export async function getSyncConsent() {
  try {
    const raw = await AsyncStorage.getItem(SYNC_CONSENT_KEY);
    return raw === 'true';
  } catch (_e) {
    return false;
  }
}

/**
 * setSyncConsent(value) — persists consent flag.
 */
export async function setSyncConsent(value) {
  try {
    await AsyncStorage.setItem(SYNC_CONSENT_KEY, value ? 'true' : 'false');
  } catch (_e) {
    // non-critical
  }
}

/**
 * buildGroundTruthTuple(receipt) — builds the anonymous payload.
 * Returns null if required fields are missing.
 */
export function buildGroundTruthTuple(receipt) {
  if (!receipt || typeof receipt !== 'object') return null;
  const { stationBrand, stationPostcode, pricePerLitre, fuelType, receiptDate } = receipt;
  if (!fuelType || typeof pricePerLitre !== 'number' || pricePerLitre <= 0) return null;
  if (!receiptDate) return null;

  return {
    brand: stationBrand || null,
    postcode_outcode: stationPostcode ? extractOutcode(stationPostcode) : null,
    p_per_l: pricePerLitre,
    fuel_type: fuelType,
    receipt_date: receiptDate.slice(0, 10), // YYYY-MM-DD only
  };
}

/**
 * syncReceiptAnonymously(receipt) — posts ground-truth tuple if consent given.
 *
 * Returns:
 *   { skipped: true }  — consent not given
 *   { ok: true }       — successfully synced (204)
 *   { ok: false, error } — sync failed (non-fatal)
 */
export async function syncReceiptAnonymously(receipt) {
  const consent = await getSyncConsent();
  if (!consent) return { skipped: true };

  const tuple = buildGroundTruthTuple(receipt);
  if (!tuple) return { skipped: true, reason: 'insufficient_data' };

  try {
    const response = await fetch(`${BASE_URL}/api/v1/receipts/groundtruth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tuple),
    });

    if (response.status === 204 || response.ok) {
      return { ok: true };
    }
    // Non-fatal: server error
    return { ok: false, error: `HTTP ${response.status}` };
  } catch (err) {
    // Network failure — non-fatal
    return { ok: false, error: err?.message || 'network_error' };
  }
}
