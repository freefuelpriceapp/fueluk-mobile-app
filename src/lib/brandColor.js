/**
 * src/lib/brandColor.js
 *
 * Small palette for the coloured edge-dot on each map pin. Keys are
 * lowercase; values are high-contrast brand colours tuned to read on
 * both the dark pill and the lighter/selected pill variants.
 */

const BRAND_COLORS = {
  bp:             '#00914C',
  shell:          '#FFD500',
  tesco:          '#005EB8',
  asda:           '#7ABF3A',
  sainsburys:     '#F07E00',
  "sainsbury's":  '#F07E00',
  morrisons:      '#FFC72C',
  esso:           '#CE1126',
  texaco:         '#D40000',
  jet:            '#FFCC00',
  murco:          '#E30613',
  gulf:           '#F58220',
  applegreen:     '#7DC241',
  "applegreen plc": '#7DC241',
  "harvest energy": '#F4B400',
  total:          '#ED1C24',
  costco:         '#E32726',
};

const DEFAULT_COLOR = '#8B949E';

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

export function brandInitial(brand) {
  if (!brand) return '•';
  const s = String(brand).trim();
  if (!s) return '•';
  return s.charAt(0).toUpperCase();
}

export default { brandColor, brandInitial };
