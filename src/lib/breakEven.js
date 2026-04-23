/**
 * breakEven.js — pure helpers for the break-even badge.
 *
 * Backend emits a `break_even` block per station shaped roughly like:
 *   {
 *     worth_the_drive: boolean,
 *     savings_pence: number,          // +180 = saves £1.80 vs nearest
 *     detour_miles: number,
 *     fuel_cost_full_tank: number,    // pence
 *     mpg_source: "dvla" | "manual" | "default_e10" | …
 *   }
 *
 * We tolerate any missing field and never throw — if the block is malformed
 * we return a null descriptor and the UI hides the badge.
 */

function round2(n) {
  return Math.round(n * 100) / 100;
}

export function describeBreakEven(breakEven) {
  if (!breakEven || typeof breakEven !== 'object') return null;
  const {
    worth_the_drive,
    savings_pence,
    detour_miles,
    fuel_cost_full_tank,
    mpg_source,
  } = breakEven;

  const hasSavings =
    typeof savings_pence === 'number' && Number.isFinite(savings_pence);
  const savingsPounds = hasSavings ? round2(savings_pence / 100) : null;
  const isEstimated =
    typeof mpg_source === 'string' && mpg_source.startsWith('default');

  let label;
  let tone;
  if (worth_the_drive && hasSavings && savingsPounds > 0) {
    label = `+£${savingsPounds.toFixed(2)} saved`;
    tone = 'positive';
  } else if (worth_the_drive === false) {
    label = 'Similar value';
    tone = 'neutral';
  } else if (hasSavings && savingsPounds > 0) {
    label = `+£${savingsPounds.toFixed(2)} saved`;
    tone = 'positive';
  } else {
    return null;
  }

  // Build screen-reader label: "Saves one pound eighty after 1.2 mile detour".
  const parts = [];
  if (tone === 'positive' && savingsPounds != null) {
    parts.push(`Saves £${savingsPounds.toFixed(2)}`);
    if (typeof detour_miles === 'number' && Number.isFinite(detour_miles) && detour_miles > 0) {
      parts.push(`after ${detour_miles.toFixed(1)} mile detour`);
    }
  } else if (tone === 'neutral') {
    parts.push('Similar value to closest station');
  }
  if (isEstimated) parts.push('estimated MPG');
  const accessibilityLabel = parts.join(', ') || label;

  let fullTankPounds = null;
  if (typeof fuel_cost_full_tank === 'number' && Number.isFinite(fuel_cost_full_tank)) {
    fullTankPounds = round2(fuel_cost_full_tank / 100);
  }

  return {
    label,
    tone,                          // "positive" | "neutral"
    accessibilityLabel,
    isEstimated,
    savingsPounds,
    detourMiles:
      typeof detour_miles === 'number' && Number.isFinite(detour_miles)
        ? detour_miles
        : null,
    fullTankPounds,
  };
}

export default { describeBreakEven };
