/**
 * priceService.js
 * Sprint 8 — Mobile service layer for price submission and retrieval.
 * Wraps apiClient price functions and normalises response shapes.
 */

import {
  getPricesByStation as apiGetByStation,
  submitPrice as apiSubmit,
  getLatestPrices as apiGetLatest,
} from './apiClient';

/**
 * Format a raw price record into a screen-ready shape.
 */
function formatPrice(raw) {
  return {
    id: raw.id,
    station_id: raw.station_id,
    fuel_type: raw.fuel_type || raw.fuelType || '',
    price_pence: raw.price_pence != null ? parseFloat(raw.price_pence) : null,
    reported_at: raw.reported_at || raw.created_at || null,
    device_token: raw.device_token || null,
  };
}

/**
 * Get all price records for a given station.
 */
export async function getPricesByStation(stationId) {
  const data = await apiGetByStation(stationId);
  const prices = data.prices || data || [];
  return prices.map(formatPrice);
}

/**
 * Submit a crowd-sourced fuel price for a station.
 */
export async function submitPrice({ stationId, fuelType, pricePence, deviceToken }) {
  const payload = {
    station_id: stationId,
    fuel_type: fuelType,
    price_pence: pricePence,
    device_token: deviceToken,
  };
  return apiSubmit(payload);
}

/**
 * Get the latest submitted prices across all stations.
 * Used for freshness indicators on HomeScreen.
 */
export async function getLatestPrices({ limit = 20 } = {}) {
  const data = await apiGetLatest({ limit });
  const prices = data.prices || data || [];
  return prices.map(formatPrice);
}
