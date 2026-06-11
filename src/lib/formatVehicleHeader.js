/**
 * formatVehicleHeader — composes a single, readable header line for a vehicle.
 *
 * DVLA returns make in ALL CAPS and (currently) no model/trim, leaving the
 * vehicle header looking half-broken. This helper title-cases the make,
 * formats engine cc → "5.0L", normalises fuel and colour, and joins with
 * " · " separators. When model is missing it gracefully drops it so the
 * line still reads cleanly.
 *
 * Future-proof: if `vehicle.spec.variant` is present we prefer
 * "{model} {variant}" (e.g. "Range Rover Sport SVR").
 */

const MAKE_ALL_CAPS = new Set(['BMW', 'MG', 'MINI', 'DS']);

const MAKE_OVERRIDES = {
  'LAND ROVER': 'Land Rover',
  'RANGE ROVER': 'Range Rover',
  'MERCEDES-BENZ': 'Mercedes-Benz',
  'MERCEDES BENZ': 'Mercedes-Benz',
  'ALFA ROMEO': 'Alfa Romeo',
  'ASTON MARTIN': 'Aston Martin',
  'ROLLS-ROYCE': 'Rolls-Royce',
  'ROLLS ROYCE': 'Rolls-Royce',
};

const FUEL_LABELS = {
  PETROL: 'Petrol',
  DIESEL: 'Diesel',
  ELECTRICITY: 'Electric',
  ELECTRIC: 'Electric',
  'HYBRID ELECTRIC': 'Hybrid',
  'PETROL/ELECTRIC': 'Hybrid',
  'DIESEL/ELECTRIC': 'Hybrid',
  HYBRID: 'Hybrid',
  LPG: 'LPG',
  CNG: 'CNG',
};

function titleCaseWord(word) {
  if (!word) return word;
  // Preserve hyphenated parts ("Mercedes-Benz" → each part title-cased)
  return word
    .split('-')
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part))
    .join('-');
}

function titleCase(str) {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/).map(titleCaseWord).join(' ');
}

export function formatMake(rawMake) {
  if (!rawMake || typeof rawMake !== 'string') return null;
  const upper = rawMake.trim().toUpperCase();
  if (!upper) return null;
  if (MAKE_OVERRIDES[upper]) return MAKE_OVERRIDES[upper];
  if (MAKE_ALL_CAPS.has(upper)) return upper;
  return titleCase(upper);
}

export function formatModel(rawModel) {
  if (!rawModel || typeof rawModel !== 'string') return null;
  const trimmed = rawModel.trim();
  if (!trimmed) return null;
  // Model strings are often all-caps from DVLA-style sources. Title-case but
  // preserve short alphanumeric trim tokens (e.g. "320D", "M3", "GTI") which
  // commonly appear and look wrong when lower-cased.
  return trimmed
    .split(/\s+/)
    .map((tok) => {
      const upper = tok.toUpperCase();
      // Short alphanumeric token with at least one digit → keep upper ("320D", "M3")
      if (upper.length <= 4 && /\d/.test(upper) && /^[A-Z0-9-]+$/.test(upper)) return upper;
      // Short all-letter token (≤3 chars) is almost always a trim/sub-brand: "ZS", "RS", "GTI"
      if (upper.length <= 3 && /^[A-Z]+$/.test(upper)) return upper;
      // Common upper-case trim suffixes
      if (/^(GTI|GTD|SVR|AMG)$/i.test(tok)) return upper;
      return titleCaseWord(tok);
    })
    .join(' ');
}

export function formatEngine(cc) {
  if (cc == null) return null;
  const num = typeof cc === 'number' ? cc : parseFloat(cc);
  if (!Number.isFinite(num) || num <= 0) return null;
  const litres = num / 1000;
  // One decimal, rounded
  const rounded = Math.round(litres * 10) / 10;
  return `${rounded.toFixed(1)}L`;
}

export function formatFuel(rawFuel) {
  if (!rawFuel || typeof rawFuel !== 'string') return null;
  const upper = rawFuel.trim().toUpperCase();
  if (!upper) return null;
  if (FUEL_LABELS[upper]) return FUEL_LABELS[upper];
  // Fallback — title-case whatever was given.
  return titleCase(upper);
}

export function formatColour(rawColour) {
  if (!rawColour || typeof rawColour !== 'string') return null;
  return titleCase(rawColour);
}

function formatYear(rawYear) {
  if (rawYear == null) return null;
  const num = typeof rawYear === 'number' ? rawYear : parseInt(String(rawYear), 10);
  if (!Number.isFinite(num) || num < 1900 || num > 2999) return null;
  return String(num);
}

/**
 * formatVehicleHeader — returns a single composed display string.
 *
 *   { make: "LAND ROVER", model: "RANGE ROVER SPORT", fuelType: "PETROL",
 *     engineCapacity: 4999, colour: "BLUE", yearOfManufacture: 2016 }
 *   → "Range Rover Sport · 5.0L Petrol · Blue · 2016"
 *
 *   { make: "LAND ROVER", fuelType: "PETROL", engineCapacity: 4999, ... }
 *   → "Land Rover · 5.0L Petrol · Blue · 2016"
 *
 * Returns null only if make is missing.
 */
export function formatVehicleHeader(vehicle) {
  if (!vehicle || typeof vehicle !== 'object') return null;

  const make = formatMake(vehicle.make);
  if (!make) return null;

  const baseModel = formatModel(vehicle.model);
  const variantRaw = vehicle?.spec?.variant;
  const variant = variantRaw && typeof variantRaw === 'string' ? variantRaw.trim() : null;
  const modelWithVariant = baseModel
    ? (variant ? `${baseModel} ${variant}` : baseModel)
    : null;

  const engine = formatEngine(vehicle.engineCapacity ?? vehicle.engine_capacity);
  const fuel = formatFuel(vehicle.fuelType ?? vehicle.fuel_type);
  const colour = formatColour(vehicle.colour ?? vehicle.color);
  const year = formatYear(vehicle.yearOfManufacture ?? vehicle.year);

  // Engine + fuel share a slot ("5.0L Petrol"); if only one is present, show it alone.
  const enginePart = [engine, fuel].filter(Boolean).join(' ') || null;

  const head = modelWithVariant ? `${make} ${modelWithVariant}` : make;

  const parts = [head, enginePart, colour, year].filter(Boolean);
  return parts.join(' \u00B7 ');
}

/**
 * buildTrimString — a compact display line for the vehicle chip / FuelIntelCard.
 *
 * Outputs e.g. "Audi A3 · 1.5L Petrol · 2019"
 * Gracefully handles missing fields:
 *   - missing model → "Audi · 1.5L Petrol · 2019"
 *   - missing engine cc → "Audi A3 · Petrol · 2019"
 *   - missing year → "Audi A3 · 1.5L Petrol"
 *   - null/undefined inputs → null
 *
 * Unlike formatVehicleHeader (which includes colour), buildTrimString
 * targets a shorter chip label: make+model, engine L, fuel, year.
 */
export function buildTrimString(vehicle) {
  if (!vehicle || typeof vehicle !== 'object') return null;

  const make = formatMake(vehicle.make);
  if (!make) return null;

  const baseModel = formatModel(vehicle.model);
  const variantRaw = vehicle?.spec?.variant;
  const variant = variantRaw && typeof variantRaw === 'string' ? variantRaw.trim() : null;
  const model = baseModel ? (variant ? `${baseModel} ${variant}` : baseModel) : null;

  const ccRaw = vehicle.engineCapacity ?? vehicle.engine_capacity;
  const engine = formatEngine(ccRaw);
  const fuel = formatFuel(vehicle.fuelType ?? vehicle.fuel_type);
  const year = (() => {
    const raw = vehicle.yearOfManufacture ?? vehicle.year;
    if (raw == null) return null;
    const num = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
    if (!Number.isFinite(num) || num < 1900 || num > 2999) return null;
    return String(num);
  })();

  // Head: "Make Model" or just "Make" if no model
  const head = model ? `${make} ${model}` : make;

  // Engine/fuel slot: "1.5L Petrol", "1.5L", "Petrol", or omitted
  const enginePart = [engine, fuel].filter(Boolean).join(' ') || null;

  const parts = [head, enginePart, year].filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join(' \u00B7 ');
}

export default formatVehicleHeader;
