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
 * Get API status
 */
export async function getApiStatus() {
  const resp = await api.get('/api/v1/status');
  return resp.data;
}
