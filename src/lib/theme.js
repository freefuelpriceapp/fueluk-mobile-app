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
  surfaceAlt:      '#1a1a2e',   // legacy header surface colour
  card:            '#1C2128',
  border:          '#30363D',
  borderSubtle:    '#21262D',
  borderAlt:       '#2a2a45',
  text:            '#E6EDF3',
  textSecondary:   '#8B949E',
  textMuted:       '#555',
  textDisabled:    '#444',
  white:           '#FFFFFF',
  accent:          '#2ECC71',
  warning:         '#F39C12',
  warningAlt:      '#F59E0B',
  error:           '#E74C3C',
  danger:          '#DC3545',
  dangerAlt:       '#F85149',
  petrol:          '#2ECC71',
  diesel:          '#3498DB',
  e10:             '#F39C12',
  superUnleaded:   '#9B59B6',
  premiumDiesel:   '#E74C3C',
  overlay:         'rgba(0,0,0,0.7)',
  bannerWarning:   '#2a2200',
  bannerDanger:    '#220000',

  // Map overlays / chrome — rgba variants of the base dark palette.
  mapOverlayStrong:  'rgba(13,17,23,0.92)',   // background at ~92% alpha
  mapOverlayMedium:  'rgba(13,17,23,0.88)',
  mapOverlaySurface: 'rgba(22,27,34,0.92)',   // surface at ~92% alpha
  mapOverlayError:   'rgba(40,0,0,0.92)',

  // Map tile colours — darker-than-background greens/blues used by the
  // custom Google map style so parks/water read as separate layers.
  mapParkGreen:      '#0f1a0f',
  mapWaterBlue:      '#0a1520',

  // Cluster — slightly darker green used for large clusters.
  clusterLarge:      '#27AE60',

  // Placeholder / input outlines that don't fit the main palette.
  inputBorderDark:   '#333',
  placeholderMuted:  '#777',

  // Reg plate — UK yellow plate styling used on the trip calculator.
  plateYellow:       '#F5D300',
  plateText:         '#111111',
  plateBorder:       '#b8a000',
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
