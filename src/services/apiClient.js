/**
 * apiClient.js
 * Centralised HTTP client for the FreeFuelPrice mobile app.
 * All API calls go through here so the base URL and headers
 * can be changed in one place without touching screens.
 */

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.freefuelprice.co.uk';
const TIMEOUT_MS = 10000;

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
      ...options,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.message || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection.');
    }
    throw err;
  }
}

// ── Stations ──────────────────────────────────────────────────────────────────

export async function getNearbyStations({ lat, lon, radius = 5, fuelType }) {
  const params = new URLSearchParams({ lat, lon, radius });
  if (fuelType) params.append('fuel_type', fuelType);
  return request(`/api/v1/stations/nearby?${params.toString()}`);
}

export async function searchStations({ query, lat, lon, radius = 10, fuelType }) {
  const params = new URLSearchParams({ q: query });
  if (lat) params.append('lat', lat);
  if (lon) params.append('lon', lon);
  if (radius) params.append('radius', radius);
  if (fuelType) params.append('fuel_type', fuelType);
  return request(`/api/v1/stations/search?${params.toString()}`);
}

export async function getStationById(id) {
  return request(`/api/v1/stations/${id}`);
}

export async function getCheapestStations({ lat, lon, fuelType, radius = 10 }) {
  const params = new URLSearchParams({ lat, lon, radius });
  if (fuelType) params.append('fuel_type', fuelType);
  return request(`/api/v1/stations/cheapest?${params.toString()}`);
}

// ── Prices ────────────────────────────────────────────────────────────────────

export async function getPriceHistory(stationId, fuelType) {
  const params = new URLSearchParams({ fuel_type: fuelType });
  return request(`/api/v1/prices/${stationId}/history?${params.toString()}`);
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export async function getAlerts(deviceToken) {
  return request(`/api/v1/alerts?device_token=${encodeURIComponent(deviceToken)}`);
}

export async function createAlert({ deviceToken, stationId, fuelType, targetPricePence }) {
  return request('/api/v1/alerts', {
    method: 'POST',
    body: JSON.stringify({
      device_token: deviceToken,
      station_id: stationId,
      fuel_type: fuelType,
      target_price_pence: targetPricePence,
    }),
  });
}

export async function deleteAlert(id) {
  return request(`/api/v1/alerts/${id}`, { method: 'DELETE' });
}

// ── Favourites ────────────────────────────────────────────────────────────────

export async function getFavourites(deviceToken) {
  return request(`/api/v1/favourites?device_token=${encodeURIComponent(deviceToken)}`);
}

export async function addFavourite({ deviceToken, stationId }) {
  return request('/api/v1/favourites', {
    method: 'POST',
    body: JSON.stringify({ device_token: deviceToken, station_id: stationId }),
  });
}

export async function removeFavourite({ deviceToken, stationId }) {
  return request(`/api/v1/favourites/${stationId}?device_token=${encodeURIComponent(deviceToken)}`, {
    method: 'DELETE',
  });
}

// ── Meta ──────────────────────────────────────────────────────────────────────

export async function getLastUpdated() {
  return request('/api/v1/meta/last-updated');
}

export async function getHealth() {
  return request('/health');
}
