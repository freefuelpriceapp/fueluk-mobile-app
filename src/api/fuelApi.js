import axios from 'axios';
import Constants from 'expo-constants';
import { sanitizeStations, brandToString, safeText } from '../lib/brand';

const BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'https://api.freefuelpriceapp.com';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

function sanitizeStationPayload(data) {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return sanitizeStations(data);
  if (Array.isArray(data.stations)) {
    return { ...data, stations: sanitizeStations(data.stations) };
  }
  return data;
}

function sanitizeBrandsPayload(data) {
  if (!data || typeof data !== 'object') return data;
  const raw = Array.isArray(data) ? data : data.brands;
  if (!Array.isArray(raw)) return data;
  const brands = raw
    .map((b) => {
      if (b == null) return null;
      if (typeof b === 'string') return { name: b, count: 0 };
      if (typeof b === 'object') {
        const name = brandToString(b);
        if (!name) return null;
        const count =
          typeof b.count === 'number'
            ? b.count
            : typeof b.station_count === 'number'
              ? b.station_count
              : 0;
        return { name, count };
      }
      return null;
    })
    .filter(Boolean);
  return Array.isArray(data) ? brands : { ...data, brands };
}

function sanitizeAlertsPayload(data) {
  if (!data || typeof data !== 'object') return data;
  const list = Array.isArray(data) ? data : data.alerts;
  if (!Array.isArray(list)) return data;
  const alerts = list.map((a) => {
    if (!a || typeof a !== 'object') return a;
    return {
      ...a,
      station_name: safeText(a.station_name),
      station_brand: brandToString(a.station_brand),
    };
  });
  return Array.isArray(data) ? alerts : { ...data, alerts };
}

/**
 * Get nearby fuel stations
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radiusKm - Search radius in km (default 5)
 * @param {string} fuel - Fuel type: petrol | diesel | e10 (default petrol)
 * @param {string} brand - Optional brand filter
 */
export async function getNearbyStations({ lat, lng, radiusKm = 5, fuel = 'petrol', brand = null }) {
  const params = { lat, lon: lng, radius: radiusKm, fuel_type: fuel };
  if (brand) params.brand = brandToString(brand) || brand;
  const resp = await api.get('/api/v1/stations/nearby', { params });
  return sanitizeStationPayload(resp.data);
}

/**
 * Get distinct brand list for filter UI
 */
export async function getBrands() {
  const resp = await api.get('/api/v1/stations/brands');
  return sanitizeBrandsPayload(resp.data);
}

/**
 * Search stations by query
 * @param {string} q - Search query (name, address, postcode, brand)
 * @param {object} [options] - Optional params
 * @param {string} [options.fuelType] - Filter by fuel type: petrol | diesel | e10 | super_unleaded | premium_diesel
 */
export async function searchStations(q, { fuelType, lat, lon } = {}) {
  const params = { q };
  if (fuelType) params.fuel_type = fuelType;
  if (lat != null) params.lat = lat;
  if (lon != null) params.lon = lon;
  const resp = await api.get('/api/v1/stations/search', { params });
  return sanitizeStationPayload(resp.data);
}

/**
 * Get price history for a station
 * @param {string} stationId - Station ID
 * @param {number} days - Number of days of history (default 30)
 * @param {string} fuel - Optional fuel type filter: petrol | diesel | e10
 */
export async function getPriceHistory(stationId, days = 30, fuel = null) {
  const resp = await api.get(`/api/v1/prices/${stationId}/history`, {
    params: { days, ...(fuel ? { fuel } : {}) },
  });
  return resp.data;
}

// ---- Sprint 4: Price Alert API functions ----

/**
 * Register or update a price alert
 * @param {object} alert - { station_id, fuel_type, threshold_pence, device_token, platform }
 */
export async function createAlert({ station_id, fuel_type, threshold_pence, device_token, platform }) {
  const resp = await api.post('/api/v1/alerts', {
    station_id,
    fuel_type,
    threshold_pence,
    device_token,
    platform: platform || 'unknown',
  });
  return resp.data;
}

/**
 * Get all active alerts for a device token
 * @param {string} deviceToken - Expo push token or device ID
 */
export async function getAlerts(deviceToken) {
  const resp = await api.get(`/api/v1/alerts/${encodeURIComponent(deviceToken)}`);
  return sanitizeAlertsPayload(resp.data);
}

/**
 * Delete (deactivate) an alert by ID
 * @param {number} alertId
 */
export async function deleteAlert(alertId) {
  const resp = await api.delete(`/api/v1/alerts/${alertId}`);
  return resp.data;
}

/**
 * Sprint 6: Get prices for a specific station
 * @param {number} stationId
 * @param {string} fuelType - Optional filter
 */
export async function getPricesByStation(stationId, fuelType = null) {
  const params = {};
  if (fuelType) params.fuel_type = fuelType;
  const resp = await api.get(`/api/v1/prices/station/${stationId}`, { params });
  return sanitizeStationPayload(resp.data);
}

/**
 * Sprint 6: Get cheapest nearby stations
 * @param {number} lat
 * @param {number} lon
 * @param {number} radiusKm
 * @param {string} fuelType
 */
export async function getCheapestStations({ lat, lon, radiusKm = 10, fuelType = 'petrol' }) {
  const resp = await api.get('/api/v1/stations/cheapest', {
    params: { lat, lon, radius: radiusKm, fuel_type: fuelType },
  });
  return sanitizeStationPayload(resp.data);
}

/**
 * Get backend freshness marker. Returns { last_updated, status }.
 */
export async function getLastUpdated() {
  const resp = await api.get('/api/v1/meta/last-updated');
  return resp.data;
}

// ---- Sprint 2: Trip Calculator + Vehicle Lookup ----

/**
 * Look up UK vehicle details by registration plate (DVLA / MOT service backed).
 * @param {string} reg - UK reg plate (spaces/case tolerated; backend normalises)
 * @returns {Promise<{ make, model, fuel_type, estimated_mpg, year, co2_g_per_km }>}
 */
export async function lookupVehicle(reg) {
  const cleaned = String(reg || '').replace(/\s+/g, '').toUpperCase();
  const resp = await api.get('/api/v1/vehicles/lookup', { params: { reg: cleaned } });
  return resp.data;
}

/**
 * Get insurance-check metadata (MIB Navigate URL, terms, disclaimer).
 * Kept server-side so the URL can change without an app release.
 * @returns {Promise<{ provider, url, description, terms, disclaimer, contactUrl, checkTypes }>}
 */
export async function getInsuranceCheckInfo() {
  const resp = await api.get('/api/v1/vehicles/insurance-check');
  return resp.data;
}

/**
 * Calculate the cost of a trip given origin, destination and vehicle info.
 * Uses cheapest fuel on route where available.
 * @param {object} params
 * @param {number} params.origin_lat
 * @param {number} params.origin_lon
 * @param {number} params.destination_lat
 * @param {number} params.destination_lon
 * @param {number} params.vehicle_mpg
 * @param {string} params.fuel_type - petrol | diesel | e10
 * @param {number} [params.tank_size_litres]
 */
export async function calculateTrip({
  origin_lat,
  origin_lon,
  destination_lat,
  destination_lon,
  vehicle_mpg,
  fuel_type,
  tank_size_litres,
}) {
  const resp = await api.post('/api/v1/trip/calculate', {
    origin_lat,
    origin_lon,
    destination_lat,
    destination_lon,
    vehicle_mpg,
    fuel_type,
    ...(tank_size_litres != null ? { tank_size_litres } : {}),
  });
  return resp.data;
}
