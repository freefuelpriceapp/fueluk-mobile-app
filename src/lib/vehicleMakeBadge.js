/**
 * vehicleMakeBadge.js — resolves a compact make-badge for the VehicleAvatar.
 *
 * We default to a **letter-badge** approach (first letter of the make on a
 * coloured circle) rather than bundling manufacturer logos — this dodges
 * the legal grey-area around stylised brand marks and keeps the OTA update
 * payload small. The colour table below covers the top ~25 UK manufacturers;
 * unknown makes render a neutral grey dot with a generic glyph.
 */

const MAKE_COLOURS = {
  'ford':          { bg: '#003399', fg: '#FFFFFF' },
  'vauxhall':      { bg: '#D50000', fg: '#FFFFFF' },
  'volkswagen':    { bg: '#001E50', fg: '#FFFFFF' },
  'bmw':           { bg: '#1C69D4', fg: '#FFFFFF' },
  'mercedes-benz': { bg: '#1A1A1A', fg: '#E8ECF2' },
  'mercedes':      { bg: '#1A1A1A', fg: '#E8ECF2' },
  'audi':          { bg: '#BB0A30', fg: '#FFFFFF' },
  'toyota':        { bg: '#EB0A1E', fg: '#FFFFFF' },
  'nissan':        { bg: '#C3002F', fg: '#FFFFFF' },
  'hyundai':       { bg: '#002C5F', fg: '#FFFFFF' },
  'kia':           { bg: '#05141F', fg: '#E8ECF2' },
  'peugeot':       { bg: '#0E3C6E', fg: '#FFFFFF' },
  'renault':       { bg: '#FFCC33', fg: '#000000' },
  'citroen':       { bg: '#A30010', fg: '#FFFFFF' },
  'citroën':       { bg: '#A30010', fg: '#FFFFFF' },
  'skoda':         { bg: '#0E3A1E', fg: '#FFFFFF' },
  'škoda':         { bg: '#0E3A1E', fg: '#FFFFFF' },
  'seat':          { bg: '#B2022F', fg: '#FFFFFF' },
  'honda':         { bg: '#CC0000', fg: '#FFFFFF' },
  'mazda':         { bg: '#101820', fg: '#E8ECF2' },
  'mini':          { bg: '#000000', fg: '#FFFFFF' },
  'volvo':         { bg: '#1B3B6A', fg: '#FFFFFF' },
  'land rover':    { bg: '#005A2B', fg: '#FFFFFF' },
  'land-rover':    { bg: '#005A2B', fg: '#FFFFFF' },
  'landrover':     { bg: '#005A2B', fg: '#FFFFFF' },
  'jaguar':        { bg: '#0C121C', fg: '#E8ECF2' },
  'fiat':          { bg: '#8E0E1D', fg: '#FFFFFF' },
  'tesla':         { bg: '#CC0000', fg: '#FFFFFF' },
  'dacia':         { bg: '#003C55', fg: '#FFFFFF' },
  'suzuki':        { bg: '#1D3C78', fg: '#FFFFFF' },
};

const DEFAULT_BADGE = { bg: '#2A3040', fg: '#E8ECF2' };

function normKey(s) {
  return String(s || '').trim().toLowerCase();
}

/**
 * Resolve colour swatch + initial for the make badge.
 * Returns { bg, fg, initial, label, known }.
 */
export function makeBadgeFor(make) {
  const key = normKey(make);
  if (!key) {
    return { bg: DEFAULT_BADGE.bg, fg: DEFAULT_BADGE.fg, initial: '?', label: 'Unknown make', known: false };
  }
  // Use first letter of the first word — "Land Rover" → "L", "BMW" → "B".
  const firstWord = key.split(/\s|-/)[0];
  const initial = firstWord.charAt(0).toUpperCase();
  const swatch = MAKE_COLOURS[key] || DEFAULT_BADGE;
  const known = !!MAKE_COLOURS[key];
  // Pretty label for a11y: title case the original (preserves e.g. "BMW").
  const label = String(make).trim();
  return { ...swatch, initial, label, known };
}

export const TOP_UK_MAKES = Object.freeze(Object.keys(MAKE_COLOURS));

export default { makeBadgeFor, TOP_UK_MAKES };
