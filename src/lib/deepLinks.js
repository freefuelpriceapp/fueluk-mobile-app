/**
 * deepLinks.js — fueluk:// URL parsing and route mapping.
 *
 * Pure logic only. The integration layer lives in App.js (Expo Linking listener
 * + pending-link queue) so this file stays test-friendly without React Native
 * runtime imports.
 *
 * Supported URLs:
 *   fueluk://station/:id        → StationDetail (with id)
 *   fueluk://car/:reg           → VehicleSettings (with reg) or Not-found empty state
 *   fueluk://heatmap            → Map tab (heatmap mode)
 *   fueluk://search?q=...       → Search tab with query pre-filled
 */

export const SUPPORTED_HOSTS = ['station', 'car', 'heatmap', 'search'];

/**
 * Parse a fueluk:// URL into a route descriptor.
 * Returns null for non-fueluk schemes or unparseable URLs so callers can
 * ignore them silently — never throw on bad input.
 */
export function parseDeepLink(url) {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();
  // Accept fueluk:// or fueluk:/// (some email clients add a slash).
  const m = trimmed.match(/^fueluk:\/{1,3}([^?#]*)(\?[^#]*)?(#.*)?$/i);
  if (!m) return null;

  const path = m[1] || '';
  const queryStr = (m[2] || '').replace(/^\?/, '');

  // Split host vs first path segment. URLs like fueluk://station/123 have
  // host=station, segment=123. URLs like fueluk://heatmap have host=heatmap
  // and no segment.
  const segments = path.split('/').filter((s) => s.length > 0);
  if (segments.length === 0) return null;

  const host = segments[0].toLowerCase();
  const rest = segments.slice(1).map(decodeURIComponentSafe);

  const params = parseQueryString(queryStr);

  switch (host) {
    case 'station': {
      const id = rest[0];
      if (!id) return null;
      return { type: 'station', id, params };
    }
    case 'car': {
      const reg = rest[0];
      if (!reg) return null;
      return { type: 'car', reg: reg.toUpperCase().replace(/\s+/g, ''), params };
    }
    case 'heatmap':
      return { type: 'heatmap', params };
    case 'search': {
      const q = params.q != null ? String(params.q) : '';
      return { type: 'search', query: q, params };
    }
    default:
      return null;
  }
}

/**
 * Map a parsed deep-link to a navigation action.
 * Returns null when no navigation is required (e.g. unknown route).
 *
 * The shape is:
 *   { tab: 'Home'|'Map'|'Toolbox'|'Search'|'Settings', screen?, params? }
 *
 * Callers convert this to navigation.navigate(...) calls — kept as data so
 * the function is unit-testable without a real navigator.
 */
export function routeForDeepLink(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  switch (parsed.type) {
    case 'station':
      return {
        tab: 'Home',
        screen: 'StationDetail',
        params: { stationId: parsed.id, fromDeepLink: true },
      };
    case 'car':
      return {
        tab: 'Settings',
        screen: 'VehicleSettings',
        params: { reg: parsed.reg, fromDeepLink: true },
      };
    case 'heatmap':
      return { tab: 'Map', params: { initialMode: 'heatmap' } };
    case 'search':
      return { tab: 'Search', params: { query: parsed.query || '' } };
    default:
      return null;
  }
}

/**
 * Pending-link queue — used when a deep link arrives before the navigation
 * tree is mounted. Callers push, then drain once the nav is ready.
 */
export function createPendingQueue() {
  const queue = [];
  return {
    push(url) {
      if (typeof url === 'string' && url.length > 0) queue.push(url);
    },
    drain() {
      const items = queue.slice();
      queue.length = 0;
      return items;
    },
    size() {
      return queue.length;
    },
  };
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function parseQueryString(qs) {
  const out = {};
  if (!qs) return out;
  const parts = qs.split('&');
  for (const p of parts) {
    if (!p) continue;
    const eq = p.indexOf('=');
    const k = eq === -1 ? p : p.slice(0, eq);
    const v = eq === -1 ? '' : p.slice(eq + 1);
    if (!k) continue;
    out[decodeURIComponentSafe(k)] = decodeURIComponentSafe(v.replace(/\+/g, ' '));
  }
  return out;
}

function decodeURIComponentSafe(s) {
  try {
    return decodeURIComponent(s);
  } catch (_e) {
    return s;
  }
}
