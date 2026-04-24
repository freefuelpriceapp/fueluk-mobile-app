/**
 * personalisation.js — pure helpers for the "Personalised to your car" chip.
 *
 * Builds a compact, honest label from whatever we actually know about the
 * user's vehicle. Handles DVLA (verified), manual, and default/fallback
 * shapes — always returns something readable if any field is present.
 */

const FUEL_LABEL = {
  petrol: 'Petrol',
  e10: 'E10',
  e5: 'E5',
  super_unleaded: 'Super',
  diesel: 'Diesel',
  premium_diesel: 'Premium diesel',
  b7: 'Diesel',
};

function titleCase(s) {
  if (!s || typeof s !== 'string') return null;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function safeText(v) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length ? t : null;
}

/**
 * describePersonalisation — builds the chip copy from a user_vehicle blob.
 *
 * Returns:
 *   {
 *     present: boolean,         // any usable data at all
 *     headline: string,         // "Personalised to your 2022 Mercedes"
 *     detail: string,           // "E10 · 45 mpg"
 *     verifiedMpg: boolean,     // true when mpg came from DVLA
 *     defaultMpg: boolean,      // true when mpg is a UK-average fallback
 *     accessibilityLabel: string,
 *   }
 *   …or null when there's nothing meaningful to show.
 */
export function describePersonalisation(vehicle) {
  if (!vehicle || typeof vehicle !== 'object') return null;

  const year = typeof vehicle.year === 'number' && vehicle.year > 1900
    ? String(vehicle.year)
    : safeText(vehicle.year);
  const make = titleCase(safeText(vehicle.make));
  const fuelRaw = safeText(vehicle.fuel_type);
  const fuel = fuelRaw ? (FUEL_LABEL[fuelRaw.toLowerCase()] || titleCase(fuelRaw)) : null;
  const mpg = typeof vehicle.mpg === 'number' && Number.isFinite(vehicle.mpg)
    ? Math.round(vehicle.mpg)
    : null;
  const source = safeText(vehicle.mpg_source) || safeText(vehicle.source);
  const verifiedMpg = source === 'dvla';
  const defaultMpg = typeof source === 'string' && source.startsWith('default');

  // If we have literally nothing, bail.
  if (!year && !make && !fuel && mpg == null) return null;

  // Headline: "Personalised to your 2022 Mercedes" / "your E10 fuel mix" etc.
  let headline;
  if (year && make) {
    headline = `Personalised to your ${year} ${make}`;
  } else if (make) {
    headline = `Personalised to your ${make}`;
  } else if (fuel) {
    headline = `Personalised for ${fuel}`;
  } else {
    headline = 'Personalised to your car';
  }

  // Detail line: "E10 · 45 mpg" or "E10 · UK average mpg" if default.
  const detailParts = [];
  if (fuel) detailParts.push(fuel);
  if (mpg != null) {
    if (defaultMpg) detailParts.push('UK average mpg');
    else detailParts.push(`${mpg} mpg`);
  }
  const detail = detailParts.join(' · ') || null;

  const a11yParts = [headline];
  if (detail) a11yParts.push(detail);
  if (verifiedMpg) a11yParts.push('verified from DVLA');
  const accessibilityLabel = a11yParts.join(', ') + '. Tap to edit vehicle settings.';

  return {
    present: true,
    headline,
    detail,
    verifiedMpg,
    defaultMpg,
    accessibilityLabel,
  };
}

export default { describePersonalisation };
