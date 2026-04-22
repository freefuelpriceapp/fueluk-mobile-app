/**
 * src/lib/brandColors.js
 *
 * Brand → hex colour map for the price-first map pins. Replaces the
 * generic coloured dot with a proper brand chip. Keys are lowercase;
 * matching is case-insensitive and tolerates common aliases by
 * substring fallback.
 */

const BRAND_COLORS = {
  bp:             '#00914C',
  shell:          '#FCC515',
  tesco:          '#00539F',
  asda:           '#7DC242',
  sainsburys:     '#F06C00',
  "sainsbury's":  '#F06C00',
  sainsbury:      '#F06C00',
  morrisons:      '#FDD600',
  esso:           '#EE1C25',
  jet:            '#E10600',
  texaco:         '#C8102E',
  applegreen:     '#6BBE45',
  "applegreen plc": '#6BBE45',
  "eg on the move": '#6BBE45',
  eg:             '#6BBE45',
  costco:         '#E31837',
  gulf:           '#F37021',
  valero:         '#0033A0',
  murco:          '#E30613',
  harvest:        '#4A90E2',
  "harvest energy": '#4A90E2',
  total:          '#ED1C24',
  mfg:            '#EE1C25',
};

const DEFAULT_COLOR = '#6B7280';

/**
 * Known-brand abbreviations used for the smallest pins (tier 4) where
 * there's barely room for text. Falls back to the first 3 chars.
 */
const BRAND_ABBREV = {
  bp:         'BP',
  shell:      'SHL',
  tesco:      'TSC',
  asda:       'ASDA',
  sainsburys: "SNS",
  "sainsbury's": "SNS",
  sainsbury:  'SNS',
  morrisons:  'MRS',
  esso:       'ESO',
  jet:        'JET',
  texaco:     'TXC',
  applegreen: 'APG',
  "applegreen plc": 'APG',
  "eg on the move": 'EG',
  eg:         'EG',
  costco:     'CTC',
  gulf:       'GLF',
  valero:     'VLR',
  murco:      'MRC',
  harvest:    'HRV',
  "harvest energy": 'HRV',
  total:      'TTL',
  mfg:        'MFG',
};

export function brandColor(brand) {
  if (!brand) return DEFAULT_COLOR;
  const key = String(brand).trim().toLowerCase();
  if (!key) return DEFAULT_COLOR;
  if (BRAND_COLORS[key]) return BRAND_COLORS[key];
  for (const k of Object.keys(BRAND_COLORS)) {
    if (key.includes(k)) return BRAND_COLORS[k];
  }
  return DEFAULT_COLOR;
}

/**
 * Truncate a brand name to the given max length with ellipsis. Used
 * for the small brand label beside the colour chip on each pin.
 */
export function brandShortName(brand, maxLen = 8) {
  if (!brand) return '';
  const s = String(brand).trim();
  if (!s) return '';
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen - 1)}…`;
}

/**
 * Return a short abbreviation (2–4 chars) for the smallest pin sizes.
 * Falls back to the first 3 upper-cased chars when the brand isn't in
 * the known-abbrev table.
 */
export function brandAbbrev(brand) {
  if (!brand) return '';
  const key = String(brand).trim().toLowerCase();
  if (!key) return '';
  if (BRAND_ABBREV[key]) return BRAND_ABBREV[key];
  for (const k of Object.keys(BRAND_ABBREV)) {
    if (key.includes(k)) return BRAND_ABBREV[k];
  }
  return String(brand).trim().slice(0, 3).toUpperCase();
}

export const BRAND_DEFAULT_COLOR = DEFAULT_COLOR;

export default { brandColor, brandShortName, brandAbbrev, BRAND_DEFAULT_COLOR };
