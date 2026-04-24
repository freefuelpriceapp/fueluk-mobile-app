/**
 * vehicleBodyType.js — heuristic mapping from make/model → body type.
 *
 * DVLA doesn't consistently return a clean body-type string, so when the
 * stored vehicle doesn't include one we best-guess from the model name.
 * Covers the most common UK nameplates; unknowns fall back to "saloon".
 *
 * Supported body types (keep in sync with the silhouette set in
 * VehicleAvatar): saloon, hatchback, estate, suv, coupe, convertible,
 * van, pickup.
 */

const MODEL_TO_BODY = {
  // Hatchbacks
  'fiesta': 'hatchback',
  'focus': 'hatchback',
  'polo': 'hatchback',
  'golf': 'hatchback',
  'up': 'hatchback',
  'corsa': 'hatchback',
  'astra': 'hatchback',
  'micra': 'hatchback',
  'note': 'hatchback',
  'yaris': 'hatchback',
  'aygo': 'hatchback',
  'i10': 'hatchback',
  'i20': 'hatchback',
  'i30': 'hatchback',
  'picanto': 'hatchback',
  'rio': 'hatchback',
  'ceed': 'hatchback',
  'clio': 'hatchback',
  'megane': 'hatchback',
  'twingo': 'hatchback',
  'zoe': 'hatchback',
  '208': 'hatchback',
  '308': 'hatchback',
  'c1': 'hatchback',
  'c3': 'hatchback',
  'c4': 'hatchback',
  'jazz': 'hatchback',
  'civic': 'hatchback',
  'mazda2': 'hatchback',
  'mazda3': 'hatchback',
  'ibiza': 'hatchback',
  'leon': 'hatchback',
  'fabia': 'hatchback',
  'scala': 'hatchback',
  'swift': 'hatchback',
  'sandero': 'hatchback',
  'a-class': 'hatchback',
  '1-series': 'hatchback',
  'a1': 'hatchback',
  'a3': 'hatchback',
  'mini': 'hatchback',

  // Saloons
  'mondeo': 'saloon',
  'passat': 'saloon',
  'jetta': 'saloon',
  'arteon': 'saloon',
  'insignia': 'saloon',
  'camry': 'saloon',
  'avensis': 'saloon',
  '3-series': 'saloon',
  '5-series': 'saloon',
  '7-series': 'saloon',
  'c-class': 'saloon',
  'e-class': 'saloon',
  's-class': 'saloon',
  'cla': 'saloon',
  'a4': 'saloon',
  'a5': 'saloon',
  'a6': 'saloon',
  'a7': 'saloon',
  'a8': 'saloon',
  's60': 'saloon',
  's90': 'saloon',
  'model 3': 'saloon',
  'model s': 'saloon',
  'xf': 'saloon',
  'xj': 'saloon',

  // Estates
  'octavia': 'estate',
  'superb': 'estate',
  'v60': 'estate',
  'v70': 'estate',
  'v90': 'estate',

  // SUVs
  'qashqai': 'suv',
  'juke': 'suv',
  'x-trail': 'suv',
  'kuga': 'suv',
  'puma': 'suv',
  'ecosport': 'suv',
  'kadjar': 'suv',
  'captur': 'suv',
  'tiguan': 'suv',
  'touareg': 'suv',
  't-roc': 'suv',
  't-cross': 'suv',
  'id.4': 'suv',
  'id.5': 'suv',
  'mokka': 'suv',
  'grandland': 'suv',
  'crossland': 'suv',
  'tucson': 'suv',
  'santa fe': 'suv',
  'kona': 'suv',
  'sportage': 'suv',
  'sorento': 'suv',
  'niro': 'suv',
  'rav4': 'suv',
  'chr': 'suv',
  'c-hr': 'suv',
  'corolla cross': 'suv',
  'highlander': 'suv',
  'cx-3': 'suv',
  'cx-5': 'suv',
  'cx-30': 'suv',
  'cx-60': 'suv',
  'hr-v': 'suv',
  'cr-v': 'suv',
  'xc40': 'suv',
  'xc60': 'suv',
  'xc90': 'suv',
  'gla': 'suv',
  'glc': 'suv',
  'gle': 'suv',
  'gls': 'suv',
  'q2': 'suv',
  'q3': 'suv',
  'q5': 'suv',
  'q7': 'suv',
  'q8': 'suv',
  'x1': 'suv',
  'x3': 'suv',
  'x5': 'suv',
  'x6': 'suv',
  'x7': 'suv',
  'countryman': 'suv',
  'evoque': 'suv',
  'discovery': 'suv',
  'defender': 'suv',
  'range rover': 'suv',
  'freelander': 'suv',
  'f-pace': 'suv',
  'e-pace': 'suv',
  'i-pace': 'suv',
  'duster': 'suv',
  'vitara': 'suv',
  's-cross': 'suv',
  '2008': 'suv',
  '3008': 'suv',
  '5008': 'suv',
  'c3 aircross': 'suv',
  'c5 aircross': 'suv',
  'model x': 'suv',
  'model y': 'suv',
  'ateca': 'suv',
  'arona': 'suv',
  'tarraco': 'suv',
  'karoq': 'suv',
  'kodiaq': 'suv',

  // Coupes
  '4-series': 'coupe',
  '8-series': 'coupe',
  'z4': 'coupe',
  'tt': 'coupe',
  'slc': 'coupe',
  'amg gt': 'coupe',
  'supra': 'coupe',
  'gr86': 'coupe',
  'mx-5': 'convertible',
  '911': 'coupe',
  'cayman': 'coupe',
  'boxster': 'convertible',

  // Convertibles
  'eos': 'convertible',
  'beetle cabriolet': 'convertible',

  // Vans
  'transit': 'van',
  'transit connect': 'van',
  'transit custom': 'van',
  'vito': 'van',
  'sprinter': 'van',
  'caddy': 'van',
  'crafter': 'van',
  'transporter': 'van',
  'vivaro': 'van',
  'combo': 'van',
  'movano': 'van',
  'berlingo': 'van',
  'partner': 'van',
  'expert': 'van',
  'jumpy': 'van',
  'dispatch': 'van',
  'trafic': 'van',
  'master': 'van',
  'kangoo': 'van',
  'nv200': 'van',
  'nv400': 'van',

  // Pickups
  'ranger': 'pickup',
  'hilux': 'pickup',
  'l200': 'pickup',
  'navara': 'pickup',
  'amarok': 'pickup',
  'd-max': 'pickup',
};

const BODY_TYPES = new Set([
  'saloon', 'hatchback', 'estate', 'suv',
  'coupe', 'convertible', 'van', 'pickup',
]);

export const DEFAULT_BODY_TYPE = 'saloon';

/**
 * Normalise an explicit DVLA/stored body type string to our canonical set.
 * Returns null if the input doesn't map to a known body type.
 */
export function normaliseBodyType(raw) {
  if (typeof raw !== 'string') return null;
  const t = raw.trim().toLowerCase();
  if (!t) return null;
  if (BODY_TYPES.has(t)) return t;
  // Common DVLA aliases
  if (t === 'sedan') return 'saloon';
  if (t === '4x4' || t === 'off-roader') return 'suv';
  if (t === 'mpv' || t === 'people carrier') return 'suv';
  if (t === 'cabriolet' || t === 'roadster') return 'convertible';
  if (t === 'wagon' || t === 'tourer') return 'estate';
  if (t === 'truck') return 'pickup';
  if (t === 'minibus' || t === 'lcv') return 'van';
  return null;
}

function normKey(s) {
  return String(s || '').trim().toLowerCase();
}

/**
 * Guess body type from a model name. Strategy:
 *   1. Exact match on the model (e.g. "qashqai" → suv)
 *   2. First-token match (e.g. "3-series touring" → "3-series" → saloon)
 *   3. Contains match over the keys (e.g. "focus estate" finds "focus")
 *   4. Default to `saloon`
 */
export function guessBodyTypeFromModel(model) {
  const m = normKey(model);
  if (!m) return DEFAULT_BODY_TYPE;
  if (MODEL_TO_BODY[m]) return MODEL_TO_BODY[m];
  const firstToken = m.split(/\s|-/)[0];
  if (MODEL_TO_BODY[firstToken]) return MODEL_TO_BODY[firstToken];
  for (const key of Object.keys(MODEL_TO_BODY)) {
    if (m.includes(key)) return MODEL_TO_BODY[key];
  }
  return DEFAULT_BODY_TYPE;
}

/**
 * Resolve a body type from a vehicle object — prefers any explicit
 * body_type / bodyType / type field, else guesses from the model name.
 */
export function resolveBodyType(vehicle) {
  if (!vehicle || typeof vehicle !== 'object') return DEFAULT_BODY_TYPE;
  const explicit =
    normaliseBodyType(vehicle.body_type) ||
    normaliseBodyType(vehicle.bodyType) ||
    normaliseBodyType(vehicle.type);
  if (explicit) return explicit;
  return guessBodyTypeFromModel(vehicle.model);
}

export default { resolveBodyType, guessBodyTypeFromModel, normaliseBodyType, DEFAULT_BODY_TYPE };
