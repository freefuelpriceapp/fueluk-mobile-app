/**
 * performanceTrim.js
 *
 * Heuristic: does the user's registered vehicle benefit from Super Unleaded
 * (97/99 RON, sold under the E5 grade on UK forecourts)?
 *
 * Modern (post-2011) cars are factory-cleared to run on standard E10 95-RON,
 * so we don't pester the average driver with the E5 / Super Unleaded prompt
 * by default. BUT a sizeable slice of UK drivers own a turbo-petrol or
 * naturally-aspirated performance variant whose handbook recommends — or
 * outright requires — 97/99 RON for full power output and to avoid
 * pre-ignition / knock under load.
 *
 * Approach
 * --------
 * Rather than maintaining a Big Database of every performance variant ever
 * sold (which would be huge and brittle), we look at the textual trim /
 * model fields on the vehicle profile and match against the well-known
 * performance suffixes and trim names UK manufacturers actually use. This
 * captures the long tail of M-Sport / AMG / S-Line / RS / R / N / GTI /
 * Type-R / Mountune / Cooper-S / Cupra / etc. cars in a single regex pass.
 *
 * Trim matching is conservative — we'd rather miss a few edge-case
 * performance trims than nag every Audi A3 driver. A user can always tap
 * the E5 link manually; the 'recently opened' flag will then sticky it on.
 *
 * @typedef {Object} Vehicle
 * @property {string} [make]
 * @property {string} [model]
 * @property {string} [trim]
 * @property {string} [variant]
 * @property {string} [derivative]
 * @property {string} [series]
 */

// Patterns are matched WHOLE-WORD on the upper-cased "make model trim variant
// derivative series" concatenation. Each pattern is intentionally specific
// enough not to match a normal trim (e.g. "S" alone would false-match every
// "1.0 S" base trim, so we require " S$" only when other AMG/Audi cues are
// present — see compound rules below).
const PERFORMANCE_PATTERNS = [
  // BMW M-cars and M-Performance
  /\bM\d\b/,                // M2 M3 M4 M5 M6 M8
  /\bM\s?SPORT\b/,
  /\bM\s?PERFORMANCE\b/,
  /\bM\s?COMPETITION\b/,

  // Audi RS / S / S-Line (S-Line is trim-only, doesn't require 99; we exclude)
  /\bRS\s?\d/,              // RS3 RS4 RS5 RS6 RS7 RSQ3 RSQ8
  /\bAUDI\s+S\d\b/,         // S3 S4 S5 S6 S7 S8 (require AUDI prefix to avoid false-match)
  /\bAUDI\s+TT\s?S\b/,
  /\bR8\b/,

  // Mercedes-AMG
  /\bAMG\b/,
  /\b\d{2}\s?AMG\b/,

  // VW GTI / R / Golf R / Polo GTI
  /\bGTI\b/,
  /\bGOLF\s+R\b/,
  /\bSCIROCCO\s+R\b/,
  /\bT-?ROC\s+R\b/,

  // Porsche
  /\bPORSCHE\b/,            // every modern Porsche petrol prefers 98 RON
  /\b(GT[23]|GT4|TURBO|GTS)\b/,

  // Honda Type R / Si
  /\bTYPE\s?R\b/,
  /\bHONDA\s+CIVIC\s+SI\b/,

  // Hyundai N / Kia GT
  /\bHYUNDAI\s+I\d{2}\s?N\b/,
  /\b(I20|I30)\s?N\b/,
  /\bKIA\s+(STINGER|GT[\-\s]?LINE)\b/,

  // Ford ST / RS / Mountune
  /\bST\d?\b/,              // Fiesta ST, Focus ST, Puma ST
  /\bFOCUS\s+RS\b/,
  /\bMOUNTUNE\b/,

  // Vauxhall / Opel VXR / OPC
  /\bVXR\b/,
  /\bOPC\b/,

  // Mini Cooper S / JCW
  /\bCOOPER\s+S\b/,
  /\bJCW\b/,
  /\bJOHN\s+COOPER\s+WORKS\b/,

  // SEAT Cupra / Cupra brand
  /\bCUPRA\b/,
  /\bSEAT\s+LEON\s+CUPRA\b/,

  // Renault Sport / RS
  /\bRENAULTSPORT\b/,
  /\bMEGANE\s+RS\b/,
  /\bCLIO\s+RS\b/,

  // Subaru WRX / STI
  /\bWRX\b/,
  /\bSTI\b/,

  // Mitsubishi Evo
  /\bEVOLUTION\b/,
  /\bEVO\s?[IVX]+\b/,

  // Nissan GT-R / Nismo / Z
  /\bGT-?R\b/,
  /\bNISMO\b/,
  /\b370Z\b|\b350Z\b/,

  // Toyota GR / Supra / Yaris GR
  /\bGR\s?(YARIS|CORLLA|COROLLA|86|SUPRA)\b/,
  /\bSUPRA\b/,

  // Mazda MX-5 (most variants), RX-7/8
  /\bRX-?\d\b/,
  /\bMAZDASPEED\b/,

  // Alfa Quadrifoglio / QV
  /\bQUADRIFOGLIO\b/,
  /\bQV\b/,

  // Jaguar R / SVR
  /\bJAGUAR\s+\w+\s+R\b/,
  /\bSVR\b/,

  // Lotus
  /\bLOTUS\b/,

  // Generic high-performance suffixes that almost always = 97+ RON
  /\bTURBO\s?S?\b/,         // Most Turbo petrol variants benefit
];

/**
 * Build the search corpus from vehicle profile fields.
 * @param {Vehicle|null|undefined} vehicle
 * @returns {string}
 */
function buildCorpus(vehicle) {
  if (!vehicle || typeof vehicle !== 'object') return '';
  const parts = [
    vehicle.make,
    vehicle.model,
    vehicle.trim,
    vehicle.variant,
    vehicle.derivative,
    vehicle.series,
  ].filter((s) => typeof s === 'string' && s.trim().length > 0);
  return parts.join(' ').toUpperCase();
}

/**
 * Does this vehicle look like a performance trim that benefits from Super
 * Unleaded (97/99 RON)?
 *
 * @param {Vehicle|null|undefined} vehicle
 * @returns {boolean}
 */
function isPerformanceTrim(vehicle) {
  const corpus = buildCorpus(vehicle);
  if (!corpus) return false;
  return PERFORMANCE_PATTERNS.some((re) => re.test(corpus));
}

/**
 * Should we surface the Super Unleaded / E5 prompt to this user?
 *
 * Returns true if:
 *   1. No vehicle profile (we don't know — show the link)
 *   2. Vehicle is pre-2002 (legacy E5 requirement)
 *   3. Vehicle looks like a performance trim (97/99 RON benefit)
 *
 * Returns false otherwise — keep the home screen quiet for the modal
 * E10 driver.
 *
 * @param {Vehicle|null|undefined} vehicle
 * @returns {boolean}
 */
function shouldShowSuperPrompt(vehicle) {
  if (!vehicle) return true;
  const year =
    typeof vehicle.year === 'number'
      ? vehicle.year
      : typeof vehicle.year === 'string' && /^\d{4}/.test(vehicle.year)
      ? parseInt(vehicle.year.slice(0, 4), 10)
      : typeof vehicle.monthOfFirstRegistration === 'string' && /^\d{4}/.test(vehicle.monthOfFirstRegistration)
      ? parseInt(vehicle.monthOfFirstRegistration.slice(0, 4), 10)
      : null;
  if (year !== null && year < 2002) return true;
  if (isPerformanceTrim(vehicle)) return true;
  return false;
}

module.exports = {
  isPerformanceTrim,
  shouldShowSuperPrompt,
  PERFORMANCE_PATTERNS,
};
