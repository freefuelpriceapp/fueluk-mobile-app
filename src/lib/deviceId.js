import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEVICE_ID_KEY, fallbackUuid } from './flagPrice';

let cached = null;

/**
 * Returns a stable anonymous UUID for this install.
 *
 * Prefers expo-crypto (native crypto RNG) when available, falls back to a
 * pure-JS UUID. Stored under AsyncStorage key `device_id`. Not tied to any
 * user PII.
 */
export async function getDeviceId() {
  if (cached) return cached;
  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing && typeof existing === 'string') {
      cached = existing;
      return existing;
    }
  } catch (_) {}
  let id;
  try {
    const ExpoCrypto = require('expo-crypto');
    if (ExpoCrypto && typeof ExpoCrypto.randomUUID === 'function') {
      id = ExpoCrypto.randomUUID();
    }
  } catch (_) {}
  if (!id) id = fallbackUuid();
  try {
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  } catch (_) {}
  cached = id;
  return id;
}

export default getDeviceId;
