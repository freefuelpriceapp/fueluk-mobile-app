/**
 * src/lib/markerStyle.js
 *
 * Pure presenter for the custom map pin. Given a station's price, the
 * cohort median, and freshness, produces the visual tier + colours the
 * marker component applies. Kept framework-free so it can be unit
 * tested under a plain node Jest environment.
 */

import { parsePrice } from './price';

export const TIER = {
  CHEAP:     'cheap',
  MID:       'mid',
  EXPENSIVE: 'expensive',
  STALE:     'stale',
  UNKNOWN:   'unknown',
};

const TIER_COLOURS = {
  cheap:     { bg: '#10B981', text: '#FFFFFF', glow: true,  opacity: 1 },
  mid:       { bg: '#1F2937', text: '#FFFFFF', glow: false, opacity: 1 },
  expensive: { bg: '#4B5563', text: '#E5E7EB', glow: false, opacity: 1 },
  stale:     { bg: '#1F2937', text: '#FFFFFF', glow: false, opacity: 0.5 },
  unknown:   { bg: '#374151', text: '#D1D5DB', glow: false, opacity: 0.6 },
};

const STALE_AGE_HOURS = 24 * 3;

function ageHours(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return (Date.now() - d.getTime()) / 3600000;
}

/**
 * Compute a tier label given a price, the regional median, and the
 * surrounding cohort (for quartile thresholds). Falls back to MID
 * when cohort data is insufficient.
 */
export function priceTier({ price, cohort, lastUpdatedIso }) {
  if (price == null || !Number.isFinite(price)) return TIER.UNKNOWN;

  const age = ageHours(lastUpdatedIso);
  if (age !== null && age > STALE_AGE_HOURS) return TIER.STALE;

  if (!Array.isArray(cohort) || cohort.length < 4) {
    return TIER.MID;
  }

  const sorted = cohort
    .map((v) => parsePrice(v))
    .filter((v) => typeof v === 'number' && Number.isFinite(v))
    .sort((a, b) => a - b);

  if (sorted.length < 4) return TIER.MID;

  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];

  if (price <= q1) return TIER.CHEAP;
  if (price >= q3) return TIER.EXPENSIVE;
  return TIER.MID;
}

/**
 * Resolve the final rendering parameters the marker should apply.
 */
export function markerVisuals({ tier, isSelected }) {
  const base = TIER_COLOURS[tier] || TIER_COLOURS.mid;
  const scale = isSelected ? 1.15 : 1;
  return { ...base, scale };
}

export default { TIER, priceTier, markerVisuals };
