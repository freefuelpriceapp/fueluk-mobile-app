/**
 * featureFlags.js — differentiator bundle (break-even, trajectory, flags, vehicle).
 *
 * These flags are the OTA kill-switches for the v1 differentiator UI. They
 * live alongside the legacy `src/lib/featureFlags.js` which gates the broader
 * launch-safe feature set. Keep these small and focused — each maps to one
 * concrete UI addition that can be flipped off without a native rebuild.
 */

export const FEATURE_FLAGS = {
  breakEven: true,
  trajectory: true,
  priceFlags: true,
  vehicleSettings: true,
  // GDPR consent banner — built ahead of analytics/Sentry wiring. Stays OFF
  // at launch; flip to true when crash reporting + analytics ship and we
  // need first-run consent capture.
  FEATURE_CONSENT_BANNER: false,
};

export function isFeatureEnabled(name) {
  return FEATURE_FLAGS[name] === true;
}

export default FEATURE_FLAGS;
