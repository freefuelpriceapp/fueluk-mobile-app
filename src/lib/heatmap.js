/**
 * src/lib/heatmap.js
 *
 * Pure helpers for the Map → Heatmap view.
 *
 * The heatmap renders semi-transparent circles around clusters of stations
 * coloured by average price for the selected fuel. Two clustering paths
 * are supported:
 *   - postcode-district (B12, M1, SW1) — preferred when stations carry
 *     a usable UK postcode.
 *   - lat/lng grid bucket — fallback when postcodes are absent. Bucket
 *     size is configurable; 1.5 km is the default used by MapScreen.
 *
 * Colour scaling maps a cluster's average to a 5-step palette (deep
 * green → red) using the visible-cohort min/max. A "uniform" guard
 * collapses the scale to a single amber tone when the spread is tiny
 * so we don't fake variation that doesn't exist.
 */
import { parsePrice } from './price';
import { UK_REGIONS, haversineKm } from './ukRegions';

export const HEATMAP_COLOURS = {
  cheapest: '#0E7C3A',
  cheap: '#5FAE3A',
  mid: '#F2C200',
  pricey: '#F08A1F',
  expensive: '#D03B2A',
  uniform: '#F2C200',
};

const UNIFORM_SPREAD_PPL = 0.5;

const KM_PER_LAT_DEG = 111;

function getCoords(station) {
  if (!station) return null;
  const lat = Number(station.lat ?? station.latitude);
  const lng = Number(station.lon ?? station.lng ?? station.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/**
 * Extract the UK postcode "outward code" (e.g. "B12" from "B12 8AB",
 * "SW1A" from "SW1A 1AA"). Returns null when the station has no
 * recognisable postcode.
 */
export function extractPostcodeDistrict(station) {
  if (!station) return null;
  const candidates = [station.postcode, station.postCode, station.post_code, station.address];
  for (const raw of candidates) {
    if (typeof raw !== 'string') continue;
    const m = raw.toUpperCase().match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?)\s*\d[A-Z]{2}\b/);
    if (m) return m[1];
    // Fall back to a bare outward code if no full postcode is present.
    const m2 = raw.toUpperCase().match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?)\b/);
    if (m2 && /\d/.test(m2[1])) return m2[1];
  }
  return null;
}

function avgPrice(stations, fuelType) {
  let sum = 0;
  let count = 0;
  for (const s of stations) {
    const raw = s?.prices?.[fuelType] ?? s?.[fuelType] ?? null;
    const p = parsePrice(raw);
    if (p === null) continue;
    sum += p;
    count += 1;
  }
  if (count === 0) return null;
  return sum / count;
}

function centroid(stations) {
  let lat = 0;
  let lng = 0;
  let n = 0;
  for (const s of stations) {
    const c = getCoords(s);
    if (!c) continue;
    lat += c.lat;
    lng += c.lng;
    n += 1;
  }
  if (n === 0) return null;
  return { lat: lat / n, lng: lng / n };
}

function cheapestStation(stations, fuelType) {
  let best = null;
  let bestP = Infinity;
  for (const s of stations) {
    const raw = s?.prices?.[fuelType] ?? s?.[fuelType] ?? null;
    const p = parsePrice(raw);
    if (p !== null && p < bestP) {
      bestP = p;
      best = s;
    }
  }
  return best;
}

/**
 * Cluster stations by UK postcode district. Stations without a
 * recognisable postcode are dropped — use clusterStationsByGrid as
 * the fallback when this returns an empty list.
 */
export function clusterStationsByPostcode(stations, fuelType = 'petrol') {
  if (!Array.isArray(stations) || stations.length === 0) return [];
  const buckets = new Map();
  for (const s of stations) {
    const code = extractPostcodeDistrict(s);
    if (!code) continue;
    const c = getCoords(s);
    if (!c) continue;
    if (!buckets.has(code)) buckets.set(code, []);
    buckets.get(code).push(s);
  }
  const out = [];
  for (const [code, members] of buckets.entries()) {
    const c = centroid(members);
    if (!c) continue;
    const avg = avgPrice(members, fuelType);
    if (avg === null) continue;
    out.push({
      id: `pc:${code}`,
      label: code,
      lat: c.lat,
      lon: c.lng,
      count: members.length,
      avgPrice: avg,
      cheapest: cheapestStation(members, fuelType),
    });
  }
  return out;
}

/**
 * Cluster stations into a lat/lng grid with bucket size given in
 * kilometres. Used when stations don't carry postcodes.
 */
export function clusterStationsByGrid(stations, fuelType = 'petrol', gridKm = 1.5) {
  if (!Array.isArray(stations) || stations.length === 0) return [];
  const km = Number(gridKm);
  const safeKm = Number.isFinite(km) && km > 0 ? km : 1.5;
  const latStep = safeKm / KM_PER_LAT_DEG;
  const buckets = new Map();
  for (const s of stations) {
    const c = getCoords(s);
    if (!c) continue;
    const lngStep = safeKm / (KM_PER_LAT_DEG * Math.max(0.1, Math.cos(c.lat * Math.PI / 180)));
    const latIdx = Math.floor(c.lat / latStep);
    const lngIdx = Math.floor(c.lng / lngStep);
    const key = `${latIdx}:${lngIdx}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(s);
  }
  const out = [];
  for (const [key, members] of buckets.entries()) {
    const c = centroid(members);
    if (!c) continue;
    const avg = avgPrice(members, fuelType);
    if (avg === null) continue;
    out.push({
      id: `grid:${key}`,
      label: null,
      lat: c.lat,
      lon: c.lng,
      count: members.length,
      avgPrice: avg,
      cheapest: cheapestStation(members, fuelType),
    });
  }
  return out;
}

/**
 * Pick the best clustering strategy automatically. Postcode wins when
 * at least 60% of stations have a usable postcode, otherwise grid.
 */
export function clusterStations(stations, fuelType = 'petrol', gridKm = 1.5) {
  if (!Array.isArray(stations) || stations.length === 0) return { clusters: [], strategy: 'none' };
  let withCode = 0;
  for (const s of stations) {
    if (extractPostcodeDistrict(s)) withCode += 1;
  }
  const ratio = withCode / stations.length;
  if (ratio >= 0.6) {
    const clusters = clusterStationsByPostcode(stations, fuelType);
    if (clusters.length > 0) return { clusters, strategy: 'postcode' };
  }
  return { clusters: clusterStationsByGrid(stations, fuelType, gridKm), strategy: 'grid' };
}

/**
 * Build a colour scale fn from a set of clusters. Returns a function
 * that maps a price to a hex colour. When the cohort spread is tiny
 * (≤0.5p), every price collapses to amber.
 */
export function computePriceColourScale(clusters) {
  const prices = (clusters || [])
    .map((c) => (c && Number.isFinite(c.avgPrice) ? c.avgPrice : null))
    .filter((p) => p !== null);
  if (prices.length === 0) {
    const fn = () => HEATMAP_COLOURS.uniform;
    fn.min = null;
    fn.max = null;
    fn.uniform = true;
    return fn;
  }
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const spread = max - min;
  if (spread <= UNIFORM_SPREAD_PPL) {
    const fn = () => HEATMAP_COLOURS.uniform;
    fn.min = min;
    fn.max = max;
    fn.uniform = true;
    return fn;
  }
  const fn = (price) => {
    if (!Number.isFinite(price)) return HEATMAP_COLOURS.mid;
    const t = (price - min) / spread;
    if (t < 0.2) return HEATMAP_COLOURS.cheapest;
    if (t < 0.4) return HEATMAP_COLOURS.cheap;
    if (t < 0.6) return HEATMAP_COLOURS.mid;
    if (t < 0.8) return HEATMAP_COLOURS.pricey;
    return HEATMAP_COLOURS.expensive;
  };
  fn.min = min;
  fn.max = max;
  fn.uniform = false;
  return fn;
}

/**
 * Format the legend's price-range label (e.g. "138p — 145p"). Returns
 * null when there are no clusters with finite prices.
 */
export function formatLegendRange(min, max) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  const lo = Math.round(min);
  const hi = Math.round(max);
  if (lo === hi) return `${lo}p`;
  return `${lo}p — ${hi}p`;
}

/**
 * Pick a render radius (metres) for a cluster based on its station
 * count. Capped at 2km so dense city clusters don't drown the map.
 */
export function clusterRadiusMetres(count) {
  const n = Number(count);
  if (!Number.isFinite(n) || n <= 0) return 600;
  const r = 600 + Math.sqrt(n) * 350;
  return Math.min(2000, Math.round(r));
}

/**
 * Build region-level clusters for the country-zoom tier. Each UK NUTS-1
 * region becomes a cluster centred on its centroid, averaging the prices
 * of all stations whose coordinates fall inside the region's radius.
 *
 * Regions with zero qualifying stations are dropped. Regions with fewer
 * than `lowDataThreshold` stations (default 5) are flagged `lowData:true`
 * so the renderer can dim them — they're retained so the map still shows
 * something everywhere we have any data.
 */
export function computeRegionAverages(stations, fuelType = 'petrol', options = {}) {
  const regions = options.regions || UK_REGIONS;
  const lowDataThreshold = Number.isFinite(options.lowDataThreshold)
    ? options.lowDataThreshold
    : 5;
  if (!Array.isArray(stations) || stations.length === 0) return [];
  const out = [];
  for (const r of regions) {
    const members = [];
    for (const s of stations) {
      const c = getCoords(s);
      if (!c) continue;
      const d = haversineKm(c.lat, c.lng, r.lat, r.lng);
      if (d <= r.radiusKm) members.push(s);
    }
    if (members.length === 0) continue;
    const avg = avgPrice(members, fuelType);
    if (avg === null) continue;
    out.push({
      id: `region:${r.id}`,
      label: r.label,
      lat: r.lat,
      lon: r.lng,
      count: members.length,
      avgPrice: avg,
      cheapest: cheapestStation(members, fuelType),
      radiusKm: r.radiusKm,
      lowData: members.length < lowDataThreshold,
      tier: 'region',
    });
  }
  return out;
}

/**
 * Given the visible viewport span (km, max of lat-span and lng-span),
 * pick which clustering tier should render:
 *   A — country zoom   (> 300km): region heat-blooms
 *   B — regional zoom  (50–300km): postcode/grid clusters
 *   C — local zoom     (< 50km):   tight grid clusters
 */
export function selectViewportTier(viewportSpanKm) {
  const span = Number(viewportSpanKm);
  if (!Number.isFinite(span) || span <= 0) return 'A';
  if (span > 300) return 'A';
  if (span >= 50) return 'B';
  return 'C';
}

/**
 * Pick a cluster to auto-focus when the user first enters heatmap mode.
 * Weights cheapness (70%) against proximity to the user (30%) when a
 * location is supplied; otherwise goes for absolute cheapest.
 *
 * Clusters with fewer than `minStations` (default 5) members are
 * excluded so a 2-station fluke can't win the spotlight.
 */
export function selectAutoFocusCluster(clusters, userLocation, options = {}) {
  const minStations = Number.isFinite(options.minStations) ? options.minStations : 5;
  if (!Array.isArray(clusters) || clusters.length === 0) return null;
  const eligible = clusters.filter((c) => (c?.count || 0) >= minStations && Number.isFinite(c?.avgPrice));
  if (eligible.length === 0) return null;

  const prices = eligible.map((c) => c.avgPrice);
  const minP = Math.min(...prices);

  const hasLoc = userLocation
    && Number.isFinite(Number(userLocation.lat))
    && Number.isFinite(Number(userLocation.lng ?? userLocation.lon));
  const uLat = hasLoc ? Number(userLocation.lat) : null;
  const uLng = hasLoc ? Number(userLocation.lng ?? userLocation.lon) : null;

  let distances = null;
  if (hasLoc) {
    distances = eligible.map((c) => haversineKm(uLat, uLng, c.lat, c.lon));
  }

  // Score: cheaper is better. Each pence above the cheapest cluster adds
  // a unit of cost. Each km of distance adds a fractional unit, scaled so
  // the price gap dominates unless prices are near-identical (the
  // "0.2p saving over a 600km drive" case the user explicitly called out).
  // 70/30 weighting target translates to ~3p == ~80km via the constants
  // below — i.e. for typical regional gaps the price wins, for sub-pence
  // gaps proximity tips the balance.
  const KM_PER_PENCE = 25;
  let bestIdx = 0;
  let bestScore = Infinity;
  for (let i = 0; i < eligible.length; i += 1) {
    const c = eligible[i];
    const priceCost = c.avgPrice - minP;
    let score;
    if (hasLoc && Number.isFinite(distances[i])) {
      score = 0.7 * priceCost + 0.3 * (distances[i] / KM_PER_PENCE);
    } else {
      score = priceCost;
    }
    if (score < bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return eligible[bestIdx];
}

/**
 * Build the multi-ring bloom descriptor for a cluster. Rings are returned
 * outer→inner with progressively smaller radii and greater opacity. The
 * `intensityRank` is a 0..4 bucket (0 = cheapest quintile) that scales
 * the overall radius and alpha so cheap blooms read louder than expensive
 * ones.
 *
 * Rings are pre-computed off the render path — do not re-derive per frame.
 */
export function computeBloomRings(cluster, intensityRank) {
  if (!cluster || !Number.isFinite(Number(cluster.lat)) || !Number.isFinite(Number(cluster.lon))) {
    return [];
  }
  const baseRadius = Number.isFinite(cluster.radiusKm) && cluster.radiusKm > 0
    ? cluster.radiusKm * 1000
    : clusterRadiusMetres(cluster.count);

  // Intensity rank: 0 cheapest (strong) → 4 priciest (recessive).
  const rank = Math.max(0, Math.min(4, Number.isFinite(intensityRank) ? intensityRank : 2));
  const radiusScales = [1.15, 1.05, 1.0, 0.95, 0.85];
  const alphaScales  = [1.0,  0.85, 0.7, 0.55, 0.4];
  const radiusScale = radiusScales[rank];
  const alphaScale  = alphaScales[rank];

  // Outer → inner: 100% / 70% / 45% / 25% radius, 8% / 15% / 25% / 35% alpha.
  const spec = [
    { r: 1.00, a: 0.08 },
    { r: 0.70, a: 0.15 },
    { r: 0.45, a: 0.25 },
    { r: 0.25, a: 0.35 },
  ];
  return spec.map((s, i) => ({
    index: i,
    radius: Math.round(baseRadius * radiusScale * s.r),
    opacity: Math.max(0, Math.min(1, s.a * alphaScale)),
  }));
}

/**
 * Bucket a price into a 0..4 intensity rank (0 = cheapest quintile).
 * Falls back to 2 (mid) when the cohort has no spread.
 */
export function intensityRankFor(price, clusters) {
  if (!Number.isFinite(price) || !Array.isArray(clusters) || clusters.length === 0) return 2;
  const prices = clusters
    .map((c) => (c && Number.isFinite(c.avgPrice) ? c.avgPrice : null))
    .filter((p) => p !== null);
  if (prices.length === 0) return 2;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const spread = max - min;
  if (spread <= 0) return 2;
  const t = (price - min) / spread;
  if (t < 0.2) return 0;
  if (t < 0.4) return 1;
  if (t < 0.6) return 2;
  if (t < 0.8) return 3;
  return 4;
}

/**
 * Build per-station "micro-bloom" clusters — one cluster per station with
 * its raw coordinates. Last-resort fallback when no aggregating tier
 * produces results but stations exist. Visually approaches Pin mode but
 * keeps the heatmap visual contract (soft blooms, colour scale).
 */
export function clusterStationsAsMicroBlooms(stations, fuelType = 'petrol') {
  if (!Array.isArray(stations) || stations.length === 0) return [];
  const out = [];
  for (let i = 0; i < stations.length; i += 1) {
    const s = stations[i];
    const c = getCoords(s);
    if (!c) continue;
    const raw = s?.prices?.[fuelType] ?? s?.[fuelType] ?? null;
    const p = parsePrice(raw);
    if (p === null) continue;
    out.push({
      id: `micro:${s?.id ?? i}`,
      label: null,
      lat: c.lat,
      lon: c.lng,
      count: 1,
      avgPrice: p,
      cheapest: s,
      micro: true,
    });
  }
  return out;
}

/**
 * Resilient heatmap cluster builder. Picks a tier from viewportSpanKm and
 * cascades through finer fallbacks until clusters are produced or stations
 * are exhausted:
 *
 *   tier A → region averages
 *   tier B → grid 4km, then 2km, then 1km
 *   tier C → grid 1.5km, then 0.75km, then per-station micro-blooms
 *
 * Returns { clusters, strategy, tier, fallbackLevel, reason } where
 * fallbackLevel records how many escalations were needed (0 = primary).
 *
 * Rules of engagement:
 *  - Caller passes BOTH visible-cohort and full-cohort station sets so we
 *    can fall back to the broader set when the visible window is thin.
 *  - We never "give up" while stations exist — the worst case is
 *    micro-blooms over the visible cohort.
 */
export function buildHeatmapClusters({
  visibleStations,
  filteredStations,
  fuelType = 'petrol',
  viewportSpanKm: spanKm,
  minClusters = 1,
  microBloomMinStations = 1,
}) {
  const tier = selectViewportTier(spanKm);
  const visible = Array.isArray(visibleStations) ? visibleStations : [];
  const filtered = Array.isArray(filteredStations) ? filteredStations : visible;

  const tryGrid = (set, gridKm) => {
    const res = clusterStations(set, fuelType, gridKm);
    return { clusters: res.clusters || [], strategy: res.strategy };
  };

  const attempts = [];

  if (tier === 'A') {
    const regions = computeRegionAverages(filtered, fuelType);
    attempts.push({ clusters: regions, strategy: 'region', label: 'tier-A-region' });
    // If no regional data hits, fall through into tier-B-style grid on the
    // full cohort so the user never sees a blank country zoom.
    attempts.push({ ...tryGrid(filtered, 25), label: 'tier-A-grid-25km' });
    attempts.push({ ...tryGrid(filtered, 10), label: 'tier-A-grid-10km' });
  } else if (tier === 'B') {
    attempts.push({ ...tryGrid(visible, 4), label: 'tier-B-grid-4km' });
    attempts.push({ ...tryGrid(visible, 2), label: 'tier-B-grid-2km' });
    attempts.push({ ...tryGrid(visible, 1), label: 'tier-B-grid-1km' });
    // If the visible cohort is too thin, expand to all filtered stations.
    attempts.push({ ...tryGrid(filtered, 4), label: 'tier-B-grid-4km-fallback-cohort' });
  } else {
    attempts.push({ ...tryGrid(visible, 1.5), label: 'tier-C-grid-1.5km' });
    attempts.push({ ...tryGrid(visible, 0.75), label: 'tier-C-grid-0.75km' });
    attempts.push({ ...tryGrid(filtered, 1.5), label: 'tier-C-grid-1.5km-fallback-cohort' });
  }

  for (let i = 0; i < attempts.length; i += 1) {
    const a = attempts[i];
    if (a.clusters && a.clusters.length >= minClusters) {
      return {
        clusters: a.clusters,
        strategy: a.strategy || 'grid',
        tier,
        fallbackLevel: i,
        reason: a.label,
      };
    }
  }

  // Last-resort micro-blooms — never lie when stations exist.
  const baseSet = visible.length >= microBloomMinStations ? visible : filtered;
  const micro = clusterStationsAsMicroBlooms(baseSet, fuelType);
  if (micro.length > 0) {
    return {
      clusters: micro,
      strategy: 'micro',
      tier,
      fallbackLevel: attempts.length,
      reason: 'micro-bloom',
    };
  }

  return {
    clusters: [],
    strategy: 'none',
    tier,
    fallbackLevel: attempts.length + 1,
    reason: 'no-stations',
  };
}

/**
 * Build a small diagnostic record for a heatmap render path. Used by
 * MapScreen in dev builds only — keeps shipped code free of console spam.
 */
export function diagnoseHeatmap({
  viewportSpanKm: spanKm,
  visibleStations,
  filteredStations,
  build,
}) {
  return {
    spanKm: Number.isFinite(spanKm) ? Math.round(spanKm * 10) / 10 : null,
    tier: build?.tier ?? null,
    visibleCount: Array.isArray(visibleStations) ? visibleStations.length : 0,
    filteredCount: Array.isArray(filteredStations) ? filteredStations.length : 0,
    clusterCount: Array.isArray(build?.clusters) ? build.clusters.length : 0,
    strategy: build?.strategy ?? null,
    fallbackLevel: build?.fallbackLevel ?? null,
    reason: build?.reason ?? null,
  };
}

export default {
  HEATMAP_COLOURS,
  extractPostcodeDistrict,
  clusterStationsByPostcode,
  clusterStationsByGrid,
  clusterStations,
  clusterStationsAsMicroBlooms,
  buildHeatmapClusters,
  diagnoseHeatmap,
  computePriceColourScale,
  formatLegendRange,
  clusterRadiusMetres,
  computeRegionAverages,
  selectViewportTier,
  selectAutoFocusCluster,
  computeBloomRings,
  intensityRankFor,
};
