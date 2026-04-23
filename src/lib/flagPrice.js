/**
 * flagPrice.js — helpers for the silent community flag signal.
 *
 * - getDeviceId(): returns a stable anonymous UUID (persisted in AsyncStorage).
 * - recordFlag / canFlag: client-side dedup (same device, same station+fuel,
 *   once per hour). Pure functions over a plain record map so they're trivially
 *   testable from node. The wrapper in submitFlag() handles AsyncStorage I/O.
 */

export const FLAG_DEDUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour
export const DEVICE_ID_KEY = 'device_id';
export const RECENT_FLAGS_KEY = 'recent_flags';

function flagKey(stationId, fuelType) {
  return `${String(stationId)}::${String(fuelType || 'unknown')}`;
}

export function canFlag(recent, stationId, fuelType, now = Date.now()) {
  if (!recent || typeof recent !== 'object') return true;
  const k = flagKey(stationId, fuelType);
  const ts = recent[k];
  if (typeof ts !== 'number' || !Number.isFinite(ts)) return true;
  return now - ts >= FLAG_DEDUP_WINDOW_MS;
}

export function recordFlag(recent, stationId, fuelType, now = Date.now()) {
  const base = recent && typeof recent === 'object' ? { ...recent } : {};
  base[flagKey(stationId, fuelType)] = now;
  // Prune anything older than 2x window so the blob doesn't grow forever.
  const cutoff = now - 2 * FLAG_DEDUP_WINDOW_MS;
  for (const key of Object.keys(base)) {
    if (base[key] < cutoff) delete base[key];
  }
  return base;
}

export function buildFlagPayload({ stationId, fuelType, deviceId, reason }) {
  if (!stationId) throw new Error('stationId required');
  if (!fuelType) throw new Error('fuelType required');
  if (!deviceId) throw new Error('deviceId required');
  if (!reason) throw new Error('reason required');
  return { fuel_type: fuelType, device_id: deviceId, reason };
}

// Lazy random-UUID fallback — only used when expo-crypto isn't available.
export function fallbackUuid() {
  // RFC4122 v4-ish, sufficient for an anonymous device id. Not cryptographic.
  const r = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
  const bytes = Array.from({ length: 16 }, r);
  bytes[6] = ((parseInt(bytes[6], 16) & 0x0f) | 0x40).toString(16).padStart(2, '0');
  bytes[8] = ((parseInt(bytes[8], 16) & 0x3f) | 0x80).toString(16).padStart(2, '0');
  return (
    bytes.slice(0, 4).join('') + '-' +
    bytes.slice(4, 6).join('') + '-' +
    bytes.slice(6, 8).join('') + '-' +
    bytes.slice(8, 10).join('') + '-' +
    bytes.slice(10, 16).join('')
  );
}

export default { canFlag, recordFlag, buildFlagPayload, fallbackUuid, FLAG_DEDUP_WINDOW_MS };
