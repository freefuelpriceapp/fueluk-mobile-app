/**
 * src/lib/haptics.js
 *
 * Thin wrapper over expo-haptics. Falls back to a no-op when the native module
 * is unavailable (e.g. web, jest test runner, or bare Snack preview) so that
 * callers can invoke these helpers unconditionally.
 */

let Haptics = null;
try {
  // Loaded lazily so test environments without the native module do not crash.
  Haptics = require('expo-haptics');
} catch (_e) {
  Haptics = null;
}

function safeImpact(style) {
  try {
    if (Haptics && typeof Haptics.impactAsync === 'function') {
      Haptics.impactAsync(style);
    }
  } catch (_e) {
    // Swallow — haptics are a nice-to-have, never a failure surface.
  }
}

function safeNotification(type) {
  try {
    if (Haptics && typeof Haptics.notificationAsync === 'function') {
      Haptics.notificationAsync(type);
    }
  } catch (_e) {}
}

export function lightHaptic() {
  safeImpact(Haptics?.ImpactFeedbackStyle?.Light);
}

export function mediumHaptic() {
  safeImpact(Haptics?.ImpactFeedbackStyle?.Medium);
}

export function successHaptic() {
  safeNotification(Haptics?.NotificationFeedbackType?.Success);
}

export default { lightHaptic, mediumHaptic, successHaptic };
