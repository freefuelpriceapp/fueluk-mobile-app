/**
 * src/lib/trust.js
 *
 * Central "truth layer" for FuelUK.
 *
 * Every price shown in the UI should answer three questions:
 *   1. When was it last updated?
 *   2. Where did it come from?
 *   3. Should I trust it?
 *
 * Phase 1 scope: freshness tiers + source label + confidence flag.
 */

const RECENCY = {
  TODAY_MAX: 12,
  RECENT_MAX: 36,
  STALE_MAX: 24 * 7,
};

export const DEFAULT_SOURCE = 'GOV data';

export function formatSource(rawSource) {
  if (!rawSource || typeof rawSource !== 'string') return DEFAULT_SOURCE;
  const s = rawSource.trim().toLowerCase();
  if (!s) return DEFAULT_SOURCE;
  if (s.includes('fuel_finder')) return 'UK Fuel Finder';
  if (s.includes('gov')) return 'GOV data';
  if (s.includes('partner')) return 'Partner feed';
  if (s.includes('user') || s.includes('community')) return 'User report';
  return rawSource.charAt(0).toUpperCase() + rawSource.slice(1);
}

export function getFreshness(iso) {
  if (!iso) return { tier: 'unknown', label: 'Update time unknown', ageH: null };
  const d = new Date(iso);
  if (isNaN(d.getTime())) {
    return { tier: 'unknown', label: 'Update time unknown', ageH: null };
  }
  const ageH = Math.max(0, (Date.now() - d.getTime()) / 3600000);
  const hh = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (ageH < 1) return { tier: 'just_now', label: 'Just updated', ageH };
  if (ageH < RECENCY.TODAY_MAX) return { tier: 'today', label: `Updated ${hh} today`, ageH };
  if (ageH < RECENCY.RECENT_MAX) return { tier: 'recent', label: `Updated ${Math.round(ageH)}h ago`, ageH };
  if (ageH < RECENCY.STALE_MAX) return { tier: 'stale', label: `Older update · ${Math.round(ageH / 24)}d ago`, ageH };
  return { tier: 'needs_caution', label: 'Data may be out of date', ageH };
}

export const FRESHNESS_COLOR = {
  just_now: '#2ECC71',
  today: '#2ECC71',
  recent: '#8FA3B8',
  stale: '#F39C12',
  needs_caution: '#DC3545',
  unknown: '#555555',
};

export const SOURCE_DOT_COLOR = {
  fuel_finder: '#2ECC71',
  gov: '#3498DB',
  partner: '#9B59B6',
  user: '#F39C12',
  community: '#F39C12',
};

export function getSourceDotColor(rawSource) {
  if (!rawSource || typeof rawSource !== 'string') return null;
  const s = rawSource.trim().toLowerCase();
  if (!s) return null;
  for (const [key, color] of Object.entries(SOURCE_DOT_COLOR)) {
    if (s.includes(key)) return color;
  }
  return '#555';
}

export function buildTrustState(station, fuelType, quarantineFn) {
  const freshness = getFreshness(station?.last_updated);
  const source = formatSource(station?.source);

  const quarantined = typeof quarantineFn === 'function'
    ? !!quarantineFn(station, fuelType)
    : !!(station?.is_quarantined || station?.is_suspect);

  let confidence = 'high';
  if (quarantined) confidence = 'low';
  else if (freshness.tier === 'needs_caution') confidence = 'low';
  else if (freshness.tier === 'stale') confidence = 'medium';
  else if (freshness.tier === 'unknown') confidence = 'medium';

  return {
    freshness,
    source,
    quarantined,
    confidence,
    color: FRESHNESS_COLOR[freshness.tier] || '#555',
    line: `${freshness.label} · Source: ${source}`,
  };
}

export default {
  buildTrustState,
  getFreshness,
  formatSource,
  FRESHNESS_COLOR,
  DEFAULT_SOURCE,
  SOURCE_DOT_COLOR,
  getSourceDotColor,
};
