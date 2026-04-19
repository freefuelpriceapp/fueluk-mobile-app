/**
 * src/lib/theme.js
 *
 * Shared design tokens for FreeFuelPrice UK.
 * Single source of truth for colors, spacing, font sizes, and fuel metadata.
 *
 * Phase 1 — created as part of UI hardening pass.
 */

// ─── Colors ───────────────────────────────────────────────────────────────────

export const COLORS = {
  background:      '#0D1117',
  surface:         '#161B22',
  card:            '#1C2128',
  border:          '#30363D',
  text:            '#E6EDF3',
  textSecondary:   '#8B949E',
  accent:          '#2ECC71',
  warning:         '#F59E0B',
  error:           '#E74C3C',
  petrol:          '#2ECC71',
  diesel:          '#3498DB',
  e10:             '#f39c12',
  superUnleaded:   '#9B59B6',
  premiumDiesel:   '#E74C3C',
};

// ─── Fuel color map (keyed by fuel type string) ───────────────────────────────

export const FUEL_COLORS = {
  petrol:          COLORS.petrol,
  diesel:          COLORS.diesel,
  e10:             COLORS.e10,
  super_unleaded:  COLORS.superUnleaded,
  premium_diesel:  COLORS.premiumDiesel,
};

// ─── Fuel types array ─────────────────────────────────────────────────────────

export const FUEL_TYPES = [
  { key: 'petrol',          label: 'Petrol',          color: COLORS.petrol },
  { key: 'diesel',          label: 'Diesel',          color: COLORS.diesel },
  { key: 'e10',             label: 'E10',             color: COLORS.e10 },
  { key: 'super_unleaded',  label: 'Super Unleaded',  color: COLORS.superUnleaded },
  { key: 'premium_diesel',  label: 'Premium Diesel',  color: COLORS.premiumDiesel },
];

// ─── Spacing ──────────────────────────────────────────────────────────────────

export const SPACING = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
};

// ─── Font sizes ───────────────────────────────────────────────────────────────

export const FONT_SIZES = {
  xs:   10,
  sm:   12,
  md:   14,
  lg:   16,
  xl:   20,
  xxl:  24,
  hero: 32,
};

export default { COLORS, FUEL_COLORS, FUEL_TYPES, SPACING, FONT_SIZES };
