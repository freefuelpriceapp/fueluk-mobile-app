/**
 * selectedReason — helpers for the backend-provided Best Option reason string.
 *
 * The /nearby endpoint returns a short human-readable string explaining why a
 * station was chosen as Best Option (e.g. "Cheapest petrol within 5 mi"). The
 * backend owns the logic — the app renders whatever it gets, verbatim.
 */

/**
 * Pull the selected_reason string out of a /nearby payload.
 * Checks top-level `selected_reason` first, then `best_option.selected_reason`.
 * Returns null if absent, blank, or not a string.
 */
function extractSelectedReason(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const top = payload.selected_reason;
  if (typeof top === 'string' && top.trim()) return top.trim();
  const nested = payload.best_option && payload.best_option.selected_reason;
  if (typeof nested === 'string' && nested.trim()) return nested.trim();
  return null;
}

/**
 * Normalise a reason string for rendering. Returns null if nothing to render.
 */
function normaliseSelectedReason(reason) {
  if (typeof reason !== 'string') return null;
  const trimmed = reason.trim();
  if (!trimmed) return null;
  return trimmed;
}

module.exports = {
  extractSelectedReason,
  normaliseSelectedReason,
};
