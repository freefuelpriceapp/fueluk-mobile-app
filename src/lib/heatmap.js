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

export default {
  HEATMAP_COLOURS,
  extractPostcodeDistrict,
  clusterStationsByPostcode,
  clusterStationsByGrid,
  clusterStations,
  computePriceColourScale,
  formatLegendRange,
  clusterRadiusMetres,
};
