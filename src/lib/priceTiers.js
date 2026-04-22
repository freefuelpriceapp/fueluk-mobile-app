/**
 * src/lib/priceTiers.js
 *
 * Percentile-based tier classification for the map pins. Unlike
 * markerStyle.js (quartile-based on a regional cohort), this is
 * keyed off the currently VISIBLE stations so tiers re-flow as the
 * user pans/zooms.
 *
 * Tiers:
 *   1 — cheapest ~10% in view   (bright green, hero card)
 *   2 — next ~15%                (green outline on dark)
 *   3 — middle ~50%              (dark neutral, compact)
 *   4 — expensive ~25%           (muted grey, minimal)
 *   stale — price_age_hours > 24 (60% opacity clock overlay)
 *
 * When fewer than 6 stations are visible, tier 4 is skipped — the
 * remainder collapse into 1 / 2 / 3 so very small sets don't look
 * mostly muted.
 */

const STALE_AGE_HOURS = 24;

export const PIN_TIER = {
  CHEAPEST: 1,
  CHEAP:    2,
  MID:      3,
  PRICEY:   4,
  STALE:    'stale',
};

export const TIER_STYLES = {
  1: {
    bg:          '#10B981',
    border:      '#10B981',
    text:        '#FFFFFF',
    subText:     'rgba(255,255,255,0.92)',
    deltaText:   '#ECFDF5',
    glow:        true,
    scale:       1.1,
    opacity:     1,
    priceFont:   18,
    brandFont:   11,
    minWidth:    84,
    paddingH:    9,
    paddingV:    6,
    showDelta:   true,
    showBrand:   true,
    showDistance:true,
    brandMaxLen: 12,
    borderWidth: 1.75,
  },
  2: {
    bg:          '#1F2937',
    border:      '#10B981',
    text:        '#FFFFFF',
    subText:     'rgba(255,255,255,0.85)',
    deltaText:   '#6EE7B7',
    glow:        false,
    scale:       1,
    opacity:     1,
    priceFont:   16,
    brandFont:   10,
    minWidth:    76,
    paddingH:    8,
    paddingV:    5,
    showDelta:   true,
    showBrand:   true,
    showDistance:true,
    brandMaxLen: 12,
    borderWidth: 1.5,
  },
  3: {
    bg:          '#1F2937',
    border:      '#1F2937',
    text:        '#FFFFFF',
    subText:     'rgba(255,255,255,0.75)',
    deltaText:   'rgba(255,255,255,0.65)',
    glow:        false,
    scale:       1,
    opacity:     1,
    priceFont:   14,
    brandFont:   9,
    minWidth:    64,
    paddingH:    7,
    paddingV:    4,
    showDelta:   false,
    showBrand:   true,
    showDistance:false,
    brandMaxLen: 8,
    borderWidth: 1.25,
  },
  4: {
    bg:          '#4B5563',
    border:      '#6B7280',
    text:        '#E5E7EB',
    subText:     'rgba(229,231,235,0.75)',
    deltaText:   'rgba(229,231,235,0.6)',
    glow:        false,
    scale:       0.88,
    opacity:     0.9,
    priceFont:   11,
    brandFont:   8,
    minWidth:    44,
    paddingH:    5,
    paddingV:    3,
    showDelta:   false,
    showBrand:   true,
    showDistance:false,
    brandMaxLen: 5,
    borderWidth: 1,
  },
  stale: {
    bg:          '#1F2937',
    border:      '#374151',
    text:        '#FFFFFF',
    subText:     'rgba(255,255,255,0.6)',
    deltaText:   'rgba(255,255,255,0.5)',
    glow:        false,
    scale:       0.92,
    opacity:     0.6,
    priceFont:   13,
    brandFont:   9,
    minWidth:    60,
    paddingH:    6,
    paddingV:    4,
    showDelta:   false,
    showBrand:   true,
    showDistance:false,
    brandMaxLen: 8,
    borderWidth: 1.25,
  },
};

export function ageHoursFromIso(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return (Date.now() - d.getTime()) / 3600000;
}

export function isStale(iso, thresholdHours = STALE_AGE_HOURS) {
  const age = ageHoursFromIso(iso);
  if (age === null) return false;
  return age > thresholdHours;
}

/**
 * Build a percentile-ranking map for the currently visible prices.
 * Returns a function (price) -> tier in {1,2,3,4} keyed off the
 * position of `price` within the sorted distribution.
 *
 *  - cheapest ~10% → 1
 *  - next 15%      → 2
 *  - middle 50%    → 3
 *  - top 25%       → 4
 *
 * When fewer than 6 prices are present, tier 4 collapses into 3.
 */
export function buildTierClassifier(visiblePrices) {
  const nums = (Array.isArray(visiblePrices) ? visiblePrices : [])
    .filter((p) => typeof p === 'number' && Number.isFinite(p))
    .sort((a, b) => a - b);

  const n = nums.length;
  const smallSet = n < 6;

  if (n === 0) {
    return () => PIN_TIER.MID;
  }

  const t1Idx = Math.max(0, Math.floor(n * 0.10) - 1);
  const t2Idx = Math.max(0, Math.floor(n * 0.25) - 1);
  const t3Idx = Math.max(0, Math.floor(n * 0.75) - 1);

  const t1Cutoff = nums[t1Idx];
  const t2Cutoff = nums[t2Idx];
  const t3Cutoff = nums[t3Idx];

  return (price) => {
    if (price == null || typeof price !== 'number' || !Number.isFinite(price)) {
      return PIN_TIER.MID;
    }
    const p = price;
    if (p <= t1Cutoff) return PIN_TIER.CHEAPEST;
    if (p <= t2Cutoff) return PIN_TIER.CHEAP;
    if (smallSet) return PIN_TIER.MID;
    if (p <= t3Cutoff) return PIN_TIER.MID;
    return PIN_TIER.PRICEY;
  };
}

/**
 * Classify one price within the visible cohort. Returns STALE if the
 * price's last-updated ISO timestamp is older than 24 hours.
 */
export function classifyPin({ price, visiblePrices, lastUpdatedIso }) {
  if (isStale(lastUpdatedIso)) return PIN_TIER.STALE;
  if (price == null || typeof price !== 'number' || !Number.isFinite(price)) {
    return PIN_TIER.MID;
  }
  const classifier = buildTierClassifier(visiblePrices);
  return classifier(price);
}

export function tierStyle(tier) {
  return TIER_STYLES[tier] || TIER_STYLES[3];
}

/**
 * Compute the price delta (in pence) vs the area average for the
 * visible cohort. Returns the signed difference (negative = cheaper
 * than avg) rounded to 1 decimal place, or null when there isn't
 * enough data to compute a meaningful average.
 *
 * Guards:
 *  - requires at least 3 valid prices in the cohort (otherwise the
 *    "average" is noisy / meaningless)
 *  - returns null for non-finite inputs
 */
export function computeSavingsDelta(price, visiblePrices) {
  if (price == null || typeof price !== 'number' || !Number.isFinite(price)) {
    return null;
  }
  const nums = (Array.isArray(visiblePrices) ? visiblePrices : [])
    .filter((p) => typeof p === 'number' && Number.isFinite(p));
  if (nums.length < 3) return null;
  const avg = nums.reduce((sum, p) => sum + p, 0) / nums.length;
  const delta = price - avg;
  return Math.round(delta * 10) / 10;
}

/**
 * Format a savings delta for display on a pin. Returns a string like
 * "−4.2p" for cheaper-than-avg or "+2.1p" for pricier. Returns null
 * when the absolute delta is below `threshold` (default 1.0p) — below
 * that we don't want to clutter the pin with noise.
 */
export function formatSavingsDelta(delta, threshold = 1.0) {
  if (delta == null || !Number.isFinite(delta)) return null;
  const abs = Math.abs(delta);
  if (abs < threshold) return null;
  const sign = delta < 0 ? '−' : '+';
  return `${sign}${abs.toFixed(1)}p`;
}

export default {
  PIN_TIER,
  TIER_STYLES,
  buildTierClassifier,
  classifyPin,
  tierStyle,
  isStale,
  ageHoursFromIso,
  computeSavingsDelta,
  formatSavingsDelta,
};
