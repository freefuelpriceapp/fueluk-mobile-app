/**
 * Brand value coercion helpers.
 *
 * The backend is not consistent about brand shape: some endpoints return a
 * bare string, others return { name, count } enrichment objects (e.g.
 * /api/v1/stations/brands). Rendering an object directly as a React child
 * crashes Android with "Objects are not valid as a React child".
 *
 * brandToString is the single coercion path — use it at every render site
 * that interpolates a brand value into JSX.
 */
export function brandToString(b) {
  if (b == null) return '';
  if (typeof b === 'string') return b;
  if (typeof b === 'number' || typeof b === 'boolean') return String(b);
  if (typeof b === 'object') {
    if (typeof b.name === 'string') return b.name;
    if (typeof b.brand === 'string') return b.brand;
    return '';
  }
  return String(b);
}

export default { brandToString };
