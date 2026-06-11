/**
 * stationBrandLogo.js
 *
 * Resolves a circular brand-correct logo asset for the top ~15 UK fuel
 * retailers. All logos are colour-correct circular monograms (brand-hex
 * background + brand letter) generated at 1x/2x/3x and bundled as static
 * PNG assets — no network requests, no tinting to FuelUK green.
 *
 * Usage:
 *   const logo = resolveStationLogo('Tesco Express');
 *   // → { source: require('...png'), bg: '#00539F' }  or  null
 *
 * Attribution:
 *   Fuel retailer logos are trademarks of their respective owners and are
 *   used here for identification purposes only.
 */

// ---------------------------------------------------------------------------
// Asset map — keyed by normalised brand name.
// Each entry: { source: require(), bg: hexString }
// ---------------------------------------------------------------------------
const BRAND_ASSETS = {
  tesco: {
    source: require('../../assets/brands/tesco.png'),
    bg: '#00539F',
  },
  sainsburys: {
    source: require('../../assets/brands/sainsburys.png'),
    bg: '#F06C00',
  },
  asda: {
    source: require('../../assets/brands/asda.png'),
    bg: '#78BE20',
  },
  morrisons: {
    source: require('../../assets/brands/morrisons.png'),
    bg: '#007A3D',
  },
  shell: {
    source: require('../../assets/brands/shell.png'),
    bg: '#FBCE07',
  },
  bp: {
    source: require('../../assets/brands/bp.png'),
    bg: '#009900',
  },
  esso: {
    source: require('../../assets/brands/esso.png'),
    bg: '#CC0000',
  },
  texaco: {
    source: require('../../assets/brands/texaco.png'),
    bg: '#E31937',
  },
  gulf: {
    source: require('../../assets/brands/gulf.png'),
    bg: '#F15A22',
  },
  jet: {
    source: require('../../assets/brands/jet.png'),
    bg: '#CC0000',
  },
  murco: {
    source: require('../../assets/brands/murco.png'),
    bg: '#004B8D',
  },
  applegreen: {
    source: require('../../assets/brands/applegreen.png'),
    bg: '#00A650',
  },
  costco: {
    source: require('../../assets/brands/costco.png'),
    bg: '#CC0033',
  },
  coop: {
    source: require('../../assets/brands/coop.png'),
    bg: '#00B5B0',
  },
  harvestenergy: {
    source: require('../../assets/brands/harvestenergy.png'),
    bg: '#FF6600',
  },
};

// ---------------------------------------------------------------------------
// Suffix / variant normalisation rules.
// Strip common store-format suffixes so "Tesco Express" maps to "tesco".
// ---------------------------------------------------------------------------
const STRIP_SUFFIXES = [
  'express',
  'extra',
  'local',
  'metro',
  'superstore',
  'petrol',
  'filling station',
  'service station',
  'garage',
];

/**
 * Normalise a brand string to a lookup key.
 * - Lowercases and trims.
 * - Removes apostrophes & hyphens (so "sainsbury's" → "sainsburys").
 * - Strips common store-format suffixes.
 * - Compresses whitespace.
 */
export function normaliseBrandKey(brand) {
  if (!brand || typeof brand !== 'string') return '';
  let s = brand.toLowerCase().trim();
  // Remove apostrophes (straight, curly), hyphens, ampersands, backticks
  s = s.replace(/[''\u2018\u2019`\-&]/g, '');
  // Strip trailing suffixes (greedy, loop to handle multiple)
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of STRIP_SUFFIXES) {
      const re = new RegExp(`\\s+${suffix}\\s*$`);
      if (re.test(s)) {
        s = s.replace(re, '').trim();
        changed = true;
        break;
      }
    }
  }
  // Compress whitespace and remove remaining spaces for compound names
  s = s.replace(/\s+/g, '');
  return s;
}

/**
 * Resolve the logo asset for a given brand string.
 *
 * @param {string} brand — The raw brand name (e.g. 'Tesco Express', 'Shell')
 * @returns {{ source: number, bg: string } | null}
 *   source — Metro require() handle (pass directly to <Image source={} />)
 *   bg     — Brand background hex colour (useful for placeholder)
 *   Returns null when no bundled asset exists for this brand.
 */
export function resolveStationLogo(brand) {
  const key = normaliseBrandKey(brand);
  if (!key) return null;
  return BRAND_ASSETS[key] || null;
}

/**
 * Array of all bundled brand keys (normalised).
 * Useful for testing / auditing coverage.
 */
export const BUNDLED_BRAND_KEYS = Object.freeze(Object.keys(BRAND_ASSETS));

export default { resolveStationLogo, normaliseBrandKey, BUNDLED_BRAND_KEYS };
