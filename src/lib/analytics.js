/**
 * analytics.js
 *
 * Launch-safe analytics shim for the fueluk app.
 *
 * Guardrails:
 *  - No network I/O in launch build. All events are no-op by default.
 *  - No PII collection. Event payloads must be small and non-identifying.
 *  - Provider adapter is disabled scaffolding only; wire a real backend
 *    (e.g. Amplitude / PostHog / Firebase) AFTER launch sign-off.
 *
 * Purpose:
 *  - Give every critical-journey screen a stable hook to call now so that
 *    enabling a provider later is a one-line change, not a refactor.
 *
 * Priority events (Workstream 2 — Step 4):
 *  - nearby_screen_view
 *  - search_performed
 *  - station_detail_opened
 *  - favourite_saved
 *  - favourite_removed
 *  - refresh_initiated
 *  - refresh_completed
 */

const ENABLED = false; // flip to true only after a provider adapter is wired

const safeLog = (event, payload) => {
  if (!ENABLED) return;
  // eslint-disable-next-line no-console
  if (__DEV__) console.log('[analytics]', event, payload || {});
  // Provider adapter goes here (disabled scaffolding).
  // e.g. Amplitude.logEvent(event, payload);
};

export const track = (event, payload = {}) => {
  try {
    safeLog(event, payload);
  } catch (_) {
    // Analytics must never break the user journey.
  }
};

// Named hooks for the critical journey. Screens should import these
// instead of calling track() directly, so event names stay consistent.
export const trackNearbyScreenView = (payload) =>
  track('nearby_screen_view', payload);

export const trackSearchPerformed = (payload) =>
  track('search_performed', payload);

export const trackStationDetailOpened = (payload) =>
  track('station_detail_opened', payload);

export const trackFavouriteSaved = (payload) =>
  track('favourite_saved', payload);

export const trackFavouriteRemoved = (payload) =>
  track('favourite_removed', payload);

export const trackRefreshInitiated = (payload) =>
  track('refresh_initiated', payload);

export const trackRefreshCompleted = (payload) =>
  track('refresh_completed', payload);

export default {
  track,
  trackNearbyScreenView,
  trackSearchPerformed,
  trackStationDetailOpened,
  trackFavouriteSaved,
  trackFavouriteRemoved,
  trackRefreshInitiated,
  trackRefreshCompleted,
};
