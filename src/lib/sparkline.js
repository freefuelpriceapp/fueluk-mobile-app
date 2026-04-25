/**
 * sparkline.js — pure helper that turns a series of numbers into an SVG
 * path string for a tiny line chart.
 *
 * The component renders an SVG of size `width × height`, with a small
 * vertical inset so the stroke isn't clipped on extremes. We map the
 * input range to [inset, height - inset]. When all values are equal we
 * draw a flat line at the vertical centre.
 *
 * Output is a single `M ... L ... L ...` string suitable for an SVG
 * `<Path>` element. Returns null when the series is missing, contains
 * fewer than 2 finite numbers, or `width`/`height` are non-positive.
 */

function isFiniteNum(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * sparklinePath(values, { width, height, inset } = {})
 *
 * - values: number[] — the series. NaN / non-finite entries are filtered.
 * - width:  number   — px (default 60)
 * - height: number   — px (default 16)
 * - inset:  number   — vertical px reserved for the stroke (default 2)
 *
 * Returns null when the series cannot draw a line.
 */
export function sparklinePath(values, options = {}) {
  const width = isFiniteNum(options.width) && options.width > 0 ? options.width : 60;
  const height = isFiniteNum(options.height) && options.height > 0 ? options.height : 16;
  const inset = isFiniteNum(options.inset) && options.inset >= 0 ? options.inset : 2;

  if (!Array.isArray(values)) return null;
  const clean = values.filter(isFiniteNum);
  if (clean.length < 2) return null;

  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const span = max - min;
  const usableH = Math.max(0, height - inset * 2);

  const stepX = clean.length === 1 ? 0 : width / (clean.length - 1);

  const points = clean.map((v, i) => {
    const x = round2(i * stepX);
    let y;
    if (span === 0) {
      y = round2(height / 2);
    } else {
      const norm = (v - min) / span; // 0..1, low → 0
      y = round2(inset + (1 - norm) * usableH);
    }
    return [x, y];
  });

  return points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`)
    .join(' ');
}

/**
 * sparklineDirection(values)
 *
 * Returns "rising" | "falling" | "stable" based on first vs. last
 * values. Threshold for stable is 0.5p (we deal in pence-per-litre).
 * Returns null when fewer than 2 finite values.
 */
export function sparklineDirection(values, { stableThreshold = 0.5 } = {}) {
  if (!Array.isArray(values)) return null;
  const clean = values.filter(isFiniteNum);
  if (clean.length < 2) return null;
  const first = clean[0];
  const last = clean[clean.length - 1];
  const diff = last - first;
  if (Math.abs(diff) < stableThreshold) return 'stable';
  return diff > 0 ? 'rising' : 'falling';
}

export default { sparklinePath, sparklineDirection };
