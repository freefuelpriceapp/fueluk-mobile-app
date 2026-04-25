/**
 * monthlySaving.js — pure helper for the MonthlySavingsCard.
 *
 * Estimates the user's monthly fuel saving by combining their vehicle mpg,
 * weekly mileage (default 150 — UK average per ONS), the per-tank saving
 * from the best-value station vs. nearest, and the tank size. Returns
 * pounds rounded to the nearest whole pound.
 *
 * Returns null when inputs are missing or not finite — the caller must
 * decide what to render in that case (typically a fallback CTA).
 */

const LITRES_PER_GALLON_UK = 4.546;
const WEEKS_PER_MONTH = 4.345;
const DEFAULT_WEEKLY_MILES = 150;
const DEFAULT_MPG = 45;
const DEFAULT_TANK_LITRES = 50;
const LOW_SAVING_THRESHOLD_POUNDS = 5;

function isPosFinite(n) {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

/**
 * computeMonthlySaving({ mpg, weekly_miles, tank_size_litres, per_tank_saving_pence })
 *
 * Returns:
 *   {
 *     monthlyLitres: number,           // litres/month consumed
 *     perLitreSavingPence: number,     // pence saved per litre at best station
 *     monthlyPounds: number,           // total monthly saving £, rounded to whole £
 *     isLowSaving: boolean,            // true when monthlyPounds < £5 — caller swaps copy
 *     isEstimated: boolean,            // true when any input was defaulted
 *   }
 * or null when per_tank_saving_pence is missing/invalid (no comparison possible).
 */
export function computeMonthlySaving(input) {
  const opts = input && typeof input === 'object' ? input : {};
  const { mpg, weekly_miles, tank_size_litres, per_tank_saving_pence } = opts;
  if (!isPosFinite(per_tank_saving_pence)) return null;

  const usedMpg = isPosFinite(mpg) ? mpg : DEFAULT_MPG;
  const usedWeekly = isPosFinite(weekly_miles) ? weekly_miles : DEFAULT_WEEKLY_MILES;
  const usedTank = isPosFinite(tank_size_litres) ? tank_size_litres : DEFAULT_TANK_LITRES;

  const weeklyLitres = (usedWeekly / usedMpg) * LITRES_PER_GALLON_UK;
  const monthlyLitres = weeklyLitres * WEEKS_PER_MONTH;
  const perLitreSavingPence = per_tank_saving_pence / usedTank;
  const monthlyPence = monthlyLitres * perLitreSavingPence;
  const monthlyPoundsExact = monthlyPence / 100;
  const monthlyPounds = Math.round(monthlyPoundsExact);

  const isEstimated =
    !isPosFinite(mpg) || !isPosFinite(weekly_miles) || !isPosFinite(tank_size_litres);

  return {
    monthlyLitres,
    perLitreSavingPence,
    monthlyPounds,
    isLowSaving: monthlyPoundsExact < LOW_SAVING_THRESHOLD_POUNDS,
    isEstimated,
  };
}

export const _DEFAULTS = {
  DEFAULT_WEEKLY_MILES,
  DEFAULT_MPG,
  DEFAULT_TANK_LITRES,
  LITRES_PER_GALLON_UK,
  WEEKS_PER_MONTH,
  LOW_SAVING_THRESHOLD_POUNDS,
};

export default { computeMonthlySaving };
