/**
 * breakEven.js — pure helpers for the break-even badge.
 *
 * Backend emits a `break_even` block per station shaped roughly like:
 *   {
 *     worth_the_drive: boolean,
 *     savings_pence: number,          // +180 = saves £1.80 vs nearest
 *     detour_miles: number,
 *     fuel_cost_full_tank: number,    // pence (i.e. 7200 = £72)
 *     price_per_l_pence: number,      // optional, e.g. 140.0
 *     tank_litres: number,            // optional, e.g. 40
 *     nearest_price_pence: number,    // optional
 *     is_closest: boolean,            // optional — when true, skip comparison
 *     mpg: number,                    // optional
 *     mpg_source: "dvla" | "manual" | "default_e10" | …
 *   }
 *
 * We tolerate any missing field and never throw — if the block is malformed
 * we return a null descriptor and the UI hides the badge.
 *
 * The currency formatter here is intentionally strict: we only ever output
 * either "£X.XX" (pounds) or "XXp" / "XXX.Xp" (pence). Never both. Regression
 * test in `breakEven.test.js` guards against "£0.56p"-style leaks.
 */

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * formatPounds — "£4.20". Input is in pounds. Never appends "p".
 * Returns null for non-finite.
 */
export function formatPounds(pounds) {
  if (typeof pounds !== 'number' || !Number.isFinite(pounds)) return null;
  return `£${pounds.toFixed(2)}`;
}

/**
 * formatPencePerLitre — "140.0p". Input is in pence per litre. Never prefixes £.
 * Returns null for non-finite.
 */
export function formatPencePerLitre(pence) {
  if (typeof pence !== 'number' || !Number.isFinite(pence)) return null;
  return `${pence.toFixed(1)}p`;
}

export function describeBreakEven(breakEven) {
  if (!breakEven || typeof breakEven !== 'object') return null;
  const {
    worth_the_drive,
    savings_pence,
    detour_miles,
    fuel_cost_full_tank,
    price_per_l_pence,
    tank_litres,
    nearest_price_pence,
    is_closest,
    mpg,
    mpg_source,
  } = breakEven;

  const hasSavings =
    typeof savings_pence === 'number' && Number.isFinite(savings_pence);
  const savingsPounds = hasSavings ? round2(savings_pence / 100) : null;
  const isEstimated =
    typeof mpg_source === 'string' && mpg_source.startsWith('default');

  // Decide the PRIMARY line based on the scenario.
  // Scenarios:
  //   (a) is_closest: this is the user's nearest — no comparison, just tank cost
  //   (b) worth_the_drive AND savings > 0: confident cheaper
  //   (c) worth_the_drive === false: similar value
  //   (d) savings > 0 but worth_the_drive missing: treat as cheaper
  //   (e) otherwise null
  let variant;
  let primary;
  let tone;
  // "Tied" = similar variant where the per-tank difference is under £1.
  let isTied = false;
  if (is_closest === true) {
    variant = 'closest';
    primary = null;
    tone = 'neutral';
  } else if (worth_the_drive && hasSavings && savingsPounds > 0) {
    variant = 'worth';
    primary = `${formatPounds(savingsPounds)} cheaper per tank than your nearest station`;
    tone = 'positive';
  } else if (worth_the_drive === false) {
    variant = 'similar';
    // When the per-tank difference is less than £1, lean into the "tied" copy.
    isTied = hasSavings && Math.abs(savingsPounds) < 1;
    primary = isTied
      ? 'Same value as your nearest station'
      : 'Similar price to your nearest station';
    tone = 'neutral';
  } else if (hasSavings && savingsPounds > 0) {
    variant = 'worth';
    primary = `${formatPounds(savingsPounds)} cheaper per tank than your nearest station`;
    tone = 'positive';
  } else {
    return null;
  }

  // Build the SECONDARY line: "£56 to fill (40L @ 140p) · 2.3mi extra drive · net £4.20 saved"
  let fullTankPounds = null;
  if (typeof fuel_cost_full_tank === 'number' && Number.isFinite(fuel_cost_full_tank)) {
    fullTankPounds = round2(fuel_cost_full_tank / 100);
  }
  const hasTank = typeof tank_litres === 'number' && Number.isFinite(tank_litres);
  const hasPpl =
    typeof price_per_l_pence === 'number' && Number.isFinite(price_per_l_pence);
  const hasDetour =
    typeof detour_miles === 'number' && Number.isFinite(detour_miles) && detour_miles > 0;

  const secondaryParts = [];
  if (variant === 'worth') {
    // Copy spec: "£X cheaper per tank than your nearest station · includes Xmi detour fuel"
    // Primary carries the headline; secondary carries the detour caveat + tank cost.
    if (hasDetour) {
      secondaryParts.push(`includes ${detour_miles.toFixed(1)}mi detour fuel`);
    }
    if (fullTankPounds != null) {
      if (hasTank && hasPpl) {
        secondaryParts.push(
          `${formatPounds(fullTankPounds)} to fill (${tank_litres}L @ ${formatPencePerLitre(price_per_l_pence)})`,
        );
      } else {
        secondaryParts.push(`${formatPounds(fullTankPounds)} to fill`);
      }
    } else if (hasPpl) {
      secondaryParts.push(formatPencePerLitre(price_per_l_pence));
    }
  } else if (variant === 'similar') {
    // New copy: lead with the per-tank difference as one clear thought.
    // "Only £0.71 difference per full tank" — or, when tied, a gentler nudge.
    if (hasSavings) {
      const diffAbs = Math.abs(savingsPounds);
      const diffLabel = formatPounds(diffAbs);
      if (isTied) {
        secondaryParts.push(`Under £1 difference per full tank — either works`);
      } else if (diffLabel) {
        secondaryParts.push(`Only ${diffLabel} difference per full tank`);
      }
    } else if (fullTankPounds != null) {
      // Fallback when we don't know the delta: surface the tank cost.
      if (hasTank && hasPpl) {
        secondaryParts.push(
          `${formatPounds(fullTankPounds)} to fill (${tank_litres}L @ ${formatPencePerLitre(price_per_l_pence)})`,
        );
      } else {
        secondaryParts.push(`${formatPounds(fullTankPounds)} to fill`);
      }
    }
  } else {
    // closest — unchanged: show tank cost when we have it.
    if (fullTankPounds != null) {
      if (hasTank && hasPpl) {
        secondaryParts.push(
          `${formatPounds(fullTankPounds)} to fill (${tank_litres}L @ ${formatPencePerLitre(price_per_l_pence)})`,
        );
      } else {
        secondaryParts.push(`${formatPounds(fullTankPounds)} to fill`);
      }
    } else if (hasPpl) {
      secondaryParts.push(formatPencePerLitre(price_per_l_pence));
    }
  }
  const secondary = secondaryParts.length ? secondaryParts.join(' · ') : null;

  // Accessibility label: reads naturally for screen-readers.
  const a11yParts = [];
  if (variant === 'worth' && savingsPounds != null) {
    a11yParts.push(`${formatPounds(savingsPounds)} cheaper per tank than your nearest station`);
  } else if (variant === 'similar') {
    a11yParts.push(
      isTied
        ? 'Same value as your nearest station'
        : 'Similar price to your nearest station',
    );
    if (hasSavings) {
      const diffAbs = Math.abs(savingsPounds);
      const diffLabel = formatPounds(diffAbs);
      if (isTied) {
        a11yParts.push('Under one pound difference per full tank');
      } else if (diffLabel) {
        a11yParts.push(`Only ${diffLabel} difference per full tank`);
      }
    }
  } else if (variant === 'closest' && fullTankPounds != null) {
    if (hasTank && hasPpl) {
      a11yParts.push(
        `${formatPounds(fullTankPounds)} to fill ${tank_litres} litres at ${formatPencePerLitre(price_per_l_pence)}`,
      );
    } else {
      a11yParts.push(`${formatPounds(fullTankPounds)} to fill up`);
    }
  }
  if (variant === 'worth' && fullTankPounds != null && hasTank && hasPpl) {
    a11yParts.push(
      `${formatPounds(fullTankPounds)} to fill ${tank_litres} litres at ${formatPencePerLitre(price_per_l_pence)}`,
    );
  }
  if (variant === 'worth' && hasDetour) {
    a11yParts.push(`includes ${detour_miles.toFixed(1)} mile detour fuel`);
  }
  if (isEstimated) a11yParts.push('estimated MPG');
  const accessibilityLabel = a11yParts.join('. ') || primary || 'Price comparison';

  // Legacy short label used in existing small-footprint callers (map pin).
  let legacyLabel;
  if (variant === 'worth' && savingsPounds != null) {
    legacyLabel = `+${formatPounds(savingsPounds)} saved`;
  } else if (variant === 'similar') {
    legacyLabel = isTied ? 'Same value' : 'Similar price';
  } else if (variant === 'closest' && fullTankPounds != null) {
    legacyLabel = `${formatPounds(fullTankPounds)} tank`;
  } else {
    legacyLabel = primary;
  }

  return {
    variant,                       // "worth" | "similar" | "closest"
    isTied,                        // true when similar and |diff| < £1
    label: legacyLabel,            // short chip text (back-compat)
    primary,                       // full sentence for new badge primary line
    secondary,                     // "£56 to fill (40L @ 140p) · 2.3mi extra drive · net £4.20 saved"
    tone,                          // "positive" | "neutral"
    accessibilityLabel,
    isEstimated,
    savingsPounds,
    detourMiles: hasDetour ? detour_miles : null,
    fullTankPounds,
    pricePerLitre: hasPpl ? price_per_l_pence : null,
    tankLitres: hasTank ? tank_litres : null,
    nearestPricePence:
      typeof nearest_price_pence === 'number' && Number.isFinite(nearest_price_pence)
        ? nearest_price_pence
        : null,
    mpg: typeof mpg === 'number' && Number.isFinite(mpg) ? mpg : null,
    mpgSource: typeof mpg_source === 'string' ? mpg_source : null,
  };
}

export default { describeBreakEven, formatPounds, formatPencePerLitre };
