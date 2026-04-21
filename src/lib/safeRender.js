/**
 * safeRender.js
 *
 * Last-line-of-defence helper for rendering arbitrary values as text in
 * React Native. The recurring "Objects are not valid as a React child" crash
 * on Android has been triggered by brand enrichment objects ({ name, count })
 * that slipped past earlier coercion points. This helper guarantees that
 * whatever value arrives at the render site is turned into a renderable
 * string before it reaches <Text>.
 *
 * Use `toRenderableString(v)` to coerce a value inline:
 *     <Text>{toRenderableString(station.brand)}</Text>
 *
 * For a drop-in <Text> replacement that coerces its children, import
 * <SafeText> from ./SafeText (kept in a separate JSX-bearing file so this
 * module stays JSX-free for jest compatibility).
 *
 * It is intentionally generous — never throws, and only JSON.stringify's
 * objects as a last resort so a screenshot of a garbled value is still
 * better than a render crash.
 */

export function toRenderableString(value) {
  if (value == null) return '';
  const t = typeof value;
  if (t === 'string') return value;
  if (t === 'number' || t === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map((v) => toRenderableString(v)).filter(Boolean).join(', ');
  }
  if (t === 'object') {
    if (typeof value.name === 'string') return value.name;
    if (typeof value.brand === 'string') return value.brand;
    if (typeof value.label === 'string') return value.label;
    if (typeof value.value === 'string') return value.value;
    if (typeof value.title === 'string') return value.title;
    try {
      return JSON.stringify(value);
    } catch (_) {
      return '';
    }
  }
  try {
    return String(value);
  } catch (_) {
    return '';
  }
}

export default { toRenderableString };
