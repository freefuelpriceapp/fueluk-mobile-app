import axios from 'axios';
import Constants from 'expo-constants';
import { sanitizeStations, brandToString, safeText } from '../lib/brand';
import { wireFuelType } from './wireFuelType';

export { wireFuelType };

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

export async function getNearbyStations({
  lat,
  lng,
  radiusKm = 5,
  fuel = 'petrol',
  brand = null,
  mpg = null,
  tankFillLitres = null,
}) {
  const params = { lat, lon: lng, radius: radiusKm, fuel_type: wireFuelType(fuel) };
  if (brand) params.brand = brandToString(brand) || brand;
  if (mpg != null && Number.isFinite(Number(mpg))) params.mpg = Number(mpg);
  if (tankFillLitres != null && Number.isFinite(Number(tankFillLitres))) {
    params.tank_fill_litres = Number(tankFillLitres);
  }
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
  if (fuelType) params.fuel_type = wireFuelType(fuelType);
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
export async function getCheapestStations({
  lat,
  lon,
  radiusKm = 10,
  fuelType = 'unleaded',
  mpg = null,
  tankFillLitres = null,
}) {
  const params = { lat, lon, radius: radiusKm, fuel_type: wireFuelType(fuelType) };
  if (mpg != null && Number.isFinite(Number(mpg))) params.mpg = Number(mpg);
  if (tankFillLitres != null && Number.isFinite(Number(tankFillLitres))) {
    params.tank_fill_litres = Number(tankFillLitres);
  }
  const resp = await api.get('/api/v1/stations/cheapest', { params });
  return sanitizeStationPayload(resp.data);
}

/**
 * Silent community flag — user reports a wrong/missing/closed price.
 * Anti-abuse is handled both client-side (dedup) and backend-side.
 *
 * @param {string|number} stationId
 * @param {object} body  { fuel_type, device_id, reason }
 */
export async function flagStationPrice(stationId, body) {
  const resp = await api.post(
    `/api/v1/stations/${encodeURIComponent(stationId)}/flag-price`,
    body
  );
  return resp.data;
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
 *
 * Wave A.8 — authoritative fuel fields (always present as of backend v105+):
 *   - `fuelType`     {string|null}  Raw DVLA value (camelCase, e.g. "DIESEL"). Kept for
 *                                   backwards compat. Do NOT use for fuel-price lookups.
 *   - `fuel_type`    {string|null}  Lowercased copy ("diesel", "petrol", "hybrid electric").
 *   - `fuel_category` {'diesel'|'unleaded'|'electric'|null}
 *                                   Canonical taxonomy key for price lookups. Derived
 *                                   deterministically from DVLA fuelType. Prefer this field.
 *                                   null means DVLA returned an unknown fuel type — fall
 *                                   back to mapDvlaFuelToCanonical(fuel_type) or ask user.
 *
 * @param {string} reg - UK reg plate (spaces/case tolerated; backend normalises)
 * @returns {Promise<{ make, model, fuelType, fuel_type, fuel_category, estimated_mpg, year, co2_g_per_km }>}
 */
export async function lookupVehicle(reg) {
  const cleaned = String(reg || '').replace(/\s+/g, '').toUpperCase();
  const resp = await api.get('/api/v1/vehicles/lookup', { params: { reg: cleaned } });
  return resp.data;
}

/**
 * DVSA G1: full MOT history for a UK vehicle. Backend caches per-reg for 24h.
 * Response shape: { registration, make, model, firstUsedDate, fuelType,
 * primaryColour, motTests: [{ completedDate, testResult, expiryDate,
 * odometerValue, odometerUnit, motTestNumber, rfrAndComments: [{ text, type, dangerous }] }] }.
 *
 * @param {string} reg - UK reg plate.
 */
export async function getMotHistory(reg) {
  const cleaned = String(reg || '').replace(/\s+/g, '').toUpperCase();
  const resp = await api.get('/api/v1/vehicles/mot', { params: { reg: cleaned } });
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

/**
 * Wave A.9 — Welcome flow savings estimate.
 *
 * Privacy contract:
 *   - Do NOT pass plate to this function. Mobile resolves plate → vehicle
 *     details via lookupVehicle first, then passes make/model/fuel_type/mpg here.
 *   - lat/lon should be truncated to 3 d.p. before calling (done in WelcomeFlowScreen).
 *
 * @param {object} params
 * @param {number} params.lat            - truncated to 3dp by caller
 * @param {number} params.lon            - truncated to 3dp by caller
 * @param {string} [params.make]
 * @param {string} [params.model]
 * @param {string} [params.fuel_type]
 * @param {number} [params.mpg]
 * @param {number} [params.mileage_per_year]
 * @returns {Promise<{frame, headline, amount_pence, methodology, area_label, percentile}>}
 */
export async function getSavingsEstimate({ lat, lon, make, model, fuel_type, mpg, mileage_per_year } = {}) {
  const body = { lat, lon };
  if (make) body.make = make;
  if (model) body.model = model;
  if (fuel_type) body.fuel_type = fuel_type;
  if (mpg != null && Number.isFinite(Number(mpg))) body.mpg = Number(mpg);
  if (mileage_per_year != null && Number.isFinite(Number(mileage_per_year))) {
    body.mileage_per_year = Number(mileage_per_year);
  }
  const resp = await api.post('/api/v1/welcome/savings-estimate', body);
  return resp.data;
}
