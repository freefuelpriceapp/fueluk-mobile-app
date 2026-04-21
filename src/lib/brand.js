/**
 * Brand / station value coercion helpers.
 *
 * The backend is not consistent about brand shape: some endpoints return a
 * bare string, others return { name, count } enrichment objects (e.g.
 * /api/v1/stations/brands). Rendering an object directly as a React child
 * crashes Android with "Objects are not valid as a React child".
 *
 * brandToString is the single coercion path — use it at every render site
 * that interpolates a brand value into JSX.
 *
 * sanitizeStation / sanitizeStations enforce a canonical shape at the API
 * boundary so downstream consumers can trust that `station.brand` and
 * `station.name` are always plain strings (or null).
 */

export function brandToString(b) {
  if (b == null) return '';
  if (typeof b === 'string') return b;
  if (typeof b === 'number' || typeof b === 'boolean') return String(b);
  if (Array.isArray(b)) {
    for (const item of b) {
      const s = brandToString(item);
      if (s) return s;
    }
    return '';
  }
  if (typeof b === 'object') {
    if (typeof b.name === 'string') return b.name;
    if (typeof b.brand === 'string') return b.brand;
    if (typeof b.label === 'string') return b.label;
    if (typeof b.value === 'string') return b.value;
    return '';
  }
  return String(b);
}

/**
 * Coerce any value into a React-safe text string. Objects, arrays, and
 * other non-primitives become '' rather than crashing the render tree.
 */
export function safeText(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object') {
    if (typeof v.name === 'string') return v.name;
    if (typeof v.label === 'string') return v.label;
    if (typeof v.value === 'string') return v.value;
    return '';
  }
  return String(v);
}

/**
 * Normalize a single station object so `brand` and `name` are always
 * primitive strings (or '' when the backend didn't supply them).
 * Idempotent and defensive — safe to pass anything.
 */
export function sanitizeStation(s) {
  if (!s || typeof s !== 'object') return s;
  const brand = brandToString(s.brand);
  const name = safeText(s.name);
  const station_brand = safeText(s.station_brand);
  const station_name = safeText(s.station_name);
  return {
    ...s,
    brand: brand || '',
    name: name || '',
    ...(s.station_brand !== undefined ? { station_brand } : {}),
    ...(s.station_name !== undefined ? { station_name } : {}),
  };
}

/**
 * Normalize an array of stations. Non-arrays pass through unchanged.
 */
export function sanitizeStations(list) {
  if (!Array.isArray(list)) return list;
  return list.map(sanitizeStation);
}

export default { brandToString, safeText, sanitizeStation, sanitizeStations };
