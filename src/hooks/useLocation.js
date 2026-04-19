import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';

/**
 * useLocation
 * Returns the user's current location as { postcode, radiusKm, coords }.
 * Postcode is derived from reverse-geocoding the device GPS coordinates.
 * Falls back to a UK default (Birmingham) if permission is denied, times out,
 * or on web where expo-location permission prompts are unreliable.
 */
const DEFAULT_POSTCODE = 'B1 1AA';
const DEFAULT_RADIUS_KM = 5;
// Birmingham as UK fallback — matches the bug-fix spec and keeps /nearby useful.
const DEFAULT_COORDS = { latitude: 52.4862, longitude: -1.8904 };
const PERMISSION_TIMEOUT_MS = 6000;

const useLocation = () => {
  const [location, setLocation] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const applyFallback = (status = null) => {
      if (!mountedRef.current) return;
      if (status) setPermissionStatus(status);
      setLocation({
        postcode: DEFAULT_POSTCODE,
        radiusKm: DEFAULT_RADIUS_KM,
        coords: DEFAULT_COORDS,
        isFallback: true,
      });
      setLoading(false);
    };

    // Web / Snack preview: expo-location permission prompts do not resolve reliably.
    if (Platform.OS === 'web') {
      applyFallback('web-fallback');
      return;
    }

    let settled = false;
    const timeoutId = setTimeout(() => {
      if (!settled) applyFallback('timeout');
    }, PERMISSION_TIMEOUT_MS);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!mountedRef.current) { clearTimeout(timeoutId); settled = true; return; }
      setPermissionStatus(status);

      if (status !== 'granted') {
        settled = true;
        clearTimeout(timeoutId);
        applyFallback(status);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      settled = true;
      clearTimeout(timeoutId);
      if (!mountedRef.current) return;

      const { latitude, longitude } = pos.coords;

      let postcode = DEFAULT_POSTCODE;
      try {
        const results = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (results && results[0] && results[0].postalCode) {
          postcode = results[0].postalCode;
        }
      } catch (_e) {
        // Ignore reverse-geocode errors.
      }

      if (!mountedRef.current) return;
      setLocation({
        postcode,
        radiusKm: DEFAULT_RADIUS_KM,
        coords: { latitude, longitude },
        isFallback: false,
      });
      setLoading(false);
    } catch (err) {
      settled = true;
      clearTimeout(timeoutId);
      if (!mountedRef.current) return;
      setError(err?.message || 'Failed to get location');
      applyFallback('error');
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  return { location, permissionStatus, loading, error, refetch: load };
};

export default useLocation;
