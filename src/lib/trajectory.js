/**
 * trajectory.js — pure helpers for the price-trajectory UI.
 *
 * Accepts either the top-level `national_trajectory` or a per-station
 * `trajectory` block. Both share the shape:
 *   {
 *     direction: "rising" | "falling" | "stable",
 *     delta_pence_per_l_7d: number,
 *     confidence: "high" | "medium" | "low"
 *   }
 *
 * All fields are optional — we tolerate missing keys and return null when
 * we can't build a meaningful label.
 */

export const TRAJECTORY_TONE = {
  rising: 'warning',   // amber
  falling: 'positive', // green
  stable: 'neutral',   // grey
};

export const TRAJECTORY_ARROW = {
  rising: '\u2197',  // ↗
  falling: '\u2198', // ↘
  stable: '\u2192',  // →
};

function formatDelta(delta) {
  if (typeof delta !== 'number' || !Number.isFinite(delta)) return null;
  const rounded = Math.round(delta * 10) / 10;
  if (rounded === 0) return '0p/L';
  const sign = rounded > 0 ? '+' : '\u2212'; // en-dash minus
  return `${sign}${Math.abs(rounded).toFixed(1)}p/L`;
}

export function describeTrajectory(trajectory, { scope = 'national' } = {}) {
  if (!trajectory || typeof trajectory !== 'object') return null;
  const { direction, delta_pence_per_l_7d, confidence } = trajectory;
  if (direction !== 'rising' && direction !== 'falling' && direction !== 'stable') {
    return null;
  }

  // Per-station indicators skip low confidence — the map-wide badge will
  // already convey the broader trend in that case.
  if (scope === 'station' && direction !== 'stable' && confidence === 'low') {
    return null;
  }

  const arrow = TRAJECTORY_ARROW[direction];
  const tone = TRAJECTORY_TONE[direction];
  const deltaStr = formatDelta(delta_pence_per_l_7d);

  let label;
  let a11y;
  if (direction === 'stable') {
    label = `${arrow} Stable`;
    a11y = 'Prices stable over the last seven days';
  } else if (direction === 'rising') {
    label = deltaStr ? `${arrow} Rising \u00B7 ${deltaStr} (7d)` : `${arrow} Rising`;
    a11y = deltaStr
      ? `Prices rising, up ${deltaStr.replace(/[+\u2212]/g, '')} over the last seven days`
      : 'Prices rising over the last seven days';
  } else {
    label = deltaStr ? `${arrow} Falling \u00B7 ${deltaStr} (7d)` : `${arrow} Falling`;
    a11y = deltaStr
      ? `Prices falling, down ${deltaStr.replace(/[+\u2212]/g, '')} over the last seven days`
      : 'Prices falling over the last seven days';
  }

  return {
    direction,
    tone,
    arrow,
    label,
    deltaText: deltaStr,
    confidence: confidence || 'unknown',
    accessibilityLabel: a11y,
  };
}

export function stationTrajectorySecondary(trajectory) {
  const d = describeTrajectory(trajectory, { scope: 'station' });
  if (!d) return null;
  if (d.direction === 'stable') return null;
  if (d.confidence !== 'high' && d.confidence !== 'medium') return null;
  const dir = d.direction === 'rising' ? 'rising' : 'falling';
  if (!d.deltaText) return `Prices ${dir} at this station`;
  return `Prices ${dir} at this station (${d.deltaText} 7d)`;
}

export default { describeTrajectory, stationTrajectorySecondary };
