/**
 * vehicleColourMap.js — maps DVLA colour strings to hex fill values used by
 * the VehicleAvatar silhouette. Keep colours muted / semi-flat so the
 * silhouette reads on dark backgrounds and the manufacturer badge remains
 * the focal point.
 *
 * DVLA returns colours in upper-case English (e.g. "SILVER", "BRONZE"). We
 * lower-case + trim before lookup, and fall back to a neutral mid-grey when
 * a colour is unknown or missing.
 */

export const VEHICLE_COLOURS = Object.freeze({
  black:   '#1F2430',
  grey:    '#6A7180',
  gray:    '#6A7180',
  silver:  '#B5BAC3',
  white:   '#E8ECF2',
  blue:    '#3B82F6',
  red:     '#DC2626',
  green:   '#2ECC71',
  bronze:  '#8B6A3E',
  gold:    '#C9A24C',
  yellow:  '#F4C430',
  orange:  '#F97316',
  brown:   '#6B4423',
  beige:   '#C2B280',
  cream:   '#E8DEC0',
  purple:  '#7C3AED',
  pink:    '#EC4899',
  maroon:  '#7F1D1D',
  turquoise: '#14B8A6',
  multicoloured: '#8B95A7',
});

export const DEFAULT_COLOUR = '#8B95A7';

export function colourFromDvla(raw) {
  if (typeof raw !== 'string') return DEFAULT_COLOUR;
  const key = raw.trim().toLowerCase();
  if (!key) return DEFAULT_COLOUR;
  return VEHICLE_COLOURS[key] || DEFAULT_COLOUR;
}

/**
 * Returns a readable name for accessibility labels — "Silver", "Blue",
 * "Unknown colour" when unknown. Title-cased for natural screen-reader flow.
 */
export function colourLabelFromDvla(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return 'Unknown colour';
  const t = raw.trim().toLowerCase();
  if (!VEHICLE_COLOURS[t]) return 'Unknown colour';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export default { VEHICLE_COLOURS, DEFAULT_COLOUR, colourFromDvla, colourLabelFromDvla };
