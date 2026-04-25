/**
 * src/lib/ukRegions.js
 *
 * UK ONS NUTS-1 regions used by the heatmap's country-zoom tier. Each
 * region carries a centroid (lat/lng) and an approximate radius in
 * kilometres for "is this station inside this region" containment.
 *
 * Centroids and radii are intentionally coarse — the goal is national
 * heat-bloom coverage at country zoom, not boundary-accurate cartography.
 */

export const UK_REGIONS = [
  { id: 'NE',  label: 'North East',             lat: 54.97, lng: -1.61, radiusKm: 80 },
  { id: 'NW',  label: 'North West',             lat: 53.80, lng: -2.70, radiusKm: 90 },
  { id: 'YH',  label: 'Yorkshire & the Humber', lat: 53.80, lng: -1.20, radiusKm: 85 },
  { id: 'EM',  label: 'East Midlands',          lat: 52.95, lng: -1.10, radiusKm: 75 },
  { id: 'WM',  label: 'West Midlands',          lat: 52.50, lng: -1.85, radiusKm: 75 },
  { id: 'EE',  label: 'East of England',        lat: 52.20, lng:  0.50, radiusKm: 95 },
  { id: 'LDN', label: 'London',                 lat: 51.51, lng: -0.13, radiusKm: 30 },
  { id: 'SE',  label: 'South East',             lat: 51.30, lng: -0.50, radiusKm: 95 },
  { id: 'SW',  label: 'South West',             lat: 51.00, lng: -3.20, radiusKm: 115 },
  { id: 'WLS', label: 'Wales',                  lat: 52.30, lng: -3.85, radiusKm: 95 },
  { id: 'SCT', label: 'Scotland',               lat: 57.10, lng: -4.20, radiusKm: 200 },
  { id: 'NI',  label: 'Northern Ireland',       lat: 54.60, lng: -6.50, radiusKm: 95 },
];

const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Great-circle distance between two lat/lng points, in km.
 */
export function haversineKm(aLat, aLng, bLat, bLng) {
  if (
    !Number.isFinite(aLat) || !Number.isFinite(aLng) ||
    !Number.isFinite(bLat) || !Number.isFinite(bLng)
  ) return Infinity;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export default {
  UK_REGIONS,
  haversineKm,
};
