/**
 * consent.js — GDPR consent persistence helpers.
 *
 * Storage shape (AsyncStorage key = `@fueluk/consent_v1`):
 *   { consent: 'granted' | 'declined', grantedAt: ISO, expiresAt: ISO }
 *
 * Pure helpers live here so the logic is unit-testable without React Native.
 * The hook (`useConsent`) is in src/hooks/useConsent.js.
 */

export const CONSENT_KEY = '@fueluk/consent_v1';
export const CONSENT_TTL_MONTHS = 12;

/**
 * Compute the expiry ISO timestamp for a consent grant.
 */
export function computeExpiry(grantedAtISO, ttlMonths = CONSENT_TTL_MONTHS) {
  const t = new Date(grantedAtISO);
  if (Number.isNaN(t.getTime())) return null;
  const expires = new Date(t);
  expires.setMonth(expires.getMonth() + ttlMonths);
  return expires.toISOString();
}

/**
 * Build a freshly-granted consent record.
 */
export function buildGrantRecord(now = new Date()) {
  const grantedAt = now.toISOString();
  return {
    consent: 'granted',
    grantedAt,
    expiresAt: computeExpiry(grantedAt),
  };
}

/**
 * Build a "declined" record. We still store one so the banner doesn't
 * re-prompt every cold start; it expires on the same 12-month cadence.
 */
export function buildDeclineRecord(now = new Date()) {
  const at = now.toISOString();
  return {
    consent: 'declined',
    grantedAt: at,
    expiresAt: computeExpiry(at),
  };
}

/**
 * Resolve a stored record (or null) into a status string:
 *   'unset'   → no record, banner should show (when flag on)
 *   'granted' → consented and not expired
 *   'declined'→ declined and not expired
 *   'expired' → record exists but expiresAt has passed (re-prompt)
 */
export function resolveStatus(record, now = Date.now()) {
  if (!record || typeof record !== 'object') return 'unset';
  if (record.consent !== 'granted' && record.consent !== 'declined') return 'unset';
  if (record.expiresAt) {
    const exp = new Date(record.expiresAt).getTime();
    if (Number.isFinite(exp) && exp <= now) return 'expired';
  }
  return record.consent;
}

/**
 * Whether analytics/crash-reporting init should proceed for the given record.
 */
export function shouldInitTelemetry(record) {
  return resolveStatus(record) === 'granted';
}
