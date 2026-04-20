/**
 * featureFlags.js
 * Central mobile feature flag config for FreeFuelPrice.
 *
 * LAUNCH-SAFE MVP: all non-MVP features are DISABLED by default.
 * To enable a feature in a future sprint, change its value to true.
 *
 * Usage:
 *   import { FEATURES } from '../lib/featureFlags';
 *   if (FEATURES.routeIntelligence) { ... }
 */

export const FEATURES = {
  // ─────────────────────────────────────────────────
  // MVP FEATURES — ACTIVE
  // ─────────────────────────────────────────────────
  nearbyMap: true,           // Home screen with nearby fuel stations map
  search: true,              // Postcode / location search screen
  stationDetail: true,       // Individual station detail screen
  favourites: true,          // Save favourite stations locally
  priceAlerts: true,         // Set price-drop alerts by station (Sprint 2)
  priceHistoryCharts: true,  // Visual 30-day price history charts (Sprint 2)
  tripCalculator: true,      // Trip cost calculator with reg-plate lookup (Sprint 2)
  settings: true,            // Settings, privacy, support links

  // ─────────────────────────────────────────────────
  // FUTURE FEATURES — DISABLED (do not enable without Sprint approval)
  // ─────────────────────────────────────────────────

  // Smart Decisions (Sprint 5+)
  // "Worth the Drive?" analysis — calculates whether driving to a cheaper
  // station saves money once fuel cost of the detour is factored in.
  // REQUIRES: user distance baseline, MPG preference UI
  smartDecisions: false,

  // Route Intelligence (Sprint 8+)
  // Fuel-aware route planning and savings estimator
  routeIntelligence: false,

  // Road Reports (Sprint 9+)
  // Community hazard, incident and road closure reports
  // REQUIRES: moderation tools, abuse prevention, legal review
  roadReports: false,

  // Community Contributions (Sprint 9+)
  // User-submitted price confirmations and station updates
  communityContributions: false,

  // Rewards & Gamification (Sprint 10+)
  // Contribution points, streaks, leaderboards
  rewards: false,

  // Monetization (Sprint 11+)
  // Fuel discount partners, affiliate offers, promoted stations
  monetization: false,

  // Predictive Pricing (Sprint 12+)
  // AI-based price forecasting and buy-now suggestions
  predictivePricing: false,
};

/**
 * Helper: check if a named feature is enabled.
 * Throws a clear error if the feature name is not registered.
 */
export function isEnabled(featureName) {
  if (!(featureName in FEATURES)) {
    console.warn(`[FeatureFlags] Unknown feature: "${featureName}"`);
    return false;
  }
  return FEATURES[featureName] === true;
}

/**
 * Returns an array of all currently active feature names.
 * Useful for debug screens or analytics.
 */
export function getActiveFeatures() {
  return Object.entries(FEATURES)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name);
}

/**
 * Returns an array of all disabled / dormant feature names.
 */
export function getDormantFeatures() {
  return Object.entries(FEATURES)
    .filter(([, enabled]) => !enabled)
    .map(([name]) => name);
}
