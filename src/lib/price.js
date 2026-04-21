/**
 * src/lib/price.js
 *
 * Central price normalisation + formatting.
 *
 * The backend is inconsistent about units: some endpoints return pence
 * per litre (e.g. 137.4), others return tenths-of-a-penny wire format
 * (e.g. 1374), and a few legacy feeds return pounds (e.g. 1.374).
 * parsePrice reconciles these; formatPencePrice turns the result into
 * the "137.4p" display string.
 *
 * isPlausiblePrice is the last-line client-side quarantine: if a value
 * falls outside UK forecourt range after normalisation, the caller
 * should refuse to render the marker at all.
 */

const MIN_PPL = 50;
const MAX_PPL = 250;

const PLAUSIBLE_PENCE_MIN = 80;
const PLAUSIBLE_PENCE_MAX = 250;

const PLAUSIBLE_POUND_MIN = 0.8;
const PLAUSIBLE_POUND_MAX = 2.5;

const WIRE_TENTHS_MIN = 1000;

function toNum(v) {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (!trimmed) return null;
    const n = parseFloat(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Coerce a raw price input (number | string | null) into a plausible
 * pence-per-litre value. Returns null when the input cannot be
 * reconciled with the expected range.
 */
export function parsePrice(value) {
  const n = toNum(value);
  if (n === null) return null;

  if (n > WIRE_TENTHS_MIN) {
    return n / 10;
  }
  if (n >= PLAUSIBLE_PENCE_MIN && n <= PLAUSIBLE_PENCE_MAX) {
    return n;
  }
  if (n >= PLAUSIBLE_POUND_MIN && n <= PLAUSIBLE_POUND_MAX) {
    return n * 100;
  }
  return null;
}

export function isPlausiblePrice(value) {
  const p = parsePrice(value);
  if (p === null) return false;
  return p >= MIN_PPL && p <= MAX_PPL;
}

/**
 * Format a raw price into "137.4p". Returns null when the price is
 * implausible — callers should not render the marker when this is
 * null. Never returns a string like "1374" or "1666".
 */
export function formatPencePrice(value) {
  const p = parsePrice(value);
  if (p === null) return null;
  if (p < MIN_PPL || p > MAX_PPL) return null;
  return `${p.toFixed(1)}p`;
}

export default { formatPencePrice, isPlausiblePrice, parsePrice };
