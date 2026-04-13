import axios from 'axios';
import Constants from 'expo-constants';

const BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'https://api.freefuelprice.co.uk';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

/**
 * Get nearby fuel stations
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radiusKm - Search radius in km (default 5)
 * @param {string} fuel - Fuel type: petrol | diesel | e10 (default petrol)
 */
export async function getNearbyStations({ lat, lng, radiusKm = 5, fuel = 'petrol' }) {
  const resp = await api.get('/api/v1/stations/nearby', {
    params: { latitude: lat, longitude: lng, radiusKm, fuel },
  });
  return resp.data;
}

/**
 * Search stations by query
 * @param {string} q - Search query (name, address, postcode, brand)
 */
export async function searchStations(q) {
  const resp = await api.get('/api/v1/stations/search', {
    params: { q },
  });
  return resp.data;
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

/**
 * Get API status
 */
export async function getApiStatus() {
  const resp = await api.get('/api/v1/status');
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
  return resp.data;
}

/**
 * Delete (deactivate) an alert by ID
 * @param {number} alertId
 */
export async function deleteAlert(alertId) {
  const resp = await api.delete(`/api/v1/alerts/${alertId}`);
  return resp.data;
}
