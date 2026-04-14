/**
 * stationService.js
 * Sprint 8 — Mobile service layer wrapping apiClient for station data.
 * Provides formatted, screen-ready station objects to hooks and screens.
 */

import {
  getNearbyStations as apiGetNearby,
  searchStations as apiSearch,
  getStationById as apiGetById,
  getCheapestStations as apiGetCheapest,
} from './apiClient';

/**
 * Format a raw API station response into a clean screen-ready shape.
 */
function formatStation(raw) {
  return {
    id: raw.id,
    name: raw.name || 'Unknown Station',
    brand: raw.brand || '',
    address: raw.address || '',
    postcode: raw.postcode || '',
    lat: raw.lat ? parseFloat(raw.lat) : null,
    lon: raw.lon ? parseFloat(raw.lon) : null,
    petrol_price: raw.petrol_price != null ? parseFloat(raw.petrol_price) : null,
    diesel_price: raw.diesel_price != null ? parseFloat(raw.diesel_price) : null,
    e10_price: raw.e10_price != null ? parseFloat(raw.e10_price) : null,
    last_updated: raw.last_updated || null,
    distance_miles: raw.distance_miles != null ? parseFloat(raw.distance_miles) : null,
  };
}

/**
 * Fetch nearby stations for a given location.
 */
export async function getNearbyStations({ lat, lon, radius = 5, fuelType } = {}) {
  const data = await apiGetNearby({ lat, lon, radius, fuelType });
  const stations = data.stations || data || [];
  return stations.map(formatStation);
}

/**
 * Search stations by postcode, town, or name.
 */
export async function searchStations({ query, lat, lon, radius, fuelType } = {}) {
  const data = await apiSearch({ query, lat, lon, radius, fuelType });
  const stations = data.stations || data || [];
  return stations.map(formatStation);
}

/**
 * Get a single station by ID with full price detail.
 */
export async function getStationById(id) {
  const data = await apiGetById(id);
  const raw = data.station || data;
  if (!raw || !raw.id) return null;
  return formatStation(raw);
}

/**
 * Get cheapest stations near a location for a given fuel type.
 */
export async function getCheapestStations({ lat, lon, fuelType = 'petrol', radius = 10 } = {}) {
  const data = await apiGetCheapest({ lat, lon, fuelType, radius });
  const stations = data.stations || data || [];
  return stations.map(formatStation);
}
