/**
 * src/lib/smartDecision.js
 *
 * Phase 3: Smart Decisions.
 *
 * Pure, deterministic helpers to decide if a cheaper station further
 * away is actually worth the drive once you factor in the fuel burned
 * to get there.
 *
 * Inputs come from the app's existing station objects; no I/O here.
 */

// Typical UK car fuel economy (miles per gallon, imperial).
const DEFAULT_MPG = 40;
// 1 imperial gallon = 4.54609 litres.
const LITRES_PER_GALLON = 4.54609;
// Typical tank fill size (litres) used to scale savings.
const DEFAULT_FILL_LITRES = 40;
// Distance penalty per mile applied to the effective price so that local
// results rank meaningfully higher.  0.5 means each extra mile adds the
// equivalent of 0.5 price-units per litre to the score — enough to push
// a station 7 miles away below a moderately pricier one nearby, while
// still rewarding genuinely large savings.
const DISTANCE_PENALTY_PER_MILE = 0.5;

function toNum(v) {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Cost in pence to drive `miles` in a car achieving `mpg`,
 * paying `pencePerLitre` at the pump.
 * Round-trip is assumed (miles * 2).
 */
export function driveCostPence({ miles, mpg = DEFAULT_MPG, pencePerLitre }) {
  const m = toNum(miles);
  const p = toNum(pencePerLitre);
  const g = toNum(mpg) || DEFAULT_MPG;
  if (m === null || p === null || m < 0 || p <= 0 || g <= 0) return null;
  const gallonsUsed = (m * 2) / g;
  const litresUsed = gallonsUsed * LITRES_PER_GALLON;
  return litresUsed * p;
}

/**
 * Gross savings (pence) for filling `litres` at `altPpl` vs `basePpl`.
 */
export function grossSavingsPence({ basePpl, altPpl, litres = DEFAULT_FILL_LITRES }) {
  const b = toNum(basePpl);
  const a = toNum(altPpl);
  const l = toNum(litres) || DEFAULT_FILL_LITRES;
  if (b === null || a === null || l <= 0) return null;
  return (b - a) * l;
}

/**
 * Evaluate whether driving to `alt` from `base` is worth it.
 *
 * Returns:
 *   {
 *     worthIt: boolean,
 *     netPence: number | null,        // + = you save, - = you lose
 *     grossPence: number | null,
 *     driveCostPence: number | null,
 *     verdict: 'save' | 'break_even' | 'lose' | 'unknown',
 *     summary: string,                // short human line
 *   }
 */
export function worthTheDrive({
  basePpl,
  altPpl,
  extraMiles,
  mpg = DEFAULT_MPG,
  fillLitres = DEFAULT_FILL_LITRES,
}) {
  const gross = grossSavingsPence({ basePpl, altPpl, litres: fillLitres });
  const drive = driveCostPence({ miles: extraMiles, mpg, pencePerLitre: altPpl });
  if (gross === null || drive === null) {
    return {
      worthIt: false,
      netPence: null,
      grossPence: gross,
      driveCostPence: drive,
      verdict: 'unknown',
      summary: 'Not enough data to compare',
    };
  }
  const net = gross - drive;
  let verdict = 'break_even';
  if (net > 50) verdict = 'save';
  else if (net < -50) verdict = 'lose';
  const pounds = (Math.abs(net) / 100).toFixed(2);
  let summary;
  if (verdict === 'save') summary = `Save about £${pounds} after fuel to get there`;
  else if (verdict === 'lose') summary = `Loses about £${pounds} once you factor in the drive`;
  else summary = 'Roughly break-even once you factor in the drive';
  return {
    worthIt: net > 0,
    netPence: net,
    grossPence: gross,
    driveCostPence: drive,
    verdict,
    summary,
  };
}

/**
 * Rank stations by "effective price" = pump price plus the fuel cost of
 * driving there (round-trip), amortised over a typical fill volume.
 *
 * For each station:
 *   rtMiles    = distance_miles * 2
 *   litresUsed = (rtMiles / mpg) * LITRES_PER_GALLON
 *   driveCost  = litresUsed * stationPrice       (same price-unit as input)
 *   effective  = stationPrice + (driveCost / fillLitres)
 *
 * Stations with no price for `fuelKey` are kept but pushed to the bottom.
 * Input array is not mutated.
 */
export function rankStationsByValue(stations, {
  fuelKey = 'petrol_price',
  mpg = DEFAULT_MPG,
  fillLitres = DEFAULT_FILL_LITRES,
  distancePenalty = DISTANCE_PENALTY_PER_MILE,
} = {}) {
  if (!Array.isArray(stations)) return [];
  const effMpg = toNum(mpg) || DEFAULT_MPG;
  const effFill = toNum(fillLitres) || DEFAULT_FILL_LITRES;
  const penalty = toNum(distancePenalty) ?? DISTANCE_PENALTY_PER_MILE;

  return stations
    .map((station) => {
      const price = toNum(station && station[fuelKey]);
      const miles = toNum(station && station.distance_miles);

      if (price === null) {
        return { ...station, _effectivePrice: Infinity, _hasPrice: false };
      }

      // Fuel cost of the round-trip, amortised over a full tank
      const rtMiles = (miles || 0) * 2;
      const gallonsUsed = rtMiles / effMpg;
      const litresUsed = gallonsUsed * LITRES_PER_GALLON;
      const driveCost = litresUsed * price;
      const effectivePrice = price + driveCost / effFill;

      // Locality penalty: each mile adds `penalty` to the score so that
      // nearby stations rank higher unless the price gap is large enough
      // to justify the drive.
      const score = effectivePrice + (miles || 0) * penalty;

      return { ...station, _effectivePrice: score, _hasPrice: true };
    })
    .sort((a, b) => {
      if (a._hasPrice !== b._hasPrice) return a._hasPrice ? -1 : 1;
      return a._effectivePrice - b._effectivePrice;
    });
}

export const __constants = {
  DEFAULT_MPG,
  LITRES_PER_GALLON,
  DEFAULT_FILL_LITRES,
  DISTANCE_PENALTY_PER_MILE,
};

export default {
  driveCostPence,
  grossSavingsPence,
  worthTheDrive,
  rankStationsByValue,
};

